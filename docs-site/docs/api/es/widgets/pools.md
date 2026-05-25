---
sidebar_position: 41
sidebar_label: "pools"
---

# API: `widgets/pools`

Public entry point for the feature. Import from the package barrel or the widgets index.

```typescript
import { Pools, PoolKey } from '@empr/es';
// or
import { Pools, PoolKey } from './widgets/pools';
```

| Export (barrel) | Source | Description |
|-----------------|--------|-------------|
| `Pools` | `pools.ts` | Global registry of named `ObjectPool` instances |
| `PoolKey` | `pools.ts` | Key type for pool lookup (`string \| number \| symbol`) |

**Dependencies:** `shared/object-pool` only (`ObjectPool`, `IObjectPool`, `IObjectPoolOptions`) — no ECS types.

**Bootstrap:** `bootstrap/empr.ts` registers `Pools` globally:

```typescript
dependency.registerGlobal({ provide: Pools, useClass: Pools });
```

Pooling mechanics (`acquire`, `release`, `reset`, caps) live in [`shared/object-pool`](/docs/api/es/shared/object-pool). This widget is a **locator/registry** over those pools.

---

## `PoolKey`

```typescript
type PoolKey = string | number | symbol;
```

| Form | Typical use |
|------|-------------|
| `string` | Human-readable names (`'bullets'`, `'particles'`) |
| `number` | Numeric ids / enums |
| `symbol` | Collision-safe keys across modules |

Keys are compared with `Map` identity semantics (symbols must be the same reference).

---

## `Pools`

```typescript
class Pools
```

Creates, stores, and retrieves `IObjectPool<T>` instances by `PoolKey`. Does not implement acquire/release itself.

### Internal storage

```typescript
private _pools: Map<PoolKey, IObjectPool<any>>
```

| Behavior | Detail |
|----------|--------|
| Registration | `createPool` → `Map.set(key, pool)` |
| Overwrite | Calling `createPool` again with the same `key` **replaces** the previous pool without warning |
| Removal | No `deletePool` / `clear` API — registry entries persist until the `Pools` instance is discarded |

---

### `createPool(key, options)`

```typescript
createPool<T>(key: PoolKey, options: IObjectPoolOptions<T>): IObjectPool<T>
```

| Step | Action |
|------|--------|
| 1 | `new ObjectPool(options)` |
| 2 | Store in `_pools` under `key` |
| 3 | Return the pool instance |

`options` is the same contract as `shared/object-pool`:

```typescript
interface IObjectPoolOptions<T> {
  factory: () => T;
  reset?: (item: T) => void;
  initialSize?: number;  // default 0 — preallocates in constructor
  maxSize?: number;      // default Infinity
  autoGrow?: boolean;    // default true
}
```

```typescript
const pools = dependency.inject(Pools);

pools.createPool('bullets', {
  factory: () => ({ x: 0, y: 0, active: false }),
  reset: (b) => { b.x = 0; b.y = 0; b.active = false; },
  initialSize: 50,
  maxSize: 200,
});

// Optional: keep direct reference from return value
const directRef = pools.createPool('fx', { factory: () => ({ id: 0 }) });
```

---

### `getPool(key)`

```typescript
getPool<T>(key: PoolKey): IObjectPool<T>
```

| Result | Behavior |
|--------|----------|
| Key exists | Returns stored `IObjectPool<T>` (generic cast) |
| Key missing | Throws `Error` synchronously (fail-fast) |

Pools must be created (typically at bootstrap / scene init) before hot-path `getPool` in systems.

---

## Delegated pool API (`IObjectPool<T>`)

After `createPool` or `getPool`, use the returned pool:

| Member | Description |
|--------|-------------|
| `available` | Idle objects in internal stack |
| `totalCreated` | Lifetime count from `factory` |
| `inUse` | Acquired but not yet `release`d |
| `acquire()` | Pop idle or grow via `factory` |
| `release(item)` | Reset (if configured), return to stack or discard if at `maxSize` |
| `preallocate(count)` | Warm idle stack |
| `clear()` | Drop idle stack only (in-use unaffected) |
| `releaseAll(items)` | Batch `release` |

Full semantics, edge cases, and GC notes: [`../shared/object-pool/API_DOC.md`](/docs/api/es/shared/object-pool).

```typescript
const bulletPool = pools.getPool<{ x: number; y: number; active: boolean }>('bullets');

const bullet = bulletPool.acquire();
bullet.x = 100;
bullet.active = true;

bulletPool.release(bullet);
```

---

## Usage patterns

### Bootstrap registration + system lookup

```typescript
// Orchestrator / init
const pools = inject(Pools);
pools.createPool(symbolId, {
  factory: () => createSymbolView(symbolId),
  reset: (view) => resetSymbolView(view),
  initialSize: 20,
});

// System (later, any module)
const pools = inject(Pools);
const view = pools.getPool(symbolId).acquire();
```

### Direct reference vs registry

`createPool` returns the pool — you may store that reference instead of calling `getPool`, but the registry pattern avoids passing pool instances through constructors.

### Symbol keys (collision-safe)

```typescript
const POOL_BULLETS = Symbol('bullets');
pools.createPool(POOL_BULLETS, { factory: () => new Bullet() });
pools.getPool<Bullet>(POOL_BULLETS).acquire();
```

### Without DI

```typescript
const pools = new Pools();
pools.createPool('temp', { factory: () => ({}) });
```

For production apps, prefer the single DI-registered instance from `Empr`.

---

## ECS integration (higher layers)

`Pools` is **agnostic** to entities. ECS-aware pooling (e.g. `EntityStorage.releaseEntity` / `acquireEntity`) lives in app or `@empr/es-lienzo` (`PixiPools`, `PixiObjectPool`), not in this module.

| Layer | Role |
|-------|------|
| `widgets/pools` | Named registry for generic `ObjectPool` |
| `widgets/entity-storage` | Entity visibility in queries (release/acquire) |
| `es-lienzo` | Pixi-specific pools tied to `PixiEntity` |

---

## Semantics and constraints

| Topic | Behavior |
|-------|----------|
| **Thin widget** | No pooling logic — delegates to `ObjectPool` |
| **Duplicate keys** | `createPool` overwrites existing entry |
| **Missing key** | `getPool` throws (no `undefined` return) |
| **Registry lifecycle** | No API to remove pools from map |
| **Type safety** | `getPool<T>` cast is caller's responsibility |
| **Layer boundary** | No `Entity`, `Component`, or pipeline imports |
| **Hot path** | Prefer `getPool` only after init; avoid `createPool` per frame |

---

## `Pools` vs raw `ObjectPool`

| | `Pools` | `ObjectPool` |
|---|---------|--------------|
| Purpose | Named multi-pool registry | Single pool instance |
| Lookup | `getPool(key)` | Direct variable |
| DI | Registered in `Empr` | Created inside `createPool` |
| ECS | Unaware | Unaware |

---

## Related documentation

- `feature_description.md` — locator rationale
- [`../shared/object-pool/API_DOC.md`](/docs/api/es/shared/object-pool) — `ObjectPool`, `IObjectPool`, options, acquire/release
- [`../entity-storage/API_DOC.md`](/docs/api/es/widgets/entity-storage) — entity pool signals (`releaseEntity` / `acquireEntity`)
- Source: `pools.ts`, export: `index.ts`

## Known consumers (reference)

| Module | Usage |
|--------|--------|
| `bootstrap/empr.ts` | `registerGlobal({ provide: Pools, useClass: Pools })` |
| `apps/slot-*` (via `PixiPools` in es-lienzo) | `createPool` / `getPool` for symbol views |
| `features/*` systems | `inject(Pools)` or extended pool services |


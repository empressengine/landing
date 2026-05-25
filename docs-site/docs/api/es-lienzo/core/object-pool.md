---
sidebar_position: 21
sidebar_label: "object-pool"
---

# API: `core/object-pool`

Public entry point for the PixiJS-aware object pool. Import from the core barrel or the feature index.

```typescript
import { PixiObjectPool } from '@empr/es-lienzo';
// or
import { PixiObjectPool } from './core/object-pool';
```

| Export | Source | Description |
|--------|--------|-------------|
| `PixiObjectPool` | `pixi-object-pool.ts` | `ObjectPool<PixiEntity>` with scene-graph detach and ECS re-registration on acquire |

**Dependencies:**

| Package | Symbols |
|---------|---------|
| `@empr/es` | `ObjectPool`, `IObjectPoolOptions`, `Dependency`, `EntityStorage` |
| `../entity` | `PixiEntity` |

**Base implementation (reference):** [`@empr/es` `shared/object-pool`](/docs/api/es/shared/object-pool) — `ObjectPool`, `IObjectPool`, `IObjectPoolOptions`, `PoolFactory`, `PoolReset`, metrics, `preallocate`, `clear`, `releaseAll`.

---

## Constructor options (inherited)

`PixiObjectPool` uses the same constructor as `ObjectPool<PixiEntity>`:

```typescript
new PixiObjectPool(options: IObjectPoolOptions<PixiEntity>)
```

Import options type from `@empr/es`:

```typescript
import { IObjectPoolOptions } from '@empr/es';
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `factory` | `() => PixiEntity` | — | **Required.** Creates instances when the idle stack is empty and `autoGrow` is true, or during warmup. |
| `reset` | `(item: PixiEntity) => void` | `undefined` | Optional. Called inside `release` **after** scene detachment (see below). |
| `initialSize` | `number` | `0` | Constructor calls `preallocate(initialSize)` when `> 0`. |
| `maxSize` | `number` | `Infinity` | Max **idle** objects retained in the internal stack. |
| `autoGrow` | `boolean` | `true` | If `false`, `acquire()` throws when the idle stack is empty. |

```typescript
const pool = new PixiObjectPool({
  factory: () => instantiate(symbolView, { id: SymbolId.Wild, type: 'wild' }),
  reset: (entity) => {
    entity.node.position.set(0, 0);
    entity.active = true;
  },
  initialSize: 10,
  maxSize: 50,
  autoGrow: true,
});
```

---

## `PixiObjectPool`

```typescript
class PixiObjectPool extends ObjectPool<PixiEntity>
```

Thin Pixi/ECS integration layer over the framework-agnostic pool. All capacity arithmetic, `inUse` tracking, double-release guards, `preallocate`, `clear`, and `releaseAll` are inherited unchanged from `ObjectPool<PixiEntity>`.

**Layer:** `core` — may import `@empr/es` and sibling `PixiEntity`; does not attach entities to a scene graph on acquire.

### Inherited API (`ObjectPool<PixiEntity>`)

| Member | Description |
|--------|-------------|
| `available` | Idle objects in internal stack |
| `totalCreated` | Lifetime count from `factory` |
| `inUse` | Acquired, not yet `release`d |
| `preallocate(count)` | Warm idle stack |
| `clear()` | Empties idle stack only |
| `releaseAll(items)` | Sequential `release` per item |

See [`shared/object-pool/API_DOC.md`](/docs/api/es/shared/object-pool) for full semantics (double `release`, `maxSize` discard, fail-fast `acquire`, etc.).

---

### `acquire()` (override)

```typescript
acquire(): PixiEntity
```

| | |
|---|---|
| **Returns** | `PixiEntity` ready for use (in pool `inUse`, re-registered in ECS when applicable) |
| **Throws** | Same as `ObjectPool` when idle stack empty and `autoGrow === false` |

**Flow:**

1. `super.acquire()` — pop idle stack or `factory()`; add to `_inUse`.
2. `Dependency.instance.inject(EntityStorage)` — resolved **on every** acquire (lazy DI).
3. `entityStorage.acquireEntity(item)` — re-adds to storage map, re-indexes components, dispatches `OnEntityAcquiredSignal` (no-op if entity id already present in storage).

**Does not:** call `parent.addChild` or attach `entity.node` to the scene graph. Caller must parent the entity after acquire.

```typescript
const entity = pool.acquire();
reelContainer.addChild(entity); // explicit scene attachment
```

```typescript
// Entity was previously releaseEntity'd (e.g. TreeBuilder "removed"):
storage.acquireEntity is invoked again inside acquire()
```

---

### `release(item)` (override)

```typescript
release(item: PixiEntity): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `item` | `PixiEntity` | Instance previously obtained from this pool via `acquire()` |

**Flow:**

1. `item.parent?.removeChild(item)` — ECS child list + Pixi `Container` detach (`PixiEntity.removeChild` sync).
2. `super.release(item)` — if in `_inUse`: remove from set, run `reset(item)` if configured, push to idle stack if under `maxSize`, else discard.

**Does not:** call `EntityStorage.releaseEntity`. ECS de-indexing is a separate step (typically `TreeBuilder` on view `removed`, or explicit `storage.releaseEntity(entity)` before pooling).

| Topic | Behavior |
|-------|----------|
| **Detach before reset** | Scene graph removal runs **before** base `reset`, so reset never runs on a node still attached to a visible parent. |
| **Double `release`** | Base pool no-op if `item` not in `_inUse`; `removeChild` may still run if parent exists (harmless if already detached). |
| **Foreign `release`** | If item was never acquired from this pool, base `release` no-ops after optional `removeChild`. |

```typescript
storage.releaseEntity(entity); // optional but typical: hide from ECS queries
pool.release(entity);            // detach Pixi + reset + return to idle stack
```

---

## End-to-end lifecycle (reference)

```
┌─────────────────────────────────────────────────────────────────┐
│  Typical pooled PixiEntity lifecycle                            │
├─────────────────────────────────────────────────────────────────┤
│  1. factory / instantiate → addEntity (initial ECS registration)│
│  2. parent.addChild(entity)           → visible in scene        │
│  3. view "removed" OR manual          → releaseEntity (ECS off) │
│  4. pool.release(entity)              → detach + reset + idle   │
│  5. pool.acquire()                    → acquireEntity (ECS on) │
│  6. parent.addChild(entity)            → visible again          │
└─────────────────────────────────────────────────────────────────┘

PixiObjectPool hooks: steps 4 (detach only), 5 (acquireEntity only)
```

| Step | API | ECS storage | Pixi scene graph |
|------|-----|-------------|------------------|
| Idle in pool | after `release` | Unchanged unless caller ran `releaseEntity` | Detached (`removeChild`) |
| Active use | after `acquire` | `acquireEntity` if not already in map | Caller attaches |
| Permanent destroy | `deinstantiate` / `destroyEntity` | Removed + entity destroyed | `PixiEntity.destroy` |

---

## Usage patterns

### Bootstrap registry (`widgets/pixi-pools`)

```typescript
const pixiPools = inject(PixiPools);
pixiPools.createPool(SymbolId.Wild, {
  factory: () => instantiate(symbolView, { id: SymbolId.Wild, type: 'wild' }),
  reset: (e) => e.node.position.set(0, 0),
  initialSize: 10,
});

const pool = pixiPools.getPool(SymbolId.Wild);
const symbol = pool.acquire();
container.addChild(symbol);
```

### Spin / despawn loop

```typescript
const entity = pool.acquire();
parent.addChild(entity);

// ... use entity in systems (queries see it after acquireEntity) ...

entity.parent?.removeChild(entity);
storage.releaseEntity(entity);
pool.release(entity);
```

### Warmup without scene attachment

```typescript
const pool = new PixiObjectPool({ factory, initialSize: 20 });
console.log(pool.available); // 20 idle, inUse === 0
```

### Program against base pool interface

```typescript
import { IObjectPool } from '@empr/es';

function borrow(pool: IObjectPool<PixiEntity>): PixiEntity {
  return pool.acquire();
}
```

Use `PixiObjectPool` (not plain `ObjectPool<PixiEntity>`) when ECS re-registration and Pixi detach are required.

---

## Semantics and constraints

| Topic | Behavior |
|-------|----------|
| **`release` vs `releaseEntity`** | Pool `release` detaches Pixi and recycles the instance; `EntityStorage.releaseEntity` de-indexes ECS. Call both for full idle state. |
| **`acquire` vs `addEntity`** | First-time entities usually enter storage via `instantiate` / `addEntity`; `acquire` only calls `acquireEntity` for re-entry. |
| **Scene attachment** | Never automatic on `acquire`; always explicit `addChild` (or tree rebuild). |
| **DI timing** | `EntityStorage` injected inside `acquire()` so pools can be constructed before DI is fully wired. |
| **Factory responsibility** | `factory` must return a valid `PixiEntity` (typically via `instantiate` with components and storage registration). |
| **Destroy** | `release` does not destroy GPU resources; use `deinstantiate` for permanent removal. |
| **Layer boundary** | No imports from `features` / app layers; consumers orchestrate when to pool. |

---

## Internal model (reference)

```
PixiObjectPool.release(item):
  parent?.removeChild(item)     // PixiEntity → ECS + Pixi trees
  ObjectPool.release(item):
    _inUse.delete(item)
    reset?(item)
    _pool.push(item) | discard

PixiObjectPool.acquire():
  item = ObjectPool.acquire()   // pop | factory, _inUse.add
  EntityStorage.acquireEntity(item)
  return item
```

---

## Related documentation

- `feature_description.md` — motivation, detach-before-reset, layer boundaries
- Base pool: [`@empr/es` `shared/object-pool/API_DOC.md`](/docs/api/es/shared/object-pool)
- Entity bridge: [`../entity/API_DOC.md`](/docs/api/es-lienzo/core/entity) — `removeChild`, `destroy` vs `deinstantiate`
- Storage: [`@empr/es` `widgets/entity-storage/API_DOC.md`](/docs/api/es/widgets/entity-storage) — `releaseEntity` / `acquireEntity`
- Source: `pixi-object-pool.ts`, export: `index.ts`

## Known consumers (reference)

| Module | Usage |
|--------|--------|
| `widgets/pixi-pools/pixi-pools.ts` | `createPool` / `getPool` registry of `PixiObjectPool` |
| `features/tree-builder/tree-builder.ts` | `releaseEntity` on view `removed` (paired with pooling, not inside pool) |
| Game / slot systems (app layer) | `getPool` → `acquire` / `release` hot path |

Registry and bootstrap wiring are documented in `widgets/pixi-pools`; this module only defines the pool class.


---
sidebar_position: 11
sidebar_label: "object-pool"
---

# API: `shared/object-pool`

Public entry point for the feature. Import from the shared barrel or the feature index.

```typescript
import {
  ObjectPool,
  IObjectPool,
  IObjectPoolOptions,
  PoolFactory,
  PoolReset,
} from '@empr/es';
// or
import { ObjectPool, IObjectPool } from './shared/object-pool';
```

| Export | Source | Description |
|--------|--------|-------------|
| `ObjectPool` | `object-pool.ts` | Generic pool implementation |
| `IObjectPool` | `object-pool.types.ts` | Pool contract (interface) |
| `IObjectPoolOptions` | `object-pool.types.ts` | Constructor / configuration options |
| `PoolFactory` | `object-pool.types.ts` | Factory type alias |
| `PoolReset` | `object-pool.types.ts` | Reset callback type alias |

---

## Type aliases

### `PoolFactory<T>`

```typescript
type PoolFactory<T> = () => T;
```

Creates a new instance when the pool must grow (`autoGrow`) or during `preallocate` / `initialSize` warmup.

| | |
|---|---|
| **Returns** | `T` — fresh instance |

---

### `PoolReset<T>`

```typescript
type PoolReset<T> = (item: T) => void;
```

Restores `item` to a safe default state. Invoked on every successful `release(item)` **after** the object is removed from `inUse` tracking.

| Parameter | Type | Description |
|-----------|------|-------------|
| `item` | `T` | Object being returned to the pool |

---

## `IObjectPoolOptions<T>`

Configuration passed to `new ObjectPool(options)`.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `factory` | `PoolFactory<T>` | — | **Required.** Creates new instances when the available stack is empty and growth is allowed, or during preallocation. |
| `reset` | `PoolReset<T>` | `undefined` | Optional. Called on each `release` before the object is pushed back (if under `maxSize`). |
| `initialSize` | `number` | `0` | If `> 0`, constructor calls `preallocate(initialSize)` immediately. |
| `maxSize` | `number` | `Infinity` | Max count of **available** (idle) objects in `_pool`. Excess releases are discarded (eligible for GC). |
| `autoGrow` | `boolean` | `true` | If `false`, `acquire()` throws when the available stack is empty instead of calling `factory`. |

```typescript
const options: IObjectPoolOptions<Bullet> = {
  factory: () => new Bullet(),
  reset: (b) => b.reset(),
  initialSize: 50,
  maxSize: 200,
  autoGrow: true,
};
```

---

## `IObjectPool<T>`

Contract implemented by `ObjectPool<T>`. Use this type when depending on pool behavior without tying to the concrete class (e.g. `widgets/pools` registry).

### Read-only metrics

| Member | Type | Description |
|--------|------|-------------|
| `available` | `number` | Objects idle in the internal stack (`_pool.length`). |
| `totalCreated` | `number` | Lifetime count of instances created via `factory` (includes in-use and ever-created, not decremented on discard). |
| `inUse` | `number` | Objects acquired but not yet successfully released (`_inUse.size`). |

---

### `acquire()`

```typescript
acquire(): T
```

| | |
|---|---|
| **Returns** | `T` — object ready for use |
| **Throws** | `Error` if available stack is empty and `autoGrow === false` |

**Flow:**

1. Pop from available stack if non-empty.
2. Else if `autoGrow`, call `factory` (increments `totalCreated`).
3. Else throw with message including `available`, `inUse`, `totalCreated`.
4. Add instance to `_inUse` and return it.

```typescript
const bullet = pool.acquire();
bullet.damage = 25;
```

---

### `release(item)`

```typescript
release(item: T): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `item` | `T` | Instance previously obtained from this pool via `acquire()` |

**Flow:**

1. If `item` is not in `_inUse`, **no-op** (guards double-release).
2. Remove from `_inUse`.
3. Call `reset(item)` if configured.
4. If `available < maxSize`, push `item` onto the stack; otherwise discard (no push).

```typescript
pool.release(bullet);
```

---

### `preallocate(count)`

```typescript
preallocate(count: number): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `count` | `number` | Desired additional idle instances |

Creates `min(count, maxSize - available)` objects via `factory` and pushes them to the available stack. Does not mark objects as in-use.

```typescript
pool.preallocate(100);
```

---

### `clear()`

```typescript
clear(): void
```

Empties the **available** stack only (`_pool.length = 0`). Objects still in `inUse` are unchanged and can be `release`d later.

---

### `releaseAll(items)`

```typescript
releaseAll(items: T[]): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `items` | `T[]` | Batch of instances to return |

Calls `release(items[i])` for each index (sequential loop, no extra allocations in the pool itself).

```typescript
pool.releaseAll([a, b, c]);
```

---

## `ObjectPool<T>`

```typescript
class ObjectPool<T> implements IObjectPool<T>
```

Generic, synchronous object pool for single-threaded JavaScript. Reduces allocation churn by reusing instances.

**Layer:** `shared` — no ECS, rendering, or DI dependencies.

### Constructor

```typescript
new ObjectPool<T>(options: IObjectPoolOptions<T>)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `options` | `IObjectPoolOptions<T>` | See table above |

**Side effects:** Stores `factory`, `reset`, `maxSize`, `autoGrow`; optionally preallocates when `initialSize > 0`.

**Instance API:** Same as `IObjectPool<T>` (getters `available`, `totalCreated`, `inUse`; methods `acquire`, `release`, `preallocate`, `clear`, `releaseAll`).

---

## Usage patterns

### Warmup before gameplay

```typescript
const pool = new ObjectPool<Particle>({
  factory: () => new Particle(),
  reset: (p) => p.clear(),
  initialSize: 200,
  maxSize: 500,
});

console.log(pool.available); // 200
```

### Fixed-size pool (fail fast)

```typescript
const pool = new ObjectPool<Buffer>({
  factory: () => new Buffer(1024),
  initialSize: 10,
  maxSize: 10,
  autoGrow: false,
});

try {
  const eleventh = pool.acquire();
} catch (e) {
  // pool empty, cannot grow
}
```

### Spike then trim via `maxSize`

```typescript
// Many acquires during a burst; totalCreated may exceed maxSize temporarily.
// On release, objects beyond maxSize are not retained in the pool.
for (const item of spawned) pool.release(item);
```

### Program against the interface

```typescript
function runSystem(pool: IObjectPool<Hitbox>): void {
  const hb = pool.acquire();
  try {
    // ...
  } finally {
    pool.release(hb);
  }
}
```

---

## Semantics and constraints

| Topic | Behavior |
|-------|----------|
| **Double `release`** | Second `release` of the same reference is ignored (`_inUse` check). |
| **`release` foreign object** | If reference was never `acquire`d from this pool (or already released), no-op. |
| **`maxSize`** | Limits **idle** objects only; does not cap how many can be **in use** when `autoGrow` is true. |
| **`totalCreated`** | Monotonic counter per pool instance; discarded objects do not decrease it. |
| **`clear`** | Does not reset or destroy in-use instances; caller must still `release` them. |
| **Reset timing** | Runs after removal from `_inUse`, before push to stack (or before discard). |
| **Threading** | Synchronous; not safe for concurrent access from multiple threads (standard JS model). |
| **Lifecycle ownership** | Pool does not decide *when* to release; callers or higher layers (e.g. entity lifecycle) must call `release`. |

---

## Internal model (reference)

```
┌─────────────────────────────────────────┐
│  ObjectPool<T>                          │
│  _pool: T[]        ← available (idle)   │
│  _inUse: Set<T>    ← acquired           │
│  _factory, _reset?, _maxSize, _autoGrow │
│  _totalCreated                          │
└─────────────────────────────────────────┘

acquire:  pop _pool OR factory (if autoGrow) → add to _inUse
release:  _inUse delete → reset? → push _pool if len < maxSize
```

---

## Related documentation

- `feature_description.md` — motivation, GC rationale, design decisions
- Source: `object-pool.ts`, `object-pool.types.ts`, export: `index.ts`

## Known consumers (reference)

| Module | Usage |
|--------|--------|
| `widgets/pools` (`Pools`) | Registry of `IObjectPool` instances via `createPool` / `getPool` |
| `es-lienzo` / `PixiObjectPool` | Extends `ObjectPool<PixiEntity>` with Pixi-specific lifecycle |
| `entity-storage.types` | Documents pool acquire/release integration with entity queries |

Higher-level pooling (global registry, Pixi disposal) lives outside this `shared` feature.


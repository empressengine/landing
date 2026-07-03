---
sidebar_position: 41
sidebar_label: "entity-storage"
---

# API: `widgets/entity-storage`

Public entry point for the feature. Import from the package barrel or the widgets index.

```typescript
import { EntityStorage, IEntityStorage } from '@empr/es';
// or
import { EntityStorage, IEntityStorage } from './widgets/entity-storage';
```

| Export (barrel) | Source | Description |
|-----------------|--------|-------------|
| `EntityStorage` | `entity-storage.ts` | Runtime container for all ECS entities |
| `IEntityStorage` | `entity-storage.types.ts` | Storage contract |

**Not in barrel** (deep import if needed): `compileFilter`, `CompileFilterReturns` (`utils/compile-filter.util.ts`).

**Dependencies:** `core/entity` (`IEntity`, `ComponentFilter`, `ProxyEntity`, `EntityIndexator`, lifecycle signals), `core/component` (`ComponentType`), `core/filtered` (`Filtered`, `EntityQuery`, `IFiltered`).

**Bootstrap:** `bootstrap/empr.ts` constructs a singleton `EntityStorage(ProxyEntity)` and registers it globally via `Dependency.registerGlobal({ provide: EntityStorage, ... })`.

---

## `IEntityStorage`

```typescript
interface IEntityStorage {
  size: number;
  entities: IEntity[];
  addEntity(entity: IEntity): IEntity;
  removeEntity(uuid: number): IEntity | undefined;
  releaseEntity(entity: IEntity): IEntity | undefined;
  acquireEntity(entity: IEntity): void;
  destroyEntity(entity: IEntity): void;
  getEntity(uuid: number): IEntity | undefined;
  filter(filter: ComponentFilter, withDisabled?: boolean, executionContext?: string): IFiltered;
  clearQueries(prefix: string): void;
}
```

Implemented by `EntityStorage`. Use the interface when mocking or typing DI consumers.

---

## `EntityStorage`

```typescript
class EntityStorage implements IEntityStorage
```

Main storage of entities in the ECS framework: UUID uniqueness, indexed filtering, optional live-query caching, pool-aware acquire/release, and automatic cleanup on destroy.

### Constructor

```typescript
new EntityStorage(proxyEntity: ProxyEntity)
```

| Parameter | Description |
|-----------|-------------|
| `proxyEntity` | Injected `ProxyEntity` service — wraps entities on `addEntity` so component mutations keep `EntityIndexator` in sync |

**Side effect:** Subscribes to `OnEntityDestroySignal`. When an entity calls `destroy()`, the listener removes it from the internal `Map` and sets `_needsArrayUpdate = true` (including recursive child destruction).

### Read-only accessors

| Member | Type | Description |
|--------|------|-------------|
| `size` | `number` | Count of entities in internal `Map` |
| `entities` | `IEntity[]` | Cached array view of all stored entities |

**`entities` caching:** Backed by `_entitiesArray`. Rebuilt from `Map` only when `_needsArrayUpdate` is `true` (after add, release, acquire, or destroy-driven removal). Avoids allocating a new array on every read.

---

## Entity lifecycle

### `addEntity(entity)`

```typescript
addEntity(entity: IEntity): IEntity
```

| Step | Action |
|------|--------|
| 1 | If `entity.id` already in map → `throw new Error('Entity with UUID [...] already exists...')` |
| 2 | `proxy = proxyEntity.create(entity)` |
| 3 | Store proxy in `_entities`, flag array rebuild |
| 4 | Return proxy (stored instance, not raw input) |

New entities are always proxied before storage.

### `getEntity(uuid)`

```typescript
getEntity(uuid: number): IEntity | undefined
```

O(1) lookup by numeric id.

### `destroyEntity(entity)`

```typescript
destroyEntity(entity: IEntity): void
```

| Condition | Behavior |
|-----------|----------|
| Entity not in storage | No-op |
| Entity in storage | Calls `entity.destroy()` |

Removal from the map happens **reactively** via `OnEntityDestroySignal` (sync during `destroy()`), so children destroyed recursively are also deregistered.

Preferred app-level helper: `deinstantiate(entity)` from `core/view` (when available).

### `removeEntity(uuid)`

```typescript
removeEntity(uuid: number): IEntity | undefined
```

| Result | Behavior |
|--------|----------|
| Not found | `undefined` |
| Found | `destroyEntity(entity)` → returns the entity reference |

Permanent removal — entity is destroyed, not pooled.

### `releaseEntity(entity)` (pool idle)

```typescript
releaseEntity(entity: IEntity): IEntity | undefined
```

| Condition | Behavior |
|-----------|----------|
| Not in storage | `undefined` (no-op) |
| In storage | Delete from map; `EntityIndexator.unindexEntity` for each component; `OnEntityReleasedSignal.dispatch(entity)`; return entity |

Entity instance stays alive. Live queries stop observing it until `acquireEntity`.

### `acquireEntity(entity)` (pool active)

```typescript
acquireEntity(entity: IEntity): void
```

| Condition | Behavior |
|-----------|----------|
| Same reference already registered | No-op |
| Different entity with same `id` | `throw new Error('Entity with UUID [...] already exists...')` |
| Not registered | Add to map; `EntityIndexator.indexEntity` per component; `OnEntityAcquiredSignal.dispatch(entity)` |

Re-registers a released entity without creating a new proxy (unlike `addEntity`).

---

## Filtering

### `filter(filter, withDisabled?, executionContext?)`

```typescript
filter(
  filter: ComponentFilter,
  withDisabled?: boolean,
  executionContext?: string,
): IFiltered
```

Uses `ComponentFilter` from `core/entity`:

```typescript
interface ComponentFilter {
  includes: ComponentType<Component>[];
  excludes?: ComponentType<Component>[];
  each?: (entity: IEntity) => boolean;
}
```

| Parameter | Default | Description |
|-----------|---------|-------------|
| `filter` | — | `includes` / `excludes` / optional `each` predicate |
| `withDisabled` | `false` | If `false`, skip entities with `entity.active === false` |
| `executionContext` | — | String key for live `EntityQuery` cache (e.g. pipeline name) |

### Resolution strategy

| Condition | Returns | Notes |
|-----------|---------|-------|
| `filter.each` is defined | `Filtered` snapshot | `_slowFilter` — evaluates `each` per candidate |
| No `executionContext` | `Filtered` snapshot | One-off / non-pipeline queries |
| `executionContext` + no `each` | Cached `EntityQuery` | Hash: `` `${context}::inc:${sorted names}::exc:${...}::dis:${withDisabled}` `` |

On first `EntityQuery` creation, storage runs an initial index-optimized scan and passes seed entities to `new EntityQuery(filter, withDisabled, initialEntities)`. Subsequent frames: O(1) access to live collection; updates via signals (see `core/filtered/API_DOC.md`).

**`EntityQuery` limitation:** `filter.each` is **not** evaluated inside `EntityQuery` — use slow path (omit `executionContext` or set `each`).

### Index optimization (`_getOptimizedEntitySet`)

When `includes.length > 0`:

1. For each included `ComponentType`, read `EntityIndexator.getIndexedEntities(type)`.
2. If any set is missing or empty → intersection empty (early `Filtered([])` in slow path).
3. Pick the **smallest** set by size.
4. Iterate only that set; verify remaining `includes` and `excludes`.

Performance scales with the rarest included component, not total entity count.

When `includes.length === 0`:

- Full scan over `this.entities` (cached array).
- Slow path also requires `entity.components.size > 0` and `each` (default `() => true`).

### `clearQueries(prefix)`

```typescript
clearQueries(prefix: string): void
```

Iterates cached `_queries` map; for keys `key.startsWith(prefix)` calls `query.dispose()` and deletes entry.

Use when a pipeline or execution context is torn down to avoid leaked signal subscriptions.

---

## Utility: `compileFilter` (not in barrel)

```typescript
type CompileFilterReturns = (entity: IEntity) => boolean;

const compileFilter = (
  includes: ComponentType<any>[],
  excludes?: ComponentType<any>[],
): CompileFilterReturns;
```

| Check | Rule |
|-------|------|
| Includes | `entity.hasComponents(includes)` must be true |
| Excludes | If provided, `entity.hasComponents(excludes)` must be false |

Standalone predicate builder — no storage, no `each`, no `active` check, no indexing. Import from `./utils/compile-filter.util` or `./utils` if needed.

---

## Signals (integration)

| Signal | Role in `EntityStorage` |
|--------|-------------------------|
| `OnEntityDestroySignal` | Constructor listener — auto-remove from map |
| `OnEntityReleasedSignal` | Dispatched by `releaseEntity` |
| `OnEntityAcquiredSignal` | Dispatched by `acquireEntity` |

`EntityQuery` (in `core/filtered`) also listens to component, destroy, release, acquire, and active-changed signals for live membership updates.

---

## Usage patterns

### DI / global instance

```typescript
// Typical: resolved from Empr bootstrap
const storage = dependency.resolve(EntityStorage);
```

### Add and query

```typescript
const proxy = storage.addEntity(new Entity(1, 'Player'));
const found = storage.getEntity(1);

const movers = storage.filter(
  { includes: [TransformComponent, VelocityComponent], excludes: [DeadTagComponent] },
  false,
  'update-pipeline',
);
movers.forEach((entity) => system.update(entity));
```

### One-off filter with custom predicate

```typescript
const alive = storage.filter({
  includes: [PlayerTagComponent],
  each: (e) => e.getComponent(HealthComponent).value > 0,
});
// Returns Filtered snapshot — not cached EntityQuery
```

### Object pool

```typescript
storage.releaseEntity(entity);
// ... pool holds entity ...
storage.acquireEntity(entity);
```

### Teardown cached queries

```typescript
storage.clearQueries('update-pipeline');
```

---

## Semantics and constraints

| Topic | Behavior |
|-------|----------|
| **ID uniqueness** | Numeric `entity.id` is the map key; duplicates throw on `addEntity` / `acquireEntity` |
| **Stored reference** | `addEntity` returns and stores the **proxy**, not the raw entity |
| **Destroy vs release** | `removeEntity` / `destroyEntity` invalidate entity; `releaseEntity` preserves instance |
| **Proxy on acquire** | `acquireEntity` does not re-wrap — entity must already be the stored/proxied instance from prior `addEntity` |
| **Inactive entities** | Excluded when `withDisabled === false` in both slow and live paths |
| **Disabled components** | Matching uses active components via `hasComponent` / `isSatisfyFilter` on `Entity` |
| **Layer boundary** | Widget only — no pipeline/executor logic; delegates indexing to `EntityIndexator` + `ProxyEntity` |
| **`compileFilter`** | Not re-exported from `index.ts` |

---

## `Filtered` vs `EntityQuery` (from this module)

| | `Filtered` | `EntityQuery` |
|---|------------|---------------|
| Obtained when | `each` set, or no `executionContext` | `executionContext` + no `each` |
| Updates | Static snapshot | Reactive (signals) |
| `dispose` | N/A | Via `clearQueries` or manual on uncached instances |
| `filter.each` | Evaluated in `_slowFilter` | Not supported |

Full iteration contract: ](/docs/api/es/core/filtered).

---

## Related documentation

- `feature_description.md` — design rationale and optimization notes
- [`../core/entity/API_DOC.md`](/docs/api/es/core/entity) — `ComponentFilter`, `ProxyEntity`, `EntityIndexator`, signals
- [`../core/filtered/API_DOC.md`](/docs/api/es/core/filtered) — `IFiltered`, `EntityQuery`, `Filtered`
- Source: `entity-storage.ts`, `entity-storage.types.ts`, export: `index.ts`

## Known consumers (reference)

| Module | Usage |
|--------|--------|
| `bootstrap/empr.ts` | Singleton `EntityStorage`, global DI registration |
| `core/filtered/entity-query.ts` | Live query updates; documents `compileFilter` location |
| `es-lienzo` / object pools | `releaseEntity` / `acquireEntity` |
| Pipeline / systems | `filter(..., executionContext)` for cached `EntityQuery` |
| Apps via `@empr/es` | Injected `EntityStorage` |


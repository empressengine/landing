---
sidebar_position: 21
sidebar_label: "filtered"
---

# API: `core/filtered`

Public entry point for the feature. Import from the core barrel or the feature index.

```typescript
import { Filtered, EntityQuery, IFiltered } from '@empr/es';
// or
import { Filtered, EntityQuery } from './core/filtered';
```

| Export | Source | Description |
|--------|--------|-------------|
| `Filtered` | `filtered.ts` | Static snapshot of matching entities |
| `EntityQuery` | `entity-query.ts` | Live, signal-driven query |
| `IFiltered` | `filtered.types.ts` | Shared iteration contract |

**Not exported from `index.ts`:** `EntityIterationCallback` (used by `IFiltered` method signatures; import from `./filtered.types` if needed).

**Dependencies:** `core/entity` (`IEntity`, `ComponentFilter`, signals), `core/component` (`ComponentType`).

---

## `EntityIterationCallback`

```typescript
type EntityIterationCallback = (entity: IEntity, index?: number) => void | Promise<void>;
```

| Parameter | Description |
|-----------|-------------|
| `entity` | Current entity in the collection |
| `index` | Position in internal array (optional; always passed by `Filtered` / `EntityQuery` iterators) |

Return `Promise` for async work in `sequential` / `parallel`.

---

## `IFiltered`

Contract for **query results** — how systems iterate matched entities without knowing snapshot vs live strategy.

| Member | Type | Description |
|--------|------|-------------|
| `size` | `number` | Count of entities in the collection |
| `items` | `IEntity[]` | Live array reference (mutates for `EntityQuery`) |
| `forEach` | `(callback) => void` | Sync iteration |
| `sequential` | `(callback) => Promise<void>` | Async, one entity after another |
| `parallel` | `(callback) => Promise<void>` | Async, all entities at once (`Promise.all`) |

Both `Filtered` and `EntityQuery` implement this interface.

---

## `Filtered`

```typescript
class Filtered implements IFiltered
```

Immutable **snapshot**: entity list fixed at construction (unless caller mutates the passed array externally).

### Constructor

```typescript
new Filtered(entities?: IEntity[])
```

| Parameter | Default | Description |
|-----------|---------|-------------|
| `entities` | `[]` | Pre-matched entities |

### Iteration semantics

| Method | Direction | Notes |
|--------|-----------|-------|
| `forEach` | Forward (`0 → length-1`) | Standard loop |
| `sequential` | Forward | `await` per entity |
| `parallel` | Forward | `entities.map(callback)` + `Promise.all` |

```typescript
const snapshot = new Filtered([e1, e2]);
snapshot.forEach((entity, i) => update(entity));
await snapshot.sequential(async (entity) => await load(entity));
await snapshot.parallel(async (entity) => await save(entity));
```

**Typical source:** `EntityStorage._slowFilter()` when `filter.each` is set, `executionContext` is missing, or one-off scans.

---

## `EntityQuery`

```typescript
class EntityQuery implements IFiltered
```

**Live query** — internal `_items` array maintained via global entity signals. No per-frame full-world scan inside the query itself.

### Constructor

```typescript
new EntityQuery(
  filter: ComponentFilter,
  withDisabled?: boolean,
  initialEntities: ReadonlyArray<IEntity>,
)
```

| Parameter | Default | Description |
|-----------|---------|-------------|
| `filter` | — | `includes` / `excludes` (see `core/entity`); **`filter.each` is not evaluated** — use `Filtered` via storage slow path if `each` is required |
| `withDisabled` | `false` | If `false`, inactive entities (`!entity.active`) never match |
| `initialEntities` | — | Seed list (usually pre-filtered by `EntityStorage`) |

On construct: pushes entities where `_isMatch(entity)`; then `_subscribe()`.

### Match logic (`_isMatch`)

```text
if (!withDisabled && !entity.active) → false
else → entity.isSatisfyFilter(filter)
```

Uses **active** components only (`isSatisfyFilter` on `Entity` — disabled components excluded).

### Signal subscriptions

| Signal | Handler |
|--------|---------|
| `OnEntityAddComponentSyncSignal` | `_handleEntityChange` |
| `OnEntityRemoveComponentSyncSignal` | `_handleEntityChange` |
| `OnEntityDestroySignal` | `_handleEntityDestroy` (remove) |
| `OnEntityReleasedSignal` | `_handleEntityDestroy` (remove — pool idle) |
| `OnEntityAcquiredSignal` | `_handleEntityChange` (re-evaluate after pool acquire) |
| `OnEntityActiveChangedSignal` | `_handleEntityChange` — **only if** `!withDisabled` |

### Dynamic updates

| Event | Action |
|-------|--------|
| Now matches, not in list | `push(entity)` |
| Matches, already in list | Replace `items[index] = entity` |
| No longer matches | `_removeByIndex` (swap-and-pop, O(1)) |
| Destroy / released | Remove by `entity.id` |

Identity in list is **`entity.id`**, not reference equality.

### Iteration semantics

| Method | Direction | Rationale |
|--------|-----------|-----------|
| `forEach` | **Backward** (`length-1 → 0`) | Safe when callback mutates components: swap-and-pop during sync removal must not skip entries |
| `sequential` | **Backward** | Same safety while awaiting |
| `parallel` | Forward (`map`) | No ordering guarantee; avoid structural mutation during callback |

```typescript
const query = new EntityQuery(
  { includes: [TransformComponent, VelocityComponent] },
  false,
  initialMatches,
);

query.forEach((entity) => system.update(entity));

await query.dispose(); // required when discarding query
```

### `dispose()`

```typescript
dispose(): void
```

Unsubscribes all signal listeners and clears `_items`. **Must** be called when the query is discarded (storage manages cached queries by context hash).

---

## Obtaining `IFiltered` (via `EntityStorage`)

`filtered` does not import storage; apps use `widgets/entity-storage`:

```typescript
storage.filter(filter, withDisabled?, executionContext?);
```

| Condition | Returns |
|-----------|---------|
| `filter.each` defined | `Filtered` snapshot (`_slowFilter`, evaluates `each`) |
| No `executionContext` | `Filtered` snapshot |
| `executionContext` + no `each` | Cached `EntityQuery` (keyed by context + includes + excludes + `withDisabled`) |

Initial `EntityQuery` population uses index optimization (`EntityIndexator`) in storage; ongoing updates are signal-driven inside `EntityQuery`.

---

## Usage patterns

### System iteration (interface-only)

```typescript
function run(system: { filter(f: ComponentFilter): IFiltered }, f: ComponentFilter): void {
  const entities = system.filter(f);
  entities.forEach((e) => { /* ... */ });
}
```

### Live query in pipeline

```typescript
const movers = storage.filter(
  { includes: [TransformComponent, VelocityComponent] },
  false,
  'update-pipeline',
);
movers.forEach((entity) => integrate(entity));
```

### One-off custom predicate

```typescript
const custom = storage.filter({
  includes: [PlayerTagComponent],
  each: (e) => e.getComponent(StatsComponent).hp > 0,
});
// Filtered snapshot — not cached EntityQuery
```

### Cleanup cached query

When invalidating execution context, storage should drop cached `EntityQuery` entries and call `dispose()` on removed queries (see `EntityStorage` implementation).

---

## Semantics and constraints

| Topic | Behavior |
|-------|----------|
| **`items` exposure** | Direct array reference; length and membership change on live queries |
| **`filter.each`** | Only honored in `EntityStorage._slowFilter`; **ignored** by `EntityQuery` |
| **Disabled components** | Excluded via `isSatisfyFilter` (active map only) |
| **Pool lifecycle** | Released → removed from query; acquired → re-checked |
| **Removal cost** | `EntityQuery` swap-and-pop O(1) |
| **Layer boundary** | No `EntityStorage` import in `core/filtered` |
| **`compileFilter`** | Lives in `widgets/entity-storage/utils` — not part of this module |

---

## `Filtered` vs `EntityQuery`

| | `Filtered` | `EntityQuery` |
|---|------------|---------------|
| Updates | Static | Reactive (signals) |
| `dispose` | N/A | Required |
| `forEach` direction | Forward | Backward |
| `filter.each` | Via storage slow path | Not supported |
| Memory | Holds array copy/reference | Subscribes to global signals |

---

## Related documentation

- `feature_description.md` — design rationale
- [`../entity/API_DOC.md`](/docs/api/es/core/entity) — `ComponentFilter`, signals
- `../../widgets/entity-storage/entity-storage.ts` — `filter()`, caching, `_slowFilter`
- Source: `filtered.ts`, `entity-query.ts`, `filtered.types.ts`, export: `index.ts`

## Known consumers (reference)

| Module | Usage |
|--------|--------|
| `widgets/entity-storage` | Creates/caches `EntityQuery`, returns `Filtered` snapshots |
| `es-sistema` / `system.types` | `filter(): IFiltered` on systems |
| Pipeline / update systems | Live queries with `executionContext` |


---
sidebar_position: 21
sidebar_label: "entity"
---

# API: `core/entity`

Public entry point for the feature. Import from the core barrel or the feature index.

```typescript
import {
  Entity,
  NodeEntity,
  ProxyEntity,
  EntityIndexator,
  IEntity,
  INodeEntity,
  ComponentFilter,
  EntityComponent,
  OnEntityAddComponentSyncSignal,
  // ...other signals
} from '@empr/es';
```

| Export | Source | Description |
|--------|--------|-------------|
| `Entity` | `entity.ts` | Base ECS container |
| `NodeEntity` | `node-entity.ts` | Hierarchical entity + scene `node` |
| `ProxyEntity` | `proxy-entity.ts` | Interception wrapper + indexation |
| `EntityIndexator` | `entity-indexator.ts` | `ComponentType` → `Set<IEntity>` index |
| `IEntity`, `INodeEntity`, … | `entity.types.ts` | Contracts and helper types |
| `OnEntity*Signal` | `entity.signals.ts` | Global lifecycle signals |

**Not exported from `index.ts`:** `createDeepProxy`, `IDeepProxyOptions` (`utils/deep-proxy.util.ts` — internal to `ProxyEntity`).

**Dependencies:** `core/component`, `shared/signal`, `core/dependency` (ProxyEntity inject).

---

## Type aliases and interfaces (`entity.types.ts`)

### `EntityReference<T>`

```typescript
type EntityReference<T extends IEntity> = { entity: T };
```

### `EntityComponent<T, K>`

```typescript
type EntityComponent<T extends Component, K extends IEntity> = EntityReference<K> & T;
```

Mounted component: user fields plus runtime `entity` back-reference (see `addComponent`).

### `ComponentFilter`

```typescript
interface ComponentFilter {
  includes: ComponentType<Component>[];
  excludes?: ComponentType<Component>[];
  each?: (entity: IEntity) => boolean;
}
```

| Field | Role |
|-------|------|
| `includes` | All listed types must be in **active** `_components` |
| `excludes` | None of listed types may be in **active** `_components` |
| `each` | Declared on interface; **`Entity.isSatisfyFilter` does not invoke `each`** (implementation gap — apply manually if needed) |

### `IInterceptorContext`

Context passed to `ProxyEntity` interceptors.

| Field | Type | Description |
|-------|------|-------------|
| `target` | `IEntity` | Proxied entity |
| `method` | `string` | Intercepted method name |
| `args` | `any[]` | Call arguments |
| `result` | `any` | Method return value (mutable by interceptors) |
| `inject` | `<T>(token: Token<T>) => T` | Resolves via `Dependency.instance.inject` |

### `InterceptorCallback`

```typescript
type InterceptorCallback = (context: IInterceptorContext) => any;
```

Return `undefined` to keep `result`; return a value to replace `result` for subsequent interceptors.

---

## `IEntity`

Contract for ECS entities. Implemented by `Entity`; extended by `INodeEntity`.

| Member | Type | Description |
|--------|------|-------------|
| `id` | `number` | Unique id (assigned at construction) |
| `name` | `string` | Debug / lookup label |
| `active` | `boolean` | Activity flag; changes dispatch `OnEntityActiveChangedSignal` |
| `components` | `Map<ComponentType, Component>` | Active components (live map reference) |
| `disabledComponents` | `Map<ComponentType, Component>` | Disabled but retained components |

### `addComponent(component)`

```typescript
addComponent(component: Component): void
```

| | |
|---|---|
| **Key** | `component.constructor` as `ComponentType` |
| **Throws** | If type already in `components` or `disabledComponents` |

**Side effects:**

1. Non-enumerable `entity` getter → `this`.
2. Non-enumerable `disposable` with `onDestroy: Signal<Component>` and `dispose()`.
3. `OnEntityAddComponentSyncSignal.dispatch(...)` — immediate.
4. `OnEntityAddComponentSignal.dispatchNextFrame(...)` — next frame.

### `removeComponent(componentType)`

```typescript
removeComponent(componentType: ComponentType<Component>): boolean
```

| **Returns** | `true` if removed from active map |

Calls `disposable.dispose()` when present; dispatches remove sync + next-frame signals.

### `removeDisabledComponent(componentType)`

Removes entry from `disabledComponents` only. **No** dispose/signals.

### `hasComponent` / `hasComponents`

Active map only. `hasComponents` — `every` type present.

### `getComponent<T>(componentType, safe?)`

```typescript
getComponent<T>(componentType: ComponentType<T>, safe?: boolean): EntityComponent<T, this>
```

| `safe` | Default `true` | Behavior |
|--------|----------------|----------|
| `true` | | Throws if missing |
| `false` | | Returns `undefined` cast as `EntityComponent` (caller must handle) |

**With `ProxyEntity`:** overridden to return deep-proxied component (cached per instance).

### `disableComponent` / `enableComponent`

| Method | Behavior |
|--------|----------|
| `disableComponent` | Moves from `_components` → `_disabledComponents`; no-op if not active; **remove** signals (same as remove) |
| `enableComponent` | Reverse; throws if not in disabled map; **add** signals |

Disabled components **do not** satisfy `isSatisfyFilter` / indexation (when proxied).

### `disableAllComponents` / `enableAllComponents`

Bulk move between maps; per-component add/remove signals fired.

### `isComponentDisabled`

Checks `disabledComponents` map.

### `isSatisfyFilter(filter)`

```typescript
isSatisfyFilter(filter: ComponentFilter): boolean
```

```text
includes.every(type => _components.has(type))
&& (excludes?.every(type => !_components.has(type)) ?? true)
```

Does **not** evaluate `filter.each`.

### `destroy()`

Disposes all active components’ `disposable`; `OnEntityDestroySignal.dispatch(this)`; clears both maps. Does not clear `disabled` disposable individually before clear — disabled map cleared without per-component dispose in `Entity.destroy` (only active components get dispose in loop).

---

## `Entity`

```typescript
class Entity implements IEntity
```

### Constructor

```typescript
new Entity(id: number, name?: string)
```

| Parameter | Default | Description |
|-----------|---------|-------------|
| `id` | — | Required unique id |
| `name` | `'Entity'` | Display name |

```typescript
const player = new Entity(1, 'Player');
player.addComponent(new HealthComponent());
```

---

## `INodeEntity<T>` / `NodeEntity<T>`

Scene-graph entity: `Entity` + external renderer node `T` (e.g. Pixi `Container`).

| Member | Description |
|--------|-------------|
| `node` | Associated renderer object |
| `parent` | Parent `INodeEntity` or `null` |
| `children` | Direct children array (mutable) |

### Constructor

```typescript
new NodeEntity<T>(node: T, id: number, name?: string)
```

### `setParent(node)`

Sets `_parent` only (does not update parent’s `children` — use `addChild` / `removeChild` for tree consistency).

### `addChild(node)`

| Behavior |
|----------|
| No-op if `node.parent === this` |
| If node had another parent → `parent.removeChild(node)` first |
| Pushes to `_children`, `node.setParent(this)` |
| `OnEntityAddChildSignal.dispatchNextFrame(node)` |

### `removeChild(node)`

| **Returns** | Removed child or `null` if not direct child |
| Actions | `splice` from `_children`, `setParent(null)`, `OnEntityRemoveChildSignal.dispatchNextFrame` |

### `getChild(name, deep?)`

| `deep` | Default `false` | Search |
|--------|-----------------|--------|
| `false` | | Direct children by `name` |
| `true` | | BFS through subtree |

### `getComponentInChildren<T>(type, deep?)`

| `deep` | Default `false` | Search |
|--------|-----------------|--------|
| `false` | | Direct children only |
| `true` | | BFS; first match |

**Throws** if not found (no `safe` flag).

### `getComponentsInChildren<T>(type, deep?, safe?)`

Collects matching components from children (shallow or BFS). Skips children without type; does not throw when list empty (unlike `getComponentInChildren`).

### `destroy()` (override)

1. Remove self from parent’s `children`.
2. Recursively `destroy()` all children.
3. Clear children; `parent = null`.
4. `super.destroy()`.

> Prefer public removal APIs (e.g. `deinstantiate` from app layer) over raw `destroy()` when using `EntityStorage` — see TS-doc on method.

---

## `EntityIndexator`

Static `Map<ComponentType, Set<IEntity>>` for O(1) component lookups.

| Method | Description |
|--------|-------------|
| `getIndexedEntities(componentType)` | `ReadonlySet<IEntity>`; frozen `EMPTY_SET` if none (zero alloc) |
| `indexEntity(entity, componentType)` | Add to set (create set if needed) |
| `unindexEntity(entity, componentType)` | Remove from set |
| `clearIndex()` | Clear entire map |

Updated automatically when entities are wrapped with `ProxyEntity` (constructor registers interceptors).

---

## `ProxyEntity`

Wraps `IEntity` for method interception and component deep-proxy observation.

### Static API

| Method | Description |
|--------|-------------|
| `addInterceptor(method, callback)` | Register global interceptor chain per method name |
| `removeInterceptor(method, callback?)` | Remove one callback or all for `method` |
| `getInterceptors(name)` | Copy of registered callbacks |
| `hasInterceptor(name)` | Whether any interceptor exists |

### Instance

| Method | Description |
|--------|-------------|
| `create(entity)` | Returns `Proxy` around entity; overrides `getComponent`; wires indexation interceptors |

**Built-in intercepted methods (indexation):** `addComponent`, `removeComponent`, `disableComponent`, `enableComponent`, `disableAllComponents`, `enableAllComponents`, `destroy`.

**Component property changes:** `getComponent` returns `createDeepProxy` wrapper; `onSet` fires interceptors for method name `'updateComponent'` with args `[componentType, key, value, oldValue]`.

**Error isolation:** `safeInvokeInterceptors` — per-interceptor try/catch, continues chain.

### Constructor side effect

`new ProxyEntity()` calls `addEntityIndexation()` — registers default `EntityIndexator` interceptors.

```typescript
const proxyEntity = new ProxyEntity();
const entity = proxyEntity.create(new Entity(1, 'Player'));
```

Registered in `bootstrap/empr.ts` as global `ProxyEntity` for storage/factory pipelines.

---

## Global signals (`entity.signals.ts`)

All are `Signal<T>` instances (await async listeners on `dispatch`).

| Signal | Payload | When dispatched (typical) |
|--------|---------|---------------------------|
| `OnEntityAddComponentSyncSignal` | `{ entity, type, component }` | Immediately on add / enable |
| `OnEntityAddComponentSignal` | same | Next frame on add / enable |
| `OnEntityRemoveComponentSyncSignal` | `{ entity, type, component }` | Immediately on remove / disable |
| `OnEntityRemoveComponentSignal` | same | Next frame on remove / disable |
| `OnEntityDestroySignal` | `IEntity` | `Entity.destroy()` |
| `OnEntityActiveChangedSignal` | `IEntity` | `active` setter changes |
| `OnEntityAddChildSignal` | `INodeEntity<any>` | Next frame after `addChild` |
| `OnEntityRemoveChildSignal` | `INodeEntity<any>` | Next frame after `removeChild` |
| `OnEntityReleasedSignal` | `IEntity` | Pool release / storage deregister (`widgets/entity-storage`) |
| `OnEntityAcquiredSignal` | `IEntity` | Pool acquire / storage register |

```typescript
OnEntityAddComponentSyncSignal.listen(({ entity, type, component }) => {
  // same-frame reaction
});
```

---

## Internal: `createDeepProxy` (reference)

```typescript
createDeepProxy<T>(data: T, options: IDeepProxyOptions, cache?: WeakMap): T
```

| Option | Description |
|--------|-------------|
| `ignore` | Keys skipped for get/set proxying |
| `onSet` | Fired when property value changes |
| `onGet` | Fired on property read |

**Not proxied deeper:** `Array`, `Entity`, `Promise`. Used by `ProxyEntity.overrideAddComponent` with `ignore: ['entity', 'node', 'sortDirty']`.

---

## Usage patterns

### Composition

```typescript
const e = new Entity(nextId(), 'Enemy');
e.addComponent(new TransformComponent());
const t = e.getComponent(TransformComponent);
t.entity === e;
```

### Filtering (systems / queries)

```typescript
const filter: ComponentFilter = {
  includes: [TransformComponent, VelocityComponent],
  excludes: [DeadTagComponent],
};
if (e.isSatisfyFilter(filter)) { /* ... */ }
```

### Scene hierarchy

```typescript
const parent = new NodeEntity(container, 1, 'Root');
const child = new NodeEntity(sprite, 2, 'Sprite');
parent.addChild(child);
```

### Fast lookup

```typescript
const withPosition = EntityIndexator.getIndexedEntities(PositionComponent);
for (const entity of withPosition) { /* ... */ }
```

### Custom proxy hook

```typescript
ProxyEntity.addInterceptor('addComponent', (ctx) => {
  console.log('added', ctx.args[0]);
});
```

---

## Semantics and constraints

| Topic | Behavior |
|-------|----------|
| **Component key** | Constructor function, one instance per type per entity |
| **Disable vs remove** | Disable preserves state; excluded from filters and index |
| **Signals** | Sync + next-frame pairs for add/remove component |
| **Maps exposed** | `components` / `disabledComponents` are live internal maps |
| **`filter.each`** | Not applied in `isSatisfyFilter` |
| **Pool signals** | Defined here; dispatched from `EntityStorage` |
| **Layer** | Core kernel; no game-specific components in this folder |

---

## Related documentation

- `feature_description.md` — design rationale
- [`../component/API_DOC.md`](/docs/api/es/core/component) — `Component`, `ComponentType`
- [`../../shared/signal/API_DOC.md``signal` — `Signal` dispatch semantics
- `core/filtered/entity-query.ts` — reactive queries using `ComponentFilter`
- `widgets/entity-storage` — creation, pool acquire/release signals

## Known consumers (reference)

| Module | Usage |
|--------|--------|
| `bootstrap/empr.ts` | Global `ProxyEntity` |
| `widgets/entity-storage` | Entity lifecycle, pool signals |
| `core/filtered/entity-query` | Listens to component/destroy signals |
| `es-lienzo` / `PixiEntity`, pools | `NodeEntity`, acquire/release |
| Apps (`resizer`, slot systems) | Entity signals, hierarchy |


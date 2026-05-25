---
sidebar_position: 21
sidebar_label: "entity"
---

# API: `core/entity`

Public entry point for the PixiJS-specific ECS entity bridge. Import from the core barrel or the feature index.

```typescript
import { PixiEntity, IMaskOptions } from '@empr/es-lienzo';
// or
import { PixiEntity, IMaskOptions } from './core/entity';
```

| Export | Source | Description |
|--------|--------|-------------|
| `PixiEntity` | `pixi-entity.ts` | `NodeEntity<Container>` synced with PixiJS scene graph |
| `IMaskOptions` | `pixi-entity.types.ts` | Mask shape configuration for `PixiEntity.mask()` |

**Dependencies:**

| Package | Symbols used |
|---------|----------------|
| `@empr/es` | `NodeEntity`, `nextId`, `OnEntityActiveChangedSignal` (+ full `Entity` / `INodeEntity` API via inheritance) |
| `pixi.js` | `Container`, `Graphics` |

**Base implementation (reference):** [`@empr/es` `core/entity`](/docs/api/es/core/entity) — `Entity`, `NodeEntity`, signals, `EntityIndexator`, `ProxyEntity`.

---

## `IMaskOptions`

Configuration for `PixiEntity.mask()`. Builds a `Graphics` child and applies it as `node.mask` (unless debug mode).

| Field | Type | Required | Default / notes |
|-------|------|----------|-----------------|
| `type` | `'rect' \| 'circle'` | yes | Mask geometry |
| `x` | `number` | yes | X position passed to draw calls |
| `y` | `number` | yes | Y position passed to draw calls |
| `width` | `number` | rect only | If omitted for `rect`, falls back to `x` |
| `height` | `number` | rect only | If omitted for `rect`, falls back to `y` |
| `radius` | `number` | circle only | Default `1` when omitted |
| `color` | `number` | no | `beginFill` color; default `0xffffff` |
| `isDebug` | `boolean` | no | When `true`, **does not** set `node.mask`; graphic is still added as first child for visual debugging |

```typescript
entity.mask({
  type: 'rect',
  x: 0,
  y: 0,
  width: 200,
  height: 100,
  color: 0x000000,
});

entity.mask({
  type: 'circle',
  x: 50,
  y: 50,
  radius: 40,
  isDebug: true,
});
```

### Mask implementation notes (`mask()`)

| `type` | Pixi drawing | Extra behavior |
|--------|--------------|----------------|
| `rect` | `drawRect(x, y, x + width, y + height)` after resolving `width` / `height` | Sets `container.pivot` to `(width/2, height/2)` |
| `circle` | `drawCircle(x, y, radius)` | Sets mask graphic position to `(node.width/2, node.height/2)` |

The `Graphics` instance is always `addChildAt(container, 0)` on the entity’s `node`. Callers typically invoke `mask` once per entity during build (`TreeBuilder` wires `options.mask`).

---

## `PixiEntity`

```typescript
class PixiEntity extends NodeEntity<Container>
```

Concrete ECS entity whose logical tree (`children`, `parent`, components) stays synchronized with the PixiJS display list (`node`, `addChild` / `removeChild` on `Container`).

**Layer:** `core` — bridges `@empr/es` hierarchy to Pixi; does not manage `EntityStorage`, pooling registry, or transforms (those live in `features` / components / systems).

### Constructor

```typescript
new PixiEntity(node: Container)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `node` | `Container` | Pixi display object backing this entity |

**Side effects:**

1. `id = nextId()` from `@empr/es`.
2. `super(node, id, node.name || \`Entity_${id}\`)` — registers `NodeEntity` with the given container.

```typescript
const container = new Container();
container.name = 'hero';
const entity = new PixiEntity(container);
entity.addComponent(new HealthComponent());
```

---

### `name` (getter override)

```typescript
get name(): string
```

| | |
|---|---|
| **Returns** | `this.node.name` if non-empty, otherwise `` `Entity_${this.id}` `` |

Reads from the Pixi `Container`, not from the internal `Entity._name` field alone. Keep `node.name` in sync if systems resolve entities by name via `getChild(name)`.

---

### `active` (getter / setter override)

```typescript
get active(): boolean
set active(value: boolean)
```

| | |
|---|---|
| **Getter** | `this.node.visible` |
| **Setter** | Sets `node.visible`; dispatches `OnEntityActiveChangedSignal` only when visibility **changes** |

Replaces the base `Entity` `_active` flag with direct Pixi visibility. Logical “inactive” equals not rendered.

```typescript
entity.active = false; // node.visible === false, signal fired once
```

---

### `node` (inherited getter)

```typescript
get node(): Container
```

From `NodeEntity<Container>`. Same reference passed to the constructor.

---

### `addChild(entity)` (override)

```typescript
addChild(entity: PixiEntity): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `entity` | `PixiEntity` | Child entity (must be `PixiEntity` at type level) |

**Flow:**

1. `super.addChild(entity)` — ECS tree: reparent if needed, push to `_children`, `OnEntityAddChildSignal.dispatchNextFrame`.
2. `this.node.addChild(entity.node)` — Pixi scene graph append.

Idempotent when `entity.parent === this` (handled in `NodeEntity.addChild`).

```typescript
parent.addChild(child);
// parent.children includes child AND parent.node contains child.node
```

---

### `removeChild(entity)` (override)

```typescript
removeChild(entity: PixiEntity): PixiEntity | null
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `entity` | `PixiEntity` | Direct child to detach |

| | |
|---|---|
| **Returns** | Removed `PixiEntity`, or `null` if not a direct child |

**Flow:**

1. `super.removeChild(entity)` — ECS tree update, `setParent(null)`, `OnEntityRemoveChildSignal.dispatchNextFrame`.
2. If removed: `this.node.removeChild(removedEntity.node)`.

Used by `PixiObjectPool.release()` via `item.parent?.removeChild(item)` to detach pooled entities from the scene graph.

```typescript
const removed = parent.removeChild(child);
if (removed) {
  // child.node no longer under parent.node
}
```

---

### `mask(value)`

```typescript
mask(value: IMaskOptions): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `value` | `IMaskOptions` | Rectangle or circle mask specification |

Creates a `Graphics` mask child, optionally assigns `this.node.mask`. Does not remove previous mask children; repeated calls add additional graphics at index `0`.

---

### `destroy()` (override)

```typescript
destroy(): void
```

| | |
|---|---|
| **Visibility** | `@internal` lifecycle hook — **not** the public removal API |

**Flow:**

1. `super.destroy()` — `NodeEntity`: detach from parent, recursively `destroy()` all ECS children, clear children, then `Entity.destroy()` (component disposal, `OnEntityDestroySignal`).
2. `this.node.destroy({ children: true })` — releases Pixi GPU resources for this subtree.

**Does not:** remove the entity from `EntityStorage` or `EntityIndexator`. Direct calls leave stale storage/index entries.

**Safe removal:** use `deinstantiate()` from `features/view`:

```typescript
import { deinstantiate } from '@empr/es-lienzo';

deinstantiate(entity); // EntityStorage.destroyEntity → destroy cascade + index cleanup
```

```typescript
// ❌ Bypasses storage
entity.destroy();

// ✅ Canonical
deinstantiate(entity);
```

---

## Inherited API (`NodeEntity` / `Entity` from `@empr/es`)

`PixiEntity` does not override component or shallow hierarchy lookup APIs. Use the base types when typing against storage or systems.

### Hierarchy (`NodeEntity<Container>`)

| Member | Description |
|--------|-------------|
| `parent` | `INodeEntity<Container> \| null` |
| `children` | `INodeEntity<Container>[]` (direct children, mutable array ref) |
| `setParent(node)` | Updates `_parent` only; prefer `addChild` / `removeChild` for tree integrity |
| `getChild(name, deep?)` | By `name` on direct children or BFS when `deep === true` |
| `getComponentInChildren(type, deep?)` | First match; **throws** if missing |
| `getComponentsInChildren(type, deep?, safe?)` | Collect matches; empty array allowed |

`NodeEntity.destroy()` (via `super.destroy()` in step 1) recursively destroys children before clearing this entity’s components.

### Components (`Entity`)

| Member | Description |
|--------|-------------|
| `id` | `number` — assigned in `PixiEntity` constructor via `nextId()` |
| `components` | Active `Map<ComponentType, Component>` |
| `disabledComponents` | Disabled-but-retained components |
| `addComponent` / `removeComponent` | With global add/remove signals (sync + next frame) |
| `getComponent` / `hasComponent` / `hasComponents` | Standard ECS access |
| `disableComponent` / `enableComponent` / `disableAllComponents` / `enableAllComponents` | Toggle without destroying component instances |
| `isSatisfyFilter(filter)` | `includes` / `excludes` on **active** components only |

Full signatures, signal payloads, and edge cases: [`libs/empr/es/src/core/entity/API_DOC.md`](/docs/api/es/core/entity).

### Signals used by `PixiEntity`

| Signal | Triggered from `PixiEntity` |
|--------|----------------------------|
| `OnEntityActiveChangedSignal` | `active` setter when `node.visible` changes |
| `OnEntityAddChildSignal` | `addChild` (via `NodeEntity`, next frame) |
| `OnEntityRemoveChildSignal` | `removeChild` (via `NodeEntity`, next frame) |
| `OnEntityDestroySignal` | `destroy` (via `Entity` in `super.destroy()`) |
| Component signals | `addComponent` / `removeComponent` / disable / enable (unchanged) |

---

## Usage patterns

### Create from declarative view build

```typescript
// tree-builder behaviours (typical)
const entity = new PixiEntity(pixiContainer);
storage.addEntity(entity);
entity.addComponent(viewComponent);
parent?.addChild(entity);
```

### Toggle visibility from a system

```typescript
const hero = storage.getEntity(id) as PixiEntity;
hero.active = !hero.active;
```

### Detach without destroying (pooling)

```typescript
entity.parent?.removeChild(entity);
pool.release(entity);
```

`PixiObjectPool.release` performs parent `removeChild` before base pool `release`.

### Apply clipping during tree build

```typescript
// TreeNode options → TreeBuilder.create
options.mask && entity.mask(options.mask);
```

### Traverse ECS vs Pixi

```typescript
const child = parent.getChild('slot-3');
child?.node.position.set(10, 20);

parent.node.children; // Pixi display list (includes mask graphics, etc.)
```

---

## Semantics and constraints

| Topic | Behavior |
|-------|----------|
| **Dual tree** | ECS `children` and Pixi `node.children` stay aligned on `addChild` / `removeChild` only; manual `node.addChild` without ECS breaks invariants. |
| **`active` vs `Entity._active`** | `PixiEntity` does not maintain `_active`; visibility is authoritative on `node.visible`. |
| **`destroy` vs `deinstantiate`** | `destroy` is for storage-driven teardown; direct calls leak storage/index state. |
| **Child `destroy` order** | `super.destroy()` recursively destroys child `PixiEntity` instances (each runs full `PixiEntity.destroy`); then this `node.destroy({ children: true })` runs on the root container. |
| **Transforms** | Position, scale, rotation are **out of scope** for `PixiEntity`; use components/systems. |
| **Typing** | `addChild` / `removeChild` require `PixiEntity`; passing plain `NodeEntity` breaks Pixi sync at compile time in strict call sites. |
| **Mask graphics** | Mask `Graphics` remains a child at index `0`; not automatically removed on entity reuse. |
| **Storage** | Registration in `EntityStorage` is done by `instantiate`, `TreeBuilder`, `PixiObjectPool.acquire`, etc. — not by the constructor alone. |

---

## Internal model (reference)

```
┌─────────────────────────────────────────────────────────────┐
│  PixiEntity extends NodeEntity<Container> extends Entity    │
├─────────────────────────────────────────────────────────────┤
│  ECS side                    │  Pixi side                   │
│  _children[], parent         │  node: Container             │
│  components Map              │  node.visible ↔ active       │
│  addChild / removeChild      │  node.addChild / removeChild │
│  destroy() → components      │  destroy() → node.destroy   │
└─────────────────────────────────────────────────────────────┘

Safe external lifecycle:
  instantiate / storage.addEntity  →  world registration
  deinstantiate / storage.destroyEntity  →  destroy() + index cleanup
  PixiObjectPool.release  →  parent.removeChild + pool idle
```

---

## Related documentation

- `feature_description.md` — motivation, dual-tree and masking rationale
- Base ECS entity API: [`@empr/es` `core/entity/API_DOC.md`](/docs/api/es/core/entity)
- Source: `pixi-entity.ts`, `pixi-entity.types.ts`, export: `index.ts`
- Safe teardown: ``deinstantiate.ts``

## Known consumers (reference)

| Module | Usage |
|--------|--------|
| `features/tree-builder/*` | `new PixiEntity(view)`, `addChild`, `mask`, refs |
| `features/tree-builder/tree-builder.types.ts` | `Ref<PixiEntity>`, `RefCollection<PixiEntity>` |
| `features/view/view.types.ts` | `IParentable.parent: PixiEntity` |
| `features/view/deinstantiate.ts` | `EntityStorage.destroyEntity` for any `IEntity` |
| `features/scene/scene.ts` | Scene root entities |
| `core/object-pool/pixi-object-pool.ts` | `ObjectPool<PixiEntity>` + `removeChild` on release |
| `widgets/interaction-service` | Entity hit targets |
| `widgets/pixi-pools` | Pooled `PixiEntity` instances |

Pooling, instantiation, and scene orchestration are documented in their respective feature modules.


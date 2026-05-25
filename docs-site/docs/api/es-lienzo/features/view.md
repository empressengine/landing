---
sidebar_position: 31
sidebar_label: "view"
---

# API: `features/view`

Public entry point for the fluent `TreeNode` DSL and ECS/Pixi lifecycle facades. Import from the features barrel or the feature index.

```typescript
import {
  View,
  ViewFactory,
  ViewData,
  InstantiateOptions,
  IParentable,
  instantiate,
  deinstantiate,
} from '@empr/es-lienzo';
// or
import { View, ViewFactory, instantiate, deinstantiate } from './features/view';
```

| Export | Source | Description |
|--------|--------|-------------|
| `View` | `view.ts` | Fluent builder compiling to `TreeNode` |
| `ViewFactory<T>` | `view.types.ts` | `(view, props) => void` scene blueprint callback |
| `ViewData<T>` | `view.types.ts` | Infers props type from a `ViewFactory` |
| `InstantiateOptions<T>` | `view.types.ts` | `parent`, `x`, `y`, plus factory props |
| `IParentable` | `view.types.ts` | `{ parent: PixiEntity }` |
| `instantiate` | `instantiate.ts` | Factory → `TreeBuilder.create` → `PixiEntity` |
| `deinstantiate` | `deinstantiate.ts` | `EntityStorage.destroyEntity` facade |

**Dependencies:**

| Package / module | Symbols |
|------------------|---------|
| `@empr/es` | `Dependency`, `EntityStorage`, `Component`, `ComponentType` |
| `../tree-builder` | `TreeNode`, `TreeBuilder`, node types, `AxisContainer`, … |
| `../../core/entity` | `PixiEntity`, `IMaskOptions` |
| `../../shared/ref` | `Ref`, `RefCollection` |
| `pixi.js` | `Polygon`, styles (via builder methods) |

**Out of scope:** Pixi object creation ([`tree-builder`](/docs/api/es-lienzo/features/tree-builder)), asset loading ([`assets-loader`](/docs/api/es-lienzo/features/assets-loader)), scene roots ([`scene`](/docs/api/es-lienzo/features/scene)). `View` only builds configuration POJOs unless you call `instantiate`.

---

## Architecture

```text
ViewFactory(view, props)
  → View fluent chain
  → view.create() → TreeNode

instantiate(factory, options?)
  → new View(); factory(view, props)
  → config = view.create()
  → merge x/y into config.position
  → TreeBuilder.create(config, parent)
  → PixiEntity proxy

deinstantiate(entity)
  → EntityStorage.destroyEntity(entity)
```

| Layer | Role |
|-------|------|
| `View` | Authoring DSL — no Pixi instances |
| `instantiate` | Wire DSL → ECS |
| `TreeBuilder` | Materialize `TreeNode` |
| `Scene.setView` / `addShared` | Pass `ViewFactory`, internally uses `instantiate` pattern via `View.create()` |

---

## `ViewFactory<T>`

```typescript
type ViewFactory<T = {}> = (view: View, props: T & undefined) => void;
```

| Parameter | Description |
|-----------|-------------|
| `view` | Fresh `View` builder (or nested child builder in `addChild`) |
| `props` | Typed payload from `InstantiateOptions` (stripped `parent`, `x`, `y`) |

```typescript
interface ISymbolProps {
  id: number;
  type: string;
}

const symbolView: ViewFactory<ISymbolProps> = (view, { id, type }) => {
  view
    .ofType(Container, `symbol_${id}`)
    .size(100, 100)
    .addChild((c) => c.ofType(Sprite, 'icon').texture(type, 'main').anchor(0.5, 0.5));
};
```

`PrefabFactory` from [`prefab-service``prefab-service` uses the same `(view, props) => void` shape to mutate an existing `View`.

---

## `InstantiateOptions<T>`

```typescript
type InstantiateOptions<T> = Partial<IParentable> & Partial<IVec2> & T;
```

| Field | Description |
|-------|-------------|
| `parent` | Parent `PixiEntity` for `TreeBuilder.create(..., parent)` |
| `x`, `y` | Applied to root `config.position` after `create()` |
| `...props` | Forwarded to `ViewFactory` (factory-specific fields) |

```typescript
const entity = instantiate(symbolView, {
  parent: reelEntity,
  x: 10,
  y: 20,
  id: 0,
  type: 'H1',
});
```

Uses `Dependency.instance.inject(TreeBuilder)` — requires global DI bootstrap (`EmprLienzo`).

---

## `instantiate(factory, options?)`

```typescript
function instantiate<T>(
  factory: ViewFactory<T>,
  options?: InstantiateOptions<T>,
): PixiEntity
```

| | |
|---|---|
| **Returns** | Proxy `PixiEntity` from `EntityStorage` |
| **Throws** | From `TreeBuilder` / behaviours if assets missing, unsupported types, etc. |

Does not return the raw `View` — only the built entity.

---

## `deinstantiate(entity)`

```typescript
function deinstantiate(entity: IEntity): void
```

| | |
|---|---|
| **Parameter** | Entity created via `instantiate` (or same storage path) |
| **Effect** | `EntityStorage.destroyEntity` — recursive children, GPU cleanup, index removal |

Canonical teardown counterpart to `instantiate`. Prefer over manual `removeEntity` from game code.

```typescript
deinstantiate(symbolEntity);
```

---

## `View` class

Stateful builder; `private _config!: TreeNode`. Must call `ofType`, `ofView`, or `ofConfig` before other methods (`checkConfig` throws otherwise).

**Constructor:** `new View(existingConfig?)` — used internally by `getChild` / `getDeepChild` to edit subtrees in place.

**Terminal:** `create(): TreeNode` — returns the compiled schema (does not register ECS).

### Root setup

| Method | Description |
|--------|-------------|
| `ofType(type, name?)` | Start or replace root; `type` is `NodeType` from tree-builder |
| `ofView(factory, props?)` | Embed another factory’s output as root config |
| `ofConfig(config)` | Assign full `TreeNode` (use for `AxisContainer`, `NineSlicePlane`, imports) |
| `name(name)` | Set / change `name` |

**`NodeType` covers:** `Container`, `Sprite`, `Text`, `BitmapText`, `Spine`, `NineSlicePlane` — **not** `AxisContainer`. For axis layout:

```typescript
view.ofConfig({
  type: AxisContainer,
  name: 'toolbar',
  gap: 12,
  children: [],
});
// or in addChild:
.addChild((c) => c.ofConfig({ type: AxisContainer, name: 'row', gap: 8 }))
```

### Transform & display (all node types)

| Method | Maps to `TreeNode` field |
|--------|--------------------------|
| `position(x, y)` | `position` |
| `x` / `y` | `position` partial |
| `scale` / `scaleX` / `scaleY` | `scale` |
| `width` / `height` / `size` | `width`, `height` |
| `pivot(x, y)` | `pivot` |
| `visible` / `alpha` | `visible`, `alpha` |
| `rotation` / `angle` | `rotation`, `angle` |

### Layers & sorting

| Method | Maps to |
|--------|--------|
| `parentGroup(group)` | `parentGroup` → `LayersService.getGroup` at build |
| `order(order)` | **`zOrder`** (not `zIndex`) |
| `zIndex(zIndex)` | `zIndex` |
| `sortable(sortable)` | `sortableChildren` |

### Interaction

| Method | Description |
|--------|-------------|
| `interactiveChildren(bool)` | Pixi `interactiveChildren` |
| `eventMode(mode)` | Creates/updates `interactive.eventMode` |
| `cursor(cursor)` | Creates/updates `interactive.cursor` |
| `interactive(opts)` | Full `IInteractivityOptions` block |
| `hitArea(polygon)` | `hitArea` |
| `mask(mask)` | `IMaskOptions` → applied at `TreeBuilder` |

Prepares nodes for [`InteractionService``interaction-service`.

### Tree structure

| Method | Description |
|--------|-------------|
| `addChild(callback)` | New `View` for child → `children.push(child.create())` |
| `addChildrenByCount(n, callback)` | Repeat child builder `n` times |
| `addChildren(arr, callback)` | One child per array item |
| `getChild(name, callback)` | Shallow find by `name`, mutate via `new View(childConfig)` |
| `getDeepChild(name, callback)` | BFS find by `name`, mutate subtree |
| `removeChild(name)` | Filter top-level `children` |
| `removeDeepChild(name)` | Remove first matching name in nested tree |

`getChild` / `getDeepChild` are the prefab override pattern (no separate `overrideConfig` API).

### Sprite / texture

| Method | Valid on | Description |
|--------|----------|-------------|
| `anchor(x, y)` | `Sprite`, `Text` | Sets `anchor` |
| `bundle(bundle)` | `Sprite`, `NineSlicePlane`, `Spine` | `bundle` field |
| `texture(asset)` | `Sprite`, `NineSlicePlane` | Asset name in storage |
| `tint(tint)` | `Sprite`, `BitmapText`, `NineSlicePlane` | Color multiply |

Wrong node type → `throw new Error('... can only be set on ...')`.

### Text

| Method | Valid on |
|--------|----------|
| `text(string)` | `Text`, `BitmapText` |
| `textStyle(partial)` | `Text` |
| `bitmapTextStyle(partial)` | `BitmapText` |

### Spine

| Method | Valid on |
|--------|----------|
| `spine(asset)` | Sets spine skeleton asset name |
| `initialAnimation(name)` | Auto-play via `SpineService` at build |
| `skin(name)` | Lane skin option |
| `loop(count)` | Spine lane `loop` |
| `timeScale(value)` | Spine lane time scale |
| `key(key)` | Spine chain name prefix |

Atlas convention at build: `${asset}Atlas` (see [`tree-builder` spine behaviour``spine-builder.behaviour.ts``).

### Nine-slice

| Method | Description |
|--------|-------------|
| `nineSlice({ leftWidth, rightWidth, topHeight, bottomHeight })` | Requires `ofType(NineSlicePlane, …)` or `ofConfig` with `NineSlicePlane` |

### AxisContainer layout

| Method | Valid when `type === AxisContainer` |
|--------|-------------------------------------|
| `isVertical()` | `isVertical: true` |
| `gap(n)` | `gap` |
| `justifyContent('start' \| 'center' \| 'end')` | Main axis |
| `alignItems('start' \| 'center' \| 'end')` | Cross axis |

### ECS components on schema

| Method | Behavior |
|--------|----------|
| `addComponent(component)` | Push to `components[]` |
| `addComponents(components)` | **Replaces** entire `components` array |
| `removeComponent(ComponentType)` | Filter root `components` |
| `removeDeepComponent(type)` | Remove first matching type in BFS tree |
| `removeDeepComponents(type)` | Remove all matching types in BFS tree |

Components are attached on the proxy entity at `TreeBuilder.create` time.

### References

| Method | Description |
|--------|-------------|
| `ref(ref)` | Bind `Ref<PixiEntity>` — filled at build |
| `refById(id)` | `Ref.create<PixiEntity>(id)` |
| `removeRef()` | Clear `ref` |
| `collectionRef(collection)` | `RefCollection` |
| `collectionRefById(id)` | `RefCollection.get` or `create` |
| `removeCollectionRef()` | Clear `refCollection` |

---

## Usage patterns

### Scene main view

```typescript
// ViewFactory passed to Scene / pipeline
const mainGameView: ViewFactory = (view) => {
  view.ofType(Container, 'game_root').addChild((layer) => { /* ... */ });
};

scene.setView(mainGameView);
// internally: View → create() → instantiate equivalent via Scene
```

`Scene.setView` uses `instantiate(scene, { parent: _viewEntity })` path in `scene.ts`.

### Standalone spawn

```typescript
const popup = instantiate(popupView, { parent: hudEntity });
```

### Nested factory

```typescript
const panelView: ViewFactory = (view) => {
  view.ofType(Container, 'panel').addChild((header) => {
    header.ofView(titlePrefab, { title: 'Win' });
  });
};
```

### Post-hoc child override

```typescript
view
  .ofType(Container, 'button')
  .addChild((icon) => icon.ofType(Sprite, 'icon').texture('default'))
  .getDeepChild('icon', (icon) => icon.texture('pressed'));
```

### Config-only root

```typescript
instantiate(
  (v) => v.ofConfig(importedTreeFromJson),
  { parent: root },
);
```

### Pool factory ([`pixi-pools``pixi-pools`)

```typescript
factory: () => instantiate(symbolView, { id: SymbolId.Cherry, type: 'cherry' }),
```

---

## Error semantics

| Trigger | Typical error |
|---------|----------------|
| Method before `ofType` / `ofView` / `ofConfig` | `Config is not initialized` |
| `getChild` / `getDeepChild` miss | `Child with name X not found` |
| Type-specific setter on wrong `type` | `... can only be set on ...` |
| `instantiate` + missing texture | From `AssetsStorage` / builder at build time |

---

## Semantics and constraints

| Topic | Behavior |
|-------|----------|
| **Pure builder** | `View` never touches Pixi display list |
| **`create()` vs `instantiate`** | `create()` = data only; `instantiate()` = live entity |
| **`addComponents`** | Overwrites list; use `addComponent` to append one |
| **`order()`** | Writes `zOrder`, not `zIndex` |
| **DI** | `instantiate` / `deinstantiate` use `Dependency.instance` |
| **Props typing** | `ViewFactory<IMyProps>` + matching `instantiate(..., props)` |
| **Destruction** | Use `deinstantiate`; `TreeBuilder` `removed` vs `destroy` hooks still apply when detaching without destroy |

---

## Internal model (reference)

```
┌──────────────────────────────────────────┐
│  View                                    │
│  _config: TreeNode                       │
│  fluent methods → mutate _config         │
│  create() → TreeNode                     │
└────────────────┬─────────────────────────┘
                 │ instantiate()
                 ▼
┌──────────────────────────────────────────┐
│  TreeBuilder.create(TreeNode, parent?)   │
└──────────────────────────────────────────┘
```

---

## Related documentation

- `feature_description.md` — DSL rationale, prefab overrides
- [`../tree-builder/API_DOC.md`](/docs/api/es-lienzo/features/tree-builder) — `TreeNode` fields, materialization
- [`../scene/API_DOC.md`](/docs/api/es-lienzo/features/scene) — `setView` / `addShared`
- [`../../widgets/prefab-service/API_DOC.md``prefab-service` — reusable `View` fragments
- [`../../shared/ref``ref` — `Ref` / `RefCollection`
- Source: `view.ts`, `view.types.ts`, `instantiate.ts`, `deinstantiate.ts`, export: `index.ts`

## Known consumers (reference)

| Module | Usage |
|--------|--------|
| `features/scene/scene.ts` | `instantiate` for view/shared |
| `features/view/instantiate.ts` | Core facade |
| `apps/slot-client` / `slot-cd-client` `*.view.ts` | `ViewFactory` definitions |
| `apps/slot-client/.../scene-*-*.system.ts` | `ViewFactory` → `Scene` |
| `widgets/pixi-pools` | `instantiate` in pool factories |
| `widgets/prefab-service` | `PrefabFactory` mutates `View` |

Host apps colocate `*View.ts` files exporting factories; pipelines reference them by import.


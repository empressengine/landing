---
sidebar_position: 31
sidebar_label: "tree-builder"
---

# API: `features/tree-builder`

Public entry point for declarative Pixi scene graph construction and ECS registration. Import from the features barrel or the feature index.

```typescript
import {
  TreeBuilder,
  TreeNode,
  AxisContainer,
  FitContainer,
  OnViewCreatedSignal,
  OnViewDestroyedSignal,
  OnViewRemovedSignal,
  IInteraction,
  PixiEventType,
  PixiEventMode,
  IBuilderBehaviour,
  IBuilderResult,
  IDisplayObjectOptions,
  IContainerOptions,
  IAxisContainerOptions,
  IFitContainerOptions,
  IDebugBoundsOptions,
  ISpriteOptions,
  ITextOptions,
  IBitmapTextOptions,
  ISpineOptions,
  ISpineSlotAttachment,
  INineSliceOptions,
  ViewType,
} from '@empr/es-lienzo';
// or
import { TreeBuilder, TreeNode, FitContainer, IInteraction } from './features/tree-builder';
```

| Export | Source | Description |
|--------|--------|-------------|
| `TreeBuilder` | `tree-builder.ts` | Main factory: `TreeNode` → `PixiEntity` proxy in `EntityStorage` |
| `AxisContainer` | `nodes/axis-container.ts` | Flex-like auto-layout `Container` |
| `FitContainer` | `nodes/fit-container.ts` | Scale-to-fit `Container` (`object-fit: contain` semantics) |
| `OnViewCreatedSignal` | `tree-builder.signals.ts` | Next frame after subtree built |
| `OnViewDestroyedSignal` | `tree-builder.signals.ts` | Permanent destroy |
| `OnViewRemovedSignal` | `tree-builder.signals.ts` | Detach / pool-friendly release |
| `TreeNode` | `tree-builder.types.ts` | Union of node option interfaces |
| `IInteraction` | `tree-builder.types.ts` | `InteractionService` payload type |
| `PixiEventType` / `PixiEventMode` | `tree-builder.types.ts` | Pointer event names / modes |
| `I*Options` | `tree-builder.types.ts` | Per-type declarative schemas |
| `ISpineSlotAttachment` | `tree-builder.types.ts` | Declarative slot attachment config (`slotName`, `child` `TreeNode`, `clearExisting?`) |
| `IDebugBoundsOptions` | `tree-builder.types.ts` | Debug overlay color/alpha config (shared across nodes) |
| `IBuilderBehaviour` / `IBuilderResult` | `tree-builder.types.ts` | Strategy contract + behaviour output |

**Not exported:** `*BuilderBehaviour` classes, `AbstractBuilderBehaviour` (internal / extend in-repo only).

**Dependencies:**

| Package / module | Symbols |
|------------------|---------|
| `@empr/es` | `IDependency`, `EntityStorage`, `Component`, `Signal`, `waitNextFrame` |
| `pixi.js` | `Container`, `Sprite`, `Text`, `BitmapText`, `NineSlicePlane`, … |
| `@esotericsoftware/spine-pixi-v7` | `Spine` |
| `../../core/entity` | `PixiEntity`, `IMaskOptions` |
| `../../shared/ref` | `Ref`, `RefCollection` |
| `../../widgets/layers-service` | `LayersService` (via `AbstractBuilderBehaviour`) |
| `../assets-storage` | `AssetsStorage` (sprite, nine-slice behaviours) |
| `../../widgets/spine-service` | `SpineService` (spine `initialAnimation`) |

**Out of scope:** Async loading ([`assets-loader`](/docs/api/es-lienzo/features/assets-loader)), fluent authoring ([`view`](/docs/api/es-lienzo/features/view)), scene roots ([`scene`](/docs/api/es-lienzo/features/scene)). Assets must already be in [`AssetsStorage`](/docs/api/es-lienzo/features/assets-storage) before build.

**DI wiring:** `EmprLienzo` — `new TreeBuilder(dependency)` registered globally. `instantiate` calls `treeBuilder.create(config, parent)`.

---

## Pipeline overview

```text
TreeNode schema (or View.create() output)
  → TreeBuilder.create()
       → IBuilderBehaviour.create()  → native Pixi view + PixiEntity
       → EntityStorage.addEntity()   → proxy PixiEntity
       → components, mask, interactivity, refs, children (recursive)
       → Pixi hooks: destroy / removed
       → OnViewCreatedSignal.dispatchNextFrame(view)
```

| Stage | Responsibility |
|-------|----------------|
| Behaviour | Create Pixi display object + raw `PixiEntity` |
| `TreeBuilder` | Proxy registration, ECS components, lifecycle hooks, children |
| `EntityStorage` | Indexing via proxy; `removeEntity` vs `releaseEntity` |

---

## `TreeBuilder`

**Construction:** `new TreeBuilder(dependency: IDependency)` — registers behaviours in constructor.

### `create(options, parent?)`

```typescript
create(options: TreeNode, parent?: PixiEntity): PixiEntity
```

| Parameter | Description |
|-----------|-------------|
| `options` | Declarative node (and nested `children`) |
| `parent` | Optional parent proxy; `parent.addChild(proxyEntity)` when set |

| | |
|---|---|
| **Returns** | Proxy `PixiEntity` from `EntityStorage.addEntity` |
| **Throws** | `Unsupported type: ${options.type}` if no behaviour registered |
| **Throws** | `[TreeBuilder] Spine "name": slot "x" not found in skeleton` for invalid slot names |

**Per-node steps (standard path):**

1. `builder.create(options)` → `{ view, entity }`
2. `proxyEntity = storage.addEntity(entity) as PixiEntity`
3. `proxyEntity.addComponent(view)` — view `Container` as ECS component
4. `options.components?.forEach(addComponent)`
5. `options.mask` → `entity.mask(options.mask)` on **non-proxy** entity
6. Wire `view.on('destroy' | 'removed', …)` (see [Lifecycle signals](#lifecycle-signals))
7. `setInteractivity` if `options.interactive`
8. `parent?.addChild(proxyEntity)`; assign `ref` / `refCollection`
9. Recurse `children` via `createChildren`
10. `OnViewCreatedSignal.dispatchNextFrame(view)` — **per node** (each node in subtree)

**Two-phase path (Spine with `slotAttachments`):**

When `options.type === Spine` and `options.slotAttachments?.length > 0`, `create` switches to a two-phase build:

1–8. Same as standard (Spine view created via `SpineBuilderBehaviour.createSpineView`, **without animation start**)
9. For each entry in `slotAttachments`: validate slot name → `TreeBuilder.create(child)` **without parent** → resolve to `{ slotName, child: Container }`
10. `SpineBuilderBehaviour.finalizeSpine`: apply skin → optionally `slot.setAttachment(null)` if `clearExisting` → `spine.addSlotObject` → start animation chain
11. Spine `destroy` hook extended: `spine.removeSlotObject` for each slot before entity removal
12. Recurse `children`; `OnViewCreatedSignal.dispatchNextFrame(view)`

### Registered `ViewType` → behaviour

| `options.type` | Behaviour | Asset / notes |
|----------------|-----------|----------------|
| `Container` | `ContainerBuilderBehaviour` | Empty container |
| `AxisContainer` | `AxisContainerBuilderBehaviour` | Custom layout container |
| `FitContainer` | `FitContainerBuilderBehaviour` | Scale-to-fit container; bypasses Pixi `width`/`height` setter |
| `Sprite` | `SpriteBuilderBehaviour` | `getAsset<Texture>(asset, bundle)` |
| `Text` | `TextBuilderBehaviour` | `text`, `textStyle` |
| `BitmapText` | `BitmapBuilderBehaviour` | `bitmapTextStyle`, optional `tint` |
| `Spine` | `SpineBuilderBehaviour` | `Spine.from`; atlas `${asset}Atlas` |
| `NineSlicePlane` | `NineSliceBuilderBehaviour` | Texture + slice insets |

> **Typing note:** `TreeNode` union in `tree-builder.types.ts` lists container, axis, fit, sprite, text, bitmap, spine — **`INineSliceOptions` is not in the union** but `NineSlicePlane` is registered. Use `View` fluent API (`ofType(NineSlicePlane, …)`) or `ofConfig` with a full `INineSliceOptions` object.

---

## `TreeNode` and option interfaces

### Shared: `IDisplayObjectOptions`

Common fields on all node types:

| Field | Description |
|-------|-------------|
| `type` | `ViewType` constructor (`Container`, `Sprite`, …) |
| `name` | `view.name` (debug / `removeFromShared`) |
| `ref` | `Ref<PixiEntity>` — set `.item` after create |
| `refCollection` | `RefCollection` — `push(proxyEntity)` |
| `visible`, `alpha` | Defaults: visible `true`, alpha `1` |
| `position`, `pivot`, `scale`, `width`, `height`, `rotation`, `angle` | Transform |
| `interactiveChildren` | Pixi flag |
| `interactive` | `{ eventMode?, cursor }` — default `'static'` / `'pointer'` |
| `hitArea` | `Polygon` |
| `parentGroup` | `@pixi/layers` group name via `LayersService.getGroup` |
| `zIndex`, `zOrder` | Draw order hints |
| `children` | Nested `TreeNode[]` |
| `sortableChildren` | Container sorting |
| `components` | Extra ECS `Component[]` on proxy |
| `mask` | `IMaskOptions` → `PixiEntity.mask` |

### Type-specific (summary)

| Interface | Extra fields |
|-----------|----------------|
| `IContainerOptions` | `enableSort?` (reserved; sorting via `sortableChildren`) |
| `IAxisContainerOptions` | `isVertical?`, `gap?`, `justifyContent?`, `alignItems?` |
| `IFitContainerOptions` | `minScale?`, `maxScale?`, `justifyContent?`, `alignItems?`, `autoUpdate?`, `debugBounds?` |
| `ISpriteOptions` | `asset`, `bundle?`, `anchor?`, `tint?` |
| `ITextOptions` | `text`, `textStyle?`, `anchor?` |
| `IBitmapTextOptions` | `text`, `bitmapTextStyle`, `anchor?`, `tint?` |
| `ISpineOptions` | `asset`, `bundle?`, `key?`, `initialAnimation?`, `timeScale?`, `skin?`, `loop?`, `delay?`, `frequency?`, `tracks?`, `slotAttachments?` |
| `INineSliceOptions` | `asset`, `bundle?`, `leftWidth`, `topHeight`, `rightWidth`, `bottomHeight`, `tint?` |

### `IInteraction` (for `InteractionService`)

```typescript
interface IInteraction {
  type: PixiEventType;
  entity: PixiEntity;
}
```

`PixiEventType` — full union of pointer/mouse/touch/wheel/right-button names (33 literals). Used by [`widgets/interaction-service``interaction-service`, not dispatched by `TreeBuilder` itself.

---

## Lifecycle signals

| Signal | Payload | When |
|--------|---------|------|
| `OnViewCreatedSignal` | `Container` (view) | Next frame after each `create()` completes |
| `OnViewDestroyedSignal` | `Container` | Pixi `destroy` — `storage.removeEntity`, refs cleared |
| `OnViewRemovedSignal` | `Container` | Pixi `removed` — `storage.releaseEntity`, refs cleared |

```typescript
OnViewCreatedSignal.listen((view) => { /* subtree node ready */ });
```

**Pool integration:** Detaching without destroy triggers `removed` → entity leaves ECS queries but instance may be re-acquired ([`PixiObjectPool``object-pool`).

---

## `AxisContainer`

Custom `Container` with flex-like layout (debounced `recalculate` on `waitNextFrame`).

| Property | Default | Role |
|----------|---------|------|
| `isVertical` | `false` | Main axis direction |
| `gap` | `0` | Space between children |
| `justifyContent` | `'center'` | Main-axis alignment |
| `alignItems` | `'center'` | Cross-axis alignment |

Overrides `addChild` / `addChildAt` / `removeChild` / `removeChildren` to schedule layout.

Builder maps `IAxisContainerOptions` → instance fields, then `setCommonData`.

---

## `FitContainer`

Custom `Container` that uniformly scales its children to fit within a declared `fitWidth` × `fitHeight` area (`object-fit: contain` semantics). All children are transparently routed to an internal `contentLayer`; scale and offset are applied to that layer, keeping the outer container transform clean.

| Property | Default | Role |
|----------|---------|------|
| `minScale` | `0.5` | Lower clamp for computed scale |
| `maxScale` | `2` | Upper clamp for computed scale |
| `justifyContent` | `'center'` | Horizontal alignment of scaled content in fit area |
| `alignItems` | `'center'` | Vertical alignment of scaled content in fit area |
| `autoUpdate` | `true` | Track child bounds changes in `updateTransform` |
| `fitWidth` | `0` | Logical fit width (does not trigger Pixi scale semantics) |
| `fitHeight` | `0` | Logical fit height (does not trigger Pixi scale semantics) |

**Key methods:**

| Method | Description |
|--------|-------------|
| `recalculate()` | Schedule debounced fit recalculation (`waitNextFrame`) |
| `showDebug(color?, alpha?)` | Render a semi-transparent rectangle over the fit area for visual debugging |
| `hideDebug()` | Remove debug overlay and destroy the underlying `Graphics` object |

**Scaling algorithm:** `scale = clamp(min(fitWidth / contentW, fitHeight / contentH), minScale, maxScale)`. Single-axis mode: if only one bound is set, scale is computed from that axis only.

**`width` / `height` override:** Pixi's default setters rewrite `scale` to match a target size. `FitContainer` overrides them to store logical bounds (`_fitWidth`, `_fitHeight`) without affecting the container's own transform. `FitContainerBuilderBehaviour` never calls `setCommonData` for width/height — it assigns bounds via `fitWidth` / `fitHeight` directly.

**`autoUpdate`:** When enabled, `updateTransform` compares cached content bounds (`_cachedBoundsW/H`) each frame; a change schedules `recalculate()`. Disable for static content to avoid the per-frame `getLocalBounds` call.

**Debug overlay (`debugBounds`):** Driven either declaratively via `IFitContainerOptions.debugBounds` (builder calls `showDebug` at create time) or imperatively at runtime:

```typescript
const box = ref.item?.node.parent as FitContainer;
box.showDebug(0x00ff88, 0.2);
box.hideDebug();
```

Builder maps `IFitContainerOptions` → instance fields; `width`/`height` → `fitWidth`/`fitHeight`.

---

## `AbstractBuilderBehaviour` (internal base)

Shared logic for all behaviours:

| Helper | Applies |
|--------|---------|
| `setCommonData` | name, visibility, transform, `interactiveChildren`, `sortableChildren`, `parentGroup`, z-index, `hitArea` |
| `setVisibility` | `visible`, `alpha` |
| `setTransform` | position, pivot, scale, size, rotation, angle |
| `setAnchor` | Sprites / text (default anchor 0.5) |

---

## Behaviour details (reference)

### `SpineBuilderBehaviour`

```typescript
Spine.from({ skeleton: options.asset, atlas: `${options.asset}Atlas` });
```

**Standard path** (no `slotAttachments`): `create()` is a thin wrapper that calls `createSpineView` then `finalizeSpine` with an empty slot list.

**Two-phase path** (when `slotAttachments` present — orchestrated by `TreeBuilder`):

| Method | Responsibility |
|--------|----------------|
| `createSpineView(options)` | `Spine.from` + `PixiEntity` + `setCommonData`. No animation start. |
| `finalizeSpine(options, view, entity, resolvedSlots)` | Apply `skin` → `mountSlotObjects` → start animation chain (`playTracks` or `playInitialAnimation`). Returns `resolvedSlots` for destroy cleanup. |

`mountSlotObjects` behaviour per slot:
- If `clearExisting: true` → `skeleton.findSlot(name)?.setAttachment(null)` (clears artist placeholder)
- `spine.addSlotObject(slotName, child)`

If `initialAnimation` exists in skeleton data:

- `spineService.create(\`${key}:${name}\`, entity)` with optional `skin`, `timeScale`, `loop` on lane.

### `ISpineSlotAttachment`

```typescript
interface ISpineSlotAttachment {
  slotName: string;      // Spine skeleton slot name
  child: TreeNode;       // subtree built without scene-graph parent
  clearExisting?: boolean; // clear artist placeholder before attach; default false
}
```

Slot children are registered in `EntityStorage` as normal `PixiEntity` instances but are **never** added to the spine's ECS or Pixi child list — they are mounted exclusively via `spine.addSlotObject`. Cleanup on destroy: `spine.removeSlotObject` per slot. Consumer API: `View.attachToSlot(slotName, callback, { clearExisting? })`.

### `SpriteBuilderBehaviour` / `NineSliceBuilderBehaviour`

- `AssetsStorage.getAsset<Texture>(asset, bundle)` — throws if missing (sprite also checks falsy texture).

### `BitmapBuilderBehaviour`

- Uses `BitmapFont` style from options; does not call `AssetsStorage` (font must be registered via loader `fonts` bundle).

---

## Interactivity vs `InteractionService`

| Mechanism | Set by | Purpose |
|-----------|--------|---------|
| `TreeNode.interactive` | `TreeBuilder.setInteractivity` | Pixi hit testing (`eventMode`, `cursor`) |
| `InteractionService.listen` | App / host | ECS flows on pointer events |

Preparing `eventMode: 'static'` (or other) is required for `InteractionService` to attach listeners on entities with `Container` component.

---

## Usage patterns

### Direct `create` (tests / tools)

```typescript
const treeBuilder = inject(TreeBuilder);
const hud = treeBuilder.create({
  type: Container,
  name: 'hud',
  parentGroup: 'Popup',
  children: [
    {
      type: Sprite,
      name: 'coin',
      asset: 'icon_coin',
      bundle: 'main',
      anchor: { x: 0.5, y: 0.5 },
    },
  ],
}, parentEntity);
```

### Via `View` + `instantiate` (production)

```typescript
const myView: ViewFactory = (view) => {
  view
    .ofType(Container, 'slot')
    .parentGroup('Symbol')
    .addChild((c) => c.ofType(Sprite, 'bg').texture('reel_bg', 'main'));
};

const entity = instantiate(myView, { parent: sceneEntity });
```

### `Ref` for systems

```typescript
const heroRef = new Ref<PixiEntity>();
treeBuilder.create({ type: Sprite, name: 'hero', asset: 'hero', ref: heroRef }, parent);
// heroRef.item is proxy entity
```

### Axis layout

```typescript
{
  type: AxisContainer,
  name: 'toolbar',
  gap: 10,
  justifyContent: 'center',
  children: [/* sprites */],
}
```

---

## Bootstrap sequence (reference)

```text
EmprLienzo.registerServices()
  → treeBuilder = new TreeBuilder(dependency)
  → DI: TreeBuilder

View.instantiate / Scene.setView
  → View.create() → TreeNode
  → treeBuilder.create(config, parent)

Prerequisites
  → AssetsLoader finished for bundles referenced in schemas
```

---

## Semantics and constraints

| Topic | Behavior |
|-------|----------|
| **Sync only** | No async in `create`; missing asset throws at build time |
| **Proxy entity** | Return value is `EntityStorage` proxy — use for `addChild` / ECS |
| **`addComponent(view)`** | View reference stored as component on proxy |
| **`OnViewCreated` per node** | Fires for every node in subtree, not once per root |
| **Unsupported type** | Throws at `create` |
| **Custom behaviours** | Extend `AbstractBuilderBehaviour` + patch `setupBehaviours` (not pluggable via public API) |
| **NineSlice in `TreeNode`** | Union omit — use `View` builder |
| **`IInteractivityOptions.cursor`** | Required in type; runtime defaults to `'pointer'` if block present |

---

## Internal model (reference)

```
┌─────────────────────────────────────────────────────────────┐
│  TreeBuilder                                                │
│  _behaviours: Map<ViewType, IBuilderBehaviour>              │
├─────────────────────────────────────────────────────────────┤
│  create(TreeNode)                                           │
│    → behaviour → view + entity                              │
│    → EntityStorage.addEntity → PixiEntity proxy             │
│    → components, mask, hooks, children                      │
└─────────────────────────────────────────────────────────────┘
         │ uses                          │ registers
         ▼                               ▼
  AssetsStorage / SpineService      EntityStorage / LayersService
```

---

## Related documentation

- `feature_description.md` — strategy pattern, pooling, boundaries
- [`../view`](/docs/api/es-lienzo/features/view) — fluent `TreeNode` authoring, `instantiate`
- [`../scene/API_DOC.md`](/docs/api/es-lienzo/features/scene) — where trees are parented
- [`../assets-storage/API_DOC.md`](/docs/api/es-lienzo/features/assets-storage) — texture lookup
- [`../../widgets/interaction-service/API_DOC.md``interaction-service` — `IInteraction`, `PixiEventType`
- [`../../widgets/layers-service/API_DOC.md``layers-service` — `parentGroup`
- [`../../core/entity/API_DOC.md``entity` — `PixiEntity`, mask
- Source: `tree-builder.ts`, `tree-builder.types.ts`, [`behaviours/``behaviours`, export: `index.ts`

## Known consumers (reference)

| Module | Usage |
|--------|--------|
| `bootstrap/empr.lienzo.ts` | DI registration |
| `features/view/instantiate.ts` | `treeBuilder.create` |
| `widgets/interaction-service` | `IInteraction`, `PixiEventType` |
| `apps/*/types/empr-es.lienzo.d.ts` | `PipelineFactory<IInteraction>` augmentation |
| Game `View` / `ViewFactory` modules | Indirect via `instantiate` |

Host apps define trees in `View` factories; they rarely call `TreeBuilder.create` directly except in systems or tests.


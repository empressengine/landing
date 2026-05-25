---
sidebar_position: 41
sidebar_label: "layers-service"
---

# API: `widgets/layers-service`

Public entry point for `@pixi/layers` orchestration. Import from the widgets barrel or the feature index.

```typescript
import { LayersService, ILayerOptions } from '@empr/es-lienzo';
// or
import { LayersService, ILayerOptions } from './widgets/layers-service';
```

| Export | Source | Description |
|--------|--------|-------------|
| `LayersService` | `layers.service.ts` | Named `Group` / `Layer` registry and Z-sort sweeps |
| `ILayerOptions` | `layers.types.ts` | Declarative layer registration (`name`, `sortable`) |

**Dependencies:**

| Package | Symbols |
|---------|---------|
| `pixi.js` | `Container` (`parentGroup` target) |
| `@pixi/layers` | `Group`, `Layer`, `Stage` |

**Related features:** ](/docs/api/es-lienzo/features/scene) — replaces `Application.stage` with `Stage`, calls `setStage`; ](/docs/api/es-lienzo/features/tree-builder) — assigns `parentGroup` via `getGroup` at build time.

---

## `ILayerOptions`

Configuration for registering a logical rendering plane (used by `Scene.addLayer`).

```typescript
interface ILayerOptions {
  name: string;
  sortable?: boolean;
}
```

| Field | Type | Default (in `Scene.addLayer`) | Description |
|-------|------|--------------------------------|-------------|
| `name` | `string` | — | **Required.** Dictionary key for `createGroup` / `getGroup` / `setLayer` |
| `sortable` | `boolean` | `false` when omitted | Passed to `Group` — enables Z-sort within the group’s descendants |

```typescript
scene.addLayer({ name: 'Particles', sortable: true });
```

> **Note:** `LayersService.createGroup(name, sortable)` defaults `sortable` to **`true`**. `Scene.addLayer` calls `createGroup(layer.name, layer.sortable || false)`, so omitted `sortable` in `ILayerOptions` becomes **`false`**.

---

## `LayersService`

Global controller for `@pixi/layers`: decouples **visual depth** (`parentGroup`) from the ECS / scene-graph parent chain.

**Layer:** `widgets` — no ECS types; operates on Pixi `Container` / `Stage` only.

### Internal state (reference)

| Field | Type | Role |
|-------|------|------|
| `_groups` | `Map<string, Group>` | Sorting groups keyed by name |
| `_layers` | `Map<string, Layer>` | Pixi `Layer` containers (children of `Stage`) |
| `_stage` | `Stage \| undefined` | Root `@pixi/layers` stage |
| `_order` | `number` | Monotonic group order assigned in `createGroup` |

---

### `setStage(stage)`

```typescript
setStage(stage: Stage): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `stage` | `Stage` | Root display object (typically `Application.stage` after replacement) |

**Side effects:**

1. `_order = 0`
2. `_stage = stage`

Does **not** re-attach layers created before `setStage`. Call `setStage` once before `createGroup` (see `Scene.createStage`).

```typescript
const stage = new Stage();
stage.sortableChildren = true;
app.stage = stage;
layersService.setStage(stage);
```

---

### `createGroup(name, sortable?)`

```typescript
createGroup(name: string, sortable?: boolean): void
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `name` | `string` | — | Unique layer key |
| `sortable` | `boolean` | `true` | `@pixi/layers` `Group` sortable flag |

**Side effects:**

1. `group = new Group(_order, sortable)`
2. `layer = new Layer(group)`; `layer.name = name`
3. Store in `_groups` / `_layers` (overwrites existing `name` without removing previous `Layer` from stage)
4. `_stage?.addChild(layer)`
5. `_order += 1`

Creation order defines global layer stacking (lower `_order` → earlier in sequence). **Do not reorder** existing groups in production without understanding draw order (see slot-client `setupLayers` comment).

```typescript
layerService.createGroup(RenderLayer.Symbol);
layerService.createGroup(RenderLayer.Popup);
```

---

### `getGroup(name)`

```typescript
getGroup(name: string): Group | undefined
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `string` | Layer key from `createGroup` |

| | |
|---|---|
| **Returns** | `Group` instance or `undefined` |

Used by `AbstractBuilderBehaviour` when `TreeNode.parentGroup` is set:

```typescript
view.parentGroup = layers.getGroup(options.parentGroup);
```

Also available for imperative assignment equivalent to `setLayer` (assign `node.parentGroup = group` yourself, then `sort(name)`).

---

### `setLayer(name, node)`

```typescript
setLayer(name: string, node: Container): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `string` | Registered group name |
| `node` | `Container` | Display object to bind |

**Flow:**

1. Resolve `group = _groups.get(name)` — if missing: `console.warn(\`Layer ${name} didn't exist\`)` and return
2. `node.parentGroup = group`
3. `sort(name)` — stage update + `layer.sortChildren()`

```typescript
layersService.setLayer('Popup', spriteContainer);
```

---

### `resetLayer(node)`

```typescript
resetLayer(node: Container): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `node` | `Container` | Object to unbind from any `parentGroup` |

**Side effects:**

1. `node.parentGroup = undefined`
2. `sortAll()` — full stage + all layers sweep

```typescript
layersService.resetLayer(symbol.node);
```

---

### `sort(name)`

```typescript
sort(name: string): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `string` | Layer whose children need re-sort |

**Side effects:**

1. `_stage?.sortChildren()`
2. `_stage?.updateStage()`
3. `_layers.get(name)?.sortChildren()` if layer exists

Targeted update after a single group mutation. Cheaper than `sortAll`.

---

### `sortAll()`

```typescript
sortAll(): void
```

**Side effects:**

1. `_stage?.sortChildren()` + `updateStage()`
2. `sortChildren()` on **every** registered `Layer`

Used after large topology changes (`Scene.setView`, initial stage setup).

```typescript
scene.setView(mainSceneFactory); // internally calls sortAll()
layersService.sortAll();
```

---

## Integration flows

### Bootstrap (typical)

```text
Scene.init()
  → new Stage(), pixi.stage = stage
  → layersService.setStage(stage)
  → layersService.sortAll()
  → root View / Shared containers

App setupLayers()
  → layersService.createGroup(RenderLayer.*)  // fixed order
```

### Declarative tree (`parentGroup`)

```typescript
builder
  .ofType(Sprite, 'coin')
  .parentGroup(RenderLayer.Symbol)
  .create();
```

At build time, `getGroup` assigns `view.parentGroup`. Caller should ensure `createGroup` ran before tree build.

### Imperative runtime

```typescript
layersService.setLayer('Particles', entity.node);
// or
entity.node.parentGroup = layersService.getGroup('Particles');
layersService.sort('Particles');
```

### Scene wrapper

```typescript
scene.addLayer({ name: 'CustomUI', sortable: true });
```

Delegates to `createGroup` with `sortable || false`.

---

## Usage patterns

### Register game layers at startup (slot-client)

```typescript
const layerService = app.dependency.inject(LayersService);

// Order matters — do not reorder without reviewing draw order
layerService.createGroup(RenderLayer.Symbol);
layerService.createGroup(RenderLayer.ForegroundAnimation);
layerService.createGroup(RenderLayer.Popup);
```

### Assign symbol to a render plane

```typescript
// Declarative (preferred in TreeBuilder)
parentGroup: RenderLayer.Symbol

// Imperative
layerService.setLayer(RenderLayer.Symbol, pixiEntity.node);
```

### After scene swap

```typescript
scene.setView(nextSceneFactory); // deinstantiate old, sortAll()
```

---

## Semantics and constraints

| Topic | Behavior |
|-------|----------|
| **Stage required for display** | `createGroup` adds `Layer` to `_stage` only if `setStage` was called first |
| **Name collision** | Second `createGroup(sameName)` overwrites maps; previous `Layer` may remain on stage |
| **Missing layer** | `setLayer` warns and no-ops; does not throw |
| **`sortable` defaults** | `createGroup` → `true`; `Scene.addLayer` → `false` when omitted |
| **Scene graph vs layer** | `parent` / `addChild` unchanged; `parentGroup` controls cross-subtree draw order |
| **Local zIndex** | `zIndex` / `zOrder` on nodes still apply within builder (`setCommonData`); orthogonal to global layers |
| **ECS** | No entity awareness — pass `entity.node` or configure via `TreeNode` |
| **Not in scope** | Keyboard, hit testing, pool lifecycle |

---

## Internal model (reference)

```
┌─────────────────────────────────────────────────────────────┐
│  Stage (Application.stage)                                  │
│    ├── Layer "Symbol"      → Group(order=0, sortable)       │
│    ├── Layer "Popup"       → Group(order=1, sortable)       │
│    └── ...                                                  │
├─────────────────────────────────────────────────────────────┤
│  Scene graph (ECS):  root → View → Shared → entities        │
│  Render binding:     container.parentGroup = Group          │
└─────────────────────────────────────────────────────────────┘

createGroup:  Group(_order++) + Layer(group) → stage.addChild(layer)
setLayer:     node.parentGroup = group → sort(name)
resetLayer:   parentGroup = undefined → sortAll()
```

---

## Related documentation

- `feature_description.md` — motivation, sequential ordering, granular sorts
- `../../features/scene/scene.ts` — `Stage` setup, `addLayer`, `sortAll` on `setView`
- `../../features/tree-builder/tree-builder.types.ts` — `parentGroup?: string` on display options
- `@pixi/layers` — upstream library for `Group` / `Layer` / `Stage` behavior
- Source: `layers.service.ts`, `layers.types.ts`, export: `index.ts`

## Known consumers (reference)

| Module | Usage |
|--------|--------|
| `bootstrap/empr.lienzo.ts` | `new LayersService()`, DI registration |
| `features/scene/scene.ts` | `setStage`, `addLayer`, `sortAll` on view change |
| `features/tree-builder/behaviours/abstract-builder.behaviour.ts` | `getGroup(options.parentGroup)` |
| `features/view/view.ts` | Fluent `.parentGroup(name)` on config |
| `apps/slot-client/.../empr.game.ts` | `setupLayers()` — `createGroup(RenderLayer.*)` |
| `apps/slot-cd-client/.../empr.game.ts` | Same layer bootstrap pattern |

`setLayer` / `resetLayer` are public API for runtime moves; current monorepo usage prefers declarative `parentGroup` at build time.


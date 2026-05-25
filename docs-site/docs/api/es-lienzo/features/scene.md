---
sidebar_position: 31
sidebar_label: "scene"
---

# API: `features/scene`

Public entry point for root Pixi display hierarchy, main scene switching, and persistent overlay (`Shared`) layer. Import from the features barrel or the feature index.

```typescript
import { Scene } from '@empr/es-lienzo';
// or
import { Scene } from './features/scene';
```

| Export | Source | Description |
|--------|--------|-------------|
| `Scene` | `scene.ts` | Stage bootstrap, `setView` / `addShared`, layer proxy |

**Related exports (not in this folder):**

| Symbol | Module | Used by `Scene` |
|--------|--------|-----------------|
| `ViewFactory` | `features/view` | Argument to `setView` / `addShared` |
| `instantiate` / `deinstantiate` | `features/view` | Build / destroy entity trees |
| `ILayerOptions` | `widgets/layers-service` | `addLayer` |
| `PixiEntity` | `core/entity` | Root and scene entity types |

**Dependencies:**

| Package / module | Symbols |
|------------------|---------|
| `pixi.js` | `Application`, `Container` |
| `@pixi/layers` | `Stage` |
| `@empr/es` | `EntityStorage` |
| `../../widgets/layers-service` | `LayersService` |
| `../view` | `instantiate`, `deinstantiate`, `ViewFactory` |

**Out of scope:** Declarative view trees (`View`, `TreeBuilder`), asset loading, transition animations (instant swap only). ECS wrapper systems live in host apps (`sceneSetViewSystem`, `sceneAddSharedSystem`).

**DI wiring:** `EmprLienzo` — `new Scene(app, layersService, storage)`; `init()` in `initializeScenes()` after `registerServices()`.

---

## Display hierarchy

After `init()`:

```text
Application.stage  →  PixiLayers.Stage (centered, sortableChildren)
  └── _rootEntity (PixiEntity)
        ├── _viewEntity  [Container name: "Scene"]   ← active main scene (setView)
        └── _sharedEntity [Container name: "Shared"] ← overlays (addShared)
```

| Getter | Returns |
|--------|---------|
| `root` | `_rootEntity` — wraps `pixi.stage` |
| `currentView` | Last entity from `setView`, or `undefined` |

`_viewEntity` and `_sharedEntity` are **not** exposed as public getters — only children created via `instantiate` are addressable (e.g. `removeFromShared(name)`).

**Stage origin:** `stage.x/y = view.width/2`, `view.height/2` (centered coordinate system).

---

## `ViewFactory` (from `features/view`)

```typescript
type ViewFactory<T = {}> = (view: View, props: T & undefined) => void;
```

`Scene` passes factories to `instantiate(factory, { parent })` without extra props from `setView` / `addShared` (props only if you call `instantiate` yourself elsewhere).

```typescript
const mainGameView: ViewFactory = (view) => {
  view.ofType(Container, 'root').addChild((slot) => { /* ... */ });
};

scene.setView(mainGameView);
```

See [`../view`](/docs/api/es-lienzo/features/view) and [`../tree-builder`](/docs/api/es-lienzo/features/tree-builder) for view construction.

---

## `Scene`

**Construction:**

```typescript
new Scene(pixi: Application, layers: LayersService, storage: EntityStorage)
```

| Dependency | Role |
|------------|------|
| `_pixi` | Replaces `stage` with `@pixi/layers` `Stage` |
| `_layers` | `setStage`, `createGroup`, `sortAll` |
| `_storage` | `clearQueries` on scene switch |

---

### `init()`

```typescript
init(): void
```

| Step | Action |
|------|--------|
| `createStage` | `new PixiLayers.Stage()`, assign to `pixi.stage`, center, `layers.setStage(stage)`, `sortAll()` |
| Root | `_rootEntity = new PixiEntity(pixi.stage)` |
| Branches | `createRootView('Scene', _rootEntity)` → `_viewEntity`; `createRootView('Shared', _rootEntity)` → `_sharedEntity` |

**Must run once** before `setView` / `addShared` (called from `EmprLienzo.initializeScenes()`).

---

### `setView(scene)`

```typescript
setView(scene: ViewFactory): void
```

| Parameter | Description |
|-----------|-------------|
| `scene` | Factory for the new main screen |

**Side effects (order):**

1. If `_currentScene` exists → `deinstantiate(_currentScene)`
2. `_storage.clearQueries('')` — flush ECS entity query caches
3. `_currentScene = instantiate(scene, { parent: _viewEntity })`
4. `_layers.sortAll()`

| | |
|---|---|
| **Replaces** | Entire previous main scene under `View` branch only |
| **Preserves** | `_sharedEntity` subtree (HUD, popups) |
| **Transitions** | Instant — no built-in fade |

```typescript
scene.setView(preloaderView);
// later
scene.setView(mainGameView);
```

---

### `addShared(shared)`

```typescript
addShared(shared: ViewFactory): void
```

| Parameter | Description |
|-----------|-------------|
| `shared` | Factory for overlay UI |

**Side effects:** `instantiate(shared, { parent: _sharedEntity })` — does **not** replace prior shared children; multiple overlays can coexist.

```typescript
scene.addShared(settingsPopupView);
```

No return value — track node `name` from `View` if you need `removeFromShared`.

---

### `removeFromShared(name)`

```typescript
removeFromShared(name: string): void
```

| Parameter | Description |
|-----------|-------------|
| `name` | `Container.name` set in `ViewFactory` (recursive search) |

**Side effects:** `_sharedEntity.getChild(name, true)` → `deinstantiate` if found; no-op if missing.

```typescript
scene.removeFromShared('settings_popup');
```

---

### `addLayer(layer)`

```typescript
addLayer(layer: ILayerOptions): void
```

```typescript
interface ILayerOptions {
  name: string;
  sortable?: boolean;
}
```

Proxies to `layers.createGroup(layer.name, layer.sortable || false)`.

| | |
|---|---|
| **Default `sortable`** | `false` when omitted (unlike direct `LayersService.createGroup` default `true`) |

Host apps may also register groups on `LayersService` directly (e.g. `EmprGame.setupLayers()` in slot-client).

See [`../../widgets/layers-service/API_DOC.md``layers-service`.

---

## Lifecycle: `instantiate` / `deinstantiate`

| API | Role in `Scene` |
|-----|-----------------|
| `instantiate(factory, { parent })` | Builds tree via `View` + `TreeBuilder`, parents under `_viewEntity` or `_sharedEntity` |
| `deinstantiate(entity)` | Destroys entity subtree and ECS components |

Only entities created through this path should be destroyed with `deinstantiate` (see `../view/deinstantiate.ts`).

---

## Bootstrap sequence (reference)

```text
EmprLienzo.registerServices()
  → layersService, storage, scene = new Scene(app, layersService, storage)
  → DI: Scene, LayersService, …

EmprLienzo.init()
  → setUpdateDeps()  // render pixi.stage each frame
  → initializeScenes() → scene.init()

Host pipeline / orchestrator
  → scene.setView(viewFactory)
  → optional scene.addShared(overlayFactory)
  → optional scene.addLayer({ name, sortable })  // or LayersService.createGroup in app bootstrap
```

Rendering: `empr.lienzo` calls `this._pixi.renderer.render(this._pixi.stage)` on `UpdateLoop.onUpdate` — not Pixi’s internal RAF ticker for the app loop.

---

## Usage patterns

### Pipeline: switch main scene (slot-client)

```typescript
// apps/slot-client/src/shared/scenes/systems/scene-set-view.system.ts
function sceneSetViewSystem(props: SystemProps<{ view: ViewFactory }>) {
  props.inject(Scene).setView(props.view);
}

pipeline.use(sceneSetViewSystem, { view: mainGameView });
```

### Pipeline: add overlay

```typescript
props.inject(Scene).addShared(props.shared);
```

### Direct injection

```typescript
const scene = Dependency.instance.inject(Scene);
await loadAssets();
scene.setView(MainGameView);
```

### Orchestrator (slot-cd-client)

```typescript
this._scene.setView(preloaderView);
```

### Register render layer via Scene

```typescript
scene.addLayer({ name: 'Popup', sortable: true });
```

Tree nodes use `parentGroup: layersService.getGroup('Popup')` at build time.

---

## Semantics and constraints

| Topic | Behavior |
|-------|----------|
| **`init` once** | Required before other methods; undefined behavior if `setView` before `init` |
| **Single active view** | One `_currentScene`; new `setView` destroys previous |
| **Shared persistence** | `setView` does not clear `_sharedEntity` children |
| **ECS cache** | `clearQueries('')` only on `setView`, not on `addShared` / `removeFromShared` |
| **No `setView` return** | Use `currentView` getter after call if needed |
| **Multiple shared UIs** | Multiple `addShared` calls stack; remove by unique `name` |
| **Layer order** | Depends on `@pixi/layers` groups + `sortAll()` after `setView` |
| **Transitions** | No fade — implement in game logic before `setView` if needed |
| **Resize** | Stage center uses `pixi.view` size at `init` time — no automatic re-center on resize in `Scene` |

---

## Internal helpers (reference)

### `createStage(pixi)`

Replaces `Application.stage` with `PixiLayers.Stage`, enables `sortableChildren`, centers stage, registers with `LayersService`.

### `createRootView(name, parent)`

Creates empty `Container` + `PixiEntity`, sets `container.name`, `parent.addChild(root)`.

---

## Internal model (reference)

```
┌────────────────────────────────────────────────────────────┐
│  Scene                                                     │
│  _rootEntity, _viewEntity, _sharedEntity, _currentScene    │
├────────────────────────────────────────────────────────────┤
│  init()        → Stage + View/Shared branches              │
│  setView()     → deinstantiate + clearQueries + instantiate│
│  addShared()   → instantiate under Shared                  │
│  removeFromShared(name) → getChild + deinstantiate        │
│  addLayer()    → LayersService.createGroup                 │
└────────────────────────────────────────────────────────────┘
         │ instantiate/deinstantiate          │ setStage/sortAll
         ▼                                    ▼
    TreeBuilder + View                   LayersService
```

---

## Related documentation

- `feature_description.md` — View vs Shared, cache clearing, boundaries
- [`../view`](/docs/api/es-lienzo/features/view) — `ViewFactory`, `instantiate`, `deinstantiate`
- [`../../widgets/layers-service/API_DOC.md``layers-service` — render groups
- `../../bootstrap/empr.lienzo.ts` — DI + `initializeScenes`
- [`../../core/entity/API_DOC.md``entity` — `PixiEntity`
- Source: `scene.ts`, export: `index.ts`

## Known consumers (reference)

| Module | Usage |
|--------|--------|
| `bootstrap/empr.lienzo.ts` | `new Scene`, `init()`, DI |
| `apps/slot-client/.../scene-set-view.system.ts` | `setView` |
| `apps/slot-client/.../scene-add-shared.system.ts` | `addShared` |
| `apps/slot-client/.../initialization.pipeline.ts` | Preloader view |
| `apps/slot-client/.../main-game.pipeline.ts` | Main game view |
| `apps/slot-cd-client/.../initialization.orchestrator.ts` | `setView(preloaderView)` |
| `apps/slot-cd-client/.../empr.game.ts` | Injects `Scene` |

Wrapper systems are **host-owned**; copy patterns from `apps/slot-client/src/shared/scenes/` when adding new apps.


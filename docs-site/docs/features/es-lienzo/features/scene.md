---
sidebar_position: 3
sidebar_label: "scene"
---

# Feature: `features/scene`

## What this feature does

The `scene` module acts as a high-level scene graph orchestrator in the `features` layer. It initializes the root PixiJS containers, enables `@pixi/layers` global sorting, and provides an API for switching main game scenes. It also manages an independent `Shared` layer—a global entity tree (e.g., for HUDs or popups) that persists its state across main scene transitions.

## Why this feature exists

Manually managing root containers and screen transitions in an ECS architecture often leads to memory leaks and phantom entities. Developers have to constantly track what to destroy and what to keep (like a persistent virtual joystick).

`Scene` solves this by strictly encapsulating the lifecycle of root nodes. When switching scenes (`setView`), it automatically destroys the old hierarchy via `deinstantiate` and clears ECS query caches, ensuring a clean state for the new screen. Separating the architecture into `View` and `Shared` branches keeps the global UI independent of level changes.

## How it works

1. **Initialization:** On `init(app)`, it creates a root `PixiLayers.Stage`, registers it with `LayersService`, and spawns three persistent `PixiEntity` instances: `_rootEntity`, `_viewEntity` (container for the current scene), and `_sharedEntity` (container for the global UI).
2. **Scene Switching:** When `setView(factory)` is called (or triggered via `sceneSetViewSystem`), the old scene is safely destroyed using `deinstantiate`. ECS caches are then cleared (`EntityStorage.clearQueries()`), and the new scene is instantiated and bound to `_viewEntity`.
3. **Adding Shared UI:** When `addShared(factory)` is called (or via `sceneAddSharedSystem`), a new UI element (e.g., a settings popup) is created and bound to `_sharedEntity`, rendering on top of the main scene.
4. **Removing Shared UI:** The `removeFromShared(name)` method recursively searches for a child node by its name inside `_sharedEntity` and selectively destroys it via `deinstantiate`.

## Interesting design decisions

### 1) Strict Separation of `View` and `Shared` Branches

The service creates two isolated root branches (`_viewEntity` and `_sharedEntity`) during initialization.
_Result:_ Switching scenes completely and safely destroys only `_viewEntity`, leaving the global UI intact. This eliminates the need to recreate heavy persistent UI elements on every screen transition.

### 2) Automatic ECS Cache Clearing

In the `setView` method, `this._entityStorage.clearQueries()` is forcefully called before creating a new scene.
_Result:_ It frees memory from cached entity queries of the previous scene. This is absolutely critical for preventing memory leaks and performance degradation during long gameplay sessions.

### 3) Root-Level `@pixi/layers` Integration

The root scene container is forced into a `PixiLayers.Stage()` with `sortableChildren = true`.
_Result:_ Instantly enables global logical rendering layers (`LayersService` from the `widgets` layer) for the entire application out of the box, without developers having to manually bootstrap the plugin.

### 4) Wrapper Systems for Scene Management

The feature provides ready-to-use ECS pipelines: `sceneSetViewSystem` and `sceneAddSharedSystem`.
_Result:_ Allows managing screen transitions and popups directly from declarative ECS pipelines without breaking the unidirectional data flow or requiring manual injection of the `Scene` service into business logic.

## Public contracts in this feature

- **Classes:**
    - `Scene`: The global scene graph orchestrator.
- **ECS Systems:**
    - `sceneSetViewSystem`: Pipeline system for switching the main scene.
    - `sceneAddSharedSystem`: Pipeline system for adding UI to the global layer.

## Current scope and boundaries

- **In Scope:** Managing the root `PIXI.Stage`, switching main scenes (`View`), adding/removing global overlays (`Shared`), proxying layer creation to `LayersService`, and automatically clearing old scene entities and ECS queries.
- **Out of Scope:** Parsing and configuring the UI trees themselves. `Scene` merely accepts a `ViewFactory` and delegates its execution to the `view` module.
- **Out of Scope:** Transition animations (fade in / fade out). The service performs an instant entity swap. Smooth visual transitions should be implemented at the scene logic level before invoking `setView`.


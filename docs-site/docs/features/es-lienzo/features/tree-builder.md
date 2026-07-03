---
sidebar_position: 4
sidebar_label: "tree-builder"
---

# Feature: `features/tree-builder`

## What this feature does

The `tree-builder` module is the central visual factory of the `features` layer. It recursively parses declarative configuration schemas (`TreeNode`) and transforms them into an actual hierarchy of PixiJS objects (Containers, Sprites, Spines, Texts), automatically wrapping each visual node in an ECS `PixiEntity`.

## Why this feature exists

Creating complex UIs (windows, inventories, menus) imperatively via native PixiJS APIs leads to bloated, tightly coupled, and hard-to-maintain code.

The `TreeBuilder` solves this architectural problem by allowing developers to describe UIs declaratively. It separates the layout structure from the instantiation logic and ensures that every visual element is immediately integrated into the ECS world without requiring manual scene graph manipulation by game systems.

## How it works

1. **Initialization:** On startup, the service registers specific build strategies (`Behaviours`) for various node types (Sprite, Text, Spine, NineSlice, AxisContainer).
2. **Schema Parsing:** When `create(options, parentNode)` is called, the service identifies the `ViewType` of the provided `TreeNode` and delegates the schema to the corresponding `IBuilderBehaviour`.
3. **Instantiation:** The selected behaviour (e.g., `SpineBuilderBehaviour`) synchronously requests required resources from the `AssetsStorage`, creates the native PixiJS object, applies base transformations, and wraps it in a `PixiEntity`.
4. **Interactivity:** If the schema includes an `interactive` block, the builder automatically configures `eventMode` and `cursor`, prepping the node for the `InteractionService`.
5. **Recursion:** If the node contains `children`, the builder recursively traverses them via `createChildren` to construct the full scene graph.
6. **Proxy Entity:** The entity returned by `storage.addEntity` is cast to `PixiEntity` and used as the proxy throughout — for `addChild`, `ref`, `refCollection`, and children creation. This guarantees that all downstream interactions go through `ProxyEntity`'s interception layer, keeping `EntityIndexator` consistent.
7. **Lifecycle Signaling:** Two PixiJS `Container` event hooks are wired on every created node:
   - `destroy` → calls `storage.removeEntity` (permanent) and dispatches `OnViewDestroyedSignal`.
   - `removed` → calls `storage.releaseEntity` (non-destructive, entity preserved for pooling) and dispatches `OnViewRemovedSignal`.
   Once the full subtree is built, `OnViewCreatedSignal` is dispatched on the next frame.

## Interesting design decisions

### 1) Strategy Pattern for Node Generation (Behaviours)

Instead of a massive `switch` statement, the creation logic for each visual element type is isolated into `*BuilderBehaviour` classes implementing `IBuilderBehaviour`.
_Result:_ Adheres to the Open/Closed Principle. Adding a new UI element type (like a custom shader) simply requires writing and registering a new behavior without modifying the core `TreeBuilder` logic.

### 2) Abstract Base Builder

All strategies inherit from `AbstractBuilderBehaviour`, which encapsulates the algorithms for applying common properties (coordinates, anchors, visibility, alpha).
_Result:_ Eliminates code duplication. Any new visual component automatically receives support for standard PixiJS mathematical transformations out of the box.

### 3) Built-in Flexbox-like Auto-layout (AxisContainer)

The engine provides a custom `AxisContainer` node that automatically aligns child elements linearly (horizontally or vertically) with specific gaps and justifications.
_Result:_ Drastically simplifies the creation of dynamic UI components (lists, button panels) by removing the need for manual pixel coordinate recalculations when screen content changes.

### 6) Scale-to-Fit Layout Container (FitContainer)

`FitContainer` uniformly scales its children to fit within a declared `fitWidth` × `fitHeight` area, following CSS `object-fit: contain` semantics. Scale is clamped to `[minScale, maxScale]`, and content is aligned via `justifyContent` / `alignItems`. Recalculation is debounced via `waitNextFrame`; optional `autoUpdate` detects child bounds changes in `updateTransform` without manual calls.

A critical implementation detail: Pixi's default `Container.width` setter rewrites the container's own scale rather than storing a logical size. `FitContainer` overrides `get/set width` and `get/set height` to store `_fitWidth` / `_fitHeight` as explicit bounds, completely bypassing Pixi's built-in scaling. `FitContainerBuilderBehaviour` must therefore **not** delegate to `setCommonData` for width/height.

_Result:_ Dynamic text and UI elements that can grow or shrink at runtime (e.g. currency values, localised strings) stay visually contained without per-frame imperative scale corrections in game systems.

### 4) Two-Tier Lifecycle: `removed` vs `destroy`

The builder wires two separate PixiJS `Container` events to two semantically distinct ECS operations:

- `destroy` → `storage.removeEntity` + `OnViewDestroyedSignal`: the entity is permanently gone.
- `removed` → `storage.releaseEntity` + `OnViewRemovedSignal`: the entity is de-indexed and invisible to ECS queries, but its instance is preserved and may be re-acquired (e.g. by `PixiObjectPool`).

_Result:_ `TreeBuilder` becomes pool-aware without coupling to any specific pool implementation. When `PixiObjectPool.release` detaches the container from the scene graph, the `removed` hook fires automatically — the entity leaves all live queries without a single explicit call from the pooling layer.

### 5) Strict Synchronous Link to AssetsStorage

Builders request textures and configurations from `AssetsStorage` strictly synchronously, throwing a fatal error if the resource is missing from memory.
_Result:_ Prevents asynchronous race conditions. The visual tree is guaranteed to be built instantly using only assets that were successfully pre-loaded during the scene's loading phase.

## Public contracts in this feature

- **Classes:**
    - `TreeBuilder`: The main visual factory service.
    - `AxisContainer`: Custom PIXI container supporting flex-like auto-layout.
    - `FitContainer`: Custom PIXI container that uniformly scales children to fit declared bounds.
    - `AbstractBuilderBehaviour`: Base class for custom node parsers.
- **Interfaces & Types:**
    - `TreeNode`: Union type describing any valid configuration node.
    - `IBuilderBehaviour<T>`: Factory contract for a specific node.
    - `IBuilderResult`: Output structure containing the native `view` and ECS `entity`.
    - `IDebugBoundsOptions`: Shared debug overlay color/alpha config.
    - _Options_: `IContainerOptions`, `IAxisContainerOptions`, `IFitContainerOptions`, `ISpriteOptions`, `ISpineOptions`, etc..
- **Signals:**
    - `OnViewCreatedSignal` — dispatched after full subtree construction (next frame).
    - `OnViewDestroyedSignal` — dispatched on permanent container destruction.
    - `OnViewRemovedSignal` — dispatched when a container is detached from its parent without being destroyed (non-destructive release, supports pooling).

### 7) Spine Slot Attachments

`ISpineOptions` accepts an optional `slotAttachments` array — each entry pairs a Spine slot name with a declarative `TreeNode` child subtree. When present, `TreeBuilder` performs a two-phase build:

1. **Phase 1** — `SpineBuilderBehaviour.createSpineView()` instantiates the Spine object and applies common data (name, transform, visibility) without starting any animation.
2. **Phase 2** — Slot child entities are created via `TreeBuilder.create()` *without a scene-graph parent*, so they never appear as ECS or Pixi children of the Spine entity. After construction, `SpineBuilderBehaviour.finalizeSpine()` applies skin, calls `spine.addSlotObject(slotName, child)` for each slot, then starts the declarative animation chain.

Slot objects are removed via `spine.removeSlotObject` in the spine container's `destroy` hook, ensuring clean teardown. This mechanism is independent of `SpineChain.attachToSlot` / `SpineLane.attachToSlot`, which serve the runtime animation-lifecycle attach pattern.

Each `ISpineSlotAttachment` entry supports an optional `clearExisting` flag. When `true`, `mountSlotObjects` calls `slot.setAttachment(null)` before `addSlotObject` to erase any artist placeholder left in the skeleton file. Default: `false` (both layers coexist).

The `View` DSL exposes `.attachToSlot(slotName, callback, options?)` on Spine nodes for declarative slot configuration. See `view/.artifacts/slot-attach-design.md` for the full technical design.

## Current scope and boundaries

- **In Scope:** Recursively traversing declarative JSON-like schemas, synchronously instantiating PixiJS objects, applying geometric properties, binding them to `PixiEntity`, and dispatching UI lifecycle signals.
- **Out of Scope:** Asynchronous network asset loading. Resources must already be physically present in `AssetsStorage` before building begins.
- **Out of Scope:** Providing the fluent API to author the `TreeNode` schemas. This responsibility is delegated to the adjacent `View` module.


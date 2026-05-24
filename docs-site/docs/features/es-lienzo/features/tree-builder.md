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
    - `AxisContainer`: Custom PIXI container supporting auto-layout.
    - `AbstractBuilderBehaviour`: Base class for custom node parsers.
- **Interfaces & Types:**
    - `TreeNode`: Union type describing any valid configuration node.
    - `IBuilderBehaviour<T>`: Factory contract for a specific node.
    - `IBuilderResult`: Output structure containing the native `view` and ECS `entity`.
    - _Options_: `IContainerOptions`, `ISpriteOptions`, `ISpineOptions`, etc..
- **Signals:**
    - `OnViewCreatedSignal` — dispatched after full subtree construction (next frame).
    - `OnViewDestroyedSignal` — dispatched on permanent container destruction.
    - `OnViewRemovedSignal` — dispatched when a container is detached from its parent without being destroyed (non-destructive release, supports pooling).

## Current scope and boundaries

- **In Scope:** Recursively traversing declarative JSON-like schemas, synchronously instantiating PixiJS objects, applying geometric properties, binding them to `PixiEntity`, and dispatching UI lifecycle signals.
- **Out of Scope:** Asynchronous network asset loading. Resources must already be physically present in `AssetsStorage` before building begins.
- **Out of Scope:** Providing the fluent API to author the `TreeNode` schemas. This responsibility is delegated to the adjacent `View` module.


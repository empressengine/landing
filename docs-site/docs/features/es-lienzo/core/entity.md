---
sidebar_position: 1
sidebar_label: "entity"
---

# Feature: `core/entity`

## What this feature does

The `entity` feature in `es-lienzo` provides `PixiEntity`, a concrete implementation of the ECS `NodeEntity` mapped directly to a PixiJS `Container`. It acts as the primary bridge between the purely logical, data-oriented ECS world and the visual, hierarchical PixiJS scene graph. It synchronizes base states (like visibility and hierarchy) and handles the safe destruction of GPU resources.

## Why this feature exists

In a strict ECS architecture, entities are purely logical constructs. However, to render a game, there must be a tangible link between the ECS state and the renderer's display objects.

Without this integration, developers would have to manually synchronize the creation, destruction, visibility, and parent-child relationships of PixiJS containers inside custom systems every frame. `PixiEntity` solves this by seamlessly hooking into the lifecycle and state properties of the base `NodeEntity`, ensuring the visual scene graph stays perfectly in sync with the ECS logical tree automatically.

## How it works

1. **Instantiation:** When a `PixiEntity` is created, it is passed a `PIXI.Container`. It generates a unique framework ID and passes both the container and the ID up to the `NodeEntity` constructor.
2. **State Synchronization:** The `active` getter and setter are overridden. When `PixiEntity.active` is mutated, it directly toggles `node.visible` on the Pixi container and dispatches the global `OnEntityActiveChangedSignal`.
3. **Hierarchical Syncing:** When `addChild(entity)` is invoked, it first updates the abstract ECS tree via `super.addChild(entity)`, and immediately appends the child's Pixi container to its own `_node.addChild()`, keeping both trees identical. Conversely, `removeChild(entity)` delegates the ECS tree update to `super.removeChild` and then calls `this._node.removeChild(removedEntity.node)`, so detaching a child from the ECS hierarchy is always mirrored in the PixiJS scene graph.
4. **Visual Masking:** The `mask` method provides an inline way to generate a `PIXI.Graphics` object (rectangle or circle) and apply it as a visual mask to the underlying container.
5. **Resource Destruction:** When `destroy()` is called, it triggers the base ECS cleanup and concurrently invokes `node.destroy({ children: true })` to release PixiJS GPU memory.

## Interesting design decisions

### 1) Property Delegation for Active State

Instead of creating a system that iterates over all entities to sync an `ActiveComponent` with Pixi's visibility, `PixiEntity` overrides the native `active` setter.
_Result:_ This provides zero-overhead, instant synchronization between logical ECS exclusion and visual rendering exclusion, while still notifying the rest of the engine via `OnEntityActiveChangedSignal`.

### 2) Deep Destruction Delegation

The `destroy()` method is overridden to cascade the destruction down to the PixiJS scene graph (`{ children: true }`).
_Result:_ This tightly couples ECS memory management to GPU memory management. When an entity dies logically, its texture references and display objects are cleanly swept from WebGL memory, preventing major memory leaks.

### 3) Dual-Tree Node Management

By overriding both `addChild` and `removeChild`, the framework maintains two identical tree structures simultaneously without constant polling.
_Result:_ Developers can traverse the tree using pure ECS logic or PixiJS logic interchangeably, knowing that logical parenting and visual parenting are permanently synchronized — both on attach and on detach. `removeChild` is also the detach primitive used by `PixiObjectPool.release` to cleanly remove a pooled entity from the scene graph before returning it to the pool.

### 4) Built-in Masking Helper

Instead of forcing developers to manually instantiate `PIXI.Graphics` nodes and attach them via generic components, the entity provides a direct `mask(value: IMaskOptions)` helper.
_Result:_ It dramatically reduces boilerplate for common UI tasks (like clipping scrolling areas or avatars) while keeping the implementation details of the `Graphics` object encapsulated within the `core` layer.

## Public contracts in this feature

- **Interfaces & Types:** \* `IMaskOptions` (Defines shape, dimensions, and debug flags for masking).
- **Classes:** \* `PixiEntity` (The concrete `NodeEntity` wrapper for PixiJS Containers).

## Current scope and boundaries

- **In Scope:** Bridging logical `NodeEntity` concepts to a `PIXI.Container`. Synchronizing visibility state, mirroring parent-child hierarchy operations (`addChild`, `removeChild`), basic geometric masking, and triggering PixiJS resource destruction.
- **Out of Scope:** Positioning, scaling, and rotation. `PixiEntity` intentionally ignores spatial transforms; those are managed by dedicated systems and components (e.g., `PositionComponent`).
- **Out of Scope:** Storage management. The `destroy()` method explicitly warns that it does not remove the entity from `EntityStorage`. External services (like a `deinstantiate` helper from the `features` layer) are responsible for safely removing the entity from ECS memory and indexes.


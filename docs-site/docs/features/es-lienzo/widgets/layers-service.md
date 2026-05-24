---
sidebar_position: 2
sidebar_label: "layers-service"
---

# Feature: `widgets/layers-service`

## What this feature does

The `layers-service` is a global rendering orchestration controller that structurally separates display elements into explicit composite layers. By wrapping the native `@pixi/layers` library, it provides named display groups, enabling logical depth sorting regardless of absolute ECS Graph parent hierarchies.

## Why this feature exists

In complex 2D games, the visual rendering order (Z-sorting) often conflicts with the logical scene graph hierarchy. For example, a health bar might be a child of a "Player" container in the scene graph, but it needs to render visually above all other characters and environment assets.

The `LayersService` solves this problem by decoupling the visual depth from the physical Canvas tree. It allows entities to be assigned to layers logically, independent of their scene graph parentage. This prevents developers from having to manually flatten their scene graphs just to achieve correct rendering overlaps.

## How it works

1. **Bootstrapping:** The service is initialized via `setStage(stage)`. This registers the primary absolute Pixi.js Application container (the `Stage`) and resets the internal sorting order.
2. **Registration:** Developers define distinct rendering planes by calling `createGroup(name, sortable)`. This instantiates a paired `@pixi/layers` `Group` and `Layer`, assigns the layer directly to the root stage, and automatically increments the rendering order sequence.
3. **Assignment:** To change an object's rendering depth, `setLayer(name, node)` is called. This finds the cached group by its string identifier, binds the node's `parentGroup` to it, and triggers a targeted active visual sorting sweep.
4. **Reversion & Sweeps:** A custom layer assignment can be undone using `resetLayer(node)`, which removes the `parentGroup` binding and drops the customized layout bounds. The service also handles manual rendering updates via `sort(name)` or the heavy, broad `sortAll()` sweep.

## Interesting design decisions

### 1) Automated Sequential Ordering

When `createGroup` is invoked, the service uses an internal `_order` counter to sequentially sequence creation orders automatically.
_Result:_ This prevents explicit Canvas depth clipping flaws and removes the need for developers to manually manage or hardcode integer Z-indexes for global layers.

### 2) String-Based Mapping Dictionary

Groups and Layers are tracked internally via `Map<string, Group>` and `Map<string, Layer>` dictionaries, keyed by distinct textual identifiers.
_Result:_ Systems, UI builders, and components can assign views to layers purely by string names (e.g., "Background", "UI") without needing a direct memory reference to the `Group` instance, simplifying declarative configurations.

### 3) Granular Optimization Sweeps

The service provides a targeted `sort(name)` method alongside the global `sortAll()` method.
_Result:_ Applies precise optimization targeting singularly a mutated defined layer block solely. This guarantees high performance by limiting runtime calculations accurately instead of forcing a global structural Z-sorting rendering update on every minor change.

## Public contracts in this feature

- **Classes:**
    - `LayersService`: The global rendering orchestration controller.
- **Interfaces & Types:**
    - `ILayerOptions`: Configuration properties allocating a distinct logical rendering plane, requiring a `name` and optional `sortable` boolean.

## Current scope and boundaries

- **In Scope:** Bootstrapping the `@pixi/layers` Stage, instantiating paired Group/Layer objects, logically assigning Pixi `Container` nodes to named groups, and executing targeted or global Z-sorting sweeps.
- **Out of Scope:** Standard local `zIndex` sorting within individual containers. The service manages global logical display planes, not sibling sorting inside a standard un-layered `PIXI.Container`.
- **Out of Scope:** ECS business logic. As a `widget`, it provides pure rendering utilities and has no knowledge of how or why a game system might trigger a layer change.


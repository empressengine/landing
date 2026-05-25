---
sidebar_position: 3
sidebar_label: "entity"
---

# Feature: `core/entity`

## What this feature does

The `entity` module is the central object-composition primitive of the `empr.es` ECS kernel. It acts as a runtime container for `Component` instances, managing their lifecycle, active state, and accessibility. The module provides the base `Entity` implementation, a hierarchical `NodeEntity` for scene-graph integration, a `ProxyEntity` for transparent interception of state changes, and an `EntityIndexator` for highly optimized, O(1) component-based lookups.

Additionally, it defines a suite of strongly-typed global `Signal`s that broadcast entity mutations to the rest of the framework.

## Why this feature exists

In an ECS architecture, an Entity must be a pure identifier that aggregates data without containing business logic. However, the framework needs a structured, predictable way to:

- Bind pure data components to a specific identity.
- Notify the rest of the engine (queries, storage, systems) when an entity's composition changes.
- Temporarily disable specific traits (components) without destroying their state or causing garbage collection (GC) pressure.
- Map flat ECS data into hierarchical scene graphs required by external renderers (like PixiJS or Three.js).
- Efficiently index entities by their components to prevent $O(N)$ iterations over the entire game world during filtering.

## How it works

1. **Instantiation & Component Attachment:**
   An `Entity` is instantiated with a unique `id` and `name`. When `addComponent` is called, the entity dynamically mixes two properties into the pure component object: an `entity` reference (pointing back to the owner) and a `disposable` context for lifecycle management.
2. **Reactivity & Signaling:**
   Every structural mutation (`add`, `remove`, `enable`, `disable`, `destroy`) dispatches strongly-typed signals (e.g., `OnEntityAddComponentSyncSignal`). These signals are dispatched both synchronously (for immediate reactions) and asynchronously on the next frame (for deferred, batch processing).
3. **Interception & Indexing:**
   The `ProxyEntity` utility wraps an `Entity` instance. It intercepts method calls (like `addComponent`) and automatically delegates them to the static `EntityIndexator`. The indexator maintains a `Map<ComponentType, Set<IEntity>>`, allowing instant $O(1)$ retrieval of all entities possessing a specific component.
4. **Hierarchical Composition:**
   If a renderer is involved, developers use `NodeEntity<T>`. This variant maintains a tree structure (`parent`, `children`) and holds a generic reference to an external rendering node (`T`), allowing seamless alignment of the ECS flat structure with a renderer's scene graph. Child management is handled via `addChild` / `removeChild`. `addChild` automatically re-parents a node that already belongs to another entity by calling `removeChild` on the previous parent first. `setParent` accepts `null` to cleanly detach a node from the hierarchy without destroying it.
5. **Pool Lifecycle Signaling:**
   Two dedicated signals support object-pool integration: `OnEntityReleasedSignal` is dispatched when an entity is de-registered from `EntityStorage` (returned to pool), and `OnEntityAcquiredSignal` is dispatched when it is re-registered (retrieved from pool). These signals allow downstream systems (e.g., `PixiObjectPool`) to react to pool transitions without polling.

## Interesting design decisions

### 1) Dynamic Mixins over Inheritance for Components

Instead of forcing components to inherit from a base class to get an `.entity` reference, `Entity.addComponent` uses `Object.defineProperty` to inject the `entity` getter and a `disposable` object directly into the component instance.
_Result:_ Components remain absolutely pure "Plain Old Data" (POD) types, satisfying the `core/component` contract, while still allowing inverse lookups and scoped event cleanup.

### 2) Dual-Signal Dispatch (Sync vs. Next Frame)

For every mutation, the entity dispatches two signals: a `SyncSignal` (e.g., `OnEntityAddComponentSyncSignal`) and a deferred `Signal` (e.g., `OnEntityAddComponentSignal` via `waitNextFrame`).
_Result:_ It gives downstream consumers total control over execution flow. Immediate logic (like attaching a renderer node) can use the sync signal, while heavy computations (like rebuilding a complex pathfinding grid) can defer to the next frame to avoid mid-frame stutters.

### 3) State-Preserving Component Disabling

Instead of destroying a component when it is no longer needed temporarily, developers can call `disableComponent`. The entity moves the component from `_components` to a `_disabledComponents` map.
_Result:_ The component stops satisfying `ComponentFilter` queries (excluding it from Systems), but its state remains intact in memory. Re-enabling it causes zero GC pressure and preserves data.

### 4) Deep Proxy Caching & Error Isolation

`ProxyEntity` wraps components returned by `getComponent` in a deep proxy to track property changes (triggering `updateComponent` interceptors). To prevent massive GC allocation, it uses a `WeakMap` cache to ensure the exact same proxy instance is returned for a given component. Furthermore, interceptor execution is wrapped in a safe loop (`safeInvokeInterceptors`).
_Result:_ High-performance state observation without memory leaks. If one interceptor crashes, it logs the error but does not break the entire interception chain, preserving application stability.

### 5) Zero-Allocation O(1) Indexing

`EntityIndexator.getIndexedEntities` returns a globally frozen `EMPTY_SET` if a component type has no registered entities.
_Result:_ Eliminates unnecessary `Set` allocations during empty queries, significantly reducing memory footprint during intense filtering operations by `EntityStorage`.

## Public contracts in this feature

- **Interfaces & Types:** `IEntity`, `INodeEntity<T>`, `EntityComponent<T, K>`, `ComponentFilter`, `EntityReference`, `IInterceptorContext`.
- **Classes:** - `Entity`: The base ECS primitive.
    - `NodeEntity<T>`: The hierarchical variant for renderer integrations.
    - `ProxyEntity`: The interception wrapper.
    - `EntityIndexator`: The static $O(1)$ component-to-entity index.
- **Signals:** `OnEntityAddComponentSyncSignal`, `OnEntityAddComponentSignal`, `OnEntityRemoveComponentSyncSignal`, `OnEntityRemoveComponentSignal`, `OnEntityDestroySignal`, `OnEntityActiveChangedSignal`, `OnEntityAddChildSignal`, `OnEntityRemoveChildSignal`, `OnEntityReleasedSignal`, `OnEntityAcquiredSignal`.

## Current scope and boundaries

- **Logic boundaries:** `Entity` only manages its own internal sets of components and its immediate hierarchy (`NodeEntity`). It does **not** evaluate game logic, nor does it process the global queries of multiple entities (that is the job of `EntityStorage` and `Filtered`).
- **Domain boundaries:** `NodeEntity` is completely agnostic to rendering engines. The `T` parameter allows it to hold a `PIXI.Container` or `THREE.Object3D` without the `core` layer knowing what Pixi or Three.js are.
- **Interception Scope:** `ProxyEntity` mutates behavior via interceptors, but it relies on external systems (like `EntityStorage`) to actually create the proxy and attach the indexing logic.


---
sidebar_position: 1
sidebar_label: "entity-storage"
---

# Feature: `widgets/entity-storage`

## What this feature does

The `entity-storage` module serves as the primary runtime container for all Entities within the `empr.es` framework. It enforces UUID uniqueness, stores all active entities, and provides highly optimized component-based filtering mechanisms. It automatically tracks entity lifecycles, and seamlessly routes queries between fast index lookups, full scans, and reactive live queries (`EntityQuery`) based on the execution context. Additionally, it includes utility functions like `compileFilter` for generating fast ad-hoc evaluation functions.

## Why this feature exists

In an ECS architecture, Systems constantly ask the engine for specific subsets of entities (e.g., "all entities with `Position` and `Velocity`"). If the framework had to iterate over every single entity in the world for every query, frame rates would plummet as the entity count grew.

This feature exists to solve the performance bottleneck of entity querying. It centralizes storage to prevent ID collisions, abstracts the complex intersection logic away from the Systems, and prevents memory leaks by automatically deregistering entities that are destroyed. As a `widget`, it wraps `core` primitives (`Entity`, `Filtered`) into a stateful, ready-to-use service without polluting the core kernel.

## How it works

1. **Addition & Proxying:** When `addEntity(entity)` is called, the storage checks for ID uniqueness. It then uses an injected `ProxyEntity` service to wrap the entity. This wrapper intercepts component mutations to automatically keep the static `EntityIndexator` up to date. The wrapped entity is saved in an internal `Map`, and an array-rebuild flag is triggered.
2. **Filtering Request:** When a System calls `filter()`, the storage analyzes the requested `includes` and `excludes`.
3. **Query Resolution:**
    - If an `executionContext` is provided (and no custom `each` function is used), it computes a unique hash for the query. It either returns a cached, self-updating `EntityQuery`, or creates a new one and caches it.
    - If no context is provided (or an `each` function is present), it falls back to `_slowFilter`.
4. **Intersection Optimization:** During filtering, the storage asks the `EntityIndexator` for the `Set` of entities for every `included` component type. It finds the _smallest_ Set. It then iterates _only_ over that smallest group to verify the remaining includes/excludes, completely avoiding a full database scan.
5. **Reactive Destruction:** The storage listens to the global `OnEntityDestroySignal`. When an entity triggers its own `.destroy()` method, the storage automatically deletes it from its internal `Map` and schedules an array update.
6. **Pool Lifecycle (Release / Acquire):**
    - `releaseEntity(entity)` removes the entity from the internal `Map`, calls `EntityIndexator.unindexEntity` for each of its components, and dispatches `OnEntityReleasedSignal`. The entity instance is preserved — it may be returned to an `ObjectPool` and re-registered later.
    - `acquireEntity(entity)` adds the entity back to the `Map`, calls `EntityIndexator.indexEntity` for each component, and dispatches `OnEntityAcquiredSignal`. All live `EntityQuery` instances react to both signals automatically: they drop the entity on release and re-evaluate it on acquire.

## Interesting design decisions

### 1) Smallest-Set Intersection Optimization

Instead of iterating through all active entities, `_getOptimizedEntitySet` identifies the requested component with the fewest active instances via `EntityIndexator`.
_Result:_ Filtering performance becomes proportional to the rarest component in the query ($O(N_{smallest})$) rather than the total number of entities in the game ($O(N_{total})$), enabling massive scale.

### 2) Context-Aware Live Query Caching

The `filter` method takes an optional `executionContext` string (usually provided automatically by the `Pipeline`). It hashes this context along with the component types to cache an `EntityQuery`.
_Result:_ Systems inside a Pipeline only pay the cost of filtering on the very first frame. On all subsequent frames, they instantly receive a cached $O(1)$ live query, completely bypassing intersection math.

### 3) Array Result Caching (`_needsArrayUpdate`)

The getter for `.entities` does not iterate over the internal `Map` to build a new array every time it is accessed. It maintains a persistent `_entitiesArray` and only rebuilds it if `_needsArrayUpdate` was flagged `true` by an addition or deletion.
_Result:_ Eliminates constant array allocations and garbage collection pressure when iterating over all entities in successive frames.

### 4) Event-Driven Cleanup over Manual Deregistration

The `destroyEntity` method simply calls `entity.destroy()`. The actual removal from the storage happens because the constructor registers a listener to `OnEntityDestroySignal`.
_Result:_ Total safety. Even if a developer manually calls `entity.destroy()` directly instead of going through `storage.destroyEntity()`, the storage will still intercept the signal and cleanly remove the entity, preventing dangling references.

### 5) Non-Destructive Pool Lifecycle via `releaseEntity` / `acquireEntity`

Unlike `removeEntity` (which calls `destroyEntity` and permanently invalidates the entity), `releaseEntity` only de-indexes the entity and dispatches a signal — the instance remains fully intact. `acquireEntity` is the symmetric inverse: it re-indexes and re-announces the entity without creating a new proxy.
_Result:_ Object-pool patterns become first-class in the framework. A `PixiObjectPool` can cycle the same `PixiEntity` instance through many spins with zero allocations, while the ECS query layer stays consistent: no system ever sees a pooled-but-idle entity, and every acquired entity immediately appears in every matching live query.

## Public contracts in this feature

- **Interfaces & Types:** `IEntityStorage`, `CompileFilterReturns`.
- **Classes:** `EntityStorage`.
- **Utilities:** `compileFilter` — Generates a raw, fast evaluation function `(entity) => boolean` for ad-hoc component filtering.
- **Key methods:** `addEntity`, `removeEntity`, `destroyEntity`, `releaseEntity`, `acquireEntity`, `getEntity`, `filter`, `clearQueries`.

## Current scope and boundaries

- **Layer Boundaries:** As a `widget`, it imports `core` primitives (`IEntity`, `ComponentType`, `IFiltered`) and `shared` signals, but knows nothing about the application lifecycle, `Executor`, or `Pipelines` (which reside in `features`).
- **Logic Boundaries:** `EntityStorage` does not execute or run game logic. It only organizes entities and evaluates filter rules.
- **Indexing Boundaries:** The storage does not maintain the component indexes itself; it delegates that responsibility to the static `EntityIndexator` populated via `ProxyEntity`.


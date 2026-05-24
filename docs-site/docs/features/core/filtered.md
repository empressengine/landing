---
sidebar_position: 4
sidebar_label: "filtered"
---

# Feature: `core/filtered`

## What this feature does

The `filtered` module defines the standard abstraction for collections of entities resulting from component-based queries. It provides the unified `IFiltered` interface and its two primary implementations:

- `Filtered`: A static, one-time snapshot of entities that matched a query at a specific moment.
- `EntityQuery`: A reactive, highly optimized "live query" that continuously updates its internal list by listening to entity mutation signals.

The module standardizes how Systems interact with matched entities by offering synchronous (`forEach`) and asynchronous (`sequential`, `parallel`) iteration methods.

## Why this feature exists

In an ECS architecture, Systems constantly ask for subsets of entities (e.g., "give me all entities with `Position` and `Velocity`"). Re-evaluating these queries across tens of thousands of entities every single frame is a massive performance bottleneck.

This feature solves two critical architectural problems:

1. **Abstraction of Iteration:** Systems should not care _how_ entities are stored or queried; they only need a reliable way to iterate over the results.
2. **Query Caching & Reactivity:** By providing a live `EntityQuery`, the framework shifts from an $O(N)$ per-frame scanning model to an $O(1)$ event-driven model. The query maintains itself, completely eliminating the cost of repeated filtering in tight game loops.

## How it works

1. **Query Instantiation:** When a System or service requests entities (typically via `EntityStorage.filter`), it receives an `IFiltered` object.
    - If it's a transient request or uses a custom validation function (`each`), a static `Filtered` snapshot is returned.
    - If it's executed within a pipeline context, an `EntityQuery` is created (or retrieved from cache).
2. **Reactive Maintenance (EntityQuery):** The `EntityQuery` registers listeners to the following global signals:
   - `OnEntityAddComponentSyncSignal` / `OnEntityRemoveComponentSyncSignal` — component mutations trigger re-evaluation.
   - `OnEntityActiveChangedSignal` — active/inactive toggling triggers re-evaluation (unless `withDisabled` is set).
   - `OnEntityDestroySignal` — destroyed entities are removed from the query immediately.
   - `OnEntityReleasedSignal` — entities returned to an object pool are treated as destroyed: removed from the query so idle pooled entities are never visible to systems.
   - `OnEntityAcquiredSignal` — entities retrieved from a pool are re-evaluated against the filter: if they match, they are added back to the query automatically.
3. **Delta Updates:** When an entity mutates, `EntityQuery` evaluates if the entity now matches or fails the `ComponentFilter`. It dynamically adds or removes the entity from its internal array.
4. **Consumption:** The System consumes the query using `.forEach()` for standard logic, or `.sequential()` / `.parallel()` for Promise-based workflows.

## Interesting design decisions

### 1) Reactive Live Queries over Polling

Instead of `EntityStorage` recalculating the intersection of components every tick, `EntityQuery` builds its initial list once and then relies entirely on ECS signals.
_Result:_ Query resolution time during the frame execution drops to near zero, freeing up CPU for actual game logic.

### 2) $O(1)$ "Swap and Pop" Array Removal

When an entity no longer matches an `EntityQuery`, it is removed from the internal `_items` array. Instead of using `Array.splice()`—which forces an $O(N)$ shift of all subsequent elements and causes memory churn—the class swaps the target element with the last element in the array and calls `.pop()`.
_Result:_ Entity removals remain strictly $O(1)$, maintaining flat performance graphs even under heavy entity mutation loads.

### 3) Reverse Iteration for Safety

In `EntityQuery.forEach`, the internal array is iterated backwards (`for (let i = this._items.length - 1; i >= 0; i--)`).
_Result:_ This is a brilliant safeguard for synchronous mutations. If a System removes a component from an entity _while_ iterating over it, the `EntityQuery` will immediately "swap and pop" that entity. If iteration went forward, this swap would cause the loop to skip the swapped element. Reverse iteration guarantees no entities are skipped during concurrent structural changes.

### 4) Unified Iteration Contract

Both `Filtered` and `EntityQuery` implement `IFiltered`.
_Result:_ The consumer (the System) is completely decoupled from the caching strategy. It writes identical logic regardless of whether it's processing a cached live query or a heavy, one-off snapshot computation.

### 5) Pool-Aware Lifecycle via `Released` / `Acquired` Signals

`EntityQuery` subscribes to `OnEntityReleasedSignal` (treated the same as `OnEntityDestroySignal` — immediate removal) and `OnEntityAcquiredSignal` (treated as a structural change — triggers re-evaluation against the filter).
_Result:_ Entities that return to an object pool vanish from all live queries automatically, so no System can accidentally iterate over an idle pooled entity. When the same entity is acquired from the pool, it re-enters every query it satisfies — again without any explicit call from the pooling layer. The query remains a passive, zero-cost observer across the full pool lifecycle.

## Public contracts in this feature

- **Interfaces & Types:** `IFiltered`, `EntityIterationCallback`, `CompileFilterReturns`.
- **Classes:** - `Filtered` — A static snapshot array of entities.
    - `EntityQuery` — A live, self-updating query bound to entity signals.
- **Utilities:** `compileFilter` — A helper function to create ad-hoc evaluation functions for specific include/exclude rules.

## Current scope and boundaries

- **Logic Boundaries:** The `filtered` module only manages the _result_ of a query. It does not perform the initial heavy-lifting of finding entities across the entire world (that is the responsibility of `EntityStorage` and `EntityIndexator`).
- **Dependency Boundaries:** True to the `core` layer rules, `filtered` strictly depends downwards on `entity` and `component`. It explicitly does **not** import `EntityStorage` (which resides in the `widgets` layer). This ensures the core ECS primitives remain completely decoupled from the concrete storage implementation.


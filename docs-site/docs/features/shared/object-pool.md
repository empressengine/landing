---
sidebar_position: 2
sidebar_label: "object-pool"
---

# Feature: `shared/object-pool`

## What this feature does

The `object-pool` module provides a highly efficient, generic, and framework-agnostic data structure for recycling short-lived object allocations. It manages the lifecycle of reusable instances via `acquire` and `release` semantics, supporting configurable pre-allocation, auto-growing, and automatic state resetting.

## Why this feature exists

In a high-performance game loop running at 60+ FPS, continuously creating and destroying objects (such as particles, projectiles, or temporary component data containers) creates massive pressure on the JavaScript engine's Garbage Collector (GC). When the GC pauses execution to clean up these discarded objects, it results in noticeable frame drops and micro-stutters.

This feature solves the allocation problem by allowing the application to reuse a fixed or elastic set of pre-allocated memory blocks instead of constantly requesting new memory.

## How it works

1. **Initialization & Pre-allocation:** A developer instantiates an `ObjectPool<T>` by passing a configuration object with a `factory` function, an optional `reset` function, and sizing constraints (`initialSize`, `maxSize`, `autoGrow`). If `initialSize` is set, the pool immediately invokes the factory to populate its internal array.
2. **Acquisition:** When an object is needed, the system calls `acquire()`.
    - If the pool has available objects, it pops one from the internal `_pool` array.
    - If empty and `autoGrow` is true, it creates a new instance on the fly.
    - If empty and `autoGrow` is false, it explicitly throws an error to catch memory starvation.
      The acquired object is added to the `_inUse` tracking set and returned to the consumer.
3. **Release:** Once the object is no longer needed, it is returned via `release(item)`.
    - The pool verifies the object is actually in use. If so, it is removed from the `_inUse` set.
    - The custom `reset` function (if provided) is invoked to clean up the object's state, preventing data leakage between reuses.
    - If the pool has not exceeded its `maxSize`, the object is pushed back into the available array; otherwise, it is intentionally discarded for GC.

## Interesting design decisions

### 1) Strict Framework Agnosticism

The `ObjectPool<T>` relies entirely on the generic type `<T>` and accepts an external `factory` and `reset` function.
_Result:_ It contains absolutely zero knowledge of ECS, Entities, or Components. This makes the module highly reusable; it can pool low-level geometry arrays, network packets, or complex `Component` classes with equal efficiency without breaking layer boundaries.

### 2) Explicit `inUse` Tracking via `Set`

The pool tracks acquired objects using a private `_inUse` `Set<T>`. When `release()` is called, it verifies the object is present in this Set.
_Result:_ This completely prevents "double-release" bugs (where an object is accidentally returned to the pool twice, leading to multiple systems mutating the same reused reference concurrently), ensuring high stability in complex applications.

### 3) Hard Boundaries (`maxSize` & Discard Policy)

When `release(item)` is called, the pool checks `if (this._pool.length < this._maxSize)` before pushing the item back into availability.
_Result:_ If a massive spike occurs (e.g., 10,000 particles spawn at once), the pool can temporarily accommodate them via `autoGrow`, but as they are released, any excess beyond `maxSize` is allowed to be garbage collected. This prevents permanent memory bloating after a temporary usage spike.

### 4) Decoupled State Resetting

Instead of forcing pooled objects to implement a specific interface (e.g., `IResettable`), the reset logic is injected at the pool's creation via the `reset?: PoolReset<T>` option.
_Result:_ This allows developers to pool third-party objects (like `PIXI.Graphics` or generic JavaScript arrays) without modifying their prototype or wrapping them in custom classes just to fulfill a reset contract.

## Public contracts in this feature

- **Interfaces:** `IObjectPool<T>`, `IObjectPoolOptions<T>`.
- **Types:** `PoolFactory<T>`, `PoolReset<T>`.
- **Classes:** `ObjectPool<T>`.

## Current scope and boundaries

- **Lifecycle Boundaries:** The pool itself does not know _when_ an object should be released. It is purely a mechanical dispenser and collector. Higher-level abstractions (like `widgets/Pools` or `LifecycleTracker`) are responsible for tying pool releases to game events (e.g., Entity destruction).
- **Concurrency:** This implementation is synchronous and designed for a single-threaded Javascript environment.
- **Layer Limits:** Residing in the `shared` layer, it acts strictly as infrastructure and never imports from `@core` or any domain-specific logic.


---
sidebar_position: 2
sidebar_label: "object-pool"
---

# Feature: `core/object-pool` (es-lienzo)

## What this feature does

The `core/object-pool` module provides `PixiObjectPool` — a PixiJS-aware subclass of the
framework-agnostic `ObjectPool<T>` from `@empr/es`. It extends the base pool's `acquire` and
`release` lifecycle hooks with two renderer-specific side effects: scene-graph detachment and
ECS re-registration, giving the consuming code a single, unified pooling API that is safe to
use with Pixi `DisplayObject` hierarchies.

## Why this feature exists

The base `ObjectPool<T>` (see `@empr/es/shared/object-pool`) is intentionally isomorphic and
framework-agnostic — it knows nothing about PixiJS, the scene graph, or the ECS world. This
is the correct design at the `shared` layer.

However, when pooling `PixiEntity` instances in a running game, two additional concerns arise
that the base pool cannot address:

1. **Scene graph visibility** — An idle entity sitting in the pool must not be rendered or
   processed by the PixiJS ticker. Simply hiding it is not enough; it must be detached from
   its parent `Container` so it generates zero draw calls and receives no update events.
2. **ECS query consistency** — The `EntityStorage` tracks which entities are "alive" in the
   world. When an entity is pooled it must be unregistered, and when it is acquired it must be
   re-registered so that systems and live queries can observe it again.

`PixiObjectPool` solves both concerns by overriding `acquire` and `release` while delegating
all actual pooling mechanics to the parent class.

## How it works

1. **`release(item)`** — Before delegating to `super.release()` (which calls `reset` and
   returns the item to the free list), the entity is removed from its PixiJS parent via
   `item.parent?.removeChild(item)`. This ensures no one-frame render flash occurs and that
   the detachment happens while the node is still in its original state.
2. **`acquire()`** — After `super.acquire()` pops a pre-allocated item from the free list, the
   pool resolves `EntityStorage` from the DI container and calls `entityStorage.acquireEntity(item)`.
   This re-indexes the entity's components and dispatches `OnEntityAcquiredSignal`, making the
   entity visible to all active ECS queries.
3. **Everything else** — Pre-allocation, `autoGrow`, `maxSize`, `inUse` tracking, and the
   user-supplied `factory` / `reset` callbacks are fully inherited from `ObjectPool<PixiEntity>`
   without modification.

## Interesting design decisions

### 1) Thin Extension, Not Reimplementation

`PixiObjectPool` adds exactly two overrides. All memory-management logic, capacity arithmetic,
and double-release protection remain in the base class.
_Result:_ The PixiJS integration is auditable in isolation. Any bug in pooling mechanics is
debugged once, in `ObjectPool`, and the fix applies everywhere.

### 2) Detach Before Reset

In `release`, `removeChild` is called **before** `super.release()`. The base class invokes
the `reset` callback inside `super.release()`.
_Result:_ The `reset` function always runs on a node that has already left the scene graph,
so any position or visibility changes made during reset are never rendered for even a single
frame — eliminating a class of subtle visual glitches.

### 3) Lazy `EntityStorage` Resolution

`EntityStorage` is resolved inside `acquire()` via `Dependency.instance.inject(EntityStorage)`
rather than stored as a constructor dependency.
_Result:_ `PixiObjectPool` can be instantiated at any point in the bootstrap sequence,
including before the DI container has finished wiring all services. The storage is only
required at the moment an entity is actually acquired, by which time the container is
guaranteed to be ready.

### 4) Isomorphic Base, Renderer-Specific Subclass

The original `ObjectPool<T>` lives in the `shared` layer of `@empr/es` and carries zero
renderer knowledge, making it usable in Node.js, workers, or any non-Pixi context.
`PixiObjectPool` lives in `@empr/es-lienzo` — the PixiJS integration layer — and is the
only entry point that may import Pixi-specific APIs.
_Result:_ Layer boundaries are respected: renderer concerns never leak into the core ECS
framework, and the pooling algorithm never needs to know about PixiJS.

## Public contracts in this feature

- **Classes:** `PixiObjectPool`.

## Current scope and boundaries

- **Layer Boundaries:** As a `core` module inside `es-lienzo`, this file may import from
  `@empr/es` (base pool, `EntityStorage`) and from sibling `core` modules (`PixiEntity`).
  It must never import from `features`, `widgets`, or application layers.
- **Lifecycle Boundaries:** `PixiObjectPool` manages pool mechanics and ECS registration
  only. Deciding *when* to attach an acquired entity to a PixiJS `Container`, *where* in the
  scene graph it should live, and *when* to trigger `release` are responsibilities of the
  consuming system (e.g. `symbolCreatePoolSystem`).
- **Scene Graph Attachment:** `PixiObjectPool` removes entities from the scene graph on
  release but never adds them back on acquire. Attachment to a parent `Container` must be
  performed explicitly by the caller after `acquire()` returns.


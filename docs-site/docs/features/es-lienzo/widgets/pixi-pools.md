---
sidebar_position: 4
sidebar_label: "pixi-pools"
---

# Feature: `widgets/pixi-pools` (es-lienzo)

## What this feature does

The `pixi-pools` module provides `PixiPools` — a centralized registry for managing multiple
`PixiObjectPool` instances. It mirrors the API of the framework-agnostic `Pools` widget from
`@empr/es` while working exclusively with `PixiEntity` pools that are tightly integrated with
the PixiJS scene graph and the ECS world.

## Why this feature exists

The base `Pools` widget (see `@empr/es/widgets/pools`) already solves the problem of
distributing object pools across systems via Dependency Injection. However, it is isomorphic
and agnostic — it creates plain `ObjectPool<T>` instances with no knowledge of PixiJS, scene
graphs, or ECS registration.

When pooling `PixiEntity` objects, two additional responsibilities arise on every lifecycle
transition:

1. **Scene graph detachment** — a pooled entity must be removed from its PixiJS parent
   `Container` so it stops rendering and receiving ticker updates while idle.
2. **ECS re-registration** — an acquired entity must be re-added to `EntityStorage` so that
   live queries and systems can observe it again.

These concerns belong to the PixiJS integration layer, not to the framework-agnostic `Pools`
widget. `PixiPools` exists as the renderer-specific counterpart that bridges the gap: it
stores `PixiObjectPool` instances (which already handle both side effects internally) and
exposes the same clean registry API so consuming systems never need to manage pool references
directly.

## How it works

1. **Storage:** `PixiPools` maintains an internal `Map<PoolKey, PixiObjectPool>`.
2. **Creation:** A bootstrap system calls `createPool(key, options)` passing a unique key and
   standard pool configuration (`factory`, optional `reset`, `initialSize`, `autoGrow`, etc.).
   The service instantiates a new `PixiObjectPool`, registers it in the map, and returns it.
   Because `PixiObjectPool` extends `ObjectPool<PixiEntity>`, all pre-allocation and capacity
   logic runs at this point.
3. **Retrieval:** Any downstream system resolves `PixiPools` from the DI container and calls
   `getPool(key)`. The registry looks up the key and returns the concrete `PixiObjectPool`
   instance. If the key is missing, it throws synchronously — enforcing the initialization
   contract.
4. **Acquire / Release:** The returned `PixiObjectPool` exposes the same `acquire()` /
   `release()` interface as its base class, but with PixiJS-aware side effects baked in
   (scene detachment on release, ECS re-registration on acquire).

## Interesting design decisions

### 1) Renderer-Specific Mirror of an Agnostic Sibling

`PixiPools` is architecturally parallel to `Pools` from `@empr/es` — same registry concept,
same key type (`PoolKey`), same fail-fast retrieval — but typed to `PixiObjectPool` and
`PixiEntity` throughout.
_Result:_ Consumers working with Pixi objects get the exact same ergonomics as consumers of
the generic registry, while the type system guarantees they always receive a pool with
scene-graph-aware lifecycle hooks, not a plain `ObjectPool<T>`.

### 2) Concrete Return Type on `createPool` and `getPool`

Both methods return `PixiObjectPool` rather than the `IObjectPool<PixiEntity>` interface.
_Result:_ Callers have direct access to any Pixi-specific extensions added to
`PixiObjectPool` in the future without requiring a downcast. This is an intentional deviation
from the agnostic `Pools`, which returns `IObjectPool<T>` to preserve abstraction.

### 3) Fail-Fast Retrieval

`getPool` throws synchronously when the requested key is absent, mirroring the behaviour of
the parent `Pools` widget.
_Result:_ Silent null-reference bugs in the game loop are impossible. Missing pool
registrations surface immediately during initialization testing rather than causing
hard-to-trace rendering artefacts at runtime.

### 4) Lifecycle Delegation to `PixiObjectPool`

`PixiPools` does not implement any scene-graph or ECS logic itself. It delegates completely
to `PixiObjectPool`.
_Result:_ `PixiPools` remains a thin coordination layer. All rendering and ECS concerns are
encapsulated in `PixiObjectPool` and can be changed independently without touching the
registry.

## Public contracts in this feature

- **Classes:** `PixiPools`.

## Current scope and boundaries

- **Layer Boundaries:** As a `widget` inside `es-lienzo`, this module may import from
  `@empr/es` (for `IObjectPoolOptions` and `PoolKey`) and from sibling `core` modules
  (`PixiEntity`, `PixiObjectPool`). It must never import from `features` or application
  layers.
- **Key Uniqueness:** `PixiPools` does not enforce key uniqueness. Calling `createPool` with
  an already-registered key silently overwrites the previous pool. Uniqueness is a contract
  enforced by the consuming bootstrap code.
- **Lifecycle Boundaries:** `PixiPools` manages pool references but does not orchestrate
  their destruction. Clearing the registry or disposing individual pools during scene
  transitions is the responsibility of higher-level orchestrators at the `features` or `app`
  layers.
- **Scope:** `PixiPools` pools only `PixiEntity` instances. For pooling non-entity Pixi
  objects (e.g. raw `PIXI.Sprite`) or domain-agnostic data structures, use the base `Pools`
  widget from `@empr/es` with a custom `ObjectPool<T>`.


---
sidebar_position: 3
sidebar_label: "pools"
---

# Feature: `widgets/pools`

## What this feature does

The `pools` module provides a centralized registry for managing multiple `ObjectPool` instances. It allows systems to initialize, store, and fetch object pools using unified keys (`string | number | symbol`) without needing to maintain or pass around direct references to the pools themselves.

## Why this feature exists

While the `@shared/object-pool` module provides an efficient mechanism for recycling objects, manually instantiating and distributing these pools across various game systems creates tight coupling and tedious boilerplate.

The `Pools` widget exists to solve this architectural friction. It acts as a globally accessible (via Dependency Injection) locator service. A bootstrap script can pre-allocate pools for bullets, particles, or effects under specific names, and any subsequent System can cleanly retrieve them simply by asking the `Pools` registry for the correct key.

## How it works

1. **Storage Initialization:** The `Pools` class maintains an internal `Map<PoolKey, IObjectPool<any>>` to store the generated pools.
2. **Creation:** A developer calls `createPool<T>(key, options)` passing a unique identifier and standard pool configuration (like `factory`, `initialSize`, etc.). The service instantiates a new `ObjectPool` from the `shared` layer, registers it in the internal `Map`, and returns it.
3. **Retrieval:** When a System needs to acquire or release an object, it calls `getPool<T>(key)`. The service looks up the key in its dictionary. If it exists, it returns the casted pool interface. If it does not exist, it synchronously throws an error.

## Interesting design decisions

### 1) Thin Coordination Layer (Separation of Concerns)

The `Pools` class does not implement any actual object pooling logic or memory management itself.
_Result:_ It perfectly aligns with the `widgets` layer's responsibility. By acting as a thin coordination layer over `@shared/object-pool`, it provides a higher-order, stateful API without duplicating the complex, highly-optimized recycling logic already present in the framework's foundation.

### 2) Agnostic Keys (`PoolKey`)

The registry keys are defined as `type PoolKey = string | number | symbol`.
_Result:_ This provides maximum flexibility for the consuming application. Developers can use hardcoded strings for simplicity, numeric `enums` for strict typing, or unique `symbol`s to prevent naming collisions across different modules or third-party plugins.

### 3) Fail-Fast Retrieval

The `getPool` method explicitly throws an error (`throw Error('No pool with name ... found')`) if the requested pool does not exist in the map.
_Result:_ It prevents silent failures and null-reference exceptions deeper in the game loop. It enforces a strict initialization contract where pools must be explicitly created (and ideally pre-allocated) before any System attempts to use them during the hot path.

## Public contracts in this feature

- **Types:** `PoolKey`.
- **Classes:** `Pools`.

## Current scope and boundaries

- **Layer Boundaries:** As a `widget`, the module imports exclusively from `@shared/object-pool`. It has zero knowledge of ECS abstractions like Entities, Components, or Systems, meaning it can be used for pooling anything, not just ECS-related data.
- **Lifecycle Boundaries:** The `Pools` registry manages references to the pools, but it does not actively manage their destruction. Deciding _when_ to clear the entire registry or purge specific pools (e.g., during a scene transition) is intentionally left to orchestrators at the `features` or `app` layers.


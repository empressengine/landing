---
sidebar_position: 5
sidebar_label: "prefab-service"
---

# Feature: `widgets/prefab-service`

## What this feature does

The `prefab-service` provides a global Dependency Injection (DI) registry specifically designed for managing and substituting UI templates (Prefabs). It allows developers to bind generic functional View factories (`PrefabFactory`) to strongly-typed `InjectionToken`s, enabling dynamic retrieval and configuration of declarative `View` layouts at runtime.

## Why this feature exists

While developers can create UI elements directly using the `View` builder, hardcoding explicit factory functions tightly couples systems together. For example, a core generic HUD system would be forced to directly import a specific, stylized "HealthBarView" from the game logic.

This feature exists to decouple UI requests from concrete implementations. By requesting a UI element via a token, core systems can remain agnostic to the final visual representation. Furthermore, it allows disparate modules or specific levels to easily override and customize default UI components dynamically by simply rebinding the token in the registry.

## How it works

1. **Definition:** Developers define a strongly-typed `InjectionToken<PrefabFactory<T>>` representing the concept of a specific prefab (e.g., `HEALTH_BAR_PREFAB`).
2. **Registration:** During application bootstrap or module initialization, `prefabService.register(provider)` is called. The provider contains the token and the concrete callback function that mutates a `View`. This mapping is cached in an internal `Map`.
3. **Retrieval:** When a system or another UI component needs to instantiate the prefab, it calls `prefabService.get(token)`.
4. **Execution:** The service strictly fetches and returns the registered `PrefabFactory<T>`, which can then be invoked, passing an active `View` builder and the expected generic properties payload (`props`).

## Interesting design decisions

### 1) Token-Based Registration over String Keys

Instead of using plain string IDs (like "health*bar") to index prefabs, the service relies on the core framework's `InjectionToken<T>`.
\_Result:* This completely eliminates global naming collisions and provides full TypeScript inference. When a developer calls `get(token)`, the compiler immediately knows the exact `Props` signature the resulting factory requires, catching configuration errors at compile time.

### 2) Mutating Factories (Side-effect Signatures)

The `PrefabFactory<T>` signature is defined as `(view: View, props: T) => void`.
_Result:_ Instead of the factory internally allocating and returning a new `View` instance, it accepts an existing `View` instance and mutates it structurally. This aligns perfectly with the fluent builder pattern utilized by the `TreeBuilder`, allowing prefabs to be seamlessly nested and injected inside deeply constructed declarative trees without breaking the builder chain.

### 3) Fail-Fast Resolution Strategy

The `get<T>` method is designed to synchronously throw an `Error` (`Prefab ${token.description} not found`) if a requested token does not exist in the internal registry.
_Result:_ It prevents silent layout failures. If a required UI dependency is missing, the application halts immediately, ensuring that developers catch missing module configurations early rather than rendering incomplete or broken visual hierarchies.

## Public contracts in this feature

- **Classes:**
    - `PrefabService`: The core service managing the token-to-factory registry.
- **Interfaces & Types:**
    - `PrefabFactory<T>`: A type alias defining the callback signature that applies structural logic to a `View`.
    - `IPrefabProvider<T>`: An interface describing the configuration payload for registration, requiring a `provide` token and the concrete `prefab` factory.

## Current scope and boundaries

- **In Scope:** Storing and resolving strongly-typed `View` factory functions mapped to dependency injection tokens.
- **Out of Scope:** Actual instantiation or compilation of PixiJS nodes. The `PrefabService` acts purely as a registry and lookup table; the actual rendering execution is deferred to the `TreeBuilder` and the `features` layer.
- **Out of Scope:** Automatic memory cleanup or object pooling of the rendered outputs. It deals only with the declarative blueprints (factories), not the instantiated ECS entities themselves.


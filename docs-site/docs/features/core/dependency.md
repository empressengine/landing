---
sidebar_position: 2
sidebar_label: "dependency"
---

# Feature: `core/dependency`

## What this feature does

The `dependency` module provides a lightweight, robust Dependency Injection (DI) container for the `empr.es` framework. It allows systems and pipelines to resolve external services (such as time trackers, PRNG, or object pools) dynamically at runtime without relying on hardcoded global singletons. It supports class constructors, direct object instances, and factory functions as providers, along with a hierarchical fallback system.

## Why this feature exists

In a pure ECS architecture, Systems must remain decoupled from specific infrastructure implementations. If a System hardcodes a global `InputManager` or `Timer`, it becomes impossible to mock those dependencies for unit tests or swap them out for different environments (e.g., server vs. browser).

This module solves that by providing a central registry where the application (`bootstrap` layer) can bind interfaces (Tokens) to concrete implementations. Systems simply ask for a Token via their `inject` method, ensuring that logic remains completely isolated and context-agnostic.

## How it works

1. **Initialization:** The application accesses the container via the Singleton accessor `Dependency.instance`, which initializes a `'root'` scope mapping for both providers and cached instances.
2. **Registration:** - Global dependencies are registered via `registerGlobal(provider)`.
    - Module-scoped dependencies (e.g., overrides for a specific pipeline execution) are registered via `register(moduleId, provider)`.
3. **Token Creation (Optional):** For non-class dependencies (like plain interfaces or primitive values), developers create an `InjectionToken<T>` to carry the type signature.
4. **Resolution & Injection:** When `inject(token, moduleId)` is called:
    - The container checks if a cached instance exists in the specified `moduleId`, falling back to `'root'`.
    - If no instance is cached, it retrieves the appropriate provider.
    - It instantiates the dependency lazily (by calling `new useClass()`, returning the `useClass` object directly, or executing `useFactory()`).
    - The new instance is cached and returned.

## Interesting design decisions

### 1) Two-Tier Fallback Architecture (Scope Overrides)

The container separates the registry into a global `'root'` scope and arbitrary `moduleId` scopes.
_Result:_ This allows a specific feature or Pipeline to completely override a core service (like injecting a mocked Timer for a specific test pipeline) without polluting the global state or affecting other concurrently running systems.

### 2) Type-Safe `InjectionToken<T>`

Since TypeScript interfaces do not exist at runtime, they cannot be used as map keys. Instead of relying on fragile string keys, the framework introduces `InjectionToken<T>`.
_Result:_ The generic `<T>` ensures that when a System calls `inject(MY_TOKEN)`, TypeScript automatically infers the correct return type without requiring manual type casting by the developer.

### 3) Lazy Instantiation

Dependencies are not instantiated when they are registered. They are constructed only during the very first time `inject()` is called for that specific token.
_Result:_ This dramatically reduces application startup time and prevents unnecessary memory allocation for services that might not be used in a given execution context.

### 4) Zero Decorators or Reflection

Unlike many DI frameworks (e.g., NestJS, Inversify) that require `@Injectable()` decorators and the `reflect-metadata` package, this implementation relies on explicit provider registration and pure dictionary lookups.
_Result:_ It keeps the `core` layer completely devoid of external library dependencies, avoids the performance overhead of reflection, and ensures the framework remains lightweight and fast.

## Public contracts in this feature

- **Interfaces & Types:**
    - `IDependency` — The main contract for the DI container.
    - `Provider<T>` — Union type of class and factory providers.
    - `IClassProvider<T>`, `IFactoryProvider<T>` — Configuration objects for registration.
    - `Token<T>`, `Constructor<T>`, `Factory<T>` — Core utility types.
- **Classes:**
    - `Dependency` — The DI container implementation.
    - `InjectionToken<T>` — The typed identification token for non-class injectables.

## Current scope and boundaries

- **Graph Resolution Boundaries:** This container does **not** auto-resolve constructor dependency graphs (e.g., if Service A requires Service B in its constructor, the framework does not magically inject it). It expects dependencies to be resolved manually within a factory function if complex nesting is required.
- **Immutability:** The `immutable` flag on providers is present in the type contract but is intentionally reserved for future framework features and is not actively enforced in the current `core` logic.
- **Layer Limits:** It is conceptually agnostic to ECS. It does not know what a System or Entity is; it merely acts as a high-performance typed map.


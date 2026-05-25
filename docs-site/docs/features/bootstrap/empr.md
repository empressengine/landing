---
sidebar_position: 1
sidebar_label: "empr"
---

# Feature: `bootstrap/empr`

## What this feature does

The `bootstrap` module, centered around the `Empr` class, serves as the primary entry point and orchestration layer of the framework. It is responsible for the synchronous wiring of all core services (ECS engine, state management, utilities) and their registration within the global Dependency Injection (DI) container. It exposes a minimal two-step lifecycle API: `init()` for service configuration and `start(ticker)` for activating the main execution loop.

## Why this feature exists

Without a centralized bootstrap, the framework would require users to manually instantiate and connect dozens of decoupled services (e.g., registering `ProxyEntity` for `EntityStorage` or remembering to wire an `ExecutionRegistry` into `FSMService` / `SignalService`).

This feature exists to:

1. **Enforce Architectural Boundaries:** It ensures that lower layers remain decoupled while providing a single integration point at the top.
2. **Guarantee Renderer Agnosticism:** By remaining pure and using external tickers, it allows the same core logic to run in any environment (Browser, Node.js) or with any rendering engine (PixiJS, Three.js) via subclassing.
3. **Simplify Application Setup:** It provides a "ready-to-run" ECS environment with essential cross-layer connections pre-configured; pipeline execution is layered on via `@empr/es-sistema` / `@empr/es-componente`.

## How it works

1. **Initialization (`init`):** The consumer calls `empr.init()`, which executes the `registerServices()` method.
2. **Service Wiring:** Inside `registerServices()`, the framework instantiates foundational services such as `LifecycleTracker`, `EntityStorage`, `SignalService`, and `UpdateLoop`.
3. **Execution stack (app responsibility):** Applications call `useECSBackend` / `useCDBackend` after `init()` to register an `ExecutionRegistry`, connect pause/resume to the active executor, and re-bind `SignalService` / `FSMService`.
4. **DI Registration:** Every instantiated service is registered in the global `Dependency.instance` container using either `registerGlobal` with factories (to preserve singletons) or direct class registrations.
5. **Activation (`start`):** The consumer provides a platform-specific `IUpdateTicker` (e.g., one based on `requestAnimationFrame` for browsers or a fixed interval for servers). The `Empr` class resolves the `UpdateLoop` from the DI container and starts it using this ticker.

## Interesting design decisions

### 1) Protected Service Registration

The `registerServices()` method is marked as `protected`.
_Result:_ This is the primary extension point. Developers can create a subclass (e.g., `EmprPixi`), override this method to add rendering-specific services, and call `super.registerServices()` to maintain the core ECS infrastructure without code duplication.

### 2) Externalized Ticker Injection

The `start()` method requires an `IUpdateTicker` implementation instead of hardcoding a `setInterval` or `requestAnimationFrame`.
_Result:_ This preserves the framework's isomorphism. The core remains platform-agnostic, while the application layer provides the specific timing strategy suitable for the target runtime environment (e.g., a high-precision timer for a server-side simulation).

### 3) Execution stack stays outside `Empr`

Pipeline runners intentionally **do not** live in `registerServices()`. Satellite packages wire `UpdateLoop` pause/resume to their executor and register `ExecutionRegistry` implementations.

_Result:_ `@empr/es` stays free of `@empr/es-sistema` imports while apps pick ECS vs component-driven execution at compose time.

### 4) DI-Centric Singleton Access

The class exposes the DI container via a public `dependency` getter.
_Result:_ This allows the application to resolve any framework service at any time without needing to store local references, facilitating a clean "service locator" pattern for the entire application lifecycle.

## Public contracts in this feature

- **Classes:** `Empr`.
- **Methods:** - `init()`: Bootstraps the service graph.
    - `start(ticker: IUpdateTicker)`: Ignites the engine.
    - `dependency`: Getter for the global DI container.
- **Overridable Members:** `registerServices()`.

## Current scope and boundaries

- **Logic Boundaries:** `Empr` is strictly for service wiring and lifecycle management. It does not contain game logic, physics, or rendering code.
- **Dependency Boundaries:** It is the only layer allowed to import from all layers below it (shared, core, widgets, features), but it is strictly forbidden from being imported by any of them.
- **State Boundaries:** It does not hold application state; state management is delegated to the `Store` and `FSM` services it registers.


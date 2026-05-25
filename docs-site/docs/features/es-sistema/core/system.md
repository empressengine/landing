---
sidebar_position: 1
sidebar_label: "system"
---

# Feature: `core/system`

## What this feature does

The `system` module defines the type contracts for Systems within the `empr.es` ECS architecture. It specifies that a System is a plain TypeScript function (synchronous or asynchronous) that encapsulates behavioral logic. The module provides the `System<T>`, `SystemProps<T>`, and `ISystemOptions` types, which dictate exactly how a system interacts with the framework—specifically, how it queries entities (`filter`), resolves dependencies (`inject`), and handles execution context data.

## Why this feature exists

In a strict Entity-Component-System paradigm, behavior must be completely separated from data. While Components hold state and Entities group those Components, Systems are responsible for the actual game logic and state mutations.

This feature exists to provide a unified, boilerplate-free, and highly testable contract for writing that logic. By defining a System's dependencies and query tools as injected arguments (`SystemProps`) rather than relying on global singletons, the framework guarantees that logic blocks remain isolated, composable, and context-agnostic.

## How it works

1. **Definition:** A developer defines a System as a standard function conforming to the `System<T>` type.
2. **Context Injection:** When the system is executed (typically by an `Executor` running a `Pipeline` from higher layers), it is passed a `SystemProps` object.
3. **Dependency Resolution:** Inside the function, the system can call `inject(Token)` to retrieve singleton or pipeline-scoped services (like a Timer, PRNG, or external API) from the Dependency Injection container.
4. **Entity Querying:** The system calls `filter({ includes: [...], excludes: [...] })` to request specific entities. This returns an `IFiltered` object containing only the entities that match the criteria.
5. **Iteration & Mutation:** The system iterates over the `IFiltered` result (using `.forEach()` for sync execution, or `.sequential()` / `.parallel()` for async operations) and mutates the data inside the entities' components.
6. **Graceful Halts:** If the pipeline execution is interrupted, the system can register cleanup logic via the injected `onStop(callback)` method.

## Interesting design decisions

### 1) Systems as Plain Functions, Not Classes

Unlike many traditional game engines that force Systems to be classes extending a base `System` class (with `init()`, `update()`, and `destroy()` methods), `empr.es` defines a System as a pure function.
_Result:_ This completely eliminates `this` binding issues, reduces memory overhead, and encourages functional programming patterns. Lifecycle hooks (like `onStop`) are provided functionally through the execution context.

### 2) Context-Isolated Execution (`SystemProps`)

Systems do not import a global `World` or `EntityStorage` to query entities, nor do they directly import a global DI container. Instead, `filter` and `inject` are passed into the function.
_Result:_ Excellent testability and modularity. You can easily unit-test a System by calling the function and passing mocked `filter` and `inject` properties without needing to bootstrap the entire framework engine.

### 3) Extensible Generic Data (`SystemProps<T>`)

The `SystemProps<T>` type merges the framework's `ISystemOptions` with an external generic type `T`.
_Result:_ Pipelines can seamlessly pass dynamic, per-frame context (e.g., `{ deltaTime: number, inputState: Input }`) directly into the System's argument payload without relying on global state or complex DI overrides.

### 4) First-Class Asynchronous Support

The `System` signature explicitly allows returning a `Promise<void>`. Combined with the `IFiltered` interface's `.sequential()` and `.parallel()` methods.
_Result:_ Developers can effortlessly write Systems that perform asynchronous operations (like network requests, loading assets, or awaiting animations) while the executor handles the concurrency and awaits their completion natively.

## Public contracts in this feature

- `System<T>` (Type) — The function signature representing a game logic block.
- `SystemProps<T>` (Type) — The complete payload passed to the System, combining framework tools and custom data.
- `ISystemOptions` (Interface) — The framework-provided toolkit (`inject`, `filter`, `onStop`, `executionId`).

## Current scope and boundaries

- **Logic Boundaries:** This module defines **only the type contracts** for Systems. It does **not** contain any runtime implementation for actually scheduling, orchestrating, or executing these functions.
- **Layer Architecture Boundaries:** The responsibility of composing Systems together and running them belongs to `PipelineComposer` and `Executor`, which reside in the higher `features` (or `modules`) layer. The `core` layer strictly defines _what_ a System is, not _when_ or _how_ it runs.
- **Domain Boundaries:** There is absolutely no game-specific logic here. It is a pure structural definition.


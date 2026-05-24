---
sidebar_position: 2
sidebar_label: "signal-service"
---

# Feature: `features/signal-service`

## What this feature does

The `signal-service` module exposes `SignalService`, a small mediator that maps **`ISignal` instances → execution flows** resolved through an `ExecutionRegistry<T>`. When a bound signal is dispatched, the service `await`s `registry.create(...)` and `registry.run(...)` so async listeners and upstream dispatchers observe the full pipeline completion.

The concrete flow type (`SSFlowAliasType`) is **not hard-coded**: applications augment `ESCoreTypeRegistry` so ECS builds use `PipelineFactory` from `@empr/es-sistema`, while component-driven builds use `OrchestratorType` from `@empr/es-componente` (see reference typings under `apps/slot-client` and `apps/slot-cd-client`).

## Why this feature exists

Many subsystems (network, UI, timers) already speak the `Signal` language. Re-implementing ad-hoc bridges to whichever executor you run would duplicate lifecycle and async-completion rules. `SignalService` centralizes the pattern and enforces a **1-to-1** mapping per signal instance for predictable debugging.

## How it works

1. **Construction:** `Empr` registers `SignalService` in DI during `init()`, injecting `LifecycleTracker` for owner-aware lifecycle binding.
2. **Registry injection:** After the app wires an execution stack (`useECSBackend` / `useCDBackend`), it calls `signalService.setExecutionRegistry(registry)` with the same object passed to `FSMService` and (for Pixi) `InteractionService`.
3. **Binding:** `listen(signal, factory, owner?)` stores the flow factory, subscribes to `signal`, and on dispatch awaits `create` + `run` on the registry. When `owner` is provided, the listener is tracked via `LifecycleTracker` and auto-disposed on owner destruction.
4. **Re-binding / cleanup:** Listening again on the same signal replaces the previous subscription (including owner tracking); `dispose(signal)` and `unsubscribe()` tear everything down and untrack owner bindings.

## Interesting design decisions

### 1) ExecutionRegistry instead of Executor

The service depends only on `ExecutionRegistry<SSFlowAliasType>`, not on `@empr/es-sistema`'s `Executor` class.

_Result:_ `SignalService` stays in `@empr/es` while execution strategies remain swappable satellite packages.

### 2) One factory per signal instance

Calling `listen` twice on the same `ISignal` disposes the prior listener before attaching the new factory.

_Result:_ No accidental duplicate pipelines for the same channel; debugging maps cleanly from signal → single factory.

### 3) Async-friendly dispatch

`signal.listen` already supports async callbacks; the service always awaits `run`.

_Result:_ `await signal.dispatch(...)` can represent end-to-end pipeline completion — useful for tests and coordination code.

### 4) Owner-aware lifecycle binding

`listen(signal, factory, owner?)` accepts an optional `owner` object. When provided, the listener `Disposable` is registered with `LifecycleTracker.track(owner, disposable)`. When the owner is destroyed (entity destruction, context dispose, or GC), the listener is automatically disposed — no manual `dispose(signal)` required. Works with **any** `ISignal` implementation, not only `TrackedSignal`.

_Result:_ Signal subscriptions in pipelines and orchestrators are automatically cleaned up with their owning context, preventing dangling subscriptions in dynamic ECS/CD scenarios.

## Public contracts in this feature

- **Classes:** `SignalService`, `AbstractSignalService`.
- **Types:** `SSFlowAliasType`, `ESCoreTypeRegistry` (augmented by apps).
- **Imports:** `ExecutionRegistry` from `@empr/es` `core`, `LifecycleTracker` from `@empr/es` `widgets/lifecycle`.

## Current scope and boundaries

- **In scope:** Bridging `ISignal<T>` dispatch to registry-backed flows; lifecycle of those subscriptions.
- **Out of scope:** Defining `PipelineFactory` / orchestrators (satellite packages); Pixi input (see `@empr/es-lienzo` `InteractionService`).
- **Typing:** Apps **must** augment `ESCoreTypeRegistry` or `SSFlowAliasType` resolves to `never` and TypeScript will reject factories.


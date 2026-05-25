---
sidebar_position: 4
sidebar_label: "signal"
---

# Feature: `shared/signal`

## What this feature does

The `signal` module provides a typed, GC-friendly publish-subscribe primitive for communication between different parts of the application. It supports both synchronous and asynchronous listeners, allowing components to emit typed payloads (`data: T`) to multiple subscribers. Furthermore, it integrates with `shared/utils` to provide unique numeric identifiers (`uuid` via `nextId`) and deferred execution (`dispatchNextFrame` via `waitNextFrame`).

## Why this feature exists

Standard JavaScript `EventEmitter` implementations or DOM `EventTarget`s operate primarily on a "fire and forget" basis, making it difficult to orchestrate asynchronous workflows where the dispatcher must wait for all subscribers to finish their tasks (e.g., waiting for multiple systems to asynchronously save state before proceeding).

This feature exists to provide a robust, game-loop-safe event bus that guarantees the completion of all asynchronous operations before the dispatch promise resolves, while also preventing a single crashing listener from halting the entire application.

## How it works

1. **Instantiation:** A developer creates a `new Signal<T>('OptionalName')`. During instantiation, it assigns itself a unique numeric `uuid` by calling the stateless `nextId()` utility.
2. **Subscription:** Consumers register callbacks via `listen(callback)` or `once(callback)`. These methods push the callback into an internal `_listeners` array and return a `Disposable` object for easy unsubscription.
3. **Dispatching:** When `dispatch(data)` is invoked, it iterates through the `_listeners` array.
    - If a listener was registered with `once`, it is immediately removed from the array (adjusting the loop index safely via `i--`).
    - The callback is executed within a `try/catch` block.
    - If the callback returns a `Promise`, a `catch` handler is attached to it, and it is pushed into a temporary `promises` array.
4. **Synchronization:** If any asynchronous listeners were detected, the dispatcher awaits `Promise.all(promises)` before finishing.
5. **Deferred Dispatching:** If `dispatchNextFrame(data)` is used, the signal first awaits the `waitNextFrame()` utility (which wraps `requestAnimationFrame`) before executing the standard dispatch flow.

## Interesting design decisions

### 1) GC-Friendly Promise Allocation

During dispatch, the `promises` array is strictly initialized as `undefined` (`let promises: Promise<void>[] | undefined;`). It is only instantiated (`promises = []`) if a listener _actually_ returns a `Promise`.
_Result:_ This completely eliminates temporary array allocations for purely synchronous dispatches, drastically reducing Garbage Collection pressure in high-frequency, frame-by-frame game loops.

### 2) Safe Forward Iteration for `once`

When handling one-time listeners, the signal uses `this._listeners.splice(i, 1)` followed immediately by `i--`.
_Result:_ This index correction ensures that elements are not skipped when the array mutates during forward iteration, maintaining predictable execution order without requiring a secondary array clone.

### 3) Deep Error Isolation

Both synchronous exceptions and asynchronous promise rejections are caught individually per listener (`catch (e) { console.error(e) }` and `result.catch((e) => console.error(e))`).
_Result:_ If one subscriber contains a bug that throws an error, it is logged, but it will absolutely not interrupt the dispatch loop. The remaining listeners will still receive the payload, ensuring overall application stability.

### 4) Acceptable Cross-Module Coupling

While cross-module imports within `shared` are generally discouraged, `signal.ts` explicitly imports `nextId` and `waitNextFrame`.
_Result:_ Because these utilities are pure, stateless, and side-effect-free, this coupling carries no risk of circular dependencies or hidden state, keeping the `shared` layer robust.

## Public contracts in this feature

- **Interfaces:** `ISignal<T>`, `Disposable`.
- **Classes:** `Signal<T>`.

## Current scope and boundaries

- **ECS Agnosticism:** The `Signal` class is pure infrastructure and contains zero knowledge of `Entity`, `Component`, or `System` concepts.
- **Layer Limits:** It is designed to be usable across the entire project (including `core`, `widgets`, and `features`) but explicitly forbids importing from any of those higher layers.


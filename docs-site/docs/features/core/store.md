---
sidebar_position: 5
sidebar_label: "store"
---

# Feature: `core/store`

## What this feature does

The `store` module is a general-purpose, type-safe reactive state container for the `empr.es` framework. It provides a centralized way to manage application-level state (such as UI state, scores, or FSM contexts) with robust safeguards like validation, middleware, and transactional rollbacks.

Beyond basic state holding, the module offers a rich ecosystem of derived state utilities:

- Synchronous lazy evaluation via `computed`.
- Advanced asynchronous data fetching with abort, timeout, and retry capabilities via `createAsyncComputed`.
- Performant data extraction via memoized, composite, and auto-subscribing selectors.
- Bidirectional state synchronization across multiple stores via `storeMixer`.

## Why this feature exists

While the Entity-Component-System (ECS) pattern is exceptional for managing highly dynamic, per-entity game data, it is not well-suited for global application state (like the current active menu, global settings, or network loading statuses).

Without a dedicated reactive store, developers often resort to global singleton objects, which lack reactivity, or shoehorn application state into "Singleton Entities," which creates unnecessary overhead. This feature exists to provide a clean, reactive, and highly optimized alternative for non-ECS data, preventing cascade updates and ensuring UI or FSM bindings remain perfectly synchronized with the game loop.

## How it works

1. **Instantiation:** A developer creates a `Store<T>` with an initial state object and optionally registers `validators` (to reject bad data) and `middleware` (to intercept and transform updates).
2. **Mutation:** State is mutated using `store.update(callback)` or `store.transaction(transaction)`. Direct mutation of `store.state` is blocked by a read-only Proxy that intercepts `set` operations and logs a warning.
3. **Validation & Interception:** During an update, the new partial state is verified against all registered validators. If it passes, it flows through the middleware chain, allowing side-effects or transformations before finalizing the state.
4. **Batched Notification:** Listeners are not notified immediately upon mutation. Instead, the store adds itself to a `_pendingNotifications` Set and schedules a microtask via `queueMicrotask`. Once the microtask executes, all listeners are notified with the final state, effectively batching multiple synchronous updates into a single notification.
5. **Derivation:** Consumers can observe the store using:
    - `createSelector` / `createMemoizedSelector` for derived data extraction.
    - `computed` for lazily evaluated, cached values that auto-dispose on window unload.
    - `createAsyncComputed` to handle network requests tied to state changes, completely managing race conditions and cancellations using `AbortController`.

## Interesting design decisions

### 1) Microtask Update Batching

Instead of dispatching notifications synchronously inside `store.update()`, the store schedules notifications using `queueMicrotask` and a `_pendingNotifications` Set.
_Result:_ If a System updates the store 50 times in a single frame, the subscribers (like React components or FSM listeners) are only notified _once_ at the end of the execution stack. This eliminates cascade rendering and massive performance bottlenecks.

### 2) Bidirectional Two-Way Mixing (`storeMixer`)

The `storeMixer` creates a proxy-like `MixedStore` that combines the state of multiple source stores. If the mixed store is updated, the exact delta is extracted and routed back to the appropriate source store. If a source store is updated, it updates the mixed store.
_Result:_ To prevent infinite update loops during this two-way synchronization, the mixer temporarily hijacks the `update` method of the source stores, ensuring data flows correctly without triggering cyclic call stacks.

### 3) Deep Read-Only Proxy Guard

Accessing `store.state` returns a `Proxy` that intercepts property access. If a property is an object, it wraps it in another `Proxy`. If a developer tries to mutate it directly (`store.state.score = 10`), the Proxy blocks the `set` operation and issues a console warning.
_Result:_ It strictly enforces the unidirectional data flow pattern (updates must go through `.update()`), ensuring that validators, middleware, and listeners are never bypassed.

### 4) Built-in Async Computed with Abort Semantics

Unlike many state management libraries that rely on external tools (like React Query or RxJS) for async derivations, `store` includes `createAsyncComputed`. It automatically injects an `AbortSignal` into the getter.
_Result:_ If the store state changes while a previous network request is still pending, the previous request is automatically aborted, preventing race conditions where outdated data overwrites fresh data. It also includes exponential backoff retries and timeouts out-of-the-box.

## Public contracts in this feature

- **Interfaces & Types:** `IStore`, `IStoreOptions`, `ITransaction`, `Middleware`, `Validator`, `IComputedRef`, `IAsyncComputedRef`, `IAsyncComputedOptions`, `Selector`, `IMemoizedSelector`.
- **Classes:** `Store`.
- **Functions:** - `createStore`, `mixStores`
    - `storeMixer`
    - `computed`
    - `createAsyncComputed`, `createAsyncComputedMultiple`
    - `createSelector`, `createMemoizedSelector`, `createStoreSelector`, `createCompositeSelector`.

## Current scope and boundaries

- **ECS Agnosticism:** The `store` module is explicitly designed with zero ECS dependencies. It does not know what an `Entity`, `Component`, or `System` is, making it universally applicable across the framework.
- **Reactivity Model:** It does not use deep reactive property tracking (like Vue 3's `reactive`). Reactivity is explicit via `.update()` or `.transaction()`, requiring developers to return partial state objects to trigger changes.
- **Domain Boundaries:** It only handles the state holding and notification mechanisms. High-level orchestrations utilizing the store (like the FSM transitions) are deferred to the `features` layer.


---
sidebar_position: 1
sidebar_label: "deferred-promise"
---

# Feature: `shared/deferred-promise`

## What this feature does

The `deferred-promise` module provides a utility class for creating a Promise that can be controlled (resolved or rejected) from outside its executor function. It separates the creation of a Promise from the logic that settles it. The module also includes static utility methods to handle arrays of `DeferredPromise` instances, allowing developers to wait for or settle multiple deferred operations simultaneously.

## Why this feature exists

Native JavaScript Promises require the `resolve` and `reject` callbacks to be executed strictly within the scope of the constructor's executor function (`new Promise((resolve, reject) => {...})`). This architectural limitation creates friction when asynchronous events need to be coordinated across different module boundaries without introducing deep callback nesting.

For example, within the `core/update-loop` module, the framework needs a way to pause the execution and allow asynchronous systems to safely await the loop's resumption without active polling. `DeferredPromise` solves this by allowing one module to hold and await the promise, while an entirely different module (like the update loop controller) holds the `resolve` function to trigger the resumption later.

## How it works

1. **Instantiation:** A developer creates a new instance via `new DeferredPromise<T>()`.
2. **Extraction:** Inside the constructor, a native `Promise` is instantiated. The native `resolve` and `reject` callbacks provided by the Promise executor are immediately extracted and stored in private properties (`_resolve`, `_reject`).
3. **Consumption:** External systems can subscribe to the resolution by accessing the `.promise` getter and using `.then()` or `await`.
4. **External Settlement:** At any point in the future, the owner of the `DeferredPromise` instance can call the exposed `.resolve(value)` or `.reject(reason)` getters to settle the underlying native promise.

## Interesting design decisions

### 1) Read-Only Getters for Immutability

The `promise`, `resolve`, and `reject` properties are exposed as public getters rather than direct properties.
_Result:_ This prevents external consumers from accidentally overriding the native resolution functions or swapping out the underlying promise instance, ensuring the structural integrity of the deferred object.

### 2) Built-in Array Helpers for Broadcast Resolutions

The class implements static helper methods like `resolveAll` and `rejectAll` that accept an array of `DeferredPromise` instances.
_Result:_ This provides a clean, boilerplate-free API for bulk-settling multiple deferred operations with the same payload (e.g., broadcasting a "resume" signal to dozens of suspended async systems simultaneously).

### 3) Native Promise Delegation

Static methods for concurrency control (`all`, `allSettled`, `race`) map the provided `DeferredPromise` instances back to their internal `.promise` properties and defer directly to the native `Promise` API.
_Result:_ The framework avoids reinventing the wheel for concurrent resolution logic, guaranteeing standard JavaScript engine behavior and V8 optimizations under the hood.

### 4) Strict Layer Isolation

The implementation consists of pure TypeScript and has absolutely no import dependencies—neither from `shared` nor from any ECS-related layer.
_Result:_ It perfectly adheres to the `shared` layer responsibility of being a primitive, framework-agnostic data structure.

## Public contracts in this feature

- **Classes:** `DeferredPromise<T>`.
- **Instance Members:** - `.promise` — The underlying native Promise.
    - `.resolve(value)` — Method to fulfill the promise.
    - `.reject(reason)` — Method to reject the promise.
- **Static Utilities:** `resolveAll`, `rejectAll`, `all`, `allSettled`, `race`.

## Current scope and boundaries

- **Functional Boundaries:** This module strictly wraps native Promise functionality for inversion of control. It does not introduce custom asynchronous runtimes, task scheduling algorithms, or complex cancellation tokens.
- **Domain Boundaries:** It contains absolutely no knowledge of ECS concepts (entities, components, systems) or game-domain logic.


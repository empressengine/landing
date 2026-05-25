---
sidebar_position: 5
sidebar_label: "utils"
---

# Feature: `shared/utils`

## What this feature does

The `utils` module provides a collection of pure, stateless, and framework-agnostic helper functions for the `empr.es` framework. Currently, it includes:

- `nextId()`: A generator for monotonically increasing unique numeric identifiers.
- `debounce()`: A standard function execution delayer.
- `waitNextFrame()`: A promisified wrapper around the environment's animation frame tick.
- `clamp()`: A numeric range clamping function.

## Why this feature exists

Throughout a high-performance framework, certain low-level primitive operations are needed repeatedly in critical hot paths (such as assigning unique identifiers to newly spawned Entities/Signals, or yielding execution to the next frame to avoid blocking the main thread).

By centralizing these functions in a completely dependency-free module at the very bottom of the architecture, the framework ensures that these helpers can be safely consumed by other foundational modules (like `shared/signal`) without duplicating code or creating circular import loops.

## How it works

1. **`nextId`:** Maintains a private module-level integer (`let id = 0`). Every time it is called, it increments and returns the value (`++id`), guaranteeing a unique sequence.
2. **`waitNextFrame`:** Instantiates and returns a native `Promise` that resolves its execution inside a `requestAnimationFrame` callback.
3. **`debounce`:** Wraps a provided callback inside a closure that holds a `timer` reference. On each invocation, it clears the previous timer using `clearTimeout` and sets a new `setTimeout`, ensuring the callback only fires once after the specified delay has passed.
4. **`clamp`:** Composes `Math.max` and `Math.min` to constrain a value within a `[min, max]` range in a single expression with zero branching.

## Interesting design decisions

### 1) GC-Free Numeric IDs over UUIDs

Instead of using standard string-based UUID v4 generation, `nextId` generates primitive numbers.
_Result:_ This completely eliminates string and object allocation overhead in critical hot paths (like mass Entity spawning or Signal creation), significantly reducing Garbage Collection pressure in high-frequency game loops.

### 2) Promisified Request Animation Frame

The `waitNextFrame` utility bridges the traditional callback-based `requestAnimationFrame` API with modern Promise semantics.
_Result:_ It allows developers and framework internals (like `Signal.dispatchNextFrame`) to use clean `async/await` syntax to defer logic to the next visual frame without resorting to deeply nested callbacks.

### 3) Pure Math Primitives

`clamp` delegates entirely to native `Math.max`/`Math.min`, avoiding any conditional branching. This makes it fully inlineable by modern JS engines and safe for hot-path use (e.g., clamping `devicePixelRatio`, health bars, or animation progress).

### 4) Absolute Isolation

The utility files contain absolutely zero imports.
_Result:_ This strict isolation adheres perfectly to the `shared` layer's rules. It ensures these functions are pure infrastructure, meaning they can be imported literally anywhere in the framework (even within other `shared` modules) with zero risk of circular dependencies.

## Public contracts in this feature

- **Functions:**
    - `nextId(): number`.
    - `waitNextFrame(): Promise<void>`.
    - `debounce(callback: Callback, delay?: number): Callback`.
    - `clamp(value: number, min: number, max: number): number`.

## Current scope and boundaries

- **Domain Boundaries:** Strictly limited to pure, stateless functions. They carry no knowledge of ECS concepts (Entities, Components, Systems) or game logic.
- **Environment Boundaries:** `waitNextFrame` implicitly relies on the existence of `requestAnimationFrame`. In Node.js server environments, this requires a polyfill at the application bootstrap layer to maintain isomorphism, as the `shared` layer itself does not dictate platform specifics.


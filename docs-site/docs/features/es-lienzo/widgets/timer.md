---
sidebar_position: 7
sidebar_label: "timer"
---

# Feature: `widgets/timer`

## What this feature does

The `timer` feature (centered around the `TimerService`) provides game-loop synchronized time management utilities, serving as deterministic replacements for standard browser `setTimeout` and `setInterval`. It ensures that delayed executions, periodic intervals, and async `sleep` operations are strictly driven by the framework's `deltaTime` ticks.

## Why this feature exists

Relying on native `setTimeout` or `setInterval` in game development breaks determinism. Native browser timers rely on the system clock and background throttling, meaning they can fire unpredictably when tabs are inactive, causing desynchronization with the game state.

This feature exists to guarantee that all delayed logic respects game pauses, slow motion, and frame rates seamlessly. Furthermore, it integrates tightly with the ECS `LifecycleTracker` to automatically clear pending callbacks when their associated entities are destroyed, preventing notorious memory leaks and "ghost" executions.

## How it works

1. **Registration:** Developers call `setTimeout`, `setInterval`, or `sleep` on the `TimerService`, providing a duration and an optional `owner` (like an entity).
2. **Encapsulation:** The service instantiates a `Timer` or `Interval` object with a unique internal ID and stores it in an active `Map` registry. If an `owner` is provided, a disposal callback is registered with the `LifecycleTracker`.
3. **Execution Loop:** Every frame, the main `UpdateLoop` invokes `timerService.update(deltaTime)`.
4. **Accumulation:** The service iterates over an array snapshot of active timers, passing the `deltaTime`. Each internal object converts this delta to milliseconds and accumulates it.
5. **Resolution:** Once the accumulated time surpasses the configured `_duration`, the associated callback fires. `Timer`s then clear themselves automatically, while `Interval`s subtract the duration to persist into the next cycle.

## Interesting design decisions

### 1) Leftover Delta Preservation in Intervals

Instead of resetting `_elapsedTime` to 0 after an interval triggers, the `Interval` class subtracts the `_duration` from it.
_Result:_ This preserves any fractional leftover frame time across loops, preventing micro-desynchronizations and ensuring strict accuracy over thousands of ticks.

### 2) Allocation-Free Loop Snapshotting

The `TimerService.update` method explicitly reuses a pre-allocated array (`_updatablesSnapshot`) by setting its `length = 0` before populating it for the current frame.
_Result:_ It prevents dynamic memory allocations (`new Array`, `Array.from`) within the critical 60FPS execution path, completely eliminating Garbage Collection (GC) overhead.

### 3) Awaitable ECS Sleep Operations

The service provides a `sleep(duration)` method returning an `ISleep` Promise wrapper, which is utilized by the included `sleepSystem`.
_Result:_ It allows developers to write declarative, sequential `async/await` logic directly inside ECS Pipelines (e.g., delaying an animation phase) without leaving the deterministic orchestration or relying on external promises.

### 4) Automatic Lifecycle Binding

By passing an optional `owner` to the timer creation methods, the service ties the timeout to the `LifecycleTracker`.
_Result:_ "Fire-and-forget" safety. If an enemy entity is destroyed before its 3-second attack delay finishes, the tracker automatically untracks and clears the timer, requiring zero manual cleanup code.

## Public contracts in this feature

- **Classes:**
    - `TimerService`: The primary controller orchestrating delays and intervals.
    - `Timer`: Represents a discrete, single-execution delay.
    - `Interval`: Represents a recurring, frame-synchronized looping delay.
- **Interfaces & Types:**
    - `IUpdatable`: The base contract enforcing the `update(deltaTime)` step handler.
    - `ISleep`: Awaitable structure exposing `wait()` and early `resolve()` controls.
- **Systems:**
    - `sleepSystem`: An ECS Pipeline wrapper that pauses sequence execution for a specified duration.

## Current scope and boundaries

- **In Scope:** Creating deterministic single-fire delays, continuous periodic intervals, and awaitable pipeline pauses driven entirely by ECS frame ticks. Binding timer lifecycles to ECS objects for memory safety.
- **Out of Scope:** Real-world system time tracking. These timers are strictly bound to the simulation. If the game pauses (delta becomes 0), the timers perfectly freeze. They know nothing about real elapsed wall-clock time.
- **Out of Scope:** Actually executing ECS game logic. The service is merely a scheduler that fires generic callbacks `() => void`; what happens inside those callbacks is up to the caller.


---
sidebar_position: 6
sidebar_label: "update-loop"
---

# Feature: `core/update-loop`

## What this feature does

`update-loop` is the framework timing core. It normalizes external ticks into a stable runtime time model and broadcasts frame timing data to the rest of the engine.

It is responsible for:
- accepting ticks from an external `IUpdateTicker` via `start(ticker)`,
- converting `deltaMs` to seconds,
- clamping abnormal deltas with a hard cap (`MAX_DELTA_TIME`),
- computing `fps`,
- applying `speedMultiplier`,
- accumulating deterministic `gameTime`,
- dispatching `OnUpdateSignal` with `IUpdateLoopData`.

## Why this feature exists

Game/runtime systems need a single source of truth for time. Without it:
- frame spikes can break simulation and produce physics jumps,
- pause/resume semantics become inconsistent across modules,
- timers and async systems cannot reliably synchronize with game-time,
- browser/server runtimes drift in behavior.

`update-loop` solves this by centralizing time policy in one place and exposing a small, explicit API.

## How it works

1. **Startup**
   - App injects a ticker strategy into `UpdateLoop.start(ticker)`.
   - Ticker becomes the external producer of `IUpdateTick`.

2. **Tick intake**
   - `UpdateLoop` receives `deltaMs` from ticker callback.
   - Converts to seconds and runs normalization (`finite`, non-negative, hard cap).

3. **Time state update**
   - Computes `fps` from normalized delta.
   - Computes `multipliedDelta = deltaTime * speedMultiplier`.
   - Increments `gameTime` by `multipliedDelta`.

4. **Fan-out**
   - Calls registered `onUpdate` listeners.
   - Dispatches global `OnUpdateSignal`.

5. **Lifecycle**
   - `pause()` blocks time progression and creates a new `waitResume`.
   - `resume()` unblocks and resolves `waitResume`.
   - `stop()` detaches ticker, resets paused state, resolves pending `waitResume`.

## Interesting design decisions

### 1) External ticker contract (`IUpdateTicker`)

`UpdateLoop` no longer owns platform scheduling. Browser RAF, server event loop, manual driver, or test driver are all plugged in through the same interface.

Result:
- core remains platform-agnostic,
- runtime strategy is selected by the application layer,
- testing becomes deterministic (mock ticker controls exact deltas).

### 2) Hard-cap delta policy

Large frame gaps are clamped before simulation update. This prevents "catch-up explosions" after tab switches or long stalls.

Result:
- predictable per-frame workload,
- safer physics/timer behavior,
- reduced risk of cascading frame instability.

### 3) Adapter-level lifecycle safety

Ticker restart safety is handled at adapter level (outside core) so each environment implementation
can apply its own scheduling guarantees without leaking platform details into `UpdateLoop`.

Result:
- lifecycle risks are isolated in adapter packages,
- core keeps a stable, environment-neutral contract.

### 4) Pause synchronization primitive

`waitResume` gives async consumers a synchronization point for pause-aware logic.

Result:
- async systems can pause without polling,
- resume boundary is explicit and testable.

## Public contracts in this feature

- `IUpdateLoop`
- `IUpdateLoopData`
- `IUpdateTicker`
- `IUpdateTick`
- `UpdateLoop`
- `OnUpdateSignal`

## Current scope and boundaries

- This module does not implement game-domain logic.
- It does not depend on other `core` modules.
- It depends on `@shared/signal` and `@shared/deferred-promise`.
- Ticker runtime policy is intentionally outside `UpdateLoop` internals.


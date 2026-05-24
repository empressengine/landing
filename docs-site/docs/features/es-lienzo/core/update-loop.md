---
sidebar_position: 3
sidebar_label: "update-loop"
---

# Feature: `extension_for_pixi/update-loop` (`RafUpdateStrategy`)

## What this feature does

`RafUpdateStrategy` is a browser-side ticker adapter for `empr.es` core `UpdateLoop`.
It implements the external `IUpdateTicker` contract and converts `requestAnimationFrame`
timestamps into `IUpdateTick` payloads:

- `deltaMs`: milliseconds since previous frame,
- `elapsedMs`: accumulated strategy uptime in milliseconds.

This package is intentionally outside core and is used as an environment-specific
runtime driver passed into `Empr.start(ticker)` / `UpdateLoop.start(ticker)`.

## Why this feature exists

Core `update-loop` is now fully isomorphic and does not own scheduling APIs.
Browser scheduling (`requestAnimationFrame`) must live in an external adapter layer
to preserve platform neutrality of the framework kernel.

`RafUpdateStrategy` provides that bridge:

- keeps browser API usage out of core,
- preserves the same `IUpdateTicker` contract as any server/manual driver,
- allows runtime selection of scheduling strategy at application level.

## How it works

1. **Start**
   - `start(onTick)` activates strategy once (`_active` guard).
   - Increments `_sessionId` for restart isolation.
   - Resets timing state (`_lastTimestamp`, `_elapsedMs`).
   - Schedules first RAF frame.

2. **Frame processing**
   - First frame sets baseline timestamp and schedules next frame without emitting tick.
   - Next frames compute `deltaMs = timestamp - _lastTimestamp`.
   - Invalid deltas (`NaN`, `Infinity`, negative) are skipped safely.
   - Valid deltas are accumulated into `_elapsedMs` and emitted through `onTick`.

3. **Stop**
   - `stop()` cancels pending frame via `cancelAnimationFrame`.
   - Clears callback and all timing/session state.
   - Prevents any further tick emission until next explicit `start()`.

## Interesting design decisions

### 1) Session token for stale callback protection

Each `start()` increments `_sessionId`, and every scheduled frame captures the session value.
If old callbacks fire after restart, they are ignored (`sessionId !== _sessionId`).

Result:
- no mixed frame chains across restarts,
- deterministic behavior for fast `stop() -> start()` cycles.

### 2) Explicit frame cancellation

Strategy stores RAF id (`_frameId`) and calls `cancelAnimationFrame` in `stop()`.

Result:
- pending browser callback is detached proactively,
- lower risk of duplicate scheduling and ghost ticks.

### 3) First-frame baseline policy

First RAF callback does not emit update tick; it only initializes `_lastTimestamp`.

Result:
- first emitted `deltaMs` is meaningful and stable,
- avoids synthetic or undefined initial delta.

## Integration with core `update-loop`

This feature is an adapter for `core/update-loop` (see `src/core/update-loop/feature_description.md`):

- core consumes generic `IUpdateTicker`,
- adapter produces browser timing ticks only,
- delta normalization/clamping, `fps`, `speedMultiplier`, and `gameTime`
  remain core responsibilities.

This separation keeps architecture clean: **policy in core, scheduling in adapters**.

## Public contract of this feature

- `RafUpdateStrategy` (`implements IUpdateTicker`)

## Scope and boundaries

- Browser-only runtime feature (`requestAnimationFrame` / `cancelAnimationFrame`).
- No ECS/domain logic.
- No direct dependency on renderer objects (PixiJS scene graph is out of scope here).
- Intended to be composed with `Empr` as external ticker strategy.


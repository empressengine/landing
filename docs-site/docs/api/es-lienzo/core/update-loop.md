---
sidebar_position: 21
sidebar_label: "update-loop"
---

# API: `core/update-loop`

Public entry point for the browser `requestAnimationFrame` ticker adapter. Import from the core barrel or the feature index.

```typescript
import { RafUpdateStrategy } from '@empr/es-lienzo';
// or
import { RafUpdateStrategy } from './core/update-loop';
```

| Export | Source | Description |
|--------|--------|-------------|
| `RafUpdateStrategy` | `raf-update-strategy.ts` | Browser `IUpdateTicker` — RAF timestamps → `IUpdateTick` |

**Dependencies:**

| Package | Symbols |
|---------|---------|
| `@empr/es` | `IUpdateTicker`, `IUpdateTick` (contracts only) |

**Core time system (reference):** [`@empr/es` `core/update-loop`](/docs/api/es/core/update-loop) — `UpdateLoop`, `IUpdateLoopData`, delta clamping (`MAX_DELTA_TIME = 0.1`), `OnUpdateSignal`, pause/resume, `gameTime`, `speedMultiplier`.

This module does **not** export `UpdateLoop`. It only provides the scheduling adapter passed into `UpdateLoop.start(ticker)` or `Empr.start(ticker)`.

---

## Contract: `IUpdateTicker` / `IUpdateTick` (`@empr/es`)

`RafUpdateStrategy` implements the platform-neutral ticker interface defined in `@empr/es`.

### `IUpdateTick`

```typescript
interface IUpdateTick {
  deltaMs: number;   // ms since previous emitted tick
  elapsedMs: number; // accumulated strategy uptime (ms) since start()
}
```

### `IUpdateTicker`

```typescript
interface IUpdateTicker {
  start(onTick: (tick: IUpdateTick) => void): void;
  stop(): void;
}
```

| Method | Role |
|--------|------|
| `start` | Begin scheduling; invoke `onTick` each valid frame |
| `stop` | Halt scheduling; no further `onTick` until next `start` |

**Division of responsibility:**

| Layer | Responsibility |
|-------|----------------|
| `RafUpdateStrategy` (this module) | Browser RAF scheduling, raw `deltaMs` / `elapsedMs` |
| `UpdateLoop` (`@empr/es`) | `deltaMs → seconds`, clamp, `fps`, `speedMultiplier`, `gameTime`, `OnUpdateSignal`, pause |

```typescript
import { UpdateLoop } from '@empr/es';
import { RafUpdateStrategy } from '@empr/es-lienzo';

const updateLoop = app.dependency.inject(UpdateLoop);
const ticker = new RafUpdateStrategy();

app.start(ticker); // Empr → updateLoop.start(ticker)
```

---

## `RafUpdateStrategy`

```typescript
class RafUpdateStrategy implements IUpdateTicker
```

Browser-side tick producer using `requestAnimationFrame` / `cancelAnimationFrame`. Intended for client games and interactive Pixi apps; not for Node/worker runtimes (use a manual or timer ticker there).

**Layer:** `core` — no ECS, Pixi, or renderer imports.

---

### `start(onTick)`

```typescript
start(onTick: (tick: IUpdateTick) => void): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `onTick` | `(tick: IUpdateTick) => void` | Consumer registered by `UpdateLoop` (or tests) |

| | |
|---|---|
| **Returns** | `void` |
| **Idempotent** | If already active (`_active === true`), **no-op** — does not replace `onTick` or restart the session |

**Side effects on first `start` (or after `stop`):**

1. `_active = true`
2. `_sessionId += 1` — invalidates callbacks from previous sessions
3. Stores `_onTick`, resets `_lastTimestamp = null`, `_elapsedMs = 0`
4. Schedules first RAF via `scheduleNextFrame(sessionId)`

```typescript
const strategy = new RafUpdateStrategy();
updateLoop.start(strategy);
```

---

### `stop()`

```typescript
stop(): void
```

| | |
|---|---|
| **Idempotent** | No-op if not active |

**Side effects:**

1. `_active = false`
2. `cancelAnimationFrame(_frameId)` when `globalThis.cancelAnimationFrame` is a function
3. Clears `_frameId`, `_onTick`, `_lastTimestamp`, `_elapsedMs`

Pending RAF callbacks may still run once; `handleFrame` exits early when `sessionId !== _sessionId`, `!_active`, or `!_onTick`.

```typescript
strategy.stop();
updateLoop.stop(); // also stops ticker via UpdateLoop.stop()
```

---

## Frame pipeline (internal)

```text
start(onTick)
  → sessionId++, schedule RAF

handleFrame(timestamp, sessionId):
  if sessionId ≠ current OR !active OR !onTick → return

  if _lastTimestamp === null:
    _lastTimestamp = timestamp
    schedule next frame
    return                    // no tick emitted (baseline frame)

  deltaMs = timestamp - _lastTimestamp
  _lastTimestamp = timestamp

  if !isFinite(deltaMs) OR deltaMs < 0:
    schedule next frame
    return                    // skip invalid delta

  _elapsedMs += deltaMs
  onTick({ deltaMs, elapsedMs: _elapsedMs })
  schedule next frame
```

### First-frame baseline

The **first** RAF callback after `start()` only records `timestamp` as `_lastTimestamp` and does **not** call `onTick`.

| Effect |
|--------|
| First emitted `deltaMs` is always `(t₂ − t₁)`, never undefined or zero from a cold start |
| Matches test expectation: two ticks after three RAF callbacks |

### Invalid delta handling

| Condition | Behavior |
|-----------|----------|
| `!Number.isFinite(deltaMs)` | Skip emit, schedule next frame |
| `deltaMs < 0` | Skip emit (clock skew / bad timestamp) |

`UpdateLoop` applies a second safety layer: seconds conversion, non-finite → `0`, cap at `0.1s`.

### Session guard

Each `start()` increments `_sessionId`. Every scheduled frame closes over the id at schedule time.

| Scenario | Result |
|----------|--------|
| `stop()` then `start()` | Old session callbacks ignored |
| Stale RAF after `stop()` | Ignored via `!_active` / session mismatch |

Prevents duplicate tick chains on fast `stop → start` on the same instance (see `raf-update-strategy.spec.ts`).

---

## Integration with `UpdateLoop`

```typescript
// Typical app bootstrap (slot-client pattern)
const strategy = new RafUpdateStrategy();
emprLienzo.start(strategy);

// EmprLienzo wires rendering to UpdateLoop.onUpdate (not inside RafUpdateStrategy):
// - particleService.update(multipliedDelta)
// - tweenService.syncDeltaToFPS(gameTime)
// - spineService.update(deltaTime)
// - pixi.renderer.render(stage)  ← manual render; Pixi does NOT own RAF
```

| Step | Component |
|------|-----------|
| 1 | `RafUpdateStrategy` emits `{ deltaMs, elapsedMs }` |
| 2 | `UpdateLoop.handleTick` converts `deltaMs / 1000`, clamps, updates `gameTime` |
| 3 | `onUpdate` callbacks + `OnUpdateSignal.dispatch` |
| 4 | `EmprLienzo` renders Pixi stage on `onUpdate` |

`RafUpdateStrategy` has no knowledge of pause: while `UpdateLoop` is paused, the ticker may still fire RAF, but `UpdateLoop` returns early and does not dispatch updates.

---

## Usage patterns

### Standard game start

```typescript
import { RafUpdateStrategy } from '@empr/es-lienzo';

public async start(): Promise<void> {
  const strategy = new RafUpdateStrategy();
  this._app.start(strategy);
}
```

### Inject loop + strategy separately

```typescript
const updateLoop = dependency.inject(UpdateLoop);
const strategy = new RafUpdateStrategy();

updateLoop.start(strategy);

updateLoop.onUpdate((data) => {
  // data.deltaTime — clamped seconds from core
});
```

### Test double (no RAF)

For unit tests of `UpdateLoop`, prefer a manual ticker (see `@empr/es` API doc). Use `RafUpdateStrategy` tests with mocked `requestAnimationFrame` when testing this class.

```typescript
globalThis.requestAnimationFrame = (cb) => {
  queue.push(cb);
  return id;
};
const strategy = new RafUpdateStrategy();
strategy.start((tick) => ticks.push(tick));
// invoke queued callbacks with synthetic timestamps
```

### Stop both loop and ticker

```typescript
updateLoop.stop(); // calls ticker.stop() internally
```

Calling only `strategy.stop()` without `updateLoop.stop()` leaves `UpdateLoop` thinking it is still started (idempotent `start` on loop will no-op until `updateLoop.stop()`).

---

## Semantics and constraints

| Topic | Behavior |
|-------|----------|
| **Environment** | Requires `requestAnimationFrame`; `cancelAnimationFrame` optional but used when available |
| **Second `start` while active** | Ignored; callback not updated until `stop()` |
| **`elapsedMs`** | Sum of emitted `deltaMs` values only (not wall clock if frames skipped) |
| **Units** | Milliseconds in `IUpdateTick`; `UpdateLoop` converts to seconds |
| **Clamping** | Not applied here — core `UpdateLoop` caps delta at 100 ms |
| **Pixi ticker** | PixiJS is not auto-started; render is driven from `UpdateLoop.onUpdate` in `EmprLienzo` |
| **ECS** | No entity/system coupling |
| **Alternatives** | Server, headless, or CI: implement `IUpdateTicker` without this class |

---

## Internal state (reference)

```
┌─────────────────────────────────────────┐
│  RafUpdateStrategy                      │
│  _active: boolean                       │
│  _frameId: number | null                │
│  _sessionId: number                     │
│  _lastTimestamp: number | null          │
│  _elapsedMs: number                     │
│  _onTick: ((tick: IUpdateTick) => void)? │
└─────────────────────────────────────────┘

start  → active, session++, reset timing, schedule RAF
frame  → baseline | validate delta | onTick | reschedule
stop   → cancel RAF, clear all state
```

---

## Related documentation

- `feature_description.md` — session token, first-frame policy, core vs adapter split
- Core loop: [`@empr/es` `core/update-loop/API_DOC.md`](/docs/api/es/core/update-loop)
- Bootstrap wiring: `../../bootstrap/empr.lienzo.ts` — `setUpdateDeps()`
- Source: `raf-update-strategy.ts`, export: `index.ts`
- Tests: `__tests__/raf-update-strategy.spec.ts`

## Known consumers (reference)

| Module | Usage |
|--------|--------|
| `apps/slot-client/.../empr.game.ts` | `new RafUpdateStrategy()` → `EmprLienzo.start(strategy)` |
| `component-driven app bootstrap` | Same pattern |
| `bootstrap/empr.lienzo.ts` | `UpdateLoop` hooks drive Pixi render (strategy passed from app `start`) |

Application FSM and `OnUpdateSignal` pipelines consume `IUpdateLoopData` from core, not from `RafUpdateStrategy` directly.


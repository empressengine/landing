---
sidebar_position: 41
sidebar_label: "timer"
---

# API: `widgets/timer`

Public entry point for game-loop–synchronized delays. Import from the widgets barrel or the feature index.

```typescript
import { TimerService, ISleep, IUpdatable } from '@empr/es-lienzo';
// or
import { TimerService, ISleep } from './widgets/timer';
```

| Export | Source | Description |
|--------|--------|-------------|
| `TimerService` | `timer.service.ts` | Registry + `update(dt)` driver for timeouts, intervals, `sleep` |
| `ISleep` | `timer.types.ts` | Awaitable delay: `wait()` / early `resolve()` |
| `IUpdatable` | `timer.types.ts` | Frame-step contract (`uuid`, `update(deltaTime)`) |

**Not exported (internal):**

| Class | Source | Role |
|-------|--------|------|
| `Timer` | `timer.ts` | Single-fire delay; self-`clear` on completion |
| `Interval` | `interval.ts` | Repeating delay; leftover ms preserved between ticks |

**Dependencies:**

| Package / module | Symbols |
|------------------|---------|
| `@empr/es` | `nextId`, `DeferredPromise`, `LifecycleTracker`, `Disposable` |

**Out of scope:** Wall-clock / `Date.now()` timing, `requestAnimationFrame`, and browser `setTimeout` / `setInterval`. Callbacks are generic `() => void` — no ECS or Pixi types inside the widget.

**Update driver:** Not wired inside `EmprLienzo`. Host apps register `TimerService` and call `timerService.update(...)` from `UpdateLoop.onUpdate` — typically `data.deltaTime` or `data.multipliedDelta` (see [timing section](#updateloop-timing-deltatime-vs-multiplieddelta-vs-speedmultiplier)).

---

## Design summary

| Native API | Replacement | Time basis |
|------------|-------------|------------|
| `setTimeout` | `setTimeout(cb, ms, owner?)` | Accumulated `deltaTime` (seconds → ms) |
| `setInterval` | `setInterval(cb, ms, owner?)` | Same; period preserved with leftover delta |
| `Promise` + delay | `sleep(ms, owner?)` → `ISleep` | `DeferredPromise` resolved on timer fire |

When the game loop does not call `update`, timers **freeze** (no background throttling drift). Optional `owner` binds cleanup to `LifecycleTracker` (same pattern as `SpineService` / `TweenService`).

---

## `UpdateLoop` timing: `deltaTime` vs `multipliedDelta` vs `speedMultiplier`

`TimerService` does **not** read `UpdateLoop` directly — the host passes one scalar into `update(dt)` each frame. Which field you pass defines how delays behave relative to global game speed.

### How `UpdateLoop` builds `IUpdateLoopData`

Each processed frame (when not paused):

```text
rawDelta = tick.deltaMs / 1000
deltaTime = clamp(rawDelta, max = 0.1s)     // unscaled frame step
multipliedDelta = deltaTime * speedMultiplier
gameTime += multipliedDelta                  // accumulated “game clock”
```

| Field | Formula | Meaning |
|-------|---------|---------|
| `deltaTime` | Clamped wall-frame step (seconds) | **Independent** of `speedMultiplier` |
| `speedMultiplier` | Config via `setSpeedMultiplier()` | Scale factor (default `1`) |
| `multipliedDelta` | `deltaTime * speedMultiplier` | Scaled step; drives `gameTime` |
| `gameTime` | Σ `multipliedDelta` | Total scaled simulation time |

On **pause**, `handleTick` returns before `update()` — `onUpdate` is **not** invoked; `deltaTime` / `multipliedDelta` are not emitted that frame.

`onSpeedChange(multiplier)` fires when `setSpeedMultiplier` changes; it does **not** by itself change past timer accumulation — only future `multipliedDelta` values (or separate listener logic).

Source: [`@empr/es` `core/update-loop/update-loop.ts```update-loop.ts``, [`API_DOC.md`](/docs/api/es/core/update-loop).

### What to pass into `TimerService.update`

| Host passes | Effect on `sleep(1000)` / `setTimeout(..., 1000)` |
|-------------|---------------------------------------------------|
| `data.deltaTime` | ~1000 ms of **frame steps** at normal FPS; **ignores** `speedMultiplier` (real-time feel per frame) |
| `data.multipliedDelta` | Delay stretches/compresses with game speed (aligned with `gameTime`) |

`TimerService` has **no** `onSpeedChange` hook — unlike `SpineService` / `TweenService` in `EmprLienzo`, which adjust playback via dedicated APIs when speed changes.

### How other `es-lienzo` services use the same frame (reference)

| Service | `onUpdate` input | Speed scaling |
|---------|------------------|---------------|
| `ParticleService` | `data.multipliedDelta` | Baked into each `update` step |
| `SpineService` | `data.deltaTime` | `onSpeedChange` → `multiplyTimeScaleAll(speedMultiplier)` |
| `TweenService` | `syncDeltaToFPS(data.gameTime)` | `onSpeedChange` → `setTimeScale(speedMultiplier)` |
| `TimerService` (slot-client) | `data.deltaTime` | None — not tied to `speedMultiplier` |

So at `setSpeedMultiplier(0.5)`:

- Particles advance half as fast per frame (`multipliedDelta`).
- Spine/GSAP slow via their time-scale APIs.
- Timers wired with `deltaTime` still advance **one full frame step per tick** — a 1 s `sleep` completes in ~1 s of running frames, not ~2 s of wall time.

If gameplay delays must follow **game time** (same cadence as `gameTime` / particles), wire:

```typescript
updateLoop.onUpdate((data) => {
  timerService.update(data.multipliedDelta);
});
```

If delays should match **unscaled frame cadence** (UI debounce, fixed spin window independent of bullet-time), keep:

```typescript
updateLoop.onUpdate((data) => {
  timerService.update(data.deltaTime);
});
```

Current slot-client uses the second variant (`empr.game.ts`).

### Pause interaction

| Loop state | `TimerService` |
|------------|----------------|
| `paused === true` | No `onUpdate` → timers frozen |
| `resume()` | `onUpdate` resumes → accumulation continues |

`SpineService` / `TweenService` additionally get explicit `pauseAll()` / `resumeAll()` from `EmprLienzo`; `TimerService` only freezes via missing `update` calls unless the host adds extra `onPause` logic.

---

## `IUpdatable`

```typescript
interface IUpdatable {
  uuid: number;
  update(deltaTime: number): void;
}
```

| Field / method | Description |
|----------------|-------------|
| `uuid` | Internal id (matches `setTimeout` / `setInterval` return value) |
| `update(deltaTime)` | `deltaTime` in **seconds**; implementations multiply by `1000` for ms accumulation |

Exported for typing/extension; `Timer` and `Interval` are the built-in implementations.

---

## `ISleep`

```typescript
interface ISleep {
  id: number;
  wait(): Promise<void>;
  resolve(): void;
}
```

| Member | Description |
|--------|-------------|
| `id` | Underlying timer id from `setTimeout` used internally |
| `wait()` | Awaits game-time completion (resolves on tick when duration elapses) |
| `resolve()` | Resolves the promise immediately **and** calls `TimerService.clear(id)` |

`sleep()` does not accept a separate callback — use `wait()` in `async` systems/pipelines.

```typescript
const sleep = timer.sleep(1500, entity);
await sleep.wait();

// Early cancel (e.g. skip spin):
sleep.resolve();
```

---

## `TimerService`

DI service: `Map<number, IUpdatable>` registry, GC-free snapshot iteration, optional owner tracking.

**Construction:** `new TimerService(lifecycleTracker)`.

### Internal state

| Field | Type | Role |
|-------|------|------|
| `_updatables` | `Map<number, IUpdatable>` | Active timers and intervals |
| `_updatablesSnapshot` | `IUpdatable[]` | Reused each frame (`length = 0` then refill) — no `Array.from` in hot path |
| `_ownerTracking` | `Map<number, { owner, resource }>` | `LifecycleTracker` disposable per timer id |

---

### `setTimeout(callback, duration, owner?)`

```typescript
setTimeout(callback: () => void, duration: number, owner?: object): number
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `callback` | `() => void` | Fires once when accumulated time ≥ `duration` |
| `duration` | `number` | Target delay in **milliseconds** |
| `owner` | `object` | Optional; `LifecycleTracker.track(owner, { dispose: () => clear(id) })` |

| | |
|---|---|
| **Returns** | Unique numeric id (`nextId()`) — pass to `clear()` |

**Side effects:** Creates internal `Timer`, registers in `_updatables`, optionally tracks owner.

On completion: `callback()` then `clear(uuid)` (self-removal).

```typescript
const id = timerService.setTimeout(() => onReveal(), 800, entity);
```

---

### `setInterval(callback, duration, owner?)`

```typescript
setInterval(callback: () => void, duration: number, owner?: object): number
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `callback` | `() => void` | Fires each time period elapses |
| `duration` | `number` | Period in **milliseconds** |
| `owner` | `object` | Optional lifecycle binding |

| | |
|---|---|
| **Returns** | Unique numeric id |

**Does not auto-stop** — call `clear(id)` or destroy `owner` to stop.

**Interval accuracy:** On fire, `_elapsedTime -= duration` (leftover ms carried to next cycle) to avoid drift over many ticks.

```typescript
const tickId = timerService.setInterval(() => refreshHud(), 500, hudOwner);
// later:
timerService.clear(tickId);
```

---

### `sleep(duration, owner?)`

```typescript
sleep(duration: number, owner?: object): ISleep
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `duration` | `number` | Delay in **milliseconds** |
| `owner` | `object` | Optional; early cleanup if owner disposed |

| | |
|---|---|
| **Returns** | `ISleep` wrapper around internal `setTimeout` + `DeferredPromise` |

Implementation: `setTimeout(() => deferred.resolve(), duration, owner)`; `resolve()` on `ISleep` resolves promise and `clear(id)`.

```typescript
await timer.sleep(1000, fsmState).wait();
```

---

### `clear(uuid)`

```typescript
clear(uuid: number): void
```

| Parameter | Description |
|-----------|-------------|
| `uuid` | Id returned from `setTimeout` / `setInterval`, or `ISleep.id` |

**Side effects:**

1. Remove from `_updatables` (stops future `update` steps)
2. `untrackOwner(uuid)` — `LifecycleTracker.untrack` if bound

Does not invoke the timer callback when clearing before completion.

---

### `update(deltaTime)`

```typescript
update(deltaTime: number): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `deltaTime` | `number` | Elapsed time since last frame in **seconds** |

**Algorithm:**

1. Clear snapshot length, push all `_updatables` values
2. For each entry, `updatable.update(deltaTime)`

Safe if `clear` runs inside a callback during iteration (snapshot is a copy of references at frame start; completed `Timer` removes itself after callback).

---

## Internal behavior (reference)

### `Timer`

- `_elapsedTime += deltaTime * 1000`
- When `_elapsedTime >= _duration`: run callback, `timerService.clear(uuid)`

### `Interval`

- Same accumulation; on threshold: `_elapsedTime -= _duration`, run callback (no auto-clear)

### Owner lifecycle

```typescript
const resource: Disposable = { dispose: () => this.clear(id) };
lifecycleTracker.track(owner, resource);
```

`clear(id)` always calls `untrackOwner` to avoid dangling tracker entries.

---

## Bootstrap sequence (reference)

`TimerService` is **not** registered in `EmprLienzo` — host game bootstrap owns wiring.

```text
Host bootstrap (e.g. EmprGame.registerServices)
  → inject LifecycleTracker, UpdateLoop
  → new TimerService(lifecycleTracker)
  → updateLoop.onUpdate((data) => timerService.update(data.deltaTime))
  → dependency.registerGlobal({ provide: TimerService, useFactory: () => timerService })
```

**Wiring choice (required):** pass `data.deltaTime` or `data.multipliedDelta` — see [timing section](#updateloop-timing-deltatime-vs-multiplieddelta-vs-speedmultiplier). Slot-client uses unscaled `deltaTime`.

When `UpdateLoop` is paused, `onUpdate` is not fired — all timers stop advancing.

---

## Usage patterns

### Pipeline delay (`sleepSystem` in slot-client)

```typescript
// apps/slot-client/src/shared/timer/systems/sleep.system.ts
async function sleepSystem(props: SystemProps<{ ms: number }>) {
  const timer = props.inject(TimerService);
  await timer.sleep(props.ms).wait();
}
```

### Store awaitable on component (cancellable)

```typescript
awaiters.minimalSpinTime = timer.sleep(waitTime, entity);
await awaiters.minimalSpinTime.wait();

// elsewhere on skip:
awaiters.minimalSpinTime?.resolve();
```

### One-shot delay with auto cleanup

```typescript
timerService.setTimeout(() => showPopup(), 2000, entity);
```

### Win presentation timing (with Spine)

```typescript
awaiters.winPresentation = timer.sleep(duration * 1000);
await awaiters.winPresentation.wait();
```

### Manual interval cleanup

```typescript
const id = timerService.setInterval(poll, 100);
timerService.clear(id);
```

---

## Semantics and constraints

| Topic | Behavior |
|-------|----------|
| **Units** | `duration` args in **ms**; `update(deltaTime)` in **seconds** |
| **Pause** | `UpdateLoop` paused → no `onUpdate` → no `update` call → timers frozen |
| **Speed scale** | **Not built-in.** `deltaTime` wiring ignores `speedMultiplier`; use `multipliedDelta` in `onUpdate` to align with `gameTime` / particles |
| **`onSpeedChange`** | No effect on timers unless host reacts manually (prefer `multipliedDelta` wiring instead) |
| **vs `gameTime`** | `gameTime` always uses scaled steps; timer only matches it when host passes `multipliedDelta` |
| **Callback errors** | Uncaught exceptions in callbacks propagate to caller frame — no internal try/catch |
| **Re-entrancy** | Snapshot per frame; `Timer` clears self after callback |
| **Interval stop** | Only via `clear` or owner dispose — runs until cleared |
| **`sleep.resolve()`** | Idempotent resolve on `DeferredPromise`; clears timer |
| **Duplicate ids** | `nextId()` from `@empr/es` — assumed unique |
| **No listing API** | No `getActiveTimers()` — track ids in app code if needed |
| **ECS** | No components in widget; pass `entity` (or any object) as `owner` only |

---

## Comparison with browser timers

| Aspect | Browser `setTimeout` | `TimerService` |
|--------|----------------------|----------------|
| Clock | System / tab throttling | Game `deltaTime` |
| Tab background | May batch / delay | Frozen with paused loop |
| Pause game | Still fires | Stops with `onUpdate` |
| Entity destroyed | Manual cleanup | `owner` + `LifecycleTracker` |
| `async` pipelines | External Promise | `sleep().wait()` |

---

## Internal model (reference)

```
┌─────────────────────────────────────────────────────────────┐
│  TimerService                                               │
│  _updatables: Map<id, IUpdatable>                           │
│  _updatablesSnapshot: IUpdatable[]  (reused each frame)     │
│  _ownerTracking: Map<id, LifecycleTracker binding>          │
├─────────────────────────────────────────────────────────────┤
│  setTimeout  → Timer     → update → callback → clear        │
│  setInterval → Interval  → update → callback (repeat)       │
│  sleep       → setTimeout + DeferredPromise → ISleep        │
│  clear(id)   → delete + untrackOwner                        │
│  update(dt)  → snapshot iterate → updatable.update(dt)      │
└─────────────────────────────────────────────────────────────┘
         ▲
         │ host-chosen: data.deltaTime OR data.multipliedDelta (seconds)
    UpdateLoop.onUpdate (when not paused)
```

---

## Related documentation

- `feature_description.md` — determinism, GC-free snapshot, lifecycle binding
- [`@empr/es` `core/update-loop/API_DOC.md`](/docs/api/es/core/update-loop) — `IUpdateLoopData`, pause/resume, `deltaTime` vs `multipliedDelta`
- [`@empr/es` `core/dependency/API_DOC.md`](/docs/api/es/core/dependency) — DI registration patterns
- Source: `timer.service.ts`, `timer.types.ts`, `timer.ts`, `interval.ts`, export: `index.ts`

## Known consumers (reference)

| Module | Usage |
|--------|--------|
| `apps/slot-client/.../empr.game.ts` | `new TimerService`, `onUpdate` → `update(deltaTime)`, DI |
| `apps/slot-client/.../sleep.system.ts` | `sleep(ms).wait()` in pipelines |
| `apps/slot-client/.../slot-*-*.system.ts` | `sleep`, `setTimeout`, awaiters |
| `apps/slot-client/.../slot-awaiters.component.ts` | Stores `ISleep` for cancel |
| `apps/slot-client/.../win-toggle.pipeline.ts` | Injected `TimerService` |

Other `es-lienzo` widgets (`SpineService`, `ParticleService`) are wired in `EmprLienzo`; **`TimerService` is host-owned** — copy the slot-client bootstrap pattern when adding timer support to a new app.


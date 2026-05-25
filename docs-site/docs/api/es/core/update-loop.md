---
sidebar_position: 21
sidebar_label: "update-loop"
---

# API: `core/update-loop`

Public entry point for the feature. Import from the core barrel or the feature index.

```typescript
import {
  UpdateLoop,
  IUpdateLoop,
  IUpdateLoopData,
  IUpdateTicker,
  IUpdateTick,
  OnUpdateSignal,
} from '@empr/es';
```

| Export | Source | Description |
|--------|--------|-------------|
| `UpdateLoop` | `update-loop.ts` | Time core implementation |
| `IUpdateLoop` | `update-loop.types.ts` | Loop contract |
| `IUpdateLoopData` | `update-loop.types.ts` | Per-frame timing payload |
| `IUpdateTicker` | `update-ticker.types.ts` | External tick producer contract |
| `IUpdateTick` | `update-ticker.types.ts` | Single tick payload |
| `OnUpdateSignal` | `update-loop.signals.ts` | Global frame signal |

**Dependencies:** `shared/deferred-promise`, `shared/signal` only (no other `core` modules).

**Constants (implementation):** `MAX_DELTA_TIME = 0.1` seconds — hard cap on raw delta per frame.

---

## `IUpdateTick`

```typescript
interface IUpdateTick {
  deltaMs: number;   // ms since previous tick
  elapsedMs: number; // total ticker uptime (ms)
}
```

Produced by `IUpdateTicker` implementations; consumed internally as `deltaMs / 1000` → seconds.

---

## `IUpdateTicker`

Platform-agnostic scheduling contract. Browser RAF, manual test drivers, or server timers implement this outside `UpdateLoop`.

```typescript
interface IUpdateTicker {
  start(onTick: (tick: IUpdateTick) => void): void;
  stop(): void;
}
```

| Method | Description |
|--------|-------------|
| `start` | Begin scheduling; invoke `onTick` each frame/tick |
| `stop` | Halt scheduling; no further `onTick` |

**Reference implementation:** `RafUpdateStrategy` in `@empr/es-lienzo` (`requestAnimationFrame`, skips first frame for delta, session id guard on restart).

```typescript
const ticker = new RafUpdateStrategy();
updateLoop.start(ticker);
```

---

## `IUpdateLoopData`

Payload passed to `onUpdate` callbacks and `OnUpdateSignal` each processed frame.

| Field | Type | Description |
|-------|------|-------------|
| `deltaTime` | `number` | Clamped delta in **seconds** (after hard cap) |
| `multipliedDelta` | `number` | `deltaTime * speedMultiplier` — used for `gameTime` accumulation |
| `speedMultiplier` | `number` | Current time scale (default `1`) |
| `fps` | `number` | `1 / deltaTime` from clamped delta |
| `gameTime` | `number` | Accumulated **multiplied** seconds since loop start |

> **Shared object:** `UpdateLoop` mutates one internal `_updatedData` instance each frame. Do not assume immutability; copy fields if you need snapshots.

---

## `IUpdateLoop`

Contract implemented by `UpdateLoop`.

### Read-only state

| Member | Type | Description |
|--------|------|-------------|
| `paused` | `boolean` | Whether tick processing is suspended |
| `fps` | `number` | Last computed FPS |
| `gameTime` | `number` | Accumulated scaled game time |
| `speedMultiplier` | `number` | Current scale factor |
| `waitResume` | `Promise<void>` | Resolves when loop leaves paused state (also on `stop`) |

---

### `start(ticker)`

```typescript
start(ticker: IUpdateTicker): void
```

| Parameter | Description |
|-----------|-------------|
| `ticker` | External tick source |

| Behavior |
|----------|
| No-op if already started |
| Stores ticker, sets `_started = true`, calls `ticker.start(handleTick)` |

Typically called via `Empr.start(ticker)` → `dependency.inject(UpdateLoop).start(ticker)`.

---

### `stop()`

| Behavior |
|----------|
| No-op if not started |
| `ticker.stop()`, clears ticker, `_started = false`, `_paused = false` |
| **`_waitResume.resolve()`** — unblocks waiters |

---

### `pause()`

| Behavior |
|----------|
| No-op if already paused |
| `_paused = true`, replaces `_waitResume` with new pending `DeferredPromise` |
| Invokes `onPause` callbacks |
| Ticker may still fire; `handleTick` returns early while paused |

---

### `resume()`

| Behavior |
|----------|
| No-op if not paused |
| `_paused = false`, `_waitResume.resolve()` |
| Invokes `onResume` callbacks |

---

### `setSpeedMultiplier(speedMultiplier)`

Updates `_speedMultiplier` and notifies `onSpeedChange` listeners. Does not retroactively change past `gameTime`.

---

### Callback registration

| Method | Signature | When invoked |
|--------|-----------|--------------|
| `onUpdate` | `(data: IUpdateLoopData) => void` | Each processed frame (after clamp), before signal |
| `onPause` | `() => void` | On `pause()` |
| `onResume` | `() => void` | On `resume()` |
| `onSpeedChange` | `(speedMultiplier: number) => void` | On `setSpeedMultiplier` |

Callbacks are stored in arrays; **no unsubscribe API** — register once at bootstrap.

---

## `UpdateLoop`

```typescript
class UpdateLoop implements IUpdateLoop
```

### Constructor

```typescript
new UpdateLoop()
```

Initial state: not started, not paused, `speedMultiplier = 1`, `gameTime = 0`, **`waitResume` already resolved** (constructor calls `_waitResume.resolve()`).

### Tick pipeline (internal)

```text
ticker → handleTick(tick)
  → if !started || paused: return
  → deltaTime = tick.deltaMs / 1000
  → clampDeltaTime (finite, >= 0, min(raw, 0.1))
  → if 0: return
  → fps = 1 / clampedDelta
  → update(clampedDelta)
       → multipliedDelta = clamped * speedMultiplier
       → gameTime += multipliedDelta
       → fill _updatedData
       → onUpdate callbacks
       → OnUpdateSignal.dispatch(_updatedData)  // not awaited
```

### Delta clamping (`clampDeltaTime`)

| Input | Output |
|-------|--------|
| Not finite or `< 0` | `0` (frame skipped) |
| `> MAX_DELTA_TIME` (0.1s) | `0.1` |
| Otherwise | `rawDelta` |

Prevents physics/timer explosions after tab backgrounding or long GC pauses.

---

## `OnUpdateSignal`

```typescript
const OnUpdateSignal = new Signal<IUpdateLoopData>('UpdateLoop.OnUpdateSignal');
```

Dispatched every processed frame with the same `_updatedData` object reference.

```typescript
OnUpdateSignal.listen(async (data) => {
  await runUpdatePipeline(data);
});

// App wiring (slot-client):
signalService.listen(OnUpdateSignal, updatePipeline);
```

`dispatch` is synchronous from `UpdateLoop.update`; async listeners run but the loop does not `await` them before the next tick.

---

## Usage patterns

### Bootstrap with RAF (browser)

```typescript
const updateLoop = app.dependency.inject(UpdateLoop);
const strategy = new RafUpdateStrategy();
app.start(strategy); // Empr → updateLoop.start(ticker)

updateLoop.onUpdate((data) => {
  timerService.update(data.deltaTime);
});
```

### Pipeline via SignalService

```typescript
function updatePipeline(props: PipelineProps<IUpdateLoopData>) {
  const { deltaTime, gameTime } = props;
  // systems...
}

signalService.listen(OnUpdateSignal, updatePipeline);
```

### Pause-aware async work

```typescript
await updateLoop.waitResume;
// continues after resume() or stop()
```

### Time scale

```typescript
updateLoop.setSpeedMultiplier(0.5); // half speed, gameTime grows slower
```

### Test / manual ticker

```typescript
const manual: IUpdateTicker = {
  start(onTick) {
    onTick({ deltaMs: 16.67, elapsedMs: 16.67 });
  },
  stop() {},
};
loop.start(manual);
```

---

## Semantics and constraints

| Topic | Behavior |
|-------|----------|
| **Ownership** | `UpdateLoop` does not call `requestAnimationFrame` — ticker does |
| **Idempotent start** | Second `start()` ignored until `stop()` |
| **Pause vs stop** | Pause blocks logic; stop detaches ticker entirely |
| **`gameTime`** | Uses **multiplied** delta, not raw wall clock |
| **`fps`** | Derived from clamped delta, not raw ticker gap |
| **Listener removal** | Not supported on `onUpdate` / pause hooks |
| **ECS** | No entity/component awareness |
| **DI** | Registered globally in `bootstrap/empr.ts` as `useFactory: () => updateLoop` |

---

## Related documentation

- `feature_description.md` — design rationale, ticker isolation
- [`../../shared/signal/API_DOC.md``signal` — `OnUpdateSignal` dispatch semantics
- [`../../shared/deferred-promise/API_DOC.md``deferred-promise` — `waitResume`
- `es-lienzo` / `raf-update-strategy.ts` — browser `IUpdateTicker` adapter
- `bootstrap/empr.ts` — `Empr.start(ticker)`
- Source: `update-loop.ts`, types, `index.ts`

## Known consumers (reference)

| Module | Usage |
|--------|--------|
| `bootstrap/empr.ts` | Global `UpdateLoop`, `Empr.start(ticker)` |
| `apps/slot-*/empr.game.ts` | `RafUpdateStrategy`, `onUpdate`, `OnUpdateSignal` → pipeline |
| `es-sistema` / systems | `SystemProps<IUpdateLoopData>` |
| `es-lienzo` / `spine.service` | `update(deltaTime)` driven from loop |
| `TimerService` | `onUpdate` with `data.deltaTime` |


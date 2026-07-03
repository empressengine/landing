---
sidebar_position: 41
sidebar_label: "spine-service"
---

# API: `widgets/spine-service`

Public entry point for phase-based `@esotericsoftware/spine-pixi-v7` orchestration. Import from the widgets barrel or the feature index.

```typescript
import {
  SpineService,
  SpineChain,
  SpinePhase,
  SpineLane,
  SpineRunOptions,
  SpineTrackCallback,
  SpineEventCallback,
  IPhaseOptions,
  ILaneOptions,
  ISlotAttachment,
  ISpineRunDescriptor,
  IRunEventCallbacks,
  ISpineServiceRef,
  EChainState,
  EPhaseState,
  ELaneState,
} from '@empr/es-lienzo';
// or
import { SpineService, SpineChain } from './widgets/spine-service';
```

| Export | Source | Description |
|--------|--------|-------------|
| `SpineService` | `spine.service.ts` | Registry + ECS tick driver; bulk pause/resume/stop/time scale |
| `SpineChain` | `spine-chain.ts` | Sequential phases, navigation, chain callbacks, chain-level slots |
| `SpinePhase` | `spine-phase.ts` | Parallel lanes within one phase; completion / deduplicated `update` |
| `SpineLane` | `spine-lane.ts` | Sequential animation queue per Spine + track; lane-level slots |
| `SpineRunOptions` | `spine-run-options.ts` | Fluent builder for a single `run()` descriptor |
| `SpineTrackCallback` | `spine.types.ts` | `(entry: TrackEntry) => void` |
| `SpineEventCallback` | `spine.types.ts` | `(entry, event) => void` for named Spine events |
| `IPhaseOptions` | `spine.types.ts` | Optional phase `name` for `switchToPhase` |
| `ILaneOptions` | `spine.types.ts` | Lane `track` index and `skin` name |
| `ISlotAttachment` | `spine.types.ts` | `{ spine, slotName, child }` slot binding |
| `ISpineRunDescriptor` | `spine.types.ts` | Immutable run config (built by `SpineRunOptions`) |
| `IRunEventCallbacks` | `spine.types.ts` | Per-run Spine listener callbacks map |
| `ISpineServiceRef` | `spine.types.ts` | Minimal `remove(id)` — used by `SpineChain` internally |
| `EChainState` | `spine.types.ts` | Chain state machine enum |
| `EPhaseState` | `spine.types.ts` | Phase state machine enum |
| `ELaneState` | `spine.types.ts` | Lane state machine enum |

**Not exported (internal):**

| Class | Source | Role |
|-------|--------|------|
| `SpineLaneListener` | `spine-lane-listener.ts` | `AnimationStateListener` → per-run callbacks + deferred resolve |

**Dependencies:**

| Package / module | Symbols |
|------------------|---------|
| `@empr/es` | `LifecycleTracker`, `DeferredPromise`, `nextId`, `Disposable` |
| `@esotericsoftware/spine-pixi-v7` | `Spine` |
| `@esotericsoftware/spine-core` | `TrackEntry`, `Event` (callback types only) |
| `pixi.js` | `Container` (slot attachments) |

**Out of scope:** Spine asset loading (`.json` / `.atlas`), skeleton rendering setup — handled by `AssetsStorage` / `TreeBuilder` / `SpineBuilderBehaviour`. The service only drives animation state and time on existing `Spine` instances.

**Update driver:** `EmprLienzo.setUpdateDeps()` calls `spineService.update(data.deltaTime)` on `UpdateLoop.onUpdate` (unscaled delta). Global game speed uses `multiplyTimeScaleAll` via `onSpeedChange`.

---

## Architecture: Chain → Phase → Lane → Run

```text
SpineService
  └── Map<id, SpineChain>
        └── SpinePhase[] (sequential in play())
              └── SpineLane[] (parallel per phase)
                    └── ISpineRunDescriptor[] (sequential per lane)
```

| Layer | Responsibility |
|-------|----------------|
| `SpineService` | Create chains, frame tick, bulk control |
| `SpineChain` | Phase sequence, `play()` loop, jump/skip/stop, chain slots & callbacks |
| `SpinePhase` | Start all lanes together; complete when finite lanes done (or block on infinite) |
| `SpineLane` | Queue `run()` calls; `setAnimation` / `addAnimation`; listener per run |
| `SpineRunOptions` | Fluent config consumed once per `run()` |

Each lane sets `spine.autoUpdate = false` on `start()` — time advances only through `SpineService.update(dt)` → chain → phase → lane → `spine.update(dt)`.

---

## State enums

### `EChainState`

| Value | Name | Meaning |
|-------|------|---------|
| `0` | `Building` | Phases/runs being configured; before `play()` |
| `1` | `Playing` | `play()` loop active |
| `2` | `Paused` | `pause()` — no `update(dt)` propagation |
| `3` | `Stopped` | `stop()` — aborted; `onChainComplete` does **not** fire |
| `4` | `Completed` | All phases finished naturally |
| `5` | `Finalized` | Cleanup done; removed from service registry |

### `EPhaseState`

| Value | Name |
|-------|------|
| `0` | `Building` |
| `1` | `Running` |
| `2` | `Complete` |
| `3` | `Skipped` |
| `4` | `Disposed` |

### `ELaneState`

| Value | Name |
|-------|------|
| `0` | `Building` |
| `1` | `Running` |
| `2` | `Complete` |
| `3` | `Skipped` |
| `4` | `Disposed` |

---

## Types (`spine.types.ts`)

### `SpineTrackCallback` / `SpineEventCallback`

```typescript
type SpineTrackCallback = (entry: TrackEntry) => void;
type SpineEventCallback = (entry: TrackEntry, event: Event) => void;
```

Used in `SpineRunOptions.onStart` / `onComplete` / `onInterrupt` / `onEnd` and `onEvent(name, cb)`.

### `IPhaseOptions`

```typescript
interface IPhaseOptions {
  name?: string;
}
```

| Field | Description |
|-------|-------------|
| `name` | Target for `SpineChain.switchToPhase(name)` |

### `ILaneOptions`

```typescript
interface ILaneOptions {
  track?: number;  // default 0
  skin?: string;   // applied on lane.start via setSkinByName
}
```

### `ISlotAttachment`

```typescript
interface ISlotAttachment {
  spine: Spine;
  slotName: string;
  child: Container;
}
```

Applied via `spine.addSlotObject` / removed via `removeSlotObject` at chain or lane lifecycle boundaries.

### `IRunEventCallbacks` / `ISpineRunDescriptor`

```typescript
interface IRunEventCallbacks {
  onStart: SpineTrackCallback | null;
  onComplete: SpineTrackCallback | null;
  onInterrupt: SpineTrackCallback | null;
  onEnd: SpineTrackCallback | null;
  onEvents: Map<string, SpineEventCallback> | null;
}

interface ISpineRunDescriptor {
  animationName: string;
  track: number;
  delay: number;
  frequency: number;
  timeScale: number;
  /** -1 = infinite, 1 = once, N = N complete iterations */
  loopCount: number;
  mixDuration: number;
  events: IRunEventCallbacks;
  /** @internal Set when run starts; resolves when finite loopCount reached */
  _deferred: DeferredPromise<void> | null;
}
```

`SpineRunOptions.build()` produces descriptors with `animationName: ''` until `SpineLane.run` assigns the name.

### `ISpineServiceRef`

```typescript
interface ISpineServiceRef {
  remove(id: number): void;
}
```

`SpineChain.finalize()` calls `remove` — avoids circular import with `SpineService`.

---

## `SpineRunOptions`

Fluent builder created per `SpineLane.run()` call. All methods return `this`.

| Method | Default | Description |
|--------|---------|-------------|
| `track(index)` | lane default | Override track for this run |
| `delay(seconds)` | `0` | Delay before the first play of this run |
| `frequency(seconds)` | `0` | Delay between finite `loop(N)` or manual infinite `loop(-1)` repetitions |
| `timeScale(value)` | `1` | Multiplied by chain global multiplier at playback |
| `loop(count)` | `1` | `-1` infinite; `N` = play N times |
| `mixDuration(seconds)` | `0` | Crossfade on `addAnimation` (not first run with mix 0) |
| `onStart(cb)` | — | Spine `start` |
| `onComplete(cb)` | — | Spine `complete` (each loop iteration) |
| `onInterrupt(cb)` | — | Spine `interrupt` |
| `onEnd(cb)` | — | Spine `end` |
| `onEvent(name, cb)` | — | Editor-defined event by `event.data.name` |
| `build(defaultTrack)` | — | Returns `ISpineRunDescriptor` (internal) |

```typescript
lane.run('walk', (o) => o.timeScale(1.5).loop(3).frequency(0.5).onEvent('footstep', onStep));
```

---

## `SpineLane`

Sequential queue for one `Spine` on one track. Created only via `SpinePhase.for()`.

### Read-only

| Member | Type | Description |
|--------|------|-------------|
| `spine` | `Spine` | Target instance (phase deduplication key) |
| `state` | `ELaneState` | Current lane state |
| `promise` | `Promise<void>` | Resolves on complete, skip, or dispose |

### Build phase (before `SpinePhase.start`)

| Method | Description |
|--------|-------------|
| `run(animationName, configurator?)` | Append run; optional `(o: SpineRunOptions) => void` |
| `attachToSlot(slotName, child)` | Register slot object applied at `start()` |
| `detachFromSlot(slotName)` | Remove pending attachment by slot name |

### Runtime (called by phase/chain)

| Method | Description |
|--------|-------------|
| `start(timeScaleMultiplier)` | `autoUpdate = false`, skin, slots, first run |
| `skip()` | Clear track, resolve deferreds, skip remaining runs |
| `update(dt)` | `spine.update(dt)` when `Running` |
| `updateTimeScale(multiplier)` | Updates current `TrackEntry.timeScale` |
| `isComplete()` | `Complete` or `Skipped` |
| `isInfinite()` | Any run with `loopCount === -1` |
| `forceReset()` | `clearTrack` + `setToSetupPose` |
| `dispose()` | Listener cleanup, detach slots, resolve deferreds |

**Run sequencing:** First play of the first run uses `setAnimation` when `mixDuration === 0`; otherwise `addAnimation`. Finite `loop(N)` runs queue N non-looping entries; `delay` applies before the first play and `frequency` applies only between repeats. Infinite `loop(-1)` without `frequency` uses one native looping entry; `loop(-1).frequency(seconds)` uses manual non-looping repeats scheduled after each `complete` event.

---

## `SpinePhase`

Parallel lane manager. Scope passed to `SpineChain.phase((scope) => …)`.

| Member | Description |
|--------|-------------|
| `name` | `string \| null` from `IPhaseOptions` |
| `promise` | Resolves on complete, skip, or dispose |

| Method | Description |
|--------|-------------|
| `for(spine, options?)` | Create `SpineLane`; returns lane for `.run()` chaining |
| `start(multiplier)` | Start all lanes; may `complete()` immediately if all finite lanes already done |
| `skip()` | Skip all lanes; resolve phase deferred |
| `update(dt)` | Update each running lane once per **distinct** `spine` (`Set` cleared each frame — GC-free) |
| `updateTimeScale(multiplier)` | Propagate to all lanes |
| `forceReset()` | All lanes `forceReset()` |
| `isComplete()` | `Complete` or `Skipped` |
| `dispose()` | Dispose all lanes; safe resolve |

**Completion rule:** Phase completes when **all** lanes are complete **unless** any lane has `loop(-1)` — then the phase blocks until `skip()` / `stop()` / `switchToPhase` on the chain.

---

## `SpineChain`

Fluent builder and playback controller. Obtained from `SpineService.create()`.

**Constructor (internal):** `(id, name, spineService, lifecycleTracker, owner?)` — if `owner` is set, `LifecycleTracker.track(owner, { dispose: () => stop() })` auto-stops the chain when the owner is destroyed.

### Build phase only (`EChainState.Building`)

Throws if called after `play()`:

| Method | Description |
|--------|-------------|
| `phase(configurator, options?)` | Add `SpinePhase`; configurator receives phase scope |
| `onPhaseComplete(cb)` | Fires when **last added** phase completes (natural, skip, or switch — **not** `stop()`) |
| `onChainComplete(cb)` | Fires when all phases complete naturally (**not** `stop()` / `dispose()`) |
| `attachToSlot(spine, slotName, child)` | Chain-level slot until `finalize()` |
| `detachFromSlot(spine, slotName)` | Remove pending chain-level attachment |

`onPhaseComplete()` without prior `phase()` throws `[SpineChain] onPhaseComplete() called before any phase()`.

### Playback & control

| Method | Description |
|--------|-------------|
| `play()` | `async`; runs phases sequentially; promise **always resolves** (never rejects); calls `finalize()` at end |
| `update(dt)` | Delegates to current phase when `Playing` |
| `pause()` / `resume()` | Chain-level pause (no dt) |
| `stop(forceStop?)` | Skip current phase; optional `forceReset` on all phases; **no** `onChainComplete`; resolves `play()` promise |
| `dispose()` | Alias for `stop(true)` |
| `skipCurrentPhase()` | Skip active phase; `onPhaseComplete` for that phase fires |
| `switchToNextPhase()` | Alias for `skipCurrentPhase()` |
| `switchToPhase(name)` | Skip current; jump loop to named phase (intermediate phases **not** started; their callbacks **not** fired) |
| `multiplyTimeScale(multiplier)` | `Math.max(0, multiplier)`; propagates to current phase when `Playing` |

**`play()` loop:** For each phase index, `phase.start(multiplier)` → `await phase.promise` → fire phase callbacks → if `_jumpToPhaseIndex >= 0`, set loop index to `target - 1`. On natural finish: `Completed` → `onChainComplete` → `finalize()`.

**`finalize()` (idempotent):** Dispose phases, remove chain slots, clear callbacks, untrack owner, `spineService.remove(id)`.

```typescript
const chain = spineService.create('hero-walk', entity);
chain
  .phase((scope) => {
    scope.for(heroSpine, { skin: 'warrior' }).run('walk').run('idle', (o) => o.mixDuration(0.3).loop(-1));
  }, { name: 'locomotion' })
  .onPhaseComplete(() => playSound('phase_done'))
  .onChainComplete(() => startGameplay())
  .play();

await chain.play();
```

### Named phase navigation (slots)

```typescript
chain
  .phase((s) => s.for(reel).run('spin_start'), { name: 'start' })
  .phase((s) => s.for(reel).run('spin_loop', (o) => o.loop(-1)), { name: 'loop' })
  .phase((s) => s.for(reel).run('spin_stop'), { name: 'stop' })
  .play();

// When server responds:
chain.switchToPhase('stop');
```

---

## `SpineService`

DI singleton: registry of active chains + frame driver. Implements `ISpineServiceRef`.

**Construction:** `new SpineService(lifecycleTracker)` — registered in `EmprLienzo.registerServices()`.

### `getDuration(spine, animationName)` (static)

```typescript
static getDuration(spine: Spine, animationName: string): number
```

| | |
|---|---|
| **Returns** | Animation duration in seconds from skeleton data, or `0` if not found |

Stateless utility — no chain required.

```typescript
const duration = SpineService.getDuration(spine, 'win');
await timer.sleep(duration * 1000);
```

### Instance API

| Method | Description |
|--------|-------------|
| `create(name, owner?)` | New `SpineChain` (`nextId()`), registered in internal `Map` |
| `remove(id)` | Delete chain from registry (called from `finalize`) |
| `update(dt)` | `chain.update(dt)` for every registered chain |
| `pauseAll()` | `chain.pause()` on all |
| `resumeAll()` | `chain.resume()` on all |
| `stopAll(forceStop?)` | Copies chains to array first (safe mutation during `stop` → `finalize` → `remove`) |
| `multiplyTimeScaleAll(multiplier)` | `chain.multiplyTimeScale` on all |

There is **no** public `get(id)` or lookup by name — keep the `SpineChain` reference returned from `create()`.

---

## Internal behavior (reference)

### `SpineLaneListener`

- Implements `AnimationStateListener`; filters by `entry.trackIndex === descriptor.track`.
- `complete`: increments play counter for finite runs, resolves `_deferred` when `loopCount` plays are reached, and asks the lane to schedule the next manual infinite repeat when `loopCount === -1` with `frequency > 0`.
- `onComplete` callback fires on **each** finite play, native infinite loop iteration, or manual infinite repeat.
- Registered per run; removed before next run or on skip/dispose.

### First vs subsequent runs

| Condition | Spine API |
|-----------|-----------|
| First play of first run, `mixDuration === 0` | `state.setAnimation(track, name, isLoop)` + optional `entry.delay` |
| First play when queued or mixed | `state.addAnimation(track, name, isLoop, delay)` + optional `entry.mixDuration` |
| Finite repeat | `state.addAnimation(track, name, false, frequency)` |
| Manual infinite repeat | `state.addAnimation(track, name, false, frequency)` after each `complete` |

Effective `entry.timeScale = descriptor.timeScale * chainMultiplier`.

### Slot attachments

| Level | Applied | Removed |
|-------|---------|---------|
| Chain | `play()` start | `finalize()` |
| Lane | `lane.start()` | `lane.dispose()` / skip cleanup |

### Callback semantics

| Callback | Fires on | Does **not** fire on |
|----------|----------|----------------------|
| `onPhaseComplete` | Phase complete, skip, `switchToPhase` (skipped phase) | `stop()` |
| `onChainComplete` | Natural completion of all phases | `stop()`, `dispose()` |

### `play()` promise

Always resolves (including stop/dispose) — safe to `await` without try/catch for rejection.

---

## Bootstrap sequence (reference)

```text
EmprLienzo.registerServices()
  → new SpineService(lifecycleTracker)
  → DI register SpineService

EmprLienzo.setUpdateDeps()
  → onSpeedChange → multiplyTimeScaleAll(modifier)
  → onPause → pauseAll()
  → onResume → resumeAll()
  → onUpdate → spineService.update(deltaTime)

App / TreeBuilder / systems
  → inject(SpineService)
  → create(name, owner?) → chain.phase(...).play()
```

`SpineBuilderBehaviour` auto-plays `initialAnimation` when the declarative tree defines one:

```typescript
const chain = spineService.create(name, entity);
chain.phase((scope) => {
  scope.for(view, options.skin ? { skin: options.skin } : undefined)
    .run(options.initialAnimation!, (o) => { /* timeScale, loop */ });
}).play();
```

---

## Usage patterns

### Idle loop on entity (owner lifecycle)

```typescript
const chain = spineService.create('hero-idle', entity);
chain
  .phase((scope) => scope.for(heroSpine).run('idle', (o) => o.loop(-1)))
  .play();
// chain.stop() or entity destroy → auto cleanup via LifecycleTracker
```

### Parallel spines in one phase

```typescript
chain.phase((scope) => {
  scope.for(heroSpine).run('wave');
  scope.for(petSpine).run('jump');
});
```

### Win presentation (slot-client)

```typescript
const chain = spineService.create('win' + index, symbolEntity);
chain.phase((scope) => scope.for(spine).run('win')).play();
const duration = SpineService.getDuration(spine, 'win');
// later: chain.stop();
```

### Global slow motion

```typescript
spineService.multiplyTimeScaleAll(0.3);
spineService.multiplyTimeScaleAll(1.0);
```

### Per-chain time scale

```typescript
chain.multiplyTimeScale(0.5);
```

---

## Semantics and constraints

| Topic | Behavior |
|-------|----------|
| **Manual tick** | `autoUpdate = false` while lane is running — must have `SpineService.update` in game loop |
| **`play()` once** | Second `play()` is no-op if state ≠ `Building` |
| **Build after `play()`** | `phase()`, `onPhaseComplete`, `onChainComplete`, slot attach throw |
| **Infinite phase** | Any `loop(-1)` in any lane blocks phase until external skip/stop/switch |
| **Multi-track same Spine** | Use multiple lanes with different `ILaneOptions.track`; phase dedupes `update` per `Spine` |
| **Skin** | Lane `skin` → `setSkinByName` + `setSlotsToSetupPose` at lane start |
| **Memory** | `finalize` removes listeners, slots, callbacks; owner untracked; chain removed from service |
| **`stopAll` safety** | Iterates copy of chains because `stop` mutates the registry map |
| **Asset loading** | Not handled here — `Spine` must already be constructed with valid skeleton data |
| **No ECS component** | Service is widget-level; games use `create` + optional entity `owner` for lifecycle only |

---

## Internal model (reference)

```
┌─────────────────────────────────────────────────────────────────────┐
│  SpineService                                                       │
│  _chains: Map<id, SpineChain>                                      │
├─────────────────────────────────────────────────────────────────────┤
│  create() → SpineChain                                              │
│  update(dt) → each chain.update(dt)                                 │
│  pauseAll / resumeAll / stopAll / multiplyTimeScaleAll              │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────┐
│  SpineChain                                                         │
│  _phases[], _jumpToPhaseIndex, callbacks, chain slots               │
│  play() async loop │ switchToPhase │ stop → finalize → remove(id)  │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────┐
│  SpinePhase — parallel lanes, Set<Spine> dedupe on update             │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────┐
│  SpineLane — _runs[], SpineLaneListener per active run              │
│  setAnimation / addAnimation → complete → next run                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Related documentation

- `.artifacts/feature_description.md` — design rationale, v2 goals, boundaries
- `.artifacts/system_design_new_api.md` — full v2 contracts and state machines
- `../../bootstrap/empr.lienzo.ts` — registration and `UpdateLoop` wiring
- `../../features/tree-builder/behaviours/spine-builder.behaviour.ts` — declarative `initialAnimation` chains
- Source: `spine.service.ts`, `spine-chain.ts`, `spine-phase.ts`, `spine-lane.ts`, `spine-run-options.ts`, `spine.types.ts`, export: `index.ts`

## Known consumers (reference)

| Module | Usage |
|--------|--------|
| `bootstrap/empr.lienzo.ts` | `new SpineService`, DI, `update` / pause / resume / `multiplyTimeScaleAll` |
| `features/tree-builder/behaviours/spine-builder.behaviour.ts` | `create` + `phase` + `play` for `initialAnimation` |
| `apps/slot-client/.../big-win-*.system.ts` | `create`, `phase`, `play` |
| `apps/slot-client/.../slot-show-win-symbols.system.ts` | `create`, `getDuration`, `stop` |

Host apps own concrete animation names, phase graphs, and reel/slot navigation (`switchToPhase`).


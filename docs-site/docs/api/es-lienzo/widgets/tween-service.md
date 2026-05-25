---
sidebar_position: 41
sidebar_label: "tween-service"
---

# API: `widgets/tween-service`

Public entry point for phase-based GSAP orchestration tied to the ECS `UpdateLoop`. Import from the widgets barrel or the feature index.

```typescript
import {
  TweenService,
  TweenChain,
  TweenPhase,
  TweenLane,
  TweenUtils,
  IPhaseOptions,
  ITweenServiceRef,
  ITweenRunDescriptor,
  EChainState,
  EPhaseState,
  ELaneState,
} from '@empr/es-lienzo';
// or
import { TweenService, TweenChain, TweenUtils } from './widgets/tween-service';
```

| Export | Source | Description |
|--------|--------|-------------|
| `TweenService` | `tween.service.ts` | Chain registry; detaches GSAP RAF ticker; drives `updateRoot(gameTime)` |
| `TweenChain` | `tween-chain.ts` | Sequential phases, navigation, callbacks, lifecycle |
| `TweenPhase` | `tween-phase.ts` | Parallel lanes; `scope` in `phase()` callbacks |
| `TweenLane` | `tween-lane.ts` | Sequential GSAP queue per target (`.to` / `.from` / `.fromTo` / `.set`) |
| `TweenUtils` | `tween-utils.ts` | Distance → duration helpers for constant-speed tweens |
| `IPhaseOptions` | `tween.types.ts` | Optional phase `name` for `switchToPhase` |
| `ITweenServiceRef` | `tween.types.ts` | Minimal `remove(id)` for chain finalization |
| `ITweenRunDescriptor` | `tween.types.ts` | Queued tween step before timeline materialization |
| `EChainState` | `tween.types.ts` | Chain state enum |
| `EPhaseState` | `tween.types.ts` | Phase state enum |
| `ELaneState` | `tween.types.ts` | Lane state enum |

**Dependencies:**

| Package / module | Symbols |
|------------------|---------|
| `@empr/es` | `LifecycleTracker`, `DeferredPromise`, `nextId` |
| `gsap` | Injected `typeof gsap` — native ticker removed in `TweenService` constructor |

**Out of scope:** Pixi display-object wiring (pass `Container`, `scale`, component refs, or plain objects as lane `target`). Standalone `gsap.to()` outside a chain is discouraged — no registry cleanup or lifecycle binding.

**Update driver:** `EmprLienzo.setUpdateDeps()` calls `tweenService.syncDeltaToFPS(data.gameTime)` on each `UpdateLoop.onUpdate`, and `setTimeScale(speedMultiplier)` on `onSpeedChange`. Pause/resume uses `pauseAll()` / `resumeAll()` on `onPause` / `onResume`.

---

## Architecture: Chain → Phase → Lane → GSAP timeline

```text
TweenService
  └── Record<id, TweenChain>
        └── TweenPhase[] (sequential in play())
              └── TweenLane[] (parallel per phase)
                    └── ITweenRunDescriptor[] → one gsap.timeline at lane.start()
```

| Layer | Responsibility |
|-------|----------------|
| `TweenService` | Registry, `gsap.updateRoot(gameTime)`, bulk pause/resume/stop/time scale |
| `TweenChain` | Phase sequence, `play()` loop, jump/skip/stop, callbacks |
| `TweenPhase` | `for(target)` lanes in parallel; phase completion / infinite blocking |
| `TweenLane` | Queue tween steps; materialize timeline at `start()` |

Unlike `SpineService`, there is **no** per-chain `update(dt)` — GSAP advances globally via `syncDeltaToFPS` once per frame.

---

## GSAP ticker decoupling

On construction:

```typescript
this._gsap.ticker.remove(this._gsap.updateRoot);
```

All timeline progression requires:

```typescript
updateLoop.onUpdate((data) => {
  tweenService.syncDeltaToFPS(data.gameTime);
});
```

| Input | Meaning |
|-------|---------|
| `gameTime` | Accumulated **scaled** seconds (`Σ multipliedDelta`) from `UpdateLoop` |
| Not `deltaTime` | GSAP root expects absolute time, not per-frame delta |

When `TweenService._paused === true`, `syncDeltaToFPS` is a no-op (bulk pause). Individual chains also call `timeline.pause()` on lanes for the active phase.

---

## `UpdateLoop` integration (reference)

| Hook | Tween wiring (`EmprLienzo`) |
|------|-----------------------------|
| `onUpdate` | `syncDeltaToFPS(data.gameTime)` |
| `onSpeedChange` | `setTimeScale(speedMultiplier)` on all chains |
| `onPause` | `pauseAll()` |
| `onResume` | `resumeAll()` |

At `setSpeedMultiplier(0.5)`, `gameTime` grows half as fast → tweens slow with simulation. Compare with `TimerService` when wired with raw `deltaTime` (see [`../timer/API_DOC.md`](/docs/api/es-lienzo/widgets/timer)).

See [`@empr/es` `core/update-loop/API_DOC.md`](/docs/api/es/core/update-loop) for `deltaTime` vs `multipliedDelta` vs `gameTime`.

---

## State enums

### `EChainState`

| Value | Name |
|-------|------|
| `0` | `Building` |
| `1` | `Playing` |
| `2` | `Paused` |
| `3` | `Stopped` |
| `4` | `Completed` |
| `5` | `Finalized` |

### `EPhaseState` / `ELaneState`

Same numeric layout as spine-service (`Building`, `Running`, `Complete`, `Skipped`, `Disposed` for phase; lane has no `Disposed` name collision — lane uses `Disposed` too).

---

## Types (`tween.types.ts`)

### `IPhaseOptions`

```typescript
interface IPhaseOptions {
  name?: string;
}
```

### `ITweenRunDescriptor`

```typescript
interface ITweenRunDescriptor {
  type: 'to' | 'from' | 'fromTo' | 'set';
  vars: gsap.TweenVars;
  fromVars?: gsap.TweenVars;
}
```

Built during lane build phase; timeline created at `start()` with spread copies (`{ ...run.vars }`) so GSAP cannot mutate stored descriptors.

### `ITweenServiceRef`

```typescript
interface ITweenServiceRef {
  remove(id: number): void;
}
```

---

## `TweenLane`

Sequential GSAP steps for one `target` (`object` — Pixi nodes, components, plain `{ x, y }`, etc.).

### Build phase (before `TweenPhase.start`)

| Method | Maps to |
|--------|---------|
| `to(vars)` | `timeline.to(target, vars)` |
| `from(vars)` | `timeline.from(target, vars)` |
| `fromTo(fromVars, toVars)` | `timeline.fromTo(target, fromVars, toVars)` |
| `set(vars)` | `timeline.set(target, vars)` |

GSAP callbacks (`onComplete`, `onStart`, …) belong in `vars` per GSAP docs.

**Infinite lane:** any queued run with `vars.repeat === -1` → `isInfinite() === true` → parent phase blocks until skip/stop/switch.

**Empty lane:** no runs → `start()` completes immediately.

### Runtime

| Member / method | Description |
|-----------------|-------------|
| `state` | `ELaneState` |
| `target` | Animated object |
| `start(multiplier)` | Build `gsap.timeline({ onComplete })`, apply `timeScale`, append runs |
| `skip()` | `timeline.kill()` — GSAP completion callbacks **not** fired |
| `pause()` / `resume()` | Lane timeline pause/resume (required when globally ticked) |
| `updateTimeScale(multiplier)` | `timeline.timeScale(multiplier)` when running |
| `kill()` | Kill timeline without resolving deferred (used by `stop(forceStop)`) |
| `dispose()` | Kill + resolve lane deferred |
| `isComplete()` | `Complete` or `Skipped` |
| `isInfinite()` | Any `repeat: -1` in queued vars |

---

## `TweenPhase`

Parallel lane container. Exposed as `scope` in `chain.phase((scope) => { ... })`.

| Member | Description |
|--------|-------------|
| `name` | `string \| null` for `switchToPhase` |
| `promise` | Resolves on complete, skip, or dispose |

| Method | Description |
|--------|-------------|
| `for(target)` | New `TweenLane` for fluent `.to()` / `.from()` / … |
| `start(multiplier)` | Start all lanes; may complete immediately if all finite lanes done |
| `skip()` | Skip all lanes |
| `pauseAll()` / `resumeAll()` | All lane timelines |
| `updateTimeScale(multiplier)` | Propagate to lanes |
| `killAll()` | `lane.kill()` on all — used by `stop(true)` |
| `dispose()` | Dispose lanes + resolve phase deferred |
| `isComplete()` | `Complete` or `Skipped` |

**Completion:** All finite lanes complete → phase completes. Any infinite lane (`repeat: -1`) blocks until external skip.

---

## `TweenChain`

Fluent builder and playback controller from `TweenService.create()`.

**Owner lifecycle:** optional `owner` → `LifecycleTracker.track(owner, { dispose: () => stop() })`.

### Build phase only (`EChainState.Building`)

| Method | Description |
|--------|-------------|
| `phase(configurator, options?)` | Add phase; configurator receives `TweenPhase` |
| `onPhaseComplete(cb)` | Fires when **last added** phase completes (natural, skip, switch — **not** `stop()`) |
| `onChainComplete(cb)` | All phases done naturally (**not** `stop()` / `dispose()`) |

### Playback & control

| Method | Description |
|--------|-------------|
| `play()` | `async`; sequential phases; promise always resolves; `finalize()` at end |
| `pause()` / `resume()` | Current phase lane timelines |
| `stop(forceStop?)` | Skip current phase; `forceStop` → `killAll()` on **all** phases; no `onChainComplete` |
| `dispose()` | `stop(true)` |
| `skipCurrentPhase()` | Skip active phase; `onPhaseComplete` fires |
| `switchToNextPhase()` | Alias for `skipCurrentPhase()` |
| `switchToPhase(name)` | Skip current; jump to named phase (intermediate phases not run) |
| `setTimeScale(multiplier)` | `Math.max(0, multiplier)`; current phase if `Playing` |

```typescript
const chain = tweenService.create('hero-entrance', entity);
chain
  .phase((scope) => {
    scope.for(sprite).from({ alpha: 0, duration: 0.5 });
    scope.for(sprite.scale).to({ x: 1.2, y: 1.2, duration: 0.3, ease: 'back.out' });
  }, { name: 'intro' })
  .onChainComplete(() => enableInput())
  .play();
```

---

## `TweenService`

**Construction:** `new TweenService(gsap, lifecycleTracker)` — GSAP instance from host (`EmprLienzo` passes app `gsap`).

### `gsap` (getter)

Direct access to injected GSAP for advanced scenarios. Prefer `create()` → `phase()` → `play()` for tracked lifecycle.

### Instance API

| Method | Description |
|--------|-------------|
| `create(name, owner?)` | New `TweenChain`, registered by `nextId()` |
| `remove(id)` | Internal — `finalize()` on chain |
| `pauseAll()` | Sets `_paused`, pauses all chains |
| `resumeAll()` | Clears `_paused`, resumes chains |
| `stopAll(forceStop?)` | Snapshot `Object.values(_chains)` then `stop` each |
| `setTimeScale(scale)` | Stores scale + `chain.setTimeScale(scale)` on all chains |
| `syncDeltaToFPS(gameTime)` | If not paused: `gsap.updateRoot(gameTime)` |

No public lookup by name — keep the `TweenChain` reference from `create()`.

---

## `TweenUtils`

Stateless DI helper (`registerGlobal({ provide: TweenUtils, useClass: TweenUtils })`).

### `timeForVec2Distance(startPoint, endPoint, speed)`

| Parameter | Description |
|-----------|-------------|
| `startPoint` / `endPoint` | `{ x, y }` |
| `speed` | Pixels per second (`> 0`) |

| | |
|---|---|
| **Returns** | Duration in **seconds** for GSAP `duration` |
| **Throws** | `speed <= 0` |

### `timeForDistance(startValue, endValue, speed)`

| Parameter | Description |
|-----------|-------------|
| `startValue` / `endValue` | Numeric endpoints |
| `speed` | Units per second (`> 0`) |

| | |
|---|---|
| **Returns** | `abs(end - start) / speed` in seconds |

```typescript
const utils = inject(TweenUtils);
const duration = utils.timeForVec2Distance({ x: 0, y: 0 }, { x: 300, y: 0 }, 400);
scope.for(sprite).to({ x: 300, duration, ease: 'none' });
```

---

## Internal behavior (reference)

### Deferred timeline materialization

`.to()` / `.from()` only push `ITweenRunDescriptor`. GSAP objects exist after `lane.start()` → safe build phase, `switchToPhase` can reuse stored config.

### `play()` loop

Same pattern as `SpineChain`: await `phase.promise`, fire `onPhaseComplete`, honor `_jumpToPhaseIndex` after `switchToPhase`.

### Pause semantics (two levels)

| Level | Effect |
|-------|--------|
| `TweenService.pauseAll()` | Skips `updateRoot`; chains paused |
| `TweenChain.pause()` | Current phase `timeline.pause()` |

Resume reverses both paths.

### Skip / kill vs GSAP callbacks

`lane.skip()` / `timeline.kill()` — native GSAP does not run tween `onComplete` vars.

### `finalize()`

Dispose all phases, clear callbacks, untrack owner, `remove(id)`.

---

## Bootstrap sequence (reference)

```text
EmprLienzo constructor(gsap)
  → registerServices: new TweenService(gsap, lifecycleTracker)
  → DI: TweenService, TweenUtils

EmprLienzo.init() → setUpdateDeps()
  → onUpdate: syncDeltaToFPS(data.gameTime)
  → onSpeedChange: setTimeScale(modifier)
  → onPause / onResume: pauseAll / resumeAll

App / systems
  → inject(TweenService)
  → create(name, owner?) → phase → play()
```

---

## Usage patterns

### Scale pop (win label)

```typescript
winLabel.showChain = tweenService.create('win-label-show');
winLabel.showChain
  .phase((scope) => {
    scope.for(container.scale).to({ x: 1, y: 1, duration: 0.15, ease: 'power2.inOut' });
  })
  .play();
```

### Reel acceleration bound to entity

```typescript
tweenService.create('reel-accelerate', reel)
  .phase((scope) => {
    scope.for(reelComponent).to({
      speed: targetSpeed,
      duration: reelComponent.accelerationDuration,
      ease: 'power2.out',
    });
  })
  .play();
```

### Sequential phases with named jump

```typescript
chain
  .phase((s) => s.for(ui).to({ alpha: 1, duration: 0.3 }), { name: 'fadeIn' })
  .phase((s) => s.for(ui).to({ y: 100, duration: 1, repeat: -1 }), { name: 'pulse' })
  .phase((s) => s.for(ui).to({ alpha: 0, duration: 0.2 }), { name: 'fadeOut' })
  .play();

// On server response:
chain.switchToPhase('fadeOut');
```

### Constant-speed move

```typescript
const duration = tweenUtils.timeForVec2Distance(start, end, 500);
chain.phase((s) => s.for(sprite).to({ x: end.x, y: end.y, duration, ease: 'none' })).play();
```

### Stop external chain

```typescript
winLabel.showChain?.stop();
```

---

## Semantics and constraints

| Topic | Behavior |
|-------|----------|
| **Time driver** | `gameTime` via `syncDeltaToFPS` only |
| **Speed** | `setTimeScale` on service + per-chain; aligned with `UpdateLoop.setSpeedMultiplier` in bootstrap |
| **Pause** | Service `_paused` blocks `updateRoot`; chain pause stops active timelines |
| **`play()` once** | Second call no-op if not `Building` |
| **Build after `play()`** | `phase`, callbacks throw |
| **Infinite phase** | `repeat: -1` in any lane blocks phase |
| **Target typing** | `object` — caller ensures properties exist (GSAP mutates in place) |
| **Registry** | `Record<number, TweenChain>` — not iterable publicly |
| **vs Spine** | Same chain/phase/lane mental model; Spine uses per-frame `update(dt)`, Tween uses global `updateRoot` |

---

## SpineService ↔ TweenService (quick map)

| Concept | Spine | Tween |
|---------|-------|-------|
| Lane target | `Spine` + track | Any `object` |
| Lane steps | `run(name, options?)` | `to` / `from` / `fromTo` / `set` |
| Infinite | `loop(-1)` | `repeat: -1` in vars |
| Global tick | `update(deltaTime)` per chain | `syncDeltaToFPS(gameTime)` once |
| Speed | `multiplyTimeScale` / `multiplyTimeScaleAll` | `setTimeScale` / `setTimeScale` on service |
| Skip lane | `lane.skip()` | `lane.skip()` (kill timeline) |

---

## Internal model (reference)

```
┌─────────────────────────────────────────────────────────────────┐
│  TweenService                                                   │
│  _chains: Record<id, TweenChain>                                │
│  _paused, _timeScale                                            │
│  gsap.ticker: updateRoot detached                               │
├─────────────────────────────────────────────────────────────────┤
│  syncDeltaToFPS(gameTime) → gsap.updateRoot(gameTime)           │
│  create() → TweenChain                                          │
│  pauseAll / resumeAll / stopAll / setTimeScale                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  TweenChain → TweenPhase[] → TweenLane[] → gsap.timeline       │
│  play() async │ switchToPhase │ stop → finalize → remove(id)    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Related documentation

- `feature_description.md` — ticker decoupling, deferred materialization, boundaries
- `.artifacts/system_design_new_api.md` — v2 contracts
- [`../spine-service/API_DOC.md`](/docs/api/es-lienzo/widgets/spine-service) — parallel orchestration model
- `../../bootstrap/empr.lienzo.ts` — DI, `setUpdateDeps`, GSAP injection
- [`@empr/es` `core/update-loop/API_DOC.md`](/docs/api/es/core/update-loop) — `gameTime`, speed multiplier
- Source: `tween.service.ts`, `tween-chain.ts`, `tween-phase.ts`, `tween-lane.ts`, `tween-utils.ts`, `tween.types.ts`, export: `index.ts`

## Known consumers (reference)

| Module | Usage |
|--------|--------|
| `bootstrap/empr.lienzo.ts` | `new TweenService(gsap, …)`, `syncDeltaToFPS`, pause/resume/speed |
| `apps/slot-client/.../win-label-*.system.ts` | `create`, `phase`, `for(scale)`, `play` |
| `apps/slot-client/.../slot-start-spin.system.ts` | `create` with reel `owner`, accelerate `reelComponent.speed` |

Host apps should store `TweenChain` references on components when systems need `stop()` or `switchToPhase()` later.


---
sidebar_position: 8
sidebar_label: "tween-service"
---

# Feature: `widgets/tween-service`

## What this feature does

The `tween-service` provides a phase-based GSAP animation orchestration layer synchronized with the `empr.es` ECS game loop. It decouples GSAP's native browser-driven ticker and binds animation progression exclusively to the deterministic `UpdateLoop`. The layered builders model (`TweenService → TweenChain → TweenPhase → TweenLane`) enables parallel multi-target animations within phases, sequential phase execution, named phase navigation, and automatic lifecycle cleanup tied to ECS entity ownership.

## Why this feature exists

By default, GSAP relies on the browser's `requestAnimationFrame` to advance its internal clock. In a strict ECS architecture, this creates a critical problem: animations run independently of the game state, breaking determinism, rendering the DVR (replay) system useless, and preventing global framework controls like pausing or slow-motion (bullet time).

Raw GSAP tweens do not know when an ECS entity is destroyed, leading to "ghost" animations that mutate dead objects and leak memory. Additionally, complex game sequences often require orchestrating multiple targets in parallel and chaining sequential phases with skip/jump capabilities — something a flat timeline API cannot express cleanly. This feature aligns GSAP with the framework's time step, memory management, and provides a structured orchestration model mirroring `SpineService` for consistent animation control across the entire stack.

## How it works

1. **Ticker Decoupling:** During initialization, `TweenService` removes GSAP's default ticker (`this._gsap.ticker.remove(this._gsap.updateRoot)`), forcing all animation advancement through the ECS loop.
2. **Chain Creation:** Developers create animation sequences via `tweenService.create(name, owner?)`. This returns a `TweenChain` in Building state. If an `owner` (e.g., an ECS Entity) is provided, the chain auto-stops when the owner is destroyed via `LifecycleTracker`.
3. **Phase & Lane Building:** Chains are configured with `.phase(configurator, options?)` calls. Inside the configurator callback, `scope.for(target)` creates a `TweenLane` for a specific object. Each lane queues sequential tweens via `.to()`, `.from()`, `.fromTo()`, `.set()`. All lanes within a phase run in parallel; phases themselves execute sequentially.
4. **Playback:** Calling `chain.play()` returns a Promise and begins sequential phase execution. Each phase materializes its lanes' GSAP timelines at `start()` time and resolves when all finite lanes complete.
5. **Deterministic Execution:** Every frame, the ECS `UpdateLoop` calls `tweenService.syncDeltaToFPS(gameTime)` passing absolute elapsed game time. The service calls `gsap.updateRoot(gameTime)`, advancing all active GSAP timelines deterministically.
6. **Auto-Cleanup:** When a chain completes naturally or is stopped, `finalize()` disposes all phases (which dispose all lanes, which kill their GSAP timelines), clears callback registrations, untracks the owner from `LifecycleTracker`, and removes the chain from the service registry.

## Interesting design decisions

### 1) Phase-Based Orchestration (Layered Builders)

The architecture follows a `TweenChain → TweenPhase → TweenLane` hierarchy, identical in structure to `SpineService`. Each layer has a single responsibility: the service manages the registry, the chain orchestrates phases sequentially, the phase runs lanes in parallel, and each lane manages a single GSAP timeline for one target.
_Result:_ Complex multi-target, multi-step animation sequences are expressed declaratively. Parallel animations within a phase and sequential phases are first-class concepts, eliminating manual Promise/callback wiring.

### 2) Forced Manual Time Propagation

Removing `this._gsap.updateRoot` from GSAP's internal ticker forces GSAP to become purely a mathematical interpolation engine driven exclusively by the ECS loop.
_Result:_ If the game logic slows down by 50%, all GSAP animations naturally slow down by exactly 50% without requiring separate API calls, preserving perfect state synchronization.

### 3) Deferred Timeline Materialization

Lane methods (`.to()`, `.from()`, etc.) store run descriptors but do **not** create GSAP tweens immediately. GSAP timelines are materialized only when `lane.start()` is called, with vars spread (`{ ...run.vars }`) to prevent GSAP from mutating stored descriptors.
_Result:_ Phases can be re-entered via `switchToPhase()` (jumping backward) with preserved original configuration, and the build phase is free from GSAP side effects.

### 4) Infinite Phase Blocking

If any lane in a phase contains a tween with `repeat: -1`, the lane is considered infinite. A phase with at least one infinite lane blocks forever until externally resolved via `skipCurrentPhase()`, `switchToPhase()`, or `stop()`.
_Result:_ Idle loops (breathing animations, pulsing glows) are expressed naturally within the phase model without special-case handling. External game events (user tap, server response) skip or jump past the infinite phase.

### 5) Non-Linear Phase Navigation

`switchToPhase(name)` sets a jump index and skips the current phase. The `play()` loop detects the jump flag after each phase resolves and adjusts the loop counter. Intermediate phases are not started or skipped — their `onPhaseComplete` callbacks do not fire.
_Result:_ Game sequences with conditional branching (e.g., skip intro, jump to decelerate on server response) are expressed without manual state machines.

### 6) Integrated Lifecycle Tracking

`create(name, owner)` registers a disposable with `LifecycleTracker`. When the owner entity is destroyed, `chain.stop()` fires automatically. On `finalize()`, the tracking entry is cleaned up via `untrack()`.
_Result:_ Dangling animations on destroyed entities are impossible. No manual cleanup code is required in gameplay systems.

### 7) Abstracted Velocity Math (`TweenUtils`)

GSAP inherently requires time (`duration`) to animate, but games often require constant speeds regardless of distance. `TweenUtils` bridges this gap with `timeForVec2Distance` and `timeForDistance`.
_Result:_ Gameplay systems express intent in pixels-per-second; the utility class converts to GSAP-compatible durations.

## Public contracts in this feature

- **Classes:**
    - `TweenService`: DI singleton registry. Factory for `TweenChain`. Drives GSAP root tick. Bulk operations (`pauseAll`, `resumeAll`, `stopAll`, `setTimeScale`).
    - `TweenChain`: Sequential phase orchestrator. Manages playback state, phase/chain callbacks, non-linear navigation, lifecycle tracking.
    - `TweenPhase`: Parallel lane container. Manages phase completion logic and infinite-lane detection. Exposed to consumers as the `scope` argument in `phase()` callbacks.
    - `TweenLane`: Sequential GSAP tween queue for one target. Builder API: `.to()`, `.from()`, `.fromTo()`, `.set()`.
    - `TweenUtils`: Stateless utility class providing distance-to-duration conversions.
- **Interfaces & Enums:**
    - `IPhaseOptions`: Phase configuration (optional `name` for navigation).
    - `ITweenServiceRef`: Minimal service interface for chain→service communication (avoids circular imports).
    - `ITweenRunDescriptor`: Pure data object describing a single tween run within a lane.
    - `EChainState`, `EPhaseState`, `ELaneState`: Const enums for internal state machines.

## Current scope and boundaries

- **In Scope:** GSAP ticker control, phase-based animation orchestration, multi-target parallel lanes, sequential phase execution, named phase navigation, phase skipping, infinite animation handling, lifecycle-bound auto-cleanup, global and per-chain playback control (pause/resume/timeScale/stop), and speed-to-duration conversions.
- **Out of Scope:** Rendering or manipulating PixiJS objects directly. `TweenService` manages abstract numeric interpolation; GSAP handles property mutations on whatever objects are passed into lane configurations.
- **Out of Scope:** Standalone singular tweens (e.g., direct `gsap.to()` calls). The public contract enforces the use of `create()` → `phase()` → `play()` for tracking and cleanup purposes.


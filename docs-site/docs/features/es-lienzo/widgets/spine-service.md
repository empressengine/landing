---
sidebar_position: 6
sidebar_label: "spine-service"
---

# Feature: `widgets/spine-service`

## What this feature does

The `spine-service` widget provides centralized, phase-based orchestration for `@esotericsoftware/spine-pixi-v7` animations. It introduces a hierarchical `SpineChain → SpinePhase → SpineLane` model that supports parallel animation of multiple Spine instances within a single phase, sequential phase progression, multi-track playback via separate lanes, named phases with non-linear navigation (jump/skip), and slot object management at both chain and lane levels. Per-run configuration is handled through a fluent `SpineRunOptions` builder with callbacks for all Spine track events.

## Why this feature exists

Using raw `@esotericsoftware/spine-pixi-v7` requires tedious callback management for sequential and parallel animations and inherently ties playback to the browser's `requestAnimationFrame` loop. This breaks ECS determinism, making framework features like game pausing, slow-motion, and DVR replays impossible.

This feature exists to decouple the animation tick from the native renderer, driving it manually via the ECS `UpdateLoop`. Additionally, it integrates directly with the `LifecycleTracker` to prevent dangling event listeners and memory leaks when the owning ECS entities are destroyed mid-animation.

The v2 rewrite replaces the flat sequential chain model (`add → add → play`) with a phase-based orchestration model, enabling complex scenarios like slot reel spinning (named phase navigation), cutscenes (parallel multi-character animation), and multi-track overlays (body + face expressions on separate tracks).

## How it works

1. **Creation:** A developer calls `spineService.create(name, owner)` to initialize a `SpineChain`. If an `owner` (like an ECS Entity) is provided, the chain registers a `Disposable` cleanup function with the `LifecycleTracker` internally in its constructor.
2. **Phase Building:** Phases are added via `chain.phase((scope) => { ... }, { name? })`. Inside the configurator callback, the `scope` (`SpinePhase`) exposes `for(spine, options?)` to create parallel `SpineLane` instances. Each lane targets one Spine on one track.
3. **Run Queuing:** Within a lane, animations are queued via `lane.run(animationName, configurator?)`. The optional configurator receives a `SpineRunOptions` builder for per-run configuration (timeScale, loopCount, mixDuration, delay, event callbacks). Each call produces an `ISpineRunDescriptor` containing a `DeferredPromise`, appended to the lane's internal run queue.
4. **Playback:** Calling `chain.play()` initiates an asynchronous `for` loop over phases. Each phase starts all its lanes in parallel. For each lane, a `SpineLaneListener` is created per run and registered as an `AnimationStateListener` to intercept native Spine events and route them to per-run callbacks.
5. **Execution Synchronization:** Every frame, the overarching game loop calls `spineService.update(dt)`. The service iterates through all active chains, which delegate to the current phase. The phase deduplicates Spine instances (via a pre-allocated `Set<Spine>`) to ensure each Spine is updated exactly once per frame, then calls `spine.update(dt)` to advance the animation deterministically.
6. **Phase Completion:** A phase completes when all finite lanes (no `loop(-1)`) have finished. If any lane contains an infinite animation, the phase blocks until externally skipped (`skipCurrentPhase()`, `switchToPhase()`, or `stop()`). Phase completion fires `onPhaseComplete` callbacks and unblocks the `play()` loop.
7. **Phase Navigation:** `switchToPhase(name)` sets a `_jumpToPhaseIndex` and skips the current phase. The `play()` loop detects the jump index and adjusts the iteration counter. Intermediate phases are not started or skipped — their callbacks do not fire.
8. **Resolution & Cleanup:** After all phases complete, chain-level `onChainComplete` callbacks fire and `finalize()` runs. Finalization disposes all phases (which dispose all lanes, which cleanup listeners and slot attachments), removes chain-level slot objects, clears callback references, untracks the owner, and removes the chain from `SpineService`. Finalization is idempotent — safe to call from both `play()` tail and `stop()`.

## Interesting design decisions

### 1) Three-Level Hierarchy (Chain → Phase → Lane)

The architecture follows a layered builders pattern. Each layer has a single responsibility: `SpineChain` orchestrates phases sequentially, `SpinePhase` manages parallel lanes, `SpineLane` handles sequential run queuing per Spine/track.
_Result:_ Clean separation of concerns. Complex scenarios (parallel spines, multi-track, phase navigation) compose naturally without combinatorial complexity.

### 2) Phase-Based Parallel Animation

Multiple `for()` calls inside a single phase create parallel lanes. This is the only way to run multiple Spine instances simultaneously within a chain.
_Result:_ Cutscenes with multiple characters animating in sync. Slot games with multiple reels spinning in parallel. Multi-track overlays (body animation + face expression on different tracks of the same Spine).

### 3) Named Phase Navigation

Phases can be named and jumped to via `switchToPhase(name)`. Intermediate phases between current and target are never started or skipped.
_Result:_ Non-linear animation flows for interactive scenarios. Slot reels: `spin_start → spin_loop (infinite) → spin_stop`, where `switchToPhase('stop')` is called when the server response arrives.

### 4) Infinite Phase Blocking

If any lane in a phase has `loop(-1)`, the entire phase blocks until externally skipped. Finite lanes complete normally but do not auto-advance the phase.
_Result:_ Idle loops ("stay here until something happens") work naturally. The consumer controls when to move on.

### 5) GC-Free Update Deduplication

`SpinePhase.update(dt)` deduplicates Spine instances via a pre-allocated `Set<Spine>` that is `.clear()`-ed each frame (not re-created). This ensures each Spine is updated exactly once even when multiple lanes target it on different tracks.
_Result:_ Zero garbage collection pressure in the hot path. Correct behavior for multi-track scenarios.

### 6) Callback-Style Sub-Builder (`SpineRunOptions`)

Per-run configuration uses a callback pattern: `.run('walk', (o) => { o.timeScale(1.5).loop(3) })`. This matches the `TreeBuilder` / `View` API style already used in the framework.
_Result:_ Discoverable, type-safe configuration. IDE autocompletion shows all available options. Consistent API patterns across the framework.

### 7) SRP Extraction — `SpineLaneListener`

The `AnimationStateListener` implementation is extracted into a dedicated `SpineLaneListener` class, created fresh for each run. It filters events by `entry.trackIndex` to handle only its own track.
_Result:_ Clean separation — `SpineLane` manages sequencing and lifecycle, `SpineLaneListener` handles event routing. Neither class has mixed responsibilities. Track filtering prevents cross-lane event leakage.

### 8) Manual ECS Time Propagation

The lane explicitly forces `spine.autoUpdate = false` when starting, taking over the time-stepping responsibility via the `update(dt)` method.
_Result:_ Animations strictly obey the deterministic game loop. This enables framework-level features like `multiplyTimeScaleAll` for global slow-motion ("bullet time") or frame-perfect pausing.

### 9) `ISpineServiceRef` Interface for Circular Dependency Avoidance

`SpineChain` depends on `SpineService` (for `remove()` in `finalize()`), but `SpineService` creates `SpineChain`. Instead of a circular import, `SpineChain` depends on the minimal `ISpineServiceRef` interface defined in `spine.types.ts`.
_Result:_ Clean dependency graph with no circular imports. `SpineService` implicitly implements the interface.

### 10) Slot Object Management at Two Levels

Chain-level slots (`chain.attachToSlot()`) persist for the entire chain lifecycle. Lane-level slots (`lane.attachToSlot()`) are scoped to the lane's duration. Both use the official `spine.addSlotObject()` / `spine.removeSlotObject()` API.
_Result:_ Flexible attachment scoping. A sword attached for the whole chain vs. a spark effect only during an attack phase.

## Public contracts in this feature

- **Classes:**
    - `SpineService`: DI-injectable registry and tick driver for all chains. Exposes `SpineService.getDuration(spine, animationName)` — a static utility that returns the duration (in seconds) of a named animation from a Spine instance's skeleton data, returning `0` if the animation is not found.
    - `SpineChain`: Phase orchestrator with fluent builder API, navigation, and lifecycle management.
    - `SpinePhase`: Parallel lane manager with deduplication and completion logic.
    - `SpineLane`: Sequential animation queue per Spine/track with slot attachment support.
    - `SpineRunOptions`: Fluent sub-builder for per-run configuration (timeScale, loop, mix, events).
- **Internal classes (not exported):**
    - `SpineLaneListener`: Routes `AnimationStateListener` events to per-run callbacks.
- **Interfaces & Types:**
    - `ISpineRunDescriptor`: Internal representation of a single animation run.
    - `IRunEventCallbacks`: Collection of event callbacks for a run.
    - `ISlotAttachment`: Describes a PixiJS container attached to a Spine slot.
    - `IPhaseOptions`: Configuration for named phases.
    - `ILaneOptions`: Configuration for lane track and skin.
    - `ISpineServiceRef`: Minimal interface consumed by `SpineChain` to avoid circular imports.
    - `SpineTrackCallback`: Callback signature for track entry events.
    - `SpineEventCallback`: Callback signature for custom Spine events.
    - `EChainState`, `EPhaseState`, `ELaneState`: State machine enums.

## Current scope and boundaries

- **In Scope:** Phase-based orchestration of Spine animations, parallel and sequential playback, multi-track support, named phase navigation (jump/skip), per-run and per-chain event subscriptions, managing global/local timescale modifiers, binding animation lifecycles to ECS entities, propagating deterministic frame updates, skin application via lane options, slot object management at chain and lane levels.
- **Out of Scope:** Loading and parsing Spine assets (`.json`, `.atlas`, `.png`). Asset management is strictly the responsibility of `AssetsStorage` in the `features` layer.
- **Out of Scope:** Rendering the skeletons. The service only manipulates the internal logic and time of the `Spine` object; the actual WebGL drawing is handled by `PixiJS` and mapped to the ECS via `PixiEntity`.
- **Out of Scope:** Consumer migration in `apps/` (slot-client, slot-cd-client). These files still use the old `pixi-spine` imports and will be migrated in a separate plan.


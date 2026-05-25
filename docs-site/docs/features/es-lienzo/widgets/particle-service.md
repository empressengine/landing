---
sidebar_position: 3
sidebar_label: "particle-service"
---

# Feature: `widgets/particle-service`

## What this feature does

The `particle-service` is a high-performance controller that natively wraps the external `@pixi/particle-emitter` library. It centralizes the instantiation, caching, and lifecycle management of particle emitters, ensuring their animations are updated synchronously with the framework's overarching time step.

## Why this feature exists

In a deterministic ECS architecture, relying on the browser's native `requestAnimationFrame` for visual effects breaks synchronization, replays (DVR), and global time scaling.

If developers manually instantiated raw `pixi-particles` emitters, they would be forced to write boilerplate update loops for every effect. The `ParticleService` solves this by providing a unified registry where emitters are tracked by string identifiers and updated via a single, centralized `update(dt)` method that is perfectly synchronized with the game's `UpdateLoop`.

## How it works

1. **Instantiation & Caching:** A developer calls `createParticleEmitter(name, parent, config)`. The service passes the target PixiJS `Container` and JSON configuration to the underlying `particles.Emitter` constructor, then caches the resulting instance in a local `_emitters` Map using the provided `name` as the key.
2. **Activation:** To trigger the visual effect, logic layers call `emit(name)` (or `emitAll()`), which accesses the cached emitter from the dictionary and toggles its internal `emit` flag to `true`.
3. **Synchronized Execution:** Every frame, the overarching game loop calls the service's `update(dt)` method, passing the fractional delta time (`dt`). The service iterates through the entire `_emitters` registry, propagating the exact delta time to every active particle system simultaneously.

## Interesting design decisions

### 1) Centralized Delta Time Propagation

Instead of allowing emitters to self-update based on system clocks, the service exposes a singular `update(dt)` function.
_Result:_ This completely decouples particle rendering from real-world time, enforcing strict ECS determinism. If the game pauses or enters slow motion, the particles naturally obey because the propagated `dt` scales accordingly.

### 2) String-Based Registry

Emitters are stored in a `Map<string, any>` rather than forcing systems to retain direct class references.
_Result:_ Disparate game systems can trigger visual effects (e.g., `particleService.emit('explosion_01')`) without needing to know where the emitter was created or managing its memory reference, promoting loose coupling.

### 3) Facade Pattern for Activation

The service provides `emit(name)` and `emitAll()` to forcefully toggle particle generation.
_Result:_ It abstracts away the specific API of the third-party `@pixi/particle-emitter` library, providing a clean "fire and forget" interface for gameplay programmers who do not need to interact directly with the underlying Pixi structures.

## Public contracts in this feature

- **Classes:**
    - `ParticleService`: The global controller managing the registry and lifecycle of particle emitters.

## Current scope and boundaries

- **In Scope:** Compiling `pixi-particles` JSON configurations into active emitters, tracking them via a string-based dictionary, globally advancing their animation states via an injected delta time, and toggling their active emission state.
- **Out of Scope:** Particle configuration design. The service does not know _what_ the particles look like; it blindly passes the `config: any` payload to the external library.
- **Out of Scope:** Automatic memory cleanup. Based on the provided public contract, there is no inherent `remove` or `destroy` method for individual emitters within the service; they are cached indefinitely for reuse.


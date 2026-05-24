---
sidebar_position: 1
sidebar_label: "empr"
---

# Feature: `bootstrap/empr-lienzo`

## What this feature does

The `empr-lienzo` module, centered around the `EmprLienzo` class, serves as the high-level concrete entry point for applications using the PixiJS rendering stack. It extends the agnostic `Empr` core to integrate a comprehensive suite of visual services—including GSAP animations, Spine rigs, and particle emitters—and synchronizes their execution with the deterministic ECS game loop.

## Why this feature exists

While the framework core is designed to be renderer-agnostic, real-world development requires a robust bridge to a specific graphics engine. `EmprLienzo` solves this by:

1.  **Centralizing Orchestration:** It automates the boilerplate of attaching the PixiJS canvas to the DOM and registering visual services into the global Dependency Injection (DI) container.
2.  **Enforcing Temporal Determinism:** It decouples third-party libraries (GSAP, PixiJS, Spine) from the browser's native `requestAnimationFrame` and binds them to the framework's internal `UpdateLoop`.
3.  **Bootstrapping the Visual Stack:** It ensures that all cross-layer connections—such as mapping user inputs to ECS Pipelines or linking the scene graph to visual layers—are configured before the simulation starts.

## How it works

1.  **Construction:** Upon instantiation, the class registers the `Application` in DI, appends the canvas to a parent element, and connects to Pixi DevTools for debugging.
2.  **Service Registration:** When `init()` is called, it overrides `registerServices()` to instantiate and register all high-level widgets (e.g., `InteractionService`, `TweenService`, `SpineService`, `PixiPools`) and features (e.g., `TreeBuilder`, `Scene`).
3.  **Dependency Wiring:** It resolves core services like the `UpdateLoop` and wires them to the rendering services.
4.  **Loop Synchronization:** The class hooks into `onUpdate` to manually trigger particle updates, GSAP root ticks via `syncDeltaToFPS`, and Spine updates before explicitly calling `pixi.renderer.render()`.
5.  **Lifecycle Propagation:** It captures `onPause`, `onResume`, and `onSpeedChange` events from the game loop and propagates them to visual controllers to maintain perfect synchronization between state and graphics.

## Interesting design decisions

### 1) Manual Render Cycle Control

Unlike standard PixiJS implementations that use an internal ticker, `EmprLienzo` calls `renderer.render()` manually inside the framework's `onUpdate` hook.
_Result:_ This ensures the screen only updates after all ECS systems have finalized their state for the frame, enabling frame-perfect determinism and consistent behavior during DVR replays.

### 2) Ticker Hijacking for Animations

The bootstrap passes the GSAP instance to `TweenService`, which forcefully removes GSAP's default ticker.
_Result:_ GSAP becomes a pure mathematical interpolation engine driven by the ECS loop. This allows all UI animations to naturally obey framework-level slow-motion or pause commands without additional logic.

### 3) Integrated Platform Initialization

The class explicitly initializes the `ResizerService` and `InteractionService` during the bootstrap sequence.
_Result:_ This guarantees that the application is responsive to window resizes and user inputs from the very first frame, even before the first game scene is loaded.

### 4) DI-Centric Registry

Every visual and utility service (e.g., `PrefabService`, `SpineUtils`, `PixiPools`) is registered globally via the dependency container.
_Result:_ This maintains a clean architectural hierarchy where any component or system in lower layers can simply `inject()` a service without having to know about the top-level `EmprLienzo` implementation.

## Public contracts in this feature

- **Classes:**
    - `EmprLienzo`: The primary bootstrap and orchestration class.
- **Methods:**
    - `init()`: Prepares the service graph and wires update loop hooks.
    - `start()`: Inherited from `Empr`; ignites the main execution loop.

## Current scope and boundaries

- **In Scope:** DOM integration, PixiJS application lifecycle, global service registration for the visual stack, manual render loop orchestration, and cross-service time synchronization.
- **Out of Scope:** Specific game logic, asset manifest definitions, or scene content. `EmprLienzo` is a structural "glue" layer and does not contain gameplay rules.
- **Out of Scope:** Low-level WebGL context management. It manages the `Application` wrapper but delegates the actual drawing logic to PixiJS.


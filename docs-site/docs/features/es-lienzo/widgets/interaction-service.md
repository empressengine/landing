---
sidebar_position: 1
sidebar_label: "interaction-service"
---

# Feature: `widgets/interaction-service`

## What this feature does

The `interaction-service` is a high-performance, reactive global bridge that maps native Canvas pointer interactions (from PixiJS) directly to execution flows registered on `ExecutionRegistry`. It acts as an automated listener manager, binding and unbinding raw browser events based dynamically on the presence of specific ECS Components on an entity.

## Why this feature exists

In a strict ECS architecture, managing UI inputs can easily lead to spaghetti code and memory leaks. Developers typically have to manually track when a visual node is created to add an `on('click')` listener, and crucially, remember to remove that listener when the node is destroyed or changes state.

This widget exists to solve the "dangling listener" problem. By treating user input as just another ECS state change, developers can map a `PixiEventType` (like `pointerdown`) to a specific Component requirement. The service handles the complex lifecycle management securely under the hood, ensuring zero memory leaks while seamlessly injecting user inputs into the execution registry configured for the host application.

## How it works

1. **Initialization:** Upon `init()`, the service hooks into the global ECS framework signals `OnEntityAddComponentSignal` and `OnEntityRemoveComponentSignal`.
2. **Registration:** A developer defines an interaction via `listen(Component, PixiEventType, factory)` where `factory` matches the host app's `ISFlowAliasType` / `LienzoTypeRegistry` typing. The service caches this blueprint and immediately back-checks the `EntityIndexator` to attach listeners to any currently existing entities possessing that component.
3. **Dynamic Binding:** When a targeted component is added to an entity, the service locates the entity's underlying Pixi `Container`, upgrades its `eventMode` to `'static'`, sets the `cursor` to `'pointer'`, and attaches a native Pixi dispatcher.
4. **Execution Delegation:** When a user clicks or touches the canvas, the native Pixi event triggers the internal dispatcher. The service verifies the entity still holds the required component, then calls `ExecutionRegistry.create` / `run` on the registry supplied via `setExecutionRegistry` (typically `Executor` + `ExecutorComposerRegistry` from `@empr/es-sistema`, or `ExecutorOrchestratorRegistry` from `@empr/es-componente`).
5. **Automatic Cleanup:** The moment the targeted component is removed from the entity, the service intercepts the signal, calls `container.off` to detach the listener, and cleans up its internal caching registries.

## Interesting design decisions

### 1) WeakMap Caching for Safe GC

The service utilizes `WeakMap` objects internally to track `_entityEventDispatchers` and `_entityComponentSubscriptions` keyed by the `IEntity` itself.
_Result:_ It natively prevents catastrophic Garbage Collection (GC) leaks. If an entity is destroyed or lost outside the expected lifecycle, the interaction records vanish automatically without holding ghost references in memory.

### 2) Registry-driven execution instead of callbacks

Instead of allowing loose JavaScript callbacks for button clicks, the service enforces mapping interactions to the same **flow factory** type used elsewhere (`PipelineFactory` when on `@empr/es-sistema`, `OrchestratorType` when on `@empr/es-componente` — see app-level `.d.ts` augmentations).
_Result:_ This bridges the unpredictable nature of user inputs into the same deterministic execution path as FSM transitions and signal-driven flows. Any observability you add on top of pipeline lifecycle signals applies uniformly.

### 3) Signal-Reactive Architecture

The service relies entirely on `OnEntityAdd/RemoveComponentSignal` rather than manual polling or user-invoked refresh functions.
_Result:_ Absolute separation of concerns. Game logic can simply strip a `ClickableComponent` from an entity to disable it, and the visual Pixi listener will detach automatically without the game logic ever knowing that PixiJS exists.

### 4) Automatic UI State Reversion

When the final interactive component is stripped from an entity, the service automatically downgrades the Pixi container's `cursor` and `eventMode` back to `'auto'`.
_Result:_ It eliminates boilerplate code, dynamically resetting standard browser pointer behaviors when UI elements become disabled.

## Public contracts in this feature

- **Classes:**
    - `InteractionService`: The primary global singleton handling event orchestration.
- **Interfaces & Types:**
    - `IListener`: Defines a dictionary of pipeline factories indexed by event types.
    - `InteractionProps`: An alias outlining the standard payload criteria passed to pipelines triggered by UI interactions.
    - `IInteraction`: The execution payload containing the event `type` and the targeted `PixiEntity`.
    - `PixiEventType`: A comprehensive string union of valid browser native pointer interactions.

## Current scope and boundaries

- **In Scope:** Listening to standard Canvas pointer actions (`PixiEventType`), managing Pixi container interactivity states (`cursor`, `eventMode`), tracking component lifecycles, and triggering flows through whatever `ExecutionRegistry` the host app wired (ECS or component-driven).
- **Out of Scope:** Keyboard inputs, Gamepad tracking, or OS-level events. This widget is strictly purposed for Canvas-level object pointer interactions.
- **Out of Scope:** Component logic. The service does not know _what_ the pipeline does or _what_ the component means. It merely executes the provided factory when the component requirement is met.


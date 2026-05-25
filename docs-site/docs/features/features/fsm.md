---
sidebar_position: 1
sidebar_label: "fsm"
---

# Feature: `features/fsm`

## What this feature does

The `fsm` (Finite State Machine) module is a high-level orchestration engine that drives the application flow based on reactive state changes. Unlike traditional imperative state machines, this implementation is **data-driven**: it monitors a reactive `Store` and automatically triggers transitions when specific data conditions are met.

It features a fluent `FSMBuilder` for complex configuration, supports hierarchical (nested) sub-FSMs with shared context, and integrates directly with the active **`ExecutionRegistry`** (from `@empr/es-sistema` or `@empr/es-componente`) to run configured flows during state entry and exit.

## Why this feature exists

Managing high-level game states (e.g., `Boot` -> `Loading` -> `Menu` -> `Gameplay`) manually inside Systems leads to "spaghetti code" where logic is riddled with `if (state === ...)` checks.

The FSM module solves several architectural challenges:

1. **Separation of Concerns:** Systems remain focused on data mutation, while the FSM handles the "big picture" flow.
2. **Reactive Flow Control:** By tying transitions to the `Store`, the FSM ensures that the visual/logic state is always a pure reflection of the underlying data.
3. **Hierarchical Complexity:** Sub-FSMs allow breaking down complex behaviors into smaller, manageable chunks (e.g., a "Gameplay" state having its own sub-states like "Paused", "Inventory", "Combat") without losing access to the parent's data.
4. **Lifecycle Safety:** It provides a deterministic bridge for cleaning up resources between states via enter/exit pipelines.

## How it works

1. **Configuration:** A developer uses `FSMBuilder` to define states, transition conditions (`condition: (state, prev) => boolean`), and execution logic (`onEnter`, `onExit`).
2. **Subscription:** Upon calling `.start()`, the FSM subscribes to its bound `Store`.
3. **Reactive Evaluation:** Every time the store updates, the FSM evaluates the transition rules for the current active state.
4. **Transition Lifecycle:** If a condition is met:
    - **Exit Phase:** The FSM invokes the current state's `onExit` logic. That work is scheduled through the shared `ExecutionRegistry` (same registry used by `SignalService` / Pixi interactions).
    - **Switch Phase:** The internal state identifier changes. If the new state is a sub-FSM factory, it is resolved (potentially asynchronously).
    - **Enter Phase:** The FSM invokes the new state's `onEnter` logic, passing a `TransitionContext` containing the `from`/`to` names and current store data.
5. **Sub-FSM Resolution:** If a state is defined as another FSM, the parent FSM handles the transition into the child machine, automatically passing the `Store` context down.
6. **Disposal:** Since it implements `IContextDisposable`, the FSM emits an `onDestroy` signal when closed, ensuring all internal store subscriptions and pending transitions are terminated.

## Interesting design decisions

### 1) Data-Driven Transition Logic

Transitions are not triggered by method calls like `fsm.changeState('Menu')`. Instead, they are defined by predicates that observe the `Store`.
_Result:_ This creates a unidirectional data flow. To change the game state, you simply update the data in the store. That makes higher-level flows easier to reason about and pairs naturally with custom tooling built on top of pipeline signals from `@empr/es-sistema`.

### 2) Hierarchy with Context Sharing

When a sub-FSM is created within a state, it receives the parent's `Store` reference.
_Result:_ Child states can react to the same global data as the parent without the developer having to manually pass references or re-inject dependencies, enabling deeply nested, yet clean architectures.

### 3) Shared Context for Asynchronous Factories

The `FSMAsyncFactory` allows states to be resolved via async functions.
_Result:_ This enables "Lazy Loading" of game states. You can define a state that points to a sub-FSM in a separate JS bundle, which is only downloaded and initialized when the transition actually occurs.

### 4) Pipeline-First Execution

State enter/exit logic is not written as raw functions but as flow factories (`PipelineFactory` when using `@empr/es-sistema`, or the orchestrator factories used with `@empr/es-componente`).
_Result:_ State transitions are processed through the same execution machinery as signal-driven or input-driven flows, so pause/stop semantics stay consistent across the app.

## Public contracts in this feature

- **Interfaces:** `IFSM`, `IFSMBuilder`, `IStateConfig`, `ITransitionData`, `TransitionContext`.
- **Classes:** `FSM`, `FSMBuilder`, `FSMService`.
- **Signals:** `OnStateEnterSignal`, `OnStateExitSignal`, `OnTransitionStartSignal`, `OnTransitionEndSignal`.

## Current scope and boundaries

- **State Persistence:** The FSM itself is stateless; it relies entirely on the provided `Store` to determine what state it should be in.
- **Orchestration Only:** The FSM module does not contain game-specific logic. It only manages the _timing_ and _sequencing_ of when specific pipelines (provided by the `app` layer) are executed.
- **Dependency:** It strictly requires a `Store` to operate. It cannot function as a standalone imperative state machine without a reactive data source.


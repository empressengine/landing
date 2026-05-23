# Game Flow with FSM

## What is FSM?

Inside `empr.es`, FSM (Finite State Machine) is the primary tool for modeling high-level runtime flow.

An FSM describes:

- which runtime state is currently active,
- which transitions are allowed,
- what should happen when entering or leaving a state,
- and how runtime execution should progress over time.

Conceptually:

```txt
Current State
        ↓
Transition
        ↓
Next State
```

In gameplay architecture, FSM is responsible for controlling major runtime phases such as:

```txt
Loading
Init Scene
Idle
Spin
Stop
Present Win
Bonus
Recovery
Reconnect
```

Instead of allowing runtime flow to emerge implicitly from callbacks, timers and renderer events, `empr.es` keeps game flow explicit through state transitions.

---

# Why Game Flow Should Be Explicit

Most browser game projects begin with relatively simple runtime flow:

```txt
Start game
    ↓
Wait for input
    ↓
Play animation
```

Over time the runtime usually becomes significantly more complicated:

```txt
Loading
    ↓
Scene Init
    ↓
Idle
    ↓
Spin
    ↓
Wait For Result
    ↓
Stop
    ↓
Evaluate Win
    ↓
Present Win
    ↓
Bonus
    ↓
Recovery
```

Without explicit runtime flow control, these states are often represented through:

- boolean flags,
- nested callbacks,
- timers,
- renderer events,
- async chains,
- and scattered runtime conditions.

For example:

```typescript
if (
    isLoading &&
    !isSpinning &&
    !isPresentingWin &&
    !isRecovering
) {
    startSpin();
}
```

Eventually runtime behavior becomes difficult to reason about because flow is spread across unrelated systems.

Questions become difficult to answer:

```txt
Can the player spin right now?
Why did stop logic trigger twice?
Can reconnect happen during bonus?
What happens if result arrives during transition?
Which state owns this execution?
```

FSM exists to solve this problem.

---

# FSM as Explicit Runtime Flow

FSM transforms runtime flow into a visible architectural structure.

Instead of:

```txt
Random flags and callbacks
```

the architecture becomes:

```txt
Loading
    ↓
Init Scene
    ↓
Idle
    ↓
Spin
    ↓
Stop
    ↓
Present Win
    ↓
Idle
```

This makes runtime progression:

- explicit,
- inspectable,
- deterministic,
- and easier to debug.

One of the main architectural goals of `empr.es` is that game flow should always remain understandable from outside the runtime objects themselves.

---

# Where FSM Lives in the Architecture

FSM belongs to the core runtime layer of `@empr/es`.

Conceptually:

```txt
Signal
        ↓
FSM Transition
        ↓
ExecutionRegistry / Executor
        ↓
Pipeline
        ↓
Systems
```

FSM itself is renderer-agnostic.

It does not depend on:

- PixiJS,
- scene objects,
- DOM events,
- or browser-specific runtime infrastructure.

This is important because gameplay flow should remain portable independently from rendering technology.

---

# States

A State represents a named runtime phase.

Conceptually:

```typescript
enum GameState {
    Loading,
    InitScene,
    Idle,
    Spin,
    Stop,
    PresentWin,
}
```

Only one state is usually active at a time.

The active state defines:

- what runtime behavior is allowed,
- what execution may start,
- which listeners are active,
- and what transitions are valid.

---

# Example Runtime Flow

Typical slot runtime flow:

```txt
Loading
    ↓
Init Scene
    ↓
Idle
    ↓
Spin
    ↓
Stop
    ↓
Present Win
    ↓
Idle
```

This runtime structure immediately communicates:

- how gameplay progresses,
- which phases exist,
- and how execution is organized.

This is significantly easier to reason about than scattered flags and callbacks.

---

# Transitions

Transitions describe how the runtime moves between states.

Conceptually:

```txt
Idle → Spin
Spin → Stop
Stop → Present Win
Present Win → Idle
```

Transitions define legal runtime movement.

For example:

```txt
Idle → Spin
```

may be valid, while:

```txt
Loading → Present Win
```

may not be.

This prevents invalid runtime execution from happening accidentally.

---

# Example — Defining Transitions

Conceptual example:

```typescript
fsm.addTransition(
    GameState.Idle,
    GameState.Spin,
);

fsm.addTransition(
    GameState.Spin,
    GameState.Stop,
);

fsm.addTransition(
    GameState.Stop,
    GameState.PresentWin,
);
```

The important architectural detail is that allowed runtime flow becomes centralized and visible.

---

# Guards

Guards are conditions that decide whether a transition is allowed.

Conceptually:

```txt
Attempt transition
        ↓
Guard checks conditions
        ↓
Transition allowed or blocked
```

This is useful when runtime flow depends on gameplay state.

---

# Example — Spin Guard

Conceptual example:

```typescript
fsm.addTransition(
    GameState.Idle,
    GameState.Spin,
    {
        guard: () => {
            return balance >= currentBet;
        },
    },
);
```

Now the runtime explicitly knows:

```txt
Spin transition requires enough balance
```

instead of hiding this logic inside unrelated callbacks.

---

# Enter Hooks

States may perform execution when entered.

Conceptually:

```txt
Enter State
        ↓
Run initialization logic
        ↓
Start execution flow
```

This is commonly used for:

- starting pipelines,
- enabling listeners,
- spawning runtime entities,
- starting animations,
- or registering temporary runtime ownership.

---

# Example — Enter Hook

Conceptual example:

```typescript
fsm.onEnter(
    GameState.Spin,
    async () => {
        await executor.run(
            startSpinPipeline,
        );
    },
);
```

This creates explicit state-driven orchestration.

Instead of:

```txt
Animation callback starts gameplay
```

the architecture becomes:

```txt
FSM enters Spin
        ↓
Pipeline executes
```

This separation is one of the core design goals of `empr.es`.

---

# Exit Hooks

States may also clean up runtime behavior when leaving.

Conceptually:

```txt
Exit State
        ↓
Dispose listeners
        ↓
Release runtime ownership
        ↓
Stop temporary execution
```

This is extremely important for:

- temporary gameplay systems,
- bonus rounds,
- overlays,
- reconnect flows,
- and async execution ownership.

---

# Example — Exit Hook

Conceptual example:

```typescript
fsm.onExit(
    GameState.Bonus,
    () => {
        bonusLifecycle.dispose();
    },
);
```

This keeps temporary runtime behavior safely bounded to the state lifecycle.

---

# FSM and Pipelines

One of the most important architectural patterns in `empr.es` is:

```txt
FSM controls flow
        ↓
Pipelines execute ordered work
```

FSM decides:

```txt
What state are we in?
What transition happened?
```

Pipelines decide:

```txt
What exact execution sequence should run?
```

---

# Example — State-driven Pipeline Execution

Conceptual example:

```typescript
fsm.onEnter(
    GameState.Stop,
    async () => {
        const id = await executor.create(
            stopPipeline,
            {},
            'FSM',
            'stop-flow',
        );

        await executor.run(id);
    },
);
```

This creates explicit runtime orchestration:

```txt
FSM Transition
        ↓
Pipeline
        ↓
Systems
        ↓
Entities + Components
```

instead of:

```txt
Renderer callback
        ↓
Hidden side effects
```

---

# FSM and Signals

Signals frequently initiate FSM transitions.

Conceptually:

```txt
SpinRequestedSignal
        ↓
FSM transition Idle → Spin
        ↓
startSpinPipeline executes
```

or:

```txt
ResultReceivedSignal
        ↓
FSM transition Spin → Stop
        ↓
stopPipeline executes
```

This separation creates very clean architecture boundaries:

- Signals communicate events,
- FSM controls allowed flow,
- Pipelines orchestrate execution,
- Systems perform runtime work.

Each layer has a clear responsibility.

---

# Example — Signal-driven Transition

Conceptual example:

```typescript
spinRequestedSignal.listen(async () => {
    await fsm.transition(
        GameState.Spin,
    );
});
```

Now runtime flow becomes centralized instead of scattered across input handlers and renderer callbacks.

---

# FSM and Async Flow

FSM is especially valuable in asynchronous gameplay architecture.

Many runtime phases involve async operations:

- server requests,
- transitions,
- animations,
- reconnect flow,
- asset loading,
- and delayed runtime execution.

Without FSM, async flow often becomes deeply nested:

```txt
Animation callback
    ↓
Promise chain
    ↓
Another callback
    ↓
Condition flags
```

FSM keeps runtime progression explicit even while async work occurs.

---

# Example — Async Transition Flow

Conceptual example:

```typescript
fsm.onEnter(
    GameState.Loading,
    async () => {
        await assets.load();

        await fsm.transition(
            GameState.InitScene,
        );
    },
);
```

The runtime flow remains visible:

```txt
Loading
    ↓
Init Scene
```

instead of being hidden inside asynchronous renderer logic.

---

# FSM vs Boolean Flags

One of the biggest architectural advantages of FSM is replacing fragmented runtime flags.

Consider this approach:

```typescript
if (
    !isLoading &&
    !isSpinning &&
    !isStopping &&
    !isPresentingWin
) {
    startSpin();
}
```

This eventually becomes extremely fragile.

Now compare that to:

```typescript
if (
    fsm.currentState ===
    GameState.Idle
) {
    await fsm.transition(
        GameState.Spin,
    );
}
```

The runtime becomes significantly easier to understand.

FSM centralizes runtime truth instead of distributing it across unrelated booleans.

---

# FSM and Runtime Ownership

FSM states often act as ownership boundaries.

For example:

```txt
Enter Bonus State
        ↓
Register listeners
        ↓
Create temporary systems
        ↓
Exit Bonus State
        ↓
Dispose everything
```

This creates predictable lifecycle management.

Without explicit state ownership, temporary runtime behavior frequently leaks across gameplay phases.

---

# FSM and Observability

Explicit FSM flow dramatically improves runtime observability.

The runtime can track:

```txt
Current state
Previous state
Transition history
Failed transitions
Transition duration
State-owned execution
```

This becomes extremely valuable for:

- debugging,
- telemetry,
- replay tooling,
- QA,
- and production diagnostics.

One of the main design goals of `empr.es` is that runtime flow should remain inspectable instead of hidden inside callbacks.

FSM is central to that philosophy.

---

# Common Mistakes

## Using FSM for Tiny Local Logic

FSM works best for high-level runtime flow.

Small isolated object state often does not require full FSM orchestration.

---

## Putting Heavy Business Logic Inside State Hooks

Hooks should usually orchestrate execution rather than contain massive gameplay logic directly.

Large execution flow typically belongs inside Pipelines.

---

## Recreating Boolean Flags Inside FSM

If runtime logic still depends on many unrelated flags, the FSM architecture is probably incomplete.

---

## Allowing Invalid Transitions Everywhere

FSM becomes significantly less useful if every state may transition to every other state.

Explicit controlled transitions are one of the major architectural benefits.

---

# Limitations and Design Decisions

`empr.es` intentionally treats FSM as high-level runtime orchestration rather than as object-local behavior.

The framework prefers:

- explicit transitions,
- visible runtime flow,
- controlled execution ownership,
- and centralized orchestration.

Instead of:

```txt
Hidden callbacks mutate runtime state
```

the architecture encourages:

```txt
Explicit transition
        ↓
Explicit execution
        ↓
Explicit runtime ownership
```

This approach may initially feel stricter than callback-driven gameplay architecture, but it produces significantly more maintainable runtime flow in complex long-running projects.

---

# Related Articles

- `3.1. Execution Initiators`
- `3.2. Signal and SignalService`
- `2.2. Pipelines`
- `3.7. FSM + Pipeline + Signal Architecture`
- `4.6. LifecycleTracker and TrackedSignal`

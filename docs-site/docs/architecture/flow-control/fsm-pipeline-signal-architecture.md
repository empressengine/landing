# FSM + Pipeline + Signal Architecture

## Why These Three Systems Exist Together

Inside `empr.es`, runtime flow is intentionally split into several explicit architectural layers.

This separation exists because complex gameplay systems become significantly easier to reason about when:

- events,
- state transitions,
- execution flow,
- and runtime logic

are modeled independently instead of collapsing into one giant callback-driven runtime.

At a high level:

```txt
Signals represent events
FSM represents allowed flow
Pipelines represent ordered execution
Systems perform runtime work
Components store runtime state
```

Together, these layers form the core runtime flow architecture of `empr.es`.

---

# The Core Runtime Flow

A typical runtime flow inside the framework looks like this:

```txt
Signal
        ↓
FSM Transition
        ↓
Pipeline
        ↓
Systems
        ↓
Entities + Components
```

For example:

```txt
SpinRequestedSignal
        ↓
FSM transition Idle → Spin
        ↓
startSpinPipeline executes
        ↓
Systems lock input
        ↓
Systems prepare reels
        ↓
Systems start animations
        ↓
Systems dispatch next Signals
```

Each architectural layer has a very specific responsibility.

This separation is one of the most important design principles behind the framework.

---

# The Problem This Architecture Solves

Without explicit runtime architecture, gameplay flow often becomes deeply fragmented.

Typical browser game projects gradually evolve into something like this:

```txt
Button callback
    ↓
Mutates renderer state
    ↓
Starts animation
    ↓
Animation callback
    ↓
Updates gameplay state
    ↓
Starts another async operation
    ↓
Condition flags
    ↓
Nested callbacks
```

Eventually runtime behavior becomes extremely difficult to reason about.

Questions become hard to answer:

```txt
Why did this state change?
Who started this flow?
Can this happen during bonus?
Which transition triggered this logic?
Why did the animation start twice?
```

`empr.es` exists to solve this problem through explicit runtime flow architecture.

---

# Signals Represent Events

Signals represent runtime events.

Conceptually:

```txt
Something happened
```

Signals do not decide:

- whether the runtime state may change,
- whether execution is valid,
- or what exact work should run afterward.

Signals only communicate runtime events.

Examples:

```txt
SpinRequestedSignal
ResultReceivedSignal
WinPresentationCompletedSignal
OnUpdateSignal
```

---

# Example — Dispatching a Signal

Conceptual example:

```typescript
await spinRequestedSignal.dispatch({
    bet: 10,
});
```

Architecturally this means:

```txt
Player requested spin
```

Nothing more.

The Signal itself does not contain gameplay orchestration.

---

# Why Signals Stay Lightweight

Keeping Signals lightweight is extremely important.

If Signals begin directly mutating runtime state everywhere, execution quickly becomes fragmented again.

Instead, Signals act as runtime communication initiators.

Conceptually:

```txt
Signal
        ↓
Triggers transition or execution
```

instead of:

```txt
Signal
        ↓
Mutates everything directly
```

This keeps runtime flow significantly easier to debug and inspect.

---

# FSM Represents Allowed Runtime Flow

FSM controls high-level runtime progression.

Conceptually:

```txt
What state are we in?
What transitions are allowed?
```

FSM ensures that runtime flow remains explicit and valid.

Typical states:

```txt
Loading
InitScene
Idle
Spin
Stop
PresentWin
Bonus
Reconnect
```

Transitions define legal movement between those states.

---

# Example — FSM Transition

Conceptual example:

```typescript
await fsm.transition(
    GameState.Spin,
);
```

Architecturally this means:

```txt
Runtime moves into Spin state
```

FSM decides:

- whether the transition is allowed,
- what hooks should execute,
- and which runtime ownership boundaries become active.

---

# Why FSM Exists Separately From Signals

Signals communicate events.

FSM validates runtime flow.

This distinction is extremely important.

For example:

```txt
SpinRequestedSignal dispatched
```

does not automatically mean:

```txt
Spin should start
```

The runtime may still reject the transition because:

- the game is loading,
- reconnect flow is active,
- bonus state is running,
- or balance validation failed.

FSM acts as the runtime flow gatekeeper.

---

# Pipelines Represent Ordered Work

Pipelines define:

```txt
What exact sequence of execution
should happen now?
```

FSM controls flow.

Pipelines control execution order.

For example:

```txt
Lock Input
    ↓
Prepare Reels
    ↓
Start Reel Motion
    ↓
Await Result
```

This execution flow belongs to a Pipeline.

---

# Example — Pipeline Definition

Conceptual example:

```typescript
const startSpinPipeline:
    PipelineFactory = ({
        pipeline,
    }) => {
        pipeline
            .use(lockInputSystem)
            .use(prepareReelsSystem)
            .use(startSpinSystem);
    };
```

The Pipeline explicitly describes runtime execution order.

This is one of the biggest architectural differences between `empr.es` and callback-driven gameplay architecture.

---

# Systems Perform Small Runtime Operations

Systems contain focused runtime logic.

Conceptually:

```txt
One System = One Responsibility
```

Examples:

```txt
Lock input
Prepare reels
Move entities
Apply cooldown
Calculate wins
Play sound
```

Systems intentionally remain small and composable.

---

# Example — System

Conceptual example:

```typescript
const lockInputSystem: System = ({
    inject,
}) => {
    const inputService =
        inject(InputService);

    inputService.lock();
};
```

Systems do not own global runtime flow.

They perform isolated operations inside explicit execution Pipelines.

---

# Components Store Runtime State

Components store the runtime data being modified by Systems.

Conceptually:

```txt
Components contain state
Systems change state
```

Example components:

```txt
PositionComponent
VelocityComponent
SpinStateComponent
CooldownComponent
WinAmountComponent
```

---

# Example — Component-driven System

Conceptual example:

```typescript
class PositionComponent {
    public x = 0;
    public y = 0;
}

class VelocityComponent {
    public x = 0;
    public y = 0;
}

const movementSystem: System<{
    delta: number;
}> = ({
    filter,
    delta,
}: SystemProps<{
    delta: number;
}>) => {
    const entities = filter({
        includes: [
            PositionComponent,
            VelocityComponent,
        ],
    });

    entities.forEach((entity) => {
        const position =
            entity.getComponent(PositionComponent);

        const velocity =
            entity.getComponent(VelocityComponent);

        position.x += velocity.x * delta;
        position.y += velocity.y * delta;
    });
};
```

The System changes runtime state stored in Components.

---

# Full Runtime Flow Example

This is how all architectural layers cooperate together.

---

# Step 1 — Signal Dispatched

Player clicks the spin button:

```typescript
await spinRequestedSignal.dispatch({
    bet: 10,
});
```

Conceptually:

```txt
Player requested spin
```

---

# Step 2 — FSM Transition

Signal listener requests state transition:

```typescript
spinRequestedSignal.listen(
    async () => {
        await fsm.transition(
            GameState.Spin,
        );
    },
);
```

FSM validates whether the runtime may enter the Spin state.

Conceptually:

```txt
Idle → Spin
```

---

# Step 3 — FSM Executes Pipeline

When entering the state:

```typescript
fsm.onEnter(
    GameState.Spin,
    async () => {
        const id =
            await executor.create(
                startSpinPipeline,
                {},
                'FSM',
                'start-spin',
            );

        await executor.run(id);
    },
);
```

Conceptually:

```txt
FSM entered Spin
        ↓
Start execution flow
```

---

# Step 4 — Pipeline Runs Systems

Pipeline executes Systems sequentially:

```typescript
const startSpinPipeline:
    PipelineFactory = ({
        pipeline,
    }) => {
        pipeline
            .use(lockInputSystem)
            .use(prepareReelsSystem)
            .use(startSpinSystem)
            .use(dispatchSpinStartedSystem);
    };
```

Conceptually:

```txt
Lock input
    ↓
Prepare reels
    ↓
Start reels
    ↓
Dispatch next event
```

---

# Step 5 — Systems Mutate Components

Systems update runtime data stored in Components:

```typescript
const startSpinSystem: System = ({
    filter,
}: SystemProps) => {
    const reels = filter({
        includes: [
            ReelComponent,
            SpinStateComponent,
        ],
    });

    reels.forEach((entity) => {
        const spinState =
            entity.getComponent(
                SpinStateComponent,
            );

        spinState.isSpinning = true;
    });
};
```

Now runtime state changes remain explicit and inspectable.

---

# Step 6 — Next Signal Continues Flow

Systems may dispatch new Signals:

```typescript
await spinStartedSignal.dispatch();
```

which may trigger:

```txt
Next FSM transition
Next Pipeline
Next runtime phase
```

This creates architecture-level runtime chaining without deeply nested callbacks.

---

# Runtime Responsibilities by Layer

One of the most important things to understand is that every layer solves a different problem.

---

# Signals

Signals answer:

```txt
What happened?
```

Examples:

```txt
Spin requested
Result received
Win presentation completed
```

---

# FSM

FSM answers:

```txt
What runtime state are we in?
What transitions are allowed?
```

Examples:

```txt
Idle → Spin
Spin → Stop
Stop → PresentWin
```

---

# Pipelines

Pipelines answer:

```txt
What exact execution sequence
should run now?
```

Examples:

```txt
Lock input
Prepare reels
Start animation
Wait for result
```

---

# Systems

Systems answer:

```txt
What isolated runtime operation
should happen?
```

Examples:

```txt
Move entities
Apply cooldown
Start reel motion
Calculate wins
```

---

# Components

Components answer:

```txt
What runtime state exists?
```

Examples:

```txt
Position
Velocity
Spin state
Cooldown
Win amount
```

---

# Why This Architecture Matters

This separation creates several important architectural advantages.

---

# Explicit Runtime Flow

Execution becomes visible instead of hidden across callbacks and renderer objects.

---

# Better Debugging

The runtime can track:

```txt
Which signal started execution?
Which transition happened?
Which pipeline executed?
Which systems ran?
Which state changed?
```

---

# Safer Runtime Ownership

FSM states and Pipelines create explicit lifecycle boundaries.

This significantly reduces:

- dangling listeners,
- invalid async execution,
- and hidden runtime side effects.

---

# Better Reusability

Systems remain reusable because orchestration lives outside them.

Signals remain reusable because they only communicate events.

Pipelines remain reusable because they only define execution order.

---

# Renderer Independence

The architecture remains independent from:

- PixiJS,
- DOM events,
- scene callbacks,
- and browser rendering lifecycle.

This is one of the major architectural goals of `empr.es`.

---

# Common Mistakes

## Putting Orchestration Into Systems

Systems should remain focused.

Large runtime flow usually belongs inside FSM and Pipelines.

---

## Treating Signals as Business Logic Containers

Signals should communicate events, not orchestrate entire runtime flow directly.

---

## Using FSM for Tiny Runtime Details

FSM works best for high-level runtime phases.

Tiny local object state often does not require full state machine orchestration.

---

## Allowing Pipelines To Mutate Hidden Global State

Pipelines should orchestrate execution explicitly instead of relying on invisible side effects.

---

# The Big Architectural Idea

The most important idea behind this architecture is:

```txt
Events
        ≠
State transitions
        ≠
Execution order
        ≠
Runtime logic
        ≠
Runtime state
```

Each concern exists independently.

This separation is what allows `empr.es` to keep runtime flow:

- explicit,
- inspectable,
- reusable,
- deterministic,
- and scalable.

Instead of:

```txt
One giant renderer-driven runtime object
```

the architecture becomes:

```txt
Signals
        ↓
FSM
        ↓
Pipelines
        ↓
Systems
        ↓
Components
```

This is the core runtime flow architecture of `empr.es`.

---

# Related Articles

- [3.1. Execution Initiators](/architecture/flow-control/execution-initiators)
- [3.2. Signal and SignalService](/architecture/flow-control/signal-and-signalservice)
- [3.5. Listening to Update Loop via SignalService](/architecture/flow-control/listening-to-update-loop-via-signalservice)
- [3.6. Game Flow with FSM](/architecture/flow-control/game-flow-with-fsm)
- [2.2. Pipelines](/architecture/execution/pipelines)
- [2.1. Systems](/architecture/execution/systems)

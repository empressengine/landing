# Pipelines

## What is a Pipeline?

Inside the ECS execution stack of `empr.es`, a **Pipeline** is an explicit ordered execution flow composed from Systems.

A Pipeline defines:

- what Systems should run,
- in what order they should execute,
- and under what execution context the flow should happen.

Conceptually, a Pipeline answers a very important runtime question:

```txt
What exact sequence of work
should happen right now?
```

This is one of the core architectural ideas behind `@empr/es-sistema`.

Instead of allowing gameplay flow to emerge implicitly through callbacks, renderer objects, animation handlers, or deeply nested async chains, `empr.es` keeps execution visible through explicit runtime Pipelines.

---

# Why Pipelines Exist

Most browser game projects eventually accumulate runtime behavior that looks something like this:

```txt
Animation callback
    ↓
starts another animation
    ↓
dispatches a signal
    ↓
updates runtime state
    ↓
triggers gameplay logic
    ↓
starts async loading
    ↓
modifies renderer objects
```

At first this often feels convenient.

The problem appears later when the runtime grows larger.

Execution order becomes difficult to understand because flow is distributed across:

- callbacks,
- timers,
- renderer events,
- scene objects,
- and asynchronous side effects.

Eventually the architecture loses a clear answer to questions like:

```txt
What exactly happens during spin start?
What order does stop logic execute in?
Which system triggered this transition?
Why did this state mutate?
What happens before win presentation?
```

Pipelines exist to solve this problem.

Instead of scattering runtime behavior across unrelated objects, `empr.es` centralizes execution flow into explicit ordered runtime sequences.

This creates architecture that is significantly easier to:

- debug,
- reason about,
- replay,
- profile,
- and extend safely.

---

# Pipeline as Explicit Runtime Flow

A Pipeline is not merely a “list of Systems.”

Architecturally, a Pipeline is a visible execution contract.

For example:

```txt
Lock Input
    ↓
Start Reels
    ↓
Wait For Result
    ↓
Stop Reels
    ↓
Evaluate Wins
    ↓
Present Win
    ↓
Unlock Input
```

This flow becomes a first-class runtime structure instead of being hidden inside:

- animation callbacks,
- scene object methods,
- or unrelated services.

That distinction is extremely important.

One of the core goals of `empr.es` is to make runtime execution inspectable instead of implicit.

---

# Where Pipelines Live in the Architecture

Pipelines belong to the ECS execution stack provided by `@empr/es-sistema`.

Conceptually:

```txt
PipelineFactory
        ↓
PipelineComposer
        ↓
Pipeline
        ↓
Executor
        ↓
Systems
        ↓
Entities + Components
```

The core package `@empr/es` intentionally does not contain the ECS execution runner itself.

Instead:

- `@empr/es` provides the runtime kernel,
- while `@empr/es-sistema` provides explicit ECS execution.

This separation allows the framework to support multiple execution strategies without coupling the core runtime to a single orchestration model.

---

# The Relationship Between Systems and Pipelines

Systems and Pipelines solve different architectural problems.

## Systems

Systems perform focused runtime work.

For example:

```txt
Move entities
Apply damage
Lock input
Spawn symbols
Calculate wins
```

Systems should remain small and composable.

---

## Pipelines

Pipelines define execution order.

For example:

```txt
When this runtime flow starts:
    first lock input
    then start reels
    then wait for result
    then stop reels
    then present wins
```

This distinction is critical.

Systems define behavior.

Pipelines define orchestration.

---

# PipelineFactory

Pipelines are typically described through `PipelineFactory`.

Conceptually:

```typescript
import type { PipelineFactory } from '@empr/es-sistema';

const spinPipeline: PipelineFactory<void> = ({ pipeline }) => {
    pipeline
        .use(lockInputSystem)
        .use(startSpinSystem)
        .use(waitForResultSystem)
        .use(stopReelsSystem)
        .use(presentWinSystem)
        .use(unlockInputSystem);
};
```

A `PipelineFactory` does not execute Systems directly.

Instead, it describes how a Pipeline should be constructed.

This is important architecturally because execution definition becomes reusable and composable.

---

# PipelineComposer

Inside a `PipelineFactory`, Systems are registered through `PipelineComposer`.

Conceptually:

```typescript
pipeline.use(system);
```

`PipelineComposer` is responsible for building the ordered runtime execution structure.

The order of `.use(...)` calls matters.

For example:

```typescript
pipeline
    .use(lockInputSystem)
    .use(startSpinSystem)
    .use(stopSpinSystem);
```

is not equivalent to:

```typescript
pipeline
    .use(stopSpinSystem)
    .use(startSpinSystem)
    .use(lockInputSystem);
```

Execution order is explicit and deterministic.

This is one of the major architectural advantages of the Pipeline model.

---

# Executor

Pipelines themselves are runtime definitions.

Actual execution is performed by `Executor`.

Conceptually:

```typescript
const id = await executor.create(
    spinPipeline,
    {},
    'FSM',
    'spin-flow',
);

await executor.run(id);
```

The `Executor`:

- creates runtime Pipeline instances,
- manages execution lifecycle,
- runs Systems sequentially,
- handles async execution,
- and dispatches execution signals.

This separation between:

```txt
Pipeline definition
        vs
Pipeline execution
```

is extremely important architecturally.

It allows runtime flows to remain inspectable, reusable and externally controlled.

---

# Ordered Execution

One of the most important ideas behind Pipelines is that runtime order is explicit.

For example:

```typescript
pipeline
    .use(validateResultSystem)
    .use(applyResultSystem)
    .use(presentResultSystem);
```

The execution sequence is immediately visible.

This sounds simple, but it fundamentally changes how gameplay architecture evolves over time.

Without explicit Pipelines, runtime order usually becomes distributed across:

- callbacks,
- promises,
- renderer events,
- timers,
- or hidden object methods.

Over time this becomes extremely difficult to debug.

Pipelines intentionally centralize execution order into one visible runtime flow.

---

# Pipelines vs Scattered Callbacks

Consider a typical callback-driven flow:

```txt
Animation callback
    ↓
starts another animation
    ↓
network callback
    ↓
signal dispatch
    ↓
UI update
    ↓
state mutation
```

Architecturally, this creates several problems:

- flow becomes fragmented,
- ownership becomes unclear,
- debugging becomes difficult,
- execution order becomes implicit,
- and side effects become harder to reason about.

Now compare that to a Pipeline:

```txt
Lock Input
    ↓
Start Animation
    ↓
Await Result
    ↓
Apply State
    ↓
Present Win
    ↓
Unlock Input
```

The runtime flow becomes visible immediately.

This is one of the strongest architectural advantages of `@empr/es-sistema`.

---

# Pipeline Context and Props

Pipelines may provide execution context to Systems.

For example:

```typescript
const damagePipeline: PipelineFactory<{ damage: number }> = ({
    pipeline,
}) => {
    pipeline.use(applyDamageSystem, {
        damage: 50,
    });
};
```

Then inside the System:

```typescript
const applyDamageSystem: System<{ damage: number }> = ({
    filter,
    damage,
}: SystemProps<{ damage: number }>) => {
    const entities = filter({
        includes: [HealthComponent],
    });
    
    entities.forEach((entity) => {
        const health = entity.getComponent(HealthComponent);
        health.current -= damage;
    });
};
```

This allows Systems to remain reusable across different runtime flows.

Pipelines define not only execution order, but also execution context.

---

# Pipelines and Async Execution

Pipelines support asynchronous runtime flows.

For example:

```typescript
const loadAssetsSystem: System = async () => {
    await loadResources();
};
```

The `Executor` sequentially awaits asynchronous Systems during Pipeline execution.

Conceptually:

```txt
System A finishes
    ↓
System B starts
    ↓
System C awaits async operation
    ↓
System D starts afterward
```

This creates explicit async orchestration without scattering async chains across unrelated runtime objects.

---

# Real Pipeline Use Cases

Pipelines are intentionally designed for runtime flows that benefit from explicit execution ordering.

---

## Loading Flow

```txt
Initialize Runtime
    ↓
Load Assets
    ↓
Build Scene
    ↓
Register Entities
    ↓
Start Idle State
```

---

## Slot Spin Flow

```txt
Lock Input
    ↓
Start Reel Motion
    ↓
Wait For Server Result
    ↓
Stop Reels
    ↓
Evaluate Wins
    ↓
Present Win
    ↓
Unlock Input
```

---

## Stop Flow

```txt
Stop Reel 1
    ↓
Wait
    ↓
Stop Reel 2
    ↓
Wait
    ↓
Stop Reel 3
```

---

## Win Presentation

```txt
Highlight Symbols
    ↓
Play Animation
    ↓
Play Sound
    ↓
Increment Counter
    ↓
Transition To Idle
```

---

## Game Loop

```txt
Input
    ↓
Movement
    ↓
Physics
    ↓
Collision
    ↓
Rendering Sync
```

---

## Server Validation

```txt
Receive Result
    ↓
Validate Payload
    ↓
Apply Runtime State
    ↓
Update UI
```

---

## Debug Replay

```txt
Load Recorded State
    ↓
Replay Runtime Signals
    ↓
Execute Pipelines
    ↓
Compare Runtime Output
```

---

# Pipelines Make Runtime Flow Inspectable

One of the major design goals behind Pipelines is runtime observability.

Because execution is centralized through:

- `Executor`,
- `Pipeline`,
- and execution signals,

the runtime can track:

```txt
Which pipeline started?
Who initiated execution?
Which systems executed?
How long did execution take?
Which flow failed?
```

This becomes especially valuable in:

- debugging,
- telemetry,
- replay systems,
- QA tooling,
- and production diagnostics.

Execution visibility is significantly harder to achieve when runtime flow is hidden across renderer callbacks and object methods.

---

# Pipelines vs Object-Oriented Runtime Flow

In many traditional architectures, runtime flow becomes distributed across objects:

```txt
Player.startSpin()
    ↓
internally starts animation
    ↓
internally waits for callbacks
    ↓
internally mutates state
    ↓
internally transitions flow
```

This creates behavior that is difficult to inspect externally.

`empr.es` intentionally separates:

```txt
Runtime state
        ↓
Runtime behavior
        ↓
Runtime orchestration
```

Pipelines act as the orchestration layer.

This keeps execution visible instead of hiding it inside runtime objects.

---

# Pipelines and FSM

Pipelines frequently work together with FSM.

Conceptually:

```txt
FSM transition
        ↓
Executor
        ↓
Pipeline
        ↓
Systems
        ↓
Entities + Components
```

For example:

```txt
Idle → Spin
```

may trigger:

```txt
startSpinPipeline
```

while:

```txt
Spin → Stop
```

may trigger:

```txt
stopSpinPipeline
```

This separation allows FSM to control high-level runtime state while Pipelines handle ordered execution work.

---

# Common Mistakes

## Putting Too Much Logic Into One System

If a System becomes a giant runtime flow controller, the orchestration probably belongs in a Pipeline instead.

---

## Hiding Execution Inside Renderer Objects

Pipelines work best when execution stays centralized and explicit.

Moving orchestration back into scene objects usually recreates the same architectural problems Pipelines were designed to solve.

---

## Creating Massive Pipelines

Pipelines should remain readable.

Large runtime flows are usually easier to maintain when split into smaller reusable pipeline factories.

---

## Treating Pipelines as Data Storage

Pipelines coordinate execution.

Persistent runtime state should usually live in:

- Components,
- stores,
- services,
- or FSM context.

---

# Limitations and Design Decisions

Pipelines intentionally prioritize explicit execution over implicit convenience.

A Pipeline is:

- not a hidden update loop,
- not a renderer lifecycle,
- not a scene object,
- and not a magic async graph.

Execution order is written explicitly.

Systems are added explicitly.

Execution starts explicitly through `Executor` or execution initiators such as FSM, Signals or interaction flows.

This design intentionally favors runtime clarity and observability.

---

# Related Articles

- `2.1. Systems`
- `2.3. Pipeline Composition`
- `3.1. Execution Initiators`
- `3.6. Game Flow with FSM`
- `3.7. FSM + Pipeline + Signal Architecture`

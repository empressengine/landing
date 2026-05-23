# Pipeline Composition

## What is Pipeline Composition?

Inside `@empr/es-sistema`, large runtime flows are built by composing smaller execution pieces together.

This process is called **Pipeline Composition**.

Instead of creating one massive execution flow containing all gameplay logic in a single place, `empr.es` encourages developers to build runtime orchestration from:

- small Systems,
- reusable PipelineFactories,
- and explicit execution fragments.

Conceptually:

```txt
Small Systems
        ↓
Small Pipeline Fragments
        ↓
Larger Runtime Flows
        ↓
Complete Gameplay Execution
```

This is one of the most important architectural ideas behind the Pipeline model.

Pipelines are intentionally designed to be composable runtime structures instead of monolithic execution graphs.

---

# Why Pipeline Composition Exists

Without composition, gameplay execution usually evolves into one of two problematic directions.

---

## Giant Runtime Systems

One large System gradually accumulates:

- input logic,
- state changes,
- async coordination,
- animation handling,
- transitions,
- and side effects.

Eventually the System stops being understandable.

---

## Giant Runtime Pipelines

Alternatively, one Pipeline grows into a massive execution chain:

```txt
System A
System B
System C
System D
System E
System F
System G
...
```

Over time:

- readability decreases,
- reuse disappears,
- debugging becomes harder,
- and runtime ownership becomes unclear.

Pipeline composition exists to prevent this.

Instead of building one giant execution flow, `empr.es` encourages runtime orchestration through smaller reusable execution pieces.

---

# Composition as an Architectural Principle

One of the core architectural goals of `empr.es` is explicit runtime structure.

Composition helps preserve this clarity.

For example:

```txt
Gameplay Flow
    ↓
Spin Flow
        ↓
Stop Flow
        ↓
Win Presentation
```

Each flow may itself be composed from smaller runtime fragments.

This creates architecture that remains understandable even as projects grow larger.

---

# Creating a PipelineFactory

Pipeline composition starts with `PipelineFactory`.

Conceptually:

```typescript
import type { PipelineFactory } from '@empr/es-sistema';

const movementPipeline: PipelineFactory<void> = ({
    pipeline,
}) => {
    pipeline
        .use(applyVelocitySystem)
        .use(applyMovementConstraintsSystem);
};
```

A `PipelineFactory` describes how a runtime Pipeline should be constructed.

It does not execute anything by itself.

This distinction is important because PipelineFactories become reusable execution definitions.

---

# Registering Systems with pipeline.use(...)

Systems are added through `PipelineComposer`.

Conceptually:

```typescript
pipeline.use(system);
```

For example:

```typescript
const spinPipeline: PipelineFactory<void> = ({
    pipeline,
}) => {
    pipeline
        .use(lockInputSystem)
        .use(startSpinSystem)
        .use(stopSpinSystem)
        .use(unlockInputSystem);
};
```

Execution order remains explicit.

This is one of the most important properties of Pipeline composition.

The flow is visible immediately.

---

# Building Pipelines from Smaller Pieces

Large runtime flows are usually easier to maintain when split into smaller reusable PipelineFactories.

For example:

```txt
Spin Flow
    ↓
Start Spin Fragment
    ↓
Stop Flow Fragment
    ↓
Win Presentation Fragment
```

Conceptually:

```typescript
const startSpinPipeline: PipelineFactory<void> = ({
    pipeline,
}) => {
    pipeline
        .use(lockInputSystem)
        .use(startSpinSystem);
};

const stopSpinPipeline: PipelineFactory<void> = ({
    pipeline,
}) => {
    pipeline
        .use(waitForResultSystem)
        .use(stopReelsSystem);
};

const presentWinPipeline: PipelineFactory<void> = ({
    pipeline,
}) => {
    pipeline
        .use(evaluateWinsSystem)
        .use(presentWinSystem)
        .use(unlockInputSystem);
};
```

This creates smaller execution units that remain independently understandable.

---

# Calling Child PipelineFactories

One of the major architectural strengths of Pipeline composition is that parent runtime flows may reuse child PipelineFactories.

Conceptually:

```typescript
const gameplayPipeline: PipelineFactory<void> = ({
    pipeline,
}) => {
    startSpinPipeline({ pipeline });
    stopSpinPipeline({ pipeline });
    presentWinPipeline({ pipeline });
};
```

Architecturally, this means:

```txt
Large runtime flows
can be assembled
from smaller execution pieces.
```

This dramatically improves:

- reuse,
- readability,
- maintainability,
- and runtime consistency.

---

# Pipeline Composition vs Copy-Paste Flow

Without composition, developers often duplicate runtime flow manually.

For example:

```txt
Spin Flow
Bonus Flow
Recovery Flow
Debug Flow
```

may all independently contain:

```txt
Lock Input
Unlock Input
Wait For Result
Validate State
```

Eventually this creates duplicated execution logic scattered across unrelated runtime flows.

Pipeline composition avoids this by centralizing reusable execution fragments.

For example:

```typescript
const lockGameplayPipeline: PipelineFactory<void> = ({
    pipeline,
}) => {
    pipeline.use(lockInputSystem);
};

const unlockGameplayPipeline: PipelineFactory<void> = ({
    pipeline,
}) => {
    pipeline.use(unlockInputSystem);
};
```

These fragments may then be reused anywhere.

---

# Shared Pipeline Props

Pipeline composition also allows shared runtime context to flow through Systems.

For example:

```typescript
type DamageProps = {
    damage: number;
};

const damagePipeline: PipelineFactory<DamageProps> = ({
    pipeline,
}) => {
    pipeline.use(applyDamageSystem, {
        damage: 50,
    });
};
```

Then later:

```typescript
const applyDamageSystem: System<DamageProps> = ({
    filter,
    damage,
}: SystemProps<DamageProps>) => {
    const entities = filter({
        includes: [HealthComponent],
    });
    
    entities.forEach((entity) => {
        const health = entity.getComponent(HealthComponent);
        health.current -= damage;
    });
};
```

This is important because runtime data remains explicit.

Instead of hiding execution state inside unrelated objects, Pipelines pass runtime context directly to Systems.

---

# Explicit Data Flow

One of the recommended architectural styles in `empr.es` is explicit runtime data flow.

For example:

```txt
Pipeline
    ↓
System Props
    ↓
Systems
```

This is generally preferable to:

```txt
Hidden mutable global state
```

because execution dependencies remain visible.

A developer reading the Pipeline can immediately understand:

- what Systems execute,
- what data they receive,
- and in what order the runtime changes happen.

---

# Composition Through Meaningful Runtime Fragments

Pipeline composition works best when execution fragments represent meaningful runtime concepts.

For example:

```txt
Initialize Scene
Load Assets
Prepare Reels
Start Spin
Stop Reels
Evaluate Wins
Present Win
Cleanup Runtime
```

This creates execution architecture that mirrors gameplay flow conceptually.

The goal is not simply “splitting code into files.”

The goal is building runtime orchestration that remains understandable at scale.

---

# Example: Slot Runtime Composition

A large slot flow may be composed like this:

```txt
Gameplay Pipeline
    ↓
Initialize Round
    ↓
Spin Pipeline
        ↓
Start Spin
        ↓
Stop Spin
    ↓
Evaluate Results
    ↓
Present Win
    ↓
Cleanup
```

Conceptually:

```typescript
const gameplayPipeline: PipelineFactory<void> = ({
    pipeline,
}) => {
    initializeRoundPipeline({ pipeline });
    spinPipeline({ pipeline });
    evaluateResultPipeline({ pipeline });
    presentWinPipeline({ pipeline });
    cleanupPipeline({ pipeline });
};
```

Each runtime fragment remains independently maintainable.

---

# Composition Helps Debugging

Pipeline composition significantly improves runtime debugging.

Instead of searching through deeply nested callbacks or giant runtime methods, execution becomes inspectable at multiple levels:

```txt
Gameplay Pipeline
    ↓
Spin Pipeline
        ↓
Stop Pipeline
            ↓
Individual Systems
```

This hierarchy makes it significantly easier to answer questions like:

```txt
Where did execution fail?
Which runtime fragment caused this state?
Which Systems participated?
Which flow executed first?
```

This becomes especially valuable in:

- complex gameplay flows,
- replay systems,
- telemetry tooling,
- QA tooling,
- and production debugging.

---

# Composition and Async Runtime Flow

Composed Pipelines may freely include asynchronous Systems.

For example:

```typescript
const loadAssetsPipeline: PipelineFactory<void> = ({
    pipeline,
}) => {
    pipeline
        .use(loadTexturesSystem)
        .use(loadAudioSystem)
        .use(buildSceneSystem);
};
```

Because execution order remains sequential and explicit, async runtime behavior stays predictable.

This is much easier to reason about than scattered async callbacks distributed across unrelated runtime objects.

---

# Recommended Pipeline Style

The recommended architectural style inside `empr.es` is:

---

## Small Focused Systems

Systems should perform one focused runtime operation.

Avoid giant “do everything” Systems.

---

## Meaningful Execution Order

Pipeline order should communicate gameplay intent clearly.

For example:

```txt
Lock Input
    ↓
Start Spin
    ↓
Wait For Result
    ↓
Stop Reels
```

is significantly easier to understand than arbitrary technical ordering.

---

## Small Reusable Pipeline Fragments

Large flows should usually be assembled from smaller PipelineFactories.

This improves reuse and readability.

---

## Explicit Runtime Data

Runtime context should be passed through:

- System props,
- Pipeline props,
- or DI.

Avoid hidden mutable runtime state whenever possible.

---

## Keep Orchestration in Pipelines

Pipelines should own runtime orchestration.

Avoid hiding major flow control inside:

- renderer objects,
- services,
- animations,
- or scene hierarchy methods.

---

# Pipelines vs Object-Oriented Runtime Composition

Traditional runtime architectures often compose behavior through nested objects:

```txt
Scene
    ↓
Controller
    ↓
Manager
    ↓
Gameplay Object
    ↓
Callbacks
```

Over time, execution becomes fragmented and difficult to inspect.

`empr.es` instead composes runtime flow explicitly:

```txt
Pipeline
    ↓
Pipeline Fragment
    ↓
Systems
    ↓
Entities + Components
```

This separation keeps orchestration centralized and visible.

---

# Common Mistakes

## Creating Giant Pipelines

If a Pipeline becomes extremely long, it usually needs composition.

Large flows are easier to maintain as smaller runtime fragments.

---

## Creating Giant Systems

Composition should happen through Systems and PipelineFactories together.

A Pipeline composed from giant Systems still becomes difficult to maintain.

---

## Hiding Runtime Flow in Services

Services should not secretly become orchestration layers.

Major execution flow should remain visible through Pipelines.

---

## Passing Too Much Runtime Data Everywhere

Not every value should become a Pipeline prop.

Shared runtime services, FSM context or Components may sometimes be more appropriate depending on ownership semantics.

---

# Limitations and Design Decisions

Pipeline composition intentionally prioritizes:

- explicit execution,
- runtime readability,
- composability,
- and deterministic orchestration.

The architecture intentionally avoids:

- hidden runtime graphs,
- automatic object lifecycle execution,
- implicit flow mutation,
- and callback-driven orchestration.

Execution structure should remain inspectable directly from Pipeline definitions.

---

# Related Articles

- [2.1. Systems](/architecture/execution/systems)
- [2.2. Pipelines](/architecture/execution/pipelines)
- [2.4. Modifying Existing Pipelines](/architecture/execution/modifying-existing-pipelines)
- [3.6. Game Flow with FSM](/architecture/flow-control/game-flow-with-fsm)
- [3.7. FSM + Pipeline + Signal Architecture](/architecture/flow-control/fsm-pipeline-signal-architecture)

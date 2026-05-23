# Systems

## What is a System?

In the ECS execution stack of `empr.es`, a **System** is a small executable function responsible for performing one focused piece of runtime logic.

A System does not own global flow, persistent runtime state, or hidden lifecycle callbacks.

Instead, it receives runtime tools through `SystemProps`, processes matching Entities through filters, optionally resolves services from the DI container, and then finishes execution.

Conceptually, a System answers a very specific runtime question:

```txt
What operation should happen
for entities matching this runtime state?
```

Inside the default ECS execution stack (`@empr/es-sistema`), Systems are assembled into ordered execution chains through `PipelineComposer` and executed by `Executor`.

---

# Why Systems Exist

One of the major architectural problems in long-running browser game projects is that gameplay behavior gradually becomes distributed across unrelated runtime objects.

Typical examples include:

- rendering callbacks mutating gameplay state,
- UI objects controlling business flow,
- animation handlers triggering unrelated systems,
- or large scene objects accumulating multiple responsibilities.

Over time, runtime behavior becomes difficult to inspect because execution order is no longer explicit.

`empr.es` uses Systems to separate runtime behavior into isolated executable units.

Instead of placing logic inside Entities or renderer objects:

- Components store data,
- Entities aggregate Components,
- Systems perform behavior,
- and Pipelines define execution order.

This separation is one of the core architectural ideas behind the ECS execution stack.

---

# Where Systems Live in the Architecture

Systems belong to the ECS execution stack provided by `@empr/es-sistema`.

Conceptually, the relationship looks like this:

```txt
Entity + Components
        ↓
System
        ↓
PipelineComposer
        ↓
Pipeline
        ↓
Executor
```

The important distinction is that the core package `@empr/es` does not execute Systems by itself.

The core runtime provides:

- entities,
- components,
- entity storage,
- dependency injection,
- FSM,
- signals,
- and lifecycle infrastructure.

The ECS execution layer itself lives in `@empr/es-sistema`.

This separation is intentional because `empr.es` supports multiple execution strategies.

---

# Systems Are Functions

Inside `empr.es`, a System is a function.

Not a class.

Not a hidden runtime object.

Not a lifecycle-based behavior component.

Conceptually:

```typescript
import type { System, SystemProps } from '@empr/es-sistema';

const movementSystem: System = ({ filter }: SystemProps) => {
    const entities = filter({
        includes: [PositionComponent, VelocityComponent],
    });
    
    entities.forEach((entity) => {
        const position = entity.getComponent(PositionComponent);
        const velocity = entity.getComponent(VelocityComponent);

        position.x += velocity.vx;
        position.y += velocity.vy;
    });
};
```

This design is extremely important architecturally because execution stays explicit.

The runtime does not secretly instantiate behavior objects or call hidden lifecycle hooks.

A System only runs when a Pipeline explicitly includes it.

---

# Systems Should Stay Focused

A System should perform one focused runtime operation.

Good Systems are usually:

- small,
- predictable,
- reusable,
- and easy to reason about in isolation.

For example:

```txt
ApplyVelocitySystem
ResolveCollisionSystem
LockInputSystem
CalculateWinLinesSystem
SpawnProjectileSystem
```

This is intentionally different from large object-oriented gameplay classes that own multiple responsibilities simultaneously.

A System should not become:

- an entire gameplay feature,
- a global runtime manager,
- or a hidden execution orchestrator.

Large execution flow belongs to Pipelines and FSM.

Systems themselves should remain composable runtime units.

---

# SystemProps

Systems receive runtime tools through `SystemProps`.

This object acts as the execution context for the currently running System.

At a high level, `SystemProps` provides access to:

- entity filtering,
- dependency injection,
- execution-scoped query context,
- and custom pipeline data.

Conceptually:

```typescript
type SystemProps<T> = {
    filter(...);
    inject(...);
} & T;
```

The exact implementation details are internal to the execution stack, but architecturally the important idea is that Systems do not manually reach into global runtime state.

Instead, runtime tools are injected explicitly.

---

# Using Filters Inside Systems

Most Systems operate on filtered Entities.

For example:

```typescript
const movementSystem: System = ({ filter }: SystemProps) => {
    const entities = filter({
        includes: [PositionComponent, VelocityComponent],
    });
    
    entities.forEach((entity) => {
        const position = entity.getComponent(PositionComponent);
        const velocity = entity.getComponent(VelocityComponent);

        position.x += velocity.vx;
        position.y += velocity.vy;
    });
};
```

Conceptually, the System is saying:

```txt
Give me all active entities
that contain PositionComponent
and VelocityComponent.
```

The System does not care:

- where the Entity was created,
- which scene owns it,
- or which renderer object represents it.

Behavior participation emerges entirely from Component composition.

This keeps Systems decoupled from object ownership and scene hierarchy.

---

# Includes and Excludes

Systems may define both required and forbidden runtime state through filters.

For example:

```typescript
const damageSystem: System<{ damage: number }> = ({
    filter,
    damage,
}: SystemProps<{ damage: number }>) => {
    const entites = filter({
        includes: [HealthComponent],
        excludes: [DeadTagComponent],
    });
    
    entites.forEach((entity) => {
        const health = entity.getComponent(HealthComponent);
        health.current -= damage;
    });
};
```

Conceptually:

```txt
Apply damage only to living entities.
```

This becomes extremely powerful architecturally because runtime behavior changes automatically as Components are added or removed.

For example:

```typescript
entity.addComponent(new DeadTagComponent());
```

Immediately afterward, the Entity disappears from Systems excluding dead Entities.

No manual registration or deregistration is required.

---

# Using Dependency Injection

Systems can resolve runtime services through `inject`.

For example:

```typescript
const winPresentationSystem: System = ({
    inject,
}: SystemProps) => {
    const tweenService = inject(TweenService);

    // runtime logic...
};
```

This is important because Systems should not depend on global singletons or renderer-owned state.

The DI container allows runtime services to remain:

- centralized,
- replaceable,
- testable,
- and execution-independent.

Architecturally, this keeps Systems focused on runtime behavior instead of service ownership.

---

# Systems Can Receive Pipeline Data

Systems may receive custom props from the Pipeline that registered them.

For example:

```typescript
const damageSystem: System<{ damage: number }> = ({
    filter,
    damage,
}: SystemProps<{ damage: number }>) => {
    const entites = filter({
        includes: [HealthComponent],
    })
    
    entites.forEach((entity) => {
        const health = entity.getComponent(HealthComponent);
        health.current -= damage;
    });
};
```

Then later:

```typescript
pipeline.use(damageSystem, {
    damage: 25,
});
```

This is one of the key architectural ideas behind `PipelineComposer`.

Pipelines do not merely decide execution order.

They also provide execution context to Systems.

This allows the same System to remain reusable across multiple flows.

---

# Systems Inside Pipelines

Systems do not execute themselves directly.

They are assembled into ordered execution chains through `PipelineComposer`.

For example:

```typescript
const gameplayPipeline: PipelineFactory<void> = ({ pipeline }) => {
    pipeline
        .use(lockInputSystem)
        .use(startSpinSystem)
        .use(waitForResultSystem)
        .use(stopReelsSystem)
        .use(presentWinSystem)
        .use(unlockInputSystem);
};
```

Later, `Executor` creates and runs a runtime `Pipeline` instance:

```typescript
const id = await executor.create(
    gameplayPipeline,
    {},
    'FSM',
    'spin-flow',
);

await executor.run(id);
```

This explicit execution model is one of the major architectural differences between `empr.es` and renderer-driven runtime architectures.

Execution flow remains visible instead of being hidden across callbacks and object methods.

---

# Systems and Async Execution

Systems may execute synchronously or asynchronously.

The runtime `Pipeline` iterates Systems sequentially and awaits asynchronous Systems when async execution is allowed.

Conceptually:

```typescript
const loadAssetsSystem: System = async () => {
    await loadResources();
};
```

This allows Pipelines to coordinate ordered runtime behavior without scattering async chains across unrelated objects.

The `Executor` and `Pipeline` runtime internally track execution lifecycle and dispatch execution signals such as:

- `OnPipelineExecutionStartSignal`
- `OnPipelineExecutionEndSignal`

These signals provide execution telemetry and debugging hooks without requiring Systems themselves to manage runtime tracking.

---

# Systems Should Not Own Global Flow

One of the most important design rules in `empr.es` is that Systems should not become hidden runtime controllers.

A System should not:

- decide the entire game state machine,
- manage unrelated execution branches,
- or orchestrate large runtime flows internally.

For example, this is usually a bad direction:

```txt
SpinSystem
    ↓
internally starts stop logic
    ↓
internally controls presentation
    ↓
internally transitions runtime state
```

Instead:

```txt
FSM
    ↓
Pipeline
    ↓
Small focused Systems
```

This separation keeps runtime flow inspectable and deterministic.

---

# Reusable Systems

One of the major benefits of the ECS execution model is System reuse.

Because Systems are small and data-driven, the same System can often participate in multiple runtime flows.

For example:

```txt
LockInputSystem
```

may be reused in:

- loading flows,
- spin flows,
- modal presentation flows,
- recovery flows,
- and bonus transitions.

Similarly:

```txt
PlaySoundSystem
```

may appear in many unrelated Pipelines with different runtime props.

This compositional style becomes significantly easier to maintain than monolithic gameplay classes.

---

# Systems vs Object-Oriented Gameplay Logic

Developers coming from Unity-like architectures often expect behavior to live directly inside runtime objects.

For example:

```txt
Player.update()
Enemy.update()
Projectile.update()
```

`empr.es` intentionally separates behavior from object ownership.

Instead:

```txt
Entities store Components
        ↓
Systems process matching Entities
```

This creates several architectural advantages:

- behavior becomes reusable,
- execution becomes visible,
- runtime state becomes queryable,
- and Systems remain independent from scene ownership.

This is especially useful in projects with:

- repeated gameplay behavior,
- deterministic runtime flows,
- large numbers of runtime objects,
- replay/debug tooling,
- or server-driven mechanics.

---

# Common Mistakes

## Turning Systems Into Managers

A System should not become a giant service that controls unrelated runtime logic.

If a System grows too large, the flow usually belongs in a Pipeline or FSM instead.

---

## Storing Persistent Runtime State Inside Systems

Systems are execution units, not long-lived runtime containers.

Persistent state should usually live in:

- Components,
- services,
- stores,
- FSM context,
- or runtime infrastructure.

---

## Using Systems as Scene Objects

Systems should not own renderer hierarchy or become visual runtime objects.

Rendering remains an integration layer around the runtime architecture.

---

## Making Systems Too Generic

Small focused Systems are usually easier to maintain than massive “do everything” Systems.

Trying to solve every variation through one giant configurable System often reduces clarity instead of improving reuse.

---

# Limitations and Design Decisions

The ECS execution stack intentionally avoids several common architectural patterns.

Systems are:

- not MonoBehaviours,
- not automatically ticking objects,
- not scene-owned lifecycle classes,
- and not hidden runtime services.

Execution remains explicit.

Pipelines define order.

Executor runs Pipelines.

Systems perform focused work.

This architecture intentionally prioritizes runtime clarity and composability over implicit convenience.

---

# Related Articles

- [2.2. Pipelines](/architecture/execution/pipelines)
- [2.3. Pipeline Composition](/architecture/execution/pipeline-composition)
- [1.2. ECS in empr.es](/architecture/core-concepts/ecs-in-empr-es)
- [1.3. Entity and Component Model](/architecture/core-concepts/entity-and-component-model)
- [1.4. EntityStorage and Component Filtering](/architecture/core-concepts/entity-storage-and-component-filtering)
- [3.1. Execution Initiators](/architecture/flow-control/execution-initiators)

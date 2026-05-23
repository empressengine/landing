# What is Component Driven?

## What is Component Driven?

**Component Driven** is an alternative execution stack for `empr.es`.

It does not replace the core package.

It does not replace Entities.

It does not replace Components.

It does not replace the renderer integration.

Instead, it changes how runtime execution is orchestrated.

In the default ECS stack, execution is built from:

```txt
PipelineFactory
    ↓
PipelineComposer
    ↓
Systems
```

In the Component Driven stack, execution is built around:

```txt
Orchestrator
    ↓
Scene-owned Components
    ↓
NodeEntity tree
```

The package responsible for this execution model is:

```txt
@empr/es-componente
```

This package is an alternative to:

```txt
@empr/es-sistema
```

A project should choose one execution stack at the application level.

It should not stack both execution models together in the same app.

---

# Why Component Driven Exists

ECS Pipelines are powerful when a project benefits from strict data and behavior separation.

They work especially well for:

- deterministic gameplay flows,
- simulations,
- repeated runtime behavior,
- slot mechanics,
- replay/debug tooling,
- and systems that process many Entities by Component filters.

However, not every team thinks primarily in terms of global Systems and filtered runtime execution.

Some projects are more naturally organized around:

- scene hierarchy,
- object composition,
- UI screens,
- visual modules,
- reusable scene objects,
- and object-centric behavior.

This is especially familiar to teams coming from tools such as:

- Unity,
- Cocos Creator,
- PlayCanvas,
- or scene-driven UI frameworks.

Component Driven exists for this mental model.

It allows developers to work with scene-owned Components while keeping execution external and explicit.

---

# Component Driven Does Not Replace @empr/es

The most important architectural point is this:

```txt
@empr/es-componente is an execution stack,
not a replacement for @empr/es.
```

The core runtime still comes from `@empr/es`.

That includes:

- Entities,
- Components,
- NodeEntity,
- Dependency,
- FSMService,
- SignalService,
- UpdateLoop,
- lifecycle infrastructure,
- and execution registry contracts.

`@empr/es-componente` adds a different orchestration layer on top of that core.

Conceptually:

```txt
@empr/es
    ↓
core runtime: entities, components, DI, FSM, signals

@empr/es-componente
    ↓
component-driven execution: orchestrators, execution queue, CD backend wiring
```

This separation is intentional.

The framework keeps the runtime kernel stable while allowing different execution strategies.

---

# Component Driven vs ECS Pipelines

The difference between the two stacks is not about whether the project uses Components.

Both execution models use Components.

The difference is where execution logic lives and how runtime flow is triggered.

---

## ECS Pipeline Stack

In `@empr/es-sistema`:

```txt
Systems contain behavior.
Pipelines define ordered execution.
Systems query Entities through filters.
Executor runs Pipelines.
```

Conceptually:

```txt
Pipeline
    ↓
System
    ↓
filter({ includes, excludes })
    ↓
matching Entities
```

This is data-driven and filter-oriented.

---

## Component Driven Stack

In `@empr/es-componente`:

```txt
Scene-owned Components describe object structure and state.
Orchestrators execute logic externally.
The executor runs Orchestrators through an execution queue.
```

Conceptually:

```txt
Execution initiator
    ↓
ComponentDrivenExecutor
    ↓
ExecutionQueue
    ↓
Orchestrator.execute(...)
    ↓
scene-owned Components
```

This is scene-driven and object-centric.

---

# Do Not Stack es-sistema and es-componente

`@empr/es-sistema` and `@empr/es-componente` are alternative execution stacks.

They both satisfy the execution contracts used by:

- `FSMService`,
- `SignalService`,
- and renderer-side execution integrations such as interaction wiring.

Because of that, an application should choose one stack.

Do not install and wire both as active execution models in one app.

Conceptually:

```txt
Choose one:

@empr/es + @empr/es-sistema
        or
@empr/es + @empr/es-componente
```

Not:

```txt
@empr/es + @empr/es-sistema + @empr/es-componente
```

Stacking both would make execution ownership unclear.

FSM, Signals and interaction flows should have one active execution registry.

---

# Where Component Driven Lives in the Architecture

`@empr/es-componente` sits above the core runtime.

It provides:

- `EmprComponent`,
- `Orchestrator`,
- `OrchestratorCache`,
- `ComponentDrivenExecutor`,
- `ExecutionQueue`,
- `ExecutorOrchestratorRegistry`,
- `DependencyComponentDriven`,
- `Inject`,
- and `useCDBackend`.

Conceptually:

```txt
Application
    ↓
useCDBackend(...)
    ↓
ExecutorOrchestratorRegistry
    ↓
ComponentDrivenExecutor
    ↓
ExecutionQueue
    ↓
Orchestrator
    ↓
Scene-owned Components
```

The core package remains responsible for runtime primitives.

The Component Driven package is responsible for orchestration style.

---

# Scene-Owned Components

In Component Driven architecture, Components are typically attached to a scene-owned entity tree.

The scene root is provided through a `SceneRootSource`.

Conceptually:

```typescript
type SceneRootSource<T extends NodeEntity<any>> = {
    root: T;
};
```

The Component Driven backend uses this root to allow Orchestrators to access Components inside the scene tree.

This means Components describe object structure and state in the context of a scene.

For example, a scene may contain Components representing:

- reel state,
- button state,
- panel configuration,
- symbol presentation data,
- UI module state,
- or view-specific runtime configuration.

The important detail is that these Components still should not become hidden behavior containers.

They describe runtime state and structure.

Execution remains external.

---

# EmprComponent

`@empr/es-componente` provides an abstract `EmprComponent`.

Conceptually:

```typescript
export abstract class EmprComponent<TProps = any> {
    public entity!: ComponentNodeliasType;

    protected get props(): TProps {
        return this._props;
    }

    constructor(private _props: TProps) {}
}
```

This gives Component Driven projects a base Component model for scene-owned Components with typed props.

However, `EmprComponent` is not a Unity-style lifecycle object.

It does not define methods such as:

```txt
start()
update()
onEnable()
onDisable()
```

That absence is intentional.

Component Driven in `empr.es` is not about hiding execution inside lifecycle hooks.

It is about describing scene-owned state while keeping orchestration external.

---

# Orchestrators

The central execution unit in the Component Driven stack is the `Orchestrator`.

Conceptually:

```typescript
export abstract class Orchestrator<T = any> {
    public abstract execute(data: T): void | Promise<void>;
}
```

An Orchestrator contains runtime logic.

It can access scene Components through helper methods such as:

```typescript
protected getComponent<T extends Component>(component: ComponentType<T>): EntityComponent<T, INodeEntity<any>>;
protected getComponents<T extends Component>(component: ComponentType<T>): EntityComponent<T, INodeEntity<any>>[];
```

Conceptually:

```txt
Orchestrator
    ↓
find Components in scene tree
    ↓
execute runtime operation
```

This is the key architectural difference from Unity-style Component systems.

Logic lives in Orchestrators, not inside hidden Component lifecycle methods.

---

# ExecutionQueue

Component Driven execution is handled through an execution queue.

The `ComponentDrivenExecutor` creates an `ExecutionQueue`, and that queue executes Orchestrators.

Conceptually:

```txt
ComponentDrivenExecutor.create(...)
    ↓
ExecutionQueue.setup(...)
    ↓
ExecutionQueue.execute(...)
    ↓
Orchestrator.execute(...)
```

The queue supports:

- execution,
- stopping,
- pausing,
- resuming,
- async execution when allowed,
- and aborting stopped async execution.

This makes Component Driven execution still explicit and externally controlled.

It is not automatic scene-object ticking.

---

# ComponentDrivenExecutor

The `ComponentDrivenExecutor` is the runtime executor for Component Driven flows.

It manages active execution queues and exposes operations such as:

- `create`,
- `run`,
- `stop`,
- `pause`,
- `resume`,
- `stopAll`,
- `pauseAll`,
- `resumeAll`.

Conceptually:

```txt
ComponentDrivenExecutor
    ↓
creates execution queue
    ↓
runs Orchestrator flow
    ↓
cleans queue after execution
```

This keeps execution centralized, just like `Executor` does for ECS Pipelines.

The execution model changes, but the architectural principle remains the same:

```txt
runtime flow should be explicit and controllable.
```

---

# ExecutorOrchestratorRegistry

`ExecutorOrchestratorRegistry` adapts the Component Driven executor to the common `ExecutionRegistry` contract from `@empr/es`.

This is important because `FSMService` and `SignalService` do not need to know whether the app uses:

- ECS Pipelines,
- or Component Driven Orchestrators.

They only need an execution registry.

Conceptually:

```txt
FSMService / SignalService
        ↓
ExecutionRegistry
        ↓
ExecutorOrchestratorRegistry
        ↓
ComponentDrivenExecutor
```

This is how both execution stacks can integrate with the same higher-level runtime features.

---

# Wiring with useCDBackend

The Component Driven stack is wired through `useCDBackend`.

Conceptually:

```typescript
import { useCDBackend } from '@empr/es-componente';

const scene = empr.dependency.inject(Scene);

useCDBackend(empr, scene);
```

During setup, `useCDBackend`:

- creates `ComponentDrivenExecutor`,
- creates `ExecutorOrchestratorRegistry`,
- creates `DependencyComponentDriven`,
- creates `OrchestratorCache`,
- connects `FSMService` to the Component Driven execution registry,
- connects `SignalService` to the same registry,
- hooks `UpdateLoop` pause/resume to executor pause/resume,
- stores the scene root source in `OrchestratorCache`,
- and registers the Component Driven services in DI.

Conceptually:

```txt
useCDBackend
    ↓
FSMService.setExecutionRegistry(...)
    ↓
SignalService.setExecutionRegistry(...)
    ↓
UpdateLoop pause/resume integration
    ↓
DI registration
```

This is the application-level switch from ECS Pipeline execution to Component Driven execution.

---

# Interaction Wiring

When using the PixiJS renderer integration, interaction execution also needs the same execution registry.

Conceptually:

```typescript
const registry = empr.dependency.inject(ExecutorOrchestratorRegistry);
empr.dependency.inject(InteractionService).setExecutionRegistry(registry);
```

This keeps input-driven execution consistent with FSM and Signal-driven execution.

The important rule remains the same:

```txt
one app, one active execution registry.
```

---

# Dependency Injection in Component Driven

`@empr/es-componente` also provides Component Driven dependency support.

The `Inject` decorator can register dependencies for Components or resolve dependencies for Orchestrators.

Conceptually:

```txt
@Inject(Token)
    ↓
DependencyComponentDriven
    ↓
component or orchestrator receives dependency
```

For Components, `DependencyComponentDriven` stores dependency metadata and injects dependencies when the Orchestrator resolves Components from the scene tree.

For Orchestrators, dependencies are resolved through the framework DI container using the Orchestrator environment id.

This allows Component Driven flows to access services without relying on global mutable state.

---

# Logic Is Not Hidden in Lifecycle Hooks

This is one of the most important design decisions.

Component Driven in `empr.es` should not be confused with Unity-style behaviour scripts.

In Unity-like architectures, Components often contain lifecycle methods:

```txt
Awake
Start
Update
OnEnable
OnDisable
OnDestroy
```

In `empr.es-componente`, this is intentionally avoided.

Scene-owned Components describe structure and state.

Execution happens through Orchestrators and services.

Conceptually:

```txt
Not this:

Component.update()
Component.start()
Component.onEnable()

But this:

Orchestrator.execute(...)
    ↓
reads / mutates Components
```

This keeps runtime execution visible and externally controlled.

---

# When Component Driven Fits Best

Component Driven is best suited for projects where runtime structure is naturally scene-oriented.

Good examples include:

- UI-heavy games,
- scene-driven screens,
- object-centric game modules,
- visual editor workflows,
- teams familiar with Unity or Cocos,
- projects with strong scene hierarchy ownership,
- and gameplay where object composition is easier to reason about than global filters.

It can be especially useful when developers want to think in terms of:

```txt
Scene
    ↓
Node
    ↓
Component
    ↓
Orchestrator
```

rather than:

```txt
EntityStorage
    ↓
filter(...)
    ↓
System
    ↓
Pipeline
```

---

# When ECS Pipelines May Be a Better Fit

Component Driven is not always the best choice.

ECS Pipelines may be better when a project needs:

- strict data/logic separation,
- heavy filtering by Component composition,
- simulation-like behavior,
- many repeated runtime objects,
- deterministic gameplay flows,
- slot mechanics,
- replay/debug tooling,
- or large-scale reusable Systems.

In those cases, `@empr/es-sistema` may provide a clearer architectural model.

The choice is about execution style, not about replacing the whole framework.

---

# Component Driven Mental Model

A useful mental model is:

```txt
Components describe scene-owned state.
Orchestrators contain execution logic.
Executor runs Orchestrators.
ExecutionRegistry connects FSM and Signals.
Core runtime still comes from @empr/es.
```

This is the essential idea.

Component Driven does not mean “put logic inside Components.”

It means “organize runtime around scene-owned Components, but execute logic externally.”

---

# Common Mistakes

## Installing Both Execution Stacks

Do not wire `@empr/es-sistema` and `@empr/es-componente` together as active execution stacks in the same app.

Choose one execution model.

---

## Treating EmprComponent Like MonoBehaviour

`EmprComponent` should not become a lifecycle-heavy behavior script.

It is not intended to hide runtime execution inside `update`-style methods.

---

## Moving All Logic Into Components

Logic belongs in Orchestrators and services.

Components should describe state and structure.

---

## Forgetting to Wire the Execution Registry

FSM, Signals and interaction flows require an execution registry.

For Component Driven apps, that registry is provided through `ExecutorOrchestratorRegistry`.

---

## Using Component Driven for Everything by Default

Component Driven is an architectural option.

It is not automatically better than ECS Pipelines.

Choose it when the project benefits from scene-driven, object-centric organization.

---

# Limitations and Design Decisions

Component Driven intentionally changes orchestration, not the entire runtime.

It does not replace:

- Entity,
- Component,
- NodeEntity,
- DI,
- FSM,
- SignalService,
- UpdateLoop,
- or renderer integrations.

It intentionally avoids hidden Unity-style lifecycle hooks.

Execution remains explicit.

Orchestrators perform logic.

The executor controls execution.

FSM and Signals connect to the same execution registry contract used by the rest of `empr.es`.

This keeps Component Driven aligned with the main architectural philosophy of the framework:

```txt
runtime behavior should remain visible, explicit and controlled.
```

---

# Related Articles

- `2.1. Systems`
- `2.2. Pipelines`
- `2.7. ECS vs Component Driven`
- `3.1. Execution Initiators`
- `3.6. Game Flow with FSM`
- `3.7. FSM + Pipeline + Signal Architecture`

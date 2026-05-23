# ECS vs Component Driven

## Why empr.es Supports Two Execution Strategies

One of the core architectural ideas behind `empr.es` is that the runtime kernel should not force a single execution model on every project.

Different teams think about runtime architecture differently.

Some teams naturally think in terms of:

```txt
Systems
Filters
Data flow
Simulation
Execution pipelines
```

Other teams naturally think in terms of:

```txt
Scene hierarchy
Objects
Components
UI modules
Scene-owned behavior
```

Both approaches can produce successful projects.

Because of that, `empr.es` separates:

```txt
core runtime
        from
execution strategy
```

This is why the framework supports two different execution stacks:

```txt
@empr/es-sistema
        ↓
ECS Pipeline execution

@empr/es-componente
        ↓
Component Driven execution
```

The goal is not to replace the framework.

The goal is to choose the orchestration style that best matches the project and the team.

---

# The Most Important Architectural Point

Both execution strategies use the same core runtime.

They are not separate engines.

They are not separate frameworks.

They are not incompatible ecosystems.

They share the same:

- Entities,
- Components,
- Dependency Injection,
- FSM,
- Signals,
- lifecycle infrastructure,
- UpdateLoop,
- storage layer,
- and renderer integrations.

Conceptually:

```txt
                @empr/es
                    ↓
------------------------------------------------
| Entity | Component | FSM | Signals | DI | ... |
------------------------------------------------
        ↓                          ↓
@empr/es-sistema         @empr/es-componente
        ↓                          ↓
 ECS execution             Component Driven execution
```

The difference is execution style.

Not runtime foundation.

---

# ECS Execution Overview

The default execution strategy in `empr.es` is ECS Pipeline execution through:

```txt
@empr/es-sistema
```

This architecture is built around:

- Systems,
- Pipelines,
- Executor,
- Entity filtering,
- and explicit execution flow.

Conceptually:

```txt
Pipeline
    ↓
Systems
    ↓
filter({ includes, excludes })
    ↓
matching Entities
```

Behavior is selected through Component composition.

Systems process matching runtime state.

Pipelines define execution order.

This creates architecture that is highly data-oriented and execution-centric.

---

# Component Driven Overview

The alternative execution strategy is:

```txt
@empr/es-componente
```

This model is built around:

- scene-owned Components,
- Orchestrators,
- execution queues,
- and object-centric scene structure.

Conceptually:

```txt
ExecutionQueue
    ↓
Orchestrator.execute(...)
    ↓
scene-owned Components
```

Instead of querying large groups of Entities through filters, execution is typically organized around scene hierarchy and object structure.

This creates architecture that feels more natural to developers coming from scene-driven engines.

---

# ECS Mental Model

The ECS execution stack encourages developers to think like this:

```txt
What runtime state exists?
Which Systems should process it?
Which Entities match this behavior?
What execution flow should happen?
```

For example:

```txt
Anything with Position + Velocity can move.
Anything with Health + Damageable can receive damage.
Anything with WinningTag can participate in presentation.
```

Behavior emerges from data composition.

This is one of the defining characteristics of ECS architecture.

---

# Component Driven Mental Model

Component Driven encourages developers to think more like this:

```txt
Which scene object owns this?
Which Components belong to this object?
Which Orchestrator controls this flow?
Which runtime module is responsible?
```

Execution is more object-centric and scene-oriented.

This often feels more familiar to teams used to:

- Unity,
- Cocos Creator,
- PlayCanvas,
- or traditional UI module architecture.

---

# ECS Strengths

The ECS execution stack is especially strong when a project benefits from strict separation between:

```txt
runtime data
        and
runtime behavior
```

This architecture excels in systems where behavior is highly repeatable and data-driven.

---

## Strict Data / Logic Separation

In ECS:

```txt
Components store state.
Systems perform behavior.
Pipelines define execution order.
```

This keeps runtime responsibilities extremely explicit.

It becomes easier to reason about:

- what changed,
- who changed it,
- and why the runtime behaved a certain way.

---

## Deterministic Runtime Flow

Pipelines make execution order explicit:

```txt
Lock Input
    ↓
Start Spin
    ↓
Wait For Result
    ↓
Stop Reels
```

This is especially valuable in:

- slot games,
- server-driven gameplay,
- regulated gameplay systems,
- replay tooling,
- and production debugging.

---

## Simulations

ECS works very well for simulations because Systems process runtime state uniformly.

For example:

```txt
movementSystem
collisionSystem
damageSystem
```

can operate over thousands of Entities consistently.

The architecture scales naturally for repeated runtime behavior.

---

## Repeated Runtime Behavior

ECS is extremely strong when many runtime objects share behavior patterns.

For example:

```txt
Anything with Position + Velocity moves.
Anything with Health can receive damage.
Anything with InteractableTag participates in input.
```

This avoids large inheritance trees and duplicated logic.

Behavior emerges from Component composition.

---

## Replay and Debug Tooling

Because execution is centralized through:

- Pipelines,
- Systems,
- Signals,
- and FSM,

runtime flow becomes easier to inspect.

This is particularly useful for:

- replay systems,
- telemetry,
- deterministic testing,
- QA tooling,
- and runtime tracing.

---

## Slot Mechanics

ECS is especially well-suited for slot runtime architecture because slot games often contain:

- repeated symbols,
- reel systems,
- deterministic execution order,
- server-driven results,
- temporary runtime tags,
- and execution-heavy gameplay flow.

Pipeline execution maps very naturally onto:

```txt
Spin
    ↓
Stop
    ↓
Evaluation
    ↓
Presentation
```

This is one of the reasons `@empr/es-sistema` exists as the default execution stack.

---

# Component Driven Strengths

Component Driven is strongest when a project is naturally organized around scene hierarchy and object ownership.

---

## Scene Hierarchy

Some projects are easier to reason about through:

```txt
Scene
    ↓
Node
    ↓
Component
```

instead of:

```txt
EntityStorage
    ↓
Filters
    ↓
Systems
```

This is especially common in UI-heavy projects.

---

## Object-Centric Organization

Component Driven architecture works well when developers want runtime structure to mirror scene structure.

For example:

```txt
Menu Screen
    ↓
Buttons
    ↓
Panels
    ↓
Widgets
```

This can feel more intuitive than purely filter-driven execution.

---

## UI-Heavy Screens

Complex UI screens often have strong ownership relationships.

For example:

```txt
Modal
    ↓
Tabs
    ↓
Buttons
    ↓
Animations
```

In these situations, scene-oriented execution can be easier to organize.

---

## Familiarity for Unity / Cocos Teams

Many teams already think in terms of:

- scene objects,
- components,
- object ownership,
- and modular hierarchy.

Component Driven allows those teams to work with a familiar organizational model while still benefiting from:

- DI,
- FSM,
- Signals,
- lifecycle infrastructure,
- and explicit runtime execution.

---

## Visual Editor Workflows

Projects with editor-driven workflows often naturally align with object-centric scene organization.

For example:

```txt
Editor scene
    ↓
Node hierarchy
    ↓
Scene Components
```

This can integrate naturally with Component Driven orchestration.

---

# The Biggest Architectural Difference

The core difference between the two execution models is:

```txt
How runtime behavior is organized.
```

---

## ECS

Behavior is organized globally through Systems and filters.

Conceptually:

```txt
Find matching runtime state globally.
Process all matching Entities.
```

---

## Component Driven

Behavior is organized around scene structure and Orchestrators.

Conceptually:

```txt
Navigate scene-owned structure.
Execute logic around object ownership.
```

Both approaches are valid.

They simply optimize for different architectural priorities.

---

# ECS Is More Data-Oriented

ECS tends to optimize for:

- large-scale repeated behavior,
- deterministic execution,
- runtime uniformity,
- and explicit data processing.

The architecture is often closer to:

```txt
simulation architecture
```

than to scene-driven application structure.

---

# Component Driven Is More Scene-Oriented

Component Driven tends to optimize for:

- object ownership,
- scene hierarchy,
- UI modules,
- visual structure,
- and object-centric organization.

The architecture is often closer to:

```txt
scene application architecture
```

than to simulation architecture.

---

# Neither Stack Replaces the Core Runtime

This is extremely important.

Choosing a different execution stack does not mean replacing the framework.

For example:

```txt
Both stacks still use:
    Entity
    Component
    FSM
    Signals
    DI
    UpdateLoop
    LifecycleTracker
    EntityStorage
```

The runtime kernel stays the same.

Only orchestration changes.

This means teams can still share:

- renderer integrations,
- lifecycle infrastructure,
- runtime services,
- and core architectural concepts.

---

# Execution Registry Compatibility

Both execution stacks satisfy the same `ExecutionRegistry` contracts used by:

- `FSMService`,
- `SignalService`,
- and interaction integrations.

Conceptually:

```txt
FSM / Signals / Interaction
            ↓
ExecutionRegistry
            ↓
Either:
    Executor
or:
    ExecutorOrchestratorRegistry
```

This allows higher-level runtime systems to remain execution-stack agnostic.

---

# One App Should Choose One Stack

A project should not actively wire both execution stacks together.

Choose one:

```txt
@empr/es + @empr/es-sistema
```

or:

```txt
@empr/es + @empr/es-componente
```

not both simultaneously as active orchestration layers.

The reason is architectural clarity.

A runtime should have one primary execution model.

---

# Example: ECS Runtime Thinking

An ECS-oriented slot runtime might think like this:

```txt
Which reels are spinning?
Which symbols match winning filters?
Which Entities need animation updates?
Which Systems should execute during stop flow?
```

Execution revolves around runtime state and filters.

---

# Example: Component Driven Runtime Thinking

A Component Driven runtime might think more like this:

```txt
Which scene module owns this panel?
Which object hierarchy controls this screen?
Which Orchestrator manages this interaction?
Which Components belong to this view?
```

Execution revolves around scene ownership and module organization.

---

# ECS Example Flow

```txt
SpinRequestedSignal
    ↓
FSM transition
    ↓
Pipeline
        ↓
        Systems
            ↓
            filtered Entities
```

This architecture emphasizes explicit execution order and data-driven behavior selection.

---

# Component Driven Example Flow

```txt
Interaction
    ↓
ExecutionQueue
    ↓
Orchestrator.execute(...)
    ↓
scene-owned Components
```

This architecture emphasizes object-centric runtime organization.

---

# Choosing the Right Architecture

There is no universally correct answer.

The best choice depends on:

- project shape,
- gameplay style,
- runtime complexity,
- team background,
- tooling requirements,
- and mental model preferences.

---

# ECS Is Usually Better When...

Choose ECS Pipelines when the project benefits from:

- deterministic execution,
- heavy gameplay flow orchestration,
- simulations,
- large numbers of repeated runtime objects,
- replay/debug tooling,
- slot mechanics,
- data-oriented architecture,
- or highly reusable Systems.

---

# Component Driven Is Usually Better When...

Choose Component Driven when the project benefits from:

- scene hierarchy ownership,
- UI-heavy runtime structure,
- object-centric architecture,
- editor-oriented workflows,
- modular scene composition,
- or teams familiar with Unity/Cocos mental models.

---

# Hybrid Thinking Is Still Possible

Even though an app should choose one execution stack, developers may still borrow architectural ideas from both approaches.

For example:

- Component Driven projects may still value explicit execution flow.
- ECS projects may still organize runtime features around scene ownership.

The important part is keeping execution architecture clear and intentional.

---

# Common Mistakes

## Treating Component Driven as “Easier ECS”

Component Driven is not a simplified ECS mode.

It is a different orchestration model.

---

## Treating ECS as Only for Performance

ECS is not only about optimization.

The major benefits are architectural:

- explicit behavior,
- reusable Systems,
- deterministic flow,
- and composable execution.

---

## Choosing Based Only on Familiarity

Teams often choose the architecture that feels familiar initially.

But long-term runtime shape matters more than short-term familiarity.

---

## Mixing Both Execution Models

Trying to combine both orchestration styles simultaneously usually creates unclear execution ownership.

Choose one primary execution strategy.

---

# Final Mental Model

A useful summary is:

```txt
ECS:
    global data-oriented execution

Component Driven:
    scene-oriented object-centric execution
```

Both use the same runtime foundation.

Both integrate with the same FSM and Signal architecture.

Both remain renderer-agnostic at the core level.

The choice is about:

```txt
how execution is organized
```

not about replacing the framework itself.

---

# Related Articles

- `2.1. Systems`
- `2.2. Pipelines`
- `2.6. What is Component Driven?`
- `3.1. Execution Initiators`
- `3.6. Game Flow with FSM`
- `3.7. FSM + Pipeline + Signal Architecture`

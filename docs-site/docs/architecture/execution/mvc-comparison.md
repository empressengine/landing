# MVC Comparison

## Why Compare ECS and MVC?

Many developers first approach `empr.es` with experience from traditional application architectures.

One of the most familiar mental models is MVC:

```txt
Model
View
Controller
```

This comparison can be useful because it helps explain how responsibilities move in an ECS-based runtime architecture.

However, the comparison must be treated carefully.

`empr.es` is not MVC.

ECS does not map one-to-one to MVC.

Pipelines are not simply Controllers.

Entities are not simply Views.

Components are not full Models.

The analogy is useful only as a bridge.

Its purpose is to help developers understand how familiar responsibilities are redistributed inside `empr.es`.

---

# The Short Analogy

A rough comparison looks like this:

```txt
MVC Model       → Component data
MVC Controller  → Pipeline / application flow
Business logic  → Systems
Runtime object  → Entity
View            → Renderer integration / scene graph
```

But this is only approximate.

A more accurate `empr.es` mental model is:

```txt
Components store data
Systems process data
Pipelines define execution order
Entities compose runtime objects
Renderer integrations display runtime state
FSM controls high-level flow
Signals connect runtime events to execution
```

This is the model developers should eventually use.

The MVC comparison only helps during the transition.

---

# Component vs Model

In MVC, the Model usually represents application data and may also contain business rules.

In `empr.es`, a Component is closer to the data part of a Model, but not the whole Model concept.

A Component should normally be a focused data object:

```typescript
class PositionComponent {
    x = 0;
    y = 0;
}

class VelocityComponent {
    vx = 0;
    vy = 0;
}
```

Conceptually:

```txt
Component = focused runtime data
```

A Component should not become:

- a service,
- a controller,
- a behavior object,
- or a hidden lifecycle owner.

This is one of the biggest differences from traditional MVC-style domain models.

In many application architectures, a Model may contain methods and business behavior.

In `empr.es`, behavior is intentionally moved out of Components and into Systems.

---

# System vs Business Logic

In traditional application architecture, business logic often lives in:

- services,
- domain methods,
- controllers,
- use cases,
- or model methods.

In `empr.es`, focused runtime behavior belongs in Systems.

For example:

```typescript
const movementSystem: System = ({ filter }: SystemProps) => {
    filter({
        includes: [PositionComponent, VelocityComponent],
    }).forEach((entity) => {
        const position = entity.getComponent(PositionComponent);
        const velocity = entity.getComponent(VelocityComponent);

        position.x += velocity.vx;
        position.y += velocity.vy;
    });
};
```

Conceptually:

```txt
System = focused operation over matching runtime data
```

A System is close to “business logic” in the sense that it performs meaningful work.

But unlike many MVC services or controllers, a System is usually:

- small,
- stateless,
- reusable,
- and selected by Pipeline execution.

It does not own the entire application flow.

---

# Pipeline vs Controller

In MVC, the Controller often coordinates what happens in response to input.

It may:

- receive user actions,
- call services,
- update models,
- choose a view,
- or trigger side effects.

A Pipeline is somewhat close to this idea because it defines an ordered runtime flow.

For example:

```typescript
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

Conceptually:

```txt
Pipeline = explicit use-case / application flow
```

This is similar to a Controller or application use case, but more explicit.

A Controller often hides flow inside methods, callbacks, conditions and service calls.

A Pipeline exposes the execution order directly.

That is the key difference.

---

# Why Pipeline Is More Explicit Than a Controller

A typical Controller-style flow may look like this conceptually:

```txt
SpinController.start()
    ↓
calls service
    ↓
service starts animation
    ↓
animation callback mutates state
    ↓
network callback resumes flow
    ↓
controller calls presentation
```

The execution order exists, but it is spread across different methods and callbacks.

In `empr.es`, the same flow can be represented as:

```txt
Lock Input
    ↓
Start Spin
    ↓
Wait For Result
    ↓
Stop Reels
    ↓
Present Win
    ↓
Unlock Input
```

This is the architectural advantage of Pipelines.

The flow is not hidden inside a Controller method.

It is the structure.

A developer can inspect a Pipeline and immediately understand the runtime sequence.

---

# Entity vs ViewModel or Scene Object

An Entity is sometimes tempting to compare to a ViewModel or scene object.

This analogy can help at first, but it is not exact.

An Entity is a runtime composition container.

It becomes meaningful only through the Components attached to it.

For example:

```typescript
const symbol = new Entity('symbol');

symbol.addComponent(new PositionComponent());
symbol.addComponent(new SymbolIdComponent());
symbol.addComponent(new VisibleComponent());
```

Conceptually:

```txt
Entity = runtime identity + component composition
```

An Entity may represent:

- a player,
- an enemy,
- a reel,
- a symbol,
- a button,
- a projectile,
- a state object,
- or a temporary runtime marker.

But the Entity itself should not contain gameplay behavior.

It is not a View in the MVC sense.

It is not a Controller.

It is not a rich domain object.

It is a runtime composition point.

---

# Where Is the View?

In MVC, the View is responsible for presentation.

In `empr.es`, rendering is intentionally separated from the core ECS runtime.

The core package `@empr/es` does not depend on PixiJS, ThreeJS, DOM, Canvas or any renderer-specific API.

Presentation belongs to renderer integrations such as `@empr/es-lienzo`.

So the closest equivalent to a View is not an Entity itself.

Instead, it is the renderer integration layer that observes or represents runtime state visually.

Conceptually:

```txt
Components + Entities
        ↓
Systems mutate runtime data
        ↓
Renderer integration reflects visual state
```

This separation is important because `empr.es` treats rendering as an integration layer, not as the architecture itself.

---

# Where the Analogy Works

The MVC analogy is useful in several places.

---

## Components Are Close to Model Data

Components store focused runtime state.

They describe what an Entity currently is or has.

For example:

```txt
Position
Velocity
Health
SymbolId
ReelIndex
DisabledTag
```

This is similar to Model data, but without business methods.

---

## Systems Are Close to Processing Logic

Systems process data and perform focused runtime operations.

They are close to business logic, but usually smaller and more reusable than traditional services or controllers.

---

## Pipelines Are Close to Use-Case Flow

Pipelines define ordered execution.

They are often closer to application use cases than to traditional MVC Controllers.

For example:

```txt
Start spin
Stop spin
Load scene
Present win
Validate server result
```

---

## Entities Are Runtime Composition Objects

Entities are sometimes close to scene objects or ViewModels because they represent runtime things.

But unlike classic objects, they do not own behavior directly.

Their behavior comes from matching Systems through Component composition.

---

# Where the Analogy Breaks

The analogy breaks if we try to force MVC concepts too literally onto ECS.

---

## Components Are Not Full Domain Models

A Component should not become a rich object with hidden behavior.

In `empr.es`, Components are data holders.

Behavior belongs in Systems.

---

## Systems Are Not Controllers

A System should not own the whole application flow.

It should perform focused work inside a Pipeline.

If a System becomes a large Controller-like object, the architecture starts losing the benefit of ECS.

---

## Pipelines Are Not Views

A Pipeline does not render anything.

It coordinates execution.

Rendering remains outside the core runtime.

---

## Entities Are Not Views

An Entity may be visually represented by a renderer object, but it is not the View itself.

The same Entity model may be used in:

- PixiJS runtime,
- server simulation,
- tests,
- replay tooling,
- or debug tools.

This is why `empr.es` keeps Entities renderer-agnostic.

---

# Why ECS Fits Runtime Games Better Than MVC

MVC works well for many application interfaces.

But games and simulations often have a different runtime shape.

A game may contain:

- hundreds of symbols,
- many moving objects,
- particles,
- projectiles,
- timers,
- temporary effects,
- interactable UI elements,
- pooled runtime objects,
- and server-driven state transitions.

These objects often share repeated behavior.

For example:

```txt
Anything with Position + Velocity can move.
Anything with Health + DamageTarget can receive damage.
Anything with SymbolId + WinningTag can be highlighted.
Anything with InteractableTag can participate in input flow.
```

This is where ECS becomes stronger than traditional MVC.

Behavior is not tied to object classes.

Behavior emerges from Component composition.

---

# Repeated Behavior Without Inheritance

In MVC or object-oriented designs, repeated behavior often leads to inheritance or large shared base classes.

For example:

```txt
MovingEnemy extends Enemy
FlyingEnemy extends Enemy
BossEnemy extends Enemy
```

As behavior combinations grow, inheritance becomes harder to manage.

In ECS, behavior is selected by data composition instead:

```txt
Entity has Position + Velocity → movement System processes it
Entity has Health + Damageable → damage System processes it
Entity has WinningTag + SymbolId → win presentation System processes it
```

This makes runtime behavior more flexible.

An Entity can gain or lose behavior by adding or removing Components.

---

# Pipelines Replace Callback-Heavy Controllers

In many MVC-inspired game architectures, Controllers become callback coordinators.

For example:

```txt
Input callback
    ↓
Controller method
    ↓
Animation callback
    ↓
Network callback
    ↓
State update
    ↓
Presentation callback
```

This creates implicit execution order.

Pipelines replace this with explicit execution order:

```txt
Input Signal
    ↓
Executor
    ↓
Pipeline
    ↓
Ordered Systems
```

This is especially important for:

- slot games,
- deterministic flows,
- replay/debug tooling,
- long-running sessions,
- and complex gameplay transitions.

---

# Practical Translation Table

A developer coming from MVC can roughly translate responsibilities like this:

| Traditional MVC / App Architecture | `empr.es` Responsibility |
| --- | --- |
| Model data | Component |
| Domain object identity | Entity |
| Business operation | System |
| Controller action / use case | Pipeline |
| Application flow | FSM + Pipeline |
| Event handler | Signal / SignalService / InteractionService |
| View | Renderer integration |
| View lifecycle | Renderer integration + lifecycle services |
| Service dependency | DI container |
| Object collection | EntityStorage filter |

This table is intentionally approximate.

It should help orientation, not redefine the framework.

---

# Example: MVC-Style Spin Flow

A traditional MVC-inspired spin flow may look like this:

```txt
SpinController
    ↓
SpinModel
    ↓
ReelViews
    ↓
Animation callbacks
    ↓
Result service
    ↓
WinPresentationController
```

This can work, but execution often becomes distributed across multiple objects.

The flow is not always visible in one place.

---

# Example: empr.es Spin Flow

In `empr.es`, the same concept can be represented as:

```txt
SpinRequestedSignal
    ↓
FSM transition: Idle → Spin
    ↓
spinPipeline
        ↓
        lockInputSystem
        startReelsSystem
        waitForResultSystem
        stopReelsSystem
        evaluateWinsSystem
        presentWinSystem
        unlockInputSystem
```

The responsibilities are separated:

```txt
Components store spin/reel/symbol state.
Systems perform focused operations.
Pipeline defines execution order.
FSM controls high-level allowed states.
Renderer integration displays the result.
```

The result is a runtime architecture where behavior is easier to inspect.

---

# Why This Matters for Debugging

Debugging MVC-style game flow often requires asking:

```txt
Which callback triggered this?
Which controller owns this transition?
Which object mutated this state?
Was the animation callback before or after the network result?
```

With Pipelines, the runtime has a clearer execution structure:

```txt
Which Pipeline ran?
Which System executed?
Which Entities matched the filter?
Which Components changed?
Which Signal or FSM state initiated execution?
```

This is one of the biggest practical advantages of `empr.es`.

The architecture is designed to make runtime behavior observable.

---

# Common Mistakes

## Treating Components as Models With Behavior

Components should stay focused on data.

If behavior starts moving into Components, the ECS separation becomes weaker.

---

## Treating Systems as Controllers

Systems should perform focused work.

High-level orchestration belongs in Pipelines and FSM.

---

## Treating Entities as Views

Entities are runtime composition objects.

Rendering belongs to renderer integrations.

---

## Recreating MVC Inside ECS

It is possible to accidentally rebuild MVC patterns inside ECS names.

For example:

```txt
GameControllerSystem
SpinManagerSystem
ViewModelEntity
```

This often means the architecture is drifting away from data-driven execution.

The goal is not to rename MVC concepts.

The goal is to use the ECS/Pipeline model directly.

---

# Limitations of the MVC Analogy

The MVC comparison is helpful only at the beginning.

Eventually, the better mental model is:

```txt
Data lives in Components.
Identity lives in Entities.
Behavior lives in Systems.
Execution order lives in Pipelines.
High-level flow lives in FSM.
Events live in Signals.
Rendering lives in integrations.
```

That is the actual architecture of `empr.es`.

MVC is only a learning bridge.

---

# Related Articles

- [1.2. ECS in empr.es](/architecture/core-concepts/ecs-in-empr-es)
- [1.3. Entity and Component Model](/architecture/core-concepts/entity-and-component-model)
- [2.1. Systems](/architecture/execution/systems)
- [2.2. Pipelines](/architecture/execution/pipelines)
- [2.3. Pipeline Composition](/architecture/execution/pipeline-composition)
- [3.6. Game Flow with FSM](/architecture/flow-control/game-flow-with-fsm)
- [3.7. FSM + Pipeline + Signal Architecture](/architecture/flow-control/fsm-pipeline-signal-architecture)

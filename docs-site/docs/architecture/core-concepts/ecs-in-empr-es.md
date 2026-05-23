# ECS in empr.es

`empr.es` uses the Entity Component System architectural model as the foundation for its runtime execution layer.

However, the framework does not treat ECS as a purely academic or low-level data-oriented optimization pattern. In `empr.es`, ECS is primarily used as a way to organize gameplay architecture so that runtime behavior remains explicit, composable and maintainable as projects grow.

The goal is not simply to process entities efficiently. The goal is to prevent gameplay logic from collapsing into tightly coupled renderer objects, hidden lifecycle callbacks and implicit runtime side-effects.

Because of this, ECS inside `empr.es` should be understood through the framework's architectural mental model rather than through generic ECS theory alone.

---

# The Mental Model of ECS in empr.es

At a high level, the ECS model inside `empr.es` is built around four responsibilities:

```txt
Entity
    = runtime composition container

Component
    = isolated state description

System
    = executable behavior

Pipeline
    = ordered runtime flow
```

These responsibilities are intentionally separated.

The framework assumes that gameplay architecture becomes significantly easier to reason about when:

- state is isolated from behavior,
- execution flow is explicit,
- runtime ownership is controlled,
- and systems operate on data rather than on deeply interconnected objects.

This separation is the core reason ECS exists inside `empr.es`.

---

# Why Traditional Object-Centric Game Logic Becomes Difficult to Scale

Many browser game projects begin with object-oriented runtime structures.

A visual object gradually accumulates responsibilities:

```txt
PlayerView
    ├─ rendering
    ├─ animation
    ├─ gameplay state
    ├─ input handling
    ├─ network synchronization
    ├─ timers
    ├─ transitions
    ├─ effects
    └─ business logic
```

Initially this feels convenient because everything is located in one place.

Over time, however, several architectural problems begin to appear.

## Runtime Behavior Becomes Implicit

Execution flow starts spreading across:

- callbacks,
- tweens,
- animation events,
- timers,
- async handlers,
- and renderer lifecycle hooks.

Understanding why something happened requires tracing multiple unrelated systems simultaneously.

---

## Objects Become Difficult to Reuse

Behavior becomes tightly coupled to a specific runtime object hierarchy.

A gameplay mechanic implemented for one entity often cannot be reused easily because it depends on:

- renderer state,
- hidden object lifecycle,
- or unrelated internal methods.

---

## Logic Starts Mutating Other Logic Directly

As projects grow, gameplay objects often begin referencing each other directly:

```txt
Player → Inventory → UI → Popup → RewardController → GameState
```

At this point runtime architecture becomes difficult to maintain because systems stop communicating through explicit flow boundaries.

---

## Debugging Becomes Expensive

When execution is distributed across renderer callbacks and interconnected objects, debugging requires reconstructing hidden runtime flow mentally.

This becomes especially painful in:

- slot mechanics,
- asynchronous flows,
- animation-heavy games,
- replay systems,
- and server-driven gameplay.

---

# How ECS Solves This in empr.es

The ECS model inside `empr.es` attempts to solve these problems by making runtime structure significantly more explicit.

Instead of storing all logic inside gameplay objects themselves, the framework separates runtime responsibilities into isolated layers.

---

# Entities: Runtime Composition Containers

In `empr.es`, an Entity is primarily a runtime composition container.

An Entity itself does not define gameplay behavior.

Instead, it aggregates Components that together describe the runtime state of a gameplay object.

For example:

```txt
Player Entity
    ├─ PositionComponent
    ├─ VelocityComponent
    ├─ HealthComponent
    ├─ InventoryComponent
    └─ InputComponent
```

This distinction is important.

The Entity is not intended to become a large gameplay class containing business logic internally. It acts as a stable runtime identity around which state can be composed dynamically.

Because Components can be added and removed during execution, Entities become flexible runtime containers rather than rigid inheritance trees.

This becomes especially useful in gameplay systems where state changes frequently during runtime.

Examples include:

- temporary effects,
- gameplay modifiers,
- animation states,
- combat statuses,
- slot symbol states,
- bonus mechanics,
- or server-driven runtime transitions.

---

# Components: Isolated Runtime State

Components inside `empr.es` are intentionally data-oriented.

Their responsibility is to describe state, not to execute gameplay behavior.

A typical Component might look like this:

```typescript
class PositionComponent {
    public x = 0;
    public y = 0;
}

class VelocityComponent {
    public vx = 0;
    public vy = 0;
}
```

The important architectural decision is not the syntax itself. The important decision is that Components are not expected to coordinate gameplay flow internally.

For example, a `HealthComponent` should not contain methods such as:

```typescript
health.takeDamage()
health.playHitAnimation()
health.triggerDeathFlow()
```

Instead, Components expose runtime state while Systems decide how gameplay behavior should execute.

This separation matters because it prevents gameplay flow from becoming hidden inside arbitrary object methods.

---

# Why Data and Behavior Are Separated

Separating state from behavior is one of the most important ideas inside the framework.

The reason is not ideological purity. The reason is runtime control.

When gameplay behavior is isolated into Systems:

- execution becomes visible,
- execution order becomes controllable,
- systems become reusable,
- and runtime flow becomes significantly easier to debug.

Consider a slot game reel stop flow.

Without explicit execution separation, reel logic often becomes distributed across:

- animation callbacks,
- reel objects,
- symbol objects,
- timers,
- effect handlers,
- and renderer events.

Inside `empr.es`, the same flow can instead become an ordered runtime pipeline:

```txt
Stop Reel
    ↓
Resolve Symbols
    ↓
Evaluate Win
    ↓
Dispatch Result Signals
    ↓
Trigger Presentation Flow
```

Each step becomes isolated, inspectable and replaceable.

This is one of the primary reasons ECS scales well for complex gameplay systems.

---

# Systems: Executable Gameplay Behavior

Systems contain gameplay logic.

A System operates on entities matching specific component filters.

For example:

```typescript
const movementSystem: System = ({ filter }) => {
    const entites = filter({
        includes: [PositionComponent, VelocityComponent],
    })
    
    entites.forEach((entity) => {
        const position = entity.getComponent(PositionComponent);
        const velocity = entity.getComponent(VelocityComponent);

        position.x += velocity.vx;
        position.y += velocity.vy;
    });
};
```

The important idea is not simply that Systems iterate entities.

The important idea is that Systems execute behavior independently from object ownership.

A movement system does not care whether an entity is:

- a player,
- an enemy,
- a projectile,
- or a pooled runtime object.

It only cares whether the entity contains the required runtime state.

This dramatically improves behavior reuse.

---

# Component Filters and Runtime Queries

Systems inside `empr.es` do not manually traverse object trees.

Instead, they operate through component filters.

A filter describes:

- what Components must exist,
- what Components must not exist,
- and therefore which entities participate in a particular execution step.

For example:

```typescript
filter({
    includes: [PositionComponent, VelocityComponent],
    excludes: [FrozenComponent],
});
```

This creates a runtime execution model where behavior emerges from state composition rather than from inheritance hierarchies.

An entity automatically becomes eligible for a System when its runtime state matches the filter.

This becomes especially powerful in highly dynamic gameplay flows because behavior can appear and disappear naturally as Components are added or removed.

---

# Why ECS Works Well for Repeated Behavior

ECS is particularly effective when many runtime objects share the same behavior patterns.

Examples include:

- particles,
- projectiles,
- enemies,
- slot symbols,
- status effects,
- UI transitions,
- or repeated animation coordination.

Instead of creating specialized gameplay classes for every variation, ECS allows behavior to remain generic.

A single System may process hundreds or thousands of entities consistently because execution depends on state composition rather than object inheritance.

This significantly reduces duplicated gameplay logic.

---

# Deterministic Flow and Runtime Visibility

One of the major architectural advantages of ECS in `empr.es` is that runtime execution becomes significantly easier to observe and control.

Because behavior is organized into Systems and Pipelines:

- execution order becomes explicit,
- runtime transitions become traceable,
- and flow orchestration becomes inspectable.

This is particularly important for:

- deterministic gameplay,
- slot mechanics,
- replay systems,
- server-authoritative outcomes,
- debugging tools,
- and long-running game sessions.

The framework intentionally favors visible execution flow over implicit object behavior.

---

# ECS and Slot Mechanics

The ECS model fits especially well with slot-style runtime architecture.

Slot games often contain:

- repeated reel behavior,
- reusable symbol logic,
- deterministic result flows,
- state-driven animation sequences,
- and heavily orchestrated execution order.

In object-centric architectures, this logic frequently becomes distributed across renderer objects and asynchronous callbacks.

In `empr.es`, ECS allows these systems to become structured execution pipelines instead.

For example:

```txt
Spin Requested
    ↓
Lock Input
    ↓
Start Reel Motion
    ↓
Await Server Result
    ↓
Stop Reels
    ↓
Resolve Wins
    ↓
Dispatch Win Signals
    ↓
Run Presentation Flow
```

This makes gameplay flow significantly easier to reason about and debug.

---

# ECS in empr.es Is Not a Pure Data-Oriented ECS

It is important to understand that `empr.es` does not attempt to behave like extremely low-level data-oriented ECS frameworks such as `bitECS`.

The framework intentionally prioritizes:

- architecture clarity,
- runtime flexibility,
- TypeScript ergonomics,
- and maintainability.

Instead of forcing gameplay state into tightly packed typed arrays, `empr.es` uses a class-oriented TypeScript model that integrates naturally with:

- dependency injection,
- runtime services,
- FSM,
- signals,
- object pooling,
- and execution orchestration.

This makes the framework significantly more approachable for browser game teams while still preserving the core architectural advantages of ECS.

The framework is optimized less for extreme raw throughput and more for sustainable runtime architecture.

---

# Why TypeScript Matters in the ECS Model

The ECS implementation inside `empr.es` is designed specifically around TypeScript-friendly workflows.

This includes:

- class-based Components,
- typed Systems,
- typed runtime signals,
- typed dependency injection,
- and strongly typed execution flow.

The goal is to make large gameplay architectures easier to navigate and maintain inside modern IDE workflows.

As projects scale, type safety becomes increasingly important because gameplay runtime complexity grows much faster than rendering complexity.

---

# ECS as an Architectural Tool

Inside `empr.es`, ECS should not be viewed only as a data-processing pattern.

It is primarily an architectural tool for controlling runtime complexity.

The framework uses ECS because it helps:

- isolate runtime responsibilities,
- make execution visible,
- organize repeated behavior,
- reduce gameplay coupling,
- improve runtime composability,
- and keep large gameplay systems maintainable over time.

This architectural focus is the reason ECS is deeply integrated into the runtime model of `empr.es`.

---

# Related Articles

- [What is empr.es?](/)
- [Entity and Component Model](/architecture/core-concepts/entity-and-component-model)
- [EntityStorage and Component Filtering](/architecture/core-concepts/entity-storage-and-component-filtering)
- [Systems](/architecture/execution/systems)
- [Pipelines](/architecture/execution/pipelines)
- [Signal and SignalService](/architecture/flow-control/signal-and-signalservice)
- [FSM and Runtime Flow](/#fsm-and-runtime-flow)
- [ECS vs Component Driven](/architecture/execution/ecs-vs-component-driven)

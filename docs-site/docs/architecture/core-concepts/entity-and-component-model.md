# Entity and Component Model

Entity and Component are the two most basic building blocks in the `empr.es` runtime model.

They are deliberately simple concepts, but most of the framework architecture depends on using them correctly.

An Entity is a runtime container.  
A Component is a focused piece of state.  

Together they allow a game object to be assembled through composition instead of inheritance.

This is one of the most important ideas in the framework: an object does not become a player, enemy, reel, symbol, button or state holder because it extends the right base class. It becomes that thing because it has the right set of Components attached to it at runtime.

---

# The Core Idea

In `empr.es`, runtime objects are not designed as large classes with deeply embedded behavior.

Instead, the framework separates object identity from object state.

An Entity provides identity and composition.  
Components provide state.  
Systems provide behavior.

This creates a model where runtime behavior is not locked inside the object itself. Behavior is executed externally by Systems that select Entities through Component filters.

A simple mental model looks like this:

```txt
Entity
    ├─ Component
    ├─ Component
    ├─ Component
    └─ Component

System
    ↓
filters entities by component composition
    ↓
executes behavior on matching entities
```

This means that an Entity is not interesting because of its class hierarchy. It is interesting because of its current Component set.

---

# What Is an Entity?

An Entity is a runtime composition container for Components.

It acts as a stable runtime identity that can receive, hold, expose and remove Components during execution.

An Entity itself should not be treated as the place where gameplay rules live. It is not meant to become a large business object with methods like `attack()`, `spin()`, `die()`, `openPopup()` or `resolveWin()`.

Instead, an Entity answers a simpler architectural question:

> What runtime object are we talking about, and what state is currently attached to it?

For example, a player entity may be composed like this:

```txt
Player Entity
    ├─ PositionComponent
    ├─ VelocityComponent
    ├─ HealthComponent
    ├─ InputComponent
    └─ PlayerTagComponent
```

An enemy may share most of the same Components:

```txt
Enemy Entity
    ├─ PositionComponent
    ├─ VelocityComponent
    ├─ HealthComponent
    ├─ AIIntentComponent
    └─ EnemyTagComponent
```

The difference between these two objects is not necessarily a different class. The difference is their runtime composition.

This is the foundation of the Entity model in `empr.es`.

---

# Entity as Runtime Identity

An Entity gives runtime state a place to belong.

That identity may represent many different things depending on the project:

```txt
Player
Enemy
Projectile
Reel
Symbol
Button
Popup
Scene state object
Network session object
Temporary effect
```

The Entity does not need to know what kind of gameplay object it is in an object-oriented sense.

Instead, the rest of the runtime can infer what the Entity participates in by checking its Components.

A reel Entity may be relevant to reel motion Systems because it has `ReelComponent` and `PositionComponent`.

A symbol Entity may be relevant to win-evaluation Systems because it has `SymbolComponent`, `ReelIndexComponent` and `SymbolPositionComponent`.

A button Entity may be relevant to interaction Systems because it has `ButtonComponent`, `InteractiveComponent` or another input-related Component.

This keeps the Entity itself small while allowing the runtime composition to remain expressive.

---

# What Is a Component?

A Component is a focused data object that describes one aspect of an Entity.

A Component should answer a narrow question:

```txt
Where is this entity?
How fast is it moving?
How much health does it have?
What symbol does it represent?
Is it spinning?
Is it disabled?
What reel does it belong to?
```

A Component should not answer:

```txt
How should the game flow proceed?
Which animation should run next?
When should the server request be sent?
How should the entity destroy itself?
Which other systems should be triggered?
```

Those questions belong to Systems, Pipelines, FSM flows, Signals or services.

A typical Component in `empr.es` should be a small TypeScript class focused on state:

```typescript
class PositionComponent {
    public x = 0;
    public y = 0;
}

class VelocityComponent {
    public vx = 0;
    public vy = 0;
}

class HealthComponent {
    public current = 100;
    public max = 100;
}
```

The syntax is intentionally familiar for TypeScript developers. The framework does not require every piece of data to be stored in a low-level typed array structure. Instead, `empr.es` favors class-based Components that are easier to read, type, inspect and integrate with the rest of the architecture.

---

# Why Components Should Stay Data-Only

Keeping Components data-only is not just a stylistic preference.

It is an architectural rule that keeps runtime behavior visible.

When Components begin to contain behavior, that behavior becomes harder to reason about. A method on a Component may mutate state, trigger events, access services, start animations or call unrelated logic. Over time, Components can become small hidden controllers attached to Entities.

That breaks the ECS model.

In `empr.es`, Components should stay focused because Systems are responsible for behavior. This allows execution to remain explicit and ordered.

For example, this kind of Component is usually healthy:

```typescript
class SpinStateComponent {
    public isSpinning = false;
    public speed = 0;
    public targetOffset = 0;
}
```

It describes state.

This kind of Component is problematic:

```typescript
class SpinStateComponent {
    public isSpinning = false;
    public speed = 0;
    public targetOffset = 0;

    public stopReel() {
        // starts animations
        // dispatches signals
        // changes global state
        // calls services
    }
}
```

The problem is not that methods are technically impossible in TypeScript. The problem is that lifecycle and execution side effects become hidden inside data objects.

Once this happens, the framework loses one of its main advantages: visible runtime flow.

---

# How Components Are Added

Entities become meaningful through Components.

A newly created Entity may start empty or with only a few basic Components. During runtime, additional Components can be attached to make the Entity participate in more systems.

A simplified example:

```typescript
const player = new Entity('player');

player.addComponent(new PositionComponent());
player.addComponent(new VelocityComponent());
player.addComponent(new HealthComponent());
player.addComponent(new PlayerTagComponent());
```

After these Components are attached, Systems that filter for those Component types can begin processing the Entity.

The Entity does not need to register itself manually in every System. Its Component composition determines where it participates.

This is one of the key advantages of ECS: behavior eligibility is data-driven.

---

# How Components Are Queried

Systems usually do not ask whether an Entity is a specific class.

They ask whether an Entity has the required Components.

For example, a movement System may process every Entity that has both position and velocity:

```typescript
const movementSystem: System = ({ filter }) => {
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

The System does not care whether the Entity represents a player, enemy, projectile, symbol or UI object.

If the Entity has the required data, it participates.

This is what makes Component composition powerful: behavior can be shared across many different runtime objects without creating inheritance chains.

---

# How Components Are Removed

Components can also be removed when an Entity should stop participating in a particular behavior.

For example, if an Entity should no longer move, the runtime can remove the Component that makes it eligible for movement:

```typescript
entity.removeComponent(VelocityComponent);
```

After this, a movement System that requires `VelocityComponent` will no longer include that Entity in its filtered result.

This is a major difference from inheritance-based designs. Instead of changing the object's class or adding conditional flags inside behavior methods, the runtime changes the Entity's composition.

The Entity becomes eligible or ineligible for behavior based on its current state shape.

---

# Enabled and Disabled Runtime State

The framework also allows runtime participation to be controlled without necessarily destroying the Entity.

At the Entity level, an inactive Entity can be excluded from filters until it becomes active again.

This is useful when an object should temporarily stop participating in execution without being destroyed or fully re-created.

For example:

```typescript
entity.active = false;
```

The exact decision between removing a Component, disabling an Entity, or releasing it into a pool depends on the runtime meaning.

These options represent different architectural intentions:

```txt
Remove Component
    → the entity no longer has this specific state or behavior eligibility

Disable Entity
    → the entity temporarily stops participating as an active runtime object

Release Entity to Pool
    → the entity instance is preserved for reuse but removed from normal runtime visibility
```

Keeping these meanings separate helps avoid lifecycle ambiguity.

---

# Composition Over Inheritance

The Entity and Component model is based on composition rather than inheritance.

In an inheritance-based game architecture, the type hierarchy often grows like this:

```txt
BaseGameObject
    ├─ Character
    │   ├─ Player
    │   ├─ Enemy
    │   └─ BossEnemy
    ├─ Projectile
    ├─ Reel
    ├─ Symbol
    └─ Button
```

This can work for small projects, but it becomes rigid when objects start sharing behavior across unrelated branches.

For example:

- a player and enemy may both move,
- a projectile and symbol may both have position,
- a button and reel may both be interactive,
- a symbol and popup may both participate in animation flows,
- an enemy and temporary effect may both have lifetime rules.

Inheritance forces these relationships into a tree. Gameplay behavior rarely fits cleanly into a tree.

Composition allows each Entity to be assembled from smaller focused state units.

```txt
Entity A
    ├─ PositionComponent
    ├─ VelocityComponent
    └─ HealthComponent

Entity B
    ├─ PositionComponent
    ├─ VelocityComponent
    └─ LifetimeComponent

Entity C
    ├─ PositionComponent
    ├─ InteractiveComponent
    └─ ButtonStateComponent
```

The same System can process shared behavior wherever the required Components exist.

This is why composition is more flexible than inheritance for game logic.

---

# How an Entity Becomes a Gameplay Object

In `empr.es`, an Entity becomes a meaningful gameplay object through its Component composition.

A player is not necessarily a `Player` class.

It may be an Entity with:

```txt
PlayerTagComponent
PositionComponent
VelocityComponent
HealthComponent
InputComponent
InventoryComponent
```

An enemy may be:

```txt
EnemyTagComponent
PositionComponent
VelocityComponent
HealthComponent
AIStateComponent
```

A reel may be:

```txt
ReelComponent
SpinStateComponent
StopTargetComponent
PositionComponent
```

A symbol may be:

```txt
SymbolComponent
ReelIndexComponent
SymbolPositionComponent
WinParticipationComponent
```

A button may be:

```txt
ButtonComponent
InteractiveComponent
DisabledStateComponent
```

This model makes runtime objects highly flexible.

A symbol can temporarily become part of a win presentation by receiving a `WinParticipationComponent`.

A button can stop receiving interaction behavior by gaining a disabled state or losing an interaction-related Component.

A reel can enter a stopping flow by adding a stop-related Component.

The object changes behavior because its state composition changes.

---

# Tag Components

Some Components may not contain much data.

A tag Component exists primarily to mark an Entity as belonging to a particular runtime category.

For example:

```typescript
class PlayerTagComponent {}

class EnemyTagComponent {}

class SpinningTagComponent {}

class DisabledTagComponent {}
```

Tag Components are useful when a System needs to select Entities by role or state without requiring additional data.

For example, a System may process all spinning reels by filtering for `ReelComponent` and `SpinningTagComponent`.

This keeps state explicit and queryable without relying on string flags or hidden class checks.

---

# Components as Runtime Capabilities

A useful way to think about Components is to treat them as runtime capabilities.

If an Entity has `VelocityComponent`, it can participate in movement.

If it has `InteractiveComponent`, it can participate in interaction handling.

If it has `SpinStateComponent`, it can participate in spin-related execution.

If it has `HealthComponent`, it can participate in damage and death evaluation.

This mental model is especially useful because it avoids asking:

```txt
What class is this object?
```

Instead, the runtime asks:

```txt
What state and capabilities does this Entity currently have?
```

That question is much more flexible in complex games.

---

# Why This Model Helps Debugging

The Entity and Component model makes runtime state easier to inspect.

When logic is distributed across methods and inheritance chains, understanding object behavior requires reading the class hierarchy and following method calls.

With ECS composition, debugging can start from a simpler question:

```txt
Which Components does this Entity currently have?
```

From there, it becomes easier to understand:

- which Systems can process the Entity,
- why a behavior did or did not run,
- whether a temporary state was added,
- whether a Component was removed too early,
- or whether an Entity was disabled or released from runtime visibility.

This is one of the reasons the model works well with debug panels, entity inspectors and execution tracing tools.

---

# Common Mistakes

## Putting Behavior Inside Components

The most common mistake is allowing Components to become behavior containers.

A Component should describe state. It should not secretly orchestrate flow, dispatch unrelated events, start animations or resolve gameplay rules.

If a Component starts needing injected services, callbacks, async orchestration or lifecycle logic, that is usually a sign that the behavior belongs elsewhere.

---

## Creating Too Many Inheritance-Like Components

Another mistake is designing Components as if they were classes in an inheritance hierarchy.

For example:

```txt
BaseEnemyComponent
MeleeEnemyComponent
FlyingMeleeEnemyComponent
BossFlyingMeleeEnemyComponent
```

This usually recreates the same rigidity that ECS is meant to avoid.

Prefer smaller focused Components that can be combined.

---

## Using Boolean Flags Instead of Explicit Components

A large Component full of unrelated boolean flags can hide important runtime state.

For example:

```typescript
class SymbolStateComponent {
    public isWild = false;
    public isWinning = false;
    public isLocked = false;
    public isAnimating = false;
    public isDisabled = false;
}
```

Sometimes this is acceptable for tightly related state. But if each flag controls participation in different Systems, explicit Components or tag Components may be clearer.

The decision should be based on runtime meaning.

---

## Treating Entity as a God Object

An Entity should not become the place where all convenience methods accumulate.

If application code starts using Entity as a high-level gameplay API, the architecture can slowly drift back toward object-centric design.

The Entity should remain a composition container, not the owner of all behavior.

---

# Design Tradeoffs

The `empr.es` Entity and Component model is intentionally TypeScript-friendly and class-based.

This is different from pure data-oriented ECS implementations that store everything in tightly packed typed arrays.

That choice has tradeoffs.

A pure typed-array ECS may provide better raw iteration performance in extremely large simulations. However, it often comes with a more specialized development model and less natural integration with typical TypeScript application architecture.

`empr.es` prioritizes:

- readable Components,
- strong TypeScript ergonomics,
- easy integration with DI, FSM and Signals,
- runtime flexibility,
- and maintainable architecture for complex browser games.

The framework is not trying to be the lowest-level ECS possible.

It is trying to make ECS practical for production browser game architecture.

---

# Related Articles

- [What is empr.es?](/)
- [ECS in empr.es](/architecture/core-concepts/ecs-in-empr-es)
- [EntityStorage and Component Filtering](/architecture/core-concepts/entity-storage-and-component-filtering)
- [Systems](/architecture/execution/systems)
- [Pipelines](/architecture/execution/pipelines)
- [ObjectPool and Pools](/architecture/runtime-services/object-pool-and-pools)
- [LifecycleTracker and TrackedSignal](/architecture/runtime-services/lifecycle-tracker-and-tracked-signal)

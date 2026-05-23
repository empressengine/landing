# Entity Lifecycle and Pool-aware Storage

## What This Article Covers

This article explains how entity lifecycle works inside `@empr/es`.

More specifically:

- how entities become visible to the runtime,
- how entities are removed,
- how pooled entities behave,
- and how `EntityStorage` manages runtime visibility.

One of the most important goals of this article is to clearly explain the difference between:

```txt
Permanent destruction
        vs
Temporary pooled release
```

This distinction is extremely important in long-running games where runtime objects are frequently reused.

---

# EntityStorage as Runtime Source of Truth

Inside `empr.es`, all active runtime entities live inside:

```typescript
EntityStorage
```

Conceptually:

```txt
EntityStorage
        ↓
owns active runtime entities
        ↓
provides indexed filtering
        ↓
feeds Systems and Queries
```

If an Entity is not registered inside `EntityStorage`:

```txt
Systems cannot see it.
Queries cannot find it.
Filters do not include it.
```

This is one of the core architectural rules of the ECS runtime.

---

# Runtime Visibility

An Entity only participates in ECS execution when it is registered in storage.

Conceptually:

```txt
Create entity
        ↓
Add components
        ↓
Register entity in storage
        ↓
Entity becomes visible
```

Before registration:

```txt
The entity exists as an object
but does not participate in runtime execution.
```

---

# addEntity

Entities become active through:

```typescript
storage.addEntity(entity);
```

Example:

```typescript
import {
    Entity,
    EntityStorage,
} from '@empr/es';

const bullet = new Entity('bullet');

bullet.addComponent(
    new PositionComponent(),
);

bullet.addComponent(
    new VelocityComponent(),
);

storage.addEntity(bullet);
```

Conceptually:

```txt
Register entity
        ↓
Index components
        ↓
Entity becomes visible to filters
```

Immediately afterward:

```typescript
filter({
    includes: [
        PositionComponent,
        VelocityComponent,
    ],
});
```

can now return the entity.

---

# What Happens Internally During addEntity

Conceptually, `addEntity` performs several important operations:

```txt
Store entity reference
        ↓
Index all components
        ↓
Notify reactive queries
        ↓
Entity becomes observable
```

This is why newly added entities immediately participate in runtime execution.

Systems do not need to manually register themselves to observe new entities.

---

# Visibility Through Filters

Once added:

```typescript
storage.addEntity(entity);
```

the Entity becomes visible to:

- Systems,
- `EntityQuery`,
- storage filters,
- reactive queries,
- and runtime indexing.

For example:

```typescript
const entities = storage.filter({
    includes: [HealthComponent],
});
```

If the entity matches the filter:

```txt
It appears immediately.
```

---

# Removing Entities Permanently

There are several ways to permanently remove entities depending on the runtime situation.

Conceptually, permanent removal means:

```txt
The entity is no longer valid runtime state.
```

Typical permanent lifecycle:

```txt
Create entity
        ↓
Use entity
        ↓
Destroy entity forever
```

Examples include:

- permanently dead enemies,
- completed save data objects,
- destroyed runtime actors,
- or entities that should never return.

---

# removeEntity

`removeEntity` removes the entity from runtime storage.

Conceptually:

```typescript
storage.removeEntity(entity);
```

Behaviorally:

```txt
Entity disappears from storage
        ↓
Entity removed from indexes
        ↓
Queries stop seeing it
```

The exact invalidation semantics depend on the runtime implementation and higher-level lifecycle rules.

Architecturally, the important point is:

```txt
The entity is no longer part of active runtime execution.
```

---

# Destroying Entities

In many runtime flows, entities may also be fully destroyed.

Conceptually:

```typescript
entity.destroy();
```

This usually means:

```txt
Dispose lifecycle
        ↓
Clear subscriptions
        ↓
Invalidate runtime object
```

Destroyed entities should not be reused.

This is fundamentally different from pooled lifecycle management.

---

# Permanent Removal vs Pool Release

One of the most important architectural distinctions in `@empr/es` is:

```txt
removeEntity / destroy
        ≠
releaseEntity
```

These operations solve different problems.

---

# Permanent Removal

Conceptually:

```txt
This entity should never return.
```

Typical examples:

- completed gameplay objects,
- invalid runtime state,
- destroyed save entities,
- or unrecoverable objects.

Lifecycle:

```txt
Entity removed
        ↓
Lifecycle disposed
        ↓
Object becomes invalid
```

---

# Pool Release

Conceptually:

```txt
This entity is temporarily inactive
but should survive for reuse.
```

Typical examples:

- bullets,
- particles,
- pooled enemies,
- temporary effects,
- reusable gameplay entities.

Lifecycle:

```txt
Entity removed from runtime visibility
        ↓
Entity instance survives
        ↓
May be acquired later
```

This distinction is extremely important.

---

# releaseEntity

`EntityStorage` provides:

```typescript
storage.releaseEntity(entity);
```

Conceptually:

```txt
Temporarily remove entity
without destroying it
```

Example:

```typescript
storage.releaseEntity(bulletEntity);
```

Behavior:

```txt
Entity removed from storage
        ↓
Components unindexed
        ↓
Queries stop seeing entity
        ↓
Instance survives
```

The Entity still exists as a runtime object.

It is simply no longer active inside ECS execution.

---

# Released Entities Must Not Appear in Filters

This is one of the most important rules of pool-aware storage.

After:

```typescript
storage.releaseEntity(entity);
```

the Entity must disappear from:

- `filter(...)`,
- `EntityQuery`,
- System iteration,
- and runtime indexes.

Conceptually:

```txt
Released pooled entities are invisible.
```

This prevents inactive pooled entities from accidentally participating in gameplay logic.

---

# Why This Matters

Imagine pooled bullets.

Without release-aware storage:

```txt
Inactive pooled bullets
still appear in collision systems
```

or:

```txt
Released enemies
still receive damage
```

This would create extremely difficult runtime bugs.

`releaseEntity` prevents pooled runtime objects from remaining visible to ECS execution.

---

# acquireEntity

Previously released entities may return through:

```typescript
storage.acquireEntity(entity);
```

Conceptually:

```txt
Re-register pooled entity
into active runtime storage
```

Example:

```typescript
storage.acquireEntity(bulletEntity);
```

Behavior:

```txt
Entity re-added to storage
        ↓
Components re-indexed
        ↓
Queries see entity again
```

The same runtime instance becomes active again.

---

# Acquired Entities Become Visible Immediately

One of the core architectural guarantees is:

```txt
Acquired entities immediately
participate in runtime execution.
```

For example:

```typescript
storage.acquireEntity(entity);
```

Immediately afterward:

```typescript
filter({
    includes: [PositionComponent],
});
```

may return the entity again.

This keeps pooled lifecycle behavior fully deterministic.

---

# Pool-aware Queries

`EntityQuery` is aware of pooled lifecycle.

Conceptually:

```txt
releaseEntity
        ↓
EntityQuery removes entity

acquireEntity
        ↓
EntityQuery re-evaluates entity
```

This means reactive queries automatically stay synchronized with pooled entity visibility.

No manual refresh is required.

---

# Example: Bullet Pool Lifecycle

Conceptually:

```txt
Acquire bullet entity
        ↓
Add to storage
        ↓
Bullet becomes active
        ↓
Gameplay simulation
        ↓
Release bullet entity
        ↓
Bullet disappears from ECS
        ↓
Bullet reused later
```

Importantly:

```txt
The runtime object survives.
The ECS visibility changes.
```

---

# Example: Enemy Respawn

Pooled lifecycle is also useful for enemy reuse.

Conceptually:

```txt
Acquire enemy entity
        ↓
Add to gameplay
        ↓
Enemy defeated
        ↓
Release enemy entity
        ↓
Reuse entity later
```

This avoids constant runtime allocation and destruction.

---

# Pool-aware Lifecycle Reduces Allocation Pressure

One major reason pooled entity lifecycle exists is runtime stability.

Without pooling:

```txt
Spawn entity
        ↓
Destroy entity
        ↓
Garbage collection
```

With pooling:

```txt
Acquire entity
        ↓
Release entity
        ↓
Reuse existing instance
```

This significantly reduces:

- allocations,
- garbage generation,
- and GC spikes.

Especially during long-running gameplay sessions.

---

# EntityStorage Controls Runtime Participation

One very important architectural rule is:

```txt
Storage visibility
defines runtime participation.
```

Even if an Entity instance still exists:

```txt
If it is not registered in storage,
Systems cannot see it.
```

This keeps ECS execution deterministic and explicit.

---

# Entity Lifecycle vs Active State

`Entity.active` and storage lifecycle solve different problems.

Example:

```typescript
entity.active = false;
```

Conceptually:

```txt
Temporarily disable entity participation
while entity remains registered
```

Meanwhile:

```typescript
storage.releaseEntity(entity);
```

means:

```txt
Remove entity from storage entirely
without destroying instance
```

This is a stronger lifecycle transition.

---

# Common Mistakes

## Reusing Destroyed Entities

Destroyed entities should not return to gameplay.

Pooled lifecycle should use:

```txt
releaseEntity / acquireEntity
```

instead of destruction.

---

## Forgetting to Release Pooled Entities

If pooled entities are never released:

```txt
Pool effectiveness disappears
```

and runtime allocations continue growing.

---

## Expecting Released Entities to Appear in Queries

Released entities are intentionally invisible to ECS execution.

This is required for safe pooling behavior.

---

## Confusing Disabled and Released Entities

`active = false` and `releaseEntity()` are different lifecycle concepts.

One disables participation.

The other removes runtime registration entirely.

---

# Limitations and Design Decisions

The entity lifecycle system in `@empr/es` intentionally separates:

```txt
Visibility
        ↓
Lifecycle
        ↓
Memory reuse
```

This allows the framework to support:

- deterministic ECS execution,
- pool-aware runtime storage,
- reactive queries,
- and long-running gameplay sessions.

Without coupling entity lifetime directly to object allocation.

---

# Related Articles

- [1.3. Entity and Component Model](/architecture/core-concepts/entity-and-component-model)
- [1.4. EntityStorage and Component Filtering](/architecture/core-concepts/entity-storage-and-component-filtering)
- [4.3. ObjectPool and Pools](/architecture/runtime-services/object-pool-and-pools)
- [2.1. Systems](/architecture/execution/systems)

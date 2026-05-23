# EntityStorage and Component Filtering

At some point every ECS architecture must answer the same practical question:

> Where do all runtime entities actually live, and how do Systems find the ones they need?

In `empr.es`, the answer is `EntityStorage`.

`EntityStorage` is the central runtime container responsible for storing active Entities, maintaining Component indexes and resolving runtime queries for Systems and execution flows.

However, reducing `EntityStorage` to “just a collection of entities” would miss its real architectural role.

Inside the framework, `EntityStorage` acts as:

- the authoritative source of truth for runtime entity visibility,
- the central query layer for ECS execution,
- the bridge between entity lifecycle and filtering,
- and the reactive backbone behind live runtime queries.

Most ECS behavior inside `empr.es` ultimately depends on the relationship between `EntityStorage`, Component indexes and filtering.

---

# Why EntityStorage Exists

A small project can often survive without a centralized runtime storage layer.

Gameplay objects simply get stored manually:

```txt
players[]
enemies[]
projectiles[]
reels[]
symbols[]
buttons[]
effects[]
```

At first this seems manageable.

The problem appears when runtime behavior becomes more interconnected.

A movement System suddenly needs access to projectiles.  
A damage System needs every entity with health.  
A presentation flow needs winning symbols.  
A replay system needs deterministic runtime visibility.  
A debug tool needs to inspect all active gameplay state.

At this point the architecture usually starts accumulating:

- duplicated collections,
- stale references,
- synchronization bugs,
- inconsistent ownership,
- and tightly coupled runtime logic.

Different systems begin maintaining their own partial understanding of the runtime world.

This creates fragmentation.

`EntityStorage` exists to prevent this.

Instead of Systems manually owning gameplay collections, Systems describe the runtime state they care about and let the storage layer resolve matching Entities automatically.

This is one of the core architectural ideas behind ECS execution in `empr.es`.

---

# EntityStorage as the Runtime Source of Truth

Inside `empr.es`, active runtime Entities live inside `EntityStorage`.

Conceptually, the storage layer answers several critical runtime questions:

```txt
Which entities currently exist?
Which entities are active?
Which entities match this filter?
Which entities are disabled?
Which entities were released into pools?
Which entities should participate in this System?
```

Because of this, `EntityStorage` becomes the authoritative runtime visibility layer.

Systems are intentionally designed not to own gameplay objects directly.

Instead, they observe the runtime through filtered queries.

This distinction is extremely important because it keeps gameplay behavior decoupled from object ownership.

---

# Entity Lifecycle Inside Storage

An Entity may move through multiple runtime lifecycle states during execution.

Conceptually, the lifecycle usually looks like this:

```txt
Created
    ↓
Added to storage
    ↓
Visible to Systems
    ↓
Components mutate over time
    ↓
Disabled / Released / Removed
    ↓
Destroyed or Re-acquired
```

The important detail is that these operations do not mean the same thing.

`EntityStorage` treats:

- removal,
- destruction,
- release,
- acquisition,
- and active state changes

as separate lifecycle concepts because each one affects runtime visibility differently.

---

# Adding Entities

An Entity becomes part of active runtime execution when it is added to storage.

Conceptually:

```typescript
storage.addEntity(entity);
```

During addition, several important things happen internally:

```txt
Entity uniqueness is validated
    ↓
Entity is proxied
    ↓
Storage registers the entity
    ↓
Component indexes are updated
    ↓
Entity becomes visible to queries
```

The proxying step is particularly important.

`EntityStorage` internally wraps entities using `ProxyEntity` so that Component mutations can automatically synchronize with the indexing layer.

This means Systems do not need to manually notify the runtime every time a Component changes.

The storage layer reacts automatically.

Once added, the Entity immediately becomes eligible for Systems whose filters match its Component composition.

The Entity does not manually subscribe itself to Systems. Participation is entirely query-driven.

---

# Removing Entities

Removing an Entity from storage makes it disappear from active runtime visibility.

Conceptually:

```typescript
storage.removeEntity(entity.id);
```

After removal:

- Systems stop receiving the Entity,
- live queries stop tracking it,
- and the Entity no longer participates in ECS execution.

Importantly, removal is not necessarily the same thing as destruction.

An Entity instance may still exist in memory after removal depending on the runtime lifecycle strategy.

This distinction becomes especially important once pooling is introduced.

---

# Destroying Entities

Destroyed Entities are considered permanently finished from the perspective of the active runtime.

Internally, `EntityStorage` reacts to `OnEntityDestroySignal` and automatically removes destroyed Entities from its internal registry.

Conceptually, destruction means:

```txt
This Entity should no longer participate
in the runtime lifecycle at all.
```

Destruction may involve:

- removing the Entity from storage,
- removing index references,
- clearing runtime subscriptions,
- disposing reactive ownership,
- and cleaning execution visibility.

Destroyed Entities are expected to disappear permanently from runtime queries.

---

# Releasing and Acquiring Entities

One of the more important design details inside `empr.es` is that pooled Entities are treated differently from destroyed Entities.

An Entity may temporarily leave active runtime visibility without being destroyed.

Conceptually:

```typescript
storage.releaseEntity(entity);
```

Internally this operation:

- removes the Entity from storage,
- unindexes all Components,
- dispatches `OnEntityReleasedSignal`,
- and removes the Entity from live queries.

However, the Entity instance itself still exists.

This distinction matters because pooled runtime objects should not remain visible to Systems while inactive.

A released projectile should not continue colliding.  
A released symbol should not continue participating in win evaluation.  
A released UI object should not continue receiving interaction logic.

Later, the same Entity may be re-acquired:

```typescript
storage.acquireEntity(entity);
```

Acquisition:

- re-registers the Entity,
- rebuilds Component indexes,
- dispatches `OnEntityAcquiredSignal`,
- and allows live queries to re-evaluate the Entity automatically.

This creates a lifecycle model where runtime visibility and memory existence are intentionally separated.

That is a very important architectural distinction in `empr.es`.

---

# Why Systems Use Filters Instead of Manual References

The central idea behind ECS filtering is that Systems should not manually search gameplay objects.

Instead, Systems describe the runtime state they require.

For example:

```typescript
filter({
    includes: [PositionComponent, VelocityComponent],
});
```

Conceptually this means:

```txt
Give me all active entities
that contain PositionComponent
and VelocityComponent.
```

The System does not care:

- where the Entity was created,
- which scene owns it,
- which renderer object represents it,
- or what gameplay category it belongs to.

The only thing that matters is Component composition.

This dramatically reduces runtime coupling.

---

# How Filtering Works Internally

At the architectural level, filtering inside `empr.es` is index-driven.

The runtime maintains associations between:

```txt
Component Type
        ↓
Entities containing that Component
```

Conceptually, the indexing layer can answer questions like:

```txt
Which entities currently have HealthComponent?
Which entities currently have VelocityComponent?
Which entities currently have ReelComponent?
```

When a filter executes:

```typescript
filter({
    includes: [PositionComponent, VelocityComponent],
    excludes: [FrozenComponent],
});
```

the runtime resolves:

```txt
All entities that:
    contain PositionComponent
    AND contain VelocityComponent
    AND do NOT contain FrozenComponent
```

The important detail is that `EntityStorage` does not blindly scan every entity every frame.

Instead, it uses indexed Component groups to resolve queries much more efficiently.

---

# Smallest-Set Intersection Optimization

One of the most important internal optimizations in `EntityStorage` is the smallest-set intersection strategy.

Instead of iterating over every Entity in the runtime world, the storage layer:

1. retrieves indexed sets for all included Components,
2. finds the smallest set,
3. and iterates only over that subset while validating remaining conditions.

Conceptually:

```txt
PositionComponent → 12,000 entities
VelocityComponent → 8,000 entities
PlayerTagComponent → 1 entity

Start iteration from PlayerTagComponent set.
```

This changes the filtering cost dramatically.

Instead of:

```txt
O(total entity count)
```

the runtime behaves much closer to:

```txt
O(smallest matching component group)
```

This becomes extremely important in projects with large runtime worlds.

However, the architectural benefit is arguably even more important than the raw performance gain.

Systems remain completely decoupled from storage mechanics while the runtime centralizes query optimization internally.

---

# Includes and Excludes

Filters inside `empr.es` are built around two concepts:

```txt
includes
excludes
```

`includes` defines required runtime state.

`excludes` defines forbidden runtime state.

For example:

```typescript
filter({
    includes: [HealthComponent],
    excludes: [DeadTagComponent],
});
```

This conceptually means:

```txt
Give me all living entities with health.
```

This style of filtering creates a very expressive runtime architecture because behavior participation emerges naturally from state composition.

For example:

```typescript
entity.addComponent(new DeadTagComponent());
```

Immediately afterward, the Entity disappears from Systems excluding dead Entities.

No manual deregistration is required.

The runtime reacts automatically.

---

# Filters as Runtime Behavior Selectors

One of the most important mental models in ECS is that filters do not merely retrieve data.

Filters define runtime behavior participation.

Systems do not usually ask:

```txt
What class is this object?
```

Instead they ask:

```txt
Does this Entity currently match
the runtime state required for this behavior?
```

This is a major architectural difference from inheritance-heavy game architectures.

An Entity becomes movable because it matches movement-related filters.

An Entity becomes interactable because it matches interaction-related filters.

An Entity becomes damageable because it matches health-related filters.

Behavior emerges from state composition.

---

# Static Queries vs Reactive Queries

Not every query behaves the same way.

Inside `empr.es`, there are two important filtering models:

```txt
Filtered
EntityQuery
```

These solve different runtime problems.

---

# Filtered: Snapshot Query

`Filtered` represents a static snapshot of matching Entities.

Conceptually:

```typescript
const result = filter({
    includes: [HealthComponent],
});
```

At the moment the query executes, the runtime resolves all matching Entities and stores them inside a lightweight collection.

This collection supports:

- synchronous iteration,
- sequential async iteration,
- and parallel async iteration.

For example:

```typescript
filtered.forEach(...)
await filtered.sequential(...)
await filtered.parallel(...)
```

A snapshot query does not automatically update when runtime composition changes later.

This makes `Filtered` useful for:

- one-time execution,
- immediate processing,
- isolated calculations,
- temporary runtime evaluation,
- or transient gameplay logic.

---

# EntityQuery: Reactive Live Query

`EntityQuery` is fundamentally different.

Instead of representing a single snapshot, it stays connected to runtime lifecycle signals and continuously updates itself.

Internally, `EntityQuery` listens to signals such as:

```txt
OnEntityAddComponentSyncSignal
OnEntityRemoveComponentSyncSignal
OnEntityActiveChangedSignal
OnEntityDestroySignal
OnEntityReleasedSignal
OnEntityAcquiredSignal
```

Whenever runtime state changes:

```txt
Entity gains Component
    → query re-evaluates entity

Entity loses Component
    → query re-evaluates entity

Entity becomes inactive
    → query updates visibility

Entity released into pool
    → query removes entity

Entity acquired from pool
    → query re-evaluates entity
```

This creates a highly reactive runtime model where queries maintain themselves automatically.

Instead of recalculating filters every frame, the runtime shifts toward event-driven query maintenance.

This is one of the most important architectural optimizations in the framework.

---

# Why Reactive Queries Matter

Reactive queries become especially valuable in long-running runtime systems.

Examples include:

- persistent gameplay Systems,
- debug tooling,
- entity inspectors,
- runtime overlays,
- interaction systems,
- UI synchronization,
- and long-lived gameplay flows.

Without reactive queries, Systems would constantly rebuild runtime collections manually.

With `EntityQuery`, the query remains alive and self-maintaining.

This dramatically reduces repeated filtering overhead in execution-heavy projects.

---

# Reverse Iteration and Runtime Mutation Safety

One subtle but important implementation detail inside `EntityQuery` is reverse iteration.

The query iterates its internal array backwards:

```txt
last entity → first entity
```

This is specifically designed to protect iteration safety when runtime mutations occur during execution.

For example:

```txt
System iterates query
    ↓
Entity loses Component during iteration
    ↓
Query removes Entity internally
```

If iteration happened forwards, runtime removals could accidentally skip Entities due to array reordering.

By iterating backwards and using swap-and-pop removal internally, `EntityQuery` preserves stable iteration behavior while maintaining O(1) removals.

This is a small implementation detail, but it reflects an important design philosophy inside `empr.es`:

> runtime mutation is expected, not treated as an edge case.

---

# Context-Aware Query Caching

Another important optimization inside `EntityStorage` is context-aware live query caching.

When filtering occurs inside an execution context — for example inside a Pipeline — the runtime can reuse existing `EntityQuery` instances instead of rebuilding them repeatedly.

Conceptually:

```txt
Execution Context + Filter Definition
            ↓
Stable Query Hash
            ↓
Reusable Cached EntityQuery
```

This allows persistent execution flows to reuse live query infrastructure efficiently across frames.

---

# Runtime Visibility Instead of Object Ownership

One useful way to think about `EntityStorage` is as a runtime visibility system.

An Entity participates in ECS execution only if:

- it exists inside storage,
- it is active,
- and it matches the relevant filter.

Systems therefore do not own gameplay objects directly.

They observe the runtime world through filtered visibility.

This distinction is one of the reasons ECS execution remains scalable and composable in large projects.

---

# Common Mistakes

## Treating Storage as a Global Lookup Container

`EntityStorage` should not become a giant service locator for arbitrary gameplay objects.

The ECS model works best when Systems primarily rely on filtering rather than direct Entity retrieval.

---

## Maintaining Parallel Runtime Collections

A common anti-pattern looks like this:

```txt
movingEntities[]
damageableEntities[]
interactiveEntities[]
```

This recreates the synchronization problems ECS is designed to solve.

The filtering layer already acts as the authoritative runtime query mechanism.

---

## Treating Filters as Only a Performance Optimization

Filtering is not only about iteration speed.

Filters are the architectural mechanism that determines runtime behavior participation.

That conceptual role is more important than the optimization itself.

---

## Forgetting That Released Entities Leave Runtime Visibility

Released Entities are intentionally removed from live queries.

This is important because pooled objects should not continue participating in gameplay execution while inactive.

---

# Design Tradeoffs

The `EntityStorage` architecture inside `empr.es` is optimized primarily around:

- runtime visibility clarity,
- reusable execution flow,
- indexed ECS querying,
- reactive runtime updates,
- and maintainable gameplay architecture.

The framework intentionally prioritizes:

- explicit runtime behavior,
- dynamic composition,
- reactive execution,
- and TypeScript-friendly architecture

over extremely low-level data-oriented ECS design.

The goal is not simply to query entities quickly.

The goal is to make large gameplay runtimes understandable, inspectable and maintainable over time.

---

# Related Articles

- What is empr.es?
- ECS in empr.es
- Entity and Component Model
- Systems
- Pipelines
- ObjectPool and Pools
- LifecycleTracker and TrackedSignal

# ObjectPool and Pools

## What This Article Covers

This article explains the object pooling runtime services provided by `@empr/es`.

The focus here is framework-agnostic pooling.

This article is **not** about renderer-specific pooling such as Pixi object reuse.

Instead, this article explains the generic pooling infrastructure that can be used for:

- gameplay entities,
- particles,
- bullets,
- temporary runtime objects,
- reusable data structures,
- or any frequently allocated runtime resource.

The main topics are:

- why games create large amounts of temporary objects,
- why garbage collection spikes are dangerous,
- how `ObjectPool<T>` works,
- how `Pools` acts as a centralized pool registry,
- and when objects should be reused instead of destroyed.

---

# Why Games Create Many Short-Lived Objects

Games constantly create temporary runtime objects.

Typical examples include:

```txt
Bullets
Particles
Damage popups
Tween data
Temporary effects
Projectile entities
Collision results
Animation payloads
Network packets
```

Many of these objects only exist for a very short period of time.

For example:

```txt
Create bullet
        ↓
simulate bullet
        ↓
destroy bullet
```

or:

```txt
Create particle
        ↓
play effect
        ↓
destroy particle
```

At small scale this seems harmless.

The problem appears when these operations happen:

- hundreds of times per second,
- every frame,
- across long-running sessions.

---

# The Garbage Collection Problem

JavaScript engines automatically clean unused objects through garbage collection.

This is convenient.

But in real-time applications such as games, garbage collection can create frame spikes.

For example:

```txt
Frame 1 → 16ms
Frame 2 → 16ms
Frame 3 → GC pause → 90ms
Frame 4 → 16ms
```

Even a short pause may become visible as:

- animation hitching,
- input lag,
- frame drops,
- or unstable simulation timing.

This becomes especially problematic in:

- slots,
- action games,
- particle-heavy scenes,
- long-running browser sessions,
- or mobile devices with weaker CPUs.

---

# What Object Pooling Solves

Object pooling avoids repeatedly allocating and destroying runtime objects.

Instead of:

```txt
Create object
        ↓
Use object
        ↓
Destroy object
```

pooling changes the lifecycle into:

```txt
Acquire object
        ↓
Use object
        ↓
Reset object
        ↓
Return object to pool
        ↓
Reuse later
```

The important distinction is:

```txt
The object instance survives.
```

Only its runtime state changes.

This significantly reduces:

- allocation pressure,
- garbage generation,
- and GC spikes.

---

# ObjectPool<T>

The core pooling primitive in `@empr/es` is:

```typescript
ObjectPool<T>
```

This is a standalone reusable object pool.

Conceptually:

```typescript
const pool = new ObjectPool<T>({
    factory,
    reset,
    initialSize,
    maxSize,
});
```

The pool owns reusable instances and controls:

- creation,
- reuse,
- reset,
- and release lifecycle.

---

# Basic Pool Example

Example:

```typescript
import { ObjectPool } from '@empr/es';

class Bullet {
    public x = 0;
    public y = 0;
    public speed = 0;

    public reset(): void {
        this.x = 0;
        this.y = 0;
        this.speed = 0;
    }
}

const bulletPool = new ObjectPool<Bullet>({
    factory: () => new Bullet(),
    reset: (bullet) => bullet.reset(),
    initialSize: 50,
    maxSize: 200,
});
```

Conceptually:

```txt
Pre-create 50 bullets
Reuse them during gameplay
Allow growth up to 200
```

This is significantly more stable than allocating bullets continuously during gameplay.

---

# Acquiring Objects

Objects are retrieved from the pool through:

```typescript
const bullet = bulletPool.acquire();
```

Conceptually:

```txt
If pooled object exists:
    reuse it

Otherwise:
    create a new one
```

Example:

```typescript
const bullet = bulletPool.acquire();

bullet.x = player.x;
bullet.y = player.y;
bullet.speed = 20;
```

The caller does not care whether the instance was newly created or reused.

That detail remains internal to the pool.

---

# Releasing Objects

When the object is no longer needed:

```typescript
bulletPool.release(bullet);
```

Before the object returns to the reusable storage:

```txt
reset(object)
```

is called automatically.

Example:

```typescript
bulletPool.release(bullet);
```

Internally:

```txt
reset bullet state
        ↓
store instance back in pool
```

The object instance survives and may be reused later.

---

# Factory

`factory` defines how new instances are created.

Example:

```typescript
factory: () => new Bullet()
```

The pool only creates objects when reusable instances are unavailable.

This is important because pools may still expand dynamically during gameplay.

---

# Reset

`reset` defines how object state should be cleaned before reuse.

Example:

```typescript
reset: (bullet) => bullet.reset()
```

This step is extremely important.

Without proper reset logic, reused objects may leak stale runtime state.

For example:

```txt
Old position
Old velocity
Old flags
Old animation state
```

A reusable object must behave as if it was freshly created.

---

# Initial Size

`initialSize` pre-allocates objects when the pool is created.

Example:

```typescript
initialSize: 100
```

Conceptually:

```txt
Create 100 reusable objects immediately
```

This is useful because allocation happens upfront instead of during gameplay spikes.

Typical usage:

```txt
Bullets
Particles
Coins
Temporary effects
```

---

# Max Size

`maxSize` limits pool growth.

Example:

```typescript
maxSize: 500
```

Conceptually:

```txt
Never store more than 500 reusable objects
```

This prevents pools from growing infinitely during unusual gameplay situations.

Without limits, runaway pools may create memory pressure instead of reducing it.

---

# Pool Lifecycle Example

Conceptually:

```txt
Pool starts with:
    50 bullets

Gameplay acquires:
    20 bullets

20 bullets become active

Gameplay releases:
    20 bullets

20 bullets return to reusable storage
```

No new allocations occur during the reuse cycle.

---

# Pools Registry

While `ObjectPool<T>` works as a standalone primitive, `@empr/es` also provides:

```typescript
Pools
```

`Pools` acts as a named registry of pools available through DI.

Conceptually:

```txt
DI container
        ↓
Pools registry
        ↓
Named reusable pools
```

This allows Systems and services to access pools globally without manually passing references everywhere.

---

# Creating Named Pools

Example:

```typescript
const pools = inject(Pools);

pools.createPool('bullets', {
    factory: () => new Bullet(),
    reset: (bullet) => bullet.reset(),
    initialSize: 100,
    maxSize: 500,
});
```

Conceptually:

```txt
Register reusable bullet pool
under the name:
    bullets
```

---

# Accessing Pools Later

Once registered:

```typescript
const bulletPool = pools.getPool<Bullet>(
    'bullets',
);
```

Usage:

```typescript
const bullet = bulletPool.acquire();

// gameplay logic...

bulletPool.release(bullet);
```

This becomes especially useful in large runtime architectures where multiple Systems require access to the same reusable resources.

---

# Using Pools Inside Systems

Because `Pools` is available through DI, Systems can resolve pools directly.

Example:

```typescript
const spawnBulletSystem: System = ({
    inject,
}: SystemProps) => {
    const pools = inject(Pools);

    const bulletPool = pools.getPool<Bullet>(
        'bullets',
    );

    const bullet = bulletPool.acquire();

    // initialize bullet...
};
```

This keeps reusable runtime resources centralized instead of scattered across unrelated modules.

---

# Pools Are Framework-Agnostic

One important design decision is that pooling inside `@empr/es` is framework-agnostic.

`ObjectPool<T>` does not know anything about:

- PixiJS,
- Three.js,
- DOM nodes,
- rendering,
- or scene trees.

It simply manages reusable runtime objects.

This is important architecturally because the ECS kernel remains renderer-independent.

---

# Common Pool Use Cases

Pooling is especially valuable for objects that are:

- created frequently,
- short-lived,
- predictable in shape,
- and reused often.

Examples:

---

## Bullets

```txt
Shoot
        ↓
Simulate
        ↓
Release
```

---

## Particles

```txt
Spawn effect
        ↓
Animate
        ↓
Release
```

---

## Floating Damage Numbers

```txt
Show damage
        ↓
Animate
        ↓
Release
```

---

## Temporary ECS Entities

```txt
Acquire entity
        ↓
Use during gameplay
        ↓
Release entity back to pool
```

---

## Network Message Buffers

```txt
Receive packet
        ↓
Parse
        ↓
Release reusable buffer
```

---

# When to Reuse Versus Destroy

One important architectural question is:

```txt
Should this object be pooled
or destroyed permanently?
```

Pooling is most effective when:

- objects are short-lived,
- created frequently,
- and reused often.

Examples:

| Usually Pool | Usually Destroy |
| --- | --- |
| bullets | unique save data |
| particles | permanent game config |
| temporary effects | one-time startup objects |
| reusable entities | static metadata |
| runtime buffers | immutable definitions |

Not every object benefits from pooling.

Over-pooling everything may increase complexity unnecessarily.

---

# Pooling and ECS Entities

`EntityStorage` also supports pool-aware lifecycle through:

```txt
releaseEntity()
acquireEntity()
```

This allows ECS entities to be temporarily removed from runtime queries without being permanently destroyed.

Conceptually:

```txt
Release entity
        ↓
Entity disappears from queries
        ↓
Instance survives
        ↓
Acquire entity later
        ↓
Entity becomes active again
```

This is especially useful for:

- bullets,
- temporary effects,
- pooled enemies,
- or reusable gameplay objects.

---

# Pooling Reduces Runtime Spikes

One of the biggest architectural benefits of pooling is runtime stability.

Without pooling:

```txt
Gameplay spike
        ↓
Many allocations
        ↓
Large garbage collection
        ↓
Frame hitch
```

With pooling:

```txt
Reusable instances
        ↓
Fewer allocations
        ↓
Lower garbage pressure
        ↓
More stable frame pacing
```

This becomes extremely important in long-running browser sessions.

---

# Common Mistakes

## Forgetting Reset Logic

Reused objects must behave like fresh instances.

Incomplete reset logic often creates extremely difficult runtime bugs.

---

## Pooling Everything

Not all objects benefit from pooling.

Large permanent objects usually do not need reusable lifecycle management.

---

## Never Releasing Objects

Pools only work correctly if objects eventually return to the reusable storage.

Leaking active objects defeats the purpose of pooling.

---

## Infinite Pool Growth

Pools should usually have sensible `maxSize` limits.

Otherwise memory usage may continue growing during unusual runtime spikes.

---

# Limitations and Design Decisions

The pooling system inside `@empr/es` intentionally stays lightweight.

It does not try to become:

- a renderer cache,
- a scene manager,
- or a specialized graphics allocator.

Instead:

```txt
ObjectPool<T>
```

focuses on one responsibility:

```txt
Reusable runtime object lifecycle
```

This keeps pooling generic, predictable and renderer-independent.

---

# Related Articles

- `1.4. EntityStorage and Component Filtering`
- `2.1. Systems`
- `4.1. DI Container`
- `4.2. DI inside Systems and Pipelines`

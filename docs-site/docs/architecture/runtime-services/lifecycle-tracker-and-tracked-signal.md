# LifecycleTracker and TrackedSignal

## What This Article Covers

This article explains the automatic lifecycle cleanup utilities provided by `@empr/es`.

The focus here is long-running runtime safety.

More specifically:

- preventing dangling listeners,
- automatically disposing subscriptions,
- binding resources to runtime owners,
- and avoiding memory leaks during long gameplay sessions.

The two main runtime services covered in this article are:

```txt
LifecycleTracker
TrackedSignal
```

These services exist to solve one of the most common architectural problems in browser games:

```txt
Subscriptions and temporary runtime resources
outliving the objects that created them.
```

---

# The Dangling-Listener Problem

Modern browser games create large numbers of temporary runtime objects.

Examples include:

- UI screens,
- bonus rounds,
- temporary gameplay flows,
- pooled entities,
- particles,
- popups,
- debug overlays,
- tutorial systems,
- async loading flows,
- and scene transitions.

Many of these objects subscribe to:

- Signals,
- Stores,
- browser events,
- renderer callbacks,
- timers,
- or runtime services.

For example:

```typescript
signal.listen(() => {
    // runtime logic...
});
```

At first this seems harmless.

The problem appears later when the owner object disappears but the subscription survives.

---

# What Happens Without Cleanup

Example:

```txt
Open bonus screen
        ↓
Subscribe to signals
        ↓
Close bonus screen
        ↓
Listener survives accidentally
```

Later:

```txt
Signal dispatches again
        ↓
Destroyed screen still reacts
```

This creates problems such as:

- memory leaks,
- duplicated callbacks,
- invalid runtime references,
- unexpected behavior,
- or crashes caused by stale objects.

This is commonly called:

```txt
Dangling listeners
```

---

# Why This Becomes Dangerous in Long-running Sessions

Many browser games remain open for hours.

Examples include:

- slots,
- live-service games,
- casino lobbies,
- editors,
- debug tools,
- or persistent multiplayer sessions.

Without automatic cleanup:

```txt
Listeners accumulate slowly over time
```

Eventually:

```txt
Memory usage increases
        ↓
Old runtime objects survive
        ↓
Execution cost grows
        ↓
Behavior becomes unstable
```

This problem is especially difficult to debug because the leak often appears much later than the original mistake.

---

# Manual Dispose

The traditional solution is manual cleanup.

Example:

```typescript
const disposable = signal.listen(() => {
    // runtime logic...
});

disposable.dispose();
```

This works.

But large projects quickly accumulate huge amounts of cleanup code.

For example:

```txt
Dispose listeners
Dispose timers
Dispose subscriptions
Dispose stores
Dispose async operations
```

Eventually cleanup logic itself becomes difficult to maintain.

---

# Why Manual Cleanup Is Error-prone

Manual disposal depends on developers remembering cleanup everywhere.

Typical mistakes include:

- forgetting to dispose,
- early returns,
- failed async flows,
- scene interruptions,
- pooled reuse,
- or hidden runtime branches.

Even experienced teams eventually miss some cleanup paths.

`LifecycleTracker` exists to centralize lifecycle ownership.

---

# LifecycleTracker

`LifecycleTracker` binds disposable resources to an owner or runtime context.

Conceptually:

```txt
Owner/context
        ↓
owns disposables
        ↓
destroy owner
        ↓
dispose everything automatically
```

This creates explicit runtime ownership for subscriptions and temporary resources.

---

# Basic LifecycleTracker Example

Example:

```typescript
import {
    LifecycleTracker,
    Signal,
} from '@empr/es';

const signal = new Signal<void>('Test');

const tracker = new LifecycleTracker();

const owner = {};
```

Track a subscription:

```typescript
tracker.track(
    owner,
    signal.listen(() => {
        console.log('Signal fired');
    }),
);
```

Conceptually:

```txt
The listener now belongs to owner.
```

---

# Automatic Cleanup

When the owner lifecycle ends:

```typescript
tracker.dispose(owner);
```

all tracked disposables are cleaned automatically.

Conceptually:

```txt
Dispose owner
        ↓
Dispose all tracked listeners
        ↓
Subscriptions removed safely
```

This removes the need to manually track every subscription individually.

---

# Tracking Multiple Resources

One owner may track many resources.

Example:

```typescript
tracker.track(
    owner,
    signalA.listen(() => {}),
);

tracker.track(
    owner,
    signalB.listen(() => {}),
);

tracker.track(
    owner,
    someStore.subscribe(() => {}),
);
```

Later:

```typescript
tracker.dispose(owner);
```

Conceptually:

```txt
Dispose everything owned by context
```

This becomes extremely valuable for temporary runtime flows.

---

# Lifecycle Ownership

One of the key architectural ideas is:

```txt
Subscriptions should belong
to something with lifecycle.
```

Examples:

| Owner | Typical Lifecycle |
| --- | --- |
| Scene | scene unload |
| UI screen | close screen |
| bonus round | end bonus |
| pooled object | release to pool |
| entity | entity destroy |
| tutorial flow | finish tutorial |
| debug widget | close widget |

`LifecycleTracker` formalizes this ownership relationship.

---

# Example: Scene Lifecycle

Example:

```typescript
class BonusScene {
    constructor(
        private tracker: LifecycleTracker,
        private signal: Signal<void>,
    ) {
        tracker.track(
            this,
            signal.listen(() => {
                console.log('Bonus event');
            }),
        );
    }

    public destroy(): void {
        this.tracker.dispose(this);
    }
}
```

Conceptually:

```txt
Destroy scene
        ↓
Automatically dispose subscriptions
```

This is much safer than manually storing and disposing every listener.

---

# Example: UI Screen

UI screens frequently create temporary subscriptions.

Example:

```typescript
class SettingsScreen {
    constructor(
        private tracker: LifecycleTracker,
        private settingsStore: Store<SettingsState>,
    ) {
        tracker.track(
            this,
            settingsStore.subscribe((state) => {
                this.render(state);
            }),
        );
    }

    private render(
        state: SettingsState,
    ): void {
        console.log(state.language);
    }

    public close(): void {
        this.tracker.dispose(this);
    }
}
```

Without lifecycle cleanup:

```txt
Closed screens may continue reacting
to store updates forever.
```

---

# Example: Bonus Round Flow

Temporary gameplay flows often subscribe to many runtime events.

Example:

```typescript
class BonusRound {
    constructor(
        private tracker: LifecycleTracker,
        private spinSignal: Signal<void>,
        private endSignal: Signal<void>,
    ) {
        tracker.track(
            this,
            spinSignal.listen(() => {
                console.log('Bonus spin');
            }),
        );

        tracker.track(
            this,
            endSignal.listen(() => {
                console.log('Bonus end');
            }),
        );
    }

    public finish(): void {
        this.tracker.dispose(this);
    }
}
```

This keeps temporary flows self-contained and memory-safe.

---

# Pooled Objects and Lifecycle Cleanup

Pooling creates another important lifecycle challenge.

Example:

```txt
Acquire pooled entity
        ↓
Subscribe to signals
        ↓
Release entity to pool
        ↓
Entity reused later
```

Without cleanup:

```txt
Old listeners survive across reuse
```

This may create:

- duplicated callbacks,
- invalid references,
- or runtime corruption.

Lifecycle tracking helps pooled objects clean themselves safely before reuse.

---

# Example: Pooled Projectile

Example:

```typescript
class Projectile {
    constructor(
        private tracker: LifecycleTracker,
        private updateSignal: Signal<void>,
    ) {}

    public activate(): void {
        this.tracker.track(
            this,
            this.updateSignal.listen(() => {
                this.update();
            }),
        );
    }

    public release(): void {
        this.tracker.dispose(this);
    }

    private update(): void {
        console.log('Projectile update');
    }
}
```

Conceptually:

```txt
Release projectile
        ↓
Automatically dispose listeners
        ↓
Projectile safe for reuse
```

---

# TrackedSignal

`TrackedSignal` builds automatic lifecycle cleanup directly into the Signal itself.

Conceptually:

```txt
Signal
        +
Lifecycle ownership
        ↓
Auto-disposed listeners
```

This reduces the amount of manual tracking code required.

---

# Basic TrackedSignal Example

Example:

```typescript
import { TrackedSignal } from '@empr/es';

class PlayerController {
    private readonly onShoot =
        new TrackedSignal<void>(this);

    public shoot(): void {
        this.onShoot.dispatch();
    }

    public listen(): void {
        this.onShoot.listen(() => {
            console.log('Shoot event');
        });
    }

    public dispose(): void {
        this.onShoot.dispose();
    }
}
```

Conceptually:

```txt
Dispose controller
        ↓
Dispose all signal listeners automatically
```

---

# Why TrackedSignal Exists

Normal `Signal` requires explicit ownership tracking.

Example:

```typescript
const disposable = signal.listen(...);
tracker.track(owner, disposable);
```

`TrackedSignal` simplifies this pattern by embedding ownership directly into the signal lifecycle.

This becomes especially useful for:

- UI widgets,
- controllers,
- scene-local events,
- temporary gameplay flows,
- or isolated runtime modules.

---

# TrackedSignal and Encapsulation

`TrackedSignal` also helps preserve ownership boundaries.

Example:

```typescript
class InventoryPanel {
    private readonly onSelect =
        new TrackedSignal<number>(this);

    public select(id: number): void {
        this.onSelect.dispatch(id);
    }
}
```

The panel owns its signal lifecycle.

Consumers do not need to know how cleanup is implemented internally.

---

# Lifecycle-bound Dispose vs Manual Dispose

One of the most important conceptual distinctions is:

```txt
Manual dispose
        vs
Lifecycle-bound dispose
```

---

# Manual Dispose

Example:

```typescript
const disposable = signal.listen(...);

disposable.dispose();
```

Conceptually:

```txt
Developer manually controls cleanup
```

Advantages:

- explicit,
- lightweight,
- flexible.

Disadvantages:

- easy to forget,
- difficult in large flows,
- repetitive cleanup code.

---

# Lifecycle-bound Dispose

Example:

```typescript
tracker.track(owner, disposable);
```

Conceptually:

```txt
Owner lifecycle controls cleanup
```

Advantages:

- centralized cleanup,
- safer for long-running sessions,
- easier for temporary runtime flows,
- safer for pooled objects.

Disadvantages:

- requires lifecycle ownership model.

---

# Why Lifecycle-bound Cleanup Matters

Large browser games constantly create and destroy runtime contexts.

Examples:

```txt
Screens
Scenes
Bonus flows
Menus
Popups
Tooltips
Tutorials
Temporary entities
```

Without lifecycle-bound cleanup:

```txt
Subscriptions accumulate forever
```

This is one of the most common causes of memory leaks in long-running applications.

---

# Signals, Stores and Disposables

`LifecycleTracker` works with any disposable resource.

Examples include:

- Signals,
- Stores,
- selectors,
- computed values,
- async computed values,
- timers,
- subscriptions,
- or custom runtime resources.

As long as the resource exposes:

```typescript
dispose()
```

it can participate in lifecycle tracking.

---

# Example: Store Selector Cleanup

Example:

```typescript
const selector =
    gameStore.createStoreSelector(
        (state) => state.balance,
    );

tracker.track(owner, selector);
```

Later:

```typescript
tracker.dispose(owner);
```

This ensures selectors do not survive after their owner disappears.

---

# Memory Safety Through Ownership

One of the major architectural goals behind these utilities is:

```txt
Every temporary runtime resource
should have a clear owner.
```

This creates safer runtime architecture because:

```txt
Owner disappears
        ↓
Resources disappear with it
```

instead of surviving accidentally.

---

# Common Mistakes

## Forgetting Cleanup for Temporary Flows

Temporary screens, scenes and bonus rounds often create listeners that survive unintentionally.

Lifecycle ownership should usually be explicit.

---

## Reusing Pooled Objects Without Cleanup

Pooled objects must release old subscriptions before reuse.

Otherwise listeners accumulate across activations.

---

## Tracking Global Long-lived Services

Not every subscription requires lifecycle tracking.

Very long-lived application-wide services may manage their own lifecycle manually.

---

## Confusing Signal Ownership

`TrackedSignal` owns its listeners.

`LifecycleTracker` owns external disposables.

These solve related but slightly different architectural problems.

---

# Limitations and Design Decisions

The lifecycle utilities in `@empr/es` intentionally stay lightweight.

They do not require:

- decorators,
- reflection,
- automatic object scanning,
- or framework-specific runtime magic.

Instead the architecture stays explicit:

```txt
Owner/context
        ↓
Tracked resources
        ↓
Lifecycle cleanup
```

This keeps memory management understandable and predictable.

Especially in long-running game sessions.

---

# Related Articles

- [4.5. Reactive Store](/architecture/runtime-services/reactive-store)
- [4.3. ObjectPool and Pools](/architecture/runtime-services/object-pool-and-pools)
- [4.4. Entity Lifecycle and Pool-aware Storage](/architecture/runtime-services/entity-lifecycle-and-pool-aware-storage)
- [2.1. Systems](/architecture/execution/systems)
- [3.7. FSM + Pipeline + Signal Architecture](/architecture/flow-control/fsm-pipeline-signal-architecture)

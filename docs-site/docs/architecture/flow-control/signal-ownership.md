# Signal Ownership

## What is Signal Ownership?

Inside `empr.es`, Signal ownership defines who is responsible for the lifecycle of a Signal subscription.

Conceptually, ownership answers a very important runtime question:

```txt
Who is responsible
for disposing this listener?
```

At first this may sound like a small implementation detail.

In reality, ownership is one of the most important architectural concerns in long-running browser game sessions.

Without explicit ownership, runtime systems gradually accumulate:

- dangling listeners,
- dead callbacks,
- invalid async execution,
- references to destroyed entities,
- and invisible memory leaks.

Over time these problems become extremely difficult to debug because the runtime continues reacting to events from systems that should no longer exist.

`empr.es` treats Signal ownership as a first-class architectural responsibility rather than as optional cleanup.

---

# Why Ownership Exists

Signals themselves are intentionally lightweight.

A Signal only knows:

```txt
Someone dispatched an event
        ↓
Listeners should react
```

However, Signals do not automatically know:

- whether a listener still belongs to an active scene,
- whether an entity was released from storage,
- whether a bonus round ended,
- whether an FSM state already exited,
- or whether a runtime object was destroyed.

Without ownership tracking, listeners continue existing indefinitely unless manually removed.

This creates one of the most common categories of bugs in browser games:

```txt
Dead object still reacts to runtime events
```

For example:

```txt
Bonus screen closes
        ↓
Listener survives
        ↓
Signal dispatches later
        ↓
Old bonus logic executes unexpectedly
```

or:

```txt
Pooled entity released
        ↓
Listener survives
        ↓
Signal mutates inactive entity
```

These problems become especially dangerous in projects with:

- long gameplay sessions,
- many async operations,
- pooled runtime objects,
- FSM-driven flow,
- reusable UI screens,
- and dynamically attached gameplay systems.

Ownership exists to make runtime cleanup explicit and predictable.

---

# Signals vs Signal Subscriptions

One important architectural distinction is the difference between:

```txt
Signal
        vs
Signal subscription
```

The Signal itself is usually long-lived.

For example:

```txt
SpinRequestedSignal
ResultReceivedSignal
OnUpdateSignal
```

These Signals often exist for the entire runtime session.

However, listeners attached to those Signals are frequently temporary.

For example:

```txt
Current FSM state
Temporary bonus feature
Scene-specific UI
Animation flow
Modal window
Pooled entity
```

This means ownership is usually attached to the subscription — not the Signal itself.

Conceptually:

```txt
Signal lives globally
        ↓
Listener belongs to owner
        ↓
Owner disposes listener
```

This distinction is extremely important.

---

# The Core Problem

Consider this runtime flow:

```txt
Open bonus round
        ↓
Register listeners
        ↓
Bonus round closes
        ↓
Listeners survive accidentally
        ↓
Future signals trigger old logic
```

The runtime may now:

- mutate invalid state,
- trigger duplicate execution,
- leak memory,
- or execute async work against destroyed objects.

These bugs are notoriously difficult to debug because the original owner may already be gone.

The problem becomes worse over time because dangling listeners are often invisible until a very specific runtime event occurs.

---

# Ownership as Runtime Lifecycle

In `empr.es`, Signal ownership is tightly connected to runtime lifecycle.

Conceptually:

```txt
Owner created
        ↓
Listener registered
        ↓
Runtime flow executes
        ↓
Owner disposed
        ↓
Listener disposed automatically
```

This creates predictable cleanup boundaries.

Instead of manually remembering every subscription, ownership allows runtime systems to clean themselves up as part of their lifecycle.

---

# Who Can Own a Signal Subscription?

Many runtime objects may act as Signal owners.

The important requirement is that the owner participates in controlled lifecycle management.

---

# Entity Ownership

Entities frequently own Signal subscriptions.

For example:

```txt
Entity created
        ↓
Listener attached
        ↓
Entity released or destroyed
        ↓
Listener disposed
```

This becomes especially important for:

- temporary gameplay entities,
- pooled runtime objects,
- visual wrappers,
- and dynamically spawned game features.

Without ownership cleanup, pooled entities may continue reacting to Signals even while inactive.

That can easily corrupt runtime state.

---

# Service Ownership

Runtime services may also own subscriptions.

Examples include:

- audio services,
- telemetry systems,
- update coordinators,
- networking services,
- and gameplay feature services.

Conceptually:

```txt
Service initialized
        ↓
Listeners registered
        ↓
Service disposed
        ↓
Listeners cleaned up
```

Long-lived services usually manage subscriptions for the duration of the runtime session or module lifecycle.

---

# FSM State Ownership

FSM states are one of the most important ownership boundaries in gameplay architecture.

For example:

```txt
Enter Bonus State
        ↓
Register bonus listeners
        ↓
Bonus state active
        ↓
Exit Bonus State
        ↓
Dispose listeners
```

This prevents old gameplay states from continuing to react after transitions occur.

Without ownership cleanup, state-driven gameplay quickly becomes unstable because previous states continue mutating runtime flow after they should already be inactive.

---

# Custom Runtime Ownership

Custom runtime objects may also own Signal subscriptions.

Examples include:

- modal windows,
- cutscenes,
- tutorial flows,
- temporary gameplay features,
- replay controllers,
- debug tools,
- and orchestration helpers.

Conceptually:

```txt
Custom object created
        ↓
Listeners attached
        ↓
Object disposed
        ↓
Listeners released
```

This flexibility is important because gameplay architecture frequently introduces temporary runtime layers that do not naturally belong to entities or FSM states.

---

# Why Dangling Listeners Are Dangerous

Dangling listeners are particularly dangerous in games because games are heavily asynchronous and long-running.

A leaked listener may survive:

- scene transitions,
- pooling cycles,
- reconnect flows,
- feature restarts,
- or entire gameplay sessions.

Over time this creates hidden runtime side effects.

Typical symptoms include:

```txt
Duplicate gameplay execution
Unexpected FSM transitions
Multiple sound triggers
Repeated win presentations
Invalid async mutations
State corruption
Increasing memory usage
```

These issues are often extremely difficult to reproduce because they depend on runtime history rather than current state alone.

---

# Async Execution Problems

Async listeners make ownership even more important.

For example:

```typescript
resultReceivedSignal.listen(async (result) => {
    await playAnimation();

    applyResult(result);
});
```

Now imagine:

```txt
Animation starts
        ↓
Owner disposed before animation completes
        ↓
Async listener continues afterward
```

Without lifecycle-aware ownership, async execution may continue mutating dead runtime state.

This becomes especially dangerous in:

- scene transitions,
- pooled entity reuse,
- reconnect flows,
- and bonus interruptions.

Ownership exists partly to prevent async work from escaping valid runtime boundaries.

---

# Ownership and Observability

Explicit ownership significantly improves runtime observability.

The runtime can reason about:

```txt
Who registered this listener?
Which runtime feature owns it?
Why is this listener still active?
Which owner failed to dispose?
```

This becomes extremely valuable for:

- debugging,
- memory diagnostics,
- replay tooling,
- QA,
- and production telemetry.

One of the core design goals of `empr.es` is that runtime flow and lifecycle should remain inspectable instead of hidden inside callbacks.

Ownership is a major part of that philosophy.

---

# Ownership and LifecycleTracker

Signal ownership frequently works together with lifecycle utilities such as:

```txt
LifecycleTracker
TrackedSignal
```

These tools help bind subscriptions to explicit owners instead of relying on manual cleanup everywhere.

The important architectural idea is not the utility itself.

The important idea is that runtime ownership should always remain explicit.

Lifecycle tooling simply helps enforce that rule consistently.

Detailed lifecycle utilities are covered in later Runtime Services articles.

---

# Common Mistakes

## Forgetting That Listeners Outlive Their Creator

A listener continues existing until it is explicitly disposed or lifecycle-managed.

Destroying a UI object or leaving an FSM state does not automatically remove listeners unless ownership cleanup exists.

---

## Treating Signals as Fire-and-forget Events

Signals are runtime infrastructure.

Subscriptions participate in lifecycle management and must be treated as owned runtime resources.

---

## Registering Listeners Inside Temporary Runtime Flows Without Cleanup

Temporary gameplay systems are one of the biggest sources of dangling listeners.

Bonus rounds, tutorials, overlays and reconnect flows frequently leak listeners if ownership is not handled explicitly.

---

## Ignoring Pooled Entity Lifecycle

Released pooled entities must not continue reacting to Signals.

Otherwise inactive runtime objects may silently mutate gameplay state.

---

# Limitations and Design Decisions

`empr.es` intentionally does not assume automatic ownership everywhere.

This is a deliberate architectural decision.

The framework prefers:

- explicit runtime lifecycle,
- visible ownership boundaries,
- and controlled cleanup.

Instead of:

```txt
Magic automatic listener destruction
```

the architecture encourages developers to define:

```txt
Who owns this runtime subscription?
When should it stop existing?
```

This approach may initially feel stricter than lightweight event systems, but it produces significantly safer runtime behavior in large long-running gameplay projects.

---

# Related Articles

- [3.2. Signal and SignalService](/architecture/flow-control/signal-and-signalservice)
- [3.4. Custom Signal Owners](/architecture/flow-control/signal-ownership)
- [4.6. LifecycleTracker and TrackedSignal](/architecture/runtime-services/lifecycle-tracker-and-tracked-signal)
- [4.4. Entity Lifecycle and Pool-aware Storage](/architecture/runtime-services/entity-lifecycle-and-pool-aware-storage)
- [3.6. Game Flow with FSM](/architecture/flow-control/game-flow-with-fsm)

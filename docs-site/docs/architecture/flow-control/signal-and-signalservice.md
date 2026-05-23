# Signal and SignalService

## What are Signals?

Inside `empr.es`, a **Signal** is a typed runtime communication primitive used for explicit event-driven coordination between independent runtime layers.

At the simplest level, a Signal behaves similarly to a typed pub/sub event:

```txt
Something happens
        ↓
Signal is dispatched
        ↓
Listeners react
```

However, inside the architecture of `empr.es`, Signals are intentionally more important than simple event emitters.

Signals can:

- notify runtime systems,
- coordinate asynchronous flow,
- bridge isolated runtime layers,
- trigger execution pipelines,
- integrate with FSM transitions,
- and participate in controlled runtime lifecycle ownership.

Signals are one of the main building blocks of runtime flow control in the framework.

---

# Why Signals Exist

Large browser game projects eventually accumulate many independent runtime systems:

- gameplay logic,
- networking,
- UI,
- animations,
- FSM transitions,
- update loops,
- analytics,
- audio,
- reward systems,
- and renderer integration layers.

Without an explicit communication layer, these systems often begin depending on each other directly.

This usually leads to:

```txt
UI object
    ↓
calls gameplay service
    ↓
mutates renderer state
    ↓
starts animation
    ↓
triggers bonus logic
    ↓
updates network state
```

Over time the runtime becomes tightly coupled and difficult to reason about.

Signals exist to decouple runtime communication while still keeping execution explicit and observable.

Instead of directly calling unrelated runtime systems, one part of the application can dispatch a Signal while other systems react independently.

Conceptually:

```txt
Spin button clicked
        ↓
SpinRequestedSignal dispatched
        ↓
FSM reacts
        ↓
Pipeline executes
        ↓
Audio reacts
        ↓
Analytics reacts
```

The initiator remains visible while runtime layers stay decoupled.

---

# Where Signals Live in the Architecture

Signals belong to the core runtime package `@empr/es`.

Conceptually:

```txt
Signal
    ↓
SignalService
    ↓
ExecutionRegistry / Executor
    ↓
Pipeline
```

The Signal layer itself is renderer-agnostic.

Signals do not depend on:

- PixiJS,
- DOM events,
- browser APIs,
- or ECS-specific runtime behavior.

This is important because Signals are designed as architecture-level runtime coordination primitives rather than renderer callbacks.

---

# Signal<T>

The base building block is `Signal<T>`.

A Signal is typed through a payload generic:

```typescript
type SpinRequestedPayload = {
    bet: number;
};

const spinRequestedSignal =
    new Signal<SpinRequestedPayload>();
```

This allows runtime communication to remain type-safe across systems.

Unlike loosely typed event buses, Signal payload contracts remain explicit and IDE-friendly.

---

# The Mental Model

At a high level, Signals follow a simple lifecycle:

```txt
listen
    ↓
dispatch
    ↓
react
    ↓
dispose
```

This lifecycle sounds small, but it becomes extremely important in long-running browser game sessions where listeners, async execution and runtime ownership must remain controlled.

---

# Listening to Signals

Listeners subscribe through `listen(...)`.

Conceptually:

```typescript
spinRequestedSignal.listen(async ({ bet }) => {
    console.log('Spin requested with bet:', bet);
});
```

Signals may have:

- one listener,
- many listeners,
- temporary listeners,
- lifecycle-bound listeners,
- or execution-driven listeners.

Signals intentionally do not assume a single ownership model.

Ownership is handled separately through lifecycle tracking and signal ownership patterns described in later articles.

---

# Dispatching Signals

Signals are triggered through `dispatch(...)`.

Conceptually:

```typescript
await spinRequestedSignal.dispatch({
    bet: 10,
});
```

Dispatching a Signal means:

```txt
Runtime event occurs
        ↓
Signal dispatch starts
        ↓
Listeners execute
        ↓
Dispatch resolves
```

One important detail is that dispatch itself may be asynchronous.

This is one of the major architectural differences between `empr.es` Signals and lightweight synchronous event emitters.

---

# Async Listeners

Signal listeners may be asynchronous.

Conceptually:

```typescript
resultReceivedSignal.listen(async (result) => {
    await validateResult(result);

    await playTransitionAnimation();

    await applyResult(result);
});
```

Because listeners may perform asynchronous work, dispatch can be awaited safely:

```typescript
await resultReceivedSignal.dispatch(serverResult);
```

This creates explicit async orchestration without manually wiring promise chains between unrelated runtime systems.

Architecturally, this is extremely important for gameplay flow where execution order matters.

For example:

```txt
Receive result
        ↓
Await validation
        ↓
Await transition animation
        ↓
Apply runtime state
        ↓
Start next pipeline
```

The runtime can safely coordinate asynchronous behavior without collapsing execution into deeply nested callbacks.

---

# Signals as Runtime Events

Signals are frequently used as architecture-level runtime events.

Typical examples include:

```txt
SpinRequestedSignal
ResultReceivedSignal
WinPresentationCompletedSignal
OnUpdateSignal
```

These Signals act as explicit communication contracts between runtime layers.

For example:

```txt
Input layer
        ↓
SpinRequestedSignal
        ↓
Gameplay flow
```

or:

```txt
Networking layer
        ↓
ResultReceivedSignal
        ↓
FSM transition
        ↓
Pipeline execution
```

The important architectural detail is that Signals represent runtime events — not ownership.

Signals communicate that something happened.

They do not decide how execution should be orchestrated afterward.

That responsibility belongs to execution layers such as FSM and Pipelines.

---

# SignalService

`SignalService` sits above raw Signals and connects Signals with execution flow.

Conceptually:

```txt
Signal dispatch
        ↓
SignalService
        ↓
ExecutionRegistry / Executor
        ↓
Pipeline execution
```

Without `SignalService`, Signals behave as standalone typed pub/sub primitives.

With `SignalService`, Signals become execution initiators.

This is one of the key runtime architecture patterns in `empr.es`.

---

# Signals as Execution Initiators

A Signal may directly trigger a Pipeline.

Conceptually:

```txt
SpinRequestedSignal
        ↓
SignalService
        ↓
startSpinPipeline
        ↓
Systems execute
```

This allows runtime flow to remain explicit and observable.

Instead of:

```txt
button callback
    ↓
directly mutates runtime
    ↓
starts animation
    ↓
calls gameplay logic
```

the architecture becomes:

```txt
Interaction
    ↓
Signal
    ↓
Execution
    ↓
Pipeline
    ↓
Systems
```

Execution becomes significantly easier to debug and inspect.

---

# Direct Signal Listeners vs Signal-driven Pipelines

One of the most important distinctions is the difference between:

```txt
Signal listener
        vs
Signal-driven execution flow
```

These solve different architectural problems.

---

## Direct Signal Listeners

Direct listeners are useful for lightweight reactions.

Examples:

- analytics,
- UI notifications,
- sound playback,
- telemetry,
- debug logging,
- simple runtime coordination.

Conceptually:

```typescript
spinRequestedSignal.listen(() => {
    audioService.play('spin-start');
});
```

This is usually appropriate when:

- the reaction is isolated,
- execution ordering is not complex,
- and no large orchestration flow is required.

---

## Signal-driven Pipelines

Signal-driven Pipelines are used when runtime flow becomes structured and ordered.

Examples:

- spin flow,
- loading sequences,
- stop flow,
- win presentation,
- server validation,
- complex state transitions.

Conceptually:

```txt
ResultReceivedSignal
        ↓
SignalService
        ↓
validateResultPipeline
        ↓
applyResultPipeline
        ↓
presentResultPipeline
```

This keeps orchestration centralized instead of scattering execution across many unrelated listeners.

---

# OnUpdateSignal

One important Signal commonly used in runtime architecture is `OnUpdateSignal`.

Conceptually:

```txt
External ticker
        ↓
UpdateLoop
        ↓
OnUpdateSignal
        ↓
Runtime execution
```

The update loop itself remains platform-agnostic.

Instead of hardcoding browser `requestAnimationFrame` usage throughout the project, runtime systems can react through Signals.

This makes update-driven execution portable across:

- browser runtime,
- tests,
- simulations,
- server-side environments,
- and tooling.

`OnUpdateSignal` is discussed in more detail in the dedicated update loop article.

---

# Signals and FSM

Signals frequently cooperate with FSM.

Conceptually:

```txt
Signal dispatched
        ↓
FSM transition
        ↓
Pipeline execution
```

For example:

```txt
SpinRequestedSignal
        ↓
FSM transitions Idle → Spin
        ↓
startSpinPipeline executes
```

This separation is important architecturally:

- Signals communicate events,
- FSM controls allowed state transitions,
- Pipelines orchestrate execution,
- Systems perform runtime work.

Each layer has a clear responsibility.

---

# Signals and Observability

One of the core reasons `empr.es` keeps Signals explicit is runtime observability.

Because execution originates from visible runtime initiators, debugging becomes significantly easier.

The runtime can track:

```txt
Which signal was dispatched?
Who listened to it?
Which pipeline started?
What async work happened?
Which runtime flow failed?
```

This becomes especially important in:

- production diagnostics,
- replay systems,
- QA tooling,
- telemetry,
- and long-running game sessions.

Signals are intentionally designed as inspectable runtime architecture primitives instead of hidden callbacks.

---

# Common Mistakes

## Treating Signals as Global Mutable State

Signals communicate runtime events.

Persistent state should usually live in:

- Components,
- stores,
- services,
- or FSM context.

---

## Putting Large Orchestration Into Listeners

Large runtime flows usually belong inside Pipelines.

If listeners become giant execution coordinators, orchestration is probably happening at the wrong architectural layer.

---

## Forgetting Listener Ownership

Long-running games can easily accumulate dangling listeners.

Listeners should usually participate in lifecycle ownership and controlled disposal.

---

## Using Signals for Everything

Not every runtime interaction requires a Signal.

Signals work best for explicit cross-layer runtime communication and execution initiation.

Overusing Signals for tiny local interactions may unnecessarily complicate flow.

---

# Limitations and Design Decisions

Signals intentionally prioritize explicit runtime communication over invisible implicit coupling.

A Signal is:

- not global mutable state,
- not a renderer event,
- not a hidden callback chain,
- and not a replacement for execution orchestration.

Signals communicate that something happened.

Execution architecture decides what should happen next.

This distinction is one of the most important design principles behind runtime flow control in `empr.es`.

---

# Related Articles

- `3.1. Execution Initiators`
- `3.3. Signal Ownership`
- `3.4. Custom Signal Owners`
- `3.5. Listening to Update Loop via SignalService`
- `3.6. Game Flow with FSM`
- `3.7. FSM + Pipeline + Signal Architecture`

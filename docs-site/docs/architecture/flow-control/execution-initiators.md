# Execution Initiators

## What is an execution initiator?

An **execution initiator** is the runtime source that starts an execution flow.

In `empr.es`, a Pipeline is not limited to being started manually from application code. The same execution flow can be started by an FSM state, a Signal, the update loop, a renderer interaction, or a direct call to the Executor.

The important part is that execution has a clear origin.

```txt
FSM / Signal / Update / Interaction / Manual Call
        ↓
ExecutionRegistry / Executor
        ↓
Pipeline
        ↓
Systems
        ↓
Entities + Components
```

This is one of the core ideas behind flow control in `empr.es`: runtime work should not appear from nowhere. When a Pipeline runs, the framework should be able to answer not only *what* executed, but also *why* it executed.

---

## Why execution needs a clear source

In browser games, execution often starts from many different places:

- an animation callback finishes;
- a button is clicked;
- a server response arrives;
- a game state changes;
- the next frame begins;
- a debug tool forces a flow to run;
- a feature script calls some logic directly.

Without an explicit execution source, these entry points quickly become scattered across scene objects, renderer callbacks, timers, signals and services. The game may still work, but the architecture loses a reliable answer to questions like:

```txt
Who started this flow?
Was this Pipeline triggered by FSM, input, update, or a manual call?
Why did this System run now?
Which Signal caused this state mutation?
Which frame or state transition produced this side effect?
```

`empr.es` avoids this by routing execution through a shared execution contract.

In the ECS stack, `@empr/es-sistema` provides `Executor`, `PipelineFactory`, `PipelineComposer`, and `System` execution. The core package `@empr/es` defines the generic `ExecutionRegistry` contract used by higher-level runtime features such as `FSMService` and `SignalService`.

This separation matters because FSM, Signals, interactions and manual execution do not need to know the internal details of Pipeline execution. They only need a registry capable of creating, running and stopping flows.

---

## Where initiators live in the architecture

Execution initiators sit above the Pipeline layer.

They do not replace Systems or Pipelines. They decide **when** a flow should start and provide the initial execution context.

```txt
Initiator
  ├─ FSM state enter / exit
  ├─ Signal dispatch
  ├─ Update tick
  ├─ Interaction event
  └─ Manual Executor call
        ↓
ExecutionRegistry
        ↓
PipelineFactory
        ↓
PipelineComposer
        ↓
Executor
        ↓
Systems
```

In the default ECS execution stack, `useECSBackend(app)` creates an `Executor`, wraps it with `ExecutorComposerRegistry`, and assigns that registry to `FSMService` and `SignalService`.

That wiring is important because it means multiple runtime features share the same execution gateway:

```typescript
import { Empr, FSMService, SignalService } from '@empr/es';
import { Executor, useECSBackend } from '@empr/es-sistema';

const app = new Empr();
app.init();

useECSBackend(app);

const executor = app.dependency.inject(Executor);
const fsmService = app.dependency.inject(FSMService);
const signalService = app.dependency.inject(SignalService);
```

After this wiring, FSM-driven flows, signal-driven flows and direct Executor calls all resolve through the same ECS execution stack.

---

## The ExecutionRegistry contract

`ExecutionRegistry` is the abstraction that allows flow-control features to start execution without depending directly on a specific execution stack.

Conceptually, it exposes three operations:

```typescript
abstract class ExecutionRegistry<TFlow> {
    abstract create(
        flow: TFlow,
        data: unknown,
        initiator: string,
        name: string,
    ): Promise<number>;

    abstract run(flowId: number, asyncAlowed: boolean): Promise<void>;

    abstract stop(flowId: number): void;
}
```

In `@empr/es-sistema`, `ExecutorComposerRegistry` adapts this contract to `PipelineFactory` execution:

```txt
ExecutionRegistry<PipelineFactory<any>>
        ↓
Executor.create(factory, data, initiator, name)
        ↓
Executor.run(executionId, asyncAllowed)
```

The `initiator` argument is not just decorative. It is execution metadata. It describes the source that caused a Pipeline instance to be created.

Examples of initiator values may include:

```txt
FSM.Spin.onEnter
SpinRequestedSignal
UpdateLoop.OnUpdateSignal
Interaction.PointerTap
Manual.DebugPanel
```

The exact naming convention belongs to the application, but the architectural rule is the same: execution should carry its origin.

---

## FSM as an initiator

FSM is usually the highest-level execution initiator in an `empr.es` game.

The FSM describes allowed runtime states and transitions. When a state is entered or exited, the configured flow can be executed through the active `ExecutionRegistry`.

Typical game flow:

```txt
Loading → InitScene → Idle → Spin → Stop → PresentWin → Idle
```

Each state can initiate ordered work:

```txt
Enter Spin
    ↓
startSpinPipeline
    ↓
lock input
prepare reels
start reel movement
request result
```

The FSM should not contain low-level gameplay logic itself. Its job is orchestration. Systems still perform the actual work, and Pipelines still define execution order.

A state transition therefore becomes a clear execution source:

```txt
Initiator: FSM.Spin.onEnter
Pipeline: startSpinPipeline
Systems: lockInputSystem → prepareReelsSystem → startReelsSystem
```

This is much easier to inspect than a transition hidden inside a button callback or animation completion handler.

---

## Signals as initiators

Signals are typed runtime events. They can be used directly as pub/sub primitives, but `SignalService` also allows a Signal to trigger an execution flow.

When a Signal is registered through `SignalService.listen(signal, factory)`, dispatching that Signal creates and runs the associated Pipeline through the active `ExecutionRegistry`.

```typescript
import { Signal, SignalService } from '@empr/es';
import type { PipelineFactory } from '@empr/es-sistema';

const SpinRequestedSignal = new Signal<{ bet: number }>('SpinRequestedSignal');

const startSpinPipeline: PipelineFactory<{ bet: number }> = ({ pipeline, bet }) => {
    pipeline
        .use(validateBetSystem, { bet })
        .use(lockInputSystem)
        .use(startReelsSystem);
};

const signalService = app.dependency.inject(SignalService);

signalService.listen(SpinRequestedSignal, startSpinPipeline);

await SpinRequestedSignal.dispatch({ bet: 100 });
```

At runtime, this creates a clear chain:

```txt
SpinRequestedSignal.dispatch({ bet: 100 })
        ↓
SignalService
        ↓
ExecutionRegistry.create(startSpinPipeline, data, signal.name, name)
        ↓
ExecutionRegistry.run(executionId, true)
```

Because Signal dispatch supports asynchronous listeners, dispatchers can await the completion of signal-driven execution when the registered listener awaits the Pipeline run.

This makes Signals useful for runtime events where ordered completion matters, such as:

- `SpinRequestedSignal`;
- `ResultReceivedSignal`;
- `WinPresentationCompletedSignal`;
- `SceneReadySignal`;
- `BonusFinishedSignal`.

A Signal should represent something that happened. The Pipeline attached to it describes what the runtime should do in response.

---

## Update loop as an initiator

The update loop is another execution source.

`UpdateLoop` is platform-agnostic: it receives ticks from an external ticker and emits normalized update data. On every valid tick, it dispatches `OnUpdateSignal` with update-loop data such as delta time, multiplied delta, speed multiplier, FPS and game time.

That means frame-driven logic can be connected to execution without hardcoding `requestAnimationFrame` inside gameplay systems.

```typescript
import { OnUpdateSignal, SignalService } from '@empr/es';
import type { PipelineFactory } from '@empr/es-sistema';

const updatePipeline: PipelineFactory<{ deltaTime: number }> = ({ pipeline, deltaTime }) => {
    pipeline
        .use(moveEntitiesSystem, { deltaTime })
        .use(updateTimersSystem, { deltaTime });
};

const signalService = app.dependency.inject(SignalService);

signalService.listen(OnUpdateSignal, updatePipeline);
```

Conceptually:

```txt
External ticker
        ↓
UpdateLoop
        ↓
OnUpdateSignal
        ↓
SignalService
        ↓
updatePipeline
        ↓
movement / timers / cooldown systems
```

Update-driven execution is useful for logic that genuinely changes every frame or tick:

- movement;
- timers;
- cooldowns;
- time-based interpolation;
- polling-free runtime updates;
- simulation steps.

It should not become a dumping ground for every gameplay flow. State transitions, server responses and user actions are usually better represented through FSM states, Signals or interactions.

---

## Interactions as initiators

In renderer-integrated games, user input is another common execution source.

The core package does not know about PixiJS, DOM, pointer events or any renderer-specific interaction model. That is intentional. Rendering and input integration belong to renderer/runtime packages such as `@empr/es-lienzo`.

However, interaction layers can still participate in the same flow-control architecture by using the active execution registry.

Conceptually:

```txt
Pointer / Tap / Drag / Button Press
        ↓
Interaction integration
        ↓
ExecutionRegistry
        ↓
Pipeline
        ↓
Systems
```

For example, a spin button should not directly mutate reel state, lock input, send network requests and start animations from inside the renderer object. It should initiate a controlled execution flow:

```txt
Spin button tap
        ↓
InteractionService
        ↓
SpinRequested flow
        ↓
validate bet
lock input
start spin
```

This keeps input handling as an initiator, not as the place where game architecture lives.

---

## Manual Executor calls as initiators

Manual execution is still valid.

Sometimes application code, tests, debug tools or internal scripts need to create and run a Pipeline directly.

```typescript
import { Executor } from '@empr/es-sistema';

const executor = app.dependency.inject(Executor);

const executionId = await executor.create(
    startSpinPipeline,
    { bet: 100 },
    'Manual.DebugPanel',
    'start-spin',
);

await executor.run(executionId);
```

Manual calls are especially useful for:

- tests;
- debug panels;
- replay tools;
- cheat tools;
- internal editors;
- one-off bootstrap flows;
- server-side simulations.

The important rule is that manual does not mean anonymous. Even direct calls should pass a meaningful initiator string.

Bad:

```typescript
await executor.create(startSpinPipeline, data, '', 'pipeline');
```

Better:

```typescript
await executor.create(startSpinPipeline, data, 'DebugPanel.StartSpinButton', 'start-spin');
```

The second version gives observability tools and developers a useful runtime story.

---

## Initiator vs Pipeline name

The initiator and the Pipeline name describe different things.

```txt
Initiator: who or what started execution
Name: what execution flow was created
```

For example:

```txt
Initiator: SpinRequestedSignal
Name: start-spin
```

or:

```txt
Initiator: FSM.PresentWin.onEnter
Name: present-win
```

This difference matters in debugging.

The same Pipeline may be started from different sources:

```txt
start-spin
  ├─ initiated by SpinRequestedSignal
  ├─ initiated by DebugPanel.StartSpinButton
  └─ initiated by Replay.StepRunner
```

If only the Pipeline name is tracked, all three executions look the same. If the initiator is tracked as well, the runtime can explain why each execution happened.

---

## Why explicit initiators improve observability

Execution initiators make runtime behavior inspectable.

When Pipelines are created with meaningful source metadata, tooling can show:

```txt
Execution #42
Initiator: SpinRequestedSignal
Pipeline: start-spin
Systems:
  1. validateBetSystem
  2. lockInputSystem
  3. prepareReelsSystem
  4. startReelsSystem
```

This is valuable for:

- debugging state transitions;
- tracing Signal-driven side effects;
- understanding update-loop work;
- reproducing runtime bugs;
- building replay tools;
- profiling System execution;
- explaining why an entity or component changed.

`@empr/es-sistema` also exposes Pipeline execution lifecycle signals for individual System execution start and end. Combined with initiator metadata, this gives the framework a strong foundation for debugging and observability layers.

The architectural benefit is simple: instead of asking “where did this callback come from?”, developers can inspect execution as a structured runtime flow.

---

## Practical mental model

A good way to think about initiators is this:

```txt
Initiator = why execution starts
Pipeline = what ordered work runs
System = one focused operation inside that work
Component = data being read or changed
Entity = runtime object composed from that data
```

For example:

```txt
Why?      SpinRequestedSignal
What?     startSpinPipeline
Steps?    validateBetSystem → lockInputSystem → startReelsSystem
Data?     BalanceComponent, ReelComponent, SpinStateComponent
Objects?  player, reels, symbols, UI buttons
```

This mental model keeps flow control explicit and prevents execution from disappearing into renderer objects, callbacks or unrelated services.

---

## Common mistakes

## Treating every trigger as a direct function call

Direct calls are easy at first, but they quickly hide runtime causality.

Prefer routing important gameplay flows through FSM, Signals, interactions or explicit Executor calls with meaningful initiator metadata.

---

## Hiding game flow inside interaction handlers

A button handler should initiate execution. It should not become the owner of spin logic, validation, animation coordination and state mutation.

Keep interaction code thin and route real work into Pipelines.

---

## Running too much logic on every update

The update loop is useful for frame-based behavior, but not every feature belongs there.

Use update-driven execution for logic that truly depends on time progression. Use Signals or FSM for event-driven and state-driven flows.

---

## Using vague initiator names

Names like `manual`, `flow`, `callback` or empty strings make debugging harder.

Prefer names that explain the source:

```txt
FSM.Spin.onEnter
SpinRequestedSignal
UpdateLoop.OnUpdateSignal
DebugPanel.StartSpinButton
Interaction.SpinButton.PointerTap
```

---

## Coupling high-level features to Executor directly

Application code may use `Executor` directly when appropriate, but framework-level features should depend on `ExecutionRegistry` where possible.

That keeps FSM and Signals compatible with different execution stacks, including ECS pipelines and Component Driven orchestration.

---

## Limitations and design decisions

Execution initiators do not define business logic by themselves.

They only answer the question:

```txt
What caused this execution flow to start?
```

The actual runtime work still belongs to Systems, and the order of that work still belongs to Pipelines.

The core package also does not hardcode renderer-specific interactions. Input integrations can initiate execution, but they live outside the renderer-agnostic core.

Finally, initiator metadata is only useful when teams treat it as part of the architecture. Passing empty or generic source names removes much of the observability benefit.

---

## Related articles

- [2.1. Systems](/architecture/execution/systems)
- [2.2. Pipelines](/architecture/execution/pipelines)
- [3.2. Signal and SignalService](/architecture/flow-control/signal-and-signalservice)
- [3.5. Listening to Update Loop via SignalService](/architecture/flow-control/listening-to-update-loop-via-signalservice)
- [3.6. Game Flow with FSM](/architecture/flow-control/game-flow-with-fsm)
- [3.7. FSM + Pipeline + Signal Architecture](/architecture/flow-control/fsm-pipeline-signal-architecture)
- [4.2. DI inside Systems and Pipelines](/architecture/runtime-services/di-inside-systems-and-pipelines)

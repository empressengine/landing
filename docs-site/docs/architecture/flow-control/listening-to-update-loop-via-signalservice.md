# Listening to Update Loop via SignalService

## What is the Update Loop?

Most browser games require some form of continuous runtime execution.

Typical examples include:

- movement,
- timers,
- cooldowns,
- animation stepping,
- interpolation,
- physics updates,
- and runtime synchronization.

Traditionally, browser games often implement this directly through:

```typescript
requestAnimationFrame(update);
```

or through renderer-owned ticker systems.

At first this feels simple.

The problem appears later when update execution becomes deeply coupled to:

- PixiJS,
- scene objects,
- browser APIs,
- renderer callbacks,
- or visual runtime ownership.

Eventually gameplay logic becomes difficult to:

- test,
- reuse,
- simulate,
- replay,
- or run outside the renderer.

Inside `empr.es`, update execution is intentionally treated as architecture-level runtime flow instead of renderer-specific behavior.

---

# The Core Idea

The update loop in `empr.es` is platform-agnostic.

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
Pipelines / Systems / Runtime logic
```

The framework itself does not own:

```txt
requestAnimationFrame
Pixi ticker
browser rendering loop
```

Instead, an external runtime source drives updates while the framework coordinates execution through Signals and Pipelines.

This separation is extremely important architecturally.

It allows runtime logic to remain portable across:

- browser runtime,
- Node.js,
- deterministic tests,
- replay tooling,
- simulations,
- and server-side validation flows.

---

# Why Update Execution Is Signal-driven

In many browser game architectures, update logic gradually becomes scattered across:

- scene object callbacks,
- renderer lifecycle hooks,
- animation handlers,
- and manually managed timers.

For example:

```typescript
app.ticker.add(() => {
    player.x += velocity;

    cooldown -= delta;

    updateAnimations();

    checkTimers();
});
```

This approach quickly creates several architectural problems:

- gameplay logic becomes renderer-dependent,
- execution ownership becomes unclear,
- update flow becomes fragmented,
- systems become difficult to reuse,
- and runtime observability becomes weak.

`empr.es` intentionally centralizes update execution through Signals and execution flow.

Instead of:

```txt
Renderer callback
        ↓
Mutate everything directly
```

the architecture becomes:

```txt
External ticker
        ↓
OnUpdateSignal
        ↓
Signal-driven execution
        ↓
Pipelines
        ↓
Systems
```

Execution remains explicit and inspectable.

---

# UpdateLoop

`UpdateLoop` acts as the runtime bridge between external ticking infrastructure and the framework execution model.

The important architectural detail is that the framework does not assume where updates come from.

Updates may be driven by:

- PixiJS ticker,
- browser `requestAnimationFrame`,
- server simulation loop,
- tests,
- replay systems,
- fixed-step simulation,
- or custom runtime drivers.

Conceptually:

```typescript
updateLoop.update({
    delta: 16.6,
    time: performance.now(),
});
```

The framework reacts to update data instead of owning the ticking source itself.

This keeps the runtime decoupled from rendering technology.

---

# OnUpdateSignal

`OnUpdateSignal` is the main Signal used for update-driven execution.

Conceptually:

```txt
External tick occurs
        ↓
UpdateLoop receives update
        ↓
OnUpdateSignal dispatches
        ↓
Runtime systems react
```

The Signal usually contains update-related runtime data such as:

```typescript
type UpdatePayload = {
    delta: number;
    time: number;
};
```

This allows runtime systems to remain deterministic and independent from renderer-specific APIs.

---

# Listening to Updates Directly

The simplest way to react to updates is by subscribing directly to `OnUpdateSignal`.

Conceptual example:

```typescript
const onUpdateSignal =
    inject(OnUpdateSignal);

onUpdateSignal.listen(({ delta }) => {
    console.log('Frame delta:', delta);
});
```

This approach is useful for:

- lightweight runtime reactions,
- debug tooling,
- metrics,
- telemetry,
- simple timers,
- or isolated runtime synchronization.

---

# Example — Simple Timer

Conceptual example:

```typescript
const onUpdateSignal =
    inject(OnUpdateSignal);

let remaining = 3000;

onUpdateSignal.listen(({ delta }) => {
    remaining -= delta;

    if (remaining <= 0) {
        console.log('Timer completed');
    }
});
```

This avoids manually managing browser timers throughout the runtime.

---

# Example — Cooldown System

Conceptual example:

```typescript
type CooldownComponent = {
    remaining: number;
};

const cooldownSystem: System = ({
    filter,
}: SystemProps) => {
    const entities = filter({
        includes: [CooldownComponent],
    });

    onUpdateSignal.listen(({ delta }) => {
        entities.forEach((entity) => {
            const cooldown =
                entity.getComponent(CooldownComponent);

            cooldown.remaining -= delta;

            if (cooldown.remaining < 0) {
                cooldown.remaining = 0;
            }
        });
    });
};
```

The important architectural detail is that cooldown logic stays inside runtime systems instead of renderer callbacks.

---

# Running Pipelines on Each Tick

One of the most important runtime patterns is executing Pipelines from update Signals.

Conceptually:

```txt
OnUpdateSignal
        ↓
SignalService
        ↓
Update Pipeline
        ↓
Movement System
        ↓
Cooldown System
        ↓
Animation System
```

This creates explicit update orchestration.

---

# Example — Update-driven Pipeline

Conceptual example:

```typescript
const updatePipeline: PipelineFactory<{
    delta: number;
}> = ({ pipeline }) => {
    pipeline
        .use(movementSystem)
        .use(cooldownSystem)
        .use(animationSystem);
};
```

Signal-driven execution:

```typescript
onUpdateSignal.listen(async ({ delta }) => {
    const id = await executor.create(
        updatePipeline,
        { delta },
        'SIGNAL',
        'update-loop',
    );

    await executor.run(id);
});
```

Now the runtime update flow becomes:

```txt
Tick
    ↓
Signal
    ↓
Pipeline
    ↓
Systems
```

instead of:

```txt
Renderer callback
    ↓
Everything mutates directly
```

This is one of the core architectural goals of `empr.es`.

---

# Example — Movement System

Conceptual example:

```typescript
class PositionComponent {
    public x = 0;
    public y = 0;
}

class VelocityComponent {
    public x = 0;
    public y = 0;
}

const movementSystem: System<{
    delta: number;
}> = ({
    filter,
    delta,
}: SystemProps<{
    delta: number;
}>) => {
    const entities = filter({
        includes: [
            PositionComponent,
            VelocityComponent,
        ],
    });

    entities.forEach((entity) => {
        const position =
            entity.getComponent(PositionComponent);

        const velocity =
            entity.getComponent(VelocityComponent);

        position.x += velocity.x * delta;
        position.y += velocity.y * delta;
    });
};
```

This System does not know:

- where updates came from,
- whether PixiJS exists,
- whether the runtime is visual,
- or whether execution happens in the browser.

It simply reacts to update data passed through execution flow.

---

# Example — Animation Stepping

Conceptual example:

```typescript
class AnimationComponent {
    public currentTime = 0;
    public duration = 1000;
}

const animationSystem: System<{
    delta: number;
}> = ({
    filter,
    delta,
}: SystemProps<{
    delta: number;
}>) => {
    const entities = filter({
        includes: [AnimationComponent],
    });

    entities.forEach((entity) => {
        const animation =
            entity.getComponent(AnimationComponent);

        animation.currentTime += delta;

        if (
            animation.currentTime >
            animation.duration
        ) {
            animation.currentTime =
                animation.duration;
        }
    });
};
```

Again, animation progression becomes architecture-level runtime logic instead of renderer-owned behavior.

---

# Polling-free Runtime Updates

Signals also allow systems to react without polling unrelated runtime state every frame.

Instead of:

```txt
Check if result exists
Check if animation ended
Check if cooldown finished
Check if state changed
```

Signals allow runtime flow to become event-driven.

For example:

```txt
ResultReceivedSignal
        ↓
Start evaluation pipeline
```

instead of:

```txt
Every frame:
    "Did result arrive yet?"
```

This reduces unnecessary update work and keeps execution more intentional.

---

# Update-driven Execution vs Event-driven Execution

Not all gameplay logic should run every tick.

This is one of the most important architectural distinctions.

---

# Good Candidates for Update-driven Execution

Update-driven execution is useful for:

- movement,
- interpolation,
- cooldowns,
- timers,
- animation stepping,
- fixed-step simulation,
- runtime synchronization,
- continuous effects,
- and time-based gameplay logic.

These systems naturally depend on elapsed time.

---

# Bad Candidates for Update-driven Execution

Some runtime logic should remain event-driven instead.

Examples:

- result arrival,
- button click handling,
- state transitions,
- bonus triggers,
- analytics,
- reward claiming,
- configuration changes.

Running these every frame usually creates unnecessary runtime work.

For example:

```txt
Every frame:
    "Did the player click spin?"
```

is usually worse than:

```txt
SpinRequestedSignal dispatched once
```

One of the goals of `empr.es` is to keep execution intentional instead of making the update loop responsible for everything.

---

# Fixed-step vs Variable-step Updates

Because update execution is decoupled from rendering, runtime drivers may choose different ticking strategies.

Examples include:

```txt
Variable delta updates
Fixed-step simulation
Replay-driven stepping
Paused runtime progression
Server-authoritative stepping
```

The framework execution layer reacts to update data without assuming how timing itself is implemented.

This becomes especially valuable for deterministic simulation and replay tooling.

---

# Update Loop and Observability

Signal-driven updates improve runtime observability significantly.

The runtime can track:

```txt
Which update triggered execution?
Which pipeline executed?
How long did Systems take?
Which runtime layer owns update flow?
```

This becomes useful for:

- debugging,
- telemetry,
- replay tooling,
- profiling,
- and production diagnostics.

Renderer-owned callbacks usually make this much harder because execution becomes fragmented across many unrelated objects.

---

# Common Mistakes

## Putting All Runtime Logic Into Update Loop

Not every gameplay action should run every tick.

Signals and FSM transitions should still drive event-oriented runtime flow.

---

## Mixing Renderer Logic Into Systems

Systems should remain renderer-agnostic whenever possible.

Renderer synchronization should happen in dedicated integration layers.

---

## Polling for Events Every Frame

Many runtime checks are better expressed through Signals.

Polling every update often creates unnecessary runtime complexity and wasted execution.

---

## Hardcoding requestAnimationFrame Everywhere

This tightly couples runtime architecture to browser rendering infrastructure.

`empr.es` intentionally separates runtime execution from rendering ownership.

---

# Limitations and Design Decisions

`empr.es` intentionally does not provide a hidden automatic game loop.

Instead, the framework expects external runtime infrastructure to drive updates explicitly.

This is a deliberate architectural decision.

The framework prioritizes:

- runtime portability,
- explicit execution,
- renderer independence,
- deterministic simulation support,
- and observable runtime flow.

Update execution exists as part of architecture — not as a side effect of rendering.

---

# Related Articles

- [3.1. Execution Initiators](/architecture/flow-control/execution-initiators)
- [3.2. Signal and SignalService](/architecture/flow-control/signal-and-signalservice)
- [2.2. Pipelines](/architecture/execution/pipelines)
- [2.1. Systems](/architecture/execution/systems)
- [3.6. Game Flow with FSM](/architecture/flow-control/game-flow-with-fsm)
- [3.7. FSM + Pipeline + Signal Architecture](/architecture/flow-control/fsm-pipeline-signal-architecture)

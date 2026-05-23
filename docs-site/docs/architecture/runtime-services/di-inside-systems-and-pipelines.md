# DI inside Systems and Pipelines

## What This Article Covers

The previous article explained how the `Dependency` container works inside `empr.es`.

This article focuses on the next architectural layer:

```txt
How runtime execution consumes dependencies.
```

More specifically:

- how Systems receive `inject`,
- how services are resolved during execution,
- how Pipelines affect dependency resolution,
- when to use DI versus Pipeline props,
- and how execution-scoped overrides work conceptually.

This article is focused on the ECS execution stack provided by `@empr/es-sistema`.

---

# Why Dependency Resolution Matters During Execution

One of the biggest architectural problems in large browser game projects is uncontrolled access to global runtime state.

Typical examples include:

- importing global singletons directly,
- renderer-owned services accessed from everywhere,
- hidden static utilities,
- mutable shared runtime state,
- or Systems depending on unrelated modules.

Over time this creates:

- tight coupling,
- hidden dependencies,
- difficult testing,
- and runtime behavior that becomes hard to reason about.

`empr.es` solves this through explicit runtime dependency resolution.

Instead of Systems manually reaching into global state:

```txt
Pipeline execution
        ↓
provides execution context
        ↓
Systems receive inject()
        ↓
services resolve through DI container
```

This keeps execution explicit and controlled.

---

# Systems Receive inject Through SystemProps

Inside `@empr/es-sistema`, Systems receive runtime tools through `SystemProps`.

One of those tools is:

```typescript
inject()
```

Conceptually:

```typescript
type SystemProps<T> = {
    filter(...);
    inject(...);
} & T;
```

This means Systems do not import runtime services directly.

Instead, services are resolved from the active dependency container during execution.

---

# Basic Service Resolution

The most common usage pattern looks like this:

```typescript
import type { System, SystemProps } from '@empr/es-sistema';

const scoreSystem: System = ({
    inject,
}: SystemProps) => {
    const scoreService = inject(ScoreService);

    scoreService.add(100);
};
```

Conceptually:

```txt
Executor runs Pipeline
        ↓
Pipeline runs System
        ↓
System receives inject()
        ↓
inject resolves ScoreService
```

This is intentionally explicit.

The System clearly communicates:

```txt
I require ScoreService to execute correctly.
```

instead of silently depending on hidden global runtime state.

---

# Injecting Multiple Services

Systems may resolve multiple runtime services during execution.

For example:

```typescript
const winPresentationSystem: System = ({
    inject,
}: SystemProps) => {
    const logger = inject(LoggerService);
    const scoreService = inject(ScoreService);
    const config = inject(ConfigService);
    const random = inject(RandomService);

    logger.info('Presenting win');

    const multiplier = random.range(1, 5);

    scoreService.add(
        config.baseWin * multiplier,
    );
};
```

Architecturally this keeps responsibilities separated:

- `LoggerService` handles logging,
- `ScoreService` manages score state,
- `ConfigService` stores runtime configuration,
- `RandomService` provides deterministic randomness.

The System coordinates behavior instead of owning service implementations itself.

---

# Example: LoggerService

A common example is runtime logging.

```typescript
class LoggerService {
    public info(message: string): void {
        console.log(message);
    }
}
```

Registration:

```typescript
Dependency.instance.registerGlobal({
    provide: LoggerService,
    useClass: LoggerService,
});
```

Usage inside a System:

```typescript
const loadingSystem: System = ({
    inject,
}: SystemProps) => {
    const logger = inject(LoggerService);

    logger.info('Loading assets...');
};
```

This is significantly safer architecturally than importing logger singletons directly from arbitrary modules.

---

# Example: ConfigService

Configuration is another very common DI use case.

```typescript
class ConfigService {
    public readonly baseWin = 100;
    public readonly spinDelay = 250;
}
```

Registration:

```typescript
Dependency.instance.registerGlobal({
    provide: ConfigService,
    useClass: ConfigService,
});
```

Usage:

```typescript
const spinSystem: System = ({
    inject,
}: SystemProps) => {
    const config = inject(ConfigService);

    wait(config.spinDelay);
};
```

This allows runtime configuration to remain centralized instead of duplicated across Systems.

---

# Example: RandomService

Games frequently require deterministic random behavior.

```typescript
class RandomService {
    public range(min: number, max: number): number {
        return Math.floor(
            Math.random() * (max - min + 1),
        ) + min;
    }
}
```

Usage:

```typescript
const rewardSystem: System = ({
    inject,
}: SystemProps) => {
    const random = inject(RandomService);

    const reward = random.range(10, 100);

    console.log(reward);
};
```

In production projects, deterministic PRNG implementations are often registered through DI instead of hardcoded directly inside Systems.

This becomes especially valuable for:

- replay systems,
- testing,
- server-authoritative logic,
- and debugging tools.

---

# Injecting Through Tokens

Not all dependencies need to be classes.

Primitive runtime configuration can also be injected through `InjectionToken<T>`.

Example:

```typescript
import {
    InjectionToken,
    Dependency,
} from '@empr/es';

const API_URL = new InjectionToken<string>(
    'API_URL',
);

Dependency.instance.registerGlobal({
    provide: API_URL,
    useFactory: () => 'https://api.game.com',
});
```

Usage inside a System:

```typescript
const networkSystem: System = ({
    inject,
}: SystemProps) => {
    const apiUrl = inject(API_URL);

    console.log(apiUrl);
};
```

This is useful for:

- URLs,
- environment values,
- feature flags,
- runtime identifiers,
- and build configuration.

---

# Pipeline Execution Context

One of the most important architectural ideas in `empr.es` is that dependency resolution may vary depending on execution context.

Conceptually:

```txt
Global services
        +
Pipeline-scoped overrides
        ↓
System execution
```

This allows specific runtime flows to replace services temporarily without changing the global runtime container.

---

# Scoped Registrations

The `Dependency` container supports execution-scoped registrations.

For example:

```typescript
Dependency.instance.register(
    'battle-flow',
    {
        provide: ScoreService,
        useClass: BattleScoreService,
    },
);
```

Conceptually:

```txt
Global runtime uses:
    ScoreService

battle-flow execution uses:
    BattleScoreService
```

This is extremely powerful architecturally because execution behavior may change per runtime flow.

---

# Example: Different Score Logic Per Pipeline

Imagine two runtime flows:

```txt
Regular gameplay
Bonus mode
```

Bonus mode may require completely different score behavior.

Global registration:

```typescript
Dependency.instance.registerGlobal({
    provide: ScoreService,
    useClass: ScoreService,
});
```

Scoped override:

```typescript
Dependency.instance.register(
    'bonus-pipeline',
    {
        provide: ScoreService,
        useClass: BonusScoreService,
    },
);
```

Then during execution:

```typescript
const pipelineId = await executor.create(
    bonusPipeline,
    {},
    'FSM',
    'bonus-pipeline',
);
```

Now Systems resolving `ScoreService` inside this execution context receive:

```txt
BonusScoreService
```

instead of the default implementation.

---

# Why Scoped Resolution Matters

Execution-scoped resolution becomes especially valuable when different runtime flows require different behavior.

Examples include:

- debug pipelines,
- replay systems,
- tutorial flows,
- PvE versus PvP balancing,
- mock networking,
- testing environments,
- or seasonal gameplay events.

Without scoped DI, teams often resort to:

- giant conditional services,
- runtime flags,
- or deeply coupled branching logic.

Scoped dependency resolution keeps these variations isolated.

---

# DI vs Pipeline Props

One of the most important design questions is:

```txt
Should this data come from DI
or from Pipeline props?
```

This distinction is extremely important architecturally.

---

# Use DI for Runtime Services

Dependency Injection is best for:

- long-lived runtime services,
- infrastructure,
- shared runtime systems,
- configuration,
- stateful managers,
- utilities,
- and cross-system functionality.

Examples:

```txt
LoggerService
AudioService
ScoreService
ConfigService
RandomService
TweenService
```

These are runtime capabilities.

---

# Use Pipeline Props for Execution Data

Pipeline props are best for:

- temporary execution parameters,
- flow-specific values,
- runtime payloads,
- and contextual execution data.

For example:

```typescript
pipeline.use(applyDamageSystem, {
    damage: 100,
});
```

Inside the System:

```typescript
const applyDamageSystem: System<{
    damage: number;
}> = ({
    damage,
}: SystemProps<{
    damage: number;
}>) => {
    console.log(damage);
};
```

This data belongs to the current execution flow, not to global runtime infrastructure.

---

# A Good Rule of Thumb

A useful mental model is:

```txt
DI = capabilities and services

Pipeline props = execution payload
```

Examples:

| Should Use DI | Should Use Pipeline Props |
| --- | --- |
| LoggerService | damage |
| AudioService | winAmount |
| ConfigService | reelIndex |
| RandomService | delayMs |
| TweenService | targetPosition |

This separation helps keep Systems predictable and reusable.

---

# Combining DI and Pipeline Props

Most real Systems use both.

For example:

```typescript
const presentWinSystem: System<{
    winAmount: number;
}> = ({
    inject,
    winAmount,
}: SystemProps<{
    winAmount: number;
}>) => {
    const logger = inject(LoggerService);
    const audio = inject(AudioService);

    logger.info(
        `Presenting win: ${winAmount}`,
    );

    audio.play('big-win');
};
```

Conceptually:

```txt
Pipeline props provide:
    winAmount

DI provides:
    logger
    audio
```

This creates clean separation between:

```txt
execution data
        vs
runtime infrastructure
```

---

# Systems Should Not Manually Own Services

One important architectural rule in `empr.es` is:

```txt
Systems consume services.
They should not own service creation.
```

For example, this is usually a bad direction:

```typescript
const system: System = () => {
    const logger = new LoggerService();
};
```

Why?

Because this bypasses:

- centralized registration,
- execution scoping,
- testing replacement,
- and lifecycle control.

The DI container exists specifically to solve these problems.

---

# Testing Systems With DI

Dependency Injection also makes Systems significantly easier to test.

Example:

```typescript
class MockLoggerService {
    public logs: string[] = [];

    public info(message: string): void {
        this.logs.push(message);
    }
}
```

Test registration:

```typescript
Dependency.instance.register(
    'test-flow',
    {
        provide: LoggerService,
        useClass: MockLoggerService,
    },
);
```

Now Systems automatically receive the mock implementation during test execution.

This is much safer than patching globals or monkey-patching runtime modules.

---

# DI and Runtime Architecture

The DI model in `empr.es` intentionally reinforces several architectural goals:

```txt
Explicit dependencies
        +
Execution-scoped resolution
        +
Reusable Systems
        +
Decoupled runtime services
```

This creates runtime architecture that is:

- easier to test,
- easier to debug,
- easier to scale,
- and safer to evolve over time.

Especially in long-running browser game projects.

---

# Common Mistakes

## Injecting Everything

Not all data belongs in DI.

Execution-specific payload should usually remain Pipeline props.

---

## Treating DI as Global Mutable State

Services should expose clean APIs.

Using DI as a giant uncontrolled state container usually recreates the same coupling problems DI was meant to solve.

---

## Creating Services Inside Systems

Systems should resolve services through `inject`.

They should not manually instantiate runtime infrastructure.

---

## Using Pipeline Props for Global Infrastructure

Large shared runtime services usually belong in DI, not inside every `.use(...)` call.

---

# Limitations and Design Decisions

The DI model in `empr.es` intentionally stays lightweight.

It avoids:

- decorators,
- reflection metadata,
- hidden magic,
- and automatic class scanning.

Dependency resolution remains explicit and runtime-driven.

Systems receive `inject`.

Pipelines define execution context.

The container resolves services.

This keeps execution understandable and deterministic.

---

# Related Articles

- `4.1. DI Container`
- `2.1. Systems`
- `2.2. Pipelines`
- `3.1. Execution Initiators`
- `3.7. FSM + Pipeline + Signal Architecture`

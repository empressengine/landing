# 5.1. Building a Console-only Game Mechanic

## What this guide covers

This guide builds a small combat mechanic using only `@empr/es` and `@empr/es-sistema`.

There is no PixiJS, no DOM, no canvas, no scene graph, no assets, and no renderer integration. The whole example runs as a standalone logic runtime and prints the result to the console.

The goal is to make the architecture visible in the smallest practical form:

```txt
Bootstrap Empr
→ Register ECS backend
→ Register services in DI
→ Create Player and Enemy entities
→ Add Components
→ Add Entities to EntityStorage
→ Dispatch PlayerAttackSignal
→ Run DamagePipeline
→ Execute Systems
→ Print result to console
```

The example is intentionally simple, but it uses the same architectural building blocks that a real game feature would use: Entities, Components, Systems, Pipelines, DI, Signals, `EntityStorage`, and `Executor`.

---

## Why a console-only guide matters

`empr.es` is not a renderer. The core package does not require PixiJS, ThreeJS, the DOM, or browser-specific rendering APIs.

That boundary is important. Game logic should not depend on how the result is drawn. A combat rule, slot spin rule, reward calculation, state transition, server-side simulation, or test scenario can run without a renderer if the architecture is separated correctly.

In this guide, the console becomes our "view". It prints what happened, but it does not own the mechanic.

The mechanic itself lives in ECS data and ordered execution:

```txt
Components store combat data
Systems mutate that data
Pipeline defines execution order
Signal starts the execution
DI provides services
EntityStorage provides entity queries
```

---

## Packages used

Install the core runtime and the ECS execution stack:

```bash
npm install @empr/es @empr/es-sistema
```

Use `@empr/es` for:

- `Empr`
- `Entity`
- `EntityStorage`
- `Signal`
- `SignalService`
- `InjectionToken`
- `nextId`

Use `@empr/es-sistema` for:

- `useECSBackend`
- `Executor`
- `System`
- `SystemProps`
- `PipelineFactory`

The important boundary is this: entities, components, storage, signals, DI, and shared runtime services come from `@empr/es`; system execution and pipeline orchestration come from `@empr/es-sistema`.

---

## Final result

At the end, running the demo should print something close to this:

```txt
[combat] Aria attacks Training Goblin
[combat] Training Goblin takes 12 damage. HP: 18 / 30
[combat] Training Goblin survived.

[combat] Aria attacks Training Goblin
[combat] Training Goblin takes 12 damage. HP: 6 / 30
[combat] Training Goblin survived.

[combat] Aria attacks Training Goblin
[combat] Training Goblin takes 12 damage. HP: 0 / 30
[combat] Training Goblin is defeated.
[combat] Aria receives 25 gold.
```

The exact output may differ if you change the component values.

---

## Runtime flow

The combat demo has one signal-driven flow:

```txt
PlayerAttackSignal
        ↓
DamagePipeline
        ↓
selectTargetSystem
        ↓
damageSystem
        ↓
deathCheckSystem
        ↓
rewardSystem
        ↓
logCombatResultSystem
```

The signal describes what happened at the feature boundary: a player requested an attack.

The pipeline describes what must happen in response, step by step.

Each system performs one focused operation.

---

## Step 1. Add the ECS backend type augmentation

`SignalService` is part of `@empr/es`, but the concrete pipeline type comes from `@empr/es-sistema`.

To let `SignalService` understand that signal-driven flows are `PipelineFactory` functions, add this module augmentation somewhere in your application types, for example in `src/empr-es.d.ts`:

```typescript
import type { PipelineFactory } from '@empr/es-sistema';

declare module '@empr/es' {
    interface ESCoreTypeRegistry {
        SSFlowAliasType: PipelineFactory<any>;
    }
}
```

This keeps the core package independent from the ECS execution package while still allowing the application to connect them in TypeScript.

---

## Step 2. Define Components

Components are data holders. They do not contain combat behavior, lifecycle logic, subscriptions, rendering code, or orchestration.

```typescript
class NameComponent {
    constructor(public value: string) {}
}

class HealthComponent {
    constructor(
        public current: number,
        public max: number,
    ) {}
}

class AttackComponent {
    constructor(public damage: number) {}
}

class RewardComponent {
    constructor(public gold: number) {}
}

class DeadTag {}
```

The `DeadTag` component has no fields. Its presence is the data. If an entity has `DeadTag`, systems can treat it as dead or exclude it from future combat queries.

This is a common ECS pattern in `empr.es`: a tag component can represent a runtime state without adding boolean flags to unrelated components.

---

## Step 3. Define the attack Signal

Signals represent typed events.

For this demo, the signal payload contains only the attacker and target entity ids:

```typescript
import { Signal } from '@empr/es';

interface PlayerAttackPayload {
    attackerId: number;
    targetId: number;
}

const PlayerAttackSignal = new Signal<PlayerAttackPayload>('PlayerAttackSignal');
```

The signal does not contain damage logic. It only says that an attack was requested. The ordered work is still owned by the pipeline.

---

## Step 4. Define services and DI tokens

Systems should not import global singletons directly. In this demo, they receive services through DI.

```typescript
import { InjectionToken } from '@empr/es';

interface LoggerService {
    log(message: string): void;
}

class ConsoleLoggerService implements LoggerService {
    public log(message: string): void {
        console.log(message);
    }
}

class CombatConfigService {
    public readonly minimumDamage = 1;
}

const LOGGER_SERVICE = new InjectionToken<LoggerService>('LOGGER_SERVICE');
```

`CombatConfigService` can be registered by class token because the class itself is a DI token. `LOGGER_SERVICE` uses an `InjectionToken` because the system depends on an interface-like contract rather than a concrete class.

---

## Step 5. Define shared pipeline data

Pipeline data is the small execution context passed from the initiator to the systems.

```typescript
import type { Entity } from '@empr/es';

interface CombatPipelineData extends PlayerAttackPayload {
    attacker?: Entity;
    target?: Entity;
    damage?: number;
    killed?: boolean;
    rewardGranted?: boolean;
}
```

This object is intentionally local to one pipeline execution. It is not global state, and it is not a component. It is a temporary execution context.

In a real project, you may keep pipeline data smaller and store durable gameplay state in Components or Store. For this tutorial, keeping the combat result inside the pipeline payload makes the data flow easy to follow.

---

## Step 6. Create Systems

A System is a function. It receives `SystemProps`, which include execution tools such as `filter`, `inject`, `onStop`, and the custom data passed into the pipeline.

### selectTargetSystem

The first system resolves the attacker and target from `EntityStorage`.

```typescript
import { EntityStorage } from '@empr/es';
import type { System, SystemProps } from '@empr/es-sistema';

const selectTargetSystem: System<CombatPipelineData> = (
    props: SystemProps<CombatPipelineData>,
) => {
    const storage = props.inject(EntityStorage);
    const logger = props.inject(LOGGER_SERVICE);

    const attacker = storage.getEntity(props.attackerId) as Entity | undefined;
    const target = storage.getEntity(props.targetId) as Entity | undefined;

    if (!attacker) {
        throw new Error(`Attacker entity ${props.attackerId} was not found.`);
    }

    if (!target) {
        throw new Error(`Target entity ${props.targetId} was not found.`);
    }

    props.attacker = attacker;
    props.target = target;

    const attackerName = attacker.getComponent(NameComponent).value;
    const targetName = target.getComponent(NameComponent).value;

    logger.log(`[combat] ${attackerName} attacks ${targetName}`);
};
```

This system does not calculate damage. It only prepares the target data for the next systems.

### damageSystem

The damage system reads attack data from the attacker and health data from the target.

```typescript
const damageSystem: System<CombatPipelineData> = (
    props: SystemProps<CombatPipelineData>,
) => {
    const logger = props.inject(LOGGER_SERVICE);
    const config = props.inject(CombatConfigService);

    if (!props.attacker || !props.target) {
        throw new Error('damageSystem requires attacker and target.');
    }

    const attack = props.attacker.getComponent(AttackComponent);
    const health = props.target.getComponent(HealthComponent);
    const targetName = props.target.getComponent(NameComponent).value;

    const damage = Math.max(config.minimumDamage, attack.damage);

    health.current = Math.max(0, health.current - damage);
    props.damage = damage;

    logger.log(
        `[combat] ${targetName} takes ${damage} damage. HP: ${health.current} / ${health.max}`,
    );
};
```

The system mutates `HealthComponent` because health is entity state. It does not print victory rewards, mark death, or decide the whole combat flow.

### deathCheckSystem

The death check system marks the target with `DeadTag` when health reaches zero.

```typescript
const deathCheckSystem: System<CombatPipelineData> = (
    props: SystemProps<CombatPipelineData>,
) => {
    const logger = props.inject(LOGGER_SERVICE);

    if (!props.target) {
        throw new Error('deathCheckSystem requires target.');
    }

    const health = props.target.getComponent(HealthComponent);
    const targetName = props.target.getComponent(NameComponent).value;

    if (health.current > 0) {
        props.killed = false;
        logger.log(`[combat] ${targetName} survived.`);
        return;
    }

    if (!props.target.hasComponent(DeadTag)) {
        props.target.addComponent(new DeadTag());
    }

    props.killed = true;
    logger.log(`[combat] ${targetName} is defeated.`);
};
```

This system demonstrates why tag components are useful. Once `DeadTag` is added, other systems can include or exclude dead entities through component filters.

### rewardSystem

The reward system grants reward only if the target was killed.

```typescript
const rewardSystem: System<CombatPipelineData> = (
    props: SystemProps<CombatPipelineData>,
) => {
    const logger = props.inject(LOGGER_SERVICE);

    if (!props.attacker || !props.target || !props.killed) {
        return;
    }

    if (!props.target.hasComponent(RewardComponent)) {
        return;
    }

    const reward = props.target.getComponent(RewardComponent);
    const attackerName = props.attacker.getComponent(NameComponent).value;

    props.rewardGranted = true;

    logger.log(`[combat] ${attackerName} receives ${reward.gold} gold.`);
};
```

This system is intentionally small. It does not calculate damage and it does not decide whether the target is dead. It reacts to the result produced by previous systems.

### logCombatResultSystem

The final system prints a clean separator and shows how `filter` can be used inside Systems.

```typescript
const logCombatResultSystem: System<CombatPipelineData> = (
    props: SystemProps<CombatPipelineData>,
) => {
    const logger = props.inject(LOGGER_SERVICE);

    const aliveCombatants = props.filter({
        includes: [NameComponent, HealthComponent],
        excludes: [DeadTag],
    });

    logger.log(`[combat] Alive combatants: ${aliveCombatants.size}`);
    logger.log('');
};
```

This query asks `EntityStorage` for entities that have `NameComponent` and `HealthComponent`, but do not have `DeadTag`.

The system does not keep its own list of alive entities. It asks the storage for the current runtime state.

---

## Step 7. Create the DamagePipeline

A PipelineFactory receives a `PipelineComposer` and registers systems in the exact order in which they should run.

```typescript
import type { PipelineFactory } from '@empr/es-sistema';

const DamagePipeline: PipelineFactory<CombatPipelineData> = ({ pipeline }) => {
    pipeline
        .use(selectTargetSystem)
        .use(damageSystem)
        .use(deathCheckSystem)
        .use(rewardSystem)
        .use(logCombatResultSystem);
};
```

This is the central point of the execution flow. A developer can read the pipeline and understand the feature order without searching through callbacks hidden inside objects.

---

## Step 8. Bootstrap Empr and register the ECS backend

The `Empr` bootstrap creates and registers core renderer-agnostic services such as `EntityStorage`, `SignalService`, `UpdateLoop`, `LifecycleTracker`, `Pools`, `PRNG`, and `FSMService`.

`useECSBackend(empr)` connects the ECS execution stack to the core runtime. It creates the `Executor`, wires execution registries into `SignalService` and `FSMService`, and registers the `Executor` in DI.

```typescript
import {
    Empr,
    Entity,
    EntityStorage,
    SignalService,
    nextId,
} from '@empr/es';
import { Executor, useECSBackend } from '@empr/es-sistema';

const empr = new Empr();
empr.init();

useECSBackend(empr);
```

The order matters:

```txt
new Empr()
→ empr.init()
→ useECSBackend(empr)
```

Do not call `useECSBackend` before `empr.init()`, because the backend expects core services to already be available in DI.

---

## Step 9. Register custom services

After initialization, register demo-specific services in the DI container.

```typescript
empr.dependency.registerGlobal({
    provide: LOGGER_SERVICE,
    useClass: ConsoleLoggerService,
});

empr.dependency.registerGlobal({
    provide: CombatConfigService,
    useClass: CombatConfigService,
});
```

Systems will resolve these services through `props.inject(...)`.

---

## Step 10. Create entities and add them to EntityStorage

Entities are runtime composition containers. They become a player or an enemy through components.

```typescript
const storage = empr.dependency.inject(EntityStorage);

const player = new Entity(nextId(), 'Player');
player.addComponent(new NameComponent('Aria'));
player.addComponent(new HealthComponent(100, 100));
player.addComponent(new AttackComponent(12));

const enemy = new Entity(nextId(), 'Enemy');
enemy.addComponent(new NameComponent('Training Goblin'));
enemy.addComponent(new HealthComponent(30, 30));
enemy.addComponent(new RewardComponent(25));

const storedPlayer = storage.addEntity(player);
const storedEnemy = storage.addEntity(enemy);
```

`storage.addEntity(...)` returns the entity registered in storage. In this runtime, storage wraps entities through `ProxyEntity`, which is used internally for automatic component indexation and component-change interception.

For application code, the practical rule is simple: after an entity is added to `EntityStorage`, use the stored entity reference when passing ids or working with the runtime world.

---

## Step 11. Run the pipeline directly through Executor

Before using signals, it is useful to see the direct execution path.

```typescript
const executor = empr.dependency.inject(Executor);

const directExecutionId = await executor.create(
    DamagePipeline,
    {
        attackerId: storedPlayer.id,
        targetId: storedEnemy.id,
    },
    'manual',
    'DamagePipeline',
);

await executor.run(directExecutionId, true);
```

The direct path is:

```txt
Executor.create(factory, data, initiator, name)
        ↓
PipelineComposer builds the ordered system list
        ↓
Executor.run(executionId)
        ↓
Pipeline executes systems one by one
```

Use this style when you want explicit manual control over pipeline creation and execution.

---

## Step 12. Run the same pipeline through SignalService

Now connect the same pipeline to `PlayerAttackSignal`.

```typescript
const signalService = empr.dependency.inject(SignalService);

signalService.listen(PlayerAttackSignal, DamagePipeline);
```

After that, dispatching the signal automatically creates and runs the pipeline:

```typescript
await PlayerAttackSignal.dispatch({
    attackerId: storedPlayer.id,
    targetId: storedEnemy.id,
});
```

The signal-driven path is:

```txt
PlayerAttackSignal.dispatch(payload)
        ↓
SignalService listener
        ↓
ExecutionRegistry.create(DamagePipeline, payload, signalName, name)
        ↓
ExecutionRegistry.run(executionId)
        ↓
Pipeline systems execute
```

Because signal dispatch supports asynchronous listeners, `await PlayerAttackSignal.dispatch(...)` waits until the pipeline execution has completed.

---

## Full source code

The full demo can live in a single TypeScript file for learning purposes.

```typescript
import {
    Empr,
    Entity,
    EntityStorage,
    InjectionToken,
    Signal,
    SignalService,
    nextId,
} from '@empr/es';
import {
    Executor,
    PipelineFactory,
    System,
    SystemProps,
    useECSBackend,
} from '@empr/es-sistema';

class NameComponent {
    constructor(public value: string) {}
}

class HealthComponent {
    constructor(
        public current: number,
        public max: number,
    ) {}
}

class AttackComponent {
    constructor(public damage: number) {}
}

class RewardComponent {
    constructor(public gold: number) {}
}

class DeadTag {}

interface PlayerAttackPayload {
    attackerId: number;
    targetId: number;
}

interface CombatPipelineData extends PlayerAttackPayload {
    attacker?: Entity;
    target?: Entity;
    damage?: number;
    killed?: boolean;
    rewardGranted?: boolean;
}

interface LoggerService {
    log(message: string): void;
}

class ConsoleLoggerService implements LoggerService {
    public log(message: string): void {
        console.log(message);
    }
}

class CombatConfigService {
    public readonly minimumDamage = 1;
}

const LOGGER_SERVICE = new InjectionToken<LoggerService>('LOGGER_SERVICE');

const PlayerAttackSignal = new Signal<PlayerAttackPayload>('PlayerAttackSignal');

const selectTargetSystem: System<CombatPipelineData> = (
    props: SystemProps<CombatPipelineData>,
) => {
    const storage = props.inject(EntityStorage);
    const logger = props.inject(LOGGER_SERVICE);

    const attacker = storage.getEntity(props.attackerId) as Entity | undefined;
    const target = storage.getEntity(props.targetId) as Entity | undefined;

    if (!attacker) {
        throw new Error(`Attacker entity ${props.attackerId} was not found.`);
    }

    if (!target) {
        throw new Error(`Target entity ${props.targetId} was not found.`);
    }

    props.attacker = attacker;
    props.target = target;

    const attackerName = attacker.getComponent(NameComponent).value;
    const targetName = target.getComponent(NameComponent).value;

    logger.log(`[combat] ${attackerName} attacks ${targetName}`);
};

const damageSystem: System<CombatPipelineData> = (
    props: SystemProps<CombatPipelineData>,
) => {
    const logger = props.inject(LOGGER_SERVICE);
    const config = props.inject(CombatConfigService);

    if (!props.attacker || !props.target) {
        throw new Error('damageSystem requires attacker and target.');
    }

    const attack = props.attacker.getComponent(AttackComponent);
    const health = props.target.getComponent(HealthComponent);
    const targetName = props.target.getComponent(NameComponent).value;

    const damage = Math.max(config.minimumDamage, attack.damage);

    health.current = Math.max(0, health.current - damage);
    props.damage = damage;

    logger.log(
        `[combat] ${targetName} takes ${damage} damage. HP: ${health.current} / ${health.max}`,
    );
};

const deathCheckSystem: System<CombatPipelineData> = (
    props: SystemProps<CombatPipelineData>,
) => {
    const logger = props.inject(LOGGER_SERVICE);

    if (!props.target) {
        throw new Error('deathCheckSystem requires target.');
    }

    const health = props.target.getComponent(HealthComponent);
    const targetName = props.target.getComponent(NameComponent).value;

    if (health.current > 0) {
        props.killed = false;
        logger.log(`[combat] ${targetName} survived.`);
        return;
    }

    if (!props.target.hasComponent(DeadTag)) {
        props.target.addComponent(new DeadTag());
    }

    props.killed = true;
    logger.log(`[combat] ${targetName} is defeated.`);
};

const rewardSystem: System<CombatPipelineData> = (
    props: SystemProps<CombatPipelineData>,
) => {
    const logger = props.inject(LOGGER_SERVICE);

    if (!props.attacker || !props.target || !props.killed) {
        return;
    }

    if (!props.target.hasComponent(RewardComponent)) {
        return;
    }

    const reward = props.target.getComponent(RewardComponent);
    const attackerName = props.attacker.getComponent(NameComponent).value;

    props.rewardGranted = true;

    logger.log(`[combat] ${attackerName} receives ${reward.gold} gold.`);
};

const logCombatResultSystem: System<CombatPipelineData> = (
    props: SystemProps<CombatPipelineData>,
) => {
    const logger = props.inject(LOGGER_SERVICE);

    const aliveCombatants = props.filter({
        includes: [NameComponent, HealthComponent],
        excludes: [DeadTag],
    });

    logger.log(`[combat] Alive combatants: ${aliveCombatants.size}`);
    logger.log('');
};

const DamagePipeline: PipelineFactory<CombatPipelineData> = ({ pipeline }) => {
    pipeline
        .use(selectTargetSystem)
        .use(damageSystem)
        .use(deathCheckSystem)
        .use(rewardSystem)
        .use(logCombatResultSystem);
};

async function main(): Promise<void> {
    const empr = new Empr();
    empr.init();

    useECSBackend(empr);

    empr.dependency.registerGlobal({
        provide: LOGGER_SERVICE,
        useClass: ConsoleLoggerService,
    });

    empr.dependency.registerGlobal({
        provide: CombatConfigService,
        useClass: CombatConfigService,
    });

    const storage = empr.dependency.inject(EntityStorage);

    const player = new Entity(nextId(), 'Player');
    player.addComponent(new NameComponent('Aria'));
    player.addComponent(new HealthComponent(100, 100));
    player.addComponent(new AttackComponent(12));

    const enemy = new Entity(nextId(), 'Enemy');
    enemy.addComponent(new NameComponent('Training Goblin'));
    enemy.addComponent(new HealthComponent(30, 30));
    enemy.addComponent(new RewardComponent(25));

    const storedPlayer = storage.addEntity(player);
    const storedEnemy = storage.addEntity(enemy);

    const signalService = empr.dependency.inject(SignalService);
    signalService.listen(PlayerAttackSignal, DamagePipeline);

    await PlayerAttackSignal.dispatch({
        attackerId: storedPlayer.id,
        targetId: storedEnemy.id,
    });

    await PlayerAttackSignal.dispatch({
        attackerId: storedPlayer.id,
        targetId: storedEnemy.id,
    });

    await PlayerAttackSignal.dispatch({
        attackerId: storedPlayer.id,
        targetId: storedEnemy.id,
    });

    // Optional direct execution example:
    // const executor = empr.dependency.inject(Executor);
    // const executionId = await executor.create(
    //     DamagePipeline,
    //     {
    //         attackerId: storedPlayer.id,
    //         targetId: storedEnemy.id,
    //     },
    //     'manual',
    //     'DamagePipeline',
    // );
    // await executor.run(executionId, true);
}

main().catch((error) => {
    console.error(error);
});
```

If this file is used in a TypeScript project, remember to include the module augmentation from the earlier section so `SignalService.listen(...)` accepts `PipelineFactory` as its flow type.

---

## Optional: adding FSM flow

The same mechanic can be wrapped into a high-level FSM flow later:

```txt
Idle
  ↓ PlayerAttackSignal
Combat
  ↓ DamagePipeline completed
Finished
  ↓ reset / next command
Idle
```

The FSM should not replace the combat systems. Its role would be to control which high-level state the game is currently in and which transitions are allowed.

For example:

```txt
Idle allows PlayerAttackSignal
Combat blocks duplicate attack input
Finished decides whether to return to Idle or end the encounter
```

Keep this separation:

```txt
FSM = allowed high-level states and transitions
Signal = event that starts the flow
Pipeline = ordered work caused by the event
Systems = small operations inside the work
Components = data changed by those operations
```

This guide does not implement the FSM version because the core goal is to demonstrate the smallest renderer-agnostic ECS runtime. The important point is that the combat pipeline is already compatible with FSM-driven execution because `useECSBackend` wires the ECS execution registry into `FSMService` as well as `SignalService`.

---

## What this example proves

This demo proves that `empr.es` can run meaningful game logic without rendering.

The framework does not need a canvas to:

- bootstrap runtime services,
- create entities,
- attach components,
- store entities,
- query entities by components,
- execute systems,
- compose pipelines,
- inject services,
- dispatch typed signals,
- and run ordered gameplay logic.

Rendering can be added later as an integration layer. The combat mechanic does not care whether the result is printed to console, displayed in PixiJS, simulated on a server, tested in Vitest, or inspected in a debug tool.

That is the practical meaning of renderer-agnostic architecture.

---

## Common mistakes

### Calling `useECSBackend` before `empr.init()`

`useECSBackend(empr)` expects core services such as `EntityStorage`, `SignalService`, `FSMService`, and `UpdateLoop` to already be registered in DI.

Correct order:

```typescript
const empr = new Empr();
empr.init();
useECSBackend(empr);
```

### Creating entities but not adding them to EntityStorage

An entity that exists only as a local variable is not part of the ECS world.

Systems that use `filter(...)` or `storage.getEntity(...)` can only work with entities registered in `EntityStorage`.

```typescript
const entity = new Entity(nextId(), 'Enemy');
entity.addComponent(new HealthComponent(10, 10));

storage.addEntity(entity);
```

### Putting behavior inside Components

Components should remain data holders.

Avoid this:

```typescript
class HealthComponent {
    public current = 100;

    public takeDamage(value: number): void {
        this.current -= value;
    }
}
```

Prefer this:

```typescript
class HealthComponent {
    constructor(public current: number, public max: number) {}
}
```

Then mutate it from a system.

### Hiding feature order in callbacks

If damage, death checks, rewards, and logging are scattered through callbacks, the feature flow becomes difficult to debug.

Prefer an explicit pipeline:

```typescript
pipeline
    .use(selectTargetSystem)
    .use(damageSystem)
    .use(deathCheckSystem)
    .use(rewardSystem)
    .use(logCombatResultSystem);
```

### Mixing renderer concerns into core logic

This guide intentionally avoids sprites, containers, DOM elements, and canvas APIs.

A combat system should not need a PixiJS sprite to calculate damage. Rendering can observe component changes or react to signals later, but it should not be required for the mechanic to exist.

---

## Design boundaries

This demo is intentionally small.

It does not implement:

- renderer synchronization,
- UI buttons,
- animation,
- network requests,
- save data,
- inventory,
- turn order,
- combat AI,
- or a full FSM encounter.

Those features can be added as separate systems, pipelines, services, or renderer integrations.

The important design decision is that the core combat mechanic already has a clean runtime shape before any visual layer is introduced.

---

## Related articles

- [1.1. What is empr.es?](/)
- [1.2. ECS in empr.es](/architecture/core-concepts/ecs-in-empr-es)
- [1.3. Entity and Component Model](/architecture/core-concepts/entity-and-component-model)
- [1.4. EntityStorage and Component Filtering](/architecture/core-concepts/entity-storage-and-component-filtering)
- [2.1. Systems](/architecture/execution/systems)
- [2.2. Pipelines](/architecture/execution/pipelines)
- [2.3. Pipeline Composition](/architecture/execution/pipeline-composition)
- [3.2. Signal and SignalService](/architecture/flow-control/signal-and-signalservice)
- [3.7. FSM + Pipeline + Signal Architecture](/architecture/flow-control/fsm-pipeline-signal-architecture)
- [4.1. DI Container](/architecture/runtime-services/di-container)
- [4.2. DI inside Systems and Pipelines](/architecture/runtime-services/di-inside-systems-and-pipelines)

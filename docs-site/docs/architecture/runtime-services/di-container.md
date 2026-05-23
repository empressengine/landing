# DI Container

## What is the DI Container?

In `empr.es`, the **DI Container** is the runtime service registry used to provide shared infrastructure to Systems, Pipelines, FSM flows, Signals, renderer integrations, and application-level code.

DI stands for **Dependency Injection**.

Instead of hardcoding global singletons inside gameplay logic, `empr.es` registers services in a central container and lets runtime code resolve them by token.

Conceptually, the DI Container answers a simple question:

```txt
When this runtime code asks for a service,
which implementation should it receive?
```

For example, a System should not manually import and construct a `ScoreService`, `AudioService`, `PRNG`, `EntityStorage`, or renderer-specific service.

Instead, the service is registered once, and the System receives it through `inject()`:

```typescript
import type { System, SystemProps } from '@empr/es-sistema';

const updateScoreSystem: System<{ points: number }> = ({
    inject,
    points,
}: SystemProps<{ points: number }>) => {
    const scoreService = inject(ScoreService);

    scoreService.add(points);
};
```

This keeps Systems small, reusable, and independent from concrete service ownership.

---

# Why DI Exists in empr.es

Game projects often start with direct imports and global objects:

```typescript
import { audioService } from '../services/audio-service';
import { analytics } from '../services/analytics';

export function playWin() {
    audioService.play('win');
    analytics.track('win_presented');
}
```

This approach feels simple at first.

The problem appears as the project grows.

Runtime logic becomes tightly coupled to:

- concrete service implementations,
- browser-only APIs,
- renderer-specific objects,
- global singleton instances,
- and hidden initialization order.

This makes code harder to test, replace, reuse, or run in different environments.

`empr.es` uses DI to keep runtime behavior explicit and replaceable.

Instead of asking a System to know where a service comes from, the application registers the service once:

```typescript
empr.dependency.registerGlobal({
    provide: ScoreService,
    useClass: ScoreService,
});
```

Then any runtime execution context can resolve it:

```typescript
const scoreService = inject(ScoreService);
```

The System depends on a contract, not on service construction.

---

# Where DI Lives in the Architecture

The DI Container belongs to the core runtime package:

```txt
@empr/es
    ↓
core/dependency
```

It is not part of the renderer layer.

It is not part of `@empr/es-sistema`.

It is part of the base framework kernel because many runtime services depend on it:

```txt
Empr
  ↓
Dependency
  ↓
EntityStorage
UpdateLoop
SignalService
FSMService
LifecycleTracker
Pools
PRNG
Renderer services
Application services
```

The base `Empr` bootstrap creates and registers core services into the global DI container during `empr.init()`.

```typescript
import { Empr, EntityStorage, UpdateLoop, PRNG } from '@empr/es';

const empr = new Empr();

empr.init();

const storage = empr.dependency.inject(EntityStorage);
const updateLoop = empr.dependency.inject(UpdateLoop);
const prng = empr.dependency.inject(PRNG);
```

This is why most applications should call `empr.init()` before resolving framework services.

---

# Dependency

The main container class is `Dependency`.

It is available as a singleton through `Dependency.instance`, and every `Empr` instance exposes it through `empr.dependency`.

```typescript
import { Dependency } from '@empr/es';

const dependency = Dependency.instance;
```

In normal application code, prefer using the `Empr` instance:

```typescript
const empr = new Empr();
empr.init();

const dependency = empr.dependency;
```

This makes the bootstrap relationship clearer and avoids hiding runtime initialization behind unrelated imports.

---

# What Can Be Registered

The DI Container registers providers.

A provider tells the container how to resolve a token.

`empr.es` supports two provider styles:

```txt
Class provider
Factory provider
```

A token can be:

- a class constructor,
- or an `InjectionToken<T>`.

---

# Class Providers

A class provider maps a token to a class constructor or an existing object instance.

```typescript
class AudioService {
    play(key: string): void {
        console.log(`Play sound: ${key}`);
    }
}

empr.dependency.registerGlobal({
    provide: AudioService,
    useClass: AudioService,
});
```

Later:

```typescript
const audioService = empr.dependency.inject(AudioService);

audioService.play('button-click');
```

When `useClass` receives a constructor, the container creates the instance lazily on first injection.

```typescript
const first = empr.dependency.inject(AudioService);
const second = empr.dependency.inject(AudioService);

console.log(first === second); // true
```

The resolved instance is cached and reused for the same dependency scope.

---

# Existing Instance Providers

`useClass` may also provide an already-created instance.

This is useful when the service requires custom construction before registration.

```typescript
const audioService = new AudioService({
    volume: 0.8,
    muted: false,
});

empr.dependency.registerGlobal({
    provide: AudioService,
    useClass: audioService,
});
```

Then Systems still resolve it the same way:

```typescript
const playSoundSystem: System<{ sound: string }> = ({
    inject,
    sound,
}: SystemProps<{ sound: string }>) => {
    const audio = inject(AudioService);

    audio.play(sound);
};
```

The System does not care whether the service came from a constructor, factory, or prebuilt instance.

---

# Factory Providers

A factory provider uses a function to create the dependency.

```typescript
class GameConfigService {
    constructor(
        public readonly apiUrl: string,
        public readonly locale: string,
    ) {}
}

empr.dependency.registerGlobal({
    provide: GameConfigService,
    useFactory: () =>
        new GameConfigService(
            'https://api.example.com',
            'en',
        ),
});
```

Factory providers are useful when a service needs:

- runtime configuration,
- existing objects,
- platform-specific setup,
- renderer instances,
- or manually controlled construction.

For example, a renderer integration may create an external object first and then expose it through DI:

```typescript
import { Empr } from '@empr/es';
import { Application } from 'pixi.js';

class EmprPixi extends Empr {
    protected registerServices(): void {
        super.registerServices();

        const app = new Application();

        this.dependency.registerGlobal({
            provide: Application,
            useFactory: () => app,
        });
    }
}
```

The rest of the application can now resolve the Pixi application without importing a global singleton:

```typescript
const pixiApp = empr.dependency.inject(Application);
```

---

# InjectionToken

Classes work well as tokens when the dependency is represented by a runtime class.

But TypeScript interfaces do not exist at runtime.

This means an interface cannot be used as a DI key:

```typescript
interface ILogger {
    log(message: string): void;
}

// Not possible as a runtime token:
// empr.dependency.inject(ILogger)
```

For interface-like dependencies, primitive values, configuration objects, and external contracts, `empr.es` provides `InjectionToken<T>`.

```typescript
import { InjectionToken } from '@empr/es';

interface ILogger {
    log(message: string): void;
}

const LOGGER = new InjectionToken<ILogger>('LOGGER');
```

Now the token can be registered:

```typescript
class ConsoleLogger implements ILogger {
    log(message: string): void {
        console.log(message);
    }
}

empr.dependency.registerGlobal({
    provide: LOGGER,
    useClass: ConsoleLogger,
});
```

And injected with proper TypeScript inference:

```typescript
const logger = empr.dependency.inject(LOGGER);

logger.log('Runtime started');
```

The generic type belongs to the token, so the result type is inferred without manual casting.

---

# InjectionToken for Configuration

`InjectionToken<T>` is especially useful for plain values and configuration objects.

```typescript
import { InjectionToken } from '@empr/es';

type RuntimeConfig = {
    apiUrl: string;
    assetsUrl: string;
    locale: string;
};

const RUNTIME_CONFIG = new InjectionToken<RuntimeConfig>('RUNTIME_CONFIG');

empr.dependency.registerGlobal({
    provide: RUNTIME_CONFIG,
    useFactory: () => ({
        apiUrl: 'https://api.example.com',
        assetsUrl: '/assets',
        locale: 'en',
    }),
});
```

A System can resolve the config without importing a global object:

```typescript
const loadAssetsSystem: System = ({ inject }: SystemProps) => {
    const config = inject(RUNTIME_CONFIG);

    console.log(config.assetsUrl);
};
```

This pattern is useful for values that should be replaceable in tests, previews, server runs, or different game builds.

---

# Global Providers

Global providers are registered in the root scope.

```typescript
empr.dependency.registerGlobal({
    provide: BalanceService,
    useClass: BalanceService,
});
```

A global provider is available from the default injection context:

```typescript
const balanceService = empr.dependency.inject(BalanceService);
```

And from Systems:

```typescript
const showBalanceSystem: System = ({ inject }: SystemProps) => {
    const balanceService = inject(BalanceService);

    balanceService.refresh();
};
```

Global providers are the right choice for shared runtime services such as:

```txt
EntityStorage
UpdateLoop
SignalService
FSMService
LifecycleTracker
Pools
PRNG
AudioService
AnalyticsService
LocalizationService
ConfigService
```

The important rule is simple:

```txt
Register globally when the dependency is shared by the application runtime.
```

---

# Module-Scoped Providers

The container also supports module-scoped registration.

```typescript
empr.dependency.register('bonus-round', {
    provide: MultiplierService,
    useClass: BonusMultiplierService,
});
```

Then the same token can resolve differently for that module:

```typescript
const multiplier = empr.dependency.inject(
    MultiplierService,
    'bonus-round',
);
```

If a module-specific provider exists, it is used first.

If it does not exist, the container falls back to the global provider.

This allows a specific runtime module, feature, test, or execution context to override a dependency without replacing it for the entire application.

---

# Global Fallback

Module scopes are useful because they can override only the dependencies they care about.

For example:

```typescript
class DefaultBetService {
    getMinBet(): number {
        return 1;
    }
}

class FreeSpinsBetService {
    getMinBet(): number {
        return 0;
    }
}

empr.dependency.registerGlobal({
    provide: DefaultBetService,
    useClass: DefaultBetService,
});

empr.dependency.register('free-spins', {
    provide: DefaultBetService,
    useClass: FreeSpinsBetService,
});
```

Now default runtime code receives the global implementation:

```typescript
const betService = empr.dependency.inject(DefaultBetService);

console.log(betService.getMinBet()); // 1
```

But the `free-spins` module can receive the override:

```typescript
const betService = empr.dependency.inject(
    DefaultBetService,
    'free-spins',
);

console.log(betService.getMinBet()); // 0
```

This is useful for runtime variations without large conditional branches inside Systems.

---

# DI Inside Systems

Systems receive an `inject()` function through `SystemProps`.

```typescript
import type { System, SystemProps } from '@empr/es-sistema';

const playClickSoundSystem: System = ({ inject }: SystemProps) => {
    const audio = inject(AudioService);

    audio.play('click');
};
```

This is the most common way to use DI in ECS execution.

The System does not import a concrete singleton.

It only asks the current execution context for a dependency.

That means the same System can be reused in different flows:

```typescript
const openModalPipeline: PipelineFactory<void> = ({ pipeline }) => {
    pipeline
        .use(playClickSoundSystem)
        .use(openModalSystem);
};

const closeModalPipeline: PipelineFactory<void> = ({ pipeline }) => {
    pipeline
        .use(playClickSoundSystem)
        .use(closeModalSystem);
};
```

The dependency is resolved when the System executes, not when the file is imported.

---

# DI Inside Pipeline Factories

`PipelineFactory` also receives an `inject()` helper.

This is useful when the Pipeline itself needs a service to decide how to compose execution.

```typescript
import type { PipelineFactory } from '@empr/es-sistema';

const presentWinPipeline: PipelineFactory<void> = ({
    pipeline,
    inject,
}) => {
    const settings = inject(GameSettingsService);

    pipeline.use(lockInputSystem);

    if (settings.skipWinPresentation) {
        pipeline.use(applyWinInstantlySystem);
    } else {
        pipeline
            .use(highlightWinLinesSystem)
            .use(playWinAnimationsSystem)
            .use(countUpWinSystem);
    }

    pipeline.use(unlockInputSystem);
};
```

This should be used carefully.

A Pipeline may use DI to compose runtime flow, but persistent gameplay state should still live in Components, Stores, FSM context, or dedicated services.

---

# DI and Pipeline Context

`PipelineComposer` can register dependencies for a specific execution composition.

Conceptually:

```typescript
const spinPipeline: PipelineFactory<void> = ({ pipeline }) => {
    pipeline.dependency({
        provide: SpinModeService,
        useClass: TurboSpinModeService,
    });

    pipeline
        .use(prepareSpinSystem)
        .use(startReelsSystem)
        .use(stopReelsSystem);
};
```

The goal of this API is to allow Pipeline-local overrides.

This is useful when a flow needs a specialized service implementation without changing the global runtime registration.

For example:

```typescript
class NormalReelTimingService {
    getStopDelay(index: number): number {
        return 300 * index;
    }
}

class TurboReelTimingService {
    getStopDelay(index: number): number {
        return 80 * index;
    }
}

const turboSpinPipeline: PipelineFactory<void> = ({ pipeline }) => {
    pipeline.dependency({
        provide: NormalReelTimingService,
        useClass: TurboReelTimingService,
    });

    pipeline.use(stopReelsSystem);
};
```

Then the System remains generic:

```typescript
const stopReelsSystem: System = ({ inject, filter }: SystemProps) => {
    const timing = inject(NormalReelTimingService);

    const reels = filter({
        includes: [ReelComponent],
    });

    reels.forEach((reel, index) => {
        const delay = timing.getStopDelay(index);

        // stop logic...
    });
};
```

Architecturally, this avoids pushing mode-specific branches into the System itself.

---

# DI and Empr Bootstrap

The base `Empr` class registers core framework services during initialization.

```typescript
const empr = new Empr();

empr.init();
```

After `init()`, the DI container contains the renderer-agnostic runtime infrastructure:

```txt
EntityStorage
UpdateLoop
Pools
PRNG
SignalService
LifecycleTracker
FSMService
ProxyEntity
```

This allows application code and execution stacks to resolve the same shared services.

For example, `@empr/es-sistema` wires the default ECS execution backend by resolving core services from DI and registering the `Executor`.

```typescript
import { Empr } from '@empr/es';
import { Executor, useECSBackend } from '@empr/es-sistema';

const empr = new Empr();

empr.init();
useECSBackend(empr);

const executor = empr.dependency.inject(Executor);
```

After this, FSM, Signals, Pipelines, and Systems can share the same execution registry and runtime services.

---

# Extending Empr With Application Services

Applications and renderer integrations usually extend `Empr` and register additional services.

```typescript
import { Empr } from '@empr/es';

class GameEmpr extends Empr {
    protected registerServices(): void {
        super.registerServices();

        this.dependency.registerGlobal({
            provide: AudioService,
            useClass: AudioService,
        });

        this.dependency.registerGlobal({
            provide: AnalyticsService,
            useClass: AnalyticsService,
        });

        this.dependency.registerGlobal({
            provide: RUNTIME_CONFIG,
            useFactory: () => ({
                apiUrl: 'https://api.example.com',
                assetsUrl: '/assets',
                locale: 'en',
            }),
        });
    }
}

const empr = new GameEmpr();

empr.init();
```

The important rule is:

```txt
Always call super.registerServices()
when extending Empr.
```

Without it, the framework services will not be registered.

---

# DI and Renderer Integrations

The DI Container is also the bridge between renderer-specific services and renderer-agnostic runtime code.

For example, a Pixi-based runtime may register renderer services globally:

```typescript
class EmprPixi extends Empr {
    protected registerServices(): void {
        super.registerServices();

        const pixiApp = new Application();

        this.dependency.registerGlobal({
            provide: Application,
            useFactory: () => pixiApp,
        });

        this.dependency.registerGlobal({
            provide: TextureService,
            useClass: TextureService,
        });

        this.dependency.registerGlobal({
            provide: SceneService,
            useClass: SceneService,
        });
    }
}
```

A rendering sync System can then resolve renderer infrastructure through DI:

```typescript
const syncPositionToViewSystem: System = ({
    inject,
    filter,
}: SystemProps) => {
    const scene = inject(SceneService);

    const entities = filter({
        includes: [PositionComponent, ViewRefComponent],
    });

    entities.forEach((entity) => {
        const position = entity.getComponent(PositionComponent);
        const viewRef = entity.getComponent(ViewRefComponent);

        const view = scene.getView(viewRef.id);

        view.x = position.x;
        view.y = position.y;
    });
};
```

This preserves the architecture boundary:

```txt
Core ECS data remains renderer-agnostic.
Renderer services are injected at the application layer.
Systems use contracts instead of global renderer objects.
```

---

# DI and Testing

DI makes Systems easier to test because dependencies can be replaced.

For example, imagine a System that tracks analytics:

```typescript
const trackSpinStartedSystem: System = ({ inject }: SystemProps) => {
    const analytics = inject(AnalyticsService);

    analytics.track('spin_started');
};
```

A test can register a fake implementation:

```typescript
class FakeAnalyticsService {
    public events: string[] = [];

    track(event: string): void {
        this.events.push(event);
    }
}

const dependency = new Dependency();

dependency.registerGlobal({
    provide: AnalyticsService,
    useClass: FakeAnalyticsService,
});
```

Now the System can be executed with a controlled dependency context.

```typescript
const analytics = dependency.inject(AnalyticsService);

console.log(analytics.events); // []
```

The System does not need to know that the implementation is fake.

---

# DI and Isomorphic Runtime

The core package is designed to stay renderer-agnostic and environment-agnostic.

DI helps preserve this design.

For example, a browser build may register a browser storage service:

```typescript
class BrowserSaveService {
    save(key: string, value: string): void {
        localStorage.setItem(key, value);
    }
}

empr.dependency.registerGlobal({
    provide: SaveService,
    useClass: BrowserSaveService,
});
```

A server or test runtime may register a memory implementation instead:

```typescript
class MemorySaveService {
    private values = new Map<string, string>();

    save(key: string, value: string): void {
        this.values.set(key, value);
    }
}

empr.dependency.registerGlobal({
    provide: SaveService,
    useClass: MemorySaveService,
});
```

Gameplay Systems do not need browser-specific conditionals:

```typescript
const saveProgressSystem: System = ({ inject }: SystemProps) => {
    const saveService = inject(SaveService);

    saveService.save('progress', 'level-3');
};
```

The environment chooses the implementation.

The System stays portable.

---

# Lazy Instantiation

Dependencies are created only when they are injected for the first time.

Registration does not immediately instantiate the service.

```typescript
class ExpensiveService {
    constructor() {
        console.log('created');
    }
}

empr.dependency.registerGlobal({
    provide: ExpensiveService,
    useClass: ExpensiveService,
});

// Nothing is created yet.

const service = empr.dependency.inject(ExpensiveService);

// Created now.
```

This matters for game runtimes because not every feature is used immediately.

A service needed only for a bonus game, debug panel, replay tool, or optional integration does not need to allocate resources during initial bootstrap.

---

# Cached Instances

After a dependency is resolved, the instance is cached.

```typescript
const first = empr.dependency.inject(PRNG);
const second = empr.dependency.inject(PRNG);

console.log(first === second); // true
```

This gives the framework simple singleton-like service behavior without relying on hidden global objects.

The container owns service lifetime at the runtime level.

Systems only request what they need.

---

# Error on Missing Provider

If no provider exists for a token, `inject()` throws an error.

```typescript
const service = empr.dependency.inject(UnknownService);
```

Conceptually:

```txt
Provider for token UnknownService not found
```

This is intentional.

Missing dependencies should fail loudly during development instead of silently returning `undefined` and causing delayed runtime errors.

You can check registration with `hasProvider()`:

```typescript
if (empr.dependency.hasProvider(DebugPanelService)) {
    const debugPanel = empr.dependency.inject(DebugPanelService);

    debugPanel.open();
}
```

This is useful for optional integrations.

---

# DI Is Not a Replacement for Components

The DI Container is for services.

It should not be used as a replacement for ECS data.

Good candidates for DI:

```txt
AudioService
AnalyticsService
LocalizationService
AssetService
NetworkService
PRNG
Pools
FSMService
SignalService
EntityStorage
Renderer integration services
Configuration objects
```

Bad candidates for DI:

```txt
Player health
Reel position
Symbol state
Current win line
Entity-specific animation state
Temporary gameplay flags
```

Those should usually live in Components, Stores, or FSM context.

For example, this is not ideal:

```typescript
class PlayerStateService {
    health = 100;
    x = 0;
    y = 0;
}
```

In ECS, this data belongs on the Entity:

```typescript
class HealthComponent {
    current = 100;
}

class PositionComponent {
    x = 0;
    y = 0;
}
```

Then Systems query and mutate the Components:

```typescript
const damageSystem: System<{ damage: number }> = ({
    filter,
    damage,
}: SystemProps<{ damage: number }>) => {
    const entities = filter({
        includes: [HealthComponent],
    });

    entities.forEach((entity) => {
        const health = entity.getComponent(HealthComponent);

        health.current -= damage;
    });
};
```

DI should provide infrastructure.

Components should store entity state.

---

# DI Is Not a Hidden Execution System

A service resolved from DI should not secretly replace Pipelines, FSM, or Signals.

For example, avoid creating one large `GameFlowService` that internally controls the entire runtime:

```typescript
class GameFlowService {
    async startSpin(): Promise<void> {
        // lock input
        // start reels
        // wait for server
        // stop reels
        // present wins
        // unlock input
    }
}
```

This hides execution order inside a service.

In `empr.es`, high-level flow should remain visible:

```txt
Signal
  ↓
FSM transition
  ↓
Pipeline
  ↓
Systems
  ↓
Components
```

A service may provide infrastructure, but orchestration should usually remain in FSM and Pipelines.

---

# Example: Slot Game Services

A typical slot game may register services like this:

```typescript
const SLOT_CONFIG = new InjectionToken<SlotConfig>('SLOT_CONFIG');

class SlotGame extends Empr {
    protected registerServices(): void {
        super.registerServices();

        this.dependency.registerGlobal({
            provide: SLOT_CONFIG,
            useFactory: () => ({
                reels: 5,
                rows: 3,
                defaultBet: 100,
                turbo: false,
            }),
        });

        this.dependency.registerGlobal({
            provide: AudioService,
            useClass: AudioService,
        });

        this.dependency.registerGlobal({
            provide: WalletService,
            useClass: WalletService,
        });

        this.dependency.registerGlobal({
            provide: SlotApiService,
            useFactory: () =>
                new SlotApiService('https://api.example.com'),
        });
    }
}
```

A spin preparation System can resolve only what it needs:

```typescript
const prepareSpinSystem: System = ({ inject, filter }: SystemProps) => {
    const config = inject(SLOT_CONFIG);
    const wallet = inject(WalletService);

    wallet.reserve(config.defaultBet);

    const reels = filter({
        includes: [ReelComponent],
    });

    reels.forEach((reel) => {
        reel.addComponent(new ReelLockedTag());
    });
};
```

A sound System can remain reusable:

```typescript
const playSoundSystem: System<{ sound: string }> = ({
    inject,
    sound,
}: SystemProps<{ sound: string }>) => {
    const audio = inject(AudioService);

    audio.play(sound);
};
```

And Pipelines decide where the System appears:

```typescript
const startSpinPipeline: PipelineFactory<void> = ({ pipeline }) => {
    pipeline
        .use(prepareSpinSystem)
        .use(playSoundSystem, { sound: 'spin-start' })
        .use(startReelMotionSystem);
};
```

This keeps service access explicit and runtime flow visible.

---

# Example: Replacing Services for Turbo Mode

DI can help avoid spreading mode checks across many Systems.

Instead of doing this inside every System:

```typescript
if (isTurboMode) {
    delay = 80;
} else {
    delay = 300;
}
```

Use a service contract:

```typescript
interface IReelTimingService {
    getStopDelay(reelIndex: number): number;
}

const REEL_TIMING = new InjectionToken<IReelTimingService>('REEL_TIMING');
```

Register the default implementation:

```typescript
class DefaultReelTimingService implements IReelTimingService {
    getStopDelay(reelIndex: number): number {
        return reelIndex * 300;
    }
}

empr.dependency.registerGlobal({
    provide: REEL_TIMING,
    useClass: DefaultReelTimingService,
});
```

Use it inside a System:

```typescript
const stopReelsSystem: System = ({ inject, filter }: SystemProps) => {
    const timing = inject(REEL_TIMING);

    const reels = filter({
        includes: [ReelComponent],
    });

    reels.forEach((reel, index) => {
        const delay = timing.getStopDelay(index);

        // schedule reel stop...
    });
};
```

Then a turbo flow can override the implementation:

```typescript
class TurboReelTimingService implements IReelTimingService {
    getStopDelay(reelIndex: number): number {
        return reelIndex * 80;
    }
}

empr.dependency.register('turbo-spin', {
    provide: REEL_TIMING,
    useClass: TurboReelTimingService,
});
```

The System remains unchanged.

The runtime context decides the implementation.

---

# Example: Optional Debug Service

Some services should exist only in development builds.

```typescript
class DebugTraceService {
    trace(message: string): void {
        console.log(`[debug] ${message}`);
    }
}

if (import.meta.env.DEV) {
    empr.dependency.registerGlobal({
        provide: DebugTraceService,
        useClass: DebugTraceService,
    });
}
```

A System or app-level utility can safely check for the provider:

```typescript
const debugTraceSystem: System<{ message: string }> = ({
    inject,
    message,
}: SystemProps<{ message: string }>) => {
    // Only safe if the provider is guaranteed to exist.
    const debug = inject(DebugTraceService);

    debug.trace(message);
};
```

For optional usage outside Systems:

```typescript
if (empr.dependency.hasProvider(DebugTraceService)) {
    empr.dependency
        .inject(DebugTraceService)
        .trace('Spin pipeline created');
}
```

This keeps production runtime clean while still supporting debug tooling.

---

# Common Mistakes

## Injecting Entity State

Do not store per-entity gameplay data in DI services.

Use Components instead.

DI is for shared infrastructure, not entity state.

---

## Creating Hidden Global Flow Services

Avoid services that secretly orchestrate large runtime flows.

FSM and Pipelines should describe flow explicitly.

Services should support execution, not hide it.

---

## Forgetting `empr.init()`

Core services are registered during `empr.init()`.

This is usually wrong:

```typescript
const empr = new Empr();

const storage = empr.dependency.inject(EntityStorage);
```

This is correct:

```typescript
const empr = new Empr();

empr.init();

const storage = empr.dependency.inject(EntityStorage);
```

---

## Forgetting `super.registerServices()`

When extending `Empr`, always call the base registration.

```typescript
class GameEmpr extends Empr {
    protected registerServices(): void {
        super.registerServices();

        this.dependency.registerGlobal({
            provide: AudioService,
            useClass: AudioService,
        });
    }
}
```

Without `super.registerServices()`, core services such as `EntityStorage`, `UpdateLoop`, `FSMService`, and `SignalService` will not be registered.

---

## Overusing InjectionToken for Classes

If a concrete class is a good token, use the class directly.

```typescript
empr.dependency.registerGlobal({
    provide: AudioService,
    useClass: AudioService,
});
```

Use `InjectionToken<T>` when:

- the dependency is an interface,
- the dependency is a primitive value,
- the dependency is a plain object config,
- or you want to decouple the token from the concrete class.

---

## Assuming Constructor Injection

The current DI model does not use decorators or automatic constructor injection.

This is not how services are wired:

```typescript
class SomeService {
    constructor(private audio: AudioService) {}
}
```

Unless you manually create it through a factory:

```typescript
empr.dependency.registerGlobal({
    provide: SomeService,
    useFactory: () =>
        new SomeService(
            empr.dependency.inject(AudioService),
        ),
});
```

This explicit style keeps the core lightweight and avoids reflection metadata.

---

# Limitations and Design Decisions

The DI Container in `empr.es` is intentionally small.

It does not try to become a full enterprise IoC framework.

It does not require:

- decorators,
- reflection,
- metadata emit,
- external DI libraries,
- or automatic constructor analysis.

This is a deliberate runtime design decision.

Games often need predictable startup, low overhead, explicit service wiring, and easy portability across browser, server, tests, and renderer integrations.

The container provides enough structure for runtime services while staying simple enough to inspect and reason about.

---

# Mental Model

A useful way to think about DI in `empr.es` is:

```txt
Components store entity data.
Systems perform focused behavior.
Pipelines define execution order.
FSM defines allowed high-level flow.
Signals trigger runtime reactions.
DI provides shared services.
```

DI is not the center of the architecture.

It is the service layer that supports the architecture.

When used correctly, it keeps Systems and Pipelines clean:

```txt
System asks for a service
        ↓
DI resolves implementation
        ↓
System performs focused work
        ↓
State changes remain in Components / Stores / FSM context
```

This keeps runtime code modular, testable, and easier to evolve over long-running game projects.

---

# Related Articles

- `2.1. Systems`
- `2.2. Pipelines`
- `3.1. Execution Initiators`
- `3.7. FSM + Pipeline + Signal Architecture`
- `4.2. EntityStorage`
- `4.3. SignalService`
- `4.4. FSMService`

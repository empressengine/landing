# Reactive Store

## What This Article Covers

This article explains the built-in reactive `Store` provided by `@empr/es`.

`Store` is a typed state container for application or game state that does not naturally belong to Entities and Components.

It is useful for state such as:

- game balance,
- global score,
- user session state,
- settings,
- debug UI state,
- loading state,
- selected language,
- feature flags,
- and application-level configuration.

The goal of this article is to explain when `Store` should be used, how it works, and how it fits into the broader `empr.es` runtime architecture.

---

# Why Store Exists

ECS is excellent for entity-based runtime state.

For example:

```txt
Player position
Enemy health
Reel symbol index
Projectile velocity
Animation state
```

This kind of data belongs naturally to Components because it describes runtime objects.

But not all game state belongs to an Entity.

For example:

```txt
Current balance
Global score
User session
Selected language
Debug panel visibility
Sound settings
Current bet
Server connection status
```

This state is not always attached to one specific Entity.

Trying to force all global application state into Components often creates unnatural architecture.

`Store` exists for this reason.

It provides a typed reactive container for state that belongs to the application or game session rather than to a specific entity.

---

# Store as Application State

Conceptually, `Store` answers a different question than ECS Components.

Components answer:

```txt
What data does this Entity have?
```

Store answers:

```txt
What global or shared state does this runtime context have?
```

For example:

```typescript
interface GameState {
    balance: number;
    bet: number;
    totalWin: number;
    isSpinning: boolean;
}
```

This state describes the current game session.

It is not necessarily owned by one Entity.

---

# Creating a Store

A Store is created with a typed initial state object.

```typescript
import { Store } from '@empr/es';

interface GameState {
    balance: number;
    bet: number;
    totalWin: number;
    isSpinning: boolean;
}

const gameStore = new Store<GameState>({
    balance: 1000,
    bet: 10,
    totalWin: 0,
    isSpinning: false,
});
```

The generic type gives TypeScript full knowledge of the state shape.

For example:

```typescript
gameStore.state.balance;
gameStore.state.totalWin;
```

are typed correctly.

---

# Typed State Object

The Store state is strongly typed.

Example:

```typescript
gameStore.update((state) => ({
    balance: state.balance - state.bet,
}));
```

TypeScript understands that:

```txt
balance is number
bet is number
```

and prevents invalid property usage.

This is important in larger game projects where global state can become difficult to track.

---

# Reading State

You can read state through:

```typescript
gameStore.state
```

Example:

```typescript
const balance = gameStore.state.balance;
const bet = gameStore.state.bet;
```

Conceptually:

```txt
Store owns state
        ↓
state exposes readable view
```

The state should be treated as read-only from the outside.

Updates should go through Store methods.

---

# Safe Updates

State changes should be performed through:

```typescript
store.update(...)
```

Example:

```typescript
gameStore.update((state) => ({
    balance: state.balance - state.bet,
    isSpinning: true,
}));
```

The update callback receives the current state and returns a partial update.

Conceptually:

```txt
current state
        ↓
update callback
        ↓
partial state patch
        ↓
validation
        ↓
middleware
        ↓
new state
        ↓
subscribers notified
```

This keeps state changes centralized and observable.

---

# Why Direct Mutation Is Avoided

Direct mutation makes state changes invisible.

For example, this is not the intended usage:

```typescript
gameStore.state.balance = 500;
```

Instead:

```typescript
gameStore.update(() => ({
    balance: 500,
}));
```

This matters because subscriptions, computed values, middleware and validators depend on controlled updates.

---

# Subscriptions

Stores are reactive.

You can subscribe to changes:

```typescript
const unsubscribe = gameStore.subscribe(
    (state, prev) => {
        console.log('Balance:', state.balance);
        console.log('Previous:', prev.balance);
    },
);
```

The listener receives:

```txt
current state
previous state
```

When the subscription is no longer needed:

```typescript
unsubscribe();
```

This allows UI, debug tools, services or integration layers to react to state changes.

---

# Batched Notifications

Store notifications are scheduled through a microtask queue.

Conceptually:

```txt
Update state
        ↓
schedule notification
        ↓
notify subscribers in microtask
```

This avoids excessive synchronous notification chains during complex runtime flows.

It also makes Store updates safer when multiple changes happen during the same execution phase.

---

# Example: Global Score Store

A score store may look like this:

```typescript
interface ScoreState {
    score: number;
    totalWin: number;
}

const scoreStore = new Store<ScoreState>({
    score: 0,
    totalWin: 0,
});

scoreStore.subscribe((state) => {
    updateScoreLabel(state.score);
});

scoreStore.update((state) => ({
    score: state.score + 100,
    totalWin: state.totalWin + 100,
}));
```

This is a good Store use case because score is often global session state.

It may be displayed in UI, used by game logic, synchronized with server data and inspected by debug tools.

---

# Example: User Session State

User session state also fits Store well.

```typescript
interface SessionState {
    userId: string | null;
    token: string | null;
    isAuthorized: boolean;
}

const sessionStore = new Store<SessionState>({
    userId: null,
    token: null,
    isAuthorized: false,
});
```

Updating after login:

```typescript
sessionStore.update(() => ({
    userId: 'user-42',
    token: 'session-token',
    isAuthorized: true,
}));
```

This state does not belong to any gameplay Entity.

It belongs to the application session.

---

# Example: Settings Store

Settings are another natural Store use case.

```typescript
interface SettingsState {
    soundEnabled: boolean;
    musicVolume: number;
    language: string;
}

const settingsStore = new Store<SettingsState>({
    soundEnabled: true,
    musicVolume: 0.8,
    language: 'en',
});
```

Usage:

```typescript
settingsStore.update(() => ({
    musicVolume: 0.5,
}));
```

A UI layer may subscribe to the settings store.

An audio service may read from it.

A persistence service may save it.

This avoids spreading settings state across unrelated runtime objects.

---

# Example: Debug UI State

Debug UI state should usually not live inside gameplay Components.

Example:

```typescript
interface DebugState {
    isPanelOpen: boolean;
    selectedEntityId: string | null;
    showSystemTimings: boolean;
}

const debugStore = new Store<DebugState>({
    isPanelOpen: false,
    selectedEntityId: null,
    showSystemTimings: false,
});
```

This state belongs to developer tooling, not gameplay entities.

Keeping it in Store avoids contaminating ECS data with UI-specific state.

---

# Computed Values

Stores can create computed values.

A computed value derives data from Store state.

Example:

```typescript
const totalBet = gameStore.createComputed(
    (state) => state.bet * 20,
);
```

Access:

```typescript
console.log(totalBet.value);
```

When Store state changes, the computed value is invalidated and recalculated when accessed again.

When no longer needed:

```typescript
totalBet.dispose();
```

---

# Example: Computed Win Label

```typescript
interface GameState {
    totalWin: number;
    currency: string;
}

const gameStore = new Store<GameState>({
    totalWin: 250,
    currency: 'EUR',
});

const winLabel = gameStore.createComputed(
    (state) => `${state.totalWin} ${state.currency}`,
);

console.log(winLabel.value); // "250 EUR"
```

Computed values are useful when the same derived state is needed in multiple places.

---

# Computed Values Across Multiple Stores

The lower-level `computed(...)` helper can also derive data from multiple stores.

Example:

```typescript
import { computed } from '@empr/es';

const balanceStore = new Store({
    balance: 1000,
});

const settingsStore = new Store({
    currency: 'EUR',
});

const formattedBalance = computed(
    [balanceStore, settingsStore],
    ([balance, settings]) => {
        return `${balance.balance} ${settings.currency}`;
    },
);
```

This keeps derived values reactive without manually wiring subscriptions.

---

# Async Computed Values

`Store` also supports asynchronous computed values.

This is useful when derived state depends on async work such as:

- loading remote data,
- requesting player profile,
- fetching game configuration,
- or recalculating data through an async service.

Example:

```typescript
interface SessionState {
    userId: string | null;
}

const sessionStore = new Store<SessionState>({
    userId: 'user-42',
});

const profile = sessionStore.createAsyncComputed(
    async (state, { signal }) => {
        if (!state.userId) {
            return null;
        }

        const response = await fetch(
            `/api/users/${state.userId}`,
            { signal },
        );

        return response.json();
    },
    {
        retryCount: 3,
        timeout: 5000,
    },
);
```

Access:

```typescript
if (profile.isLoading) {
    showLoading();
}

if (profile.hasData) {
    renderProfile(profile.data);
}

if (profile.hasError) {
    showError(profile.error);
}
```

When no longer needed:

```typescript
profile.dispose();
```

---

# Why Async Computed Uses AbortSignal

Async computed values receive:

```typescript
{ signal: AbortSignal }
```

This allows in-progress async work to be cancelled when state changes or the computed value is disposed.

Conceptually:

```txt
State changes
        ↓
previous async computation cancelled
        ↓
new async computation starts
```

This prevents outdated async results from being applied after newer state is already available.

---

# Store Validators

Stores may validate updates before they are applied.

Example:

```typescript
const betValidator = (
    update: Partial<GameState>,
) => {
    if (
        update.bet !== undefined &&
        update.bet <= 0
    ) {
        return 'Bet must be greater than zero';
    }

    return true;
};

const gameStore = new Store<GameState>(
    {
        balance: 1000,
        bet: 10,
        totalWin: 0,
        isSpinning: false,
    },
    {
        validators: [betValidator],
    },
);
```

Now invalid updates throw before state changes:

```typescript
gameStore.update(() => ({
    bet: -10,
}));
```

This is useful for protecting important global runtime state.

---

# Store Middleware

Middleware can intercept and transform updates.

Example:

```typescript
const loggerMiddleware = (
    state: GameState,
    update: Partial<GameState>,
    next: (
        state: GameState,
        update: Partial<GameState>,
    ) => GameState,
) => {
    console.log('Previous:', state);
    console.log('Update:', update);

    return next(state, update);
};

const gameStore = new Store<GameState>(
    {
        balance: 1000,
        bet: 10,
        totalWin: 0,
        isSpinning: false,
    },
    {
        middleware: [loggerMiddleware],
    },
);
```

Middleware is useful for:

- debugging,
- telemetry,
- persistence,
- analytics,
- and runtime instrumentation.

---

# Transactions

Store supports transaction-style updates.

Example:

```typescript
gameStore.transaction({
    apply: (state) => ({
        ...state,
        balance: state.balance - state.bet,
        isSpinning: true,
    }),

    rollback: (state) => ({
        ...state,
        balance: state.balance + state.bet,
        isSpinning: false,
    }),
});
```

This is useful when updates need explicit rollback behavior.

For simpler partial updates, use:

```typescript
gameStore.simpleTransaction((state) => ({
    balance: state.balance - state.bet,
}));
```

---

# Selectors

Selectors allow you to derive smaller pieces of state.

Example:

```typescript
const selectBalance = gameStore.createStoreSelector(
    (state) => state.balance,
    (newBalance, oldBalance) => {
        console.log(
            'Balance changed:',
            oldBalance,
            '→',
            newBalance,
        );
    },
);
```

Access:

```typescript
console.log(selectBalance.value);
```

Cleanup:

```typescript
selectBalance.dispose();
```

Selectors are useful when a system or UI widget only cares about a small part of Store state.

---

# StoreMixer

`storeMixer` can combine multiple stores into one synchronized store.

Example:

```typescript
import { storeMixer } from '@empr/es';

const gameStore = new Store({
    balance: 1000,
    bet: 10,
});

const debugStore = new Store({
    isPanelOpen: false,
});

const mixedStore = storeMixer([
    gameStore,
    debugStore,
]);

mixedStore.update((state) => ({
    balance: state.balance - state.bet,
    isPanelOpen: true,
}));
```

Conceptually:

```txt
gameStore
        \
         → mixedStore
        /
debugStore
```

Changes may be propagated through the mixed store while preserving the original store boundaries.

This can be useful for:

- debug panels,
- admin tooling,
- runtime inspectors,
- or screens that need to observe several state domains at once.

---

# Store Through DI

Stores are often registered in DI so Systems and services can resolve them.

Example token:

```typescript
import {
    Dependency,
    InjectionToken,
    Store,
} from '@empr/es';

const GAME_STORE =
    new InjectionToken<Store<GameState>>(
        'GAME_STORE',
    );
```

Registration:

```typescript
const gameStore = new Store<GameState>({
    balance: 1000,
    bet: 10,
    totalWin: 0,
    isSpinning: false,
});

Dependency.instance.registerGlobal({
    provide: GAME_STORE,
    useFactory: () => gameStore,
});
```

Usage inside a System:

```typescript
const spendBetSystem: System = ({
    inject,
}: SystemProps) => {
    const gameStore = inject(GAME_STORE);

    gameStore.update((state) => ({
        balance: state.balance - state.bet,
        isSpinning: true,
    }));
};
```

This keeps Store ownership centralized while allowing runtime execution to consume it.

---

# Store Versus Components

One of the most important architectural questions is:

```txt
Should this state live in Store
or in Components?
```

---

# Use Components for Entity State

Components are best for state attached to runtime objects.

Examples:

```txt
PositionComponent
VelocityComponent
HealthComponent
ReelComponent
SymbolComponent
AnimationStateComponent
```

If the data answers:

```txt
What state does this Entity have?
```

it probably belongs in a Component.

---

# Use Store for Shared Application State

Store is best for state that describes the broader runtime context.

Examples:

```txt
Balance
Current bet
Language
Session token
Debug panel state
Sound settings
Server status
```

If the data answers:

```txt
What state does the application/game session have?
```

it probably belongs in Store.

---

# Practical Rule of Thumb

```txt
Component = state of an Entity

Store = state of the application/session/tooling
```

Example:

| State | Recommended Place |
| --- | --- |
| player position | Component |
| enemy health | Component |
| symbol index | Component |
| current balance | Store |
| selected language | Store |
| debug panel open | Store |
| current bet | Store |
| reel movement speed | Component or config, depending on ownership |
| server session token | Store |

---

# Common Mistakes

## Putting Everything Into Store

Store should not replace ECS.

If every runtime object stores its state in one global Store, the ECS model loses its advantages.

Entity-specific runtime data should usually remain in Components.

---

## Putting Global Session State Into Components

Not every piece of state needs an Entity.

Forcing balance, session token or UI settings into Components often creates awkward ownership.

---

## Directly Mutating Store State

State should be updated through Store methods.

Direct mutation bypasses Store's controlled update flow.

---

## Forgetting to Dispose Computed Values

Computed and async computed values should be disposed when they are no longer needed.

This prevents unnecessary subscriptions from staying alive.

---

# Limitations and Design Decisions

The Store in `@empr/es` is intentionally not a replacement for ECS.

It is a complementary runtime service.

ECS handles:

```txt
Entity-based simulation state
```

Store handles:

```txt
Application-level reactive state
```

Together they provide a cleaner separation between gameplay objects and shared runtime context.

This keeps architecture easier to reason about as projects grow.

---

# Related Articles

- [1.3. Entity and Component Model](/architecture/core-concepts/entity-and-component-model)
- [1.4. EntityStorage and Component Filtering](/architecture/core-concepts/entity-storage-and-component-filtering)
- [4.1. DI Container](/architecture/runtime-services/di-container)
- [4.2. DI inside Systems and Pipelines](/architecture/runtime-services/di-inside-systems-and-pipelines)
- [3.7. FSM + Pipeline + Signal Architecture](/architecture/flow-control/fsm-pipeline-signal-architecture)

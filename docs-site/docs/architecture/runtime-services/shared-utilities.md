# Shared Utilities

## What This Article Covers

This article gives a compact overview of the shared utility layer in `@empr/es`.

This is a reference-style article, not a deep API document.

The utilities covered here are small framework-agnostic helpers used across the runtime:

- `DeferredPromise`
- `PRNG`
- `clamp`
- `debounce`
- `nextId`
- `waitNextFrame`

These utilities live in the shared layer and do not depend on ECS, rendering, FSM, Pipelines or browser-specific game architecture.

---

# Where Shared Utilities Fit Architecturally

The `shared` layer is the lowest layer of `@empr/es`.

Conceptually:

```txt
shared
    ↓
core
    ↓
widgets
    ↓
features
    ↓
bootstrap
```

The shared layer contains small reusable primitives that may be used by:

- browser runtime,
- server runtime,
- tests,
- tools,
- editor integrations,
- ECS services,
- and higher-level framework modules.

Shared utilities should remain:

- framework-agnostic,
- renderer-agnostic,
- domain-agnostic,
- and reusable outside gameplay logic.

They should not know anything about:

- Entities,
- Components,
- Systems,
- Pipelines,
- FSM,
- PixiJS,
- Three.js,
- or application-specific game rules.

---

# DeferredPromise

`DeferredPromise<T>` is a small utility for creating a Promise that can be resolved or rejected from the outside.

Normal JavaScript Promises require `resolve` and `reject` to be used inside the Promise constructor:

```typescript
const promise = new Promise<string>((resolve) => {
    resolve('done');
});
```

This is not always convenient when one part of the runtime needs to wait, while another part of the runtime decides when the operation is complete.

`DeferredPromise<T>` separates these responsibilities.

---

# Basic DeferredPromise Example

```typescript
import { DeferredPromise } from '@empr/es';

const deferred = new DeferredPromise<string>();

deferred.promise.then((result) => {
    console.log(result);
});

// Later, from another runtime location:
deferred.resolve('done');
```

Conceptually:

```txt
Create deferred operation
        ↓
Expose promise to waiter
        ↓
Resolve later from controller
```

This is useful when async completion is controlled by runtime events rather than a single linear function.

---

# When DeferredPromise Is Useful

`DeferredPromise` is useful for:

- waiting for external runtime events,
- bridging callback-based code to async/await,
- pausing execution until resume,
- coordinating multiple async systems,
- implementing runtime gates,
- or waiting for signals from another module.

Example:

```typescript
const resumeGate =
    new DeferredPromise<void>();

async function waitUntilResumed(): Promise<void> {
    await resumeGate.promise;
}

// Later:
resumeGate.resolve();
```

This pattern is especially useful in game loops, loading flows and runtime coordination logic.

---

# DeferredPromise Static Helpers

`DeferredPromise` also provides helpers for multiple deferred operations.

Example:

```typescript
const a = new DeferredPromise<number>();
const b = new DeferredPromise<number>();

DeferredPromise.resolveAll([a, b], 42);

const results = await DeferredPromise.all([a, b]);
```

Available helpers include:

```txt
resolveAll
rejectAll
all
allSettled
race
```

These mirror common native Promise operations while working directly with `DeferredPromise` instances.

---

# PRNG

`PRNG` provides deterministic pseudo-random helpers.

Unlike `Math.random()`, deterministic randomness produces the same result for the same seed.

This is important for:

- replays,
- deterministic tests,
- procedural generation,
- server/client synchronization,
- debug reproduction,
- and predictable game simulation.

---

# Basic PRNG Example

```typescript
import { PRNG } from '@empr/es';

const prng = new PRNG();

const hash = prng.hash('round-42');

console.log(hash);
```

The same seed always produces the same numeric hash.

Conceptually:

```txt
same seed
        ↓
same result
```

---

# Deterministic Shuffle

`PRNG` can also shuffle arrays deterministically.

```typescript
const symbols = [
    'A',
    'K',
    'Q',
    'J',
    '10',
];

const shuffled = prng.shuffle(
    symbols,
    'spin-1001',
);
```

Important behavior:

```txt
Same input array + same seed
        ↓
same shuffled result
```

The source array is not mutated.

This makes `PRNG.shuffle(...)` useful for reproducible ordering logic.

---

# PRNG vs Math.random

Use `Math.random()` for non-critical randomness.

Use `PRNG` when you need repeatability.

Example:

| Use Case | Recommended |
| --- | --- |
| decorative particle variation | `Math.random()` may be enough |
| replayable spin test | `PRNG` |
| deterministic simulation | `PRNG` |
| seeded procedural layout | `PRNG` |
| temporary visual noise | either, depending on requirements |

The key question is:

```txt
Do we need the same input
to produce the same result?
```

If yes, use `PRNG`.

---

# clamp

`clamp` restricts a numeric value to a range.

```typescript
import { clamp } from '@empr/es';

clamp(10, 0, 5);  // 5
clamp(-5, 0, 5);  // 0
clamp(3, 0, 5);   // 3
```

Conceptually:

```txt
value below min → min
value above max → max
value inside range → value
```

Common use cases:

- volume limits,
- progress values,
- animation weights,
- UI sliders,
- camera bounds,
- physics limits,
- speed caps.

Example:

```typescript
const volume = clamp(
    requestedVolume,
    0,
    1,
);
```

---

# debounce

`debounce` delays a callback until calls stop for a given amount of time.

```typescript
import { debounce } from '@empr/es';

const onResize = debounce(() => {
    recalculateLayout();
}, 100);

window.addEventListener('resize', onResize);
```

If `onResize` is called many times quickly, the callback executes only once after the delay.

Conceptually:

```txt
many rapid calls
        ↓
single delayed callback
```

Common use cases:

- resize handling,
- editor input,
- search fields,
- debug UI controls,
- expensive layout recalculation.

---

# nextId

`nextId` returns a monotonically increasing numeric identifier.

```typescript
import { nextId } from '@empr/es';

const entityId = nextId();
const timerId = nextId();
```

Conceptually:

```txt
1
2
3
4
...
```

This is a lightweight alternative to string-based UUID generation for hot paths where a simple runtime-local numeric id is enough.

Useful for:

- runtime ids,
- timers,
- temporary handles,
- debug records,
- execution markers.

Important limitation:

```txt
nextId is runtime-local.
It is not a distributed unique id generator.
```

Use it for local runtime identity, not persistent database identity.

---

# waitNextFrame

`waitNextFrame` returns a Promise that resolves on the next animation frame.

```typescript
import { waitNextFrame } from '@empr/es';

await waitNextFrame();

// code continues on the next visual frame
```

This is useful when async code needs to wait until the browser advances to the next frame.

Example:

```typescript
await playIntroAnimation();
await waitNextFrame();
showContinueButton();
```

Because it relies on `requestAnimationFrame`, it is browser-oriented.

If used in non-browser environments, the application layer must provide the appropriate platform behavior.

---

# Shared Utilities and Isomorphism

Most shared utilities are pure TypeScript and can run in browser, server, tools and tests.

Examples:

```txt
DeferredPromise
PRNG
clamp
debounce
nextId
```

Some helpers may depend on platform APIs.

For example:

```txt
waitNextFrame → requestAnimationFrame
```

The shared layer itself remains low-level and avoids depending on game-specific runtime modules.

This keeps `@empr/es` reusable across:

- browser clients,
- Node.js tools,
- test environments,
- server-side simulation,
- editors,
- and renderer adapters.

---

# Related Shared Infrastructure

Some utilities are important enough to receive their own dedicated articles.

For example:

```txt
ObjectPool<T>
```

also lives in the shared layer, but is covered separately because pooling has a larger runtime lifecycle model.

See:

```txt
4.3. ObjectPool and Pools
```

Similarly:

```txt
Signal
```

is also a shared primitive, but Signals are covered through FSM, SignalService, TrackedSignal and flow-control articles.

---

# Practical Usage Guidelines

Use shared utilities when the problem is small, generic and framework-independent.

Good examples:

```txt
Clamp a number
Generate a local id
Wait for a deferred async event
Shuffle deterministically
Debounce UI input
Wait for next frame
```

Avoid putting domain-specific logic into shared utilities.

Bad examples:

```txt
calculateSlotWin()
loadBonusRound()
createPixiSymbol()
transitionToSpinState()
```

Those belong in higher layers.

---

# Common Mistakes

## Treating Shared Utilities as Game Services

Shared utilities should stay small and generic.

If something knows about game rules, ECS, renderer nodes or business logic, it probably does not belong in `shared`.

---

## Using PRNG Where True Randomness Is Expected

`PRNG` is deterministic.

That is the point.

Do not use it when unpredictability is required.

---

## Using nextId for Persistent Identity

`nextId` is useful for local runtime ids.

It should not be treated as a persistent or globally unique identifier.

---

## Using waitNextFrame in Non-browser Runtime Without Platform Support

`waitNextFrame` depends on `requestAnimationFrame`.

Server or tool environments may need an application-level polyfill or a different scheduling strategy.

---

# Related Articles

- `4.3. ObjectPool and Pools`
- `4.6. LifecycleTracker and TrackedSignal`
- `3.1. Execution Initiators`
- `3.7. FSM + Pipeline + Signal Architecture`

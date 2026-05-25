---
sidebar_position: 41
sidebar_label: "lifecycle"
---

# API: `widgets/lifecycle`

Public entry point for the feature. Import from the package barrel or the widgets index.

```typescript
import {
  LifecycleTracker,
  TrackedSignal,
  IContextDisposable,
  SharedLifecycleTracker,
} from '@empr/es';
// or
import { LifecycleTracker, TrackedSignal, IContextDisposable } from './widgets/lifecycle';
```

| Export (barrel) | Source | Description |
|-----------------|--------|-------------|
| `IContextDisposable` | `lifecycle.types.ts` | Contract for explicit destroy signal + `dispose()` |
| `LifecycleTracker` | `lifecycle-tracker.ts` | Binds `Disposable` resources to owner lifetimes |
| `TrackedSignal` | `tracked-signal.ts` | `Signal` with optional owner-scoped auto-unsubscribe |
| `SharedLifecycleTracker` | `lifecycle-tracker.ts` | Standalone singleton (not wired to `Empr` DI by default) |

**Dependencies:** `shared/signal` (`Signal`, `Disposable`, `ISignal`), `core/entity` (`IEntity`, `OnEntityDestroySignal`), `core/dependency` (`Dependency` — used by `TrackedSignal` only).

**Bootstrap:** `bootstrap/empr.ts` creates one `LifecycleTracker`, registers it globally, and passes the same instance into `SignalService` constructor.

---

## `IContextDisposable`

```typescript
interface IContextDisposable {
  readonly onDestroy: ISignal<void>;
  dispose(): void;
}
```

| Member | Description |
|--------|-------------|
| `onDestroy` | Fires immediately before context teardown |
| `dispose()` | Dispatches `onDestroy`, then `onDestroy.disposeAll()` |

Used by FSM state contexts (`IFSMStateContext.disposable`), `createDisposable()` augmentation, and any custom context that should deterministically flush tracked resources.

**Not the same as** entity destruction — entities use global `OnEntityDestroySignal`; contexts use their own `onDestroy` channel.

---

## `LifecycleTracker`

```typescript
class LifecycleTracker
```

Collects `Disposable` handles per **owner** object and invokes `resource.dispose()` when the owner is destroyed or (for plain objects) garbage-collected.

### Constructor

```typescript
new LifecycleTracker()
```

**Side effect:** Subscribes to `OnEntityDestroySignal` → `onOwnerDestroy(entity)` for every destroyed entity.

### `track(owner, resource)`

```typescript
track(owner: object, resource: Disposable): void
```

| Step | Action |
|------|--------|
| 1 | Get or create `Set<Disposable>` in `_trackers` (`WeakMap<object, Set<Disposable>>`) |
| 2 | Add `resource` to the set |
| 3 | On first track for this owner → `registerOwner(owner, tracker)` |

`Disposable` contract (from `shared/signal`):

```typescript
type Disposable = { dispose: () => void };
```

Any object with `dispose()` qualifies (signal unsubscribe, timer clear, texture destroy, etc.).

### `untrack(owner, resource)`

```typescript
untrack(owner: object, resource: Disposable): void
```

Removes `resource` from the owner's set **without** calling `dispose()`.

Use when the resource already cleaned itself up (animation finished, manual unsubscribe) to avoid double-dispose on owner destroy.

### `createDisposable(target)`

```typescript
createDisposable<T extends object>(target: T): T & { disposable: IContextDisposable }
```

| Step | Action |
|------|--------|
| 1 | Create internal `Signal<void>` for `onDestroy` |
| 2 | Build `IContextDisposable` with `dispose()` → dispatch + `disposeAll` on signal |
| 3 | `Object.defineProperty(target, 'disposable', { value, enumerable: false, configurable: false })` |
| 4 | Return augmented target |

Enables plain data objects as lifecycle owners without inheritance.

### Owner registration (`registerOwner`)

When the first resource is tracked for an owner:

| Owner type | Detection | Registration |
|------------|-----------|--------------|
| **Entity** | `'id' in owner && 'addComponent' in owner` | No extra hook — global `OnEntityDestroySignal` handles cleanup |
| **`IContextDisposable`** | `'onDestroy' in owner` and `onDestroy.once` is a function | `owner.onDestroy.once(() => onOwnerDestroy(owner))` |
| **Plain object** | Otherwise | `FinalizationRegistry.register(owner, trackerSet)` |

### `onOwnerDestroy(owner)` (private behavior)

| Action |
|--------|
| Load `Set<Disposable>` from `_trackers` |
| `forEach(resource => resource.dispose())` |
| Delete owner entry from `_trackers` |

Runs synchronously for entities (on `destroy()`) and context disposables (on `dispose()`).

For GC-backed owners, `FinalizationRegistry` callback disposes the set when the owner object is collected (non-deterministic timing).

---

## `SharedLifecycleTracker`

```typescript
const SharedLifecycleTracker = new LifecycleTracker();
```

Eager singleton created at module load. **Not** the instance registered in `Empr` DI.

| Use case | Recommendation |
|----------|----------------|
| App bootstrapped via `Empr` | `Dependency.instance.inject(LifecycleTracker)` |
| Standalone scripts / tests without DI | `SharedLifecycleTracker` |
| `TrackedSignal` with `owner` | Requires DI-registered `LifecycleTracker` (`inject` in `trackIfOwned`) |

Tracking the same owner on both `SharedLifecycleTracker` and the DI instance will **not** share state — pick one tracker per app.

---

## `TrackedSignal<T>`

```typescript
class TrackedSignal<T> extends Signal<T>
```

Drop-in extension of `Signal`: optional `owner` on `listen` / `once` registers the returned `Disposable` with `LifecycleTracker` via DI.

### `listen(callback, owner?)`

```typescript
override listen(
  callback: (data: T) => void | Promise<void>,
  owner?: object,
): Disposable
```

| `owner` | Behavior |
|---------|----------|
| Omitted | Identical to `Signal.listen` |
| Provided | `super.listen` → `Dependency.instance.inject(LifecycleTracker).track(owner, disposable)` |

Returns the same `Disposable` as base `Signal` — manual `dispose()` still works; `untrack` is not called automatically on manual dispose.

### `once(callback, owner?)`

```typescript
override once(
  callback: (data: T) => void | Promise<void>,
  owner?: object,
): Disposable
```

Same owner-tracking semantics as `listen`.

### DI requirement

```typescript
// TrackedSignal internally:
Dependency.instance.inject(LifecycleTracker)
```

`Empr.init()` / `registerServices()` must run before `TrackedSignal` subscriptions with `owner`, or inject will fail.

Inherited from `Signal`: `dispatch`, `dispatchNextFrame`, `dispose`, `disposeAll`, `name`, `uuid` — see [`shared/signal/API_DOC.md`](/docs/api/es/shared/signal).

`TrackedSignal` does **not** implement `ISignal` differently for the optional `owner` parameter — callers using `ISignal` type lose the second argument unless cast to `TrackedSignal`.

---

## Owner types (reference)

| Owner | Cleanup trigger | Deterministic? |
|-------|-----------------|----------------|
| `IEntity` | `entity.destroy()` → `OnEntityDestroySignal` | Yes, sync |
| `IContextDisposable` | `owner.dispose()` → `onDestroy` | Yes, sync |
| Object with `createDisposable().disposable` | `disposable.dispose()` | Yes, sync |
| Plain `object` | GC via `FinalizationRegistry` | No — GC timing |

**FSM state context:** `IFSMStateContext.disposable` is an `IContextDisposable` built in `fsm.ts` (`onEnter`). Pass `context.disposable` as owner to bind subscriptions to state exit.

---

## Usage patterns

### Track arbitrary resource on entity

```typescript
const tracker = dependency.inject(LifecycleTracker);

tracker.track(entity, {
  dispose: () => timeline.kill(),
});

entity.destroy(); // tracker disposes timeline via OnEntityDestroySignal
```

### Early completion — untrack

```typescript
const resource = { dispose: () => clearInterval(id) };
tracker.track(entity, resource);
clearInterval(id);
tracker.untrack(entity, resource);
```

### Augment plain object

```typescript
const data = lifecycleTracker.createDisposable({ score: 0, level: 1 });

TrackedSignal.listen(handler, data.disposable);
// ...
data.disposable.dispose(); // flushes all tracked resources for this owner
```

### TrackedSignal

```typescript
const OnSpinComplete = new TrackedSignal<ISpinResult>();

OnSpinComplete.listen((result) => handleSpin(result)); // no owner
OnSpinComplete.listen((result) => handleSpin(result), entity); // auto-unsubscribe on destroy
OnSpinComplete.once((result) => handleOnce(result), stateContext.disposable);
```

### SignalService (features layer)

`SignalService.listen(signal, factory, owner?)` tracks the pipeline listener `Disposable` on the DI `LifecycleTracker` — works with **any** `ISignal`, not only `TrackedSignal`:

```typescript
signals.listen(OnPlayerSpawnSignal, playerSpawnPipeline, entity);
```

---

## Semantics and constraints

| Topic | Behavior |
|-------|----------|
| **Storage** | `WeakMap` — owner keys do not prevent GC of plain objects |
| **Multiple resources** | One `Set` per owner; all disposed on destroy |
| **Entity duck-typing** | Structural check (`id` + `addComponent`), not `instanceof Entity` |
| **Context disposable duck-typing** | Requires `onDestroy.once` function |
| **Double dispose** | Caller should `untrack` if resource already disposed manually |
| **Tracker scope** | Invokes `.dispose()` only — does not define cleanup semantics |
| **Layer boundary** | Widget — no pipeline/FSM logic; FSM imports `IContextDisposable` type only |
| **`SharedLifecycleTracker` vs DI** | Separate instances — do not mix for the same owner |

---

## `Signal` vs `TrackedSignal`

| | `Signal` | `TrackedSignal` |
|---|----------|-----------------|
| `listen` / `once` arity | `(callback)` | `(callback, owner?)` |
| Owner binding | Manual `Disposable.dispose()` | Optional auto-track via `LifecycleTracker` |
| DI | Not required | Required when `owner` is passed |
| Drop-in | Base type in `ISignal` | Extend or cast for `owner` param |

---

## Related documentation

- `feature_description.md` — hybrid cleanup rationale
- [`../shared/signal/API_DOC.md`](/docs/api/es/shared/signal) — `Signal`, `Disposable`, `ISignal`
- [`../core/entity/API_DOC.md`](/docs/api/es/core/entity) — `OnEntityDestroySignal`
- [`../core/dependency/API_DOC.md`](/docs/api/es/core/dependency) — `Dependency.instance.inject`
- `../../features/fsm/fsm.types.ts` — `IFSMStateContext.disposable`
- Source: `lifecycle-tracker.ts`, `tracked-signal.ts`, `lifecycle.types.ts`, export: `index.ts`

## Known consumers (reference)

| Module | Usage |
|--------|--------|
| `bootstrap/empr.ts` | DI singleton `LifecycleTracker` |
| `features/signal-service` | `track` / `untrack` on `listen(..., owner?)` |
| `features/fsm` | `IContextDisposable` on state context |
| `widgets/lifecycle/tracked-signal` | `inject(LifecycleTracker)` |
| App services (timers, tweens, spine) | Owner-bound resources (per project integration) |


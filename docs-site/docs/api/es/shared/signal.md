---
sidebar_position: 11
sidebar_label: "signal"
---

# API: `shared/signal`

Public entry point for the feature. Import from the shared barrel or the feature index.

```typescript
import { Signal, ISignal, Disposable } from '@empr/es';
// or
import { Signal, ISignal, Disposable } from './shared/signal';
```

| Export | Source | Description |
|--------|--------|-------------|
| `Signal` | `signal.ts` | Typed pub/sub with async-aware `dispatch` |
| `ISignal` | `signal.types.ts` | Signal contract (program against interface) |
| `Disposable` | `signal.types.ts` | Unsubscribe handle type |

**Dependencies (internal):** `nextId`, `waitNextFrame` from `shared/utils`.

---

## `Disposable`

```typescript
type Disposable = { dispose: () => void };
```

Returned by `listen` and `once`. Calling `dispose()` removes the subscription (delegates to `Signal.dispose(callback)` with the same function reference).

```typescript
const token = signal.listen(handler);
token.dispose();
```

---

## `ISignal<T>`

Contract for signal instances. Default type parameter is `any` in the interface definition; prefer an explicit `T` at call sites.

| Member | Type (interface) | Description |
|--------|------------------|-------------|
| `uuid` | `number` | Unique numeric id (assigned at construction in `Signal`) |
| `name` | `string \| undefined` | Debug label |
| `listen` | `(callback) => Disposable` | Persistent subscription |
| `once` | `(callback) => Disposable` | Single-fire subscription |
| `dispose` | `(callback) => void` | Remove one listener by callback reference |
| `disposeAll` | `() => void` | Remove all listeners |
| `dispatch` | `(data: T) => void` | Emit payload (interface signature) |
| `dispatchNextFrame` | `(data: T) => void` | Deferred emit (interface signature) |

> **Implementation note:** `Signal` implements `dispatch` and `dispatchNextFrame` as **`async`** methods returning `Promise<void>`. The interface declares `void` for ergonomics; always `await` dispatches when async listeners are registered.

**Callback type in `Signal` (implementation):** `(data: T) => void | Promise<void>`. Async return values are awaited collectively via `Promise.all`.

---

## `Signal<T>`

Publish–subscribe primitive for cross-module communication. Supports sync and async listeners; `dispatch` resolves only after all returned promises settle. Listener errors are isolated (`console.error`) and do not stop other listeners.

**Layer:** `shared` — no ECS types; may be used from `core`, `widgets`, and `features`.

### Constructor

```typescript
new Signal<T>(name?: string)
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `name` | `string` | `'Signal'` | Debug label exposed via `name` getter |

**Side effects:** Assigns `uuid` via `nextId()` once per instance.

```typescript
const OnScoreChanged = new Signal<number>('Game.OnScoreChanged');
```

---

### Read-only properties

#### `name` (getter)

| | |
|---|---|
| **Type** | `string` |
| **Description** | Constructor argument or default `'Signal'`. |

#### `uuid` (getter)

| | |
|---|---|
| **Type** | `number` |
| **Description** | Monotonic unique id from `nextId()`; stable for the lifetime of the instance. |

---

### `listen(callback)`

```typescript
listen(callback: (data: T) => void | Promise<void>): Disposable
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `callback` | `(data: T) => void \| Promise<void>` | Invoked on every `dispatch` until removed |

**Returns:** `Disposable` — `dispose()` calls `dispose(callback)` with the same reference.

```typescript
signal.listen((data) => console.log(data));
signal.listen(async (data) => {
  await saveState(data);
});
```

---

### `once(callback)`

```typescript
once(callback: (data: T) => void | Promise<void>): Disposable
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `callback` | `(data: T) => void \| Promise<void>` | Invoked on the **next** `dispatch` only |

**Returns:** `Disposable` — manual unsubscribe before dispatch is still supported.

**Behavior:** Listener is removed from the internal array **before** `callback` runs (during `dispatch` forward iteration, with index correction after `splice`).

```typescript
signal.once((data) => console.log('once', data));
```

---

### `dispose(callback)`

```typescript
dispose(callback: (data: T) => void | Promise<void>): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `callback` | Same function reference passed to `listen` / `once` | Identity match (`!==` on reference) |

Removes matching entries from the listener list. No-op if reference not found.

```typescript
const handler = (data: T) => { /* ... */ };
signal.listen(handler);
signal.dispose(handler);
```

---

### `disposeAll()`

```typescript
disposeAll(): void
```

Clears all listeners (`_listeners = []`).

---

### `dispatch(data)`

```typescript
async dispatch(data: T): Promise<void>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `data` | `T` | Payload passed to every listener |

**Returns:** `Promise<void>` — resolves when all listeners finish; awaits promises returned by async callbacks.

**Dispatch loop (summary):**

1. Iterate `_listeners` forward (index `i`).
2. If `listener.once`, `splice(i, 1)` and `i--` before invoking callback.
3. `try/catch` around synchronous invocation.
4. If return value `instanceof Promise`, attach `.catch(console.error)` and collect into `promises` (array allocated only if needed).
5. If `promises` defined, `await Promise.all(promises)`.

| Topic | Behavior |
|-------|----------|
| **Sync listeners** | Run immediately in order; no `promises` array allocated. |
| **Async listeners** | Collected and awaited in parallel (`Promise.all`). |
| **Sync throw** | Logged; next listener still runs. |
| **Async reject** | Logged via attached `.catch`; does not reject `dispatch`. |
| **`once` order** | Removed from list before callback runs on that dispatch. |

```typescript
await signal.dispatch(payload);
console.log('all listeners done');
```

---

### `dispatchNextFrame(data)`

```typescript
async dispatchNextFrame(data: T): Promise<void>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `data` | `T` | Payload for deferred dispatch |

**Returns:** `Promise<void>` — `await waitNextFrame()` then `return this.dispatch(data)`.

Defers emission until the next animation frame (`requestAnimationFrame`). Useful for game-loop-safe ordering (avoid re-entrancy during the current frame).

```typescript
await signal.dispatchNextFrame(entity);
```

---

## Usage patterns

### Module-level signal constants

```typescript
export const OnEntityDestroySignal = new Signal<IEntity>('Entity.OnDestroy');
```

### Await async subscribers

```typescript
OnSaveRequested.listen(async () => {
  await flushToDisk();
});
await OnSaveRequested.dispatch(undefined);
```

### Manual cleanup

```typescript
const sub = OnResize.listen(onResize);
// later
sub.dispose();
// or
OnResize.dispose(onResize);
```

### Program against `ISignal`

```typescript
function wire(signal: ISignal<Config>, factory: () => void): void {
  signal.listen(() => factory());
}
```

Used by `features/signal-service` (`SignalService.listen(signal: ISignal<T>, ...)`).

---

## Semantics and constraints

| Topic | Behavior |
|-------|----------|
| **Listener identity** | `dispose(callback)` requires the **same function reference** as registered. |
| **No duplicate guard** | Same callback can be registered multiple times if `listen` is called repeatedly. |
| **Dispatch re-entrancy** | Calling `dispatch` from inside a listener while a dispatch is in progress mutates `_listeners` during iteration; avoid unless intentional. |
| **GC / hot path** | `promises` array is created only when at least one listener returns a `Promise`. |
| **ECS** | No entity/component awareness in this module. |
| **Higher layers** | `TrackedSignal` (`widgets/lifecycle`) extends `Signal` with lifecycle-owned auto-dispose; `SignalService` (`features`) bridges `ISignal` to execution pipelines. |

---

## Related documentation

- `feature_description.md` — motivation, GC and error-isolation rationale
- Source: `signal.ts`, `signal.types.ts`, export: `index.ts`

## Known consumers (reference)

| Module | Usage |
|--------|--------|
| `core/entity/entity.signals.ts` | Global entity lifecycle/component signals |
| `core/update-loop/update-loop.signals.ts` | `OnUpdateSignal` |
| `widgets/entity-storage/entity-storage.ts` | Listens / dispatches pool-related entity signals |
| `widgets/lifecycle/tracked-signal.ts` | `extends Signal<T>` with optional owner tracking |
| `widgets/lifecycle/lifecycle-tracker.ts` | Imports `Signal`, `Disposable` |
| `features/signal-service` | `ISignal` + `Disposable` for pipeline bridging |
| `bootstrap/empr.ts` | Registers `SignalService` (not `Signal` itself) |


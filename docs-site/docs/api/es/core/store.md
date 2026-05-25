---
sidebar_position: 21
sidebar_label: "store"
---

# API: `core/store`

Public entry point for the feature. Import from the core barrel or the feature index.

```typescript
import {
  Store,
  createStore,
  mixStores,
  storeMixer,
  computed,
  // types: IStore, Listener, Middleware, Validator, IComputedRef, ...
} from '@empr/es';
```

| Export (barrel) | Source | Description |
|-----------------|--------|-------------|
| `Store` | `store.ts` | Reactive state container |
| `createStore` | `store.utils.ts` | Factory for `Store` |
| `mixStores` | `store.utils.ts` | Merged store wrapper |
| `storeMixer` | `store.mixer.ts` | Low-level multi-store sync |
| `computed` | `computed.ts` | Sync derived values |
| Types from `store.types` | `store.types.ts` | Contracts and helper types |

**Not in barrel** (use via `Store` methods or deep import): `createAsyncComputed`, `createAsyncComputedMultiple` (`async-computed.ts`), `createSelector`, `createMemoizedSelector`, `createStoreSelector`, `createCompositeSelector` (`selectors.ts`).

**Dependencies:** None within `core` (ECS-agnostic).

---

## Core types

### `Listener<T>`

```typescript
type Listener<T> = (state: T, prev: T) => void;
```

Notified after batched microtask flush with **raw** internal state (not read-only proxy).

### `Middleware<T>`

```typescript
type Middleware<T> = (
  state: T,
  update: Partial<T>,
  next: (state: T, update: Partial<T>) => T,
) => T;
```

`state` = `_prevData` snapshot before apply; chain runs in registration order; each returns new full state.

### `Validator<T>`

```typescript
type Validator<T> = (update: Partial<T>) => true | string;
```

Throws `Error` on failure during `update()` / `MixedStore.update` validation paths.

### `ITransaction<T>`

```typescript
interface ITransaction<T> {
  apply: (state: T) => T;
  rollback: (state: T) => T;
}
```

### `IStoreOptions<T>`

```typescript
interface IStoreOptions<T> {
  middleware?: Middleware<T>[];
  validators?: Validator<T>[];
}
```

---

## `Store<T>`

```typescript
class Store<T extends object> implements IStore<T>
```

Type-safe reactive store: explicit updates, optional validators/middleware, microtask-batched notifications.

### Constructor

```typescript
new Store(initialState: T, options?: IStoreOptions<T>)
```

### State accessors

| Member | Description |
|--------|-------------|
| `state` | Read-only **Proxy** — direct `set` logs warning and fails |
| `rawState` | Mutable internal object (escape hatch) |
| `prev` | Deep clone of previous state (before last `update`) |
| `middleware` | Copy of middleware array |

Nested objects in `state` get shallow proxy wrap on read (nested `set` not fully guarded).

### `update(callback)`

```typescript
update(callback: (current: T) => Partial<T>): void
```

| Step | Action |
|------|--------|
| 1 | `partial = callback(this.state)` |
| 2 | `validateUpdate(partial)` |
| 3 | `_prevData = clone(_data)` |
| 4 | Run middleware chain → `_data = finalState` |
| 5 | `notifyListeners()` (microtask batch) |

Shallow merge: `{ ...state, ...partial }` per middleware step via `applyUpdate`.

### `transaction` / `simpleTransaction`

| Method | Validators / middleware |
|--------|-------------------------|
| `transaction({ apply, rollback })` | **Skipped** — assigns `_data = apply(state)` directly |
| `simpleTransaction(apply)` | Wraps partial rollback of touched keys |

On throw: `rollback(previousState)` and re-notify.

### `reset(initialData?)`

Replaces `_data` (default `{} as T`), notifies — **no** validators/middleware.

### Subscription

```typescript
subscribe(listener: Listener<T>): () => void
```

### Dynamic middleware / validators

`addMiddleware`, `addMiddlewares`, `addValidator`, `addValidators` — each returns remover function.

### Cloning

`cloneState()`, `clonePrevState()` — `safeDeepClone` (arrays/objects; warns on failure).

### Factory helpers on instance

| Method | Delegates to |
|--------|----------------|
| `createSelector(input, result, options?)` | `createMemoizedSelector` |
| `createStoreSelector(selector, onChange?)` | `createStoreSelector` |
| `createComputed(getter)` | `computed(this, getter)` |
| `createAsyncComputed(asyncGetter, options?)` | `createAsyncComputed` |

---

## Notification batching (static)

```text
update → notifyListeners()
  → queueMicrotask (once per tick)
  → all pending stores: listener(_data, _prevData)
```

Re-entrant updates during notification re-queue the store in `_pendingNotifications`.

---

## `createStore`

```typescript
createStore<T extends object>(initialState: T): Store<T>
```

Alias for `new Store(initialState)`.

---

## `computed`

```typescript
computed(store, getter): IComputedRef<R>
computed([store1, store2, ...], getter): IComputedRef<R>
```

| Feature | Behavior |
|---------|----------|
| Lazy | Recomputes when `.value` read and cache invalidated |
| Cache | Cleared on any dependency `subscribe` fire |
| Circular deps | Detected via stack → throw |
| Max depth | 100 |
| Cleanup | `dispose()`; auto `dispose` on `window` `unload` (browser) |

```typescript
interface IComputedRef<T> {
  readonly value: T;
  dispose(): void;
}
```

---

## `createAsyncComputed` (via `Store.createAsyncComputed` or deep import)

```typescript
createAsyncComputed(
  store: Store<T>,
  asyncGetter: (state: T, context: { signal: AbortSignal }) => Promise<R>,
  options?: IAsyncComputedOptions,
): IAsyncComputedRef<R>
```

### `IAsyncComputedOptions` (defaults)

| Option | Default | Description |
|--------|---------|-------------|
| `immediate` | `true` | Subscribe to store + start execution |
| `retryCount` | `0` | Extra attempts after failure |
| `retryDelay` | `1000` | Base ms; exponential `* 2^attempt` |
| `timeout` | `30000` | Per-attempt race timeout |
| `shouldRetry` | `() => true` | Predicate per error |
| `debounce` | `0` | Ms delay before re-run on store change |

### `IAsyncComputedRef<R>`

| Member | Description |
|--------|-------------|
| `state` | `AsyncComputedState<R>` — `idle` \| `loading` \| `success` \| `error` |
| `data`, `error`, `isLoading`, `hasError`, `hasData` | Convenience getters |
| `refresh()` | Re-run |
| `cancel()` | Abort + clear debounce timer |
| `reset()` | Cancel + idle state |
| `dispose()` | Unsubscribe store, cancel, clear listeners |

New store change aborts prior `AbortController` before next run (race-safe).

Hidden: `(ref as any).subscribe(listener)` on internal state (not in public interface).

### `createAsyncComputedMultiple`

Combines multiple stores into virtual store; delegates to `createAsyncComputed`.

---

## Selectors (`selectors.ts`)

### `createSelector`

Identity wrapper — documents intent only.

### `createMemoizedSelector`

```typescript
createMemoizedSelector(inputSelector, resultSelector, options?): IMemoizedSelector<T, R>
```

| Option | Default | Description |
|--------|---------|-------------|
| `equalityFn` | shallow object compare | Input cache key |
| `maxCacheSize` | `1` | LRU cache entries |

Callable as `(state) => R`; `clearCache()`, `getCacheStats()`.

### `createStoreSelector`

Auto-subscribes to store; `value` getter; `dispose()`; optional `onChange(new, old)` when selected value changes (`!==`).

### `createCompositeSelector`

Runs multiple selectors into one object keyed result.

---

## `storeMixer` / `mixStores`

### `storeMixer(stores, options?)`

Merges state shapes (`StoresUnion<T>`) into `MixedStore` extending `Store`:

- Initial state: shallow spread of all `store.state`
- **Bidirectional sync:** patching source `store.update` to forward to mixed store; mixed `update` routes keys back to owning stores
- Loop guard: temporarily replaces `store.update` with `Store.prototype.update` when pushing to sources
- `mixedStore.cleanup()` — restores source `update` methods (on `ExtendedStore` class)

### `mixStores(stores)`

```typescript
mixStores<T>(stores: Store<any>[]): Store<T>
```

`new Store(storeMixer(stores))` cast — convenience wrapper.

> Field ownership: keys must not collide across source stores; last spread wins at init.

---

## Usage patterns

### FSM / global app state

```typescript
const store = createStore({ phase: 'idle', score: 0 });
store.subscribe((state, prev) => { /* react */ });
store.update((s) => ({ ...s, score: s.score + 1 }));
```

### Middleware logging

```typescript
store.addMiddleware((prev, patch, next) => {
  const out = next(prev, patch);
  console.log(patch, out);
  return out;
});
```

### Memoized derivation

```typescript
const selectActive = store.createSelector(
  (s) => s.items,
  (items) => items.filter((i) => i.active),
);
const active = selectActive(store.state);
```

### Async resource

```typescript
const profile = store.createAsyncComputed(
  async (s, { signal }) => fetchUser(s.userId, signal),
  { retryCount: 2, debounce: 300 },
);
```

---

## Semantics and constraints

| Topic | Behavior |
|-------|----------|
| **Reactivity model** | Explicit `update` / `transaction` — not deep Vue-style tracking |
| **Immutability** | Enforced on `state` proxy only |
| **`transaction`** | Bypasses validators and middleware |
| **Listeners** | Batched via `queueMicrotask` |
| **ECS** | No entity/component coupling |
| **Barrel** | Async/selector free functions omitted from `index.ts` |
| **`numberRangeValidator`** | Mentioned in TS example only — not implemented in this folder |

---

## Related documentation

- `feature_description.md` — design rationale
- `features/fsm` — `IStore` for FSM context
- Source: `store.ts`, `store.types.ts`, `index.ts`

## Known consumers (reference)

| Module | Usage |
|--------|--------|
| `features/fsm` | FSM `Store<T>` context, transitions |
| Apps / processes | `createStore` for UI and game globals |
| Slot / CD clients | Base stores, pipelines |


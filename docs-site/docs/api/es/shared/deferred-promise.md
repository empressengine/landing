---
sidebar_position: 11
sidebar_label: "deferred-promise"
---

# API: `shared/deferred-promise`

Public entry point for the feature. Import from the shared barrel or the feature index.

```typescript
import { DeferredPromise } from '@empr/es';
// or
import { DeferredPromise } from './shared/deferred-promise';
```

| Export | Source | Description |
|--------|--------|-------------|
| `DeferredPromise` | `deferred-promise.util.ts` | Generic class for externally controlled promises |

---

## `DeferredPromise<T>`

Utility that wraps a native `Promise<T>` and exposes `resolve` / `reject` outside the executor. Useful when one module must **await** settlement and another module (or callback) must **trigger** it later.

**Layer:** `shared` — no framework or ECS dependencies.

### Constructor

```typescript
new DeferredPromise<T>()
```

Creates a pending promise. `resolve` and `reject` are bound inside the native `Promise` executor and stored on the instance.

| Parameter | Type | Description |
|-----------|------|-------------|
| — | — | No arguments |

**Returns:** `DeferredPromise<T>` instance with `promise` still pending until `resolve` or `reject` is called.

---

### Instance API

#### `promise` (getter)

| | |
|---|---|
| **Type** | `Promise<T>` |
| **Access** | read-only |
| **Description** | Underlying native promise. Subscribe via `.then()` / `.catch()` / `await`. |

```typescript
const deferred = new DeferredPromise<string>();
deferred.promise.then((value) => console.log(value));
await deferred.promise;
```

---

#### `resolve` (getter)

| | |
|---|---|
| **Type** | `(value: T \| PromiseLike<T>) => void` |
| **Access** | read-only (getter returns the bound native `resolve`) |
| **Description** | Fulfills `promise` with `value`. If `value` is a thenable, native promise chaining applies. |

```typescript
deferred.resolve('done');
deferred.resolve(Promise.resolve(42));
```

---

#### `reject` (getter)

| | |
|---|---|
| **Type** | `(reason?: unknown) => void` |
| **Access** | read-only |
| **Description** | Rejects `promise` with optional `reason`. |

```typescript
deferred.reject(new Error('failed'));
deferred.reject();
```

> **Note:** Implementation types `reason` as `any` in source; prefer `unknown` at call sites.

---

### Static API (batch operations)

All static helpers accept arrays of `DeferredPromise<any>` and operate on each instance’s `.promise`.

#### `DeferredPromise.resolveAll<K>`

```typescript
static resolveAll<K>(deferred: DeferredPromise<any>[], data: K): void
```

Resolves every deferred in the array with the **same** `data`.

| Parameter | Type | Description |
|-----------|------|-------------|
| `deferred` | `DeferredPromise<any>[]` | Instances to fulfill |
| `data` | `K` | Value passed to each `resolve(data)` |

**Returns:** `void`

```typescript
const items = [new DeferredPromise<number>(), new DeferredPromise<number>()];
DeferredPromise.resolveAll(items, 42);
```

---

#### `DeferredPromise.rejectAll`

```typescript
static rejectAll(deferred: DeferredPromise<any>[], reason?: unknown): void
```

Rejects every deferred in the array with the **same** `reason`.

| Parameter | Type | Description |
|-----------|------|-------------|
| `deferred` | `DeferredPromise<any>[]` | Instances to reject |
| `reason` | `unknown` (optional) | Rejection reason for each instance |

**Returns:** `void`

```typescript
DeferredPromise.rejectAll(items, new Error('aborted'));
```

---

#### `DeferredPromise.all`

```typescript
static all(deferred: DeferredPromise<any>[]): Promise<any[]>
```

Delegates to `Promise.all` over `deferred.map((d) => d.promise)`.

| Parameter | Type | Description |
|-----------|------|-------------|
| `deferred` | `DeferredPromise<any>[]` | Instances to wait on |

**Returns:** `Promise<any[]>` — resolves when **all** promises fulfill; rejects on the **first** rejection (native `Promise.all` semantics).

```typescript
const results = await DeferredPromise.all(deferreds);
```

---

#### `DeferredPromise.allSettled`

```typescript
static allSettled(deferred: DeferredPromise<any>[]): Promise<PromiseSettledResult<any>[]>
```

Delegates to `Promise.allSettled` over internal promises.

| Parameter | Type | Description |
|-----------|------|-------------|
| `deferred` | `DeferredPromise<any>[]` | Instances to wait on |

**Returns:** `Promise<any[]>` in implementation (native `Promise.allSettled` result array). Waits until every promise is fulfilled or rejected; no early reject.

```typescript
const outcomes = await DeferredPromise.allSettled(deferreds);
```

---

#### `DeferredPromise.race`

```typescript
static race(deferred: DeferredPromise<any>[]): Promise<any>
```

Delegates to `Promise.race` over internal promises.

| Parameter | Type | Description |
|-----------|------|-------------|
| `deferred` | `DeferredPromise<any>[]` | Instances to compete |

**Returns:** `Promise<any>` — settles with the outcome of the **first** settled promise (fulfill or reject).

```typescript
const first = await DeferredPromise.race(deferreds);
```

---

## Usage patterns

### Single deferred (pause / resume)

```typescript
const gate = new DeferredPromise<void>();

async function worker(): Promise<void> {
  await gate.promise;
  // continues after external resolve
}

function resume(): void {
  gate.resolve();
}
```

### Multiple deferred (broadcast)

```typescript
const gates = systems.map(() => new DeferredPromise<void>());

DeferredPromise.resolveAll(gates, undefined);
await DeferredPromise.all(gates);
```

### Error propagation

```typescript
const d = new DeferredPromise<number>();
d.promise.catch((err) => console.error(err));
d.reject(new Error('cancelled'));
```

---

## Semantics and constraints

| Topic | Behavior |
|-------|----------|
| **Settlement** | Each instance settles at most once (native promise rules). Repeated `resolve` / `reject` calls are ignored after settlement. |
| **Immutability** | `promise`, `resolve`, and `reject` are getters; callers cannot replace the underlying promise or callbacks. |
| **Generics** | `T` is the fulfillment type of `promise`. Static batch methods use `DeferredPromise<any>[]` and widen results to `any` / `any[]`. |
| **Concurrency helpers** | `all`, `allSettled`, and `race` are thin wrappers over the standard `Promise` API — same timing and error behavior as the platform. |
| **Dependencies** | None. Safe to use from any layer that may import `shared`. |

---

## Related documentation

- `feature_description.md` — motivation, design decisions, and boundaries
- Source: `deferred-promise.util.ts`, public export: `index.ts`

## Known consumers (reference)

| Module | Usage |
|--------|--------|
| `es-sistema` / `pipeline.ts` | Execution pipeline pause/resume via `DeferredPromise<void>` |
| `es-lienzo` / `tween-phase.ts` | Phase completion gates |
| `es-lienzo` / `spine.types.ts` | Optional `_deferred: DeferredPromise<void> \| null` |


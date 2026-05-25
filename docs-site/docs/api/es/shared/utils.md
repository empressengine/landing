---
sidebar_position: 11
sidebar_label: "utils"
---

# API: `shared/utils`

Public entry point for the feature. Import from the shared barrel or the feature index.

```typescript
import { nextId, debounce, waitNextFrame, clamp } from '@empr/es';
// or
import { clamp, nextId } from './shared/utils';
```

| Export | Source | Description |
|--------|--------|-------------|
| `nextId` | `id.util.ts` | Monotonic numeric id generator |
| `debounce` | `debounce.util.ts` | Delayed trailing-edge function wrapper |
| `waitNextFrame` | `wait-next-frame.util.ts` | `requestAnimationFrame` as `Promise<void>` |
| `clamp` | `clamp.util.ts` | Numeric range clamp |

**Dependencies:** None — all utilities are pure modules with zero imports.

---

## `nextId`

```typescript
nextId(): number
```

Generates a **monotonically increasing** positive integer. Module-scoped counter (`let id = 0`; each call returns `++id`).

| | |
|---|---|
| **Parameters** | None |
| **Returns** | `number` — unique within the process for the lifetime of the module (starts at `1` on first call) |

```typescript
const a = nextId(); // 1
const b = nextId(); // 2
```

**Characteristics:**

| Topic | Behavior |
|-------|----------|
| **GC** | No string/object allocation (unlike UUID libraries). |
| **State** | Single module-level counter; never reset by the API. |
| **Scope** | Global to all importers of this module (one shared sequence). |
| **Hot paths** | Used for `Signal.uuid`, pipeline/composer ids, timers, tweens, etc. |

---

## `waitNextFrame`

```typescript
waitNextFrame(): Promise<void>
```

Returns a promise that resolves on the **next animation frame** via `requestAnimationFrame`.

| | |
|---|---|
| **Parameters** | None |
| **Returns** | `Promise<void>` — resolves once before the next paint |

```typescript
await waitNextFrame();
// code runs on next frame
```

**Environment:**

| Topic | Behavior |
|-------|----------|
| **Browser** | Uses native `requestAnimationFrame`. |
| **Node / SSR** | Requires a global `requestAnimationFrame` polyfill at app bootstrap if used server-side (this module does not provide one). |

**Known usage:** `Signal.dispatchNextFrame`, `axis-container` layout debouncing (`es-lienzo`).

---

## `debounce`

```typescript
debounce(callback: (...args: any[]) => void, delay?: number): (...args: any[]) => void
```

Wraps `callback` so it runs **once**, after `delay` milliseconds have passed **since the last invocation** (trailing edge).

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `callback` | `(...args: any[]) => void` | — | Function to invoke after the quiet period |
| `delay` | `number` | `0` | Delay in milliseconds (`setTimeout`) |

**Returns:** Debounced function with the same variadic signature (typed as `any[]` in source).

```typescript
const onResize = debounce(() => layout(), 100);
window.addEventListener('resize', onResize);
```

**Behavior:**

1. Each call to the returned function `clearTimeout`s the previous timer (if any).
2. Schedules `callback(...args)` with the **arguments from the last call** only.
3. Rapid calls collapse to a single execution after `delay` ms of inactivity.

| Topic | Behavior |
|-------|----------|
| **`delay === 0`** | Still defers to the next macrotask via `setTimeout(..., 0)`. |
| **Leading edge** | Not supported — no immediate first call. |
| **Cancel / flush** | Not exposed on the returned function. |
| **Typing** | Args are `any[]`; callers should keep arity consistent. |

**Note:** `core/store/async-computed` implements its own debounce timer; it does not use this helper.

---

## `clamp`

```typescript
clamp(value: number, min: number, max: number): number
```

Constrains `value` to the inclusive range `[min, max]` using `Math.max(min, Math.min(max, value))`.

| Parameter | Type | Description |
|-----------|------|-------------|
| `value` | `number` | Input value |
| `min` | `number` | Lower bound |
| `max` | `number` | Upper bound |

**Returns:** `number` — `min` if `value < min`, `max` if `value > max`, otherwise `value`

```typescript
clamp(10, 0, 5);  // 5
clamp(-5, 0, 5);  // 0
clamp(3, 0, 5);   // 3
```

| Topic | Behavior |
|-------|----------|
| **Branching** | No explicit `if`; delegates to native `Math.min` / `Math.max`. |
| **`min > max`** | Still runs; result follows `Math.min`/`Math.max` semantics (callers should pass `min <= max`). |
| **NaN** | If `value` is `NaN`, result is typically `NaN` (native math rules). |

---

## Usage patterns

### Frame-deferred work

```typescript
async function afterLayout(): Promise<void> {
  await waitNextFrame();
  measureDom();
}
```

### Resize storm coalescing

```typescript
this._resizeHandler = debounce(this.onResize.bind(this), 100);
```

### Progress / ratio limiting

```typescript
const t = clamp(elapsed / duration, 0, 1);
```

### Lightweight identity (no UUID strings)

```typescript
const pipelineId = nextId();
const signalUuid = nextId();
```

---

## Semantics and constraints

| Topic | Behavior |
|-------|----------|
| **Layer** | `shared` — no ECS, no DI, no Pixi. |
| **Side effects** | `nextId` mutates module state; `debounce` uses timers; `waitNextFrame` schedules rAF. |
| **`clamp` / pure math** | No module state. |
| **Cross-imports** | Safe for other `shared` modules (`signal` imports `nextId`, `waitNextFrame`). |
| **Test isolation** | `nextId` counter is not reset between tests unless the module is reloaded. |

---

## Related documentation

- `feature_description.md` — motivation, GC and isolation rationale
- Sources: `id.util.ts`, `debounce.util.ts`, `wait-next-frame.util.ts`, `clamp.util.ts`, export: `index.ts`

## Known consumers (reference)

| Module | Utilities used |
|--------|----------------|
| `shared/signal` | `nextId`, `waitNextFrame` |
| `es-sistema` / `pipeline-composer` | `nextId` |
| `es-componente` / `orchestrator`, `component-driven-executor` | `nextId` |
| `es-lienzo` / `timer`, `tween`, `spine`, `axis-container` | `nextId`, `waitNextFrame` |
| `apps/slot-*` / `resizer.service` | `debounce` |
| App code (comments/docs) | `clamp` (e.g. slot settle progress) |

`UpdateLoop` implements private delta clamping internally; it does not import `shared/utils/clamp`.


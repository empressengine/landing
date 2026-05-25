---
sidebar_position: 11
sidebar_label: "prng"
---

# API: `shared/prng`

Public entry point for the feature. Import from the shared barrel or the feature index.

```typescript
import { PRNG } from '@empr/es';
// or
import { PRNG } from './shared/prng';
```

| Export | Source | Description |
|--------|--------|-------------|
| `PRNG` | `prng.ts` | Deterministic pseudo-random utilities (FNV-1a + Fisher–Yates) |

---

## `PRNG`

Pure mathematical service for **deterministic** pseudo-random operations. Same string seed and inputs always yield the same outputs across platforms and runtimes (no `Math.random()`).

**Layer:** `shared` — zero imports, no framework or ECS dependencies.

**State:** Instance holds only FNV constants (`FNV_OFFSET_BASIS`, `FNV_PRIME`). Public methods do not mutate instance fields; behavior is fully determined by arguments.

### Constructor

```typescript
new PRNG()
```

| Parameter | Type | Description |
|-----------|------|-------------|
| — | — | No arguments |

**Returns:** `PRNG` instance (safe to reuse; methods are pure with respect to instance state).

```typescript
const prng = new PRNG();
// or via DI (bootstrap):
// dependency.resolve(PRNG)
```

---

### `hash(seed)`

```typescript
hash(seed: string): number
```

Computes a stable **unsigned 32-bit** integer from `seed` using **FNV-1a**.

| Parameter | Type | Description |
|-----------|------|-------------|
| `seed` | `string` | Input string (character codes iterated in order) |

**Returns:** `number` — unsigned 32-bit integer (`hash >>> 0` at each step)

**Algorithm (summary):**

1. Start with `FNV_OFFSET_BASIS` (`0x811c9dc5`).
2. For each character: `hash ^= charCodeAt(i)`, then `hash = Math.imul(hash, FNV_PRIME)` where `FNV_PRIME = 0x01000193`.
3. Return `hash >>> 0`.

```typescript
const prng = new PRNG();
const h1 = prng.hash('test-seed');
const h2 = prng.hash('test-seed');
// h1 === h2 always
const h3 = prng.hash('other');
// h3 !== h1 (with overwhelming probability)
```

**Use cases:** Derive numeric seeds from human-readable keys (`'level-1-spawn'`), chain into shuffle, or feed custom logic.

---

### `shuffle<T>(array, seed)`

```typescript
shuffle<T>(array: T[], seed: string): T[]
```

Returns a **new** array with elements in a deterministic pseudo-random order. Does **not** mutate `array`.

| Parameter | Type | Description |
|-----------|------|-------------|
| `array` | `T[]` | Source elements (shallow-copied via spread) |
| `seed` | `string` | Seed string; base hash from `hash(seed)` |

**Returns:** `T[]` — new shuffled copy

**Algorithm (summary):**

1. `result = [...array]` (shallow copy).
2. `currentHash = hash(seed)`.
3. Fisher–Yates from `i = result.length - 1` down to `1`:
   - `currentHash = (Math.imul(currentHash, FNV_PRIME) ^ i) >>> 0`
   - `j = floor(normalize(currentHash) * (i + 1))` where `normalize` maps uint32 → `[0, 1)`
   - Swap `result[i]` and `result[j]`.

```typescript
const prng = new PRNG();
const order1 = prng.shuffle(['a', 'b', 'c'], 'my-seed');
const order2 = prng.shuffle(['a', 'b', 'c'], 'my-seed');
// order1 deep-equals order2 (same element order)

const original = ['a', 'b', 'c'];
prng.shuffle(original, 'my-seed');
// original unchanged: ['a', 'b', 'c']
```

**Empty array:** Loop does not run; returns `[]`.

**Single element:** No swaps; returns one-element copy.

---

### Private implementation (reference)

Not part of the public API; documented for determinism debugging.

#### `normalize(hash)`

```typescript
private normalize(hash: number): number
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `hash` | `number` | 32-bit hash value |

**Returns:** `number` in **`[0, 1)`** — `(hash >>> 0) / 0x100000000`

Forces unsigned interpretation before division so behavior is stable across JS engines.

---

## Usage patterns

### Local instance

```typescript
const prng = new PRNG();
const deck = prng.shuffle([1, 2, 3, 4, 5], `round-${roundId}`);
```

### Dependency injection (framework bootstrap)

`PRNG` is registered globally in `bootstrap/empr.ts`:

```typescript
dependency.registerGlobal({ provide: PRNG, useClass: PRNG });
```

Inject or resolve `PRNG` where services need shared deterministic randomness.

### Composed seeds (manual)

```typescript
const base = 'world-42';
const chunkSeed = `${base}:chunk-12-4`;
const hash = prng.hash(chunkSeed);
```

> Planned API `derive(baseSeed, namespace)` is described in `extension_manifest.md` but **not implemented** yet.

### Determinism vs `Math.random()`

| | `PRNG` | `Math.random()` |
|---|--------|-----------------|
| Seeded | Yes (`string`) | No |
| Reproducible | Yes | No |
| Cross-run replay | Suitable | Not suitable |

---

## Semantics and constraints

| Topic | Behavior |
|-------|----------|
| **Determinism** | Same `seed` + same `array` contents/order → same shuffle output. Same `seed` → same `hash`. |
| **Immutability** | `shuffle` never mutates the input array; allocates a shallow copy. |
| **Seed type** | Only `string` seeds (by design); numeric seeds must be stringified by the caller. |
| **Unicode** | `hash` uses `charCodeAt(i)` (UTF-16 code units), not full grapheme clusters. |
| **Allocation** | `shuffle` allocates `[...array]` and performs in-place swaps on the copy. |
| **Range of `hash`** | Unsigned 32-bit: `0` … `0xFFFFFFFF`. |
| **Shuffle index `j`** | Always `0 <= j <= i` (standard Fisher–Yates). |
| **Threading** | Synchronous; single-threaded JS model. |
| **Interfaces** | No `IPRNG` or options type exported — concrete class only. |

---

## Constants (instance)

| Name | Value | Role |
|------|-------|------|
| `FNV_OFFSET_BASIS` | `0x811c9dc5` | FNV-1a initial hash |
| `FNV_PRIME` | `0x01000193` | FNV-1a multiplier (also used in shuffle hash chain) |

---

## Related documentation

- `feature_description.md` — motivation, replay/sync context, design decisions
- `extension_manifest.md` — **planned** methods (`pick`, `float`, `chance`, `derive`, etc.) — not in `prng.ts` yet
- Source: `prng.ts`, export: `index.ts`

## Known consumers (reference)

| Module | Usage |
|--------|--------|
| `bootstrap/empr.ts` | Global DI registration `{ provide: PRNG, useClass: PRNG }` |

No other in-repo call sites at time of writing; intended for procedural generation, replay (`DVRService`), and synchronized simulations per feature description.


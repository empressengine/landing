---
sidebar_position: 31
sidebar_label: "assets-storage"
---

# API: `features/assets-storage`

Public entry point for synchronous in-memory asset registry. Import from the features barrel or the feature index.

```typescript
import { AssetsStorage, IAssetData } from '@empr/es-lienzo';
// or
import { AssetsStorage, IAssetData } from './features/assets-storage';
```

| Export | Source | Description |
|--------|--------|-------------|
| `AssetsStorage` | `assets-storage.ts` | Flat registry: add, query by name / bundle |
| `IAssetData<T>` | `assets-storage.types.ts` | `{ name, bundle, asset }` entry shape |

**Dependencies:** none (plain TypeScript; `asset` payloads are typically Pixi / Spine objects from [`assets-loader`](/docs/api/es-lienzo/features/assets-loader)).

**Out of scope:** Network load, manifest parsing, decoding — [`AssetsLoader`](/docs/api/es-lienzo/features/assets-loader). GPU `texture.destroy()` — callers manage Pixi lifecycle. **No `removeAsset` / `removeBundle` in current code** (see [Semantics](#semantics-and-constraints)).

**DI wiring:** `EmprLienzo.registerServices()` — `new AssetsStorage()`, shared instance injected into `AssetsLoader` and consumers.

---

## Role in the stack

```text
AssetsLoader (async)  ──addAsset──►  AssetsStorage (sync)
                                         ▲
TreeBuilder / View / systems ──getAsset──┘
```

| Layer | Responsibility |
|-------|----------------|
| `assets-loader` | Download + parse → `addAsset` |
| `assets-storage` | Hold references; O(n) lookup by name |
| `tree-builder` | `getAsset` during synchronous node build |

Resources must exist in storage **before** `TreeBuilder` / `View` construction runs.

---

## `IAssetData<T>`

```typescript
interface IAssetData<T> {
  name: string;
  bundle: string;
  asset: T;
}
```

| Field | Description |
|-------|-------------|
| `name` | Lookup key (manifest name, spritesheet frame, animation id, etc.) |
| `bundle` | Source bundle name from `AssetsLoader.loadBundle` |
| `asset` | Parsed object (`Texture`, `Spritesheet`, Spine resource, …) |

Generic `T` is caller-defined at `getAsset<T>()` — storage does not validate types.

**Typical payloads (from loader behaviours):**

| Source | `name` examples | `asset` type (typical) |
|--------|-----------------|-------------------------|
| Texture | manifest key | `Texture` |
| Spritesheet | frame keys + animation names | `Texture` per frame; animations may store texture map |
| Spine | manifest key | Spine resource object (`skeleton`, …) |
| Bitmap font | font key | `Spritesheet` (+ `BitmapFont.available`) |

---

## `AssetsStorage`

Stateless service aside from internal `_items: IAssetData<any>[]` (append-only array).

**Construction:** `new AssetsStorage()` — no constructor args.

---

### `addAsset(asset)`

```typescript
addAsset(asset: IAssetData<any>): void
```

| Parameter | Description |
|-----------|-------------|
| `asset` | Full entry to append |

| | |
|---|---|
| **Returns** | `void` |

**Side effects:** `push` onto `_items` — **no deduplication**; duplicate `(name, bundle)` pairs are allowed; `find` returns the **first** match.

Primary writer: [`AssetsLoader`](/docs/api/es-lienzo/features/assets-loader) behaviours. Host code may also register runtime assets (e.g. blur textures).

```typescript
storage.addAsset({
  name: 'symbol_cherry_blur',
  bundle: 'main',
  asset: generatedTexture,
});
```

---

### `hasAsset(name, bundle?)`

```typescript
hasAsset(name: string, bundle?: string): boolean
```

| Parameter | Description |
|-----------|-------------|
| `name` | Asset name to find |
| `bundle` | Optional — restrict search to this bundle |

| | |
|---|---|
| **Returns** | `true` if any matching entry exists |

Search pool: `getBundle(bundle)` when `bundle` set, else entire `_items`.

---

### `getAsset<T>(name, bundle?)`

```typescript
getAsset<T>(name: string, bundle?: string): T
```

| Parameter | Description |
|-----------|-------------|
| `name` | Asset name |
| `bundle` | Optional bundle scope |

| | |
|---|---|
| **Returns** | `item.asset` cast to `T` |
| **Throws** | `Error: Asset ${name} didnt exist!` if not found |

Fail-fast by design — avoids silent `undefined` textures during UI build.

```typescript
const texture = storage.getAsset<Texture>('logo', 'main');
const spineData = storage.getAsset('hero_skeleton', 'animations');
```

**Without `bundle`:** scans all items; first `name` match wins — use bundle when names collide across bundles.

---

### `getBundle(name)`

```typescript
getBundle(name: string): IAssetData<any>[]
```

| Parameter | Description |
|-----------|-------------|
| `name` | Bundle name |

| | |
|---|---|
| **Returns** | New array of all entries where `item.bundle === name` (filter copy) |

Does not mutate storage. Empty array if bundle unknown.

```typescript
const mainAssets = storage.getBundle('main');
for (const { name, asset } of mainAssets) {
  // inspect or batch process
}
```

---

## Lookup algorithm (reference)

```typescript
const source = bundle ? this.getBundle(bundle) : this._items;
const item = source.find((item) => item.name === name);
```

Linear **O(n)** per query; n = bundle size or total items. Tuned for typical 2D UI asset counts; not a hash map.

---

## Bootstrap sequence (reference)

```text
EmprLienzo.registerServices()
  → assetsStorage = new AssetsStorage()
  → assetsLoader = new AssetsLoader(assetsStorage)
  → DI: AssetsStorage, AssetsLoader

Pipeline
  → assetsLoader.init / loadBundles
  → behaviours call addAsset repeatedly

Runtime
  → inject(AssetsStorage).getAsset(...) in builders / views / systems
```

Same `AssetsStorage` instance must be used by loader and readers.

---

## Usage patterns

### TreeBuilder sprite (texture)

```typescript
const storage = this.dependency.inject(AssetsStorage);
const texture = storage.getAsset<Texture>(options.asset, options.bundle);
const sprite = new Sprite({ texture });
```

See `tree-builder/behaviours/sprite-builder.behaviour.ts`.

### Nine-slice texture

```typescript
const texture = assetsStorage.getAsset<Texture>(options.asset, options.bundle);
```

### Declarative view factory (app)

```typescript
const assets = Dependency.instance.inject(AssetsStorage);
const tex = assets.getAsset<Texture>('symbol_7', 'main');
```

### Guard before optional asset

```typescript
if (storage.hasAsset('bonus_icon', 'main')) {
  const tex = storage.getAsset<Texture>('bonus_icon', 'main');
}
```

### Runtime-generated asset (blur pipeline)

```typescript
// After generating Texture in a system:
storage.addAsset({ name: `${baseName}_blur`, bundle: 'main', asset: blurTexture });
// Later: storage.getAsset<Texture>(`${baseName}_blur`, 'main');
```

---

## Semantics and constraints

| Topic | Behavior |
|-------|----------|
| **Synchronous only** | All methods sync; no Promises |
| **No remove API** | Entries are never removed by this class — memory held until GC if references dropped elsewhere |
| **Duplicates** | Repeated `addAsset` with same name — first match on `getAsset` |
| **No overwrite** | No upsert; append only |
| **Type safety** | `getAsset<T>` trusts caller; wrong `T` → runtime errors downstream |
| **Error message** | Exact string `Asset ${name} didnt exist!` (typo preserved in source) |
| **Threading** | Single-threaded browser assumption |
| **Destroy** | Does not call Pixi `.destroy()` when “removing” — not implemented |

> **Note:** `feature_description.md` mentions `removeAsset` / `removeBundle`; those methods are **not** present in `assets-storage.ts` as of this codebase — treat removal as out of scope unless added later.

---

## Comparison with `AssetsLoader`

| Concern | `AssetsLoader` | `AssetsStorage` |
|---------|----------------|-----------------|
| Timing | Async `init` / `loadBundle` | Sync read/write |
| Input | URLs, manifest | `IAssetData` objects |
| Output | Populates storage | Serves stored refs |
| Errors | Network / Pixi load | Missing name throws |

---

## Internal model (reference)

```
┌─────────────────────────────────────────┐
│  AssetsStorage                          │
│  _items: IAssetData<any>[]              │
├─────────────────────────────────────────┤
│  addAsset(entry)     → push             │
│  hasAsset / getAsset → find by name     │
│  getBundle           → filter by bundle │
└─────────────────────────────────────────┘
```

---

## Related documentation

- `feature_description.md` — design intent (note: remove APIs documented there but not implemented)
- [`../assets-loader/API_DOC.md`](/docs/api/es-lienzo/features/assets-loader) — how entries are produced
- `../tree-builder/feature_description.md` — synchronous `getAsset` during build
- `../../bootstrap/empr.lienzo.ts` — DI registration
- Source: `assets-storage.ts`, `assets-storage.types.ts`, export: `index.ts`

## Known consumers (reference)

| Module | Usage |
|--------|--------|
| `bootstrap/empr.lienzo.ts` | `new AssetsStorage()`, DI |
| `assets-loader/behaviours/*` | `addAsset` |
| `tree-builder/behaviours/sprite-builder.behaviour.ts` | `getAsset<Texture>` |
| `tree-builder/behaviours/nine-slice-builder.behaviour.ts` | `getAsset<Texture>` |
| `apps/slot-client/.../symbol.view.ts` | `inject(AssetsStorage)` |
| `apps/slot-client/.../blur-generate.system.ts` | read + `addAsset` |
| `component-driven blur generator` | storage-backed blur registration |

Ensure bundles are loaded via `AssetsLoader` before any consumer calls `getAsset` for those names.


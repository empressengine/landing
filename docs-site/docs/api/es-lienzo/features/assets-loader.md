---
sidebar_position: 31
sidebar_label: "assets-loader"
---

# API: `features/assets-loader`

Public entry point for PixiJS `Assets` bundle loading, manifest preprocessing, and delegation to `AssetsStorage`. Import from the features barrel or the feature index.

```typescript
import {
  AssetsLoader,
  ILoaderConfig,
  IManifest,
  IBundle,
  IBundleAsset,
  IAliasedResolution,
  ILoaderBehaviour,
  ILoadedBundleInfo,
} from '@empr/es-lienzo';
// or
import { AssetsLoader, ILoaderConfig } from './features/assets-loader';
```

| Export | Source | Description |
|--------|--------|-------------|
| `AssetsLoader` | `assets-loader.ts` | Init manifest, load bundles, route parsed objects to storage |
| `ILoaderConfig` | `assets-loader.types.ts` | Manifest + resolutions + optional `ignoreFormats` |
| `IManifest` | `assets-loader.types.ts` | `{ bundles: IBundle[] }` |
| `IBundle` | `assets-loader.types.ts` | Named bundle with `assets[]` |
| `IBundleAsset` | `assets-loader.types.ts` | `{ name, srcs }` per file entry |
| `IAliasedResolution` | `assets-loader.types.ts` | `{ width, height, alias }` for adaptive paths |
| `ILoaderBehaviour` | `assets-loader.types.ts` | Strategy: `build(key, bundleName, bundle)` |
| `ILoadedBundleInfo` | `assets-loader.types.ts` | Progress payload for `loadBundles` callback |

**Not exported (internal):**

| Class | Source | Role |
|-------|--------|------|
| `TextureLoaderBehaviour` | `behaviours/texture-loader.behaviour.ts` | Single `Texture` → `AssetsStorage` |
| `SpritesheetLoaderBehaviour` | `behaviours/spritesheet-loader.behaviour.ts` | Atlases → frames + animations |
| `SpineLoaderBehaviour` | `behaviours/spine-loader.behaviour.ts` | Spine payload (`skeleton` property) |
| `BitmapLoaderBehaviour` | `behaviours/bitmap-loader.behaviour.ts` | `fonts` bundle → `BitmapFont` + storage |

**Dependencies:**

| Package / module | Symbols |
|------------------|---------|
| `pixi.js` | `Assets`, `Texture`, `Spritesheet`, `BitmapFont`, … |
| `../assets-storage` | `AssetsStorage` (`addAsset`) |

**Out of scope:** Synchronous asset lookup (`AssetsStorage.getAsset`), UI tree build (`TreeBuilder`), network manifest generation (host app / build tools). Loader **writes** storage only; it does not read assets back.

**DI wiring:** `EmprLienzo.registerServices()` — `new AssetsStorage()`, `new AssetsLoader(assetsStorage)`, both registered globally.

---

## Pipeline overview

```text
init(ILoaderConfig)
  → pick resolution alias + WebP variant + strip ignoreFormats
  → Assets.init({ manifest: { bundles } })
  → behaviours registered (texture / spritesheet / spine / bitmap)

loadBundle(name) | loadBundles(names, onLoad?)
  → Assets.loadBundle(name)
  → processBundle → ILoaderBehaviour.build → AssetsStorage.addAsset
```

Host apps typically wrap this in ECS systems (not in this package):

| System (slot-client) | Action |
|----------------------|--------|
| `assetsInitSystem` | `await assetsLoader.init(config)` |
| `assetsLoadSystem` | `loadBundles(bundles, onLoad)`; optional `lazy` (no await) |

---

## Configuration types

### `IBundleAsset`

```typescript
interface IBundleAsset {
  name: string;
  srcs: string | string[];
}
```

| Field | Description |
|-------|-------------|
| `name` | Asset key inside the bundle (Pixi manifest name) |
| `srcs` | URL or list of variant URLs (resolution / WebP). **Preprocessing** (`selectResolution`, `selectWebp`) only runs when `srcs` is an **array** |

### `IBundle` / `IManifest`

```typescript
interface IBundle {
  name: string;
  assets: IBundleAsset[];
}

interface IManifest {
  bundles: IBundle[];
}
```

### `IAliasedResolution`

```typescript
interface IAliasedResolution {
  width: number;
  height: number;
  alias: string;  // substring matched in src paths, e.g. '1080p'
}
```

### `ILoaderConfig`

```typescript
interface ILoaderConfig {
  manifest: IManifest;
  resolutions: IAliasedResolution[];
  ignoreFormats?: string[];  // extensions without dot: 'wav', 'mp3'
}
```

| Field | Description |
|-------|-------------|
| `manifest` | **Mutated in place** during `init()` (src filtering, bundle removal) |
| `resolutions` | Device picks closest alias via `closestDimension()` |
| `ignoreFormats` | Drops assets whose `srcs` reference `.{format}` |

### `ILoadedBundleInfo`

```typescript
interface ILoadedBundleInfo {
  bundle: string;  // name of bundle that just finished
  total: number;   // requested bundle count
  index: number;   // completed count (increments as parallel loads finish)
}
```

`index` reflects completion order under `Promise.all`, not manifest order.

### `ILoaderBehaviour`

```typescript
interface ILoaderBehaviour {
  build(key: string, name: string, bundle: any): void;
}
```

| Parameter | Description |
|-----------|-------------|
| `key` | Entry key in Pixi-loaded bundle object |
| `name` | Bundle name passed to `loadBundle` |
| `bundle` | Full object returned by `Assets.loadBundle` |

Extension point: register custom behaviour in `setupBehaviours()` (requires fork/patch today — map is private).

---

## `AssetsLoader`

**Construction:** `new AssetsLoader(assetsStorage: AssetsStorage)`.

### `dimension` (getter)

```typescript
get dimension(): string
```

| | |
|---|---|
| **Returns** | Selected resolution **alias** (e.g. `'1080p'`) after `init()` |
| **Before init** | `''` |

---

### `init(config)`

```typescript
async init(config: ILoaderConfig): Promise<void>
```

| Step | Behavior |
|------|----------|
| WebP probe | Tiny data-URI image; `height === 2` ⇒ supported |
| `closestDimension` | `max(screen.width, screen.height) * devicePixelRatio` vs `resolutions[].width` — pick closest alias |
| `ignoreFormats` | Remove matching assets / empty bundles from manifest (optional) |
| `selectResolution` | For array `srcs`, keep paths containing selected alias |
| `selectWebp` | For array `srcs`, pick `*_webp*` path if supported, else non-webp |
| Behaviours | Register texture, bitmap, spritesheet, spine handlers |
| Pixi prefs | `preferCreateImageBitmap: false`, `preferWorkers: false` |
| Pixi init | `await Assets.init({ manifest: { bundles } })` |

```typescript
await assetsLoader.init({
  manifest,
  resolutions: [
    { width: 1920, height: 1080, alias: '1080p' },
    { width: 1280, height: 720, alias: '720p' },
  ],
  ignoreFormats: ['wav', 'mp3', 'webm'],
});
```

**Environment:** `closestDimension` uses `window.screen` and `devicePixelRatio` — browser context expected at init time.

---

### `loadBundle(name)`

```typescript
async loadBundle(name: string): Promise<void>
```

| Parameter | Description |
|-----------|-------------|
| `name` | Bundle name from manifest |

| | |
|---|---|
| **Returns** | Resolves when Pixi load + `processBundle` complete |

Calls `Assets.loadBundle(name)` then `processBundle(name, bundle)`.

---

### `loadBundles(bundles, onLoad?)`

```typescript
async loadBundles(
  bundles: string[],
  onLoad?: (data: ILoadedBundleInfo) => void,
): Promise<void>
```

| Parameter | Description |
|-----------|-------------|
| `bundles` | Bundle names to load **in parallel** |
| `onLoad` | Optional; fired after each bundle completes |

| | |
|---|---|
| **Returns** | Resolves when **all** bundles finish (`Promise.all`) |

```typescript
await assetsLoader.loadBundles(['loader', 'main', 'fonts'], (info) => {
  console.log(`${info.index}/${info.total}: ${info.bundle}`);
});
```

---

## `processBundle` — type detection (reference)

For each `key` in the loaded bundle object:

| Condition | Behaviour |
|-----------|-----------|
| `bundle[key]` has own property `'skeleton'` | `SpineLoaderBehaviour` |
| `instanceof Texture` | `TextureLoaderBehaviour` |
| `instanceof Spritesheet` && bundle name ≠ `'fonts'` | `SpritesheetLoaderBehaviour` |
| `instanceof Spritesheet` && bundle name === `'fonts'` | `BitmapLoaderBehaviour` |
| bundle name === `'fonts'` (fallback) | `BitmapLoaderBehaviour` |

If no behaviour matches, the entry is **skipped** (no storage write).

---

## Loader behaviours (internal)

### `TextureLoaderBehaviour`

```typescript
addAsset({ name: key, asset: bundle[key], bundle: name });
```

Stores raw `Texture`.

### `SpritesheetLoaderBehaviour`

- Each animation name in `spritesheet.animations` → `addAsset({ name: anim, asset: textures, bundle })`
- Each frame in `spritesheet.textures` → `addAsset({ name: frameKey, asset: texture, bundle })`

### `SpineLoaderBehaviour`

Stores full Spine resource object under `key` (consumed later by `Spine.from` / `TreeBuilder` with atlas naming conventions).

### `BitmapLoaderBehaviour`

Used for `fonts` bundle:

- Builds `BitmapFontData` from spritesheet frames
- Maps frame keys: `dot` → `.`, `comma` → `,`, `usd` → `$`, `eur` → `€`, `space` → ` `, `dash` → `-`, `plus` → `+`; single-char keys used as-is
- Registers `BitmapFont.available[key]`
- Also `addAsset` with spritesheet reference

---

## Manifest conventions (reference)

| Convention | Purpose |
|------------|---------|
| Resolution alias in path | e.g. `.../1080p/...` — filtered by `selectResolution` |
| `_webp` in filename | WebP variant selection |
| Bundle name `'fonts'` | Routes spritesheets to bitmap font builder |
| Multi `srcs` array | Required for resolution/WebP filtering |

Single-string `srcs` bypasses resolution/WebP filtering in `init()`.

---

## Bootstrap sequence (reference)

```text
EmprLienzo.registerServices()
  → assetsStorage = new AssetsStorage()
  → assetLoader = new AssetsLoader(assetsStorage)
  → DI: AssetsStorage, AssetsLoader

App pipeline (slot-client example)
  → assetsInitSystem({ config: loaderConfig })
  → assetsLoadSystem({ bundles: ['loader', 'main', 'fonts', 'animations'] })
  → TreeBuilder / systems use AssetsStorage.getAsset(name, bundle?)
```

---

## Usage patterns

### Minimal init + load

```typescript
const assetsLoader = app.dependency.inject(AssetsLoader);
await assetsLoader.init(loaderConfig);
await assetsLoader.loadBundle('main');
```

### Pipeline composition

```typescript
pipeline
  .use(assetsInitSystem, { config: loaderConfig })
  .use(assetsLoadSystem, { bundles: ['loader', 'main', 'fonts'] });
```

### Lazy background load

```typescript
assetsLoadSystem({ bundles: ['optional'], lazy: true });
```

### Read after load (via storage)

```typescript
const storage = inject(AssetsStorage);
const texture = storage.getAsset<Texture>('symbol_cherry', 'main');
```

---

## Semantics and constraints

| Topic | Behavior |
|-------|----------|
| **Manifest mutation** | `init` modifies `config.manifest.bundles` in place — reuse config carefully |
| **Storage coupling** | Same `AssetsStorage` instance must be injected into loader and consumers |
| **Parallel loads** | `loadBundles` uses `Promise.all` — high concurrency; order of `onLoad` undefined |
| **No unload API** | No bundle eviction or `Assets.unload` wrapper |
| **Browser-only init** | Resolution uses `window` / `Image` for WebP test |
| **Audio** | Typically listed in `ignoreFormats` — loaded outside Pixi (e.g. Howler) |
| **Type detection** | Heuristic on loaded object shape; misclassified assets are silently skipped |
| **Errors** | Pixi load failures propagate from `loadBundle`; storage misses throw at `getAsset` time |

---

## Internal model (reference)

```
┌──────────────────────────────────────────────────────────────┐
│  AssetsLoader                                                │
│  _dimension, _behaviours: Map<type, ILoaderBehaviour>        │
├──────────────────────────────────────────────────────────────┤
│  init → mutate manifest → Assets.init                        │
│  loadBundle → Assets.loadBundle → processBundle              │
│       → behaviour.build → AssetsStorage.addAsset             │
└──────────────────────────────────────────────────────────────┘
         │                              ▲
         │                              │
    pixi.js Assets                  AssetsStorage
```

---

## Related documentation

- `feature_description.md` — strategy pattern, adaptive resolution, boundaries
- `../assets-storage/feature_description.md` — storage role (no `API_DOC.md` yet)
- `../../bootstrap/empr.lienzo.ts` — DI registration
- [`../../features/tree-builder``tree-builder` — consumes stored assets at build time
- Pixi: [Assets / Manifest](https://pixijs.com/guides/components/assets) (external)
- Source: `assets-loader.ts`, `assets-loader.types.ts`, [`behaviours/``behaviours`, export: `index.ts`

## Known consumers (reference)

| Module | Usage |
|--------|--------|
| `bootstrap/empr.lienzo.ts` | `new AssetsLoader(assetsStorage)`, DI |
| `apps/slot-client/.../assets-init.system.ts` | `init(config)` |
| `apps/slot-client/.../assets-load.system.ts` | `loadBundles` + `lazy` / `onLoad` |
| `apps/slot-client/.../loader.config.ts` | `ILoaderConfig` manifest + resolutions |
| `apps/slot-client/.../initialization.pipeline.ts` | Chains init + load systems |
| `apps/slot-cd-client/.../initialization.orchestrator.ts` | Injects `AssetsLoader` |

Manifest files (e.g. `bundles.manifest.ts`) are app-owned and often code-generated by build tools — not part of `es-lienzo`.


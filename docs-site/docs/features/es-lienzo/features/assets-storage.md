---
sidebar_position: 2
sidebar_label: "assets-storage"
---

# Feature: `features/assets-storage`

## What this feature does

The `assets-storage` module provides a centralized, synchronous in-memory registry for all pre-loaded game assets (such as PixiJS textures, Spine animations, sprite sheets, and bitmap fonts). It organizes and provides immediate access to raw asset data using a unique asset name or a combination of an asset name and its parent bundle.

## Why this feature exists

Within the `features` layer, there must be a strict separation of concerns between the asynchronous process of fetching files over the network (`assets-loader`) and the synchronous process of constructing UI visual trees (`TreeBuilder`).

If the UI factories handled asset loading directly, it would result in tight coupling, duplicate network requests, and complex caching logic. `AssetsStorage` solves this architectural problem by acting as the lowest-level Single Source of Truth in the `features` layer. Any construction code can query this storage to instantly retrieve a ready-to-use texture without asynchronous delays.

## How it works

1. **Registration:** An external loader (such as `AssetsLoader` or its Behaviours) calls `addAsset(asset)`, passing an `IAssetData` payload that contains the `name`, the `bundle` it belongs to, and the parsed `asset` data itself.
2. **Storage:** All added assets are continuously pushed into a single, flat internal array `_items`.
3. **Retrieval:** During the scene construction phase (typically inside `TreeBuilder` or `View`), logic calls `getAsset<T>(name, bundle?)`. The method synchronously scans the array. If the `bundle` argument is provided, it first narrows the search pool to that specific bundle before matching the name.
4. **Cleanup:** Developers can selectively remove a single asset reference via `removeAsset(name)` or clear an entire bundle via `removeBundle(name)`. This drops the internal array references, allowing the Javascript Garbage Collector (GC) to reclaim the memory.

## Interesting design decisions

### 1) Fail-Fast Retrieval

The `getAsset` method intentionally throws a synchronous error (`throw new Error`) if the requested asset is not found.
_Result:_ This prevents silent rendering bugs where the engine attempts to draw an `undefined` texture. The game crashes predictably during the View construction phase with a clear message indicating exactly which asset name was forgotten in the load manifest.

### 2) Flat Array Structure

Instead of utilizing complex nested dictionaries (e.g., `Map<BundleName, Map<AssetName, Asset>>`), the storage utilizes a simple flat array `IAssetData<any>[]`.
_Result:_ It simplifies the logic for adding and bulk-removing items by bundle. Given the typical volume of UI assets held in memory for a single 2D scene, linear $O(N)$ lookups via `Array.prototype.find` are highly performant and reduce the memory allocation overhead associated with deep hash tables.

### 3) Optional Namespace Resolution (Bundles)

The `getAsset` and `hasAsset` methods accept `bundle` as an optional parameter.
_Result:_ This simplifies the API for developers if asset names are guaranteed to be globally unique across the project (no need to hardcode bundle names everywhere). However, if a collision occurs (e.g., a `background` texture exists in both the `menu` and `level_1` bundles), the parameter allows the developer to explicitly and safely resolve the conflict.

## Public contracts in this feature

- **Classes:**
    - `AssetsStorage`: The primary global registry service for caching and serving resources.
- **Interfaces & Types:**
    - `IAssetData<T>`: A generic container defining the metadata of an asset (name, owning bundle, and the raw `<T>` payload).

## Current scope and boundaries

- **In Scope:** Synchronous in-memory storage of references to any object type (`<T>`), querying by name or bundle, and deleting references to free up memory.
- **Out of Scope:** Network interactions, file downloading, image decoding, or Spine/JSON parsing. This asynchronous work is strictly delegated to the higher-level `AssetsLoader` module.
- **Out of Scope:** Deep WebGL resource destruction. The storage only erases its internal references via `removeAsset`/`removeBundle`. It does not call PixiJS's `.destroy(true)` on textures. Physical GPU memory cleanup remains the responsibility of the caller or the garbage collector.


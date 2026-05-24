---
sidebar_position: 1
sidebar_label: "assets-loader"
---

# Feature: `features/assets-loader`

## What this feature does

The `assets-loader` module provides a robust system for asynchronous loading and preprocessing of game assets in bundles. It automatically handles various resource types (Pixi textures, sprite sheets, Spine animations, and bitmap fonts), applies format filtering (e.g., WebP selection or adaptive resolution scaling), and delegates the parsed data to the centralized `AssetsStorage`.

## Why this feature exists

In cross-platform HTML5 games, asset loading is a complex orchestration. The game must support multiple screen resolutions (e.g., 1080p for desktop vs. 540p for mobile), verify browser format support (like WebP), and correctly unpack complex data structures (like texture atlases or fonts).

If developers hardcoded `PIXI.Assets.load` calls directly into game logic, it would tightly couple visual components to network requests and scatter configuration logic. `AssetsLoader` solves this architectural problem by encapsulating file selection rules (filtering `_webp` suffixes and resolution aliases) and providing a clean ECS interface. This allows the `features` layer to prepare all resources in memory before the `TreeBuilder` needs them to construct the UI.

## How it works

1. **Initialization:** The `assetsLoader.init(config)` method is called. The service calculates the optimal screen resolution (`closestDimension`), checks the browser's WebP support, and strips unsupported formats (from `ignoreFormats`) from the manifest.
2. **Manifest Mutation:** It updates the `srcs` paths for each asset in the manifest, leaving only the URLs that match the selected resolution alias and WebP capability.
3. **Loading:** The `loadBundles(names)` method is invoked (often via `assetsLoadSystem`). The loader delegates the actual network request to the native `PIXI.Assets.loadBundle`.
4. **Parsing:** After a bundle is successfully downloaded, the loader iterates through the returned objects. Depending on the object's signature (e.g., if it contains `spineData` or is a `Spritesheet`), it dynamically selects the appropriate `ILoaderBehaviour` strategy.
5. **Delegation & Storage:** The selected behaviours (e.g., `SpineLoaderBehaviour` or `BitmapLoaderBehaviour`) extract the necessary internal data and push it into the `AssetsStorage`, making it available for the `TreeBuilder`.

## Interesting design decisions

### 1) Strategy Pattern for Asset Parsing (Behaviours)

Instead of writing a massive `switch-case` block to parse every possible file type, the parsing logic is extracted into isolated classes implementing the `ILoaderBehaviour` interface.
_Result:_ The architecture adheres to the Open/Closed Principle. If the project later requires 3D model support or custom shaders, developers can simply write a new `Behaviour` and register it without touching the core loader class.

### 2) Automated Device Adaptation

The `closestDimension` method calculates the user's physical screen size (`window.screen.height * window.devicePixelRatio`) and selects the most appropriate resolution alias from the configuration.
_Result:_ Massive savings in network bandwidth and GPU memory. Mobile devices automatically download lightweight textures, while modern browsers seamlessly receive optimized WebP variants without developers writing platform-specific loading logic.

### 3) Pipeline-Ready ECS Systems

Instead of forcing developers to manually inject and invoke the loader service in custom scripts, the feature provides out-of-the-box asynchronous ECS systems: `assetsInitSystem` and `assetsLoadSystem`.
_Result:_ Asset loading becomes a declarative step in any `PipelineComposer`. The `lazy` flag allows developers to choose whether the pipeline should block execution until the scene's assets are loaded or continue immediately for background loading.

### 4) Custom Character Mapping for BitmapFonts

The `BitmapLoaderBehaviour` includes a strict mapping dictionary for string keys (e.g., `dot`, `usd`, `space`) translating them into their precise ASCII character codes.
_Result:_ It drastically improves the pipeline for UI artists. Naming files like `.` or `$` often causes OS-level errors or packaging failures. Artists can safely name their spritesheet frames with readable words ("dot"), and the engine will seamlessly compile them into standard text characters.

## Public contracts in this feature

- **Classes:**
    - `AssetsLoader`: The primary loading controller service.
- **ECS Systems:**
    - `assetsInitSystem`: Pipeline system for initializing manifests and calculating resolutions.
    - `assetsLoadSystem`: Pipeline system for triggering bundle downloads.
- **Interfaces & Types:**
    - `ILoaderConfig`, `IManifest`, `IBundle`: Contracts defining the loader's configuration tree.
    - `IAliasedResolution`: Defines target adaptive screen resolutions.
    - `ILoaderBehaviour`: The strategy interface for custom asset parsers.
    - `ILoadedBundleInfo`: Payload tracking multi-bundle loading progress.

## Current scope and boundaries

- **In Scope:** Parsing manifests, filtering formats and WebP variants, calculating optimal screen resolutions, invoking the native PixiJS downloader, identifying asset types, and extracting raw data via Behaviours.
- **Out of Scope:** Synchronous storage and retrieval of resources. The loader pushes data out but never serves it to the game; that is strictly the responsibility of `AssetsStorage`.
- **Out of Scope:** Consuming loaded textures to instantiate UI entities. The loader only supplies raw data; the `TreeBuilder` consumes it to build visual nodes.


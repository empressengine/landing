---
sidebar_position: 5
sidebar_label: "view"
---

# Feature: `features/view`

## What this feature does

The `view` module provides a fluent API (Builder pattern) for declaratively describing visual interfaces before sending them to the assembly factory (`TreeBuilder`). It abstracts the creation of complex, nested JSON-like schemas (`TreeNode`) and provides global facade methods (`instantiate` and `deinstantiate`) to safely bridge the generated schemas with the ECS kernel and PixiJS scene graph.

## Why this feature exists

Within the `features` layer, the `TreeBuilder` expects a strict, heavily nested data structure (`TreeNode`) to construct the UI. Manually handwriting these tree objects via standard JavaScript literals is cumbersome, prone to nesting errors, and deprives developers of IntelliSense.

The `View` feature solves this by introducing a chaining syntax (similar to SwiftUI or Jetpack Compose). Furthermore, the `instantiate` and `deinstantiate` functions eliminate boilerplate code: developers no longer need to manually inject `TreeBuilder` or `EntityStorage` every time they want to spawn or destroy a UI element.

## How it works

1. **Initialization:** A developer calls `instantiate(Factory, options)`. This function creates a blank `View` builder instance and passes it into the user-defined `ViewFactory` callback.
2. **Configuration:** Inside the factory, the developer defines the tree structure by calling methods like `view.ofType(Sprite).position(x,y).addChild(...)`. Each method mutates the builder's internal state and returns `this` to continue the chain.
3. **Schema Generation:** After the factory executes, `instantiate` automatically calls `view.create()`. This method outputs the final Plain Old JavaScript Object (POJO) of type `TreeNode` with all its nested children.
4. **Materialization:** The generated schema, combined with positioning and parent data from the `options`, is passed directly to `TreeBuilder.create(...)`, which synchronously returns a fully constructed ECS `PixiEntity`.
5. **Destruction:** When the UI object is no longer needed, `deinstantiate(entity)` is called. This method delegates the teardown to `EntityStorage.destroyEntity()`, ensuring memory cleanup and signal detachment.

## Interesting design decisions

### 1) Fluent Builder Pattern

All node configuration methods (from `.alpha()` to `.interactive()`) return a reference to the current `View` instance.
_Result:_ Allows developers to describe complex, multi-level interfaces in a single continuous expression (chaining). This makes the UI code highly declarative, readable, and compact.

### 2) Pure Config Generation (State/Render Isolation)

The `View` class knows absolutely nothing about instantiating real `PIXI.Container` objects. Its sole responsibility is to compile a valid abstract DTO schema (`TreeNode`).
_Result:_ Complete separation of data preparation and rendering. Configurations can be cached, tested in isolation from PixiJS, or easily modified before they are ever drawn.

### 3) Deep Configuration Overrides

The `View` builder provides `overrideConfig` and `updateConfig` methods that recursively search for a node by its name (`deepFindChild`) and allow modifying its properties post-creation.
_Result:_ Enables a Prefab composition pattern. If there is a base "Button" factory, it can be used inside another factory, and the developer can pinpoint and override just the icon texture without rewriting the entire button structure from scratch.

### 4) Built-in `Ref` Integration

The builder includes `.ref(Ref)` and `.refCollection(RefCollection)` methods that automatically bind the generated configuration to global references from the `shared` layer.
_Result:_ Game systems do not need to perform expensive traverses of the PixiJS scene graph to find an interactive element. The UI node registers itself to the requested reference exactly at the moment of creation.

## Public contracts in this feature

- **Classes:**
    - `View`: The fluent builder for `TreeNode` configurations.
- **Functions:**
    - `instantiate<T>`: A facade for generating a schema and building the ECS entity.
    - `deinstantiate`: A facade for safely destroying a UI entity from the ECS.
- **Interfaces & Types:**
    - `ViewFactory<T>`: The signature for a custom UI factory callback.
    - `InstantiateOptions<T>`: Instantiation arguments, including parent linking and initial coordinates.
    - `IParentable`: Contract for specifying a parent `PixiEntity`.

## Current scope and boundaries

- **In Scope:** Providing a Domain-Specific Language (DSL) for describing PixiJS nodes, mutating and deeply overriding `TreeNode` configurations, and encapsulating `TreeBuilder`/`EntityStorage` calls for lifecycle management.
- **Out of Scope:** Parsing the generated schema and creating the actual PixiJS objects (this is strictly the responsibility of the `tree-builder` layer).
- **Out of Scope:** Attaching game logic. `instantiate` returns a "naked" `PixiEntity`. Populating it with ECS components (like health, damage, or specific controllers) is the responsibility of the calling business logic.


---
sidebar_position: 1
sidebar_label: "ref"
---

# Feature: `shared/ref`

## What this feature does

The `ref` feature provides a global, string-based registry for indirect object referencing. It consists of two primary generic primitives: `Ref<T>` for individual objects and `RefCollection<T>` for groups of objects. These utilities allow dynamically created objects (such as UI nodes or entities) to be registered by a unique string ID and retrieved from anywhere in the application without passing direct memory references.

## Why this feature exists

In a declarative UI architecture (like `empr.es-lienzo`'s `TreeBuilder`), the creation of a visual hierarchy is decoupled from the ECS logic that drives it. Systems need to access specific view nodes (e.g., a "submit-button" or "hero-sprite") to modify state or attach components.

If systems were forced to traverse the PixiJS scene graph to find these nodes, it would tightly couple game logic to layout structure, creating brittle and hard-to-maintain code. `Ref` solves this by decoupling instantiation from retrieval: the view layer assigns a registered `Ref` during construction, and the logic layer requests that `Ref` by its string ID.

## How it works

1. **Registration:** A reference container is initialized globally using the static factory methods `Ref.create<T>(name)` or `RefCollection.create<T>(name)`. This stores the container in an encapsulated static `Map`.
2. **Assignment:** During the object's construction phase (e.g., when building a node in `View`), the instantiated object is assigned to the reference via the `ref.item` setter (or `refCollection.push(item)`).
3. **Retrieval:** Elsewhere in the application (typically within a `System`), logic calls `Ref.get<T>(name)` to access the container and reads its `.item` property to interact with the object.
4. **Cleanup:** References can be emptied (`.clear()`) or entirely removed from the global registry (`.remove(name)`) when the view is destroyed.

## Interesting design decisions

- **Static Registry Pattern:** Relying on static maps (`_refs`) inside the class definitions provides a zero-configuration global namespace. This avoids the need to inject a centralized lookup service down the entire View tree, keeping the declarative UI builder API clean and fluent.
- **Strictly Generic Boundaries:** Despite being heavily utilized to store `PixiEntity` instances, `Ref` and `RefCollection` rely entirely on generic types (`<T>`). They hold zero knowledge of ECS components, systems, or PixiJS objects, strictly adhering to the `shared` layer rule of remaining framework- and renderer-agnostic.
- **Fail-Fast Access:** The `Ref.item` getter explicitly throws an error (`Item not found`) if accessed before the underlying object is set. This prevents silent, cascading null-reference bugs in systems that execute under the assumption that a view node is fully initialized.
- **Segregation of Singular and Collection Types:** Splitting the functionality into `Ref` and `RefCollection` (rather than a single complex class) keeps the API surface explicit. It prevents accidental overwrites when a layout naturally groups multiple identical elements (e.g., inventory slots or a list of menu buttons).

## Public contracts in this feature

- `class Ref<T>`
    - Static: `create<T>(name: string): Ref<T>`
    - Static: `get<T>(name: string): Ref<T> | undefined`
    - Static: `remove(name: string): void`
    - Instance: `get item(): T` / `set item(item: T)`
    - Instance: `clear(): void`

- `class RefCollection<T>`
    - Static: `create<T>(name: string): RefCollection<T>`
    - Static: `get<T>(name: string): RefCollection<T> | undefined`
    - Static: `remove(name: string): void`
    - Instance: `get items(): T[]`
    - Instance: `push(item: T): void`
    - Instance: `clear(): void`

## Current scope and boundaries

- **In Scope:** Global string-based mapping, safe generic storage of object references, and grouping of multiple references under a single key.
- **Out of Scope:** Memory management and lifecycle handling. `Ref` does not know when to destroy an entity or free memory; that is the strict responsibility of the ECS `LifecycleTracker` or the Scene manager. It also has no concept of scene graphs or renderer-specific types.


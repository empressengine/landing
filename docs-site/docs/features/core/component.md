---
sidebar_position: 1
sidebar_label: "component"
---

# Feature: `core/component`

## What this feature does

The `component` module defines the fundamental structural types for components within the `empr.es` ECS architecture. It provides the `Component` and `ComponentType` contracts, which describe the shape of data containers. There is zero runtime logic in this module—it consists entirely of type-level contracts that form the absolute foundation of the `core` layer's dependency graph.

## Why this feature exists

In a strict ECS architecture, data must be entirely decoupled from logic (behavior). For the framework's kernel (entities, queries, systems) to operate correctly, it needs a unified contract defining what constitutes a "Component."

At the same time, it was critical to avoid heavyweight inheritance (e.g., forcing developers to extend an `abstract class BaseComponent`). By eliminating base classes, components remain incredibly lightweight, easily serializable, and strictly adhere to the "Plain Old Data" (POD) paradigm. This module solves the problem of strictly typing these independent data containers at the TypeScript level.

## How it works

1. **Structure Definition (Design time):**
   A developer creates a standard TypeScript class containing only properties (no methods). The `Component` type structurally guarantees that the framework conceptually recognizes this class as a valid component.

2. **Identification (Type/Runtime time):**
   The `ComponentType<T>` type acts as a constructor token. Framework internals (such as `EntityIndexator` or `EntityQuery`) use this token to identify component types during filtering and instantiation.

3. **Hidden Augmentation (Runtime - Entity layer):**
   Although the component class itself is pure and lacks base properties, the framework dynamically mixes additional properties into the component instance when it is attached to an entity (via `Entity.addComponent`):
    - An `entity` reference — a pointer back to the owning entity.
    - A `Disposable` object — a lifecycle management context that allows for proper resource cleanup when the component is destroyed.

## Interesting design decisions

### 1) Zero-Inheritance (No Base Class)

Components are defined via a type alias (`type Component = object & ...`) rather than an `abstract class Component`.
_Result:_ Developers do not need to call `super()`, components carry zero memory overhead beyond their own fields, they are trivial to serialize/deserialize, and they strictly remain pure data containers.

### 2) Array Prevention via `length?: never`

The `Component` type includes a specific constraint: `{ length?: never; constructor: any }`.
_Result:_ This is an elegant TypeScript type-system hack that prevents arrays or strings from being passed where a component is expected. The framework strictly guarantees that a component is an instantiable object, not an iterable collection.

### 3) Dynamic Context Mixins over Inheritance

The `entity` reference and `Disposable` lifecycle methods do not require explicit declaration within the user's component class. Instead, they are injected "under the hood" by the entity when attached.
_Result:_ This preserves the purity of the domain model. A component knows absolutely nothing about the ECS infrastructure until it is mounted to an entity. This maintains the zero-coupling requirement of the `component` module regarding other framework layers.

## Public contracts in this feature

- `Component` (Type) — The base structural type for a component instance.
- `ComponentType<T>` (Type) — The constructor contract used to identify and instantiate a component class.

## Current scope and boundaries

- **Logic boundaries:** This module contains **only** type definitions. There is no runtime implementation or executable code.
- **Coupling boundaries:** This module sits at the very bottom of the `core` dependency chain. It has **zero internal dependencies**—it does not import from `entity`, `system`, or any other framework module.
- **Domain boundaries:** This module defines abstract framework contracts only. It does not (and should not) contain game-specific or business-logic components (e.g., no `Position` or `Health` classes belong here).


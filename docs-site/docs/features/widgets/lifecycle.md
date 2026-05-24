---
sidebar_position: 2
sidebar_label: "lifecycle"
---

# Feature: `widgets/lifecycle`

## What this feature does

The `lifecycle` module provides automated resource lifetime tracking and cleanup tied to the destruction of specific contexts or entities. It centralizes subscription management through the `LifecycleTracker`, which collects `Disposable` objects and flushes them when their bound owner is destroyed. Additionally, it provides `TrackedSignal`, a decorator over standard `Signal` that automatically tracks and disposes of event subscriptions when the specified owner object dies.

## Why this feature exists

In a highly dynamic ECS architecture, entities and states are constantly created and destroyed. A common source of memory leaks and logic bugs is "dangling listeners"—when an entity subscribes to a global event (like a timer or input signal) but is destroyed without unsubscribing. These orphaned callbacks remain in memory and continue to execute, leading to fatal errors when they attempt to mutate non-existent components.

This feature exists to eliminate manual teardown boilerplate. By binding the lifetime of a subscription (or any `Disposable` resource) directly to an owner object, the framework guarantees that when the owner disappears, all its associated listeners are cleanly severed.

## How it works

1. **Tracker Initialization:** The `LifecycleTracker` is instantiated (or the `SharedLifecycleTracker` singleton is used) and automatically subscribes to the global `OnEntityDestroySignal`.
2. **Resource Tracking:** A developer calls `tracker.track(owner, disposable)`. The tracker stores the `Disposable` in a `Set` mapped to the owner via a `WeakMap`.
3. **Owner Registration (Hybrid Approach):** - If the owner is an `IEntity`, no explicit registration is needed because the tracker already listens to all entity destructions globally.
    - If the owner implements `IContextDisposable` (has an `onDestroy` signal), the tracker subscribes `once` to that signal.
    - If the owner is a plain JavaScript object, the tracker registers it with a `FinalizationRegistry`.
4. **Automated Cleanup:** When the owner is destroyed (or garbage-collected), the tracker retrieves the `Set` of disposables and invokes `.dispose()` on all of them, safely severing the ties.
5. **Tracked Signals:** When using `TrackedSignal.listen(callback, owner)`, the signal calls `super.listen()`, retrieves the resulting `Disposable`, and automatically feeds it to the `LifecycleTracker` (resolved via Dependency Injection) along with the provided owner.

## Interesting design decisions

### 1) Hybrid Deterministic & GC-Fallback Cleanup

The `LifecycleTracker` does not rely solely on the Garbage Collector (`FinalizationRegistry`).
_Result:_ For known framework objects like `IEntity` and `IContextDisposable`, cleanup is strictly deterministic and synchronous upon destruction. This prevents logic bugs where a "destroyed" entity might still receive an event simply because the GC hasn't run yet. The `FinalizationRegistry` acts as a safety net for generic objects.

### 2) Drop-in Replacement via Implicit DI

`TrackedSignal` extends the base `Signal` but needs access to the `LifecycleTracker` to function. Instead of forcing developers to pass the tracker into the constructor (which would break the `new TrackedSignal()` signature everywhere), it retrieves the tracker dynamically using `Dependency.instance.inject(LifecycleTracker)`.
_Result:_ Developers can seamlessly replace `new Signal()` with `new TrackedSignal()` in existing codebases without refactoring constructor arguments or class properties.

### 3) Non-Invasive Context Augmentation

The `LifecycleTracker.createDisposable<T>(target)` method uses `Object.defineProperty` to invisibly mix the `IContextDisposable` interface (an `onDestroy` signal and `dispose()` method) into any plain object.
_Result:_ Developers can bind resources to third-party or generic data objects without forcing those objects to inherit from a specific framework base class, keeping domain models clean.

## Public contracts in this feature

- **Interfaces:** `IContextDisposable`.
- **Classes:** - `LifecycleTracker`.
    - `TrackedSignal<T>`.
- **Instances:** `SharedLifecycleTracker` (singleton fallback).

## Current scope and boundaries

- **Layer Boundaries:** As a `widget`, this module sits above `core` and `shared`. It imports `Entity` and `Dependency` concepts from `core` and `Signal` from `shared`, but it knows nothing about higher-level orchestrators like `Pipelines` or the `FSM` (which reside in `features`).
- **Tracking Boundaries:** The tracker handles the invocation of `.dispose()` but does not dictate _what_ is being disposed. It can manage signal unsubscriptions, `PIXI.Texture` destructions, or `setTimeout` clearances interchangeably, as long as they satisfy the `{ dispose: () => void }` contract.


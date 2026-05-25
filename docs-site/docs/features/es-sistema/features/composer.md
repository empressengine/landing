---
sidebar_position: 1
sidebar_label: "composer"
---

# Feature: `features/composer`

## What this feature does

The `composer` module is the architectural "blueprint" engine of the framework. It provides a fluent API for assembling independent `System` functions into structured execution chains called Pipelines. Its primary role is configuration management: it tracks which systems should run, in what order, under what conditions (`when`), and with what specific data.

Crucially, it supports a "Hook" system that allows external modules to extend or modify existing pipelines by injecting systems at specific points, replacing them, or removing them entirely.

## Why this feature exists

In a large-scale ECS project, hardcoding the execution order of systems inside a single loop leads to a "monolithic update" problem, making the game difficult to extend or debug.

The `composer` exists to:

1. **Decouple Definition from Execution:** It allows a feature to define _what_ logic should happen (the "What") without knowing _when_ or _how_ it will be executed (the "How" is handled by the `Executor`).
2. **Enable Modular Extensibility:** If a core feature defines a "Battle Pipeline," a separate "VFX Feature" can use the composer to inject "SpawnBloodParticlesSystem" into that existing pipeline without modifying the original battle code.
3. **Handle Contextual Data:** It provides a type-safe way to pass specific parameters to systems at the moment they are added to the chain.

## How it works

1. **Initialization:** A `PipelineComposer` is instantiated with a DI container.
2. **System Registration (`use`):** Systems are added sequentially. The composer uses TypeScript generics (`SystemArgs`) to determine if the system requires a data object.
3. **Hooking:** Developers can mark specific points in the pipeline using `.hook(Symbol)`. This creates a named anchor.
4. **Runtime Overrides:** Later, using methods like `.before(hook)`, `.after(hook)`, or `.replace(hook)`, the composer moves its internal insertion cursor. New systems added via `.use()` will then be spliced into the array at the correct relative position.
5. **Conditional Logic:** Each system can be registered with a `when` predicate. If the predicate returns `false` during the assembly phase, the system is omitted from the final execution queue.
6. **Snapshotting:** The composer can generate an `IComposerSnapshot`. This is a light, serializable representation of the pipeline used for debugging execution flows without passing raw function references.
7. **Repeat Expansion (`times`):** A system can be marked to execute N times total via `.times(N)`. The composer eagerly expands this into N flat providers at composition time — no loop logic is added to the executor. Clones share the same System, data, when-predicate, and required flag. Each clone receives an auto-generated hook (`ORIGINAL_N`) for debug visibility. Internally, `_repeatGroups` maps the original hook to its clone hooks, enabling group-aware `remove()` and `replace()` operations.

## Interesting design decisions

### 1) Symbol-Based Hooks for Unique Anchors

The composer uses `Symbol` as the key for hooks.
_Result:_ This guarantees that hooks are unique and prevents naming collisions. Even if two different features try to define a hook named "AfterUpdate," they will not conflict if they use different Symbols, ensuring robust third-party extension support.

### 2) The "Required" Safety Guard

A system can be marked as `required: true` during registration.
_Result:_ If an external override attempts to delete or replace a required system, the composer throws a `providerRequiredError`. This protects critical framework logic (like physics or state cleanup) from being accidentally broken by high-level feature extensions.

### 3) Automatic ExecutionContext Generation

For every registered system, the composer automatically generates a unique `executionContext` string based on the system name and an internal counter.
_Result:_ This string is passed down to the `Executor` and finally to `EntityStorage`. It allows the storage to uniquely identify and cache reactive `EntityQuery` objects specifically for that single step in the pipeline, maximizing performance.

### 4) Type-Safe Optional Data via `SystemArgs`

The composer uses a conditional type `SystemArgs` to inspect the `System` function's generic parameter.
_Result:_ If a System does not take data (e.g., `System<void>`), the `.use()` method allows omitting the second argument. If data is required, TypeScript enforces its presence. This provides a clean, "no-boilerplate" developer experience.

### 5) Eager Expansion for `times()` Instead of Executor-Level Loops

When `.times(N)` is called, the composer immediately inserts N-1 cloned providers into `_providers` at composition time.
_Result:_ The executor remains unchanged — it sees a flat queue of providers and processes them sequentially as before. This preserves the single-responsibility boundary: the composer is a pure builder, the executor is a pure runner. Debug tools (`debug()`, `getSnapshot()`) show the real execution plan with no hidden repetitions.

### 6) Repeat Groups as an Atomic Unit

Clones created by `times()` are tracked as a group via `_repeatGroups`. When `remove()` or `replace()` targets the original hook, the operation cascades to all clones.
_Result:_ Users never need to know or manage clone hooks directly. The group behaves as a single logical unit for pipeline mutations, while remaining physically flat in the execution queue for maximum transparency.

## Public contracts in this feature

- **Classes:** `PipelineComposer`.
- **Interfaces:** `ISystemProvider`, `IComposerSnapshot`, `IProvider<T>`.
- **Types:** `PipelineFactory`, `PipelineProps`, `FSMPipelineProps`.
- **Systems:** `pipelineCallback` (a utility system for injecting ad-hoc logic into a chain).

## Current scope and boundaries

- **Execution Boundary:** The `composer` is strictly a **builder**. It does not execute systems. It produces a list of `ISystemProvider` objects which must be handed over to an `Executor` to run.
- **Dependency Boundary:** It manages its own internal DI registrations for systems but relies on the global `Dependency` container for the underlying services.
- **FSM Integration:** It provides specialized props (`FSMPipelineProps`) for state machine transitions, allowing the `fsm` module to initiate pipelines during state changes.


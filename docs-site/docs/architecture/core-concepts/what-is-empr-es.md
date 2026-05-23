---
slug: /
---

# What is empr.es?

`empr.es` is a modular TypeScript framework for building browser game architecture around explicit runtime execution instead of renderer-driven logic.

At a high level, the framework separates four concerns that are traditionally mixed together in browser game projects:

- runtime state,
- gameplay logic,
- execution flow,
- and rendering.

In many browser games these responsibilities gradually collapse into the renderer layer itself. A PixiJS container starts owning gameplay state. Animation callbacks begin controlling flow transitions. Input handlers mutate unrelated systems directly. Lifecycle management becomes spread across scene objects, timers, listeners, tweens and asynchronous callbacks.

This approach works surprisingly well during early prototyping. The problem appears later, when the project becomes large enough that runtime behavior is no longer easy to reason about.

At that point teams usually begin experiencing the same architectural symptoms:

- logic becomes tightly coupled to rendering objects,
- execution order becomes implicit,
- lifecycle ownership becomes difficult to track,
- runtime side-effects become unpredictable,
- and debugging requires understanding multiple unrelated systems simultaneously.

`empr.es` exists to address this problem.

The framework treats rendering as an integration layer around a dedicated architectural runtime instead of treating rendering as the architecture itself.

---

# The Core Idea

The central idea behind `empr.es` is simple:

> browser games benefit from explicit runtime architecture in the same way backend systems benefit from explicit application architecture.

The framework is built around the Entity-Component-System model, but it is intentionally broader than a traditional ECS library.

The core runtime includes:

- entities and components,
- indexed entity storage and filtering,
- dependency injection,
- finite state machines,
- typed signals,
- reactive state management,
- lifecycle tracking,
- object pooling,
- and runtime execution coordination.

These systems are designed to work together as a coherent runtime model rather than as unrelated utilities.

For example, signals are not only event emitters — they participate in runtime flow orchestration. Object pooling is not only a memory optimization — it integrates with entity lifecycle visibility. FSM is not only a state container — it acts as a high-level runtime flow controller. Execution stacks are not hardcoded into the core — they remain replaceable architectural layers.

The framework intentionally prioritizes architectural clarity over implicit convenience.

---

# Why Rendering-Centric Architecture Becomes a Problem

Most browser game stacks begin with a renderer because rendering is the first visible part of the game.

A typical project often evolves roughly like this:

```txt
Pixi Container
    ↓
Input Logic
    ↓
Gameplay State
    ↓
Animation Coordination
    ↓
Flow Control
    ↓
Networking Side Effects
    ↓
Global Runtime Ownership
```

Over time the renderer stops being only a visual layer and becomes the place where nearly all runtime behavior is coordinated.

The issue is not PixiJS itself. The issue is that rendering objects are rarely designed to become the primary architectural abstraction for long-running gameplay systems.

This becomes especially problematic in projects with:

- complex gameplay flows,
- deterministic requirements,
- reusable runtime systems,
- server-driven outcomes,
- long-lived sessions,
- replay tooling,
- or multiple teams working simultaneously on the same runtime.

`empr.es` separates simulation from rendering so that gameplay architecture can evolve independently from visual technology.

---

# What the Framework Actually Provides

The core package `@empr/es` provides the architectural runtime itself.

This includes:

## Entity Runtime

Entities act as runtime composition containers.

They do not contain gameplay behavior internally. Instead, they aggregate Components that describe state.

Components are intentionally lightweight and data-oriented. The framework architecture assumes that behavior should remain externalized and executable through explicit runtime systems.

This separation is important because it allows execution flow to remain inspectable instead of being distributed across hidden object methods.

---

## EntityStorage and Filtering

`EntityStorage` acts as the runtime registry for all active entities.

Rather than scanning every entity every frame, the storage layer maintains component-based indexes used by Systems and execution flows to query only the entities relevant to a particular operation.

This becomes especially important in projects where gameplay logic is heavily data-driven.

The storage layer also participates in lifecycle visibility management. Pooled entities can temporarily leave runtime visibility without being destroyed entirely.

---

## Dependency Injection

`empr.es` includes a built-in runtime dependency container.

The DI system exists because large gameplay architectures eventually accumulate services that should not depend on global singletons or renderer-owned state.

Services can be:

- globally registered,
- scoped to execution contexts,
- overridden per runtime flow,
- or injected directly into Systems and execution handlers.

The goal is not abstraction for its own sake, but controlled runtime ownership.

---

## FSM and Runtime Flow

One of the core architectural ideas in `empr.es` is that gameplay flow should remain explicit.

Instead of allowing transitions to emerge implicitly from animation callbacks, timers and asynchronous chains, the framework provides a dedicated FSM layer for high-level runtime orchestration.

Typical examples include:

```txt
Boot
→ Loading
→ Scene Initialization
→ Idle
→ Spin
→ Stop
→ Win Presentation
→ Bonus
→ Recovery
```

The FSM layer is intentionally integrated with execution stacks and signal flow instead of existing as an isolated utility.

---

## Signals and Execution Bridging

Signals in `empr.es` are typed runtime communication primitives.

However, they are also used as execution initiators.

A signal may:

- notify systems,
- trigger execution flows,
- coordinate asynchronous runtime behavior,
- or bridge isolated runtime layers.

Unlike lightweight event emitters, the framework signal model supports asynchronous completion semantics. This allows runtime orchestration to await signal-driven execution safely when required.

This becomes especially useful in gameplay flows where execution ordering matters.

---

## Lifecycle Ownership

Long-running browser games frequently suffer from runtime ownership problems.

Typical examples include:

- listeners surviving destroyed objects,
- subscriptions leaking across scene transitions,
- pooled objects remaining partially active,
- asynchronous callbacks mutating dead runtime state,
- or renderer objects remaining referenced after disposal.

`empr.es` treats lifecycle ownership as a first-class architectural concern.

The framework provides:

- lifecycle tracking,
- tracked subscriptions,
- controlled disposal,
- pool-aware entity visibility,
- and execution ownership boundaries.

This reduces the amount of implicit runtime behavior hidden inside unrelated systems.

---

# Execution Stacks

One of the most important architectural decisions in `empr.es` is that the core runtime does not hardcode a single execution model.

The framework separates the runtime kernel from the execution stack.

This allows different architectural styles to coexist on top of the same core runtime.

## ECS Execution — `@empr/es-sistema`

The default execution stack uses Systems, Pipelines and Executors.

In this model:

- Components describe state,
- Systems contain behavior,
- and Pipelines define ordered execution flow.

This approach is particularly useful for projects where runtime behavior benefits from explicit deterministic flow.

Examples include:

- slot mechanics,
- server-driven gameplay,
- simulations,
- replay systems,
- and large-scale reusable gameplay logic.

The important detail is that execution remains visible.

A Pipeline explicitly defines what runs, in what order, and under what runtime initiator.

---

## Component Driven Execution — `@empr/es-componente`

The alternative execution stack supports a Component Driven architecture.

This model is designed for teams that prefer scene-oriented runtime structure.

However, unlike Unity-style architectures, Components themselves are not expected to contain hidden lifecycle execution.

Instead:

- scene-owned components describe structure and state,
- while orchestrators and runtime services coordinate execution externally.

The goal is to preserve explicit runtime flow while allowing a more object-oriented organizational model.

---

# Renderer Agnostic by Design

The `@empr/es` core package contains no dependency on:

- PixiJS,
- ThreeJS,
- DOM rendering,
- Canvas APIs,
- or browser rendering infrastructure.

This is a deliberate architectural constraint.

The framework assumes that gameplay simulation should remain portable across environments.

Because of this separation, the same runtime architecture can theoretically operate:

- in the browser,
- in Node.js,
- in deterministic tests,
- in replay tooling,
- in editor tooling,
- or in server-side validation systems.

The official PixiJS integration is provided through `@empr/es-lienzo`, which connects the architecture runtime with:

- Pixi entities,
- asset loading,
- interactions,
- Spine animation control,
- GSAP integration,
- responsive layout,
- and renderer lifecycle synchronization.

Importantly, this integration layer extends the runtime — it does not redefine the architecture.

---

# What empr.es Optimizes For

`empr.es` is not optimized primarily for minimal boilerplate or rapid prototyping.

The framework is designed for projects where runtime complexity grows over time.

This includes projects where:

- gameplay systems become interconnected,
- execution order matters,
- multiple developers work simultaneously on the runtime,
- debugging and observability become important,
- runtime ownership must remain safe,
- and architectural consistency matters more than short-term convenience.

As a result, the framework intentionally favors:

- explicit execution,
- clear runtime boundaries,
- controlled lifecycle ownership,
- architecture composability,
- and deterministic flow organization.

Some architectural decisions may initially feel stricter than renderer-centric approaches. The tradeoff is that runtime behavior remains significantly easier to reason about as the project evolves.

---

# What empr.es Is Not

Understanding what the framework intentionally does not provide is important.

`empr.es` is not:

- a renderer,
- a monolithic engine,
- a visual editor,
- a physics engine,
- an audio engine,
- or a complete game production suite.

Instead, it acts as an architectural runtime foundation around which rendering, tooling and gameplay systems can be built.

This distinction matters because many design decisions inside the framework only make sense when viewed through the lens of runtime architecture rather than through the lens of a traditional all-in-one game engine.

---

# Related Articles

- ECS in empr.es
- Entity and Component Model
- EntityStorage and Component Filtering
- Systems
- Pipelines
- Signal and SignalService
- FSM and Runtime Flow
- ECS vs Component Driven
- Renderer Agnostic Architecture
- Official PixiJS Runtime (`@empr/es-lienzo`)

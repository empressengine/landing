---
sidebar_position: 2
sidebar_label: "executor"
---

# Feature: `features/executor` (`@empr/es-sistema`)

## What this feature does

The `executor` module hosts the **ECS pipeline runtime** for `empr.es`: `Executor` creates `Pipeline` instances from `PipelineFactory` callbacks, runs systems sequentially, manages pause/resume/stop across concurrent pipelines, and emits `OnPipelineExecutionStartSignal` / `OnPipelineExecutionEndSignal` with per-system metrics.

`ExecutorComposerRegistry` extends `ExecutionRegistry<PipelineFactory<any>>` so `FSMService`, `SignalService`, and Pixi `InteractionService` can share one typed entry point after `useECSBackend(app)`.

`SignalService` itself is **not** part of this module — it lives in `@empr/es` (`features/signal-service`) and only *calls into* the registry implemented here.

## Why this feature exists

`PipelineComposer` (sibling `features/composer` folder) describes *what* should run. Something must own *when* pipelines start, how async systems interleave, how `EntityStorage` receives execution-scoped filters, and how pause/resume from `UpdateLoop` propagates. That orchestration is the executor's job.

## How it works

1. **Factory execution:** `Executor.create(factory, data, initiator, name)` constructs a fresh `PipelineComposer`, invokes `factory({ pipeline, inject, ...data })`, then wraps the snapshot in a `Pipeline`.
2. **Run:** `run(id)` drains the pipeline's provider queue, awaiting async systems when allowed, and participates in `AbortController` semantics when a pipeline is stopped mid-flight.
3. **Concurrency map:** Active pipelines live in a `Map` keyed by execution id; `pauseAll` / `resumeAll` coordinate with `UpdateLoop` via `useECSBackend`.
4. **Registry adapter:** `ExecutorComposerRegistry.create/run/stop` forward to the injected `Executor` instance registered in DI.

## Interesting design decisions

### 1) Composer per create

Each `create` spins up a dedicated `PipelineComposer` bound to the global `IDependency`.

_Result:_ Factories cannot accidentally reuse half-built composers across executions; each run is isolated.

### 2) Signals for fine-grained telemetry

`OnPipelineExecutionStartSignal` / `OnPipelineExecutionEndSignal` fire around every system.

_Result:_ Application-level services (metrics, custom recorders, tests) can subscribe without forking executor internals.

### 3) Registry indirection

`ExecutorComposerRegistry` subclasses `ExecutionRegistry` instead of exposing raw executor methods everywhere.

_Result:_ `FSMService` / `SignalService` / `InteractionService` depend on one abstraction, keeping `@empr/es` free of `@empr/es-sistema` imports.

## Public contracts in this feature

- **Classes:** `Executor`, `Pipeline`, `ExecutorComposerRegistry`.
- **Interfaces / types:** `IExecution` (and related executor types).
- **Signals:** `OnPipelineExecutionStartSignal`, `OnPipelineExecutionEndSignal`.

## Current scope and boundaries

- **In scope:** Running `System` functions produced by `PipelineComposer`, lifecycle of `Pipeline` instances, registry facade.
- **Out of scope:** `SignalService` ( lives in `@empr/es` ); FSM graph logic (`@empr/es` `fsm`); rendering (`@empr/es-lienzo`).
- **History / DVR / Flow:** Not bundled here; apps may subscribe to executor signals and build their own tooling.


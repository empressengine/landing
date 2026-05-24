---
sidebar_position: 1
title: "@empr/es-sistema"
---

# @empr/es-sistema

![version](https://img.shields.io/badge/version-0.9.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6%2B-3178c6?logo=typescript&logoColor=white)
![license](https://img.shields.io/badge/license-Proprietary-lightgrey)

**Default ECS execution stack for [@empr/es](../)** — `PipelineComposer`, `Executor`, `System` / `SystemProps`, and bootstrap wiring (`useECSBackend`).

This package does **not** replace the ECS kernel (entities, components, storage still come from `@empr/es`). It adds the **pipeline runtime** and a registry adapter so `FSMService`, `SignalService`, and `@empr/es-lienzo`'s `InteractionService` can share one `ExecutionRegistry`.

---

## When to use

- You want classic **ECS systems as functions** composed with `PipelineComposer.use(...)`.
- You need `Executor.create` / `run` / `pauseAll` integrated with `UpdateLoop` and the global DI container created by `Empr` or `EmprLienzo`.

For **component-driven** orchestration instead, use `@empr/es-componente` — do **not** install both execution stacks in one app.

---

## Installation

```bash
npm install @empr/es @empr/es-sistema
```

Peer dependencies mirror renderer stacks (`@empr/es-lienzo`, Pixi, GSAP, …) so TypeScript resolves optional integrations; you only pay them at runtime if your app already depends on those packages.

---

## Wiring (`useECSBackend`)

Call **after** `empr.init()` (and typically after `EmprLienzo` construction + `init()` in browser games):

```typescript
import { Empr } from '@empr/es';
import { Executor, useECSBackend } from '@empr/es-sistema';

const empr = new Empr();
empr.init();
useECSBackend(empr);

const executor = empr.dependency.inject(Executor);
```

Effects:

1. Constructs `Executor` bound to `EntityStorage` + `IDependency`.
2. Builds `ExecutorComposerRegistry` and assigns it to `FSMService` + `SignalService` via `setExecutionRegistry`.
3. Hooks `UpdateLoop` pause/resume to `executor.pauseAll` / `resumeAll`.
4. Re-registers `SignalService` in DI (factory) so it picks up the registry.

**Pixi input:** still call `InteractionService.setExecutionRegistry(executor)` (see reference app below).

---

## TypeScript: `PipelineFactory` in registries

Augment `@empr/es` so `SSFlowAliasType` / FSM flow aliases resolve to `PipelineFactory`:

- Reference: `apps/slot-client/src/app/types/empr-es.d.ts`

---

## Reference implementation

Full game bootstrap (ECS + Lienzo + interaction wiring):

- `apps/slot-client/src/app/bootstrap/empr.game.ts`

Package boundary rules (Nx tags, no dependency on `@empr/es-componente`):

- `docs/plans/2026-04-28-empr-es-sistema-es-componente-design.md` (internal monorepo design doc)

---

## License

Proprietary. All rights reserved.


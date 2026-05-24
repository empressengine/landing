---
sidebar_position: 1
title: "@empr/es-componente"
---

# @empr/es-componente

**Component-driven execution stack for [@empr/es](../)** — alternative to [@empr/es-sistema](../es-sistema/).

Swap packages at the application layer: **never** stack `es-sistema` and `es-componente` together. Both satisfy the same `ExecutionRegistry` contract consumed by `FSMService`, `SignalService`, and (with typings) `InteractionService`.

---

## Positioning

- **Data & scene graph** still live in `@empr/es` + `@empr/es-lienzo` (`NodeEntity` / `PixiEntity`, components as plain data).
- **Orchestration** walks **scene-owned components** (`EmprComponent` hierarchy) instead of `PipelineComposer` + `System` functions — **without Unity-style lifecycle hooks** on those components; logic stays in orchestrators / services you control.

---

## Installation

```bash
npm install @empr/es @empr/es-componente
```

Peers align with renderer integrations the same way as `@empr/es-sistema` (see `package.json`).

---

## Wiring (`useCDBackend`)

After `EmprLienzo.init()` (or base `Empr.init()`), resolve a **scene root** (`Scene` from lienzo implements `SceneRootSource`) and call:

```typescript
import { EmprLienzo, InteractionService, Scene } from '@empr/es-lienzo';
import { ExecutorOrchestratorRegistry, useCDBackend } from '@empr/es-componente';

// empr.init() first
const scene = empr.dependency.inject(Scene);
useCDBackend(empr, scene);

const registry = empr.dependency.inject(ExecutorOrchestratorRegistry);
empr.dependency.inject(InteractionService).setExecutionRegistry(registry);
```

This registers `ComponentDrivenExecutor`, `DependencyComponentDriven`, `OrchestratorCache`, and the orchestrator-backed execution registry.

---

## TypeScript augmentations (CD sample)

Component node alias + core + lienzo registries:

- `apps/slot-cd-client/src/app/types/empr-es.componente.d.ts`
- `apps/slot-cd-client/src/app/types/empr-es.d.ts`
- `apps/slot-cd-client/src/app/types/empr-es.lienzo.d.ts`

---

## Reference implementation

- `apps/slot-cd-client/src/app/bootstrap/empr.game.ts`

Design constraints (Nx, peer graph):

- `docs/plans/2026-04-28-empr-es-sistema-es-componente-design.md` (internal monorepo design doc)

---

## License

Proprietary. All rights reserved.


---
sidebar_position: 41
sidebar_label: "interaction-service"
---

# API: `widgets/interaction-service`

Public entry point for the feature. Import from the widgets barrel or the feature index.

```typescript
import {
  InteractionService,
  IListener,
  InteractionProps,
  ISFlowAliasType,
  LienzoTypeRegistry,
} from '@empr/es-lienzo';
// or
import { InteractionService } from './widgets/interaction-service';
```

| Export | Source | Description |
|--------|--------|-------------|
| `InteractionService` | `interaction.service.ts` | ECS-reactive Pixi pointer events → `ExecutionRegistry` flows |
| `IListener` | `interaction.types.ts` | Map of event type → flow factory (typing helper) |
| `InteractionProps` | `interaction.types.ts` | Alias for app-resolved flow factory type |
| `ISFlowAliasType` | `interaction.types.ts` | Conditional flow type from `LienzoTypeRegistry` augmentation |
| `LienzoTypeRegistry` | `interaction.types.ts` | Empty interface for module augmentation |

**Related types (not re-exported here):**

| Type | Source | Description |
|------|--------|-------------|
| `IInteraction` | `features/tree-builder` | Pipeline payload: `{ type: PixiEventType; entity: PixiEntity }` |
| `PixiEventType` | `features/tree-builder` | Union of Pixi pointer / mouse / touch / wheel event names |

**Dependencies:**

| Package / module | Symbols |
|------------------|---------|
| `@empr/es` | `ExecutionRegistry`, `EntityIndexator`, `OnEntityAddComponentSignal`, `OnEntityRemoveComponentSignal`, `Component`, `ComponentType`, `IEntity` |
| `pixi.js` | `Container` (interactivity target) |
| `../../core/entity` | `PixiEntity` |
| `../../features/tree-builder` | `IInteraction`, `PixiEventType` |

**Execution backend (app-wired):** `ExecutionRegistry` implementation — e.g. `Executor` (`@empr/es-sistema`) or orchestrator registry (`@empr/es-componente`). See [`@empr/es` `core/execution-registry`](/docs/api/es/core/execution-registry).

---

## Flow typing: `LienzoTypeRegistry` / `ISFlowAliasType`

The service does not hard-code `PipelineFactory` or orchestrator types. Apps augment `LienzoTypeRegistry` so `ISFlowAliasType<IInteraction>` resolves to the host flow factory.

```typescript
// apps/slot-client/src/app/types/empr-es.lienzo.d.ts
import '@empr/es-lienzo';
import { PipelineFactory } from '@empr/es-sistema';
import { IInteraction } from '@empr/es-lienzo';

declare module '@empr/es-lienzo' {
  interface LienzoTypeRegistry {
    ISFlowAliasType: PipelineFactory<IInteraction>;
  }
}
```

| Without augmentation | `ISFlowAliasType<IInteraction>` resolves to `never` — `listen()` factories will not type-check. |
|---------------------|----------------------------------------------------------------------------------------------|

```typescript
export type ISFlowAliasType<TData extends IInteraction> =
  LienzoTypeRegistry<TData> extends { ISFlowAliasType: infer TFlow }
    ? TFlow
    : never;

export type InteractionProps = ISFlowAliasType<IInteraction>;
```

---

## `IInteraction` (payload)

Defined in `features/tree-builder/tree-builder.types.ts`:

```typescript
interface IInteraction {
  type: PixiEventType;
  entity: PixiEntity;
}
```

Passed as `data` to `ExecutionRegistry.create` when a pointer event fires (alongside Pixi’s native event object in the dispatcher closure — the registry receives `{ entity, type }` only).

---

## `PixiEventType` (full list)

Canonical union from `tree-builder.types.ts`. Use these literals in `InteractionService.listen(component, type, factory)` and in `IInteraction.type`.

Must match a valid `Container.on(eventType, …)` name for the installed **PixiJS v7** build. Global variants (`globalpointermove`, `globalmousemove`, `globaltouchmove`) bubble at the renderer level; prefer pointer events for new UI unless you need legacy mouse/touch names.

### TypeScript definition (copy-paste)

```typescript
type PixiEventType =
  | 'pointercancel'
  | 'pointerdown'
  | 'pointerenter'
  | 'pointerleave'
  | 'pointermove'
  | 'globalpointermove'
  | 'pointerout'
  | 'pointerover'
  | 'pointertap'
  | 'pointerup'
  | 'pointerupoutside'
  | 'mousedown'
  | 'mouseenter'
  | 'mouseleave'
  | 'mousemove'
  | 'globalmousemove'
  | 'mouseout'
  | 'mouseover'
  | 'mouseup'
  | 'mouseupoutside'
  | 'click'
  | 'touchcancel'
  | 'touchend'
  | 'touchendoutside'
  | 'touchmove'
  | 'globaltouchmove'
  | 'touchstart'
  | 'tap'
  | 'wheel'
  | 'rightclick'
  | 'rightdown'
  | 'rightup'
  | 'rightupoutside';
```

### All values (33)

| Group | Event | Typical use |
|-------|-------|-------------|
| **Pointer** | `pointerdown` | Press start (mouse, pen, touch) |
| | `pointerup` | Press end on target |
| | `pointerupoutside` | Press end outside target bounds |
| | `pointercancel` | Interrupted gesture (system cancel) |
| | `pointertap` | Complete tap/click gesture on target |
| | `pointermove` | Move while over target |
| | `globalpointermove` | Move anywhere (renderer-global) |
| | `pointerover` | Enter target hit area |
| | `pointerout` | Leave target hit area |
| | `pointerenter` | Enter target (does not bubble from children) |
| | `pointerleave` | Leave target (does not bubble from children) |
| **Mouse (legacy)** | `mousedown` | Mouse button down |
| | `mouseup` | Mouse button up |
| | `mouseupoutside` | Mouse up outside target |
| | `mousemove` | Mouse move over target |
| | `globalmousemove` | Mouse move globally |
| | `mouseover` | Mouse enter |
| | `mouseout` | Mouse leave |
| | `mouseenter` | Mouse enter (non-bubbling) |
| | `mouseleave` | Mouse leave (non-bubbling) |
| | `click` | Classic click |
| **Touch (legacy)** | `touchstart` | Touch begin |
| | `touchend` | Touch end on target |
| | `touchendoutside` | Touch end outside target |
| | `touchmove` | Touch move |
| | `globaltouchmove` | Touch move globally |
| | `touchcancel` | Touch cancelled |
| | `tap` | Tap gesture |
| **Wheel** | `wheel` | Scroll wheel / trackpad |
| **Right button** | `rightclick` | Context menu / secondary click |
| | `rightdown` | Right button down |
| | `rightup` | Right button up |
| | `rightupoutside` | Right button up outside target |

### Related: `PixiEventMode` (interactivity, not `listen` type)

`InteractionService` sets `container.eventMode` to `'static'` when registering (from `'auto'`). Declarative trees may set mode via `TreeNode` / `View` — union for reference:

| Value | Role (Pixi v7) |
|-------|----------------|
| `'none'` | No interaction |
| `'passive'` | Children interactive; self does not emit |
| `'auto'` | Interactive when parent chain allows (default before service registers) |
| `'static'` | Always participates in hit testing (set by service on register) |
| `'dynamic'` | Interactive + can move without deep bounds recompute |

### Common `listen` choices

| UX | Suggested `PixiEventType` |
|----|---------------------------|
| Button / control tap | `pointertap` or `click` |
| Press / hold start | `pointerdown` |
| Drag start | `pointerdown` + move handling in pipeline |
| Hover enter UI | `pointerenter` or `pointerover` |
| Scrollable area | `wheel` |
| Context menu | `rightclick` |

---

## `IListener`

```typescript
interface IListener {
  types: Map<PixiEventType, ISFlowAliasType<IInteraction>>;
}
```

Documentation-oriented shape; runtime storage uses `InteractionService.subscriptions` (`Map<ComponentType, Map<PixiEventType, factory>>`).

---

## `InteractionService`

Global widget that maps **component presence** + **Pixi event type** → **execution flow**. Listeners attach when the component is added (or already indexed) and detach when it is removed.

**Layer:** `widgets` — may use `core/entity`, `features/tree-builder` types, and `@empr/es` ECS signals/indexator.

### `subscriptions` (getter)

```typescript
get subscriptions(): Map<
  ComponentType<Component>,
  Map<PixiEventType, ISFlowAliasType<IInteraction>>
>
```

| | |
|---|---|
| **Returns** | Live internal `_listen` map (mutable reference) |

Blueprint registry: which component type + event type runs which flow factory.

---

### `setExecutionRegistry(executionRegistry)`

```typescript
setExecutionRegistry(
  executionRegistry: ExecutionRegistry<ISFlowAliasType<IInteraction>>,
): void
```

| Parameter | Description |
|-----------|-------------|
| `executionRegistry` | Backend used in `dispatchEvent` (`create` + `run`) |

**Must be called** before any pointer dispatch (typically in app `setupECS` right after `useECSBackend`).

```typescript
const interactionService = app.dependency.inject(InteractionService);
const executor = app.dependency.inject(Executor);
interactionService.setExecutionRegistry(executor);
```

---

### `init()`

```typescript
init(): void
```

Registers permanent listeners:

| Signal | Action |
|--------|--------|
| `OnEntityAddComponentSignal` | For each `(componentType, eventType)` in `_listen` for `data.type`, call `registerComponentForEvent` |
| `OnEntityRemoveComponentSignal` | Same map → `unregisterComponentForEvent` |

Called once from `EmprLienzo` bootstrap when the service is constructed. No unsubscribe API.

```typescript
const interactionService = new InteractionService();
interactionService.init();
```

---

### `listen(component, type, factory)`

```typescript
listen<T extends Component>(
  component: ComponentType<T>,
  type: PixiEventType,
  factory: ISFlowAliasType<IInteraction>,
): this
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `component` | `ComponentType<T>` | ECS component that must be present for the handler to run |
| `type` | `PixiEventType` | Pixi event name bound on the entity’s `Container` |
| `factory` | `ISFlowAliasType<IInteraction>` | Flow factory passed to `ExecutionRegistry.create` |

| | |
|---|---|
| **Returns** | `this` (fluent chaining) |

**Side effects:**

1. Stores / overwrites `factory` in `_listen` for `(component, type)`.
2. `EntityIndexator.getIndexedEntities(component).forEach` → immediate `registerComponentForEvent` for all entities already indexed with that component.

```typescript
interactionService
  .listen(ClickableComponent, 'pointertap', clickPipeline)
  .listen(ClickableComponent, 'pointerdown', pressPipeline);
```

Multiple component types on the same entity can share the same `eventType`; `dispatchEvent` runs one flow per subscribed component type still present on the entity.

---

## Internal behavior (reference)

### `registerComponentForEvent(entity, component, eventType)`

| Step | Behavior |
|------|----------|
| Resolve target | `entity.getComponent(Container)` — **requires** a `Container` component on the entity (see constraints) |
| Interactivity | `cursor = 'pointer'` if unset; `eventMode = 'static'` if currently `'auto'` |
| Tracking | `WeakMap` `_entityComponentSubscriptions`: per entity → per event → `Set<ComponentType>` |
| Listener | One Pixi `container.on(eventType, dispatcher)` per `(entity, eventType)`; dispatcher calls `dispatchEvent` |

### `unregisterComponentForEvent(entity, component, eventType)`

| Step | Behavior |
|------|----------|
| Remove | Component type from set for that event |
| If set empty | `container.off(eventType, dispatcher)`; remove dispatcher entry |
| If no events left on entity | `cursor = 'auto'`, `eventMode = 'auto'` |

### `dispatchEvent(entity, eventType, data)`

For each `componentType` still subscribed for this event on the entity:

1. `entity.getComponent(componentType)` — must exist at dispatch time.
2. Load `factory` from `_listen`.
3. `await _executor.create(factory, { entity: entity as PixiEntity, type: eventType }, componentType.name, \`${componentType.name}_${eventType}_\`)`
4. `await _executor.run(executionId, true)` — async execution allowed.

Pixi’s raw event `data` is not forwarded into `create`; only `IInteraction` fields are.

---

## Bootstrap sequence (reference)

```text
EmprLienzo constructor
  → new InteractionService()
  → interactionService.init()
  → DI register InteractionService

App setupECS (after useECSBackend)
  → interactionService.setExecutionRegistry(executor)

App (optional, any time before gameplay)
  → interactionService.listen(Component, event, factory)
```

`listen()` is not called inside `es-lienzo` itself; host apps or feature modules register handlers.

---

## Usage patterns

### Wire executor (slot-client)

```typescript
useECSBackend(this._app);
const interactionService = this._app.dependency.inject(InteractionService);
const executor = this._app.dependency.inject(Executor);
interactionService.setExecutionRegistry(executor);
```

### Register click handling for a marker component

```typescript
import { ClickableComponent } from './components/clickable.component';
import { clickFlow } from './flows/click.flow';

interactionService.listen(ClickableComponent, 'pointertap', clickFlow);
```

Entities receive `ClickableComponent` via `TreeNode.components` or runtime `addComponent`; when added, Pixi listener attaches if the entity has a `Container` view.

### Inspect registered blueprints

```typescript
const map = interactionService.subscriptions;
const handlers = map.get(ClickableComponent);
const tapFactory = handlers?.get('pointertap');
```

### Disable interaction via ECS only

```typescript
entity.removeComponent(ClickableComponent);
// OnEntityRemoveComponentSignal → unregister → container.off, cursor/eventMode revert when last handler gone
```

No manual `container.off` in game code.

---

## Semantics and constraints

| Topic | Behavior |
|-------|----------|
| **`Container` requirement** | `registerComponentForEvent` uses `entity.getComponent(Container)` (default `safe: true`). Entities whose view is `Sprite`, `Text`, `Spine`, etc. **without** a `Container` component will throw at registration time. Typical pattern: interactive `Container` nodes with marker components. |
| **Overwrite** | Second `listen(sameComponent, sameEvent, …)` replaces the factory in `_listen`; existing Pixi listeners stay until component remove/re-add. |
| **One Pixi listener per (entity, eventType)** | Multiple component types on the same event share one `container.on`; dispatch iterates all subscribed types. |
| **WeakMaps** | `_entityEventDispatchers` / `_entityComponentSubscriptions` keyed by `IEntity` — no strong retention after entity GC. |
| **Indexator** | `listen()` backfills only entities already indexed for `component`; new entities get listeners via `OnEntityAddComponentSignal`. |
| **No keyboard / gamepad** | Pointer/canvas events only. |
| **Signal listeners** | `init()` listeners are never removed — service lifetime = app lifetime. |
| **`_executor` unset** | Calling `listen` before `setExecutionRegistry` is safe; dispatch fails at runtime if events fire without registry. |
| **Proxy entities** | Works with `EntityStorage` proxy entities; indexator and components behave like standard ECS. |

---

## Internal model (reference)

```
┌──────────────────────────────────────────────────────────────────┐
│  InteractionService                                              │
│  _listen: ComponentType → (PixiEventType → flow factory)         │
│  _entityComponentSubscriptions: WeakMap<Entity, Event→Set<Type>> │
│  _entityEventDispatchers: WeakMap<Entity, Event→dispatcher>      │
│  _executor: ExecutionRegistry                                    │
├──────────────────────────────────────────────────────────────────┤
│  listen() → _listen + indexator backfill + register              │
│  OnEntityAddComponent → register for matching blueprints         │
│  OnEntityRemoveComponent → unregister                            │
│  Pixi container.on → dispatchEvent → executor.create/run         │
└──────────────────────────────────────────────────────────────────┘
```

---

## Related documentation

- `feature_description.md` — WeakMap GC, signal-reactive design, registry-driven flows
- `../../features/tree-builder/tree-builder.types.ts` — `PixiEventType`, `IInteraction`
- Execution bridge: [`@empr/es` `core/execution-registry/API_DOC.md`](/docs/api/es/core/execution-registry)
- Bootstrap: `../../bootstrap/empr.lienzo.ts`
- Source: `interaction.service.ts`, `interaction.types.ts`, export: `index.ts`

## Known consumers (reference)

| Module | Usage |
|--------|--------|
| `bootstrap/empr.lienzo.ts` | `new InteractionService()`, `init()`, DI registration |
| `apps/slot-client/.../empr.game.ts` | `setExecutionRegistry(executor)` |
| `apps/slot-cd-client/.../empr.game.ts` | Same |
| `apps/*/types/empr-es.lienzo.d.ts` | `LienzoTypeRegistry` augmentation for `ISFlowAliasType` |

Host apps register concrete `listen(...)` mappings in processes / scenes (not in the library package).


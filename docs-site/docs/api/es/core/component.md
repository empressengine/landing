---
sidebar_position: 21
sidebar_label: "component"
---

# API: `core/component`

Public entry point for the feature. Import from the core barrel or the feature index.

```typescript
import { Component, ComponentType } from '@empr/es';
// or
import { Component, ComponentType } from './core/component';
```

| Export | Source | Description |
|--------|--------|-------------|
| `Component` | `component.types.ts` | Structural type for ECS data containers |
| `ComponentType` | `component.types.ts` | Constructor token for a component class |

**Runtime:** This module exports **types only** — no classes, functions, or runtime values.

**Dependencies:** None — bottom of the `core` dependency graph.

---

## `Component`

```typescript
type Component = object & { length?: never; constructor: any };
```

Marks a value as a valid ECS **component instance** at the type level.

### Structural constraints

| Constraint | Purpose |
|------------|---------|
| `object` | Component must be a non-primitive object instance. |
| `length?: never` | Excludes arrays (and array-like values with `length`) from satisfying `Component`. |
| `constructor: any` | Requires a constructible type (typically a `class` instance used as `ComponentType` token). |

### Design conventions (not enforced by types)

| Convention | Rationale |
|------------|-----------|
| **Data only** | Components hold state; systems/services hold behavior. |
| **Class-based** | `entity.addComponent(new MyComponent())` uses `component.constructor` as the map key. |
| **No base class** | No `extends Component`; zero inheritance overhead. |
| **POD-friendly** | Plain properties; easy serialization and pooling of data. |

### Example — defining a component

```typescript
class SpeedComponent {
  public value = 0;
}

const speed: Component = new SpeedComponent();
```

Invalid at type level (illustrative):

```typescript
// Array — fails `length?: never`
const bad1: Component = [] as any;

// Plain object literal without class constructor token — awkward for Entity APIs
const bad2: Component = { value: 0 }; // structurally may pass TS but breaks Entity patterns
```

---

## `ComponentType<T>`

```typescript
type ComponentType<T extends Component> = new (...args: any[]) => T;
```

Constructor signature used as a **stable identity token** for component kinds.

| | |
|---|---|
| **Generic** | `T extends Component` — instance type produced by the constructor |
| **Shape** | `new (...args: any[]) => T` — any constructor args allowed (`any[]` in source) |

### Typical usage

```typescript
class HealthComponent {
  public value = 100;
}

function spawn<T extends Component>(Ctor: ComponentType<T>): T {
  return new Ctor();
}

const health = spawn(HealthComponent);
```

### Framework usage (by constructor reference)

`ComponentType` is passed to entity and query APIs — **not** string names:

| API area | Example |
|----------|---------|
| `Entity.addComponent` | `entity.addComponent(new PositionComponent())` — type from `instance.constructor` |
| `Entity.getComponent` | `entity.getComponent(PositionComponent)` |
| `Entity.hasComponent` / `removeComponent` | `entity.hasComponent(PositionComponent)` |
| `ComponentFilter.includes` | `{ includes: [PositionComponent, VelocityComponent] }` |
| `EntityIndexator` | Indexes entities by `ComponentType` |
| `EntityQuery` | Reactive filter on `ComponentFilter` |

```typescript
const position = entity.getComponent(PositionComponent);
// Returned type: EntityComponent<PositionComponent, typeof entity> (see core/entity)
```

---

## Runtime augmentation (not defined in this module)

When a component is attached via `Entity.addComponent` (`core/entity`), the framework **mixes in** non-enumerable properties. These are **not** part of the `Component` type alias; they exist at runtime only.

| Property | Type (runtime) | Description |
|----------|----------------|-------------|
| `entity` | getter → owning `IEntity` | Back-reference to the host entity |
| `disposable` | `{ onDestroy: Signal<Component>; dispose(): void }` | Lifecycle hook; `dispose()` dispatches `onDestroy` |

After `getComponent`, instances are typed as `EntityComponent<T, K>` = `T & { entity: K }` (`core/entity/entity.types.ts`).

```typescript
entity.addComponent(new SpeedComponent());
const speed = entity.getComponent(SpeedComponent);
speed.entity === entity; // true at runtime
speed.disposable.onDestroy.listen((comp) => { /* cleanup */ });
```

On `removeComponent`, `disposable.dispose()` is invoked when present.

---

## Type relationships

```mermaid
flowchart LR
  CT[ComponentType class token]
  CI[Component instance]
  EC[EntityComponent T plus entity]
  CT -->|new| CI
  CI -->|addComponent| EC
```

| Type | Layer | Role |
|------|-------|------|
| `Component` | `core/component` | Raw data container contract |
| `ComponentType<T>` | `core/component` | Identity + factory for `T` |
| `EntityComponent<T, K>` | `core/entity` | Mounted component with `entity` reference |
| `ComponentFilter` | `core/entity` | Query/index predicate using `ComponentType[]` |

---

## Usage patterns

### Spawn and attach

```typescript
const entity = storage.createEntity('Player');
entity.addComponent(new InventoryComponent());
entity.addComponent(new HealthComponent());
```

### Query by type token

```typescript
if (entity.hasComponent(HealthComponent)) {
  const health = entity.getComponent(HealthComponent);
  health.value -= damage;
}
```

### Filter entities in systems

```typescript
const filter: ComponentFilter = {
  includes: [TransformComponent, VelocityComponent],
  excludes: [DisabledTagComponent],
};

if (entity.isSatisfyFilter(filter)) {
  // ...
}
```

### DI memorization (`es-componente`)

```typescript
// DependencyComponentDriven.memorizeComponent(ComponentType, Token, key)
dependency.memorizeComponent(HealthComponent, HEALTH_TOKEN, 'default');
```

---

## Semantics and constraints

| Topic | Behavior |
|-------|----------|
| **Uniqueness per entity** | One instance per `ComponentType` (constructor) per entity; duplicate `addComponent` throws. |
| **Identification** | Runtime key is `component.constructor`, not class name string. |
| **Inheritance** | Subclass and base class are **different** tokens (e.g. `Base` vs `Derived` are separate map keys). |
| **Methods on components** | Allowed by TypeScript; discouraged by ECS convention. |
| **Layer imports** | `component` must not import `entity`, `system`, `widgets`, or `shared`. |
| **Game domains** | No concrete game components (`Health`, `Position`) in this folder — only contracts. |

---

## What is not in this API

| Missing | Where it lives |
|---------|----------------|
| `addComponent` / `getComponent` | `core/entity` |
| `EntityQuery`, indexing | `core/filtered`, `EntityIndexator` |
| Signals on add/remove | `core/entity/entity.signals` |
| `ProxyEntity` interceptors | `core/entity/proxy-entity` |

---

## Related documentation

- `feature_description.md` — zero-inheritance rationale, `length?: never`, mixin design
- Source: `component.types.ts`, export: `index.ts`
- Mounted component typing: `core/entity/entity.types.ts` (`EntityComponent`, `ComponentFilter`)

## Known consumers (reference)

| Module | Usage |
|--------|--------|
| `core/entity` | Maps, add/get/remove/disable component APIs |
| `core/entity/entity-indexator` | Index by `ComponentType` |
| `core/filtered/entity-query` | Reactive `ComponentFilter` |
| `core/entity/proxy-entity` | Interceptors on component lifecycle |
| `es-componente` | `memorizeComponent(ComponentType, ...)` |


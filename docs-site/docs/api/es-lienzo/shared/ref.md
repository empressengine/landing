---
sidebar_position: 11
sidebar_label: "ref"
---

# API: `shared/ref`

Public entry point for the feature. Import from the shared barrel or the feature index.

```typescript
import { Ref, RefCollection } from '@empr/es-lienzo';
// or
import { Ref, RefCollection } from './shared/ref';
```

| Export | Source | Description |
|--------|--------|-------------|
| `Ref` | `ref.ts` | Global string-keyed holder for a single object reference |
| `RefCollection` | `ref-collection.ts` | Global string-keyed holder for a group of object references |

**Dependencies:** none (framework- and renderer-agnostic `shared` primitives).

---

## `Ref<T>`

Global registry for string-based references to a **single** object. Decouples object creation (e.g. declarative view build) from retrieval (e.g. ECS systems) without passing direct references through the call stack.

**Layer:** `shared` — no ECS, PixiJS, or DI types; consumers supply `T` (commonly `PixiEntity` in `es-lienzo`).

### Static registry

All instances share one encapsulated static `Map<string, Ref<any>>` (`_refs`). Factory and lookup methods operate on that map.

---

### `Ref.create<T>(name)` (static)

```typescript
static create<T>(name: string): Ref<T>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `string` | Unique registry key |

| | |
|---|---|
| **Returns** | `Ref<T>` — new instance registered under `name` |

**Side effects:** `this._refs.set(name, ref)`. If `name` already exists, the map entry is **replaced**; any previous `Ref` instance for that key is no longer reachable via `get` (orphaned unless held elsewhere).

```typescript
const heroRef = Ref.create<PixiEntity>('hero-sprite');
```

---

### `Ref.get<T>(name)` (static)

```typescript
static get<T>(name: string): Ref<T> | undefined
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `string` | Registry key |

| | |
|---|---|
| **Returns** | `Ref<T>` if registered, otherwise `undefined` |

```typescript
const ref = Ref.get<PixiEntity>('submit-button');
if (ref) {
  const entity = ref.item;
}
```

---

### `Ref.remove(name)` (static)

```typescript
static remove(name: string): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `string` | Registry key to delete |

**Side effects:** `this._refs.delete(name)`. Does not call `clear()` on the removed instance; callers should clear or drop references before removal if needed.

```typescript
Ref.remove('hero-sprite');
```

---

### `item` (getter / setter)

```typescript
set item(item: T): void
get item(): T
```

| | |
|---|---|
| **Setter** | Assigns the object this reference points to |
| **Getter** | Returns the stored object |

| | |
|---|---|
| **Getter throws** | `Error` with message `'Item not found'` when `_item` is `null` or **any falsy value** (`!this._item`) |

Fail-fast by design: systems that read `.item` assume the view node is already bound.

```typescript
const ref = Ref.create<Button>('play-btn');
ref.item = buttonInstance;
const btn = ref.item;
```

---

### `clear()` (instance)

```typescript
clear(): void
```

Sets `_item` to `null`. The `Ref` remains registered under its name until `Ref.remove(name)` is called.

Used by `TreeBuilder` on view `destroy` / `removed` so systems do not keep stale handles.

```typescript
ref.clear();
```

---

## `RefCollection<T>`

Global registry for string-keyed **collections** of objects (e.g. all buttons in a menu, inventory slots). Same static-map pattern as `Ref`, separate type to avoid accidental overwrite of a singular slot.

---

### `RefCollection.create<T>(name)` (static)

```typescript
static create<T>(name: string): RefCollection<T>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `string` | Unique registry key |

| | |
|---|---|
| **Returns** | `RefCollection<T>` — new instance registered under `name` |

**Side effects:** Same overwrite semantics as `Ref.create` when `name` already exists.

```typescript
const menuButtons = RefCollection.create<PixiEntity>('menu-buttons');
```

---

### `RefCollection.get<T>(name)` (static)

```typescript
static get<T>(name: string): RefCollection<T> | undefined
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `string` | Registry key |

| | |
|---|---|
| **Returns** | `RefCollection<T>` if registered, otherwise `undefined` |

```typescript
const collection = RefCollection.get<PixiEntity>('inventory-slots');
collection?.items.forEach((slot) => { /* ... */ });
```

---

### `RefCollection.remove(name)` (static)

```typescript
static remove(name: string): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `string` | Registry key to delete |

Removes the collection from the global map only; does not invoke `clear()` on the instance.

---

### `items` (getter)

```typescript
get items(): T[]
```

| | |
|---|---|
| **Returns** | **Direct reference** to the internal `_items` array (not a copy) |

Mutating the returned array (e.g. `push`, `splice`) affects the collection. Prefer `push` / `clear` on the instance for controlled updates.

---

### `push(item)` (instance)

```typescript
push(item: T): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `item` | `T` | Object to append |

Appends to `_items` via `Array.prototype.push`. Multiple nodes can register into the same collection (e.g. each child with `refCollection` pointing at the same `RefCollection`).

```typescript
collection.push(slotEntity);
```

---

### `clear()` (instance)

```typescript
clear(): void
```

Sets `_items.length = 0` without replacing the array reference. Registry entry remains until `RefCollection.remove(name)`.

---

## Usage patterns

### Register at build time, read in a system

```typescript
// View builder (declarative)
builder
  .ofType(Sprite, 'hero')
  .refById('hero-sprite')
  .create();

// System (after TreeBuilder bound ref.item)
const heroRef = Ref.get<PixiEntity>('hero-sprite');
if (heroRef) {
  const hero = heroRef.item;
  hero.position.set(100, 200);
}
```

### Reuse or create collection by id (`View.collectionRefById`)

```typescript
const collection =
  RefCollection.get<PixiEntity>('menu-buttons') ??
  RefCollection.create<PixiEntity>('menu-buttons');
```

`View.collectionRefById` implements this get-or-create pattern internally.

### Group multiple nodes under one key

```typescript
const slots = RefCollection.create<PixiEntity>('inventory-slots');

// Each slot node: .collectionRef(slots) in TreeNode options
// TreeBuilder: options.refCollection.push(proxyEntity) per created child
```

### Lifecycle cleanup (handled by `TreeBuilder`)

On Pixi `destroy` / `removed`, bound `ref` / `refCollection` are cleared; entity storage is updated separately. `Ref` does not destroy objects or free GPU resources.

```typescript
view.on('destroy', () => {
  options.ref?.clear();
  options.refCollection?.clear();
});
```

### Program against generics only

```typescript
function bindRef<T>(name: string, value: T): void {
  const ref = Ref.get<T>(name) ?? Ref.create<T>(name);
  ref.item = value;
}
```

---

## Semantics and constraints

| Topic | Behavior |
|-------|----------|
| **Global namespace** | Keys are process-wide strings; collisions across unrelated features overwrite the map entry. Use prefixed ids (e.g. `'screen.menu.play-btn'`). |
| **`Ref.create` vs `get`** | `create` always registers a new instance; `get` is non-throwing and returns `undefined` if missing. |
| **`Ref.item` falsy** | Getter treats any falsy stored value as unset and throws `'Item not found'`. Do not store `0`, `''`, or `false` as `T` if they are valid payloads. |
| **`RefCollection.items`** | Exposes internal array; external mutation is possible. |
| **Memory / lifecycle** | No automatic `remove` on view teardown; only `clear()` on the instance. Call `Ref.remove` / `RefCollection.remove` when the key should leave the global registry entirely. |
| **Object destruction** | Clearing a ref does not destroy the underlying object; ECS / scene lifecycle owns that. |
| **Threading** | Synchronous single-threaded JS model; not safe for concurrent access. |
| **Typing** | Fully generic `<T>`; no runtime type checks. |

---

## Internal model (reference)

```
┌──────────────────────────────────────────────────────────┐
│  Ref<T> / RefCollection<T>  (static _refs: Map)          │
├──────────────────────────────────────────────────────────┤
│  Ref<T>                                                  │
│    _item: T | null     ← singular binding                │
│    create / get / remove                                   │
│    item getter (fail-fast) / setter / clear()            │
├──────────────────────────────────────────────────────────┤
│  RefCollection<T>                                        │
│    _items: T[]         ← shared array reference          │
│    create / get / remove                                   │
│    items getter / push / clear()                           │
└──────────────────────────────────────────────────────────┘

TreeBuilder.create (es-lienzo):
  options.ref          → ref.item = proxyEntity
  options.refCollection → refCollection.push(proxyEntity)
  destroy/removed      → ref.clear() / refCollection.clear()
```

---

## Related documentation

- `feature_description.md` — motivation, design decisions, public contract summary
- Source: `ref.ts`, `ref-collection.ts`, export: `index.ts`

## Known consumers (reference)

| Module | Usage |
|--------|--------|
| `features/view/view.ts` | `ref`, `refById`, `collectionRef`, `collectionRefById` on `TreeNode` config |
| `features/tree-builder/tree-builder.ts` | Assigns `ref.item` / `refCollection.push`; clears on view destroy/removed |
| `features/tree-builder/tree-builder.types.ts` | `ref?: Ref<PixiEntity>`, `refCollection?: RefCollection<PixiEntity>` on node options |
| `shared/index.ts` | Re-exports `./ref` |

Higher-level view orchestration and ECS storage live outside this `shared` feature.


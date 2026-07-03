# empr Docs Sidebar Sync Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Auto-sync `@empr/*` feature docs from `es-taller`, fix missing `spine-service` / `tween-service` Features articles, and auto-generate Docusaurus sidebar entries so manual `sidebars.ts` no longer drifts from disk.

**Architecture:** Refactor `copy-features-docs.mjs` to filesystem scan (mirroring API script). Extract shared sidebar builder into `scripts/lib/empr-sidebar.mjs`. New `generate-empr-sidebars.mjs` writes `sidebars.empr.generated.ts` from `docs/features` + `docs/api`. Manual `sidebars.ts` imports generated partial for empr packages only.

**Tech Stack:** Node.js ESM scripts, Docusaurus 3.8.1, TypeScript (`sidebars.ts`).

**Design reference:** [2026-07-03-empr-docs-sidebar-sync-design.md](./2026-07-03-empr-docs-sidebar-sync-design.md)

---

### Task 1: Shared sidebar utilities

**Files:**
- Create: `docs-site/scripts/lib/empr-sidebar.mjs`

**Step 1:** Create module exporting:

```js
export const LAYER_ORDER = ['shared', 'core', 'features', 'widgets', 'bootstrap'];

export function layerSidebarLabel(layer) {
  return layer === 'features' ? 'features (layer)' : layer;
}

/**
 * @param {string} docIdPrefix e.g. 'features/es-lienzo' or 'api/es-lienzo'
 * @param {string} pkgId e.g. 'es-lienzo'
 * @param {Record<string, string[]>} layerFeatures keys = layer names, values = feature slugs or 'index'
 */
export function buildPackageSidebarItems(docIdPrefix, pkgId, layerFeatures) { /* move logic from copy-api-docs.mjs */ }
```

Copy `buildPackageSidebarItems` body from `docs-site/scripts/copy-api-docs.mjs` (lines ~359–400), replacing hardcoded `api/${pkgId}` with `${docIdPrefix}` parameter.

**Step 2:** Verify module loads:

```bash
cd docs-site && node -e "import { LAYER_ORDER } from './scripts/lib/empr-sidebar.mjs'; console.log(LAYER_ORDER)"
```

**Expected:** prints `shared,core,features,widgets,bootstrap`

---

### Task 2: Refactor copy-api-docs to use shared lib

**Files:**
- Modify: `docs-site/scripts/copy-api-docs.mjs`

**Step 1:** Remove local `LAYER_ORDER`, `layerSidebarLabel`, `buildPackageSidebarItems`.

**Step 2:** Add import:

```js
import { LAYER_ORDER, layerSidebarLabel, buildPackageSidebarItems } from './lib/empr-sidebar.mjs';
```

**Step 3:** Update `buildPackageSidebarItems` call site to pass `'api'` prefix:

```js
buildPackageSidebarItems(`api/${pkg.id}`, pkg.id, layerFeatures)
```

**Step 4:** Smoke test:

```bash
cd docs-site && node scripts/copy-api-docs.mjs es-lienzo
```

**Expected:** `Copied es-lienzo: N API_DOC.md` + layer scan summary JSON (unchanged behaviour).

---

### Task 3: Auto-scan copy-features-docs

**Files:**
- Modify: `docs-site/scripts/copy-features-docs.mjs`

**Step 1:** Replace `layers` field in `PACKAGES` config with scan-only metadata. Keep per-package: `id`, `srcDir`, `destDir`, `title`.

**Step 2:** Add resolver:

```js
/**
 * @param {string} featureDir absolute path to src/{layer}/{feature}
 * @returns {string | null}
 */
function resolveFeatureDescription(featureDir) {
  const standard = path.join(featureDir, 'feature_description.md');
  if (fs.existsSync(standard)) return standard;
  const artifacts = path.join(featureDir, '.artifacts', 'feature_description.md');
  if (fs.existsSync(artifacts)) return artifacts;
  return null;
}
```

**Step 3:** Add scanner:

```js
const LAYER_ORDER = ['shared', 'core', 'features', 'widgets', 'bootstrap'];

/**
 * @param {string} srcRoot package src dir
 * @returns {Record<string, string[]>}
 */
function scanFeatureDocs(srcRoot) {
  /** @type {Record<string, string[]>} */
  const layerFeatures = {};

  for (const layer of LAYER_ORDER) {
    const layerDir = path.join(srcRoot, layer);
    if (!fs.existsSync(layerDir)) continue;

    if (fs.existsSync(path.join(layerDir, 'layer_responsibility.md'))) {
      layerFeatures[layer] = layerFeatures[layer] ?? [];
      if (!layerFeatures[layer].includes('index')) layerFeatures[layer].push('index');
    }

    if (layer === 'bootstrap') {
      const bootstrapDesc = path.join(layerDir, 'feature_description.md');
      if (fs.existsSync(bootstrapDesc)) {
        layerFeatures[layer] = layerFeatures[layer] ?? [];
        layerFeatures[layer].push('empr');
      }
      continue;
    }

    for (const entry of fs.readdirSync(layerDir, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
      const featureDir = path.join(layerDir, entry.name);
      if (resolveFeatureDescription(featureDir)) {
        layerFeatures[layer] = layerFeatures[layer] ?? [];
        layerFeatures[layer].push(entry.name);
      }
    }
  }

  for (const layer of Object.keys(layerFeatures)) {
    layerFeatures[layer] = [
      ...layerFeatures[layer].filter((f) => f === 'index'),
      ...layerFeatures[layer].filter((f) => f !== 'index').sort(),
    ];
  }

  return layerFeatures;
}
```

**Step 4:** Refactor `copyPackage(pkg)` to call `scanFeatureDocs(path.join(pkg.srcDir, 'src'))` instead of iterating `pkg.layers`. Keep existing `writeDoc`, `fixLinks`, layer index copy from `layer_responsibility.md`, bootstrap copy from `feature_description.md`, feature copy via `resolveFeatureDescription`.

**Step 5:** Run sync for es-lienzo:

```bash
cd docs-site && node scripts/copy-features-docs.mjs es-lienzo
```

**Step 6:** Verify new files exist:

```bash
ls docs/features/es-lienzo/widgets/spine-service.md docs/features/es-lienzo/widgets/tween-service.md
```

**Expected:** both files present.

---

### Task 4: generate-empr-sidebars script

**Files:**
- Create: `docs-site/scripts/generate-empr-sidebars.mjs`

**Step 1:** Define package config (mirrors copy scripts):

```js
const FEATURE_PACKAGES = [
  { id: 'es', destSubdir: '', label: '@empr/es', docIdPrefix: 'features', indexId: 'features/index' },
  { id: 'es-sistema', destSubdir: 'es-sistema', label: '@empr/es-sistema', docIdPrefix: 'features/es-sistema', indexId: 'features/es-sistema/index' },
  { id: 'es-componente', destSubdir: 'es-componente', label: '@empr/es-componente', docIdPrefix: 'features/es-componente', indexId: 'features/es-componente/index' },
  { id: 'es-lienzo', destSubdir: 'es-lienzo', label: '@empr/es-lienzo', docIdPrefix: 'features/es-lienzo', indexId: 'features/es-lienzo/index' },
];

const API_PACKAGES = [
  { id: 'es', label: '@empr/es' },
  { id: 'es-sistema', label: '@empr/es-sistema' },
  { id: 'es-componente', label: '@empr/es-componente' },
  { id: 'es-lienzo', label: '@empr/es-lienzo' },
];
```

**Step 2:** Implement disk scanner `scanDocsDir(absDir)`:

- Walk `LAYER_ORDER` subdirs if they exist.
- If `{layer}/index.md` exists → layer has `'index'` entry.
- Each `{layer}/*.md` except `index.md` → feature slug (basename without `.md`).
- Return `Record<string, string[]>` same shape as copy scripts.

**Step 3:** For each feature package, build category:

```js
{
  type: 'category',
  label: pkg.label,
  link: { type: 'doc', id: pkg.indexId },
  collapsed: false,
  items: buildPackageSidebarItems(pkg.docIdPrefix, pkg.id, layerFeatures),
}
```

**Step 4:** For API packages, same with `docIdPrefix: 'api/${id}'` and `indexId: 'api/${id}/index'`.

**Step 5:** Write `docs-site/sidebars.empr.generated.ts`:

```ts
// AUTO-GENERATED by scripts/generate-empr-sidebars.mjs — do not edit.
import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

export const emprFeaturesSidebar: SidebarsConfig[string] = [ /* ... */ ];
export const emprApiSidebar: SidebarsConfig[string] = [ /* ... */ ];
```

Use `JSON.stringify` with manual formatting OR template literals — output must be valid TypeScript.

**Step 6:** Run generator:

```bash
cd docs-site && node scripts/generate-empr-sidebars.mjs
```

**Expected:** `sidebars.empr.generated.ts` created; es-lienzo widgets includes `spine-service`, `tween-service`.

---

### Task 5: Wire sidebars.ts

**Files:**
- Modify: `docs-site/sidebars.ts`

**Step 1:** Add import at top:

```ts
import { emprApiSidebar, emprFeaturesSidebar } from './sidebars.empr.generated';
```

**Step 2:** Replace manual `@empr/*` blocks:

```ts
featuresSidebar: emprFeaturesSidebar,
apiSidebar: ['api/index', ...emprApiSidebar],
```

**Step 3:** Delete the old inline `@empr/es`, `@empr/es-sistema`, `@empr/es-componente`, `@empr/es-lienzo` category definitions (lines ~68–411 empr sections only).

**Step 4:** Keep `architectureSidebar` and `licenseSidebar` unchanged.

**Step 5:** Typecheck:

```bash
cd docs-site && pnpm typecheck
```

**Expected:** no errors.

---

### Task 6: npm scripts

**Files:**
- Modify: `docs-site/package.json`

**Step 1:** Add scripts:

```json
"sync:features": "node scripts/copy-features-docs.mjs",
"sync:api": "node scripts/copy-api-docs.mjs",
"generate:sidebars": "node scripts/generate-empr-sidebars.mjs",
"sync:docs": "pnpm sync:features && pnpm sync:api && pnpm generate:sidebars"
```

---

### Task 7: Full sync + verification

**Files:** none (verification only)

**Step 1:** Full sync (requires `es-taller` at `../../../es-taller` relative to scripts):

```bash
cd docs-site && pnpm sync:docs
```

**Step 2:** Build docs:

```bash
cd docs-site && pnpm build
```

**Expected:** build succeeds (`onBrokenLinks: 'throw'`).

**Step 3:** Manual sidebar check (dev server):

```bash
cd docs-site && pnpm start
```

Verify:
- **Features** tab → `@empr/es-lienzo` → **widgets** → 8 items including `spine-service`, `tween-service`.
- **API** tab → `@empr/es-lienzo` → same 8 widgets + all other layers.
- **Architecture** / **License** tabs unchanged.

---

### Task 8: Commit (optional — when user requests)

```bash
git add docs-site/scripts/ docs-site/sidebars.ts docs-site/sidebars.empr.generated.ts docs-site/package.json docs-site/docs/features/es-lienzo/widgets/spine-service.md docs-site/docs/features/es-lienzo/widgets/tween-service.md docs/plans/2026-07-03-empr-docs-sidebar-sync-design.md docs/plans/2026-07-03-empr-docs-sidebar-sync.md
git commit -m "$(cat <<'EOF'
fix(docs): auto-sync empr sidebars from es-taller sources

Replace hardcoded feature layers with filesystem scan (including .artifacts fallback) and generate Docusaurus sidebar entries from copied docs.
EOF
)"
```

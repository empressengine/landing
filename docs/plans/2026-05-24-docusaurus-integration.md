# Docusaurus Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a `docs-site/` Docusaurus app with English architecture docs at `/docs/`, merge-built with the existing Vite landing for GitHub Pages on `empr.es`.

**Architecture:** Landing stays at repo root; Docusaurus lives in `docs-site/` as a pnpm workspace package. Production `dist/` = Vite output + `docs-site/build` copied to `dist/docs/`. First doc uses `slug: /` so `/docs/` shows the first article (no marketing home).

**Tech Stack:** Vite 6, React 18 (landing), Docusaurus 3.8.x, React 19 (docs-site only), pnpm workspaces, GitHub Pages.

**Design reference:** [2026-05-24-docusaurus-integration-design.md](./2026-05-24-docusaurus-integration-design.md)

---

### Task 1: pnpm workspace

**Files:**
- Modify: `pnpm-workspace.yaml`
- Modify: `package.json` (root scripts placeholders)

**Step 1:** Update `pnpm-workspace.yaml`:

```yaml
packages:
  - '.'
  - 'docs-site'
```

**Step 2:** Add root scripts (names only; wired in later tasks):

```json
"dev:docs": "pnpm --filter docs-site start",
"build:landing": "vite build",
"build:docs": "pnpm --filter docs-site build",
"build": "pnpm build:landing && pnpm build:docs && node scripts/merge-dist.mjs"
```

**Step 3:** Run `pnpm install` from repo root.  
**Expected:** lockfile updates, no errors.

---

### Task 2: Scaffold `docs-site/`

**Files:**
- Create: `docs-site/package.json`
- Create: `docs-site/docusaurus.config.ts`
- Create: `docs-site/sidebars.ts`
- Create: `docs-site/tsconfig.json`
- Create: `docs-site/src/css/custom.css`
- Create: `docs-site/.gitignore` (`.docusaurus`, `build`, `node_modules`)
- Create: `docs-site/static/img/` (placeholder `logo.svg` if needed)

**Step 1:** Create `docs-site/package.json` (mirror `empress-documentation` versions):

```json
{
  "name": "docs-site",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "start": "docusaurus start",
    "build": "docusaurus build",
    "clear": "docusaurus clear",
    "serve": "docusaurus serve",
    "typecheck": "tsc"
  },
  "dependencies": {
    "@docusaurus/core": "3.8.1",
    "@docusaurus/preset-classic": "3.8.1",
    "@mdx-js/react": "^3.0.0",
    "clsx": "^2.0.0",
    "prism-react-renderer": "^2.3.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@docusaurus/module-type-aliases": "3.8.1",
    "@docusaurus/tsconfig": "3.8.1",
    "@docusaurus/types": "3.8.1",
    "typescript": "~5.6.2"
  }
}
```

**Step 2:** Create `docusaurus.config.ts`:

```ts
import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'empr.es',
  tagline: 'Architecture documentation',
  favicon: 'img/favicon.ico',
  url: 'https://empr.es',
  baseUrl: '/docs/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  i18n: { defaultLocale: 'en', locales: ['en'] },
  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
        },
        blog: false,
        theme: { customCss: './src/css/custom.css' },
      } satisfies Preset.Options,
    ],
  ],
  themeConfig: {
    navbar: {
      title: 'empr.es',
      items: [
        { href: '/', label: 'Home', position: 'left' },
        {
          type: 'docSidebar',
          sidebarId: 'architectureSidebar',
          position: 'left',
          label: 'Architecture',
        },
      ],
    },
    footer: {
      style: 'dark',
      copyright: `Copyright © ${new Date().getFullYear()} empr.es`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
```

**Step 3:** Do **not** create `src/pages/index.tsx` (no marketing home).

**Step 4:** Run `pnpm install` && `pnpm --filter docs-site start`.  
**Expected:** Docusaurus dev server starts (empty docs until Task 3).

---

### Task 3: Import architecture markdown

**Files:**
- Create: `docs-site/docs/architecture/**/*.md` (25 files, renamed)
- Modify: first doc — add frontmatter with `slug: /`

**Step 1:** Copy from  
`C:\Users\Yetti\Desktop\Новая папка\architecture\`  
into `docs-site/docs/architecture/` using this mapping:

| Source | Target id path |
|--------|----------------|
| `1_core_concepts/1_1-what-is-empr-es.md` | `core-concepts/what-is-empr-es.md` |
| `1_core_concepts/1_2_ecs_in_empr_es.md` | `core-concepts/ecs-in-empr-es.md` |
| `1_core_concepts/1_3_entity_and_component_model.md` | `core-concepts/entity-and-component-model.md` |
| `1_core_concepts/1_4_entity_storage_and_component_filtering.md` | `core-concepts/entity-storage-and-component-filtering.md` |
| `2_execution/2_1_systems.md` | `execution/systems.md` |
| `2_execution/2_2_pipelines.md` | `execution/pipelines.md` |
| `2_execution/2_3_pipeline_composition.md` | `execution/pipeline-composition.md` |
| `2_execution/2_4_modifying_existing_pipelines.md` | `execution/modifying-existing-pipelines.md` |
| `2_execution/2_5_mvc_comparison.md` | `execution/mvc-comparison.md` |
| `2_execution/2_6_what_is_component_driven.md` | `execution/what-is-component-driven.md` |
| `2_execution/2_7_ecs_vs_component_driven.md` | `execution/ecs-vs-component-driven.md` |
| `3_flow_control/3_1_execution_initiators.md` | `flow-control/execution-initiators.md` |
| `3_flow_control/3_2_signal_and_signalservice.md` | `flow-control/signal-and-signalservice.md` |
| `3_flow_control/3_3_signal_ownership.md` | `flow-control/signal-ownership.md` |
| `3_flow_control/3_5_listening_to_update_loop_via_signalservice.md` | `flow-control/listening-to-update-loop-via-signalservice.md` |
| `3_flow_control/3_6_game_flow_with_fsm.md` | `flow-control/game-flow-with-fsm.md` |
| `3_flow_control/3_7_fsm_pipeline_signal_architecture.md` | `flow-control/fsm-pipeline-signal-architecture.md` |
| `4_runtime_services/4_1_di_container.md` | `runtime-services/di-container.md` |
| `4_runtime_services/4_2_di_inside_systems_and_pipelines.md` | `runtime-services/di-inside-systems-and-pipelines.md` |
| `4_runtime_services/4_3_object_pool_and_pools.md` | `runtime-services/object-pool-and-pools.md` |
| `4_runtime_services/4_4_entity_lifecycle_and_pool_aware_storage.md` | `runtime-services/entity-lifecycle-and-pool-aware-storage.md` |
| `4_runtime_services/4_5_reactive_store.md` | `runtime-services/reactive-store.md` |
| `4_runtime_services/4_6_lifecycle_tracker_and_tracked_signal.md` | `runtime-services/lifecycle-tracker-and-tracked-signal.md` |
| `4_runtime_services/4_7_shared_utilities.md` | `runtime-services/shared-utilities.md` |
| `5_guide/5_1_building_console_only_game_mechanic.md` | `guide/building-console-only-game-mechanic.md` |

**Step 2:** Prepend to `what-is-empr-es.md`:

```md
---
slug: /
---

```

(Keep existing `# What is empr.es?` heading below.)

**Step 3:** Run `pnpm --filter docs-site build`.  
**Expected:** PASS; `/docs/` resolves to first article in build output.

---

### Task 4: `sidebars.ts`

**Files:**
- Create: `docs-site/sidebars.ts`

**Step 1:** Define `architectureSidebar` with one root category **Core architecture overview** and five subcategories. Doc ids (no `.md`):

```ts
'architecture/core-concepts/what-is-empr-es',
'architecture/core-concepts/ecs-in-empr-es',
// ... all 25 in reading order
```

**Step 2:** Rebuild docs.  
**Expected:** Sidebar matches design; first item opens at `/docs/`.

---

### Task 5: Theme touch-up

**Files:**
- Modify: `docs-site/src/css/custom.css`

**Step 1:** Set Infima primary to `#E30049` (minimal):

```css
:root {
  --ifm-color-primary: #e30049;
}
```

**Step 2:** Visual check in `pnpm --filter docs-site start`.

---

### Task 6: Merge build script

**Files:**
- Create: `scripts/merge-dist.mjs`

**Step 1:** Implement Node script:

```js
import { cpSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const docsBuild = join(root, 'docs-site', 'build');
const dist = join(root, 'dist');
const target = join(dist, 'docs');

if (!existsSync(docsBuild)) {
  console.error('docs-site/build missing — run build:docs first');
  process.exit(1);
}

rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
cpSync(docsBuild, target, { recursive: true });
console.log('Merged docs-site/build → dist/docs');
```

**Step 2:** Run full `pnpm build`.  
**Expected:** `dist/index.html` (landing) + `dist/docs/index.html` (first article).

**Step 3:** Serve locally:

```bash
npx serve dist
```

Verify `/` and `/docs/`.

---

### Task 7: Landing link + gitignore

**Files:**
- Modify: `src/app/components/Header.tsx`
- Modify: `.gitignore`

**Step 1:** Change docs button href:

```tsx
<a href="/docs/">Explore Architecture</a>
```

**Step 2:** Add to `.gitignore`:

```
docs-site/.docusaurus
docs-site/build
docs-site/node_modules
```

**Step 3:** Manual check: `pnpm dev` → click header link (production build for `/docs/` path).

---

### Task 8: GitHub Pages CI

**Files:**
- Create: `.github/workflows/deploy.yml`

**Step 1:** Workflow on `push` to `main`:

- `pnpm install`
- `pnpm build`
- Deploy `dist/` with `peaceiris/actions-gh-pages@v4` to `gh-pages` branch  
  **or** `actions/upload-pages-artifact` + `actions/deploy-pages@v4`

**Step 2:** In GitHub repo → Settings → Pages:

- Source: GitHub Actions (or `gh-pages` branch)
- Custom domain: `empr.es`
- Enforce HTTPS

**Step 3:** DNS at registrar (apex `empr.es`):

- A records → GitHub Pages IPs, **or**
- ALIAS/ANAME per GitHub docs

**Expected:** After deploy, `https://empr.es/` and `https://empr.es/docs/` work.

---

### Task 9 (optional): Vite dev proxy

**Files:**
- Modify: `vite.config.ts`

**Step 1:** Add server proxy:

```ts
server: {
  proxy: {
    '/docs': { target: 'http://localhost:3000', changeOrigin: true },
  },
},
```

**Step 2:** Run `pnpm dev` + `pnpm dev:docs`; open `/docs/` on :5173.  
**Expected:** Docs proxied during local dev.

---

## Manual test checklist

- [ ] `/docs/` shows **What is empr.es?** (not Docusaurus default home)
- [ ] No `src/pages/index.tsx` marketing page exists
- [ ] All 25 articles render code blocks
- [ ] Sidebar: **Core architecture overview** + 5 sections
- [ ] `pnpm build` + `onBrokenLinks: 'throw'` passes
- [ ] Landing sections unchanged at `/`
- [ ] Header link works in production build

## Notes for implementer

- Docusaurus `Home` navbar link `href: '/'` goes to site root (`empr.es/`), not docs — intentional.
- Do not add `empress-documentation` `src/pages/index.tsx` or `HomepageFeatures`.
- React 18 (landing) and React 19 (docs-site) must remain in separate packages.

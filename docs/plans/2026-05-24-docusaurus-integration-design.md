# Docusaurus Integration — Design

**Date:** 2026-05-24  
**Status:** Approved  
**Repo:** `landing` (empr.es)

## Goal

Serve the existing Vite landing at `https://empr.es/` and English architecture documentation at `https://empr.es/docs/`, deployed as a single GitHub Pages site with custom domain `empr.es`.

## Decisions

| Topic | Decision |
|-------|----------|
| Integration pattern | **Approach 1:** Docusaurus in `docs-site/`, landing at repo root |
| Hosting | GitHub Pages + custom domain `empr.es` |
| Docs URL prefix | `/docs/` (`baseUrl: '/docs/'`) |
| Content source | 25 `.md` files from local `architecture/` folder (not full `empress-documentation` repo) |
| Sidebar root | Single category: **Core architecture overview** (5 numbered subcategories) |
| Locale | English (`en`) for UI and articles |
| Docusaurus marketing home | **Not used** — no hero/index landing like `empress-documentation/src/pages/index.tsx` |
| `/docs/` entry | **First article** (`What is empr.es?`) as docs home via doc `slug: /` |

## Architecture

```
landing/                    # Vite + React 18 (unchanged layout)
docs-site/                  # Docusaurus 3.x + React 19 (isolated deps)
pnpm-workspace.yaml         # ['.', 'docs-site']

Build output:
dist/                       # deploy root → empr.es/
├── index.html              # landing
├── assets/
└── docs/                   # copied from docs-site/build/
    └── index.html          # first architecture article (slug: /)
```

Landing and docs are separate applications merged at build time. React versions do not need to align.

## Docusaurus configuration

```ts
url: 'https://empr.es',
baseUrl: '/docs/',
i18n: { defaultLocale: 'en', locales: ['en'] },
presets: [
  ['classic', {
    docs: { sidebarPath: './sidebars.ts', routeBasePath: '/' },
    blog: false,
    theme: { customCss: './src/css/custom.css' },
  }],
],
onBrokenLinks: 'throw',
```

## Docs home (no marketing page)

**Do not** add `src/pages/index.tsx` marketing home.

Use the first doc as the docs index:

```md
---
slug: /
sidebar_position: 1
---

# What is empr.es?
...
```

With `routeBasePath: '/'` and `baseUrl: '/docs/'`, this renders at `https://empr.es/docs/` (not a separate redirect).

Optional later: category index / card list page — out of scope for v1.

## Content layout

Source (one-time copy):

`C:\Users\Yetti\Desktop\Новая папка\architecture/**/*.md`

Target:

```
docs-site/docs/architecture/
├── core-concepts/
├── execution/
├── flow-control/
├── runtime-services/
└── guide/
```

File renames remove numeric prefixes from paths (order defined in `sidebars.ts`).

## Sidebar structure

```text
Core architecture overview
├── 1. Core concepts (4 docs)
├── 2. Execution (7 docs)
├── 3. Flow control (7 docs)
├── 4. Runtime services (7 docs)
└── 5. Guide (1 doc)
```

## Landing changes (minimal)

- `Header.tsx`: `href="/docs/"` instead of external docs URL
- No routing changes to `App.tsx` (stays single-page at `/`)

## Build & deploy

Root scripts:

1. `vite build` → `dist/`
2. `pnpm --filter docs-site build` → `docs-site/build/`
3. `node scripts/merge-dist.mjs` → copy `docs-site/build/*` → `dist/docs/`

GitHub Actions (or manual) publishes `dist/` to GitHub Pages; custom domain `empr.es` in repo settings.

## Dev workflow

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Landing (Vite, :5173) |
| `pnpm dev:docs` | Docs (Docusaurus, :3000) |
| Optional Vite proxy | `/docs` → `:3000` for single-origin local testing |

## Theming (v1)

- `preset-classic` defaults + `custom.css`
- Accent `#E30049` aligned with landing (navbar link hover, optional)
- No component swizzle in v1

## Out of scope (v1)

- Migrating `empress-documentation` Russian content
- i18n / Russian locale
- Converting plain-text "Related articles" blocks to markdown links
- Nx / `apps/` monorepo restructure
- Automated sync from Desktop folder (manual copy once)

## Verification checklist

- [ ] `pnpm build` succeeds
- [ ] `empr.es/` (or local `/`) shows unchanged landing
- [ ] `empr.es/docs/` opens **What is empr.es?** (not Docusaurus marketing home)
- [ ] Sidebar shows **Core architecture overview** with 5 subcategories
- [ ] Header "Explore Architecture" → `/docs/`
- [ ] No broken link errors at build time

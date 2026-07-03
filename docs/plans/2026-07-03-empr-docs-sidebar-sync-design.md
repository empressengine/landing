# empr Docs Sidebar Sync — Design

**Date:** 2026-07-03  
**Status:** Approved  
**Repo:** `landing` (`docs-site/`)

## Problem

Documentation for `@empr/*` packages is split across two Docusaurus sidebars (navbar tabs **Features** and **API**). Content is copied from `es-taller` via two scripts, but:

1. `copy-features-docs.mjs` uses a **hardcoded `layers` map** — new modules are easy to miss.
2. `spine-service` and `tween-service` store `feature_description.md` under `.artifacts/` — the copy script never finds them.
3. `sidebars.ts` is **fully manual** — `copy-api-docs.mjs` already has `buildPackageSidebarItems()` but only logs JSON; sidebar drifts from disk.

Result: users perceive “half the articles are missing” (especially on the Features tab; API lives on a separate navbar tab by design).

## Goal

Keep **Features / API as separate navbar tabs** (option B), but:

- Auto-discover all feature docs from `es-taller` (including `.artifacts` fallback).
- Auto-generate sidebar entries for `@empr/*` packages from files on disk.
- One command to sync content + sidebar after framework doc changes.

## Non-goals

- Merging Features and API into a single sidebar tree.
- Changing navbar structure or architecture/license sidebars.
- Custom sort order beyond layer order + alphabetical feature names (future: `sidebar_position` from frontmatter).

## Architecture

```
es-taller/libs/empr/{package}/src/
        │
        ├─ copy-features-docs.mjs  ──► docs-site/docs/features/{package}/
        │     scan: feature_description.md (+ .artifacts fallback)
        │
        ├─ copy-api-docs.mjs       ──► docs-site/docs/api/{package}/
        │     scan: API_DOC.md (unchanged behaviour)
        │
        └─ generate-empr-sidebars.mjs ──► sidebars.empr.generated.ts
              scan: docs/features + docs/api on disk
```

`sidebars.ts` imports generated partial and keeps manual sections:

- `architectureSidebar`
- `licenseSidebar`

## Decisions

| Topic | Decision |
|-------|----------|
| Sidebar split | Keep Features / API navbar tabs |
| Feature discovery | Filesystem scan; no hardcoded `layers` map |
| `.artifacts` fallback | If `{feature}/feature_description.md` missing, try `{feature}/.artifacts/feature_description.md` |
| Layer order | `shared → core → features → widgets → bootstrap` |
| Layer label | `features` layer → sidebar label `"features (layer)"` |
| Feature sort | Alphabetical within each layer |
| Sidebar source of truth | Generated from **copied files on disk** (post-sync) |
| `@empr/es` path | Stays at `docs/features/` (not `docs/features/es/`) — preserved via package config |
| Generated file | `docs-site/sidebars.empr.generated.ts` — do not edit manually |

## Package layout quirks

| Package | Features dest | Doc ID prefix (features) |
|---------|---------------|--------------------------|
| `es` | `docs/features/` | `features/` |
| `es-sistema` | `docs/features/es-sistema/` | `features/es-sistema/` |
| `es-componente` | `docs/features/es-componente/` | `features/es-componente/` |
| `es-lienzo` | `docs/features/es-lienzo/` | `features/es-lienzo/` |

API packages always use `docs/api/{id}/` and doc IDs `api/{id}/...`.

## npm scripts (`docs-site/package.json`)

```json
"sync:features": "node scripts/copy-features-docs.mjs",
"sync:api": "node scripts/copy-api-docs.mjs",
"generate:sidebars": "node scripts/generate-empr-sidebars.mjs",
"sync:docs": "pnpm sync:features && pnpm sync:api && pnpm generate:sidebars"
```

## Risks

| Risk | Mitigation |
|------|------------|
| Manual edit of generated file | Banner comment; overwritten on `sync:docs` |
| `es-componente` has no feature docs | Empty `items: []` on package category |
| Order changes vs current manual sidebar | Alphabetical sort — predictable; acceptable per approval |
| `onBrokenLinks: 'throw'` on build | Run `docusaurus build` as verification step |

## Success criteria

1. `docs/features/es-lienzo/widgets/` contains `spine-service.md` and `tween-service.md` after sync.
2. Features sidebar lists 8 widget articles for `@empr/es-lienzo`.
3. API sidebar unchanged in structure; all `API_DOC.md` modules still listed.
4. `pnpm sync:docs` is the single entry point for doc updates from `es-taller`.
5. `pnpm --filter docs-site build` passes with no broken links.

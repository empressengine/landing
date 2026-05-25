# Docs Local Search — Design

**Date:** 2026-05-25  
**Status:** Approved  
**Repo:** `landing` (`docs-site/`)

## Goal

Add offline full-text search to the Docusaurus documentation at `https://empr.es/docs/`, with the search index generated at build time and no external services.

## Decisions

| Topic | Decision |
|-------|----------|
| Approach | Local index at `docusaurus build` (not Algolia / self-hosted) |
| Plugin | `@easyops-cn/docusaurus-search-local` |
| Locale | English only (`language: ['en']`) |
| Scope | All markdown under `docs-site/docs/` (Architecture, Features, API, License) |
| CI | No pipeline changes — index ships inside existing `build:docs` → `merge-dist.mjs` |
| Navbar | Auto-injected search bar by the theme (no manual `navbar.items` entry) |

## Context

- Docusaurus **3.8.1**, `baseUrl: '/docs/'`, docs-only mode: `routeBasePath: '/'`
- ~195 markdown pages, blog disabled
- Deploy: GitHub Pages, merged into `dist/docs/`
- Proprietary license — Algolia DocSearch not pursued

## Plugin configuration

Add to `docusaurus.config.ts` `themes` array (alongside `@docusaurus/theme-mermaid`):

```ts
[
  '@easyops-cn/docusaurus-search-local',
  {
    hashed: true,
    language: ['en'],
    docsRouteBasePath: '/',
    indexBlog: false,
    highlightSearchTermsOnTargetPage: true,
    explicitSearchResultPath: true,
  },
],
```

**Critical:** `docsRouteBasePath` must match `docs.routeBasePath` in preset-classic (`'/'`). Mismatch causes missing `search-index.json` at runtime.

`baseUrl: '/docs/'` stays unchanged; Docusaurus resolves asset and result URLs correctly.

## UX

- Search input in navbar (right), modal + Ctrl/⌘+K
- Duplicate hits across Features/API are acceptable
- Optional post-build CSS tweaks in `src/css/custom.css` only if contrast needs adjustment

## Out of scope

- Per-sidebar search contexts (`searchContextByPaths`)
- Route ignore lists
- Algolia, Typesense, Pagefind
- Russian stemming / i18n

## Verification

1. `pnpm --filter docs-site build` succeeds; `build/search-index*.json` exists
2. `pnpm --filter docs-site serve` — search works under `/docs/`
3. Result links use `/docs/...` prefix, not site root
4. Full `pnpm build` + merge — smoke test on `dist/docs/`

## Implementation plan

[2026-05-25-docs-local-search.md](./2026-05-25-docs-local-search.md)

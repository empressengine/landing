# Docs Local Search Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable offline full-text search on `docs-site` with a build-time index, deployed at `https://empr.es/docs/`.

**Architecture:** Add `@easyops-cn/docusaurus-search-local` as a Docusaurus theme in `docs-site/`. Index is emitted into `docs-site/build/` during `docusaurus build` and copied to `dist/docs/` by the existing merge script. No CI or landing changes.

**Tech Stack:** Docusaurus 3.8.1, `@easyops-cn/docusaurus-search-local` ^0.55.1, pnpm workspace.

**Design reference:** [2026-05-25-docs-local-search-design.md](./2026-05-25-docs-local-search-design.md)

---

### Task 1: Install search theme

**Files:**
- Modify: `docs-site/package.json`
- Modify: `pnpm-lock.yaml` (via install)

**Step 1:** Add dependency in `docs-site/package.json`:

```json
"@easyops-cn/docusaurus-search-local": "^0.55.1"
```

Place it in `dependencies` next to other `@docusaurus/*` packages.

**Step 2:** From repo root:

```bash
pnpm install
```

**Expected:** lockfile updated, no peer dependency errors.

---

### Task 2: Wire theme in Docusaurus config

**Files:**
- Modify: `docs-site/docusaurus.config.ts`

**Step 1:** Change `themes` from a string array to include the search theme **after** mermaid:

```ts
themes: [
  '@docusaurus/theme-mermaid',
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
],
```

**Step 2:** Run typecheck:

```bash
pnpm --filter docs-site typecheck
```

**Expected:** exit 0.

---

### Task 3: Build and verify index artifacts

**Files:**
- (generated) `docs-site/build/search-index*.json`

**Step 1:** Clear and build:

```bash
pnpm --filter docs-site clear
pnpm --filter docs-site build
```

**Expected:** build succeeds with `onBrokenLinks: 'throw'` unchanged.

**Step 2:** Confirm index files exist:

```bash
ls docs-site/build/search-index* 2>/dev/null || ls docs-site/build/*.json | head
```

**Expected:** at least one `search-index` JSON (hashed filename if `hashed: true`).

---

### Task 4: Manual smoke test (dev server)

**Step 1:** Serve production build:

```bash
pnpm --filter docs-site serve
```

**Step 2:** Open `http://localhost:3000/docs/` (or port shown in terminal).

**Step 3:** Checklist:

- [ ] Search icon/input visible in navbar (right)
- [ ] Modal opens; Ctrl+K works
- [ ] Query `Entity` returns multiple results
- [ ] Query `SignalService` returns API/Features hits
- [ ] Click result → URL path starts with `/docs/`
- [ ] Target page highlights search term (if enabled)

**Step 4:** Stop serve when done.

---

### Task 5: Optional CSS polish

**Files:**
- Modify: `docs-site/src/css/custom.css` (only if Task 4 shows contrast issues)

**Step 1:** If search modal or navbar input looks low-contrast on dark theme, add minimal overrides using existing CSS variables, e.g.:

```css
.navbar__search-input {
  background: var(--ifm-background-surface-color);
}
```

**Step 2:** Re-run Task 3 build + spot-check Task 4.

Skip this task entirely if default styling is acceptable.

---

### Task 6: Full production merge smoke (optional but recommended)

**Step 1:** From repo root:

```bash
pnpm build
```

**Expected:** landing + docs build + merge without errors.

**Step 2:** Serve merged dist or open `dist/docs/index.html` via static server; repeat Task 4 checklist on `/docs/` paths.

---

### Task 7: Commit (when requested)

**Files:** `docs-site/package.json`, `docs-site/docusaurus.config.ts`, `pnpm-lock.yaml`, optional `docs-site/src/css/custom.css`, `docs/plans/2026-05-25-docs-local-search*.md`

```bash
git add docs-site/package.json docs-site/docusaurus.config.ts pnpm-lock.yaml docs/plans/2026-05-25-docs-local-search-design.md docs/plans/2026-05-25-docs-local-search.md
git add docs-site/src/css/custom.css  # only if changed
git commit -m "$(cat <<'EOF'
feat(docs): add offline local search to Docusaurus site

Build-time index via docusaurus-search-local for /docs/ without external services.
EOF
)"
```

---

## Notes

- Do **not** add a manual `navbar.items` search entry — the theme registers it.
- Do **not** change `scripts/merge-dist.mjs` — it already copies the full `docs-site/build/` tree.
- Duplicate search results across Features/API are expected, not a bug.

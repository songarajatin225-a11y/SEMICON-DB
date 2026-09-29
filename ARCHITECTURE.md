# Architecture

## Audit of the 1.x platform (what existed)

| Layer | 1.x (Batch 1) |
|---|---|
| Hosting | GitHub Pages, `gh-pages` branch, single `index.html` (661 KB) + `.nojekyll` |
| Data | One inline `const D = {...}` object (584 KB, 27 tables with short keys: `co`, `pr`, `cr`, `sp`, `pa`, `india`, `loc`, `tv`, `gap`, `pfit`, `src`, `fin`, `tax`, `ps`, `ctry`, `mk`, `cm`, `qc`, `comp`, `cov`, `pt`, `rel`, `cu`, `ex`, `exb`, `lt`, `teal`, `cats`, `st`) |
| Routes | 25 hash views (`#landscape`, `#companies`, `#products`, `#lasers`, `#compare`, segments, regions, networks, TEAL, sources) |
| UI | Left rail, global filter bar (11 single-select filters), sortable tables (500-row cap), record drawer, 4-slot compare, bar/stack charts, tooltips, light/dark themes |
| Strengths kept | Evidence discipline (sources, tiers, verification, confidence, N/A instead of estimates), TEAL analyses, teal brand identity, compact information-dense style |
| Limitations | No stable entity ids beyond table-local codes; product and model mixed; no process/technology/material/subsystem entities; relationships implicit in text fields; one global filter bar shared by all views; no deep links to records; data hard-coded inside the page; no validation or import path; search = substring only |

## 2.0 architecture

```
data/legacy/legacy_snapshot.json   ← Batch-1 data, byte-for-byte from the 1.x page (never edited)
data/batches/*.json                ← later batches staged by scripts/import.mjs (same row format)
scripts/reference/*.mjs            ← editorial reference: processes, technologies, materials, applications,
                                      subsystems, component classes, countries, synonyms, taxonomy extensions
        │
        ▼  scripts/build-data.mjs  (RAW → VALIDATE → NORMALISE → DEDUPLICATE → LINK → ATTACH SOURCES → QUALITY → PUBLISH)
data/<entity>.json (18 files) + intel.json + quality.json + reference.json + meta.json
data/bundle.json                   ← single file the app loads (217 KB gzipped)
data/basemap.json                  ← pre-rendered world map (scripts/build-map.mjs), loaded only by the map page
        │
        ▼
index.html → assets/js/main.js (ES modules, no framework, no build step)
```

### Front-end modules

| Module | Responsibility |
|---|---|
| `core/store.js` | Loads the bundle; id index; relationship adjacency (in/out edges); id → route; legacy-id aliases |
| `core/router.js` | Hash router `#/section/:id?params`; URL-state helpers; legacy-hash redirects |
| `core/search.js` | Inverted index (title/alias/sub/body weights), prefix + Levenshtein typo tolerance, synonym groups, natural-language constraint parser (wafer mm/inch, country, demonyms, India presence, substrate material, entity-type hints, quoted phrases); exact / partial / related-topic result groups |
| `core/workspace.js` | Saved records, searches, filter views, comparisons, compare selections, view preferences (localStorage, fail-safe) |
| `core/actions.js` | Registry for view-specific delegated actions |
| `ui/components.js` | Design-system vocabulary: badges (verification, quality, freshness, basis), confidence meter, source buttons + list, value/missing rendering, tags, KPI cards, bars, stacked bars, spec tables, tabs, breadcrumbs, empty states, skeletons, quick actions |
| `ui/table.js` | DataTable: sticky header, pinned first column, sort (missing values last), presets, show/hide columns, pagination, row expansion, compare checkboxes, CSV/JSON export, copy |
| `ui/facets.js` | Faceted filtering with cross-facet counts, searchable option lists, chips, URL state |
| `ui/graph.js` | Ego-network SVG with per-type caps and depth control |
| `ui/palette.js`, `ui/drawer.js` | Command palette (combobox/listbox ARIA) and evidence drawer (modal dialog) |
| `views/*.js` | One module per section; each returns `{ title, html, after? }` |

All interaction is delegated from `main.js` (`data-*` attributes), so views are plain template functions and re-rendering is cheap. Filter changes re-render only the current page and restore focus to the control that changed.

### Routes

`#/` · `#/search?q=` · `#/companies[/:id?tab=]` · `#/equipment[/:id]` · `#/products[/:familyId]` · `#/models/:id?tab=` · `#/processes[/:id]` · `#/technologies[/:id]` · `#/materials[/:id]` · `#/applications[/:id]` · `#/components[/:id]` · `#/subsystems[/:id]` · `#/fabs[/:id]` · `#/osats[/:id]` · `#/customers/:id` · `#/suppliers` · `#/india` · `#/countries[/:id]` · `#/map` · `#/compare[/companies]` · `#/intelligence[/module]` · `#/quality?tab=` · `#/sources[/:id]` · `#/saved` · `#/graph/:id?depth=`

Legacy compatibility: `#products` → `#/products`, `#landscape` → `#/`, `#china` → `#/countries/CTY-CN`, … (see `core/router.js`); `#/companies/C0010` → `#/companies/CMP-000010`.

### Performance (measured, local server, desktop Chromium)

| Metric | 1.x | 2.0 |
|---|---:|---:|
| First contentful paint | 408 ms | 124 ms (shell + skeleton) |
| Navigation → content | 439 ms | 418 ms |
| Transfer (gzip) | 136 KB | 217 KB data + 87 KB code/CSS |
| Route render | full re-render | 26–100 ms |
| Facet update | — | 64 ms |
| Search query | substring | 0.4–2.5 ms |

Scaling path: pagination caps DOM size (≈1.5k nodes on the product explorer); the bundle can be split per entity (`data/<entity>.json` already exist) and lazy-loaded when the dataset grows by an order of magnitude; the search index is built once per session.

### Accessibility

Semantic landmarks, skip link, one `h1` per page (focused on navigation), labelled controls, `aria-sort` on sortable headers, `aria-current` in navigation and breadcrumbs, modal dialogs with focus return, combobox/listbox palette, keyboard-operable map bubbles, table alternatives for every chart/graph/map, visible focus, reduced-motion support, WCAG-aware colour tokens in light and dark themes.

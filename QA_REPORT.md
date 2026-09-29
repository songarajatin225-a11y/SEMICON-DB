# QA report & before/after review — SEMICON-DB 2.0

Tested against a local static server with headless Chromium (Playwright 1.56), desktop 1440×900 and mobile 390×844, light and dark themes. Evidence snapshot 29 Sep 2026.

## Results summary

| Area | Result |
|---|---|
| Route smoke test | **99 / 99** routes render (every section, every detail tab, legacy hashes, legacy ids, 404) with **0** console or page errors |
| Interaction test | Command palette (typo query → record), facets (URL updates, focus kept), chip removal, text filter, column presets, sort, pagination, compare toggles, source drawer (open / Esc close), “/” shortcut — all pass |
| Data validation | `npm run build` + `npm run validate`: **0 errors**, 150 warnings (140 undated sources, 8 inaccessible sources, 2 thickness-only wafer values) |
| Accessibility | axe-core WCAG 2 A/AA on 13 key pages × light/dark: **0 violations** (after fixing contrast, ARIA on links and SVG roles) |
| Mobile | No horizontal page scroll on 10 sampled pages; filters open as a bottom sheet; navigation as a drawer |
| Search performance | 0.4–2.5 ms per query (target < 200 ms) |
| Rendering | FCP 124 ms (1.x: 408 ms); route renders 26–100 ms; facet update 64 ms |

## QA checklist

**Functional** — Search ✔ · Filter ✔ · Sort ✔ · Pagination ✔ · Navigation ✔ · Detail pages ✔ · Compare ✔ · Source links (drawer + external) ✔ · URL routes / deep links ✔ · Back button (hash history; filters use replaceState to avoid history spam) ✔ · Responsive layout ✔

**Data** — Duplicates: 14 candidates flagged, none merged ✔ · Broken ids: 0 ✔ · Broken relationships: 0 ✔ · Missing required fields: 0 errors ✔ · Invalid URLs: 0 ✔ · Invalid units: wafer sizes normalised with source wording kept; 2 thickness-only values flagged ✔ · Inconsistent company names: aliases recorded, dedupe report ✔

**UX** — Desktop ✔ · Tablet (≤1100 px breakpoints) ✔ · Mobile ✔ · Keyboard navigation (Tab, Enter, Esc, ⌘K, `/`, arrow keys in palette) ✔ · Loading skeleton ✔ · Empty states (no results / not available / not disclosed / no source) ✔ · Error states (data failed to load, view failed, 404, basemap fallback) ✔ · Long records ✔ · Large tables (pagination, sticky header, pinned column) ✔

## Before / after

### Existing functionality (1.x) — preserved

| 1.x | 2.0 |
|---|---|
| Landscape | Command centre (all Batch-1 panels kept: market context, evidence quality, process chain, companies by group/country, completeness, gaps) |
| Coverage & QC | Data Quality → Batch-1 QC log, completeness, country matrix (countries page) |
| Companies / Products / Equipment explorers | Rebuilt with facets, presets, views, detail pages |
| Lasers | Intelligence → Laser & photonics explorer + laser band facet |
| Compare (4 products) | Compare up to 6 models or 4 companies |
| Wafer fab / Packaging / Adv. packaging / ATMP / Automation | Intelligence → segments, Packaging intelligence, OSAT / ATMP page |
| India / China / Japan / Korea / Taiwan | India ecosystem page; country pages for all 35 countries |
| Supplier / Customer / Technology maps | Suppliers page (incl. laser-dicing BOM), Customer map, Technologies |
| Localization / Competitive / TEAL / Gap / Partner fit | Intelligence workspace (unchanged content, with sources) |
| Sources | Source register with facets + source detail with citing records |
| Record drawer | Full detail pages; evidence drawer for sources |
| Original page | Kept verbatim at `legacy/index.html`; data backed up at `data/legacy/legacy_snapshot.json` |

### Added features

Global command palette and natural-language search · faceted, URL-state filters with chips · table/grid/list views · column presets and show/hide · CSV/JSON export and copy · stable ids and deep links for every entity · product family ↔ model split · process library and explorer · technology, material, application layers · subsystem and component intelligence · fab and OSAT entities with sites · country pages · ecosystem map · relationship graph · company comparison · equipment finder, supplier finder, supply-chain explorer, packaging and fab intelligence · India/TEAL opportunity with user-defined criteria · Data Quality centre (states, freshness, missing fields, conflicts, duplicates, validation) · saved workspace · import pipeline · validation script · generated data dictionary.

### Improved features

Search (substring → indexed, fuzzy, synonyms, constraints) · filters (single global bar → per-page facets with counts) · compare (4 → 6, companies, diff highlighting, missing-value hatching) · tables (500-row cap → pagination) · typography (Arial/Calibri per brief) · accessibility (0 axe violations) · first paint.

### Modified components

`index.html` (shell only) · all UI moved to `assets/js/**` and `assets/css/app.css` · data moved out of the page into `data/`.

### New entities & relationships

Product families 146 · processes 61 · technologies 83 · materials 47 · applications 20 · subsystems 16 · component classes 61 · fabs 21 · OSATs 9 · countries 35 · deals 44 · relationships 2,681 (866 source-backed, rest derived / reference / analyst — each labelled) · conflicts 7 · duplicate candidates 14 · taxonomy extensions K (wafer manufacturing, 9 nodes) and L (subfab & facilities, 12 nodes).

### Data added

No new external facts. All company, model, customer, supplier, deal and source records are the Batch-1 evidence, restructured. New content is (a) editorial reference definitions labelled as such and (b) links derived from source-backed fields, labelled “derived”.

### Known gaps / not implemented

- **Evidence breadth**: no new companies or models were researched in this pass; the import pipeline is ready for Batch 2.
- Column **resize and drag-reorder** are not implemented (pin first column, presets, show/hide are).
- Map clusters by **country centroid**; facility coordinates are not captured.
- Per-parameter sources: Batch 1 attached sources per record, so specifications cite record-level sources (labelled).
- The six-tier source scheme of the brief is documented as a crosswalk, not applied (needs re-reading of sources).
- Saved workspace is per-browser (no backend).
- Transfer size grew (≈304 KB gzip vs 136 KB) because data is now normalised with explicit relationships; per-entity lazy loading is the next step if the dataset grows 10×.

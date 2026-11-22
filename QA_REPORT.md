# QA report & before/after review — SEMICON-DB 2.0

Tested against a local static server with headless Chromium (Playwright 1.56), desktop 1440×900 and mobile 390×844, light and dark themes. Evidence snapshot 29 Sep 2026.

## Results summary

| Area | Result |
|---|---|
| Route smoke test | **97 / 97** routes render (every section, every detail tab, legacy hashes, legacy ids, 404) with **0** console or page errors |
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

- **Evidence depth of Batch 2**: 144 products added from official titles only (pages not read) — see the Batch 2 section below.
- Column **resize and drag-reorder** are not implemented (pin first column, presets, show/hide are).
- Map clusters by **country centroid**; facility coordinates are not captured.
- Per-parameter sources: Batch 1 attached sources per record, so specifications cite record-level sources (labelled).
- The six-tier source scheme of the brief is documented as a crosswalk, not applied (needs re-reading of sources).
- Saved workspace is per-browser (no backend).
- Transfer size grew (≈304 KB gzip vs 136 KB) because data is now normalised with explicit relationships; per-entity lazy loading is the next step if the dataset grows 10×.

## Batch 2 addendum (30 Sep 2026) — filling empty processes

| Check | Result |
|---|---|
| Processes with at least one model | 33 → **58 / 61** (still empty: ingot grinding & shaping, final wafer cleaning, lead plating & finishing) |
| Equipment categories with models | 53 → **94** |
| Records added | 144 products, 6 companies, 142 Tier-1 sources |
| Import validation | All rows accepted after two importer fixes (see below); Ebara was caught as a duplicate and reused |
| Build + `npm run validate` | 0 errors (warnings: 142 search-index-only sources, 261 undated sources, 8 inaccessible) |
| Route smoke test / interactions | 97 / 97 routes, 0 console errors; interaction suite passes |

Fixes made along the way:
- The importer now knows the 2.0 taxonomy codes (K, L). It previously rejected them.
- The importer records the source access mode, the evidence age and laser type codes.
- Two Batch-1 crystal pullers moved from Epitaxy (A09.10) to Crystal growth (K01), a category Batch 1 did not have. The change is recorded on each record.
- Advanced-packaging processes now map to the equipment they use: DRIE and plating for TSV; plating and packaging lithography for RDL, WLP and fan-out; bonding for chiplets.

## Batch 3 addendum (30 Sep 2026) — small companies and startups

| Check | Result |
|---|---|
| Records added | 68 companies (21 countries, incl. new country Norway), 123 products, 9 startup profiles, 4 customer organisations, 13 customer links, 220 sources (189 Tier 1) |
| Import validation | All rows accepted. 8 similar-name warnings reviewed and all distinct: they share generic words such as "Engineering", "Instruments", "SET" |
| Build + `npm run validate` | 0 errors; 833 warnings (362 search-index-only sources, 461 undated sources, 8 inaccessible, 2 thickness-only wafer values) |
| Duplicate candidates | 14 → 23. The 9 new ones are generic-word name matches (e.g. Toray Engineering ↔ Top Engineering, Excel Instruments ↔ MKS Instruments). They are flagged for review and not merged |
| Coverage | Processes with equipment 58 → **59 / 61** (ingot grinding & shaping now covered). Equipment categories with models 94 → **116**. Still empty: final wafer cleaning, lead plating & finishing |
| Route smoke test | **110 / 110** routes render (97 earlier + 13 Batch-3 pages: startup profile, customer tabs, new fab and customer, Norway, startup filter). 0 console or page errors. The SMEE SSA/800 page shows its conflict banner as designed |
| Interaction suite | Passes: palette, facets, compare, drawer, mobile width, search timings 0.3–2.6 ms |
| Accessibility | axe-core WCAG 2 A/AA on 16 pages × light/dark (adds a startup profile, a Batch-3 model and a customer tab): **0 violations** |

Pipeline changes:
- The importer now accepts several sources per row (a `sources[]` array), startup profiles on company rows, and two new entities: `customers` and `customer_links`. Customer links check that the supplier, customer and model exist. `UNDISCLOSED:<description>` maps to the undisclosed-customer record.
- The build merges startups, customers and customer links from batch files. Batch statistics now include customer links and startups.
- There is a new HQ-country basis `SUM` ("search-result summary of a cited source, page not read"). Home and Data Quality count it separately from analyst knowledge.
- Model pages show the title-level evidence callout for any post-Batch-1 record. The startup profile panel now shows founders and maturity.
- Before publishing, summary-derived wafer sizes were removed from ten application fields and one wafer field, because no specifications are taken from summaries. One name that was not in any source, a "PVT150" row inferred from a size range, was dropped.

## Batch 4 addendum (30 Sep 2026) — keyword-driven discovery

| Check | Result |
|---|---|
| Records added | 25 companies (new country: Portugal), 33 products, 2 startup profiles, 54 sources (49 Tier 1) |
| Import validation | All rows accepted; 1 similar-name warning (Kateeva ↔ Evatec) reviewed — distinct |
| Build + validate | 0 errors; 940 warnings (search-index-only and undated sources dominate) |
| Coverage | Equipment categories with models 116 → **129** (wedge/ball bonding, die sorting, transfer molding, MBE, thermal test, mask cleaning, bare-wafer geometry, MES, dry pumps, abatement, MEMS etch, OLED) |
| Route smoke test | **114 / 114** routes render (adds a Batch-4 company, keyword search “wedge bonder”, Wedge Bonding category, Portugal); 0 console errors; interaction suite passes |

New field `discovery_keywords` on companies: import column `discovery_keywords`, shown as “Found via keywords” on the company overview and included in the search index.

## Batch 5 addendum (30 Sep 2026) — ecosystem widening

15 companies, 26 products and 43 sources; models for NuFlare, 3D-Micromac and ASMPT attached to existing companies (the duplicate guard rejected NuFlare as a new company). Build + validate: 0 errors. Route smoke test: 117 / 117 routes render with 0 console errors; interaction suite passes.

## Batch 6 addendum (30 Sep 2026)

11 companies, 26 products, 37 sources; models attached to existing LPKF, Kulicke & Soffa, SEMES and Panasonic Connect (the duplicate guard rejected Panasonic as a new company). Equipment categories with models 129 → 134. Build + validate: 0 errors. Route smoke test: 120 / 120 routes render with 0 console errors; interaction suite passes.

## Batch 7 addendum (30 Sep 2026)

7 companies, 8 sources (no products); duplicate guard rejected Basler and Keyence. Build + validate: 0 errors. Route smoke test: 122 / 122 routes render with 0 console errors; interaction suite passes.

## Batch 8 addendum (30 Sep 2026)

8 companies, 18 products, 25 sources; UTECHZONE models attached to the existing record (duplicate guard). Equipment categories with models 134 → 136. Build + validate: 0 errors. Route smoke test: 124 / 124 routes render with 0 console errors; interaction suite passes.

## Batch 9 addendum (5 Oct 2026)

19 companies, 7 products, 31 sources; one similar-name warning (UNISEM ↔ UNISERS) reviewed — distinct. Build + validate: 0 errors. Route smoke test: 127 / 127 routes render with 0 console errors; interaction suite passes.

## Supply-chain intelligence addendum (5 Oct 2026)

New routes `#/intelligence/risk` and `#/intelligence/timeline`; company completeness column and panel. Route smoke test: 130 / 130 routes render with 0 console errors; interaction suite passes. Validation 0 errors.

## Analyst addendum (5 Oct 2026)

New route `#/intelligence/analyst` (question router, "Can we build this?" engine, localization index table of 137 categories). Smoke test 137 / 137 routes with 0 console errors. axe (light + dark) shows 0 violations; this also fixed a dark-mode contrast issue in the risk heatmap. Question checks: "Can we build a wire bonder?" → C12 Wire Bonding; "Who supplies wafer probing equipment?" → 8 documented suppliers; "who supplies photoresist" → no equipment category, so it falls back to 13 company text matches, with that fallback stated; "Can we build an EUV scanner?" → not found, closest category A01.01 EUV.

## Batch 10 addendum (5 Oct 2026)

10 companies, 37 models, 48 new sources. Importer: 0 rejected. 2 duplicate warnings (Charm Engineering vs SFA / Top Engineering, on the shared word "Engineering") were checked and are false positives. Build-rule change: model categories now count toward the maker's category list (63 links), with the basis shown on each profile. Validation: 0 errors. Smoke test: 144 / 144 routes. Interaction suite passes. axe (light + dark): 0 violations. Empty categories: 91 → 70 (25 real gaps).

## Global intelligence upgrade addendum (5 Oct 2026)

**What was added:**
- Batch 11: 13 India facilities, 2 programme records, 19 sources.
- Facility entity, with validation rules for sourced, ISO-dated milestones.
- 181 entity-resolution keys and curated duplicate decisions (JSG ~ Zhejiang Jingsheng recorded as a probable same entity, not merged).
- Batch dates on records.
- New modules: flows, changes, research queue; analyst compare and laser matching.
- Regional dependency, criticality and Intelligence Score.

**Checks run:**
- Validation: 0 errors. Duplicate source URLs: none. Conflicts: 9 (2 new facility investment conflicts).
- Smoke test: 168 routes, 0 console errors. Three routes show their expected conflict banners: MDL-000099, FAC-000003 and FAC-000010.
- Interaction suite passes; "200 mm SiC equipment" no longer lists a facility with an unrecorded wafer size as a full match.
- axe (light and dark), now covering facilities, flows, research and company profiles: 0 violations.
- Performance: boot to first heading 268 ms; first contentful paint 68 ms; route render 30–55 ms; bundle 398 KB gzipped.

## Motion review addendum (21 Nov 2026)

Reviewed with the `review-animations` skill (Emil Kowalski's standards). Verdict: **Block**, on two criteria: the Escape key closed drawers with an animation, and the skeleton shimmer was a non-GPU animation with an easy GPU fix. All seven findings were fixed:

- **Easing tokens.** Added `--ease-out`, `--ease-in-out` and `--ease-drawer` to `:root`.
- **Bars and meters.** Deleted the `width` transition. It never fired, because views re-render, and it would have animated data through a layout property.
- **Skeleton shimmer.** Now moves a `::after` highlight with `transform`, using `linear` easing, instead of animating `background-position` with `ease-in-out`.
- **Nav rail.** `transform 200ms var(--ease-drawer)`, replacing `.18s ease`.
- **Filter sheet.** `transform 280ms var(--ease-drawer)`, replacing `.2s ease`.
- **Escape key.** Closes the rail and the filter sheet with no animation (`closeInstantly` in `main.js`) and resets `aria-expanded`. Closing by tap still animates.
- **Reduced motion.** Both drawers fade their opacity over 200ms instead of snapping, with no transform movement.

**Checks:**
- `npm run test:browser` runs the new `tests/browser/smoke.mjs` (98 routes, 0 errors, 3 expected conflict banners) and `tests/browser/motion.mjs` (10 / 10).
- `npm test`: 54 / 54.
- axe: not re-run this round. The axe-core dependency could not be installed in this session; the changes alter motion only, and the skeleton keeps the same colour tokens.

## Animation opportunities addendum (21 Nov 2026)

The `find-animation-opportunities` skill proposed six rows and rejected five candidates. The rejections were the command palette, route and tab swaps, tooltips, animated data, and the `<details>` accordions. Rows 1 and 2 are implemented:

- **Press feedback.** `.btn` and `.iconbtn` scale to `0.97` on `:active`, with `transition: transform 160ms var(--ease-out)`. It is subtle because buttons are used tens of times a day, and it is off under reduced motion.
- **Toast.** The toast enters through the bottom edge with `@starting-style` (`opacity: 0; translate(-50%, 100%)`) and `transition: transform 400ms ease, opacity 400ms ease`, the Sonner-style exception. It exits through the same edge (`.out`, then removed on `transitionend`, with a 600 ms fallback). Under reduced motion it fades only.

**Checks:**
- `tests/browser/motion.mjs`: 17 / 17 (7 new: press scale and release, toast enter, exit and removal, reduced-motion toast and buttons).
- Smoke test: 98 / 98 routes. `npm test`: 54 / 54.

Rows 3 and 4 are now implemented too:

- **Row 3: sources drawer.**
  - **Entrance.** The evidence drawer enters from the edge it docks to with a short 24 px travel plus a fade, `transform` and `opacity` at 200 ms `var(--ease-drawer)`, while the scrim fades in over 200 ms. This uses `@starting-style`, so it needs no JavaScript.
  - **Exit.** Closing stays instant.
  - **Keyboard.** Opened from the keyboard (`click.detail === 0`), it appears without motion via the `.instant` class.
  - **Reduced motion.** It fades only.
- **Row 4: graph re-centring.**
  - **Travel.** Clicking a node on the graph page makes the clicked node travel from where it was to the centre, using WAAPI `transform` at 250 ms `cubic-bezier(0.77, 0, 0.175, 1)`.
  - **Choreography.** Neighbour nodes fade in from 100 ms over 150 ms. Edges fade in only as the node lands (from 180 ms over 120 ms), so no edge points at an empty centre. This was adjusted after the first version showed edges meeting about 30 px below the moving node.
  - **Measured.** The node starts at the exact click point and is within 2 px of the centre when the edges appear.
  - **Keyboard.** Keyboard activation does not animate.
  - **Reduced motion.** A 150 ms fade, with no travel.

**Checks:** `tests/browser/motion.mjs` passes 24 / 24 (7 new). Smoke test 98 / 98 routes; `npm test` 54 / 54.

## Batch 14 data addendum (21 Nov 2026)

- **Data:** 18 facilities and 5 policy programmes added, with 67 sources. `node scripts/build-data.mjs`: 0 errors. The 72 new warnings are all `source.search_index` (titles and summaries only) or `source.date` (undated company or official pages).
- **Fixed during testing:**
  - The status test now treats `OPENING_CEREMONY` as a non-stage event, like `SCHEDULE_CHANGE`.
  - "2nm fab in Taiwan" returned nothing because the index held "2 nm". The tokenizer now joins a number and "nm" on both sides.
- **Checks:**
  - `npm test`: 60 / 60, with benchmark 37 / 37.
  - Smoke: 108 / 108 routes.
  - Motion: 24 / 24.

## Batch 15 data addendum (21 Nov 2026)

- **Data:** 7 facilities, 7 programmes and 10 models, with 49 sources. Build: 0 errors. The 61 new warnings are all `source.search_index` or `source.date`. One new open conflict, CNF-0010: the two Infineon Thailand investment figures.
- **Checks:**
  - `npm test`: 65 / 65, with benchmark 42 / 42 (5 new queries).
  - Smoke: 115 / 115 routes.
  - Motion: 24 / 24.

## Visual refresh (22 Nov 2026)

The layout, routes and features are unchanged. Changes:

- **Type and surfaces.**
  - System UI font stack instead of Arial.
  - 12 px panel radius with a soft shadow.
  - Translucent sticky header.
  - Rail with count pills and an accent bar on the active item.
  - Uppercase table headers with more breathing room.
  - SVG icons replace the ★ / ◐ glyphs.
- **Colour tokens.** Re-stepped light and dark neutrals. All text pairings were checked at 4.5:1 or better on surface, sunk and hero backgrounds: ink-3 is 5.6:1 on white and 6.6:1 on dark.
- **Charts (dataviz method).**
  - Ordered states (verified / partial / unverified, source tiers, confidence) use one teal ordinal ramp, re-stepped so the lightest step clears 2:1. The validator passes in light and dark.
  - Equipment segments use a new 7-slot categorical palette (`--c1` to `--c7`). It passes CVD and normal-vision separation on the adjacent pairlist in both modes. The stack is ordered by slot, and each segment keeps its colour.
  - Bars have rounded data ends and no grey track.
  - Stacked bars use rounded ends with 2 px surface gaps.
  - Legends and hover tips are unchanged.
- **Home.**
  - A hero card holds the title and search.
  - The 19-tile number wall is now three grouped stat cards (Equipment database, Ecosystem & sites, Evidence) on one shared column grid, so there is no ragged hole. Policy programmes were added.
  - New site pipeline chart: facilities by latest status class, in stage order. Each bar opens `#/facilities?status=…`.
  - New list of the most recent facility milestones.
- **Facilities.**
  - New `?status=` filter.
  - The status chart runs in pipeline order.
  - The coverage text is computed.
  - The filter note is moved to the top.
- **Fixed.** The status pill's class and date labels ran into the pill on facility pages ("Pilot production class: pilot2026-09-28"). They now stack.
- **Checks:**
  - `npm test`: 65 / 65.
  - Smoke: 117 / 117 routes (2 new filter routes).
  - Motion: 24 / 24.
  - Screenshots reviewed in light, dark and at 390 px.
  - axe not re-run, because the axe-core install is not permitted in this session.

## Batch 16 data addendum (22 Nov 2026)

- **Data:** 10 facilities (one cancelled), 2 programmes and 10 models, with 51 sources. Build: 0 errors. The 58 new warnings are all `source.search_index` or `source.date`. No new conflicts.
- **Checks:**
  - `npm test`: 70 / 70, with benchmark 47 / 47 (5 new queries).
  - Smoke: 124 / 124 routes (7 new).
  - Motion: 24 / 24.


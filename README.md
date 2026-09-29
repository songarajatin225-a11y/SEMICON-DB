# SEMICON-DB — Global Semiconductor Equipment Intelligence Graph

A source-traced intelligence database of semiconductor equipment companies, product families and models, linked to manufacturing processes, technologies, materials, applications, subsystems, components, suppliers, fabs, OSAT/ATMP houses and geography. Every fact carries its source and a verification state; missing values are shown as missing and never estimated.

**Live site:** https://songarajatin225-a11y.github.io/SEMICON-DB/ · **Legacy single-file atlas (v1):** [`legacy/`](legacy/index.html)

Built for TEAL's Laser & Photonics team. Evidence as of 29 Sep 2026 (Batch 1). This is the public edition: TEAL-internal context (programme specifications, internal BOMs, vendor scoping, pricing, partner-evaluation status) is withheld.

## What's inside

| Entity | Records | Notes |
|---|---:|---|
| Companies | 186 | 143 verified · OEMs separated from subsystem / component / materials / service suppliers |
| Product families → models | 146 → 154 | Company → Product family → Model; 106 with a published model number |
| Equipment categories | 246 (in 12 groups) | Batch-1 taxonomy (A–J) + 2.0 extensions: K wafer manufacturing, L subfab & facilities |
| Processes | 61 | Wafer manufacturing → front-end → test → back-end → advanced packaging → display → subfab |
| Technologies · materials · applications | 83 · 47 · 20 | Including the 25 laser process/source types |
| Subsystems · component classes | 16 · 61 | Supplier links from the Batch-1 supplier register |
| Fabs · OSAT/ATMP · countries | 21 · 9 · 35 | Named sites and documented equipment suppliers |
| Relationships | 2,681 | Each labelled source-backed, derived, editorial reference or analyst |
| Sources | 351 | Tiered, dated, accessibility recorded |

## Features

- **Command centre** with KPI cards, process-chain coverage, front-end/back-end/test split, regional and India distribution, evidence and source-tier breakdowns, review queue.
- **Global search / command palette** (⌘K / Ctrl K, or `/`): fuzzy and typo-tolerant, synonyms (CVD ↔ chemical vapour deposition …), natural-language constraints (“200 mm SiC laser dicing equipment”, “laser dicing suppliers in Japan”, “equipment companies with India presence”). Records that don't publish a constrained value are shown as *partial* matches, never silently included or dropped. Recent and saved searches.
- **Faceted explorers** for companies, products/models, suppliers and sources: multi-select, searchable, removable chips, bookmarkable URL state, table / grid / list views (remembered), column presets (Basic, Technical, Commercial, Supply chain, Source), show/hide columns, sorting, pagination, CSV/JSON export, copy table.
- **Detail pages** for every entity with tabs, breadcrumbs, quick actions (save, compare, copy link, copy record JSON, print, relationship graph), sources next to the claims, conflict banners and record history.
- **Process explorer** (tree · flow · details), **relationship graph** with progressive disclosure, **global ecosystem map** (country clustering, table fallback).
- **Comparison** of up to 6 models or 4 companies — facts only, differences highlighted, unpublished values hatched, no scores.
- **Intelligence workspace**: Equipment Finder, Supplier Finder, Supply-chain Explorer, Packaging and Fab intelligence, India/TEAL opportunity (your own criteria and weights — never auto-ranked), plus all Batch-1 analyses (TEAL view, gap analysis, partner fit, localisation, competitive landscape, customer map, deals, laser explorer, segments).
- **Data Quality centre**: verification/quality states, freshness, missing key fields, conflicts (both claims shown), duplicate candidates (never auto-merged), validation findings, relationship basis, source hygiene, Batch-1 QC log, methodology.
- **India ecosystem** page and country pages; saved workspace (local to the browser).

## Evidence rules

- Confidence: official source = HIGH; two independent industry sources = MEDIUM; single industry or distributor source = LOW; blog or market list only = UNVERIFIED.
- Customer links: CONFIRMED only when the supplier, the customer or a filing states it; reported or evaluation-stage links are PROBABLE.
- Market class only from a published ranking or revenue; market share is never estimated. No scores or “best” rankings.
- Pages that blocked access are marked not accessible and were not bypassed.
- Statement labels: source-backed fact · manufacturer claim · derived · editorial reference · analyst (not source-traced).

## Run locally

The site is static (no backend). Serve the folder over HTTP — browsers block `fetch` from `file://`:

```bash
python3 -m http.server 8080      # or: npx serve
# open http://localhost:8080/
```

## Data pipeline

```bash
npm install              # dev tools only (map pre-rendering)
npm run build            # legacy snapshot + reference taxonomy + staged batches → data/*.json + data/bundle.json (validates; fails on errors)
npm run validate         # re-validate published data independently
npm run build:map        # re-render data/basemap.json (only when the country reference changes)
node scripts/import.mjs new-companies.csv --entity companies            # dry run: validation + duplicate report
node scripts/import.mjs new-companies.csv --entity companies --write    # stage into data/batches/, then npm run build
node scripts/gen-dictionary.mjs  # regenerate DATA_DICTIONARY.md
```

## Documentation

[ARCHITECTURE.md](ARCHITECTURE.md) · [DATA_MODEL.md](DATA_MODEL.md) · [DATA_DICTIONARY.md](DATA_DICTIONARY.md) · [DATA_SOURCES.md](DATA_SOURCES.md) · [CONTRIBUTING.md](CONTRIBUTING.md) · [QA_REPORT.md](QA_REPORT.md)

## Deployment

GitHub Pages serves the `gh-pages` branch root. `.nojekyll` is kept so folders are served as-is. Old URLs keep working: legacy view hashes (`#products`, `#landscape`, `#china` …) redirect to their 2.0 routes, and Batch-1 record ids (`C0001`, `P00001`, `S0001`, `CU001`) resolve to the 2.0 records.

# SEMICON-DB — Global Semiconductor Equipment Intelligence Graph

A source-traced intelligence database of semiconductor equipment companies, product families and models, linked to manufacturing processes, technologies, materials, applications, subsystems, components, suppliers, fabs, OSAT/ATMP houses and geography. Every fact carries its source and a verification state; missing values are shown as missing and never estimated.

**Live site:** https://songarajatin225-a11y.github.io/SEMICON-DB/ · **Legacy single-file atlas (v1):** [`legacy/`](legacy/index.html)

Built for TEAL's Laser & Photonics team. Evidence: Batch 1 (29 Sep 2026, pages read) and Batch 2 (30 Sep 2026, official titles via web search — see below). This is the public edition: TEAL-internal context (programme specifications, internal BOMs, vendor scoping, pricing, partner-evaluation status) is withheld.

## What's inside

| Entity | Records | Notes |
|---|---:|---|
| Companies | 192 | 143 verified · OEMs separated from subsystem / component / materials / service suppliers · 6 added in Batch 2 |
| Product families → models | 241 → 298 | Company → Product family → Model; 219 with a published model number · 144 added in Batch 2 |
| Equipment categories | 246 (in 12 groups) | Batch-1 taxonomy (A–J) + 2.0 extensions: K wafer manufacturing, L subfab & facilities |
| Processes | 61 | Wafer manufacturing → front-end → test → back-end → advanced packaging → display → subfab |
| Technologies · materials · applications | 83 · 47 · 20 | Including the 25 laser process/source types |
| Subsystems · component classes | 16 · 61 | Supplier links from the Batch-1 supplier register |
| Fabs · OSAT/ATMP · countries | 21 · 9 · 35 | Named sites and documented equipment suppliers |
| Relationships | 3,672 | Each labelled source-backed, derived, editorial reference or analyst |
| Sources | 493 | Tiered, dated, access mode recorded (read directly vs title via web search) |

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

## Batch 2 (30 Sep 2026): filling empty processes

Batch 2 targeted every process and equipment category that had no equipment. It added 144 products from 39 manufacturers (6 new companies: PVA TePla, Okamoto, SpeedFam, Organo, Kurita, Nordson). Processes with equipment went from 33 to 58 of 61, and equipment categories with models from 53 to 94.

Every Batch-2 record comes from the **manufacturer's own** product page, press release, brochure or SEC filing, found by web search. Direct page access was blocked in the capture environment, so only the official URL and title were captured. These records are therefore marked **Partially verified / Medium confidence**, carry no specifications, and each source is labelled "Title via web search · page not read". Candidates whose only evidence was a generic page title or a third-party site (Kingsemi, SMEE, Hwatsing, RORZE models) were not added. Still empty: ingot grinding, final (prime) wafer cleaning, lead plating.

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

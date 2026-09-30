# SEMICON-DB — Global Semiconductor Equipment Intelligence Graph

A source-traced intelligence database of semiconductor equipment companies, product families and models, linked to manufacturing processes, technologies, materials, applications, subsystems, components, suppliers, fabs, OSAT/ATMP houses and geography. Every fact carries its source and a verification state; missing values are shown as missing and never estimated.

**Live site:** https://songarajatin225-a11y.github.io/SEMICON-DB/ · **Legacy single-file atlas (v1):** [`legacy/`](legacy/index.html)

Built for TEAL's Laser & Photonics team. Evidence: Batch 1 (29 Sep 2026, pages read), Batch 2 (30 Sep 2026, official titles via web search) Batch 3 (30 Sep 2026, small companies and startups) and Batch 4 (30 Sep 2026, keyword-driven discovery) — see below. This is the public edition: TEAL-internal context (programme specifications, internal BOMs, vendor scoping, pricing, partner-evaluation status) is withheld.

## What's inside

| Entity | Records | Notes |
|---|---:|---|
| Companies | 285 | 143 verified · OEMs separated from subsystem / component / materials / service suppliers · 6 added in Batch 2 · 68 small companies and startups in Batch 3 · 25 via keyword search in Batch 4 (16 startups in total) |
| Product families → models | 329 → 454 | Company → Product family → Model; 375 with a model number · 144 added in Batch 2 · 123 in Batch 3 · 33 in Batch 4 |
| Equipment categories | 246 (in 12 groups) | Batch-1 taxonomy (A–J) + 2.0 extensions: K wafer manufacturing, L subfab & facilities |
| Processes | 61 | Wafer manufacturing → front-end → test → back-end → advanced packaging → display → subfab |
| Technologies · materials · applications | 83 · 47 · 20 | Including the 25 laser process/source types |
| Subsystems · component classes | 16 · 61 | Supplier links from the Batch-1 supplier register |
| Fabs · OSAT/ATMP · countries | 22 · 9 · 37 | Named sites and documented equipment suppliers |
| Relationships | 5,122 | Each labelled source-backed, derived, editorial reference or analyst · 74 customer links (13 added in Batch 3) |
| Sources | 767 | Tiered, dated, access mode recorded (read directly vs title via web search) |

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

## Batch 3 (30 Sep 2026): small companies and startups

Batch 3 searched for small and mid-size equipment makers and startups missing from the database, by segment (lithography, deposition, etch, thermal, wet, metrology/inspection, test, bonding and packaging, laser, crystal growth, automation) and by region (US, Europe incl. Norway, Lithuania and the Czech Republic, Japan, Korea, Taiwan, China, Malaysia, Singapore, Israel, India). It added **68 companies across 21 countries, 123 products, 9 startup profiles, 4 customer organisations and 13 customer links**, from 220 sources (189 Tier 1).

- **Startups** (funding, founders and year as reported): Lace Lithography (NO, helium atom-beam lithography), Multibeam (US, multicolumn e-beam), Forge Nano (US, ALD), Halo Industries (US, laser SiC wafering), ATLANT 3D (DK, direct atomic layer processing), AlixLabs (SE, ALE pitch splitting), UNISERS (CH, contamination inspection), Inversion Semiconductor (US, accelerator light source), Xallent (US, nanoprobing).
- **Small / mid-size equipment makers**: e.g. Raith, Heidelberg Instruments, Obducat, JEOL, Ushio, Nanoscribe, SCIL (lithography); Angstrom Engineering, Evatec, Kurt J. Lesker, Annealsys, SVCS, Tystar, centrotherm, TES, Leadmicro (deposition / thermal); Samco, SENTECH, Trymax, scia Systems, Ion Beam Services (etch, strip, implant); Siconnex, Modutek, Semsysco, KCTech (wet / CMP); AUROS, NEXTIN, Nanotronics, Sigray, XwinSys (metrology / inspection); Exicon, MIRAE, UniTest, AEM, Aemulus, Mi Equipment, ficonTEC (test and handling); Shibaura, Toray Engineering, Takatori, Finetech, SET, Palomar, YES, PINK, Amtech (bonding and packaging); Oxford Lasers, Workshop of Photonics, LightMachinery, E&R Engineering (laser); Revasum, Mitsuboshi Diamond (SiC grinding/polishing, scribe-and-break); CVD Equipment, Linton Crystal (crystal growth — fills *ingot grinding & shaping*); Kensington Labs (wafer robots).
- **India**: Holmarc Opto-Mechatronics (spin coaters), Scantech Laser (laser machines), Excel Instruments (evaporation / sputtering systems, named on IIT facility pages).
- **Customer links** only where a title states them: e.g. Multibeam → SkyWater (SkyWater press release), YES → Powertech (YES press release), ficonTEC → VLC Photonics, Palomar → Bay Photonics / EPIC, plus orders from unnamed customers (Obducat, YES, AEM). NEXTIN → SK hynix is PROBABLE (single media report).

Same evidence rule as Batch 2: pages were located by web search but not read, so products carry **no specifications**. Product names come from page titles (MEDIUM); 6 names that appear only in the search summary are LOW, as is one industrial laser marker whose semiconductor use is not stated. Company profile facts that come from a search-result summary (city, founding year, funding) are labelled `SEARCH_SUMMARY` and the HQ basis “search-result summary of a cited source”. Directory-only companies (KCTech, UniTest, Mi Equipment, Leadmicro, SCIL, Excel Instruments) are LOW confidence. Candidates without a usable source were skipped (e.g. Vistec, DAS Environmental, Omicron Scientific, Milman, FemtoMetrix), as were general-purpose laser machine builders without a semiconductor product (Pulsar Photonics), chip-design startups and fabs that build tools only for themselves (Atomic Semi).

## Batch 4 (30 Sep 2026): keyword-driven discovery

Batch 4 searched the web with **equipment and process keywords**, starting with categories that had no companies. Examples: *wedge bonder*, *die sorter*, *film assisted molding*, *molecular beam epitaxy*, *sputtering system*, *wafer flatness measurement*, *EUV pellicle*, *photomask repair*, *semiconductor MES*, *dry vacuum pump*, *abatement scrubber*, *process chiller*, *MEMS release etch* and *OLED inkjet*. It added **25 companies, 33 products and 54 sources** (49 Tier 1), for example:
- Wire bonding: Hesse Mechatronics, West-Bond, TPT.
- Die attach, die sorting and molding: Mühlbauer, ITEC, Boschman.
- Test and deposition: inTEST (thermal test), Riber, SVT Associates and Dr. Eberl (MBE), AJA, Semicore and Torr (sputter / evaporation).
- Wafer metrology and masks: Corning Tropel (bare-wafer flatness), UnitySC, Canatu and the startup aweXome Ray (CNT EUV pellicles), Bruker (mask repair / cleaning).
- Software and subfab: Critical Manufacturing (MES, Portugal), Kashiyama and Leybold (dry pumps), Kanken Techno (abatement), Mirapro (chillers).
- MEMS and display: memsstar (MEMS vapour etch), Kateeva (OLED inkjet).

Each of these companies stores its **discovery keywords**. They appear on the company page and are indexed by search, so searching “wedge bonder” finds Hesse, West-Bond and TPT. They are a discovery aid, not a claim about the company. Equipment categories with models went from 116 to 129. Candidates with no usable page were skipped (e.g. EDA Industries, Cosmic Equipment, SemiTEq, Maruyama).

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
# also: --entity models | sources | customers | customer_links  (JSON rows may carry a sources[] array and a startup{} profile)
node scripts/gen-dictionary.mjs  # regenerate DATA_DICTIONARY.md
```

## Documentation

[ARCHITECTURE.md](ARCHITECTURE.md) · [DATA_MODEL.md](DATA_MODEL.md) · [DATA_DICTIONARY.md](DATA_DICTIONARY.md) · [DATA_SOURCES.md](DATA_SOURCES.md) · [CONTRIBUTING.md](CONTRIBUTING.md) · [QA_REPORT.md](QA_REPORT.md)

## Deployment

GitHub Pages serves the `gh-pages` branch root. `.nojekyll` is kept so folders are served as-is. Old URLs keep working: legacy view hashes (`#products`, `#landscape`, `#china` …) redirect to their 2.0 routes, and Batch-1 record ids (`C0001`, `P00001`, `S0001`, `CU001`) resolve to the 2.0 records.

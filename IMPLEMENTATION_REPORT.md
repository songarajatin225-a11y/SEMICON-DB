# SEMICON-DB — Global Semiconductor Intelligence Graph: implementation report

Date: 5 October 2026 · Branch: `gh-pages` · Live: https://songarajatin225-a11y.github.io/SEMICON-DB/

This report answers the 23 deliverables in the *Global Semiconductor Intelligence Graph* brief.

The work followed the brief's order: audit → preserve → normalise → expand → connect → verify → enrich → improve UX → build the intelligence layer. Nothing was rewritten from scratch. No route was changed and no record was deleted. The site still deploys as static files on GitHub Pages.

---

## 1. Existing architecture audit

**What existed before this upgrade (schema 2.0.0, Batches 1–10):**

| Area | State found |
|---|---|
| Stack | Static ES-module SPA, no bundler or framework. Hash router `#/section/:id?params`; views return `{title, html}`; delegated events (`data-action`, `data-param`, `data-qparam`). |
| Data | `scripts/build-data.mjs` merges the Batch-1 legacy snapshot with staged batches (`data/batches/*.json`) into per-entity JSON files and one `bundle.json`. `scripts/import.mjs` stages new rows with a duplicate guard. `scripts/validate.mjs` blocks publishing on errors. |
| Entities | 18 kinds: companies, product families, models, equipment taxonomy (258 nodes), processes, technologies, materials, applications, subsystems, component classes, suppliers, fabs, OSATs, customers, countries, deals, relationships and sources. |
| Evidence | Sources are tiered and dated, with access mode recorded. Records carry a verification state, a confidence score (0–100) with a level, evidence depth, freshness and quality state. 7 open conflicts. 30 duplicate candidates, never auto-merged. |
| Features | Command centre; Ctrl K palette with typo-tolerant, synonym-aware natural-language search; faceted explorers with CSV/JSON export; detail pages; process explorer; relationship graph; global map; comparison; Data Quality centre; India page; intelligence workspace (finder, supplier finder, supply chain, packaging, fab, India/TEAL opportunity, lasers, deals, competitive, partner fit, concentration index, events timeline, analyst with "Can we build this?" and the localization index). |
| Financials · patents · market | 41 companies have reported financials with sources; 3 patent records; 12 SEMI market rows. |

**Gaps against the brief**

- No site-level facility records: Indian projects existed only as free-text "sites".
- Entity resolution was weak: 52 aliases, and some were business-unit qualifiers ("Electronics", "Compressors") that caused false matches.
- No regional dependency view, no competitor view by region, and no company-level supply-chain criticality.
- No composite intelligence score.
- No process flows.
- No temporal "what changed" view: every record carried the Batch-1 date.
- No research queue.
- Analyst could not compare companies or match by specification.
- Localization stopped at equipment level.
- No correction workflow.

**Data-quality issues found and fixed**

- **Temporal fields:** `first_added` for all batch records was the Batch-1 date. It now carries the real batch date.
- **Generic aliases:** qualifiers like "(Electronics)" are no longer treated as aliases.
- **One probable duplicate:** "JSG" (Batch 1) vs Zhejiang Jingsheng (Batch 9). It is recorded as a decision, not merged.
- **Search:** a facility with no recorded wafer size is now a partial match, not a full one.

## 2. New architecture

The static GitHub Pages architecture is unchanged; it was extended, not replaced.

```
data/batches/*.json ──► scripts/import.mjs (stage, duplicate guard)
        │                       │
        ▼                       ▼
scripts/build-data.mjs ──► entities + facilities + derived relationships + resolution keys + conflicts + duplicate decisions
        │                                   │
        ▼                                   ▼
scripts/lib/validate.mjs (errors block)   data/*.json + data/bundle.json (398 KB gzipped)
        │
        ▼
assets/js (static SPA): core/store · core/search (index + resolveCompany) · core/scores (derived scores) · views/*
```

**New modules**
- `assets/js/core/scores.js` — regional blocs, supplier criticality, Intelligence Score, component/subsystem localization.
- `assets/js/views/facilities.js` — facility pages.
- `assets/js/views/research.js` — flows, what changed, research queue.
- `scripts/reference/entity-decisions.mjs` — curated entity-resolution decisions.

**Recommended future architecture (not migrated):** Frontend → API → search engine → graph DB plus relational DB → ingestion pipeline → research agents. This is worth doing once the record count passes roughly 50k, or once live alerts or authenticated private layers are needed. It is not needed at the current scale (about 9,100 records).

## 3. Database schema

The 18 existing entities are unchanged; see [DATA_MODEL.md](DATA_MODEL.md) and [DATA_DICTIONARY.md](DATA_DICTIONARY.md). New this round:

- **`facilities`** (`FAC-xxxxxx`):
  - operator and partners;
  - country, state, city and approximate coordinates;
  - scheme and approval date;
  - `status` and `status_date`, plus a dated, sourced `status_history[]`;
  - `investment[]` claims (currency, unit, label, sources) with `investment_conflict`;
  - capacity, technology, wafer size, products, jobs;
  - verification, confidence, evidence depth, sources, batch and dates.
- **`intel.programs`** — programme facts (ISM approved units, Semicon 2.0), each fact with its sources.
- **`companies[].resolution_keys[]`** `{alias, basis}`, plus `companies[].batch` and `dates.first_added` from the real batch.
- **`quality.duplicate_candidates[].decision`** — the curated decision for the pair.
- **New edges:** `located_in` (facility → country) and `operates` (fab / OSAT / company → facility). Fab and OSAT records get `facility_ids`.

Where the brief names entities that already exist under another name:
- `company_aliases` = `resolution_keys`
- `equipment_models` = `models`
- `events` = deals + dated sources + facility milestones
- `risk_scores` / `localization_scores` = derived client-side with published methods

`patents`, `financials` and `market` already existed and were kept.

## 4. Taxonomy

The equipment taxonomy has 258 nodes in 12 groups:
- A — wafer fab / front end
- B — mask
- C — back end
- D — advanced packaging
- E — back-end process view
- F — power and SiC
- G — compound
- H — MEMS
- I — display
- J — automation
- K — wafer manufacturing
- L — subfab and facilities

New this round: **52 editorial cross-references** between overlapping branches, for example E12 "Wire bonding" ↔ C12 "Wire Bonding", D03 HBM → TC bonding / TSV, and A29 CD measurement → CD-SEM. They are shown as "see also" and kept apart from real gaps. A cross-reference is never counted as a supplier.

There are 61 processes. There are now 12 reference **process flows**: Si wafer, logic, DRAM, 3D NAND, SiC, GaN, MEMS, CIS, RF/GaAs, HBM/3D, fan-out/WLP and back-end.

## 5. Data expansion plan

**Done this round**

- **Batch 10:** 10 companies, 37 models and 48 sources. Targets were the major-OEM portfolios and the empty categories:
  - Lam: SPEED, ALTUS, Striker, VECTOR, Flex
  - Applied: Sym3, eHARP, SEMVision
  - ASML: NXT, HMI eScan
  - Also: TEL, Kokusai, NuFlare, Zeiss, EVG, Besi, SUSS, K&S, YES, EMD, Atlas Copco, DAS, Yaskawa, Cimetrix, INFICON, SYNUS, V Technology, Charm, Omron
- **Batch 11:** 13 India facilities, 2 programme records and 19 sources.
- **Model-derived category links:** 63. Empty equipment categories fell from 91 to 70, and only 25 of those are real gaps.

**Next waves**

The research queue page (`#/intelligence/research`) tracks these waves:

1. Equipment OEMs
2. Materials
3. Fabs
4. OSAT
5. Metrology
6. Subsystems
7. Components
8. Startups
9. India
10. Long tail

Each wave runs: discover → extract → normalise → verify → score → store → connect. The highest-priority items are the remaining real gaps (mask making and handling, package cleaning, EMIB / InFO / chiplet tooling, InP / AlGaN / InGaN / AlN, wastewater, power distribution and facility controls), specifications for all title-level models, and facility-level records outside India.

## 6. New UI features

- **New routes:**
  - Facilities list and profile (`#/facilities`, `#/facilities/FAC-…`)
  - Process flows (`#/intelligence/flows`)
  - What changed (`#/intelligence/changes`)
  - Research queue (`#/intelligence/research`)
- **New sections:**
  - India page: site-level facilities, a state-wise table and programme facts.
  - Fab and OSAT pages: their linked facility records.
  - Equipment pages: "players by region".
  - Company profiles: entity-resolution keys, entity decision callouts, the Intelligence Score panel with its method, and verification age.
  - Companies table: Intelligence score, Supplier criticality and Last verified columns.
  - Concentration page: a regional dependency column, a bloc × equipment-group matrix and criticality-based critical nodes.
  - Events timeline: facility milestones.
  - Home: KPIs for facilities, startups and records added since Batch 1.
- **Every record:** a "Suggest a correction ↗" link.

## 7. Search capabilities

The existing search already did exact, partial, typo-tolerant (Levenshtein), synonym, constraint-parsing (wafer size, material, country, India) and partial-match search.

New this round:
- facilities are indexed, with type hints ("plant", "unit", "site");
- fab and OSAT questions also cover facilities;
- materials are derived from facility technology text, so "GaN fab in India" finds the Crystal Matrix GaN fab;
- alias and short-form keys are indexed;
- `resolveCompany()` gives exact entity resolution.

All search runs client-side over an inverted index built once per session: queries take about 1 ms, and the index takes about 30 ms to build.

## 8. Graph architecture

The existing graph has typed edges, each labelled with its basis (`source`, `derived`, `reference`, `analyst`) and carrying sources and confidence. The relationship graph view supports progressive disclosure up to depth 2, with node-type toggles.

New this round:
- `operates` and facility `located_in` edges;
- 6,160 relationships in total;
- graph analytics: supplier criticality (sole and duopoly categories, OEM dependents, fab/OSAT customers), regional concentration (HHI and bloc shares) and critical-node ranking.

The graph view does not yet filter by edge type or confidence, only by node type; that is on the roadmap.

## 9. AI architecture

There is **no language model and no API key** in this deployment; on a public static site one would expose credentials or need a backend.

The "AI layer" is a deterministic, grounded question router in `views/analyst.js`. Every answer is built from records and shows the rule that produced it. It handles:
- can-we-build;
- who supplies;
- alternatives;
- compare A vs B vs C;
- requirement-based laser matching;
- most concentrated categories;
- localization candidates;
- facilities by status;
- TEAL partners;
- a free-text fallback through the search engine.

Future work: a server-side assistant (retrieval over `bundle.json` plus citations) behind authentication. It should reuse these routes as tools so answers stay grounded and cited. The research-agent pipeline (company, product, facility, financial, patent, supplier, customer, news, India, verification and dedup agents) maps onto the import → build → validate stages that already exist.

## 10. Source methodology

- Every fact cites numbered sources (`SRC-…`) with:
  - URL, title, publisher, type and tier;
  - publication date and access date;
  - access mode: read directly, or title/summary via web search.
- In this environment, publisher sites were egress-blocked. Batches 2–11 therefore used titles and search-result summaries only; no page was read. These records are Partially verified / Medium (or Low) and carry no specifications.
- **Tier mapping to the brief:**
  - repo Tier 1 = brief Tier 1 (official, filing, government, datasheet);
  - repo Tier 2 = brief Tiers 2–3 (industry press and associations);
  - repo Tier 3 = directories, distributors and aggregators, i.e. brief Tier 4 discovery;
  - repo Tier 4 = blogs and wikis (unverified).

  Tier 3–4 sources are never the sole evidence for an important claim. Where they are, the record is LOW; for example, the capacity of the CDIL Mohali facility.
- Robots.txt, paywalls, CAPTCHAs and authentication were respected; nothing was bypassed.

## 11. Data confidence methodology

- Records carry:
  - a verification state: VERIFIED, PARTIALLY_VERIFIED or UNVERIFIED;
  - a confidence `{score 0–100, level HIGH/MEDIUM/LOW/UNVERIFIED}`;
  - an evidence depth: CONTENT, TITLE, SEARCH_SUMMARY, TIER4 or INTERNAL.
- Title-level models are MEDIUM. They are LOW when the model name appears only in a summary, or the only source is a directory.
- Facilities are MEDIUM, or LOW when the key figures come only from secondary coverage.
- "Unknown is valid data": missing values render as "Not captured" or "Not publicly disclosed" and are never estimated.

## 12. Data quality methodology

- **Validation** — errors block the build:
  - id formats and uniqueness;
  - referential integrity;
  - cited sources exist;
  - URLs parse;
  - ISO dates;
  - facilities need sources and sourced, dated milestones.
- **Warnings:**
  - search-index-only sources and undated sources;
  - unmapped countries;
  - duplicate source URLs (new; none found).
- **Conflicts:** 9 open conflicts, including 2 facility investment conflicts. Both claims are shown and nothing is resolved silently.
- **Duplicates:**
  - 33 candidates, found by name similarity, containment, same domain, or (new) a shared resolution key;
  - curated decisions are shown on both company pages;
  - nothing is merged automatically.
- **Freshness and completeness:**
  - source freshness;
  - verification age bands: < 30 days Fresh · 30–90 Current · 90–180 Aging · 180–365 Stale · > 365 Needs verification;
  - per-company completeness (16 fields in 5 groups).

## 13. India module

India now has a first-class facility layer: 13 sites in 7 states.

| Site | State | Status | Investment (as reported) |
|---|---|---|---|
| Tata–PSMC fab, Dholera | Gujarat | Foundation laid (Mar 2024) | over ₹91,000 cr |
| Tata TSAT, Jagiroad | Assam | Foundation laid (Mar 2024) | about ₹27,000 cr |
| CG Semi OSAT, Sanand | Gujarat | Pilot (Aug 2025) | ₹7,500 cr vs ₹7,600 cr (conflict) |
| Micron ATMP, Sanand | Gujarat | Operational (Feb 2026) | US$2.75 bn total |
| Kaynes Semicon, Sanand | Gujarat | Approved (Sep 2024) | ₹3,307 cr |
| HCL–Foxconn, Jewar | Uttar Pradesh | Approved (May 2025) | ₹3,706 cr |
| SiCSem SiC fab, Bhubaneswar | Odisha | Approved (Aug 2025) | not separately captured |
| 3D Glass Solutions, Bhubaneswar | Odisha | Approved (Aug 2025) | not separately captured |
| CDIL, Mohali | Punjab | Approved (Aug 2025) | not separately captured |
| ASIP, Visakhapatnam | Andhra Pradesh | Foundation laid (Aug 2026) | ₹460 cr vs US$260 m (conflict) |
| Crystal Matrix, Dholera | Gujarat | Approved (May 2026) | not separately captured |
| Suchi Semicon, Surat | Gujarat | Approved (May 2026) | ₹868 cr |
| YES equipment plant, Sulur | Tamil Nadu | Operational (Sep 2024) | not captured |

Programme facts:
- 10 ISM units at about ₹1.60 lakh crore (Aug 2025);
- 12 units (May 2026);
- Semicon 2.0 approved 15 Jul 2026 with a ₹1,27,500 crore outlay.

Existing India features remain: companies, presence records, the ecosystem chain and the localisation table.

## 14. Supply-chain module

- **Concentration index per category** (0–100): scarcity 40 % + HHI 35 % + no India-linked supplier 15 % + evidence weakness 10 %.
- **New:** regional dependency shares for each category, and a bloc × group matrix.
- **New:** supplier criticality per company, scored as follows and capped at 100:
  - 25 per sole-supplier category;
  - 10 per two-supplier category;
  - 10 per OEM it is documented as supplying;
  - 5 per fab or OSAT customer.
- **New:** critical-node ranking and facility milestones in the events timeline.

Not scored, because there is no evidence: lead times, export controls, patent dependency and raw-material exposure.

## 15. Localization module

**Equipment level** (existing): 40 % Indian subsystem coverage + 20 % Indian OEM present + 20 % alternatives + 20 % OEM India presence. Bands: VERY HIGH ≥ 75 · HIGH 55–74 · MEDIUM 35–54 · LOW < 35. Indications: BUILD / HYBRID / PARTNER / BUY. These map to the brief's terms as LOCALIZE / JV-LICENSE / PARTNER / BUY-IMPORT.

**New: subsystem level** — the share of component classes with a documented Indian supplier.

**New: component-class level** — 50 % Indian suppliers + 25 % global alternatives + 25 % breadth of use.

Component-level evidence is thin: 19 of 61 classes have any documented supplier. The page says so.

## 16. TEAL intelligence module

The existing TEAL portfolio view, gap analysis, partner fit and India / TEAL opportunity workspace are kept. The opportunity workspace uses your own criteria and weights and never auto-ranks.

The public edition withholds TEAL-internal context. The analyst can list the documented partner-fit candidates.

Private TEAL assumptions are not mixed into public facts. A private layer needs an authenticated deployment (see 18).

## 17. Performance

Measured locally with Playwright:
- boot to first heading: 268 ms;
- first contentful paint: 68 ms;
- route render: 30–55 ms;
- facet update: 24 ms;
- search: about 1 ms per query.

`bundle.json` is 4.5 MB raw and 398 KB gzipped. Tables paginate. The map basemap is fetched only when the map opens.

For 50k+ records the plan is:
- load per-entity shards lazily (they are already published as `data/<entity>.json`);
- precompute the search index at build time;
- virtualize the large tables.

## 18. Security

- There are no secrets, API keys or tokens anywhere in the repository or frontend.
- The site is read-only. Corrections go through a pre-filled GitHub issue link; nothing is written from the page.
- There is no authentication, so there is no admin UI. Admin operations (add, edit, verify, flag, merge, archive) stay in the CLI pipeline (`import.mjs` → `build-data.mjs` → `validate.mjs`) and its git history.
- A private TEAL layer must live in a separate, authenticated deployment. It must not go into this public `gh-pages` branch.

## 19. Deployment

```bash
npm run build      # node scripts/build-data.mjs — merges batches, validates, writes data/*.json + bundle.json
node scripts/validate.mjs
python3 -m http.server 8765   # local preview
git push origin gh-pages      # GitHub Pages serves the branch root (.nojekyll)
```

To add data, stage it with `node scripts/import.mjs <file> --entity companies|models|sources|customers|customer_links --batch NAME --write`, then rebuild. Facility and programme rows are written as `fa` / `pg` arrays in a batch file (see `data/batches/batch-11.json`).

## 20. Modified files

- **Styles:** `assets/css/app.css` — timeline, warning pill, active flow step.
- **Core:**
  - `assets/js/core/search.js` — facility documents, alias keys, `resolveCompany()`, facility constraints and hints.
  - `assets/js/core/store.js` — facility kind and route.
- **Shell and UI:**
  - `assets/js/main.js` — Facilities in the navigation.
  - `assets/js/ui/components.js` — "Suggest a correction".
  - `assets/js/ui/palette.js` — facilities shortcut.
- **Views:**
  - `analyst.js` — compare, laser matching, business questions, players by region, subsystem/component localization.
  - `companies.js` — resolution keys, entity decisions, Intelligence Score, criticality and verification-age columns and panel.
  - `equipment.js` — players by region.
  - `home.js` — new KPIs.
  - `index.js` — facilities route.
  - `india.js` — facilities, state table, programmes.
  - `intelligence.js` — new modules.
  - `orgs.js` — linked facilities.
  - `risk.js` — regional dependency, bloc matrix, criticality nodes, facility events.
  - `search.js` — facility result group.
- **Build and validation:**
  - `scripts/build-data.mjs` — facilities, programmes, resolution keys, entity decisions, alias qualifier filter, batch dates, model-derived categories, facility conflicts.
  - `scripts/lib/validate.mjs` — facility rules and duplicate URLs.
  - `scripts/validate.mjs` — facilities.
- **Generated data:** `data/*.json` and `bundle.json`.
- **Documentation:** `README.md`, `DATA_MODEL.md`, `QA_REPORT.md`.

## 21. New files

- `assets/js/core/scores.js`
- `assets/js/views/facilities.js`
- `assets/js/views/research.js`
- `scripts/reference/entity-decisions.mjs`
- `data/batches/batch-11.json`
- `data/facilities.json`
- `IMPLEMENTATION_REPORT.md`

## 22. Remaining limitations

- **Evidence depth:** pages were not read in this environment (egress-restricted). Batches 2–11 are title- or summary-level, models have no specifications, and figures from search summaries could contain summary errors. Each is labelled as such and linked to its source for re-checking.
- **Not captured at scale:**
  - revenue and financials beyond 41 companies;
  - CapEx, installed base and prices;
  - lead times;
  - patents (only 3);
  - market share;
  - customers beyond 74 links;
  - facilities outside India.
- **No LLM assistant, no alerts, no authentication or admin UI, no private TEAL layer.** These need a backend.
- **Graph view:** node-type toggles only; no edge-type or confidence filters yet.
- **No India map with point markers:** a state table is shown instead. The basemap projection is precomputed per country, not per coordinate.
- **Coverage:**
  - 25 equipment categories are real research gaps;
  - 45 more categories have no supplier of their own and point to an equivalent category through an editorial cross-reference;
  - component-level supplier evidence covers 19 of 61 classes.
- **Not updated automatically:** status milestones and investment figures only change when a new batch adds a dated source.

## 23. Roadmap

1. **Evidence deepening:** re-read Tier-1 pages in an environment with web access, then promote records to VERIFIED and capture specifications (datasheets first).
2. **Facility layer worldwide:** TSMC, Samsung, Intel, Micron, SK hynix, GlobalFoundries, UMC, SMIC, Rapidus and the main OSAT sites, starting from the existing fab and OSAT records' named sites.
3. **Financials and patents:** filings-first annual series (revenue, R&D, CapEx, backlog) with currency, fiscal year and source; patent families from patent-office links, for hybrid bonding, stealth dicing and EUV first.
4. **Graph view:** edge-type and confidence filters, export, and an India map with point markers.
5. **Backend (optional):** API, search index, graph store, authenticated private TEAL layer, alerts (funding, facility status, product launches) and a cited assistant that reuses the analyst routes as tools.
6. **Scale:** lazy per-entity shards, a prebuilt search index and virtualized tables once the record count passes about 50k.

---

## SEMICON-DB 3.0 addendum (5 Oct 2026)

The 3.0 brief (159 sections) was audited against the platform as it stood after the upgrade above. Most of it was already in place. This round built the gaps that can be done honestly on a static site with public-source evidence. The remaining items are listed with the reason each is not built.

### Audit against the 3.0 brief

| Brief area | State before this round | This round |
|---|---|---|
| §116 / §123 tests, search benchmark | Browser smoke, interaction and axe scripts only (outside the repo) | **`npm test`**: validation plus 50 headless tests over the real client modules, including a gold-standard search benchmark (`tests/search-benchmark.json`, 26 queries, 100 % recall) and entity-resolution cases |
| §77 / §143 / §145 claim-level provenance and lineage | Record-level sources | **Claims layer**: 3,579 claims in `data/claims.json`, lazy-loaded (63 KB gzipped) |
| §19 evidence policy | Verification state + evidence depth | Each claim is typed DIRECTLY_STATED (3,222), DIRECTLY_SPECIFIED (52), CALCULATED (1, formula stored), INFERRED (286, shown as "Inference / analyst assessment"; their confidence is "not source-backed") or UNVERIFIED (18) |
| §66 data-quality score; §68 research status | Confidence and completeness only | **Data-quality score** (0–100, method published) separate from confidence and completeness, plus a research status per company (DISCOVERING · VERIFYING · COMPLETE · CONFLICT · NEEDS_REFRESH) |
| §13 facility status vocabulary | Source milestone wording only | Each facility now has a `status_class` from the controlled list (ANNOUNCED … CLOSED, UNKNOWN). The source milestone (e.g. "foundation laid") is kept. Non-stage events (first shipment, schedule change) never set the status |
| §12 global facilities | India only | **Batch 12:** 7 sites outside India: TSMC Arizona Fab 21, JASM Fab 1 and Fab 2, ESMC Dresden, Rapidus IIM-1, Samsung Taylor, Intel Ohio (with its 2025 schedule change). 20 facilities in 4 countries in total |
| §61 India map | State table | **Schematic state tile map** on the Facilities and India pages; click a state to filter |
| §140 "What can replace this?" | Same-category list | **Alternative engine** on model pages, classifying direct substitute (candidate), partial substitute, development-stage and different technology (same process, another category), with match reasons and unpublished values |
| §55 filters | Facets on main explorers | Facilities filter by `?state=` and `?country=` |

### New and modified files (3.0)

- **New:**
  - `tests/run.mjs` and `tests/search-benchmark.json`
  - `data/batches/batch-12.json`
  - `data/claims.json` (generated)
- **Modified:**
  - `scripts/build-data.mjs` — claims; generalized facilities with `status_class`; INFERRED confidence
  - `assets/js/core/scores.js` — `dataQuality`, `researchStatus`
  - `assets/js/core/store.js` — `loadClaims`
  - `assets/js/views/shared.js` — claims panel
  - `assets/js/main.js` — fills claim panels after render
  - `assets/js/views/companies.js` — Evidence tab, data-quality column and panel
  - `assets/js/views/facilities.js` — country support, status class, filters, tile map
  - `assets/js/views/india.js` — tile map
  - `assets/js/views/products.js` — alternative engine
  - `assets/js/views/analyst.js` — facility questions by country and status class
  - `assets/css/app.css`, `package.json` (version 3.0.0, `npm test`), and the docs

### Counts after this round

| Entity | Count |
|---|---:|
| Companies | 355 |
| Product families → models | 403 → 568 |
| Equipment categories | 258 |
| Processes | 61 |
| Materials | 47 |
| Subsystems · component classes | 16 · 61 |
| Facilities (site level) | 20 |
| Fabs · OSATs | 22 · 9 |
| Relationships | 6,174 |
| Sources | 988 |
| Claims | 3,579 |
| Conflicts (open) | 9 |
| Duplicate candidates | 33 |

The bundle is 411 KB gzipped.

### Verification

- `npm test`: validation (0 errors) plus 50 / 50 tests, with 100 % search-benchmark recall.
- Browser smoke test: 179 routes, 0 console errors. Three routes show their expected conflict banners.
- Interaction suite passes.
- axe in light and dark mode: 0 violations. This includes the tile map, where an SVG `img` role with focusable children was fixed.

### Still not built (and why)

- **§35–39 / §100–102 language-model assistant and research trace.** Not built: a public static site cannot hold an API key. The deterministic analyst covers grounded answers with rules and sources.
- **§120–121 admin UI, audit log, rollback.** Mutations stay in the git-tracked CLI pipeline. Git history is the audit log and the rollback.
- **§112 live source monitoring (HTTP status, content hashes).** Not possible from this environment: publisher sites are egress-blocked. Duplicate-URL validation was added instead.
- **§28–29 / §48 / §87–89 financial series beyond 41 companies, market share, patents beyond 3, installed base, prices, lead times.** No evidence was captured; these fields stay empty rather than estimated.
- **§94 1M-record scaling.** Still a single bundle (411 KB gzipped). Claims are already split out; per-entity sharding is the next step past about 50k records.
- **§51–52 job and exhibition signals, §50 policy database beyond the 2 Indian programmes.** Not yet researched.

### 3.0 follow-up (5 Oct 2026): policy layer, more facilities, graph filters

- **Batch 13:**
  - **5 facilities:**
    - Intel Magdeburg, recorded as **cancelled** (July 2025) and kept with its history;
    - Amkor Peoria advanced-packaging campus (groundbreaking Oct 2025);
    - Micron ID1 in Boise (under construction since Oct 2023, cited to a CNBC report and Micron's 10-Q);
    - SK hynix Yongin Y1 (under construction);
    - SK hynix West Lafayette HBM packaging plant (groundbreaking Apr 2026).
  - **5 policy programmes:**
    - US CHIPS and Science Act;
    - European Chips Act;
    - US BIS export controls on advanced computing and semiconductor manufacturing equipment;
    - Japan's ¥10 trillion AI / semiconductor framework;
    - Korea's K-Chips Act and support package.
  - India's ISM and Semicon 2.0 records now carry jurisdiction, type and status too.
- **Policy & programmes page** (`#/intelligence/policy`): programmes with their type, jurisdiction, status, sourced facts and linked facilities. A facility is linked only when its own record names the programme; a link is not an award confirmation.
- **Facility profiles** show the linked programme.
- **Relationship graph:**
  - relationship-type toggles (`xt=`) and a **source-backed only** filter (`src=1`); the relationship table follows the same filters;
  - **Export graph JSON** downloads the nodes and edges currently drawn, including type, basis, confidence and sources, with the active filters recorded.
- **Analyst:** facility questions understand the country ("in the US", "in Germany") and cancelled, closed or paused status.

**Counts:**

| Entity | Count |
|---|---:|
| Facilities | 25, in India, the US, Japan, Germany and South Korea |
| Policy programmes | 7 |
| Sources | 1005 |
| Relationships | 6,184 |
| Claims | 3,608 |

**Tests:**
- `npm test`: 54 / 54 pass, with 28 / 28 search-benchmark queries.
- Browser smoke test: 188 routes, 0 console errors. Three routes show their expected conflict banners.
- Interaction suite passes. axe in light and dark mode: 0 violations.

### Batch 14 (21 Nov 2026): Asia facilities and more policy programmes

- **18 facilities (FAC-000026 to FAC-000043):**
  - **Taiwan:** TSMC Fab 20, Baoshan (N2 volume production, Dec 2025); TSMC Fab 22, Kaohsiung (N2 trial production, Oct 2025).
  - **China:** SMIC Lingang, Shanghai (announced Sept 2021; later status not found and stated as such); Hua Hong Wuxi 12-inch line phase II (production from Dec 2024).
  - **Singapore:** UMC Fab 12i P3 (tool move-in May 2024, opening ceremony Apr 2025); VSMC, Tampines (risk production from the Sept 2026 opening); Micron HBM packaging (groundbreaking Jan 2025, output moved to early 2027).
  - **Malaysia:** Infineon Kulim 3 SiC phase 1 (opened Aug 2024); ASE Plant 5, Penang (opened Feb 2025); SPIL P1, Bandar Cassia (groundbreaking May 2024).
  - **Vietnam:** Amkor Bac Ninh (opened Oct 2023).
  - **Japan / Korea / Germany:** Micron Hiroshima cleanroom expansion (groundbreaking Jul 2026); Samsung Pyeongtaek P4 build-out (paused 2024, construction resumed per a Nov 2025 report; LOW confidence); Infineon Smart Power Fab, Dresden (opened Jul 2026).
  - **United States:** TSMC Arizona second fab (tool move-in, Oct 2026); Texas Instruments SM1, Sherman (production Dec 2025); GlobalFoundries Malta expansion (CHIPS award finalised Nov 2024); Wolfspeed John Palmour centre, Siler City (first crystal furnaces Jun 2024).
- **5 policy programmes (PG08 to PG12):** Taiwan's Statute for Industrial Innovation Article 10-2; China's Big Fund III (¥344 billion registered capital); Malaysia's National Semiconductor Strategy (RM25 billion fiscal support); Vietnam's Decision 1018/QĐ-TTg strategy; Gujarat Semiconductor Policy 2022–27. New programme types `STATE_FUND` and `STRATEGY`.
- **67 sources (S1004 to S1070):** government releases (EDB, MIDA, MTI, NIST, NY and NC state), company releases (TSMC via coverage, UMC, NXP, Infineon, TI, ASE, Amkor, Wolfspeed) and industry news. All are search-index evidence (titles and summaries); no page was read directly.
- **Rules applied:**
  - Plans and targets (volume-production dates, phase 2 investments, capacity goals) stay in notes, not milestones.
  - Where reports disagree (VSMC's 2029 capacity, Amkor's investment horizon, Micron Hiroshima's dollar figure), both readings are kept in the field text.
  - A stage is recorded only when a source states it for that site. For example, Fab 22 stays at trial production because no reviewed source dates its volume production separately.
- **New non-stage event `OPENING_CEREMONY`.** It is kept in the history but never sets the status, because an opening ceremony is not proof of production.
- **Search:**
  - "2 nm" and "2nm" now index and query as the same token, so process-node searches match either spelling.
  - 6 new benchmark queries: "2nm fab in Taiwan", "2 nm fab in Taiwan", "OSAT in Malaysia", "SiC fab in Malaysia", "VSMC", "Amkor Vietnam".

**Counts:**

| Entity | Count |
|---|---:|
| Facilities | 43, in India, the US, Japan, Germany, South Korea, Taiwan, China, Singapore, Malaysia and Vietnam |
| Policy programmes | 12 |
| Sources | 1,072 |
| Relationships | 6,217 |
| Claims | 3,736 |

**Tests:**
- `npm test`: 60 / 60 pass, with 37 / 37 search-benchmark queries.
- Browser smoke test: 108 routes, 0 console errors (10 new routes). Three routes show their expected conflict banners.
- Motion suite: 24 / 24.

**Still not covered:** Singapore incentive programmes, most sub-national incentives outside Gujarat, CXMT / YMTC / other Chinese memory fabs, Philippines and Thailand OSAT sites, and Intel's Penang packaging complex (reported as due to start in 2026, with no opening yet found).

### Batch 15 (21 Nov 2026): memory fabs, packaging sites, state programmes, equipment models

- **7 facilities (FAC-000044 to FAC-000050):**
  - YMTC Wuhan Phase III (equipment installation reported Apr 2026; LOW confidence, not confirmed by YMTC);
  - Kioxia Kitakami Fab2 / K2 (operating since 29 Sept 2025, with Sandisk);
  - SK hynix M15X, Cheongju (opened with first equipment, Oct 2025);
  - SK hynix P&T7 HBM packaging fab, Cheongju (announced Jan 2026);
  - Intel Penang advanced packaging complex (under construction; reported 99% complete, no start of operations found);
  - Infineon backend site, Samut Prakan, Thailand (opened 1 Oct 2026). Its two investment figures, US$1.4 billion and more than €100 million, are kept as an open conflict;
  - ATEC's captive line for PANJIT, Cabuyao, Philippines (Sept 2025).
- **7 policy programmes (PG13 to PG19):** Singapore's RIE2030 semiconductor flagship (S$800 million); the Texas CHIPS Act / Texas Semiconductor Innovation Fund; New York Green CHIPS, now linked to GlobalFoundries Malta through that record's own scheme field; the Odisha, Uttar Pradesh and Tamil Nadu state policies; and Thailand's national semiconductor strategy (Sept 2026). New programme type `RD_FUNDING`.
- **10 equipment models via `scripts/import.mjs`:**
  - AMEC Primo AD-RIE, Primo nanova and Primo Twin-Star (etch);
  - Nova PRISM (optical CD), METRION (SIMS), ELIPSON (Raman) and VERAFLEX IV (XPS / XRF);
  - FormFactor CM300xi (probe system);
  - Kingsemi KS-FT200/300 (coater / developer);
  - Eugene Technology BlueJay (single-wafer LPCVD).

  AMEC, Nova and FormFactor had no models before. Descriptions come from product-page and release summaries; no numeric specifications are recorded unless the summary stated them.
- **49 sources (S1071 to S1119):** all search-index evidence.

**Counts:**

| Entity | Count |
|---|---:|
| Facilities | 50, in 12 countries |
| Policy programmes | 19 |
| Product families → models | 410 → 578 |
| Sources | 1,121 |
| Relationships | 6,298 |
| Claims | 3,813 |

**Tests:**
- `npm test`: 65 / 65, with 42 / 42 benchmark queries.
- Smoke test: 115 / 115 routes; 4 expected conflict banners (new: FAC-000049).
- Motion: 24 / 24.

**Still not covered:** CXMT site records (reported capacity figures are secondary and undated), EU member-state schemes, more Philippine and Thai sites (only one each), and probe-card product lines such as FormFactor's HBM cards.

### Batch 16 (22 Nov 2026): US and European sites, EU programmes, more equipment models

- **10 facilities (FAC-000051 to FAC-000060):**
  - Intel Fab 52, Arizona: 18A in production since Jul 2025, opened 9 Oct 2025. The opening is recorded as an `OPENING_CEREMONY` event, not a stage.
  - Intel Fab 34, Leixlip: Intel 4 in production since Sept 2023.
  - STMicroelectronics SiC campus, Catania: €2 billion of Italian aid approved May 2024.
  - Silicon Box, Novara: €1.3 billion of aid approved Dec 2024; groundbreaking not confirmed.
  - Micron New York megafab: groundbreaking Jan 2026, foundation work from Jul 2026.
  - GlobalWafers, Sherman: opened May 2025.
  - TI LFAB2, Lehi: under construction since Nov 2023.
  - Wolfspeed Mohawk Valley: operating since Apr 2022.
  - GlobalFoundries Dresden expansion: work began Jun 2025.
  - onsemi Rožnov SiC expansion: **cancelled** on 6 Nov 2026 and kept with its history.
- **Policy links:** Catania, Novara and Dresden now link to the European Chips Act through their own scheme text, and GlobalWafers links to the US CHIPS Act.
- **2 programmes:** the EU IPCEI ME/CT (up to €8.1 billion from 14 Member States, Jun 2023) and the Dutch Project Beethoven (€2.51 billion, Mar 2024). Beethoven's national/regional funding split differs between sources, and both figures are shown.
- **10 equipment models:**
  - Lam Akara and ALTUS Halo (Feb 2025);
  - Applied PROVision 10 (Oct 2025);
  - Teradyne Magnum 7H (Aug 2025);
  - Advantest T5833 and T5503HS2;
  - ASM Pulsar XP and EmerALD XP;
  - NAURA Qomola HPD30 (Mar 2026);
  - TEL Acrevia (Aug 2024).
  
  Lifecycle is set to Active only where a source reports production use or shipments.
- **51 sources (S1120 to S1170):** all search-index evidence.

**Counts:**

| Entity | Count |
|---|---:|
| Facilities | 60, in 15 countries |
| Policy programmes | 21 |
| Product families → models | 417 → 588 |
| Sources | 1,172 |
| Relationships | 6,395 |
| Claims | 3,912 |

**Tests:**
- `npm test`: 70 / 70, with 47 / 47 benchmark queries.
- Smoke test: 124 / 124 routes.
- Motion: 24 / 24.

### Batch 17 (22 Nov 2026): Taiwan, Japan and Korea sites, national programmes, bonding equipment

- **6 facilities (FAC-000061 to FAC-000066):**
  - TSMC AP7, Chiayi: equipment installation 2H 2025 for WMCM, SoIC and CoPoS.
  - TSMC AP8, Tainan: bought from Innolux in 2024; opening ceremony Apr 2025. The latest dated stage stays *site acquired* because no reviewed source confirms the start of production.
  - TSMC Fab 25, Taichung: A14; construction began 5 Nov 2025.
  - Sony image sensor fab, Koshi: METI subsidy of up to ¥60 billion approved Apr 2026; Sony–TSMC joint venture MoU.
  - Renesas Kofu 300 mm power fab: restarted Apr 2024.
  - Samsung Yongin national cluster, first fab: complex designated Dec 2024; operations moved to 2029.
- **3 programmes:** the US §48D Advanced Manufacturing Investment Credit (35 % for property placed in service from 2026; construction must begin by end-2026), the UK National Semiconductor Strategy (up to £1 billion over ten years) and the Korea Semiconductor Special Act (passed 29 Jan 2026).
- **7 bonding-equipment models:**
  - Hanmi TC Bonder 4 (HBM4), Wide TC Bonder and 2.5D TC Bonder 40 / 120;
  - ASMPT FIREBIRD TCB and LITHOBOLT;
  - Kulicke & Soffa RAPID and ConnX ELITE. These two are marked low confidence because the source is a catalogue listing.
- **38 sources (S1171 to S1208):** all search-index evidence.

**Counts:**

| Entity | Count |
|---|---:|
| Facilities | 66 |
| Policy programmes | 24 |
| Product families → models | 422 → 595 |
| Sources | 1,210 |
| Relationships | 6,465 |
| Claims | 3,973 |

**Tests:**
- `npm test`: 75 / 75, with 52 / 52 benchmark queries.
- Smoke test: 130 / 130 routes.
- Motion: 24 / 24.
- Passcode screen: 11 / 11 without the passcode in the environment.

### Batch 18 (27 Nov 2026): Israel, Costa Rica, Singapore, Germany and Vietnam sites; Spain and Philippines; more equipment models

- **Credit:** "Created by Jatin Songara" now appears in the site footer, the sidebar, the passcode screen, the `author` meta tag (both editions), the README and `package.json`. `tests/browser/gate.mjs` checks it.
- **5 facilities (FAC-000067 to FAC-000071):**
  - Intel Fab 38, Kiryat Gat: **paused** since Jun 2024; the Israeli grant was cancelled in Jul 2026.
  - GlobalFoundries Singapore 300 mm expansion: opened Sept 2023.
  - Bosch 300 mm fab, Dresden: opened Jun 2021.
  - Intel assembly and test, Belén, Costa Rica: operating since 2021.
  - Hana Micron Vina second plant, Bac Giang: Sept 2023.
- **New country:** Costa Rica was added to the country reference (38 countries).
- **Link fix:** the EU IPCEI ME/CT programme now matches only its own name, so Bosch's 2018 support under the first microelectronics IPCEI is not linked to it.
- **2 programmes:** Spain's PERTE Chip (€12.25 billion by 2027) and the Philippines' CREATE MORE Act (RA 12066). The Philippines record states that the Act has no semiconductor-specific provision.
- **7 models for makers that had none:**
  - Park Systems NX-Wafer (AFM);
  - HPSP GENI-SYS (high-pressure anneal);
  - Beneq Transform 300 and Prodigy (ALD);
  - Oxford Instruments PlasmaPro 100 Cobra (ICP etch);
  - Thermo Fisher Helios 5 EXL Wafer DualBeam, filed under e-beam inspection because the taxonomy has no failure-analysis category;
  - KCTech Ventus (CMP), low confidence because specifications are not published.
- **33 sources (S1209 to S1241):** all search-index evidence.

**Counts:**

| Entity | Count |
|---|---:|
| Facilities | 71 |
| Countries | 38 |
| Policy programmes | 26 |
| Product families → models | 429 → 602 |
| Sources | 1,243 |
| Relationships | 6,539 |
| Claims | 4,031 |

**Tests:**
- `npm test`: 80 / 80, with 57 / 57 benchmark queries.
- Smoke test: 137 / 137 routes.
- Motion: 24 / 24.
- Passcode screen: 17 / 17 with the passcode supplied by environment variable.

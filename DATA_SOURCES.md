# Data sources and evidence methodology

## Current evidence base

- **Batch 1** (29 Sep 2026): 351 numbered sources — 192 Tier 1, 97 Tier 2, 30 Tier 3, 30 Tier 4, plus 2 internal (the user brief and an internal note). 140 sources are undated; 8 were not accessible at capture and were not bypassed.
- **Batch 2** (30 Sep 2026): 142 sources, all Tier 1 official (manufacturer pages, press releases, brochures, one SEC 10-K), supporting 144 products and 6 companies. Access mode `search_index`: the official URL and title were confirmed via web search, but the page itself could not be opened (capture-environment egress policy), so records are PARTIALLY_VERIFIED / MEDIUM and no specifications were taken from search summaries (one summary contradicted itself on an implanter's energy range). Re-reading each page can promote records to VERIFIED and add specifications.
- **Batch 3** (30 Sep 2026): 220 sources — 189 Tier 1 (manufacturer pages, company press releases incl. wire releases, brochures, investor documents), 25 Tier 2 (SEMI member directory, Invest Korea / InvestPenang, industry media, university facility pages, investor announcements), 5 Tier 3 (campus and startup directories), 1 Tier 4 (tech blog, corroborating a funding figure also in Tier-2 titles). Supports 68 small companies and startups, 123 products, 9 startup profiles and 13 customer links. Same `search_index` access mode as Batch 2. Company profile facts (city, founding year, funding, founders) taken from the search-result summary of a cited source are marked `evidence_depth: SEARCH_SUMMARY`, and the HQ basis is `SUM` (“search-result summary of a cited source, page not read”).
- **Batch 4** (30 Sep 2026): 54 sources (49 Tier 1, 3 Tier 2 university facility / news pages, 2 Tier 3 directories) found by keyword search on equipment and process terms; 25 companies and 33 products. Company records carry `discovery_keywords` (the search terms that surfaced them), which are indexed for search but are not evidence.
- **Batch 6** (30 Sep 2026): 37 sources for 11 companies and 26 products (dispensing, wire / die bonding, EFEM and load ports, wafer robots, plasma etch, particle monitoring, glass processing, TC bonders). Same `search_index` access mode; two Tier-2 news / wire releases support existing-company models (Kulicke & Soffa, SEMES).
- **Batch 7** (30 Sep 2026): 8 sources for 7 companies (Singapore, Malaysia, India, vision); mainly SEMI member-directory, InvestPenang and supplier-directory pages (Tier 2–3) plus one startup news release.
- **Batch 8** (30 Sep 2026): 25 sources for 8 companies and 18 products (PVD, packaging wet processing, ion implant, AOI, metrology, motion); mostly Tier 1 manufacturer pages and press releases, `search_index` access mode.
- **Batch 9** (5 Oct 2026): 31 sources for 19 companies and 7 products (photoresists, chemicals, CMP materials, gases, gas delivery, scrubbers / chillers, wet cleaning, crystal growth, thermal). 29 Tier 1 manufacturer pages, brochures and press releases; one Tier-3 vendor case study (U-Precision).
- **2.0 migration** of Batch 1 added **no new external facts**. It restructured the Batch-1 evidence, added an editorial reference taxonomy, and derived relationships from source-backed fields. Every derived link says so.

## Source tiers (Batch-1 scheme, kept as captured)

| Tier | Meaning (Batch 1) | Typical types |
|---|---|---|
| 1 | Official | Company website, product page, datasheet, press release, annual report, regulatory filing, government |
| 2 | Industry | Trade association (SEMI), industry publication, conference, investor results |
| 3 | Directory / aggregator | Directories, distributors, trade portals, market research summaries |
| 4 | Unverified | Blogs, wikis, market lists — never used alone to confirm a fact |

**Crosswalk to the 2.0 brief's six tiers** (for future re-grading, not applied automatically because it requires re-reading each source): Batch-1 Tier 1 → 2.0 Tier 1 (company/official) or Tier 2 (government, regulatory filing); Batch-1 Tier 2 → 2.0 Tier 2 (SEMI), Tier 3 (conference) or Tier 4 (industry media); Batch-1 Tier 3 → 2.0 Tier 5; Batch-1 Tier 4 → 2.0 Tier 6.

## Access modes

| `access_mode` | Meaning | Effect |
|---|---|---|
| `read` | Page or document read at capture | Can support VERIFIED records and specifications |
| `search_index` | Official URL + title confirmed via web search; content not read | Supports existence, maker and category only → PARTIALLY_VERIFIED, no specs. Batch 3 also records clearly attributed profile facts from the search summary (labelled `SEARCH_SUMMARY`) |
| `not_accessible` | Access blocked; not bypassed | Cannot support a claim on its own |

## Source record

```json
{ "id": "SRC-000054", "legacy_id": "S0054", "title": "…", "publisher": "DISCO", "source_type": "Product page",
  "source_url": "https://…", "tier": 1, "publication_date": "2026-09", "evidence_date": "2026-09", "accessed_date": "2026-09-29",
  "accessible": true, "age_class": "CURRENT", "freshness": "Recent", "excerpt": "…", "verification_status": "captured" }
```

## Collection procedure for new records

1. Find the candidate company → its **official website** → semiconductor product pages → product families → exact models.
2. Validate process/application and technical specifications against the official page, datasheet, brochure or manual.
3. Record the source (URL, title, publisher, type, tier, publication date), the evidence date, and the verification state.
4. For fabs: company announcement → government source → official facility information → SEMI / industry source.
5. For India: official India presence → manufacturing → R&D → distributor → service → announced partnerships.
6. Import through `scripts/import.mjs` (see CONTRIBUTING.md). Rows without a source are rejected.

Never: “the model is known, add it”. Always: source found → claim extracted → claim normalised → evidence attached → record created.

Respect robots rules, access controls and copyright: store metadata, short excerpts and links — never republish documents.

## Fallback labels

| Situation | Shown as |
|---|---|
| Not captured in the evidence | “Not found in captured sources” / “Not published” / “Not captured — source page not read” (Batch 2–3) |
| Company does not disclose | “Not publicly disclosed” |
| No source could be verified | Unverified badge |
| Sources disagree | ⚠ Conflicting sources — both claims listed |
| Evidence old | Needs review / Stale / Outdated |

## Known gaps

- Facility-level fab/OSAT data (capacity, node, wafer size, investment) is not captured.
- Specifications (wafer size, throughput, accuracy) are published for a minority of models.
- Employees, founding year and executives are mostly missing.
- Tool vendors for most Indian OSAT lines are not publicly named.
- MEMS (category H) has no records; wafer manufacturing (K) and subfab (L) are partly covered (final wafer cleaning and lead plating still empty; ingot grinding & shaping filled in Batch 3).
- Batch-2 and Batch-3 records need a direct read of their pages to be promoted to VERIFIED and to add specifications; Batch-3 startup funding figures are as reported and not re-checked against filings.
- Most companies' HQ country is analyst knowledge rather than a cited source (labelled on every profile); Batch-3 HQ cities mostly come from search summaries (labelled).
- Small-company coverage is a sample, not a census: Chinese, Japanese and Korean second-tier suppliers and Indian lab-equipment makers are only partly captured.
- Materials and gas suppliers are not itemised per material.

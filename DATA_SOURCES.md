# Data sources and evidence methodology

## Current evidence base

- **Batch 1** (29 Sep 2026): 351 numbered sources — 192 Tier 1, 97 Tier 2, 30 Tier 3, 30 Tier 4, plus 2 internal (the user brief and an internal note). 140 sources are undated; 8 were not accessible at capture and were not bypassed.
- **Batch 2** (30 Sep 2026): 142 sources, all Tier 1 official (manufacturer pages, press releases, brochures, one SEC 10-K), supporting 144 products and 6 companies. Access mode `search_index`: the official URL and title were confirmed via web search, but the page itself could not be opened (capture-environment egress policy), so records are PARTIALLY_VERIFIED / MEDIUM and no specifications were taken from search summaries (one summary contradicted itself on an implanter's energy range). Re-reading each page can promote records to VERIFIED and add specifications.
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
| `search_index` | Official URL + title confirmed via web search; content not read | Supports existence, maker and category only → PARTIALLY_VERIFIED, no specs |
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
| Not captured in the evidence | “Not found in Batch-1 sources” / “Not published” |
| Company does not disclose | “Not publicly disclosed” |
| No source could be verified | Unverified badge |
| Sources disagree | ⚠ Conflicting sources — both claims listed |
| Evidence old | Needs review / Stale / Outdated |

## Known gaps

- Facility-level fab/OSAT data (capacity, node, wafer size, investment) is not captured.
- Specifications (wafer size, throughput, accuracy) are published for a minority of models.
- Employees, founding year and executives are mostly missing.
- Tool vendors for most Indian OSAT lines are not publicly named.
- MEMS (category H) has no records; wafer manufacturing (K) and subfab (L) are partly covered after Batch 2 (ingot grinding, final wafer cleaning and lead plating still empty).
- Batch-2 records need a direct read of their official pages to be promoted to VERIFIED and to add specifications.
- 157 companies' HQ country is analyst knowledge rather than a cited source (labelled on every profile).
- Materials and gas suppliers are not itemised per material.

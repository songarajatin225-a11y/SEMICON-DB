# Data model

The database is a graph: entities with stable ids, connected by typed relationships that each carry a basis and (where applicable) sources.

```
COMPANY ─offers→ PRODUCT FAMILY ←part_of─ MODEL ─classified_as→ EQUIPMENT CATEGORY ─used_in→ PROCESS
   │                                        │                        │                          │
   │ located_in → COUNTRY                   ├─uses_technology→ TECHNOLOGY ─used_in→ PROCESS      │
   │ present_in → CTY-IN (India)            ├─supports_material→ MATERIAL                       │
   │ supplies_equipment_to → FAB / OSAT     ├─supports_application→ APPLICATION                  │
   │ supplies / capable_of_supplying → COMPONENT CLASS ←contains─ SUBSYSTEM ←contains─ EQUIPMENT ┘
   │ subsidiary_of / brand_of / acquired / merger_with / invested_in / partner_of / joint_venture_with / distributes_for → COMPANY
   └ every fact → SOURCE (source_ids)
```

## Entities and ids

| Entity | Id | File | Origin |
|---|---|---|---|
| Company | `CMP-000001` (from `C0001`) | companies.json | Batch-1 `co` (+ startups `st`, financials `fin`, India `india`, relations `rel`) |
| Product family | `PRD-000001` | product_families.json | Grouped from Batch-1 `pr` by company + family name |
| Model | `MDL-000001` (from `P00001`) | models.json | Batch-1 `pr`; `model_identified=false` marks family-level records without a model number |
| Equipment category | `EQP-<code>` (e.g. `EQP-C01.03`) | equipment.json | Batch-1 taxonomy `tax` + 2.0 extensions K, L |
| Process | `PRS-001` | processes.json | Reference library (61), mapped to Batch-1 process steps `PS01…PSX6` |
| Technology | `TEC-001` | technologies.json | Reference (83) incl. legacy laser codes `L01–L25` |
| Material · Application | `MAT-001` · `APP-001` | materials.json · applications.json | Reference |
| Subsystem · Component class | `SUB-001` · `CMPN-000001` | subsystems.json · components.json | Reference + Batch-1 supplier register `sp` (BOM codes) |
| Supplier profile | keyed by company id | suppliers.json | Companies × supplier roles × component classes × supply links |
| Fab · OSAT · other customer | `FAB-000001` · `OSAT-000015` · `CUS-000027` (from `CU001`) | fabs.json · osats.json · customers.json | Batch-1 customers `cu` + sites from `cr` |
| Country | `CTY-US` | countries.json | Batch-1 `ctry` + reference centroids |
| Deal | `DEAL-000001` (from `PA001`) | deals.json | Batch-1 `pa` |
| Relationship | `REL-000001`, `REL-CR-001`, `REL-SP-001`, `REL-PA-001`, `REL-RL-001` | relationships.json | Built from all of the above |
| Source | `SRC-000001` (from `S0001`) | sources.json | Batch-1 `src` |
| Conflict · duplicate candidate | `CNF-0001` · `DUP-0001` | quality.json | Build |

Names are never primary keys. Batch-1 ids are kept as `legacy_id` and resolve in URLs.

## Relationship record

```json
{ "id": "REL-CR-001", "type": "supplies_equipment_to", "from": "CMP-000001", "to": "FAB-000005",
  "basis": "source", "status": "CONFIRMED", "confidence": "HIGH", "source_ids": ["SRC-000133"], "date": "2025-09-03",
  "detail": { "customer": "SK hynix", "model_id": "MDL-000093", "site": "M16 fab", "location": "Icheon, South Korea", "stage": "Installed" } }
```

`basis`: **source** (a numbered source states it) · **derived** (computed from source-backed fields, e.g. model → process via its category, material by text match on a stated field) · **reference** (generic engineering relationship: process ↔ equipment, subsystem ↔ component) · **analyst** (not source-traced, e.g. some HQ countries).

Relationship types in use: `manufactures`, `part_of`, `offers`, `offers_equipment`, `classified_as`, `used_in`, `uses_technology`, `supports_material`, `supports_application`, `located_in`, `present_in`, `supplies`, `integrates`, `distributes`, `capable_of_supplying`, `supplies_equipment_to`, `contains`, `subsidiary_of`, `brand_of`, `acquired`, `related_to`, `unresolved_relationship`, `merger_with`, `invested_in`, `partner_of`, `joint_venture_with`, `distributes_for`, `spun_off`, `corporate_group`. `competes_with` and `alternative_to` are **not** generated: competition is not inferred; the UI lists same-category records explicitly as “not an equivalence claim”.

## Technical specification model

```json
{ "parameter": "Max ingot thickness", "value": 40, "unit": "mm", "source_value": "40 mm",
  "source_ids": ["SRC-000220"], "source_scope": "record-level", "verification": "VERIFIED", "claim_type": "Manufacturer claim" }
```

Wafer sizes: `{ "source_value": "4/6/8 inch on frame; 12 inch", "sizes_mm": [100,150,200,300], "range_mm": null }`; ranges (“up to 305 mm”, “2 inch–200 mm”) are kept as ranges and matched as *within stated range*.

## Quality fields (companies and models)

`verification` (Batch-1), `quality_state` (VERIFIED · PARTIALLY_VERIFIED · UNVERIFIED · CONFLICTING · OUTDATED), `freshness` (Recent · Needs Review · Stale · Unknown — freshest supporting source), `missing_key_fields`, `dates` (first_added, last_updated, last_verified, latest_source_date, review_due).

## Conflicts

Stored in `quality.json → conflicts`, never resolved silently: each lists the field and every claim with its source. Seven are recorded from Batch 1 (SMEE SSA/800 deployment status, Skyverse ↔ SiCarrier relationship, Huaray website domain, a flagged Plasma-Therm speed figure, three financial unit conflicts).

## AI-ready queries

The graph answers questions directly, e.g. “Which companies manufacture SiC wafer equipment?” → models with `supports_material → MAT(SiC)` → `manufactures` ← companies; “What subsystems are inside an etch tool?” → `EQP-A08.*` `contains` → subsystems; “Which companies have India manufacturing?” → `present_in` edges with `detail.type` containing Manufacturing.

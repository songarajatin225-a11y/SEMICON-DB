# SEMICON-DB data dictionary

Generated from the published data (schema 2.0.0, evidence as of 2026-09-30) by `scripts/gen-dictionary.mjs`. Do not edit by hand — re-run after `npm run build`.

**Source requirement (all entities):** every factual field must be traceable to a numbered source via `source_ids` on the record or on the relationship. Reference entities (processes, technologies, materials, subsystems, component classes) carry editorial definitions and are labelled as such; they make no company-specific claims.

**Missing values:** `null` (or empty array) means *not captured in the evidence*; the UI shows “Not found in Batch-1 sources”, “Not published” or “Not publicly disclosed” (`NOT_DISCLOSED`). Values are never estimated.

**ID prefixes:** `CMP` company · `PRD` product_family · `MDL` model · `EQP` equipment · `PRS` process · `TEC` technology · `MAT` material · `APP` application · `SUB` subsystem · `CMPN` component · `FAB` fab · `OSAT` osat · `CUS` customer · `CTY` country · `DEAL` deal · `REL` relationship · `SRC` source · `CNF` conflict · `DUP` duplicate

## companies

311 records.

| Field | Definition | Data type | Allowed values | Example | Required | Source requirement | Normalisation rule |
|---|---|---|---|---|---|---|---|
| `id` | Stable primary identifier (never a name). Prefix encodes the entity. | string | — | `CMP-000001` | Required | System-generated | Assigned by build; never reused |
| `legacy_id` | Batch-1 identifier (C0001, P00001, S0001, CU001). Old deep links resolve to the 2.0 record. | string | — | `C0001` | Optional | System-generated | — |
| `entity_type` | Entity kind. | string | company | `company` | Required | System-generated | — |
| `name` | Display name as stated by the source. | string | — | `ASML Holding` | Required | Record `source_ids` (Tier-4 alone never confirms) | Trimmed; original capitalisation kept |
| `canonical_name` | Name without parenthetical abbreviation, used for de-duplication. | string | — | `ASML Holding` | Required | System-generated | Parenthetical removed |
| `aliases` | Other names: abbreviations and brands documented in Batch 1. | array | — | `["TEL"]` | Optional | Record `source_ids` (Tier-4 alone never confirms) | — |
| `former_names` | Previous names (only when a source documents a rename). | array | — | `` | Optional | Record `source_ids` (Tier-4 alone never confirms) | — |
| `company_type` | Batch-1 company type. | string | — | `Equipment OEM` | Required | Record `source_ids` (Tier-4 alone never confirms) | — |
| `supplier_types` | Normalised supplier roles (OEM vs subsystem/component/materials/service…). | array | — | `["Equipment OEM"]` | Required | System-generated | Mapped from company_type |
| `supply_chain_level` | Batch-1 level: LV1 equipment OEM … LV4. | string | LV1, LV2, LV3, LV4 | `LV1` | Required | Record `source_ids` (Tier-4 alone never confirms) | — |
| `is_startup` | Startup flag (Batch-1 startup register or company type). | boolean | — | `false` | Always present | Record `source_ids` (Tier-4 alone never confirms) | — |
| `hq` | Headquarters object: country, country_id, country_basis, city, region. | object | — | `{"country":"Netherlands","country_id":"CTY-NL","country_basis":"Ana…` | Required | Record `source_ids` (Tier-4 alone never confirms) | Mapped to the country reference (ISO 3166 alpha-2); aliases (USA, Korea, UK) resolved |
| `ownership` | Public / Private / Subsidiary / State-linked / JV. | string / null | — | `Public` | Optional | Record `source_ids` (Tier-4 alone never confirms) | null when not captured |
| `exchange` | Stock exchange of listing. | null / string | — | `NASDAQ` | Optional (14% populated) | Record `source_ids` (Tier-4 alone never confirms) | — |
| `ticker` | Ticker symbol. | null / string | — | `AMAT` | Optional (15% populated) | Record `source_ids` (Tier-4 alone never confirms) | — |
| `website` | Official website URL. | string / null | — | `https://www.asml.com` | Optional | Record `source_ids` (Tier-4 alone never confirms) | Must parse as http(s) URL |
| `founded` | Founding year as stated. | null / string | — | `2001` | Optional (15% populated) | Record `source_ids` (Tier-4 alone never confirms) | Verbatim |
| `employees` | Employee count as stated, with date. | null / string | — | `~36,500 (26 Oct 2025)` | Optional (2% populated) | Record `source_ids` (Tier-4 alone never confirms) | Verbatim |
| `ceo` | Chief executive (not captured in Batch 1). | null | — | `` | Optional (0% populated) | Record `source_ids` (Tier-4 alone never confirms) | — |
| `parent_company` | Parent company where documented. | null / string | — | `Hitachi, Ltd.` | Optional (9% populated) | Record `source_ids` (Tier-4 alone never confirms) | — |
| `subsidiaries_brands` | Brands / subsidiaries where documented. | null / string | — | `SPTS Technologies` | Optional (3% populated) | Record `source_ids` (Tier-4 alone never confirms) | — |
| `description` | Business focus / definition. | string / null | — | `EUV (incl. High-NA EXE) and DUV lithography` | Optional (60% populated) | Record `source_ids` (Tier-4 alone never confirms) | — |
| `primary_equipment` | Equipment the source confirms the company offers. | string / null | — | `EUV; DUV` | Optional (88% populated) | Record `source_ids` (Tier-4 alone never confirms) | Verbatim |
| `equipment_ids` | Source-confirmed equipment categories (EQP ids). | array | — | `["EQP-A01.01","EQP-A01.02"]` | Optional | Derived — inherits the sources of the linked records | Only confirmed categories; analyst candidates are kept in candidate_categories |
| `component_class_ids` | Linked record ids. | array | — | `["CMPN-000010"]` | Optional (11% populated) | Derived — inherits the sources of the linked records | — |
| `candidate_categories` | Analyst-knowledge categories — unverified, never used for filtering or counts. | null / string | — | `A19;A10;A21;A26` | Optional | Record `source_ids` (Tier-4 alone never confirms) | — |
| `candidate_basis` | Label explaining candidate categories are unverified. | null / string | — | `Analyst knowledge — unverified; not used for filtering` | Optional (11% populated) | Record `source_ids` (Tier-4 alone never confirms) | — |
| `market_class` | GLOBAL_LEADER / TIER_2 / REGIONAL / EMERGING / UNCLASSIFIED, assigned only from a published ranking or revenue. | string | GLOBAL_LEADER, TIER_2, UNCLASSIFIED, REGIONAL, EMERGING | `GLOBAL_LEADER` | Required | Record `source_ids` (Tier-4 alone never confirms) | — |
| `market_class_basis` | Evidence behind market_class (ranking source or revenue). | string | — | `Ranked: S0004 top-5 2025` | Always present | Record `source_ids` (Tier-4 alone never confirms) | — |
| `revenue` | Reported revenue converted to USD m with fiscal year and original currency; or a derived range. | object / null | — | `{"usd_m":36870.5,"fiscal_year":"FY2025 (Jan-Dec 2025)","reported":"…` | Optional | Record `source_ids` (Tier-4 alone never confirms) | Fiscal years kept separate |
| `semiconductor_revenue` | Semiconductor revenue as stated. | null / string | — | `USD 20,798 m (FY2025 (Oct 2024-Oct 2025), S0139)` | Optional (1% populated) | Record `source_ids` (Tier-4 alone never confirms) | Verbatim |
| `india` | India presence summary and per-record facility/location/status with sources. | object | — | `{"summary":"Partnership (MoU)","has_presence":true,"records":[{"typ…` | Required | Record `source_ids` (Tier-4 alone never confirms) | — |
| `presence` | Presence signals in China/Japan/Korea/Taiwan from Batch-1 fields. | object | — | `{"china":null,"japan":"Customer relationship","korea":"Customer rel…` | Always present | Record `source_ids` (Tier-4 alone never confirms) | — |
| `startup` | Startup profile (funding, investors, TRL) where captured. | null / object | — | `{"founders":null,"year":"2016","funding":"Series D up to USD 380M (…` | Optional (5% populated) | Record `source_ids` (Tier-4 alone never confirms) | — |
| `financials` | Financial facts per fiscal year with currency, USD conversion and source. | array | — | `[{"fiscal_year":"FY2025 (Jan-Dec 2025)","metric":"Revenue","currenc…` | Optional (13% populated) | Record `source_ids` (Tier-4 alone never confirms) | Fiscal years never mixed |
| `verification` | VERIFIED / PARTIALLY_VERIFIED / UNVERIFIED (Batch-1 evidence rules). | string | VERIFIED, PARTIALLY_VERIFIED, UNVERIFIED | `VERIFIED` | Required | Record `source_ids` (Tier-4 alone never confirms) | — |
| `confidence` | Confidence level (HIGH/MEDIUM/LOW/UNVERIFIED) and score where recorded. | object | — | `{"score":95,"level":"HIGH"}` | Required | Record `source_ids` (Tier-4 alone never confirms) | — |
| `evidence_depth` | How deeply the source was read (CONTENT, TITLE, SEARCH_SUMMARY, TIER4, INTERNAL). | string | CONTENT, TITLE, TIER4, INTERNAL, SEARCH_SUMMARY | `CONTENT` | Always present | Record `source_ids` (Tier-4 alone never confirms) | — |
| `rationale` | Why the record was included / caveats. | null / string | — | `Title-level evidence does not name the equipment category` | Optional (13% populated) | Record `source_ids` (Tier-4 alone never confirms) | — |
| `notes` | Analyst notes from capture. | string / null | — | `Top-5 WFE vendor 2025 (S0004); EXE:5200B at SK hynix M16 (S0133)` | Optional (52% populated) | Record `source_ids` (Tier-4 alone never confirms) | — |
| `source_ids` | Numbered sources supporting the record (SRC ids). | array | — | `["SRC-000004","SRC-000024","SRC-000133","SRC-000142","SRC-000143","…` | Required for facts | Derived — inherits the sources of the linked records | — |
| `discovery_keywords` | Web-search keywords that surfaced the company (Batch 4 keyword discovery). A discovery aid indexed by search — not a claim about the company. | array | — | `["wedge bonder","wire bonder manufacturer","heavy wire ultrasonic b…` | Optional (16% populated) | Record `source_ids` (Tier-4 alone never confirms) | — |
| `freshness` | Recent / Needs Review / Stale / Unknown from the freshest supporting source. | string | Recent, Needs Review, Stale, Unknown | `Recent` | Required | System-generated | — |
| `quality_state` | VERIFIED / PARTIALLY_VERIFIED / UNVERIFIED / CONFLICTING / OUTDATED — one state per record. | string | VERIFIED, OUTDATED, PARTIALLY_VERIFIED, CONFLICTING, UNVERIFIED | `VERIFIED` | Required | System-generated | CONFLICTING > OUTDATED > verification |
| `missing_key_fields` | Key fields not captured for this record. | array | — | `["Headquarters country (source)","City","Founded year","Employees"]` | Required | System-generated | — |
| `dates` | first_added, last_updated, last_verified, latest_source_date, review_due. | object | — | `{"first_added":"2026-09-29","last_updated":"2026-09-29","last_verif…` | Required | System-generated | ISO 8601: YYYY, YYYY-MM or YYYY-MM-DD |

## product_families

361 records.

| Field | Definition | Data type | Allowed values | Example | Required | Source requirement | Normalisation rule |
|---|---|---|---|---|---|---|---|
| `id` | Stable primary identifier (never a name). Prefix encodes the entity. | string | — | `PRD-000001` | Required | System-generated | Assigned by build; never reused |
| `entity_type` | Entity kind. | string | product_family | `product_family` | Required | System-generated | — |
| `name` | Display name as stated by the source. | string | — | `Stealth dicing laser saw` | Required | Record `source_ids` (Tier-4 alone never confirms) | Trimmed; original capitalisation kept |
| `company_id` | Manufacturer / owner company (CMP id). | string | — | `CMP-000010` | Required | Record `source_ids` (Tier-4 alone never confirms) | Must resolve |
| `manufacturer` | Manufacturer name (denormalised from company_id). | string | — | `DISCO Corporation` | Always present | Derived — inherits the sources of the linked records | — |
| `model_ids` | Linked record ids. | array | — | `["MDL-000001","MDL-000002"]` | Always present | Derived — inherits the sources of the linked records | — |
| `equipment_ids` | Source-confirmed equipment categories (EQP ids). | array | — | `["EQP-C01.03"]` | Optional | Derived — inherits the sources of the linked records | Only confirmed categories; analyst candidates are kept in candidate_categories |
| `is_component` | True for component products (laser sources, galvos, stages, RF generators…). | boolean | — | `false` | Always present | System-generated | — |
| `process_ids` | Processes (PRS ids). | array | — | `["PRS-032"]` | Optional | Derived — inherits the sources of the linked records | Derived: equipment category → process reference |
| `technology_ids` | Technologies (TEC ids). | array | — | `["TEC-060","TEC-061","TEC-075"]` | Optional | Derived — inherits the sources of the linked records | Derived from category and source-stated laser types |
| `source_ids` | Numbered sources supporting the record (SRC ids). | array | — | `["SRC-000054","SRC-000053"]` | Required for facts | Derived — inherits the sources of the linked records | — |
| `verification` | VERIFIED / PARTIALLY_VERIFIED / UNVERIFIED (Batch-1 evidence rules). | string | VERIFIED, PARTIALLY_VERIFIED, UNVERIFIED | `VERIFIED` | Required | Record `source_ids` (Tier-4 alone never confirms) | — |
| `basis` | source | derived | reference | analyst — how the relationship is known. | string | Grouped from Batch-1 product records sharing company and family name | `Grouped from Batch-1 product records sharing company and family name` | Required | Record `source_ids` (Tier-4 alone never confirms) | — |

## models

506 records.

| Field | Definition | Data type | Allowed values | Example | Required | Source requirement | Normalisation rule |
|---|---|---|---|---|---|---|---|
| `id` | Stable primary identifier (never a name). Prefix encodes the entity. | string | — | `MDL-000001` | Required | System-generated | Assigned by build; never reused |
| `legacy_id` | Batch-1 identifier (C0001, P00001, S0001, CU001). Old deep links resolve to the 2.0 record. | string | — | `P00001` | Optional | System-generated | — |
| `entity_type` | Entity kind. | string | model | `model` | Required | System-generated | — |
| `company_id` | Manufacturer / owner company (CMP id). | string | — | `CMP-000010` | Required | Record `source_ids` (Tier-4 alone never confirms) | Must resolve |
| `manufacturer` | Manufacturer name (denormalised from company_id). | string | — | `DISCO Corporation` | Always present | Derived — inherits the sources of the linked records | — |
| `family_id` | Product family (PRD id). | string | — | `PRD-000001` | Required | Record `source_ids` (Tier-4 alone never confirms) | Must belong to the same company |
| `family_name` | Denormalised name for display. | string | — | `Stealth dicing laser saw` | Always present | Derived — inherits the sources of the linked records | — |
| `model_number` | Model number exactly as published; null for family-level records. | string / null | — | `DFL7341` | Optional | Record `source_ids` (Tier-4 alone never confirms) | Verbatim |
| `model_identified` | True when a model number is published. | boolean | — | `true` | Required | System-generated | — |
| `name` | Display name as stated by the source. | string | — | `Stealth dicing laser saw · DFL7341` | Required | Record `source_ids` (Tier-4 alone never confirms) | Trimmed; original capitalisation kept |
| `equipment_id` | Equipment category (EQP id). | string / null | — | `EQP-C01.03` | Optional | Record `source_ids` (Tier-4 alone never confirms) | Must resolve |
| `equipment_code` | Batch-1 taxonomy / BOM code of the record. | string | — | `C01.03` | Always present | Record `source_ids` (Tier-4 alone never confirms) | — |
| `equipment_label` | Equipment category label as captured. | string | — | `Stealth Dicing` | Always present | Record `source_ids` (Tier-4 alone never confirms) | — |
| `category_group` | Taxonomy group letter (A–L) or COMPONENT. | string | — | `C` | Always present | Record `source_ids` (Tier-4 alone never confirms) | — |
| `segment` | Front-End / Back-End / Test / Advanced Packaging / Wafer Manufacturing / Display / Automation & Facilities / Component. | string | Back-End, Front-End, Component, Advanced Packaging, Automation & Facilities, Display, Test, Wafer Manufacturing, Other | `Back-End` | Required | System-generated | Derived from equipment code |
| `market_segment` | Batch-1 market segment label. | string | Back-End/Packaging, Power Semiconductor, Component, Wafer Fab, Advanced Packaging, Display/MicroLED, Mask/Reticle, Factory Automation, N/A | `Back-End/Packaging` | Always present | Record `source_ids` (Tier-4 alone never confirms) | — |
| `is_component` | True for component products (laser sources, galvos, stages, RF generators…). | boolean | — | `false` | Always present | System-generated | — |
| `component_class_id` | Component class (CMPN id) for component products. | null / string | — | `CMPN-000010` | Optional (7% populated) | Record `source_ids` (Tier-4 alone never confirms) | Mapped from Batch-1 BOM code |
| `legacy_process_step` | Batch-1 value kept for traceability. | string / null | — | `PS13` | Optional (98% populated) | Record `source_ids` (Tier-4 alone never confirms) | — |
| `legacy_process_name` | Denormalised name for display. | string / null | — | `Dicing` | Optional (29% populated) | Record `source_ids` (Tier-4 alone never confirms) | — |
| `process_ids` | Processes (PRS ids). | array | — | `["PRS-032"]` | Optional | Derived — inherits the sources of the linked records | Derived: equipment category → process reference |
| `technology_text` | Value exactly as stated by the source (verbatim). | string | — | `Stealth Dicing (internal modification) with Hamamatsu SD engine` | Always present | Record `source_ids` (Tier-4 alone never confirms) | — |
| `technology_ids` | Technologies (TEC ids). | array | — | `["TEC-060","TEC-061","TEC-075"]` | Optional | Derived — inherits the sources of the linked records | Derived from category and source-stated laser types |
| `technology_basis` | Technology links split by basis: from_category (derived) and from_laser_codes (source-stated). | object | — | `{"from_category":["TEC-061"],"from_laser_codes":["TEC-060","TEC-061…` | Always present | Derived — inherits the sources of the linked records | — |
| `application_text` | Value exactly as stated by the source (verbatim). | string / null | — | `Wafer singulation (MEMS, memory, LED)` | Optional (100% populated) | Record `source_ids` (Tier-4 alone never confirms) | — |
| `application_ids` | Applications (APP ids). | array | — | `["APP-005","APP-014","APP-016"]` | Optional | Derived — inherits the sources of the linked records | Derived: text match on source-stated application |
| `material_text` | Value exactly as stated by the source (verbatim). | null / string | — | `SiC ingot` | Optional (6% populated) | Record `source_ids` (Tier-4 alone never confirms) | — |
| `material_ids` | Materials (MAT ids). | array | — | `["MAT-003"]` | Optional | Derived — inherits the sources of the linked records | Derived: text match on source-stated material/wafer/application |
| `wafer` | Wafer/substrate diameter: source_value, sizes_mm, range_mm. | null / object | — | `{"source_value":"300 mm (per S0054 model list)","sizes_mm":[300],"n…` | Optional | Record `source_ids` (Tier-4 alone never confirms) | Diameter parsed from source wording; inch → mm (2→50, 3→75, 4→100, 5→125, 6→150, 8→200, 12→300, 18→450); ranges kept as range_mm; source wording kept in source_value |
| `thickness` | Thickness / format as stated. | null / string | — | `Ingot up to 40 mm` | Optional (1% populated) | Record `source_ids` (Tier-4 alone never confirms) | Verbatim |
| `throughput` | Throughput as stated (UPH, mm/s …). | null / string | — | `Dicing >=800 mm/s` | Optional (2% populated) | Record `source_ids` (Tier-4 alone never confirms) | Verbatim; units kept |
| `accuracy` | Accuracy / repeatability as stated. | null / string | — | `0.002 mm / 210 mm (positioning)` | Optional (1% populated) | Record `source_ids` (Tier-4 alone never confirms) | Verbatim; units kept |
| `footprint` | Footprint / dimensions as stated. | null / string | — | `1,640 x 1,340 x 1,800 mm` | Optional (1% populated) | Record `source_ids` (Tier-4 alone never confirms) | Verbatim |
| `motion` | Motion system description as stated. | null / string | — | `2-axis, 300 x 300 mm (Tier 3)` | Optional (0% populated) | Record `source_ids` (Tier-4 alone never confirms) | Verbatim |
| `laser` | Laser parameters as published (type, source, wavelength, power, pulse, rep rate, scan speed, material). | object / null | — | `{"types_text":"Laser Dicing; Stealth Dicing; IR Laser Processing","…` | Optional | Record `source_ids` (Tier-4 alone never confirms) | Verbatim |
| `specs` | Stated specifications: parameter, value, unit, source_value, source_ids, verification, claim_type. | array | — | `[{"parameter":"Max ingot thickness","value":40,"unit":"mm","source_…` | Optional | Record `source_ids` (Tier-4 alone never confirms) | Numbers parsed; wording kept |
| `lifecycle` | status (Announced/Development/Commercial/Active/Limited/Legacy/Discontinued/Unknown), maturity, evidence, launch_year, eol_date, replacement_id. | object | — | `{"status":"Active","legacy_status":"ACTIVE","maturity":"Commercial"…` | Required | Record `source_ids` (Tier-4 alone never confirms) | Mapped from Batch-1 status |
| `price_public` | Publicly reported price; labelled with tier/estimate flags as captured. | null / string | — | `~KRW 600B / ~USD 450M (ESTIMATE, Tier 3 media)` | Optional (0% populated) | Record `source_ids` (Tier-4 alone never confirms) | Verbatim |
| `teal_portfolio` | TEAL portfolio area the record maps to (Batch-1 analysis). | string / null | — | `Laser Dicing` | Optional (15% populated) | Record `source_ids` (Tier-4 alone never confirms) | — |
| `notes` | Analyst notes from capture. | null / string | — | `Launch article 2018 (source VERY_STALE); current availability not r…` | Optional (70% populated) | Record `source_ids` (Tier-4 alone never confirms) | — |
| `reclassified` | — | null / object | — | `{"from_code":"A09.10","to_code":"K01","reason":"Crystal puller: Bat…` | Optional (0% populated) | Record `source_ids` (Tier-4 alone never confirms) | — |
| `batch` | — | string | Batch 1, Batch 2, Batch 3, Batch 4, Batch 5, Batch 6 | `Batch 1` | Always present | Record `source_ids` (Tier-4 alone never confirms) | — |
| `verification` | VERIFIED / PARTIALLY_VERIFIED / UNVERIFIED (Batch-1 evidence rules). | string | VERIFIED, PARTIALLY_VERIFIED, UNVERIFIED | `VERIFIED` | Required | Record `source_ids` (Tier-4 alone never confirms) | — |
| `confidence` | Confidence level (HIGH/MEDIUM/LOW/UNVERIFIED) and score where recorded. | object | — | `{"level":"HIGH"}` | Required | Record `source_ids` (Tier-4 alone never confirms) | — |
| `source_ids` | Numbered sources supporting the record (SRC ids). | array | — | `["SRC-000054","SRC-000053"]` | Required for facts | Derived — inherits the sources of the linked records | — |
| `source_age` | Batch-1 age class of the newest source (CURRENT, AGING, STALE, VERY_STALE, UNDATED, LIVE_PAGE_UNDATED). | string | LIVE_PAGE_UNDATED, VERY_STALE, AGING, STALE, UNDATED, CURRENT | `LIVE_PAGE_UNDATED` | Always present | Record `source_ids` (Tier-4 alone never confirms) | — |
| `freshness` | Recent / Needs Review / Stale / Unknown from the freshest supporting source. | string | Recent, Stale, Needs Review, Unknown | `Recent` | Required | System-generated | — |
| `quality_state` | VERIFIED / PARTIALLY_VERIFIED / UNVERIFIED / CONFLICTING / OUTDATED — one state per record. | string | VERIFIED, OUTDATED, PARTIALLY_VERIFIED, UNVERIFIED, CONFLICTING | `VERIFIED` | Required | System-generated | CONFLICTING > OUTDATED > verification |
| `missing_key_fields` | Key fields not captured for this record. | array | — | `["Wafer / substrate size","Throughput","Accuracy"]` | Required | System-generated | — |
| `dates` | first_added, last_updated, last_verified, latest_source_date, review_due. | object | — | `{"first_added":"2026-09-29","last_updated":"2026-09-29","last_verif…` | Required | System-generated | ISO 8601: YYYY, YYYY-MM or YYYY-MM-DD |

## equipment

258 records.

| Field | Definition | Data type | Allowed values | Example | Required | Source requirement | Normalisation rule |
|---|---|---|---|---|---|---|---|
| `id` | Stable primary identifier (never a name). Prefix encodes the entity. | string | — | `EQP-A` | Required | System-generated | Assigned by build; never reused |
| `entity_type` | Entity kind. | string | equipment | `equipment` | Required | System-generated | — |
| `code` | Taxonomy code. | string | — | `A` | Always present | Reference / derived | Stable |
| `name` | Display name as stated by the source. | string | — | `Wafer Fab / Front-End Equipment` | Required | Reference / derived | Trimmed; original capitalisation kept |
| `parent_id` | Parent record in the hierarchy. | null / string | — | `EQP-A` | Optional (95% populated) | Reference / derived | Must resolve |
| `level` | Taxonomy level (1 group, 2 category, 3 sub-category). | number | — | `1` | Always present | Reference / derived | — |
| `group_code` | Equipment group letter. | string | A, B, C, D, E, F, G, H, I, J, K, L | `A` | Always present | Reference / derived | — |
| `group_name` | Denormalised name for display. | string | Wafer Fab / Front-End Equipment, Mask / Reticle Equipment, Back-End / Packaging, Advanced Packaging, ATMP / OSAT, Power Semiconductor, Compound Semiconductors, MEMS, Display / MicroLED, Semiconductor Factory Automation, Wafer Manufacturing / Substrate Equipment, Subfab & Fab Facilities | `Wafer Fab / Front-End Equipment` | Always present | Derived — inherits the sources of the linked records | — |
| `segment` | Front-End / Back-End / Test / Advanced Packaging / Wafer Manufacturing / Display / Automation & Facilities / Component. | null / string | Front-End, Test, Automation & Facilities, Back-End, Advanced Packaging, Display, Device class, Wafer Manufacturing | `Front-End` | Required | System-generated | Derived from equipment code |
| `laser_relevant` | Laser-relevant category (Batch-1 flag). | boolean | — | `false` | Always present | Reference / derived | — |
| `legacy_process_step` | Batch-1 value kept for traceability. | null / string | — | `PS02` | Optional (83% populated) | Reference / derived | — |
| `process_ids` | Processes (PRS ids). | array | — | `["PRS-028"]` | Optional | Derived — inherits the sources of the linked records | Derived: equipment category → process reference |
| `technology_ids` | Technologies (TEC ids). | array | — | `["TEC-001"]` | Optional | Derived — inherits the sources of the linked records | Derived from category and source-stated laser types |
| `typical_subsystem_ids` | Linked record ids. | array | — | `["SUB-002","SUB-003","SUB-008","SUB-011","SUB-013","SUB-014","SUB-0…` | Optional (71% populated) | Derived — inherits the sources of the linked records | — |
| `subsystem_basis` | Label: typical subsystems are a generic reference. | string | Generic architecture reference (editorial), not a statement about any specific tool | `Generic architecture reference (editorial), not a statement about a…` | Always present | Reference / derived | — |
| `company_ids` | Linked record ids. | array | — | `["CMP-000004","CMP-000006","CMP-000007","CMP-000067","CMP-000109"]` | Optional (59% populated) | Derived — inherits the sources of the linked records | — |
| `model_ids` | Linked record ids. | array | — | `["MDL-000110","MDL-000121","MDL-000238","MDL-000239"]` | Optional (52% populated) | Derived — inherits the sources of the linked records | — |
| `company_ids_incl_children` | Companies confirmed on this node or any sub-category. | array | — | `["CMP-000004","CMP-000006","CMP-000007","CMP-000067","CMP-000109","…` | Optional (64% populated) | Derived — inherits the sources of the linked records | — |
| `model_ids_incl_children` | Models on this node or any sub-category. | array | — | `["MDL-000110","MDL-000121","MDL-000238","MDL-000239","MDL-000093","…` | Optional (57% populated) | Derived — inherits the sources of the linked records | — |
| `child_ids` | Linked record ids. | array | — | `["EQP-A01","EQP-A02","EQP-A03","EQP-A04","EQP-A05","EQP-A06","EQP-A…` | Optional (6% populated) | Derived — inherits the sources of the linked records | — |
| `see_also` | Related nodes (2.0 extension ↔ Batch-1 nodes carrying records). | array | — | `["EQP-A09.10"]` | Optional (3% populated) | Reference / derived | — |
| `origin` | Batch-1 taxonomy or 2.0 extension. | string | Batch-1 taxonomy, 2.0 taxonomy extension | `Batch-1 taxonomy` | Always present | Reference / derived | — |

## processes

61 records.

| Field | Definition | Data type | Allowed values | Example | Required | Source requirement | Normalisation rule |
|---|---|---|---|---|---|---|---|
| `id` | Stable primary identifier (never a name). Prefix encodes the entity. | string | — | `PRS-001` | Required | System-generated | Assigned by build; never reused |
| `entity_type` | Entity kind. | string | process | `process` | Required | System-generated | — |
| `slug` | Stable machine name of a reference record. | string | — | `crystal-growth` | Always present | System-generated | kebab-case |
| `name` | Display name as stated by the source. | string | — | `Crystal growth` | Required | Reference / derived | Trimmed; original capitalisation kept |
| `stage` | Process stage code. | string | WM, FE, TS, BE, AP, DS, FA | `WM` | Always present | Reference / derived | — |
| `stage_name` | Denormalised name for display. | string | Wafer manufacturing, Front-end (wafer processing), Wafer test, Back-end (assembly & packaging), Advanced packaging, Display & MicroLED, Fab infrastructure & subfab | `Wafer manufacturing` | Always present | Derived — inherits the sources of the linked records | — |
| `parent_id` | Parent record in the hierarchy. | null / string | — | `PRS-013` | Optional (5% populated) | Reference / derived | Must resolve |
| `sequence` | Order in the process library. | number | — | `1` | Always present | System-generated | — |
| `flow_position` | Position in the main process-flow diagram. | number / null | — | `1` | Optional (44% populated) | Reference / derived | — |
| `legacy_process_steps` | Batch-1 value kept for traceability. | array | — | `["PS01"]` | Always present | Reference / derived | — |
| `description` | Business focus / definition. | string | — | `Growth of a single-crystal boule from melt or vapour (e.g. Czochral…` | Always present | Editorial reference — labelled, no company claim | — |
| `purpose` | Why the process step exists (editorial). | string | — | `Produce defect-controlled single-crystal material of the required o…` | Always present | Editorial reference — labelled, no company claim | — |
| `inputs` | Process/subsystem inputs (editorial). | array | — | `["High-purity polysilicon or source material","Seed crystal","Dopan…` | Always present | Editorial reference — labelled, no company claim | — |
| `outputs` | Process/subsystem outputs (editorial). | array | — | `["Single-crystal ingot / boule"]` | Always present | Editorial reference — labelled, no company claim | — |
| `typical_parameters` | Parameter names that characterise the process (no values). | array | — | `["Pull rate","Rotation rate","Melt / growth temperature","Ambient g…` | Optional (97% populated) | Editorial reference — labelled, no company claim | — |
| `quality_metrics` | Process quality metrics (editorial). | array | — | `["Dislocation density","Resistivity uniformity","Oxygen / carbon co…` | Optional (97% populated) | Editorial reference — labelled, no company claim | — |
| `defects` | Typical defects of the process (editorial). | array | — | `["Dislocations","Micropipes (SiC)","Crystal-originated particles"]` | Optional (82% populated) | Editorial reference — labelled, no company claim | — |
| `equipment_ids` | Source-confirmed equipment categories (EQP ids). | array | — | `["EQP-K01"]` | Optional | Derived — inherits the sources of the linked records | Only confirmed categories; analyst candidates are kept in candidate_categories |
| `technology_ids` | Technologies (TEC ids). | array | — | `["TEC-058","TEC-065"]` | Optional | Derived — inherits the sources of the linked records | Derived from category and source-stated laser types |
| `material_ids` | Materials (MAT ids). | array | — | `["MAT-001","MAT-003","MAT-004","MAT-005","MAT-006","MAT-009"]` | Optional | Derived — inherits the sources of the linked records | Derived: text match on source-stated material/wafer/application |
| `model_ids` | Linked record ids. | array | — | `["MDL-000116","MDL-000117","MDL-000273","MDL-000274","MDL-000275","…` | Optional (97% populated) | Derived — inherits the sources of the linked records | — |
| `company_ids` | Linked record ids. | array | — | `["CMP-000202","CMP-000215","CMP-000239","CMP-000184","CMP-000194"]` | Optional (97% populated) | Derived — inherits the sources of the linked records | — |
| `content_basis` | Label stating which content is editorial vs source-backed. | string | Editorial reference (generic process description; not source-traced) | `Editorial reference (generic process description; not source-traced)` | Always present | Editorial reference — labelled, no company claim | — |

## technologies

83 records.

| Field | Definition | Data type | Allowed values | Example | Required | Source requirement | Normalisation rule |
|---|---|---|---|---|---|---|---|
| `id` | Stable primary identifier (never a name). Prefix encodes the entity. | string | — | `TEC-001` | Required | System-generated | Assigned by build; never reused |
| `entity_type` | Entity kind. | string | technology | `technology` | Required | System-generated | — |
| `slug` | Stable machine name of a reference record. | string | — | `euv` | Always present | System-generated | kebab-case |
| `legacy_code` | Batch-1 value kept for traceability. | null / string | — | `L01` | Optional (30% populated) | Reference / derived | — |
| `name` | Display name as stated by the source. | string | — | `EUV lithography` | Required | Reference / derived | Trimmed; original capitalisation kept |
| `family` | Technology family. | string | — | `Lithography` | Always present | Reference / derived | — |
| `aliases` | Other names: abbreviations and brands documented in Batch 1. | array | — | `["extreme ultraviolet"]` | Optional | Reference / derived | — |
| `description` | Business focus / definition. | string | — | `Projection lithography at 13.5 nm wavelength using reflective optic…` | Always present | Editorial reference — labelled, no company claim | — |
| `equipment_ids` | Source-confirmed equipment categories (EQP ids). | array | — | `["EQP-A01.01"]` | Optional | Derived — inherits the sources of the linked records | Only confirmed categories; analyst candidates are kept in candidate_categories |
| `process_ids` | Processes (PRS ids). | array | — | `["PRS-018"]` | Optional | Derived — inherits the sources of the linked records | Derived: equipment category → process reference |
| `model_ids` | Linked record ids. | array | — | `["MDL-000093","MDL-000094","MDL-000120"]` | Optional (86% populated) | Derived — inherits the sources of the linked records | — |
| `company_ids` | Linked record ids. | array | — | `["CMP-000001","CMP-000182","CMP-000027"]` | Optional (92% populated) | Derived — inherits the sources of the linked records | — |
| `content_basis` | Label stating which content is editorial vs source-backed. | string | Editorial reference; company/model links derived from source-backed categories and laser codes | `Editorial reference; company/model links derived from source-backed…` | Always present | Editorial reference — labelled, no company claim | — |

## materials

47 records.

| Field | Definition | Data type | Allowed values | Example | Required | Source requirement | Normalisation rule |
|---|---|---|---|---|---|---|---|
| `id` | Stable primary identifier (never a name). Prefix encodes the entity. | string | — | `MAT-001` | Required | System-generated | Assigned by build; never reused |
| `entity_type` | Entity kind. | string | material | `material` | Required | System-generated | — |
| `slug` | Stable machine name of a reference record. | string | — | `silicon` | Always present | System-generated | kebab-case |
| `name` | Display name as stated by the source. | string | — | `Silicon (Si)` | Required | Reference / derived | Trimmed; original capitalisation kept |
| `material_class` | Material class. | string | Substrate, Gas, Chemical, Deposition material, CMP consumable, Packaging material | `Substrate` | Always present | Reference / derived | — |
| `description` | Business focus / definition. | string | — | `Mainstream single-crystal semiconductor substrate.` | Always present | Editorial reference — labelled, no company claim | — |
| `process_ids` | Processes (PRS ids). | array | — | `["PRS-001","PRS-002","PRS-003","PRS-004","PRS-005","PRS-006","PRS-0…` | Optional | Derived — inherits the sources of the linked records | Derived: equipment category → process reference |
| `model_ids` | Linked record ids. | array | — | `["MDL-000027","MDL-000044","MDL-000064","MDL-000090","MDL-000116","…` | Optional (19% populated) | Derived — inherits the sources of the linked records | — |
| `company_ids` | Linked record ids. | array | — | `["CMP-000141","CMP-000119","CMP-000177","CMP-000040","CMP-000184","…` | Optional (19% populated) | Derived — inherits the sources of the linked records | — |
| `supplier_company_ids` | Linked record ids. | array | — | `` | Optional (0% populated) | Derived — inherits the sources of the linked records | — |
| `grade_purity` | Material grade/purity (not captured). | null | — | `` | Optional (0% populated) | Reference / derived | — |
| `safety_class` | Material safety class (not captured). | null | — | `` | Optional (0% populated) | Reference / derived | — |
| `link_basis` | How model links to this record were derived. | string | Derived: text match on source-stated material / wafer / application fields, No model-level links (reference only) | `Derived: text match on source-stated material / wafer / application…` | Always present | Reference / derived | — |
| `content_basis` | Label stating which content is editorial vs source-backed. | string | Editorial reference | `Editorial reference` | Always present | Editorial reference — labelled, no company claim | — |
| `supplier_company_ids_class_level` | Materials/gas suppliers known at class level only. | array | — | `["CMP-000199","CMP-000311","CMP-000312","CMP-000313","CMP-000314","…` | Optional (23% populated) | Reference / derived | — |

## applications

20 records.

| Field | Definition | Data type | Allowed values | Example | Required | Source requirement | Normalisation rule |
|---|---|---|---|---|---|---|---|
| `id` | Stable primary identifier (never a name). Prefix encodes the entity. | string | — | `APP-001` | Required | System-generated | Assigned by build; never reused |
| `entity_type` | Entity kind. | string | application | `application` | Required | System-generated | — |
| `slug` | Stable machine name of a reference record. | string | — | `logic` | Always present | System-generated | kebab-case |
| `name` | Display name as stated by the source. | string | — | `Logic / foundry` | Required | Reference / derived | Trimmed; original capitalisation kept |
| `group` | Application group. | string | Logic, Memory, Analog & power, RF, MEMS & sensors, Photonics & display, Packaging, End market | `Logic` | Always present | Reference / derived | — |
| `model_ids` | Linked record ids. | array | — | `["MDL-000056","MDL-000057","MDL-000058","MDL-000082","MDL-000092","…` | Optional (95% populated) | Derived — inherits the sources of the linked records | — |
| `company_ids` | Linked record ids. | array | — | `["CMP-000014","CMP-000002","CMP-000038","CMP-000001","CMP-000020","…` | Optional (95% populated) | Derived — inherits the sources of the linked records | — |
| `link_basis` | How model links to this record were derived. | string | Derived: text match on source-stated application / technology fields | `Derived: text match on source-stated application / technology fields` | Always present | Reference / derived | — |

## subsystems

16 records.

| Field | Definition | Data type | Allowed values | Example | Required | Source requirement | Normalisation rule |
|---|---|---|---|---|---|---|---|
| `id` | Stable primary identifier (never a name). Prefix encodes the entity. | string | — | `SUB-001` | Required | System-generated | Assigned by build; never reused |
| `entity_type` | Entity kind. | string | subsystem | `subsystem` | Required | System-generated | — |
| `slug` | Stable machine name of a reference record. | string | — | `laser` | Always present | System-generated | kebab-case |
| `name` | Display name as stated by the source. | string | — | `Laser subsystem` | Required | Reference / derived | Trimmed; original capitalisation kept |
| `architecture` | Generic subsystem architecture (editorial). | string | — | `Laser source (fiber, DPSS, ultrafast, excimer or CO₂) with power su…` | Always present | Editorial reference — labelled, no company claim | — |
| `functions` | Subsystem functions (editorial). | array | — | `["Generate photons at the required wavelength, pulse duration and p…` | Always present | Editorial reference — labelled, no company claim | — |
| `inputs` | Process/subsystem inputs (editorial). | array | — | `["Electrical power","Cooling water","Trigger / control signals"]` | Always present | Editorial reference — labelled, no company claim | — |
| `outputs` | Process/subsystem outputs (editorial). | array | — | `["Laser beam"]` | Always present | Editorial reference — labelled, no company claim | — |
| `critical_parameters` | Critical parameters (names only). | array | — | `["Wavelength","Pulse duration","Pulse energy","Average power","Repe…` | Always present | Editorial reference — labelled, no company claim | — |
| `failure_modes` | Typical failure modes (editorial). | array | — | `["Power drift","Pump diode degradation","Optics contamination"]` | Always present | Editorial reference — labelled, no company claim | — |
| `interfaces` | Subsystem interfaces (editorial). | array | — | `["Trigger/sync to motion & scanner","Cooling loop","Interlock chain"]` | Always present | Editorial reference — labelled, no company claim | — |
| `integration_requirements` | Integration requirements (editorial). | array | — | `["Thermal stability","Beam pointing stability","Laser safety class"]` | Always present | Editorial reference — labelled, no company claim | — |
| `cost_drivers` | Generic cost drivers (no figures). | array | — | `["Source type and power class"]` | Always present | Editorial reference — labelled, no company claim | — |
| `component_ids` | Linked record ids. | array | — | `["CMPN-000010","CMPN-000011"]` | Optional (94% populated) | Derived — inherits the sources of the linked records | — |
| `potential_supplier_ids` | Linked record ids. | array | — | `["CMP-000133","CMP-000134","CMP-000135","CMP-000145","CMP-000146","…` | Optional (56% populated) | Derived — inherits the sources of the linked records | — |
| `typical_equipment_ids` | Linked record ids. | array | — | `["EQP-A01.01","EQP-A01.02","EQP-A01.03","EQP-A01.04","EQP-A01.08","…` | Always present | Derived — inherits the sources of the linked records | — |
| `typical_oem_ids` | Linked record ids. | array | — | `["CMP-000001","CMP-000027","CMP-000182","CMP-000020","CMP-000032","…` | Always present | Derived — inherits the sources of the linked records | — |
| `localization_notes` | Batch-1 localisation rows relevant to the subsystem. | array | — | `["LO04","LO05","LO13","LO14"]` | Optional (56% populated) | Reference / derived | — |
| `content_basis` | Label stating which content is editorial vs source-backed. | string | Editorial engineering reference; supplier lists from Batch-1 register | `Editorial engineering reference; supplier lists from Batch-1 register` | Always present | Editorial reference — labelled, no company claim | — |

## components

61 records.

| Field | Definition | Data type | Allowed values | Example | Required | Source requirement | Normalisation rule |
|---|---|---|---|---|---|---|---|
| `id` | Stable primary identifier (never a name). Prefix encodes the entity. | string | — | `CMPN-000001` | Required | System-generated | Assigned by build; never reused |
| `entity_type` | Entity kind. | string | component | `component` | Required | System-generated | — |
| `slug` | Stable machine name of a reference record. | string | — | `servo-motor` | Always present | System-generated | kebab-case |
| `name` | Display name as stated by the source. | string | — | `Servo motor` | Required | Reference / derived | Trimmed; original capitalisation kept |
| `category` | Component category (Motion, Optical, Vacuum …). | string | Motion, Optical, Vacuum, Plasma / RF, Thermal, Gas / chemical, Automation, Electrical | `Motion` | Always present | Reference / derived | — |
| `subsystem_id` | Parent subsystem (SUB id). | string | — | `SUB-003` | Always present | Reference / derived | Must resolve |
| `legacy_bom_codes` | Batch-1 value kept for traceability. | array | — | `["BOM14"]` | Optional (41% populated) | Reference / derived | — |
| `capable_supplier_ids` | Linked record ids. | array | — | `["CMP-000160"]` | Optional (31% populated) | Derived — inherits the sources of the linked records | — |
| `documented_supply_links` | Batch-1 supplier-register ids with documented supply. | array | — | `["SR001","SR002","SR003","SR004","SR005","SR006","SR007"]` | Optional (3% populated) | Reference / derived | — |
| `gap` | True when Batch 1 records no supplier for the class. | boolean | — | `true` | Always present | Reference / derived | — |
| `gap_note` | Evidence note for a supplier gap. | string / null | — | `No supplier with documented capability captured` | Optional (8% populated) | Reference / derived | — |
| `product_model_ids` | Linked record ids. | array | — | `["MDL-000143"]` | Optional (23% populated) | Derived — inherits the sources of the linked records | — |
| `india_supplier_ids` | Linked record ids. | array | — | `["CMP-000194"]` | Optional (2% populated) | Derived — inherits the sources of the linked records | — |
| `source_ids` | Numbered sources supporting the record (SRC ids). | array | — | `["SRC-000000"]` | Required for facts | Derived — inherits the sources of the linked records | — |
| `specification` | Component specification (not captured at class level). | null | — | `` | Optional (0% populated) | Reference / derived | — |
| `operating_range` | Operating range (not captured at class level). | null | — | `` | Optional (0% populated) | Reference / derived | — |
| `interface` | Component interface (not captured at class level). | null | — | `` | Optional (0% populated) | Reference / derived | — |
| `obsolescence_status` | Component obsolescence (not captured at class level). | null | — | `` | Optional (0% populated) | Reference / derived | — |
| `content_basis` | Label stating which content is editorial vs source-backed. | string | Component class: editorial; supplier links: Batch-1 supplier register (source-backed capability, not proof of supply to a named OEM) | `Component class: editorial; supplier links: Batch-1 supplier regist…` | Always present | Editorial reference — labelled, no company claim | — |

## suppliers

311 records.

| Field | Definition | Data type | Allowed values | Example | Required | Source requirement | Normalisation rule |
|---|---|---|---|---|---|---|---|
| `company_id` | Manufacturer / owner company (CMP id). | string | — | `CMP-000001` | Required | Record `source_ids` (Tier-4 alone never confirms) | Must resolve |
| `name` | Display name as stated by the source. | string | — | `ASML Holding` | Required | Record `source_ids` (Tier-4 alone never confirms) | Trimmed; original capitalisation kept |
| `country` | Country name. | string / null | — | `Netherlands` | Optional (99% populated) | Record `source_ids` (Tier-4 alone never confirms) | Country reference |
| `supplier_types` | Normalised supplier roles (OEM vs subsystem/component/materials/service…). | array | — | `["Equipment OEM"]` | Required | System-generated | Mapped from company_type |
| `company_type` | Batch-1 company type. | string | — | `Equipment OEM` | Required | Record `source_ids` (Tier-4 alone never confirms) | — |
| `component_class_ids` | Linked record ids. | array | — | `["CMPN-000010"]` | Optional (14% populated) | Derived — inherits the sources of the linked records | — |
| `subsystem_ids` | Linked record ids. | array | — | `["SUB-001"]` | Optional (13% populated) | Derived — inherits the sources of the linked records | — |
| `documented_links` | Supplier-register rows documenting actual supply/distribution. | array | — | `["SR001","SR002"]` | Optional (2% populated) | Record `source_ids` (Tier-4 alone never confirms) | — |
| `capability_links` | Supplier-register rows documenting capability. | array | — | `["SR013"]` | Optional (12% populated) | Record `source_ids` (Tier-4 alone never confirms) | — |

## fabs

22 records.

| Field | Definition | Data type | Allowed values | Example | Required | Source requirement | Normalisation rule |
|---|---|---|---|---|---|---|---|
| `id` | Stable primary identifier (never a name). Prefix encodes the entity. | string | — | `FAB-000001` | Required | System-generated | Assigned by build; never reused |
| `legacy_id` | Batch-1 identifier (C0001, P00001, S0001, CU001). Old deep links resolve to the 2.0 record. | string | — | `CU001` | Optional | System-generated | — |
| `entity_type` | Entity kind. | string | fab | `fab` | Required | System-generated | — |
| `name` | Display name as stated by the source. | string | — | `TSMC` | Required | Record `source_ids` (Tier-4 alone never confirms) | Trimmed; original capitalisation kept |
| `facility_type` | Customer / facility type (Foundry, IDM, Memory, OSAT, ATMP …). | string | Foundry, IDM (memory/foundry), IDM, Memory, Foundry + OSAT, Research foundry / consortium, Display, Glass substrate, Service foundry | `Foundry` | Always present | Record `source_ids` (Tier-4 alone never confirms) | — |
| `country` | Country name. | string | Taiwan, South Korea, United States, China, Germany, Switzerland, Netherlands, Japan, India | `Taiwan` | Always present | Record `source_ids` (Tier-4 alone never confirms) | Country reference |
| `country_id` | Country reference id (CTY). | string | CTY-TW, CTY-KR, CTY-US, CTY-CN, CTY-DE, CTY-CH, CTY-NL, CTY-JP, CTY-IN | `CTY-TW` | Always present | Record `source_ids` (Tier-4 alone never confirms) | Must resolve |
| `sites` | Named sites with basis and sources. | array | — | `[{"name":"CoPoS pilot line (evaluation)","basis":"Key sites field (…` | Optional (45% populated) | Record `source_ids` (Tier-4 alone never confirms) | Verbatim site names |
| `equipment_supplier_ids` | Linked record ids. | array | — | `["CMP-000082","CMP-000090","CMP-000089","CMP-000003","CMP-000005","…` | Optional (59% populated) | Derived — inherits the sources of the linked records | — |
| `model_ids` | Linked record ids. | array | — | `["MDL-000054"]` | Optional (41% populated) | Derived — inherits the sources of the linked records | — |
| `customer_link_ids` | Linked record ids. | array | — | `["REL-CR-027","REL-CR-028","REL-CR-029","REL-CR-037","REL-CR-038","…` | Optional (59% populated) | Derived — inherits the sources of the linked records | — |
| `confirmed_links` | Number of CONFIRMED equipment-supplier links. | number | — | `2` | Always present | Derived — inherits the sources of the linked records | — |
| `capacity` | Facility capacity (not captured unless stated in a site). | null | — | `` | Optional (0% populated) | Record `source_ids` (Tier-4 alone never confirms) | — |
| `process_node` | Facility process node (not captured unless stated). | null | — | `` | Optional (0% populated) | Record `source_ids` (Tier-4 alone never confirms) | — |
| `wafer_size` | Facility wafer size (not captured unless stated). | null | — | `` | Optional (0% populated) | Record `source_ids` (Tier-4 alone never confirms) | — |
| `investment` | Facility investment (not captured unless stated). | null | — | `` | Optional (0% populated) | Record `source_ids` (Tier-4 alone never confirms) | — |
| `status` | Relationship status (CONFIRMED, PROBABLE, UNVERIFIED, DOCUMENTED_SUPPLY, CAPABLE_SUPPLIER …). | null | — | `` | Optional | Record `source_ids` (Tier-4 alone never confirms) | — |
| `field_note` | Explains which facility fields are not captured. | string | Facility capacity, node, wafer size and investment are not captured in Batch 1 unless stated in a site description. | `Facility capacity, node, wafer size and investment are not captured…` | Always present | Record `source_ids` (Tier-4 alone never confirms) | — |
| `source_ids` | Numbered sources supporting the record (SRC ids). | array | — | `["SRC-000141","SRC-000136","SRC-000179","SRC-000178"]` | Required for facts | Derived — inherits the sources of the linked records | — |
| `also_listed_as` | Same organisation listed in the other of fabs/OSATs. | null / string | — | `OSAT-000019` | Optional (5% populated) | Record `source_ids` (Tier-4 alone never confirms) | — |

## osats

9 records.

| Field | Definition | Data type | Allowed values | Example | Required | Source requirement | Normalisation rule |
|---|---|---|---|---|---|---|---|
| `id` | Stable primary identifier (never a name). Prefix encodes the entity. | string | — | `OSAT-000015` | Required | System-generated | Assigned by build; never reused |
| `legacy_id` | Batch-1 identifier (C0001, P00001, S0001, CU001). Old deep links resolve to the 2.0 record. | string | — | `CU015` | Optional | System-generated | — |
| `entity_type` | Entity kind. | string | — | `osat` | Required | System-generated | — |
| `name` | Display name as stated by the source. | string | — | `ASE Technology Holding` | Required | Record `source_ids` (Tier-4 alone never confirms) | Trimmed; original capitalisation kept |
| `facility_type` | Customer / facility type (Foundry, IDM, Memory, OSAT, ATMP …). | string | — | `OSAT` | Always present | Record `source_ids` (Tier-4 alone never confirms) | — |
| `country` | Country name. | string | — | `Taiwan` | Always present | Record `source_ids` (Tier-4 alone never confirms) | Country reference |
| `country_id` | Country reference id (CTY). | string | — | `CTY-TW` | Always present | Record `source_ids` (Tier-4 alone never confirms) | Must resolve |
| `sites` | Named sites with basis and sources. | array | — | `[{"name":"Taiwan","basis":"Customer link CR025","source_ids":["SRC-…` | Optional (67% populated) | Record `source_ids` (Tier-4 alone never confirms) | Verbatim site names |
| `equipment_supplier_ids` | Linked record ids. | array | — | `["CMP-000080","CMP-000081"]` | Optional (44% populated) | Derived — inherits the sources of the linked records | — |
| `model_ids` | Linked record ids. | array | — | `["MDL-000329"]` | Optional (11% populated) | Derived — inherits the sources of the linked records | — |
| `customer_link_ids` | Linked record ids. | array | — | `["REL-CR-025","REL-CR-026"]` | Optional (44% populated) | Derived — inherits the sources of the linked records | — |
| `confirmed_links` | Number of CONFIRMED equipment-supplier links. | number | — | `0` | Always present | Derived — inherits the sources of the linked records | — |
| `capacity` | Facility capacity (not captured unless stated in a site). | null | — | `` | Optional (0% populated) | Record `source_ids` (Tier-4 alone never confirms) | — |
| `process_node` | Facility process node (not captured unless stated). | null | — | `` | Optional (0% populated) | Record `source_ids` (Tier-4 alone never confirms) | — |
| `wafer_size` | Facility wafer size (not captured unless stated). | null | — | `` | Optional (0% populated) | Record `source_ids` (Tier-4 alone never confirms) | — |
| `investment` | Facility investment (not captured unless stated). | null | — | `` | Optional (0% populated) | Record `source_ids` (Tier-4 alone never confirms) | — |
| `status` | Relationship status (CONFIRMED, PROBABLE, UNVERIFIED, DOCUMENTED_SUPPLY, CAPABLE_SUPPLIER …). | null | — | `` | Optional | Record `source_ids` (Tier-4 alone never confirms) | — |
| `field_note` | Explains which facility fields are not captured. | string | — | `Facility capacity, node, wafer size and investment are not captured…` | Always present | Record `source_ids` (Tier-4 alone never confirms) | — |
| `source_ids` | Numbered sources supporting the record (SRC ids). | array | — | `["SRC-000177"]` | Required for facts | Derived — inherits the sources of the linked records | — |
| `also_listed_as` | Same organisation listed in the other of fabs/OSATs. | null / string | — | `FAB-000019` | Optional (11% populated) | Record `source_ids` (Tier-4 alone never confirms) | — |

## customers

6 records.

| Field | Definition | Data type | Allowed values | Example | Required | Source requirement | Normalisation rule |
|---|---|---|---|---|---|---|---|
| `id` | Stable primary identifier (never a name). Prefix encodes the entity. | string | — | `CUS-000027` | Required | System-generated | Assigned by build; never reused |
| `legacy_id` | Batch-1 identifier (C0001, P00001, S0001, CU001). Old deep links resolve to the 2.0 record. | string | — | `CU027` | Optional | System-generated | — |
| `entity_type` | Entity kind. | string | — | `customer` | Required | System-generated | — |
| `name` | Display name as stated by the source. | string | — | `Apple` | Required | Record `source_ids` (Tier-4 alone never confirms) | Trimmed; original capitalisation kept |
| `facility_type` | Customer / facility type (Foundry, IDM, Memory, OSAT, ATMP …). | string | — | `Systems` | Always present | Record `source_ids` (Tier-4 alone never confirms) | — |
| `country` | Country name. | string / null | — | `United States` | Optional (50% populated) | Record `source_ids` (Tier-4 alone never confirms) | Country reference |
| `country_id` | Country reference id (CTY). | string / null | — | `CTY-US` | Optional (50% populated) | Record `source_ids` (Tier-4 alone never confirms) | Must resolve |
| `sites` | Named sites with basis and sources. | array | — | `[{"name":"China","basis":"Customer link CR021","source_ids":["SRC-0…` | Optional (17% populated) | Record `source_ids` (Tier-4 alone never confirms) | Verbatim site names |
| `equipment_supplier_ids` | Linked record ids. | array | — | `["CMP-000143"]` | Optional (83% populated) | Derived — inherits the sources of the linked records | — |
| `model_ids` | Linked record ids. | array | — | `["MDL-000056","MDL-000112","MDL-000082","MDL-000027","MDL-000050","…` | Optional (67% populated) | Derived — inherits the sources of the linked records | — |
| `customer_link_ids` | Linked record ids. | array | — | `["REL-CR-019"]` | Optional (83% populated) | Derived — inherits the sources of the linked records | — |
| `confirmed_links` | Number of CONFIRMED equipment-supplier links. | number | — | `0` | Always present | Derived — inherits the sources of the linked records | — |
| `capacity` | Facility capacity (not captured unless stated in a site). | null | — | `` | Optional (0% populated) | Record `source_ids` (Tier-4 alone never confirms) | — |
| `process_node` | Facility process node (not captured unless stated). | null | — | `` | Optional (0% populated) | Record `source_ids` (Tier-4 alone never confirms) | — |
| `wafer_size` | Facility wafer size (not captured unless stated). | null | — | `` | Optional (0% populated) | Record `source_ids` (Tier-4 alone never confirms) | — |
| `investment` | Facility investment (not captured unless stated). | null | — | `` | Optional (0% populated) | Record `source_ids` (Tier-4 alone never confirms) | — |
| `status` | Relationship status (CONFIRMED, PROBABLE, UNVERIFIED, DOCUMENTED_SUPPLY, CAPABLE_SUPPLIER …). | null | — | `` | Optional | Record `source_ids` (Tier-4 alone never confirms) | — |
| `field_note` | Explains which facility fields are not captured. | string | — | `Facility capacity, node, wafer size and investment are not captured…` | Always present | Record `source_ids` (Tier-4 alone never confirms) | — |
| `source_ids` | Numbered sources supporting the record (SRC ids). | array | — | `["SRC-000228"]` | Required for facts | Derived — inherits the sources of the linked records | — |
| `also_listed_as` | Same organisation listed in the other of fabs/OSATs. | null | — | `` | Optional (0% populated) | Record `source_ids` (Tier-4 alone never confirms) | — |

## countries

37 records.

| Field | Definition | Data type | Allowed values | Example | Required | Source requirement | Normalisation rule |
|---|---|---|---|---|---|---|---|
| `id` | Stable primary identifier (never a name). Prefix encodes the entity. | string | — | `CTY-US` | Required | System-generated | Assigned by build; never reused |
| `entity_type` | Entity kind. | string | country | `country` | Required | System-generated | — |
| `iso2` | ISO 3166-1 alpha-2 code. | string | — | `US` | Always present | Reference / derived | Upper case |
| `name` | Display name as stated by the source. | string | — | `United States` | Required | Reference / derived | Trimmed; original capitalisation kept |
| `region` | World region. | string | North America, Europe, Middle East, Asia-Pacific | `North America` | Always present | Reference / derived | — |
| `lat` | Approximate centroid latitude (map clustering only). | number | — | `39.8` | Always present | Reference / derived | — |
| `lon` | Approximate centroid longitude (map clustering only). | number | — | `-98.6` | Always present | Reference / derived | — |
| `centroid_note` | Label: centroid is approximate. | string | Approximate country centroid for map clustering only | `Approximate country centroid for map clustering only` | Always present | Reference / derived | — |
| `company_ids` | Linked record ids. | array | — | `["CMP-000002","CMP-000003","CMP-000005","CMP-000009","CMP-000014","…` | Optional (70% populated) | Derived — inherits the sources of the linked records | — |
| `equipment_oem_ids` | Linked record ids. | array | — | `["CMP-000002","CMP-000003","CMP-000005","CMP-000009","CMP-000014","…` | Optional (68% populated) | Derived — inherits the sources of the linked records | — |
| `subsystem_supplier_ids` | Linked record ids. | array | — | `["CMP-000170","CMP-000172","CMP-000173","CMP-000324","CMP-000325"]` | Optional (19% populated) | Derived — inherits the sources of the linked records | — |
| `component_supplier_ids` | Linked record ids. | array | — | `["CMP-000145","CMP-000146","CMP-000148","CMP-000151","CMP-000158","…` | Optional (35% populated) | Derived — inherits the sources of the linked records | — |
| `materials_supplier_ids` | Linked record ids. | array | — | `["CMP-000315","CMP-000326"]` | Optional (14% populated) | Derived — inherits the sources of the linked records | — |
| `fab_ids` | Linked record ids. | array | — | `["FAB-000003","FAB-000004","FAB-000007","FAB-000009","FAB-000024","…` | Optional (24% populated) | Derived — inherits the sources of the linked records | — |
| `osat_ids` | Linked record ids. | array | — | `["OSAT-000016"]` | Optional (11% populated) | Derived — inherits the sources of the linked records | — |
| `india_partnership_company_ids` | Linked record ids. | array | — | `["CMP-000002","CMP-000003","CMP-000005","CMP-000009"]` | Optional (11% populated) | Derived — inherits the sources of the linked records | — |
| `verified_company_count` | Companies in the country with VERIFIED status. | number | — | `26` | Always present | Reference / derived | — |
| `batch1_search_status` | How thoroughly Batch 1 searched the country. | string | TARGETED, NOT_SEARCHED, INCIDENTAL, NOT_IN_BRIEF | `TARGETED` | Always present | Reference / derived | — |
| `legacy_notes` | Batch-1 value kept for traceability. | string / null | — | `OEM majors, subsystems, laser/optics, motion, test` | Optional (95% populated) | Reference / derived | — |
| `listed_in_brief` | Country listed in the original brief. | boolean | — | `true` | Always present | Reference / derived | — |
| `technology_strengths` | Not assessed in Batch 1. | null | — | `` | Optional (0% populated) | Reference / derived | — |
| `export_dependencies` | Not assessed in Batch 1. | null | — | `` | Optional (0% populated) | Reference / derived | — |
| `strengths_note` | Explains that strengths are not assessed. | string | Not assessed in Batch 1 — no source-backed assessment captured | `Not assessed in Batch 1 — no source-backed assessment captured` | Always present | Reference / derived | — |

## deals

44 records.

| Field | Definition | Data type | Allowed values | Example | Required | Source requirement | Normalisation rule |
|---|---|---|---|---|---|---|---|
| `id` | Stable primary identifier (never a name). Prefix encodes the entity. | string | — | `DEAL-000001` | Required | System-generated | Assigned by build; never reused |
| `legacy_id` | Batch-1 identifier (C0001, P00001, S0001, CU001). Old deep links resolve to the 2.0 record. | string | — | `PA001` | Optional | System-generated | — |
| `event_type` | Deal type as captured (Merger, Acquisition, MoU, Funding …). | string | — | `Merger` | Always present | Record `source_ids` (Tier-4 alone never confirms) | — |
| `party_a` | Party A as captured. | string | — | `Axcelis Technologies` | Always present | Record `source_ids` (Tier-4 alone never confirms) | Verbatim |
| `party_a_id` | Resolved id of party A. | string / null | — | `CMP-000015` | Optional (98% populated) | Record `source_ids` (Tier-4 alone never confirms) | — |
| `party_b` | Party B as captured. | string | — | `Veeco Instruments` | Always present | Record `source_ids` (Tier-4 alone never confirms) | Verbatim |
| `party_b_id` | Resolved id of party B. | string / null | — | `CMP-000014` | Optional (43% populated) | Record `source_ids` (Tier-4 alone never confirms) | — |
| `date` | Event / relationship date. | string / null | — | `2025-09-30` | Optional (68% populated) | Record `source_ids` (Tier-4 alone never confirms) | ISO where parseable |
| `value_disclosed` | Deal value as disclosed (with tier flags). | string / null | — | `All-stock, ratio 0.3575; ~USD 4.4B (Tier 4)` | Optional (41% populated) | Record `source_ids` (Tier-4 alone never confirms) | Verbatim |
| `technology` | Technology field as captured. | string / null | — | `Ion implant + laser annealing/MOCVD/ion beam` | Optional (93% populated) | Record `source_ids` (Tier-4 alone never confirms) | Verbatim |
| `status` | Relationship status (CONFIRMED, PROBABLE, UNVERIFIED, DOCUMENTED_SUPPLY, CAPABLE_SUPPLIER …). | string | — | `PENDING (regulatory approval)` | Optional | Record `source_ids` (Tier-4 alone never confirms) | — |
| `confidence` | Confidence level (HIGH/MEDIUM/LOW/UNVERIFIED) and score where recorded. | string | HIGH, MEDIUM, LOW, UNVERIFIED | `HIGH` | Required | Record `source_ids` (Tier-4 alone never confirms) | — |
| `source_ids` | Numbered sources supporting the record (SRC ids). | array | — | `["SRC-000121","SRC-000122","SRC-000123"]` | Required for facts | Derived — inherits the sources of the linked records | — |
| `claim_type` | Reported event vs unverified report / rumour. | string | Reported event, Unverified report | `Reported event` | Always present | Record `source_ids` (Tier-4 alone never confirms) | — |

## relationships

5,513 records.

| Field | Definition | Data type | Allowed values | Example | Required | Source requirement | Normalisation rule |
|---|---|---|---|---|---|---|---|
| `id` | Stable primary identifier (never a name). Prefix encodes the entity. | string | — | `REL-000001` | Required | System-generated | Assigned by build; never reused |
| `type` | Relationship type (manufactures, supplies, capable_of_supplying, supplies_equipment_to, used_in, uses_technology, supports_material, contains, located_in, subsidiary_of, …). | string | — | `manufactures` | Required | `source_ids` when basis = source | — |
| `from` | Relationship start node id. | string | — | `CMP-000010` | Required | `source_ids` when basis = source | Must resolve |
| `to` | Relationship end node id. | string | — | `MDL-000001` | Required | `source_ids` when basis = source | Must resolve |
| `basis` | source | derived | reference | analyst — how the relationship is known. | string | source, derived, analyst, reference | `source` | Required | `source_ids` when basis = source | — |
| `source_ids` | Numbered sources supporting the record (SRC ids). | array | — | `["SRC-000054","SRC-000053"]` | Required for facts | Derived — inherits the sources of the linked records | — |
| `confidence` | Confidence level (HIGH/MEDIUM/LOW/UNVERIFIED) and score where recorded. | string | — | `HIGH` | Required | `source_ids` when basis = source | — |
| `via` | How a derived relationship was computed. | string | — | `equipment category → process reference` | Optional (24% populated) | `source_ids` when basis = source | — |
| `note` | Free-text note from capture. | string | — | `Analyst knowledge — not source-traced` | Optional (6% populated) | `source_ids` when basis = source | — |
| `detail` | Relationship detail (customer, product, stage, site, evidence …). | object | — | `{"type":"Partnership (MoU)","facility":"Tata Electronics Dholera fa…` | Optional (3% populated) | `source_ids` when basis = source | Verbatim |
| `legacy_id` | Batch-1 identifier (C0001, P00001, S0001, CU001). Old deep links resolve to the 2.0 record. | string | — | `SR001` | Optional | System-generated | — |
| `status` | Relationship status (CONFIRMED, PROBABLE, UNVERIFIED, DOCUMENTED_SUPPLY, CAPABLE_SUPPLIER …). | string | — | `DOCUMENTED_SUPPLY` | Optional | `source_ids` when basis = source | — |
| `date` | Event / relationship date. | string / null | — | `2025-09-03` | Optional (1% populated) | `source_ids` when basis = source | ISO where parseable |

## sources

847 records.

| Field | Definition | Data type | Allowed values | Example | Required | Source requirement | Normalisation rule |
|---|---|---|---|---|---|---|---|
| `id` | Stable primary identifier (never a name). Prefix encodes the entity. | string | — | `SRC-000000` | Required | System-generated | Assigned by build; never reused |
| `legacy_id` | Batch-1 identifier (C0001, P00001, S0001, CU001). Old deep links resolve to the 2.0 record. | string | — | `S0000` | Optional | System-generated | — |
| `entity_type` | Entity kind. | string | source | `source` | Required | System-generated | — |
| `title` | Source title. | string | — | `User brief: Global Semiconductor Equipment Company Database (45 parts)` | Always present | Record `source_ids` (Tier-4 alone never confirms) | — |
| `publisher` | Publisher. | string / null | — | `TEAL (user)` | Optional (99% populated) | Record `source_ids` (Tier-4 alone never confirms) | — |
| `source_type` | Source type (official website, product page, filing …). | string | — | `Internal (user-provided)` | Always present | Record `source_ids` (Tier-4 alone never confirms) | — |
| `source_url` | URL of the source. | null / string | — | `https://www.semi.org/en/SEMI-Reports-Global-Semiconductor-Equipment…` | Optional | Record `source_ids` (Tier-4 alone never confirms) | Must parse |
| `internal` | True for internal (non-URL) sources such as the brief. | boolean | — | `true` | Always present | Record `source_ids` (Tier-4 alone never confirms) | — |
| `tier` | Batch-1 source tier (1 official … 4 blog/market list; BRIEF/INT internal). | string / number | — | `BRIEF` | Required | Record `source_ids` (Tier-4 alone never confirms) | — |
| `tier_label` | Human-readable tier definition. | string | Internal brief, Internal note, Tier 2 · Industry publication / association, Tier 3 · Directory, distributor, aggregator, Tier 4 · Blog, wiki, market list (unverified), Tier 1 · Official (company, filing, government, datasheet) | `Internal brief` | Always present | Record `source_ids` (Tier-4 alone never confirms) | — |
| `publication_date` | Publication / evidence date. | string / null | — | `2026-09-29` | Optional | Record `source_ids` (Tier-4 alone never confirms) | ISO 8601: YYYY, YYYY-MM or YYYY-MM-DD |
| `evidence_date` | Date the evidence refers to. | string / null | — | `2026-09-29` | Optional (30% populated) | Record `source_ids` (Tier-4 alone never confirms) | ISO |
| `accessed_date` | Date the source was accessed. | string | 2026-09-29, 2026-09-30 | `2026-09-29` | Always present | Record `source_ids` (Tier-4 alone never confirms) | ISO date |
| `accessible` | False when access was blocked at capture (never bypassed). | boolean | — | `true` | Required | Record `source_ids` (Tier-4 alone never confirms) | — |
| `access_mode` | — | string | read, not_accessible, search_index | `read` | Always present | Record `source_ids` (Tier-4 alone never confirms) | — |
| `access_note` | Why a source could not be read (never bypassed). | null / string | — | `Access blocked or not accessible at capture; not bypassed` | Optional (60% populated) | Record `source_ids` (Tier-4 alone never confirms) | — |
| `age_class` | Batch-1 source age class. | string | CURRENT, STALE, AGING, UNDATED, VERY_STALE | `CURRENT` | Always present | Record `source_ids` (Tier-4 alone never confirms) | — |
| `freshness` | Recent / Needs Review / Stale / Unknown from the freshest supporting source. | string | Recent, Stale, Needs Review, Unknown | `Recent` | Required | System-generated | — |
| `excerpt` | Short excerpt/paraphrase for traceability (document not republished). | string / null | — | `Build a comprehensive GLOBAL SEMICONDUCTOR EQUIPMENT COMPANY DATABASE.` | Optional (41% populated) | Record `source_ids` (Tier-4 alone never confirms) | — |
| `notes` | Analyst notes from capture. | string / null | — | `Defines taxonomy structure, fields, rules` | Optional (93% populated) | Record `source_ids` (Tier-4 alone never confirms) | — |
| `used_by` | Number of Batch-1 records citing the source. | number | — | `5` | Always present | Record `source_ids` (Tier-4 alone never confirms) | — |
| `verification_status` | Source capture status (captured / not_accessible / unverified_source). | string | captured, unverified_source, not_accessible, title_via_search_index | `captured` | Always present | Record `source_ids` (Tier-4 alone never confirms) | — |


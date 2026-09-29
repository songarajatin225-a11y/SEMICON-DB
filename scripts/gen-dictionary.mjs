#!/usr/bin/env node
// Generates DATA_DICTIONARY.md from the published data + the field definitions below, so the dictionary
// always matches the real schema. Run after `npm run build`: node scripts/gen-dictionary.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = f => JSON.parse(fs.readFileSync(path.join(ROOT, "data", f), "utf8"));
const NORM = {
  wafer: "Diameter parsed from source wording; inch → mm (2→50, 3→75, 4→100, 5→125, 6→150, 8→200, 12→300, 18→450); ranges kept as range_mm; source wording kept in source_value",
  "hq.country": "Mapped to the country reference (ISO 3166 alpha-2); aliases (USA, Korea, UK) resolved", dates: "ISO 8601: YYYY, YYYY-MM or YYYY-MM-DD",
};
const DEF = {
  id: ["Stable primary identifier (never a name). Prefix encodes the entity.", "Required", "Assigned by build; never reused"],
  legacy_id: ["Batch-1 identifier (C0001, P00001, S0001, CU001). Old deep links resolve to the 2.0 record.", "Optional", "—"],
  entity_type: ["Entity kind.", "Required", "—"], name: ["Display name as stated by the source.", "Required", "Trimmed; original capitalisation kept"],
  canonical_name: ["Name without parenthetical abbreviation, used for de-duplication.", "Required", "Parenthetical removed"],
  aliases: ["Other names: abbreviations and brands documented in Batch 1.", "Optional", "—"], former_names: ["Previous names (only when a source documents a rename).", "Optional", "—"],
  company_type: ["Batch-1 company type.", "Required", "—"], supplier_types: ["Normalised supplier roles (OEM vs subsystem/component/materials/service…).", "Required", "Mapped from company_type"],
  supply_chain_level: ["Batch-1 level: LV1 equipment OEM … LV4.", "Required", "—"], hq: ["Headquarters object: country, country_id, country_basis, city, region.", "Required", NORM["hq.country"]],
  "hq.country_basis": ["Whether the HQ country is source-stated or analyst knowledge (not source-traced).", "Required", "—"],
  ownership: ["Public / Private / Subsidiary / State-linked / JV.", "Optional", "null when not captured"], website: ["Official website URL.", "Optional", "Must parse as http(s) URL"],
  equipment_ids: ["Source-confirmed equipment categories (EQP ids).", "Optional", "Only confirmed categories; analyst candidates are kept in candidate_categories"],
  candidate_categories: ["Analyst-knowledge categories — unverified, never used for filtering or counts.", "Optional", "—"],
  market_class: ["GLOBAL_LEADER / TIER_2 / REGIONAL / EMERGING / UNCLASSIFIED, assigned only from a published ranking or revenue.", "Required", "—"],
  revenue: ["Reported revenue converted to USD m with fiscal year and original currency; or a derived range.", "Optional", "Fiscal years kept separate"],
  india: ["India presence summary and per-record facility/location/status with sources.", "Required", "—"],
  verification: ["VERIFIED / PARTIALLY_VERIFIED / UNVERIFIED (Batch-1 evidence rules).", "Required", "—"],
  confidence: ["Confidence level (HIGH/MEDIUM/LOW/UNVERIFIED) and score where recorded.", "Required", "—"],
  quality_state: ["VERIFIED / PARTIALLY_VERIFIED / UNVERIFIED / CONFLICTING / OUTDATED — one state per record.", "Required", "CONFLICTING > OUTDATED > verification"],
  freshness: ["Recent / Needs Review / Stale / Unknown from the freshest supporting source.", "Required", "—"],
  missing_key_fields: ["Key fields not captured for this record.", "Required", "—"], dates: ["first_added, last_updated, last_verified, latest_source_date, review_due.", "Required", NORM.dates],
  source_ids: ["Numbered sources supporting the record (SRC ids).", "Required for facts", "—"],
  company_id: ["Manufacturer / owner company (CMP id).", "Required", "Must resolve"], family_id: ["Product family (PRD id).", "Required", "Must belong to the same company"],
  model_number: ["Model number exactly as published; null for family-level records.", "Optional", "Verbatim"], model_identified: ["True when a model number is published.", "Required", "—"],
  equipment_id: ["Equipment category (EQP id).", "Optional", "Must resolve"], segment: ["Front-End / Back-End / Test / Advanced Packaging / Wafer Manufacturing / Display / Automation & Facilities / Component.", "Required", "Derived from equipment code"],
  process_ids: ["Processes (PRS ids).", "Optional", "Derived: equipment category → process reference"], technology_ids: ["Technologies (TEC ids).", "Optional", "Derived from category and source-stated laser types"],
  material_ids: ["Materials (MAT ids).", "Optional", "Derived: text match on source-stated material/wafer/application"], application_ids: ["Applications (APP ids).", "Optional", "Derived: text match on source-stated application"],
  wafer: ["Wafer/substrate diameter: source_value, sizes_mm, range_mm.", "Optional", NORM.wafer], specs: ["Stated specifications: parameter, value, unit, source_value, source_ids, verification, claim_type.", "Optional", "Numbers parsed; wording kept"],
  laser: ["Laser parameters as published (type, source, wavelength, power, pulse, rep rate, scan speed, material).", "Optional", "Verbatim"],
  lifecycle: ["status (Announced/Development/Commercial/Active/Limited/Legacy/Discontinued/Unknown), maturity, evidence, launch_year, eol_date, replacement_id.", "Required", "Mapped from Batch-1 status"],
  type: ["Relationship type (manufactures, supplies, capable_of_supplying, supplies_equipment_to, used_in, uses_technology, supports_material, contains, located_in, subsidiary_of, …).", "Required", "—"],
  from: ["Relationship start node id.", "Required", "Must resolve"], to: ["Relationship end node id.", "Required", "Must resolve"],
  basis: ["source | derived | reference | analyst — how the relationship is known.", "Required", "—"], status: ["Relationship status (CONFIRMED, PROBABLE, UNVERIFIED, DOCUMENTED_SUPPLY, CAPABLE_SUPPLIER …).", "Optional", "—"],
  tier: ["Batch-1 source tier (1 official … 4 blog/market list; BRIEF/INT internal).", "Required", "—"], publication_date: ["Publication / evidence date.", "Optional", NORM.dates],
  source_url: ["URL of the source.", "Optional", "Must parse"], accessible: ["False when access was blocked at capture (never bypassed).", "Required", "—"],
};
const SYSTEM = new Set(["id", "legacy_id", "entity_type", "dates", "quality_state", "freshness", "missing_key_fields", "canonical_name", "slug", "sequence", "model_identified", "is_component", "segment", "supplier_types", "counts"]);
const DERIVED = /(_ids|_ids_incl_children)$|^(technology_basis|application_ids|material_ids|process_ids|technology_ids|typical_subsystem_ids|company_ids|model_ids|stage_name|group_name|family_name|manufacturer|confirmed_links)$/;
const EDITORIAL = new Set(["description", "purpose", "inputs", "outputs", "typical_parameters", "quality_metrics", "defects", "architecture", "functions", "critical_parameters", "failure_modes", "interfaces", "integration_requirements", "cost_drivers", "content_basis", "aliases_reference"]);
function sourceReq(kind, k) {
  if (SYSTEM.has(k)) return "System-generated";
  if (DERIVED.test(k)) return "Derived — inherits the sources of the linked records";
  if (EDITORIAL.has(k) && ["processes", "technologies", "materials", "subsystems", "components", "applications"].includes(kind)) return "Editorial reference — labelled, no company claim";
  if (["processes", "technologies", "materials", "subsystems", "components", "applications", "equipment", "countries"].includes(kind)) return "Reference / derived";
  if (kind === "relationships") return "`source_ids` when basis = source";
  return "Record `source_ids` (Tier-4 alone never confirms)";
}
const FALLBACK = k => /_text$/.test(k) ? "Value exactly as stated by the source (verbatim)." : /_ids$/.test(k) ? "Linked record ids." : /_name$/.test(k) ? "Denormalised name for display." : /^legacy_/.test(k) ? "Batch-1 value kept for traceability." : "";
Object.assign(DEF, {
  manufacturer: ["Manufacturer name (denormalised from company_id).", "", "—"], equipment_code: ["Batch-1 taxonomy / BOM code of the record.", "", "—"], equipment_label: ["Equipment category label as captured.", "", "—"],
  category_group: ["Taxonomy group letter (A–L) or COMPONENT.", "", "—"], market_segment: ["Batch-1 market segment label.", "", "—"], is_component: ["True for component products (laser sources, galvos, stages, RF generators…).", "", "—"],
  component_class_id: ["Component class (CMPN id) for component products.", "", "Mapped from Batch-1 BOM code"], thickness: ["Thickness / format as stated.", "", "Verbatim"], throughput: ["Throughput as stated (UPH, mm/s …).", "", "Verbatim; units kept"],
  accuracy: ["Accuracy / repeatability as stated.", "", "Verbatim; units kept"], footprint: ["Footprint / dimensions as stated.", "", "Verbatim"], motion: ["Motion system description as stated.", "", "Verbatim"],
  price_public: ["Publicly reported price; labelled with tier/estimate flags as captured.", "", "Verbatim"], teal_portfolio: ["TEAL portfolio area the record maps to (Batch-1 analysis).", "", "—"], notes: ["Analyst notes from capture.", "", "—"],
  source_age: ["Batch-1 age class of the newest source (CURRENT, AGING, STALE, VERY_STALE, UNDATED, LIVE_PAGE_UNDATED).", "", "—"], evidence_depth: ["How deeply the source was read (CONTENT, TITLE, TIER4, INTERNAL).", "", "—"],
  rationale: ["Why the record was included / caveats.", "", "—"], financials: ["Financial facts per fiscal year with currency, USD conversion and source.", "", "Fiscal years never mixed"], startup: ["Startup profile (funding, investors, TRL) where captured.", "", "—"],
  presence: ["Presence signals in China/Japan/Korea/Taiwan from Batch-1 fields.", "", "—"], primary_equipment: ["Equipment the source confirms the company offers.", "", "Verbatim"], description: ["Business focus / definition.", "", "—"],
  sites: ["Named sites with basis and sources.", "", "Verbatim site names"], facility_type: ["Customer / facility type (Foundry, IDM, Memory, OSAT, ATMP …).", "", "—"], also_listed_as: ["Same organisation listed in the other of fabs/OSATs.", "", "—"],
  event_type: ["Deal type as captured (Merger, Acquisition, MoU, Funding …).", "", "—"], claim_type: ["Reported event vs unverified report / rumour.", "", "—"], detail: ["Relationship detail (customer, product, stage, site, evidence …).", "", "Verbatim"],
  title: ["Source title.", "", "—"], publisher: ["Publisher.", "", "—"], source_type: ["Source type (official website, product page, filing …).", "", "—"], excerpt: ["Short excerpt/paraphrase for traceability (document not republished).", "", "—"],
  used_by: ["Number of Batch-1 records citing the source.", "", "—"], freshness_note: ["", "", ""], level: ["Taxonomy level (1 group, 2 category, 3 sub-category).", "", "—"], code: ["Taxonomy code.", "", "Stable"],
  laser_relevant: ["Laser-relevant category (Batch-1 flag).", "", "—"], origin: ["Batch-1 taxonomy or 2.0 extension.", "", "—"], stage: ["Process stage code.", "", "—"], flow_position: ["Position in the main process-flow diagram.", "", "—"],
  family: ["Technology family.", "", "—"],
  access_note: ["Why a source could not be read (never bypassed).", "", "—"], accessed_date: ["Date the source was accessed.", "", "ISO date"], age_class: ["Batch-1 source age class.", "", "—"],
  architecture: ["Generic subsystem architecture (editorial).", "", "—"], batch1_search_status: ["How thoroughly Batch 1 searched the country.", "", "—"], capability_links: ["Supplier-register rows documenting capability.", "", "—"],
  capacity: ["Facility capacity (not captured unless stated in a site).", "", "—"], category: ["Component category (Motion, Optical, Vacuum …).", "", "—"], centroid_note: ["Label: centroid is approximate.", "", "—"],
  confirmed_links: ["Number of CONFIRMED equipment-supplier links.", "", "—"], content_basis: ["Label stating which content is editorial vs source-backed.", "", "—"], cost_drivers: ["Generic cost drivers (no figures).", "", "—"],
  country_id: ["Country reference id (CTY).", "", "Must resolve"], country: ["Country name.", "", "Country reference"], critical_parameters: ["Critical parameters (names only).", "", "—"], date: ["Event / relationship date.", "", "ISO where parseable"],
  defects: ["Typical defects of the process (editorial).", "", "—"], documented_links: ["Supplier-register rows documenting actual supply/distribution.", "", "—"], documented_supply_links: ["Batch-1 supplier-register ids with documented supply.", "", "—"],
  evidence_date: ["Date the evidence refers to.", "", "ISO"], export_dependencies: ["Not assessed in Batch 1.", "", "—"], failure_modes: ["Typical failure modes (editorial).", "", "—"], field_note: ["Explains which facility fields are not captured.", "", "—"],
  functions: ["Subsystem functions (editorial).", "", "—"], gap_note: ["Evidence note for a supplier gap.", "", "—"], gap: ["True when Batch 1 records no supplier for the class.", "", "—"], grade_purity: ["Material grade/purity (not captured).", "", "—"],
  group: ["Application group.", "", "—"], inputs: ["Process/subsystem inputs (editorial).", "", "—"], integration_requirements: ["Integration requirements (editorial).", "", "—"], interface: ["Component interface (not captured at class level).", "", "—"],
  interfaces: ["Subsystem interfaces (editorial).", "", "—"], internal: ["True for internal (non-URL) sources such as the brief.", "", "—"], investment: ["Facility investment (not captured unless stated).", "", "—"],
  link_basis: ["How model links to this record were derived.", "", "—"], listed_in_brief: ["Country listed in the original brief.", "", "—"], localization_notes: ["Batch-1 localisation rows relevant to the subsystem.", "", "—"],
  note: ["Free-text note from capture.", "", "—"], obsolescence_status: ["Component obsolescence (not captured at class level).", "", "—"], operating_range: ["Operating range (not captured at class level).", "", "—"],
  outputs: ["Process/subsystem outputs (editorial).", "", "—"], party_a_id: ["Resolved id of party A.", "", "—"], party_a: ["Party A as captured.", "", "Verbatim"], party_b_id: ["Resolved id of party B.", "", "—"], party_b: ["Party B as captured.", "", "Verbatim"],
  process_node: ["Facility process node (not captured unless stated).", "", "—"], purpose: ["Why the process step exists (editorial).", "", "—"], quality_metrics: ["Process quality metrics (editorial).", "", "—"], region: ["World region.", "", "—"],
  safety_class: ["Material safety class (not captured).", "", "—"], sequence: ["Order in the process library.", "", "—"], specification: ["Component specification (not captured at class level).", "", "—"], strengths_note: ["Explains that strengths are not assessed.", "", "—"],
  subsystem_id: ["Parent subsystem (SUB id).", "", "Must resolve"], supplier_company_ids_class_level: ["Materials/gas suppliers known at class level only.", "", "—"], technology_strengths: ["Not assessed in Batch 1.", "", "—"],
  technology: ["Technology field as captured.", "", "Verbatim"], tier_label: ["Human-readable tier definition.", "", "—"], typical_parameters: ["Parameter names that characterise the process (no values).", "", "—"],
  value_disclosed: ["Deal value as disclosed (with tier flags).", "", "Verbatim"], verification_status: ["Source capture status (captured / not_accessible / unverified_source).", "", "—"],
  verified_company_count: ["Companies in the country with VERIFIED status.", "", "—"], via: ["How a derived relationship was computed.", "", "—"], wafer_size: ["Facility wafer size (not captured unless stated).", "", "—"],
  is_startup: ["Startup flag (Batch-1 startup register or company type).", "", "—"], exchange: ["Stock exchange of listing.", "", "—"], ticker: ["Ticker symbol.", "", "—"],
  founded: ["Founding year as stated.", "", "Verbatim"], employees: ["Employee count as stated, with date.", "", "Verbatim"], ceo: ["Chief executive (not captured in Batch 1).", "", "—"],
  parent_company: ["Parent company where documented.", "", "—"], subsidiaries_brands: ["Brands / subsidiaries where documented.", "", "—"], candidate_basis: ["Label explaining candidate categories are unverified.", "", "—"],
  market_class_basis: ["Evidence behind market_class (ranking source or revenue).", "", "—"], semiconductor_revenue: ["Semiconductor revenue as stated.", "", "Verbatim"],
  technology_basis: ["Technology links split by basis: from_category (derived) and from_laser_codes (source-stated).", "", "—"], parent_id: ["Parent record in the hierarchy.", "", "Must resolve"],
  group_code: ["Equipment group letter.", "", "—"], subsystem_basis: ["Label: typical subsystems are a generic reference.", "", "—"], company_ids_incl_children: ["Companies confirmed on this node or any sub-category.", "", "—"],
  model_ids_incl_children: ["Models on this node or any sub-category.", "", "—"], see_also: ["Related nodes (2.0 extension ↔ Batch-1 nodes carrying records).", "", "—"], slug: ["Stable machine name of a reference record.", "", "kebab-case"], material_class: ["Material class.", "", "—"], iso2: ["ISO 3166-1 alpha-2 code.", "", "Upper case"], lat: ["Approximate centroid latitude (map clustering only).", "", "—"], lon: ["Approximate centroid longitude (map clustering only).", "", "—"],
});
function typeOf(v) { if (v === null) return "null"; if (Array.isArray(v)) return "array"; return typeof v; }
function describe(kind, list) {
  const fields = new Map();
  list.slice(0, 5000).forEach(r => Object.entries(r).forEach(([k, v]) => { const f = fields.get(k) || { types: new Set(), n: 0, vals: new Map(), ex: undefined }; f.types.add(typeOf(v)); if (v !== null && v !== "" && !(Array.isArray(v) && !v.length)) { f.n++; if (f.ex === undefined) f.ex = v; }
    if (typeof v === "string" && f.vals.size < 30) f.vals.set(v, (f.vals.get(v) || 0) + 1); fields.set(k, f); }));
  const rows = [...fields.entries()].map(([k, f]) => {
    const d = DEF[k] || [FALLBACK(k), "", ""];
    const enumVals = [...f.vals.keys()];
    const allowed = f.vals.size && f.vals.size <= 12 && list.length > 12 && [...f.vals.values()].reduce((a, b) => a + b, 0) >= list.length * 0.9 ? enumVals.join(", ") : "";
    let ex = f.ex === undefined ? "" : typeof f.ex === "object" ? JSON.stringify(f.ex) : String(f.ex);
    if (ex.length > 70) ex = ex.slice(0, 67) + "…";
    const req = d[1] || (f.n === list.length ? "Always present" : `Optional (${Math.round(100 * f.n / list.length)}% populated)`);
    return `| \`${k}\` | ${d[0] || "—"} | ${[...f.types].join(" / ")} | ${allowed.replace(/\|/g, "\\|") || "—"} | \`${ex.replace(/\|/g, "\\|").replace(/`/g, "'")}\` | ${req} | ${sourceReq(kind, k)} | ${(d[2] || "—").replace(/\|/g, "\\|")} |`;
  });
  return `## ${kind}\n\n${list.length.toLocaleString()} records.\n\n| Field | Definition | Data type | Allowed values | Example | Required | Source requirement | Normalisation rule |\n|---|---|---|---|---|---|---|---|\n${rows.join("\n")}\n`;
}
const kinds = ["companies", "product_families", "models", "equipment", "processes", "technologies", "materials", "applications", "subsystems", "components", "suppliers", "fabs", "osats", "customers", "countries", "deals", "relationships", "sources"];
const meta = read("meta.json");
let md = `# SEMICON-DB data dictionary\n\nGenerated from the published data (schema ${meta.schema_version}, evidence as of ${meta.evidence_as_of}) by \`scripts/gen-dictionary.mjs\`. Do not edit by hand — re-run after \`npm run build\`.\n\n`
  + `**Source requirement (all entities):** every factual field must be traceable to a numbered source via \`source_ids\` on the record or on the relationship. Reference entities (processes, technologies, materials, subsystems, component classes) carry editorial definitions and are labelled as such; they make no company-specific claims.\n\n`
  + `**Missing values:** \`null\` (or empty array) means *not captured in the evidence*; the UI shows “Not found in Batch-1 sources”, “Not published” or “Not publicly disclosed” (\`NOT_DISCLOSED\`). Values are never estimated.\n\n`
  + `**ID prefixes:** ${Object.entries(meta.id_prefixes).map(([k, v]) => `\`${v}\` ${k}`).join(" · ")}\n\n`;
kinds.forEach(k => { md += describe(k, read(k + ".json")) + "\n"; });
fs.writeFileSync(path.join(ROOT, "DATA_DICTIONARY.md"), md);
console.log("DATA_DICTIONARY.md written", (md.length / 1024).toFixed(0) + " KB");

#!/usr/bin/env node
// SEMICON-DB 2.0 data build.
// RAW (data/legacy/legacy_snapshot.json + scripts/reference/*) → VALIDATE → NORMALIZE → DEDUPLICATE
// → LINK ENTITIES → ATTACH SOURCES → QUALITY CHECK → PUBLISH (data/*.json + data/bundle.json).
// The legacy snapshot is never modified. No value is invented: missing legacy values ("N/A") become null.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { STAGES, PROCESSES } from "./reference/processes.mjs";
import { TECHNOLOGIES } from "./reference/technologies.mjs";
import { MATERIALS, APPLICATIONS, segmentOf, SEGMENTS, TAXONOMY_GROUPS_EXT, TAXONOMY_EXT, TAXONOMY_SEE_ALSO } from "./reference/ontology.mjs";
import { SUBSYSTEMS, COMPONENTS } from "./reference/subsystems.mjs";
import { COUNTRIES } from "./reference/geo.mjs";
import { SYNONYMS } from "./reference/synonyms.mjs";
import { validateAll } from "./lib/validate.mjs";
import { normWafer, normName, similarity } from "./lib/normalize.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "data");
const AS_OF = "2026-09-29";          // Batch-1 evidence date (legacy edition)
const BUILD_DATE = AS_OF;             // 2.0 migration performed against the same evidence snapshot
const SCHEMA_VERSION = "2.0.0";
const L = JSON.parse(fs.readFileSync(path.join(OUT, "legacy/legacy_snapshot.json"), "utf8"));
// Later batches staged by scripts/import.mjs (data/batches/*.json, Batch-1 row format) flow through the same pipeline.
const BATCH_DIR = path.join(OUT, "batches");
const BATCHES = fs.existsSync(BATCH_DIR) ? fs.readdirSync(BATCH_DIR).filter(f => f.endsWith(".json")).sort().map(f => JSON.parse(fs.readFileSync(path.join(BATCH_DIR, f), "utf8"))) : [];
BATCHES.forEach(b => { L.co.push(...(b.co || [])); L.pr.push(...(b.pr || [])); L.src.push(...(b.src || [])); });
const BATCH_OF_SOURCE = new Map(BATCHES.flatMap(b => (b.src || []).map(x => [x.id, b.created])));

// ---------------------------------------------------------------- helpers
const NA = v => v == null || v === "" || v === "N/A" || v === "-" || v === "Not documented";
const nv = v => (NA(v) ? null : /^NOT.DISCLOSED$/i.test(String(v)) ? "NOT_DISCLOSED" : v);
const pad = (n, w = 6) => String(n).padStart(w, "0");
const num = s => parseInt(String(s).replace(/\D/g, ""), 10);
const split = s => (NA(s) ? [] : String(s).split(";").map(x => x.trim()).filter(Boolean));
const uniq = a => [...new Set(a.filter(x => x != null && x !== ""))];
const slugToId = (prefix, list) => Object.fromEntries(list.map((x, i) => [x.slug, `${prefix}-${pad(i + 1, 3)}`]));

const cmpId = legacy => (legacy && /^C\d+$/.test(legacy) ? `CMP-${pad(num(legacy))}` : null);
const mdlId = legacy => `MDL-${pad(num(legacy))}`;
const srcId = legacy => (/^S\d+$/.test(legacy) ? `SRC-${pad(num(legacy))}` : `SRC-${legacy.replace(/^S/, "")}`);
const srcIds = s => split(s).filter(x => /^S/.test(x)).map(srcId);
const eqpId = code => `EQP-${code}`;

// ---------------------------------------------------------------- sources
const TIER_LABEL = { 1: "Tier 1 · Official (company, filing, government, datasheet)", 2: "Tier 2 · Industry publication / association", 3: "Tier 3 · Directory, distributor, aggregator", 4: "Tier 4 · Blog, wiki, market list (unverified)", BRIEF: "Internal brief", INT: "Internal note" };
const FRESH = { CURRENT: "Recent", LIVE_PAGE_UNDATED: "Recent", AGING: "Needs Review", STALE: "Stale", VERY_STALE: "Stale", UNDATED: "Unknown" };
const normDate = d => (/^\d{4}(-\d\d){0,2}$/.test(String(d)) ? String(d) : null);
const sources = L.src.map(s => ({
  id: srcId(s.id), legacy_id: s.id, entity_type: "source",
  title: s.title, publisher: nv(s.pub), source_type: s.type,
  source_url: /^https?:/.test(s.url) ? s.url : null, internal: !/^https?:/.test(s.url),
  tier: s.tier, tier_label: TIER_LABEL[s.tier] || String(s.tier),
  publication_date: normDate(s.date), evidence_date: normDate(s.date), accessed_date: BATCH_OF_SOURCE.get(s.id) || AS_OF,
  accessible: s.acc === "Y", access_mode: s.acc === "Y" ? "read" : s.acc === "SEARCH_INDEX" ? "search_index" : "not_accessible",
  access_note: s.acc === "Y" ? null : s.acc === "SEARCH_INDEX" ? "Official URL and title confirmed via web search; page content not read directly (capture-environment egress restriction)" : "Access blocked or not accessible at capture; not bypassed",
  age_class: s.age, freshness: FRESH[s.age] || "Unknown",
  excerpt: nv(s.exc), notes: nv(s.note), used_by: s.used,
  verification_status: s.acc === "SEARCH_INDEX" ? "title_via_search_index" : s.acc !== "Y" ? "not_accessible" : (s.tier === 4 ? "unverified_source" : "captured"),
}));
const SRC = Object.fromEntries(sources.map(s => [s.id, s]));
const FRESH_RANK = { Recent: 0, "Needs Review": 1, Stale: 2, Unknown: 3 };
function freshnessOf(ids) {
  const f = ids.map(id => SRC[id]?.freshness).filter(Boolean);
  if (!f.length) return "Unknown";
  return f.sort((a, b) => FRESH_RANK[a] - FRESH_RANK[b])[0]; // freshest supporting source
}
function latestDate(ids) { return ids.map(id => SRC[id]?.publication_date).filter(Boolean).sort().pop() || null; }
function addMonths(d, m) { const [y, mo, da] = d.split("-").map(Number); const t = new Date(Date.UTC(y, mo - 1 + m, da)); return t.toISOString().slice(0, 10); }
function dates(ver, ids) {
  return { first_added: AS_OF, last_updated: BUILD_DATE, last_verified: ver === "UNVERIFIED" ? null : AS_OF,
    latest_source_date: latestDate(ids), review_due: addMonths(AS_OF, ver === "VERIFIED" ? 12 : 6) };
}
function qualityState(ver, fresh, conflict) {
  if (conflict) return "CONFLICTING";
  if (fresh === "Stale") return "OUTDATED";
  return ver === "VERIFIED" ? "VERIFIED" : ver === "PARTIALLY_VERIFIED" ? "PARTIALLY_VERIFIED" : "UNVERIFIED";
}

// ---------------------------------------------------------------- conflicts (explicitly recorded in Batch 1; never auto-resolved)
const CONFLICTS = [
  { id: "CNF-0001", entity: mdlId("P00099"), also: [cmpId("C0107")], field: "Deployment status (SMEE SSA/800)",
    claims: [{ source_id: srcId("S0187"), value: "Never deployed" }, { source_id: srcId("S0189"), value: "Reported as scaled / in use (Tier 4)" }], status: "OPEN", note: "Recorded as NOT_DEPLOYED / Development in Batch 1 pending an official source." },
  { id: "CNF-0002", entity: cmpId("C0112"), also: [cmpId("C0109")], field: "Corporate relationship (Skyverse ↔ SiCarrier)",
    claims: [{ source_id: srcId("S0188"), value: "Skyverse described as a SiCarrier materials subsidiary" }, { source_id: null, value: "Other reporting differs (not captured as a numbered source)" }], status: "OPEN", note: "Legacy relationship RL032 classified UNKNOWN." },
  { id: "CNF-0003", entity: cmpId("C0135"), field: "Official website domain", claims: [{ source_id: null, value: "Two domains observed during capture" }], status: "OPEN", note: "Legacy note: CONFLICT_REVIEW." },
  { id: "CNF-0004", entity: mdlId("P00073"), field: "Stated process speed (Plasma-Therm Singulator)", claims: [{ source_id: srcId("S0231"), value: "up to 3,000 mm/s (recorded verbatim, flagged)" }], status: "REVIEW", note: "Figure recorded verbatim from the source; flagged for technical review, not corrected." },
];
L.fin.filter(f => f.vt === "UNIT_CONFLICT").forEach((f, i) => CONFLICTS.push({
  id: `CNF-${pad(5 + i, 4)}`, entity: cmpId(f.co), field: `Financial unit (${f.m}, ${f.fy})`,
  claims: srcIds(f.src).map(sid => ({ source_id: sid, value: `${f.ccy} ${f.v}` })), status: "OPEN", note: nv(f.note) || "Unit or scale conflict flagged in Batch 1 financial table." }));
const CONFLICTED = new Set(CONFLICTS.flatMap(c => [c.entity, ...(c.also || [])]));

// ---------------------------------------------------------------- taxonomy → equipment
const groups = [...L.cats, ...TAXONOMY_GROUPS_EXT];
const GROUP_NAME = Object.fromEntries(groups);
const taxRows = [
  ...L.tax.map(t => ({ code: t.id, parent: NA(t.par) ? null : t.par, level: t.lvl, group: t.cat, name: t.n, ps: NA(t.ps) ? null : t.ps, laser: t.las === "Y", ext: false })),
  ...TAXONOMY_GROUPS_EXT.map(([k, n]) => ({ code: k, parent: null, level: 1, group: k, name: n, ps: null, laser: false, ext: true })),
  ...TAXONOMY_EXT.map(([code, g, n]) => ({ code, parent: g, level: 2, group: g, name: n, ps: g === "K" ? "PS01" : "PSX4", laser: code === "K04", ext: true })),
];
const CODES = taxRows.map(t => t.code);
const underCode = (code, pat) => code === pat || code.startsWith(pat + ".") || (pat.length === 1 && code[0] === pat) || (pat.length === 3 && code.startsWith(pat));

// ---------------------------------------------------------------- reference ids
const PRS = slugToId("PRS", PROCESSES), TEC = slugToId("TEC", TECHNOLOGIES), MAT = slugToId("MAT", MATERIALS), APP = slugToId("APP", APPLICATIONS);
const SUB = slugToId("SUB", SUBSYSTEMS), CPN = Object.fromEntries(COMPONENTS.map((c, i) => [c.slug, `CMPN-${pad(i + 1)}`]));
const TEC_BY_LEGACY = Object.fromEntries(TECHNOLOGIES.filter(t => t.legacy).map(t => [t.legacy, TEC[t.slug]]));
const CPN_BY_BOM = {}; COMPONENTS.forEach(c => c.bom.forEach(b => (CPN_BY_BOM[b] = CPN[c.slug])));

// ---------------------------------------------------------------- companies
const SUPPLIER_TYPE = {
  "Equipment OEM": ["Equipment OEM"], "Laser equipment OEM": ["Equipment OEM", "Laser Supplier"], "Test & probe": ["Equipment OEM"],
  "Laser source": ["Laser Supplier", "Component Supplier"], "Vacuum/abatement": ["Vacuum Supplier", "Subsystem Supplier"], "Critical component (optics)": ["Optics Supplier", "Component Supplier"],
  "Automation/AMHS": ["Automation Supplier", "Robotics Supplier"], "Facility/integration": ["Integrator", "Service Provider"], "Subsystem supplier": ["Subsystem Supplier"],
  "Distributor/service": ["Distributor", "Service Provider"], "Optics/galvo": ["Optics Supplier", "Component Supplier"], Vision: ["Component Supplier"], "Thermal/fume": ["Component Supplier"],
  Motion: ["Motion Supplier", "Component Supplier"], "RF power": ["RF Supplier", "Subsystem Supplier"], "Gas/chemical delivery": ["Gas Supplier", "Subsystem Supplier"],
  Startup: ["Equipment OEM"], "Engineering services": ["Service Provider"], "Materials/gases": ["Materials Supplier", "Gas Supplier"],
};
const COUNTRY_BASIS = { SRC: "Source-stated", KNOW: "Analyst knowledge — not source-traced", LIST: "From a directory / list source", NAME: "Inferred from the company name" };
const GEO = Object.fromEntries(COUNTRIES.map(([n, iso, region, lat, lon]) => [n, { name: n, iso, region, lat, lon }]));
const ctryId = name => (GEO[name] ? `CTY-${GEO[name].iso}` : null);
const startup = Object.fromEntries(L.st.map(s => [s.company_id, s]));
const relByCo = {};
L.rel.forEach(r => { [r.company_a_id, r.company_b_id].forEach(id => { if (/^C\d/.test(id)) (relByCo[id] ||= []).push(r); }); });
const indiaByCo = {}; L.india.forEach(r => (indiaByCo[r.cid] ||= []).push(r));

function aliasesFor(c) {
  const out = [], former = [];
  const m = /^(.*?)\s*\((.+)\)$/.exec(c.n);
  if (m && !/unit|lab|group|laser equipment/i.test(m[2])) out.push(m[2].replace(/^as named in .*$/i, "").trim());
  (relByCo[c.id] || []).forEach(r => {
    if (r.classification === "BRAND" && r.company_a_id === c.id && NA(r.company_b_id)) out.push(r.company_b);
  });
  return { aliases: uniq(out), former_names: former };
}
const presence = v => (NA(v) ? null : v);
const companies = L.co.map(c => {
  const id = cmpId(c.id);
  const src = srcIds(c.src);
  const cats = split(c.cats);
  const eqCodes = cats.filter(x => !/^BOM|^OPTICS|^LIGHT|^SUB-/.test(x));
  const fresh = freshnessOf(src);
  const { aliases, former_names } = aliasesFor(c);
  const parentRel = (relByCo[c.id] || []).find(r => r.classification === "SUBSIDIARY" && r.company_b_id === c.id);
  const ind = indiaByCo[c.id] || [];
  const s = startup[c.id];
  const missing = [];
  if (c.cb !== "SRC") missing.push("Headquarters country (source)");
  if (NA(c.city)) missing.push("City"); if (NA(c.web)) missing.push("Website"); if (NA(c.fd)) missing.push("Founded year");
  if (NA(c.emp)) missing.push("Employees"); if (!eqCodes.length) missing.push("Confirmed equipment category"); if (!src.length) missing.push("Sources");
  return {
    id, legacy_id: c.id, entity_type: "company",
    name: c.n, canonical_name: c.n.replace(/\s*\(.*\)$/, ""), aliases, former_names,
    company_type: c.t, supplier_types: SUPPLIER_TYPE[c.t] || ["Unclassified"], supply_chain_level: c.lv, is_startup: !!s || c.t === "Startup",
    hq: { country: nv(c.c), country_id: ctryId(c.c), country_basis: COUNTRY_BASIS[c.cb] || c.cb, country_basis_code: c.cb, city: nv(c.city), region: GEO[c.c]?.region || null },
    ownership: nv(c.own), exchange: nv(c.ex), ticker: nv(c.tk), website: nv(c.web),
    founded: nv(c.fd), employees: nv(c.emp), ceo: nv(c.ceo),
    parent_company: nv(c.par) || (parentRel ? parentRel.company_a : null),
    subsidiaries_brands: nv(c.subs),
    description: nv(c.f), primary_equipment: nv(c.eq),
    equipment_ids: uniq(eqCodes.filter(x => CODES.includes(x)).map(eqpId)),
    component_class_ids: uniq(cats.map(x => CPN_BY_BOM[x]).filter(Boolean)),
    candidate_categories: nv(c.cand), candidate_basis: NA(c.cand) ? null : "Analyst knowledge — unverified; not used for filtering",
    market_class: c.cc, market_class_basis: nv(c.ccb),
    revenue: typeof c.rev === "number" ? { usd_m: c.rev, fiscal_year: c.rfy, reported: nv(c.rorig), basis: "Reported (converted to USD)" }
      : NA(c.rev) ? null : { usd_m: null, range_usd_m: c.rev, fiscal_year: nv(c.rfy), reported: nv(c.rorig), basis: "Derived range" },
    semiconductor_revenue: nv(c.semi),
    india: { summary: nv(c.ind), has_presence: !NA(c.ind), records: ind.map(r => ({ type: r.typ, facility: nv(r.fac), location: nv(r.loc), scope: nv(r.scope), technology: nv(r.tech), opportunity: nv(r.opp), status: nv(r.st), confidence: r.cl, source_ids: srcIds(r.src) })) },
    presence: { china: presence(c.cn), japan: presence(c.jp), korea: presence(c.kr), taiwan: presence(c.tw) },
    startup: s ? { founders: nv(s.founders), year: nv(s.year), funding: nv(s.funding), investors: nv(s.investors), product: nv(s.product), trl: nv(s.trl), latest_news: nv(s.latest_news), maturity: nv(s.maturity), source_ids: srcIds(s.source_ids), verification: s.verification_status } : null,
    financials: L.fin.filter(f => f.co === c.id).map(f => ({ fiscal_year: f.fy, metric: f.m, currency: f.ccy, value: f.v, usd_m: typeof f.usd === "number" ? f.usd : null, value_type: f.vt, source_ids: srcIds(f.src), note: nv(f.note) })),
    verification: c.st, confidence: { score: c.cs, level: c.cl }, evidence_depth: c.evd,
    rationale: nv(c.why), notes: nv(c.note), source_ids: src,
    freshness: fresh, quality_state: qualityState(c.st, fresh, CONFLICTED.has(id)), missing_key_fields: missing, ...{ dates: dates(c.st, src) },
  };
});
const CO = Object.fromEntries(companies.map(c => [c.id, c]));

// ---------------------------------------------------------------- models & product families
const famKey = p => `${p.co}|${p.fam.trim().toLowerCase()}`;
const famOrder = uniq(L.pr.map(famKey));
const FAM = Object.fromEntries(famOrder.map((k, i) => [k, `PRD-${pad(i + 1)}`]));
const LIFECYCLE = { ACTIVE: "Active", LEGACY: "Legacy", DEVELOPMENT: "Development", NOT_DEPLOYED: "Announced", UNKNOWN: "Unknown" };
const textOf = p => [p.lmat, p.wafer, p.app, p.tech, p.fam, p.mdl].filter(x => !NA(x)).join(" | ");
const appText = p => [p.app, p.tech, p.fam, p.seg, p.mdl].filter(x => !NA(x)).join(" | ");
// 2.0 taxonomy remaps: Batch 1 had no crystal-growth node, so Czochralski pullers were filed under Epitaxy (A09.10).
// The product records are unchanged; only their category moves to the new K01 node. Recorded on each record.
const RECLASSIFY = { P00116: { to: "K01", reason: "Crystal puller: Batch 1 filed it under Epitaxy because no crystal-growth category existed" },
  P00117: { to: "K01", reason: "Crystal puller: Batch 1 filed it under Epitaxy because no crystal-growth category existed" } };
L.pr.forEach(p => { const r = RECLASSIFY[p.id]; if (r) { p._reclassified_from = p.eqid; p._reclass_reason = r.reason; p.eqid = r.to; p.eq = "Crystal growth furnaces / pullers"; } });
const models = L.pr.map(p => {
  const id = mdlId(p.id);
  const src = srcIds(p.src);
  const isComp = p.cat === "COMPONENT";
  const code = !isComp && CODES.includes(p.eqid) ? p.eqid : null;
  const procs = code ? PROCESSES.filter(pr => (pr.eq || []).some(pat => underCode(code, pat))).map(pr => PRS[pr.slug])
    : (!isComp && p.ps && !NA(p.ps) ? PROCESSES.filter(pr => (pr.legacy_ps || []).includes(p.ps)).slice(0, 1).map(pr => PRS[pr.slug]) : []);
  const techByCat = code ? TECHNOLOGIES.filter(t => (t.eq || []).some(pat => code === pat || code.startsWith(pat + "."))).map(t => TEC[t.slug]) : [];
  const techByLaser = split(p.ltc).map(k => TEC_BY_LEGACY[k]).filter(Boolean);
  const mats = MATERIALS.filter(m => m.match && m.match.test(textOf(p))).map(m => MAT[m.slug]);
  const apps = APPLICATIONS.filter(a => a.match.test(appText(p))).map(a => APP[a.slug]);
  if (p.seg === "Power Semiconductor" && !apps.includes(APP.power)) apps.push(APP.power);
  if (p.seg === "Display/MicroLED" && !apps.includes(APP.display)) apps.push(APP.display);
  if (p.seg === "Advanced Packaging" && !apps.includes(APP["advanced-packaging"])) apps.push(APP["advanced-packaging"]);
  const fresh = FRESH[p.age] || freshnessOf(src);
  const wafer = normWafer(p.wafer);
  const specs = (p.specs || []).map(([param, value, unit]) => ({
    parameter: param, value: /^-?\d+(\.\d+)?$/.test(String(value)) ? Number(value) : value, unit: NA(unit) ? null : unit,
    source_value: `${value}${NA(unit) ? "" : " " + unit}`, source_ids: src, source_scope: "record-level (Batch 1 did not attach sources per parameter)",
    verification: p.ver, claim_type: "Manufacturer claim" }));
  const missing = [];
  if (NA(p.mdl)) missing.push("Model number"); if (!wafer) missing.push("Wafer / substrate size"); if (NA(p.thr)) missing.push("Throughput");
  if (NA(p.acc)) missing.push("Accuracy"); if (!src.length) missing.push("Sources");
  return {
    id, legacy_id: p.id, entity_type: "model",
    company_id: cmpId(p.co), manufacturer: p.cn, family_id: FAM[famKey(p)], family_name: p.fam,
    model_number: nv(p.mdl), model_identified: !NA(p.mdl),
    name: p.fam + (NA(p.mdl) ? "" : ` · ${p.mdl}`),
    equipment_id: code ? eqpId(code) : null, equipment_code: p.eqid, equipment_label: p.eq,
    category_group: p.cat, segment: isComp ? "Component" : code ? segmentOf(code) : "Other", market_segment: p.seg,
    is_component: isComp, component_class_id: isComp ? CPN_BY_BOM[p.eqid] || null : null,
    legacy_process_step: nv(p.ps), legacy_process_name: nv(p.psn),
    process_ids: uniq(procs), technology_text: nv(p.tech), technology_ids: uniq([...techByLaser, ...techByCat]),
    technology_basis: { from_category: uniq(techByCat), from_laser_codes: uniq(techByLaser) },
    application_text: nv(p.app), application_ids: uniq(apps), material_text: nv(p.lmat), material_ids: uniq(mats),
    wafer, thickness: nv(p.thk), throughput: nv(p.thr), accuracy: nv(p.acc), footprint: nv(p.dims), motion: nv(p.motion),
    laser: p.las ? { types_text: nv(p.lt), type_codes: split(p.ltc), source: nv(p.ls), wavelength: nv(p.wl), average_power: nv(p.pw), pulse_duration: nv(p.pd),
      pulse_energy: nv(p.pe), repetition_rate: nv(p.rr), scan_speed: nv(p.scan), material: nv(p.lmat) } : null,
    specs, lifecycle: { status: LIFECYCLE[p.st] || "Unknown", legacy_status: p.st, maturity: nv(p.mat), maturity_evidence: nv(p.mev), launch_year: null, eol_date: null, replacement_id: null },
    price_public: nv(p.price), teal_portfolio: nv(p.teal), notes: nv(p.note),
    reclassified: p._reclassified_from ? { from_code: p._reclassified_from, to_code: p.eqid, reason: p._reclass_reason } : null,
    batch: p.note && /^Batch 2/.test(p.note) ? "Batch 2" : "Batch 1",
    verification: p.ver, confidence: { level: p.cl }, source_ids: src, source_age: p.age,
    freshness: fresh, quality_state: qualityState(p.ver, fresh, CONFLICTED.has(id)), missing_key_fields: missing, dates: dates(p.ver, src),
  };
});
const MD = Object.fromEntries(models.map(m => [m.id, m]));
const families = famOrder.map(k => {
  const ms = models.filter(m => m.family_id === FAM[k]);
  const f = ms[0];
  return { id: FAM[k], entity_type: "product_family", name: f.family_name, company_id: f.company_id, manufacturer: f.manufacturer,
    model_ids: ms.map(m => m.id), equipment_ids: uniq(ms.map(m => m.equipment_id)), is_component: ms.every(m => m.is_component),
    process_ids: uniq(ms.flatMap(m => m.process_ids)), technology_ids: uniq(ms.flatMap(m => m.technology_ids)),
    source_ids: uniq(ms.flatMap(m => m.source_ids)), verification: ms.some(m => m.verification === "VERIFIED") ? "VERIFIED" : ms[0].verification,
    basis: "Grouped from Batch-1 product records sharing company and family name" };
});

// ---------------------------------------------------------------- equipment
const coByCode = {}; companies.forEach(c => c.equipment_ids.forEach(e => (coByCode[e] ||= []).push(c.id)));
const mdByCode = {}; models.forEach(m => m.equipment_id && (mdByCode[m.equipment_id] ||= []).push(m.id));
const equipment = taxRows.map(t => {
  const id = eqpId(t.code);
  const desc = taxRows.filter(x => x.code !== t.code && underCode(x.code, t.code) && x.group === t.group).map(x => eqpId(x.code));
  const allCos = uniq([id, ...desc].flatMap(e => coByCode[e] || []));
  const allMds = uniq([id, ...desc].flatMap(e => mdByCode[e] || []));
  const subs = SUBSYSTEMS.filter(s => (s.laser && t.laser) || (s.typical_in || []).some(p => underCode(t.code, p))).map(s => SUB[s.slug]);
  return { id, entity_type: "equipment", code: t.code, name: t.name, parent_id: t.parent ? eqpId(t.parent) : null, level: t.level,
    group_code: t.group, group_name: GROUP_NAME[t.group], segment: t.level === 1 ? null : segmentOf(t.code), laser_relevant: t.laser, legacy_process_step: t.ps,
    process_ids: PROCESSES.filter(p => (p.eq || []).some(pat => underCode(t.code, pat))).map(p => PRS[p.slug]),
    technology_ids: TECHNOLOGIES.filter(x => (x.eq || []).some(pat => t.code === pat || t.code.startsWith(pat + "."))).map(x => TEC[x.slug]),
    typical_subsystem_ids: t.level === 1 ? [] : subs, subsystem_basis: "Generic architecture reference (editorial), not a statement about any specific tool",
    company_ids: coByCode[id] || [], model_ids: mdByCode[id] || [], company_ids_incl_children: allCos, model_ids_incl_children: allMds,
    child_ids: taxRows.filter(x => x.parent === t.code).map(x => eqpId(x.code)),
    see_also: (TAXONOMY_SEE_ALSO[t.code] || []).map(eqpId), origin: t.ext ? "2.0 taxonomy extension" : "Batch-1 taxonomy" };
});

// ---------------------------------------------------------------- processes / technologies / materials / applications
const processes = PROCESSES.map((p, i) => {
  const id = PRS[p.slug];
  const eqIds = uniq((p.eq || []).flatMap(pat => CODES.filter(c => underCode(c, pat))).map(eqpId));
  const mds = models.filter(m => m.process_ids.includes(id));
  return { id, entity_type: "process", slug: p.slug, name: p.name, stage: p.stage, stage_name: STAGES.find(s => s.id === p.stage).name, parent_id: p.parent ? PRS[p.parent] : null,
    sequence: i + 1, flow_position: p.flow ?? null, legacy_process_steps: p.legacy_ps || [],
    description: p.description, purpose: p.purpose, inputs: p.inputs || [], outputs: p.outputs || [], typical_parameters: p.parameters || [], quality_metrics: p.quality || [], defects: p.defects || [],
    equipment_ids: eqIds, technology_ids: (p.tech || []).map(s => TEC[s]).filter(Boolean), material_ids: (p.mat || []).map(s => MAT[s]).filter(Boolean),
    model_ids: mds.map(m => m.id), company_ids: uniq([...eqIds.flatMap(e => coByCode[e] || []), ...mds.map(m => m.company_id)]),
    content_basis: "Editorial reference (generic process description; not source-traced)" };
});
PROCESSES.forEach(p => { if (p.tech) p.tech.forEach(s => { if (!TEC[s]) throw new Error(`Unknown technology slug ${s} in process ${p.slug}`); }); if (p.mat) p.mat.forEach(s => { if (!MAT[s]) throw new Error(`Unknown material slug ${s} in process ${p.slug}`); }); });
const technologies = TECHNOLOGIES.map(t => {
  const id = TEC[t.slug];
  const mds = models.filter(m => m.technology_ids.includes(id));
  const eqIds = uniq((t.eq || []).flatMap(pat => CODES.filter(c => c === pat || c.startsWith(pat + "."))).map(eqpId));
  return { id, entity_type: "technology", slug: t.slug, legacy_code: t.legacy || null, name: t.name, family: t.family, aliases: t.aliases || [], description: t.description,
    equipment_ids: eqIds, process_ids: processes.filter(p => p.technology_ids.includes(id)).map(p => p.id),
    model_ids: mds.map(m => m.id), company_ids: uniq([...mds.map(m => m.company_id), ...eqIds.flatMap(e => coByCode[e] || [])]),
    content_basis: "Editorial reference; company/model links derived from source-backed categories and laser codes" };
});
const materials = MATERIALS.map(m => {
  const id = MAT[m.slug];
  const mds = models.filter(x => x.material_ids.includes(id));
  return { id, entity_type: "material", slug: m.slug, name: m.name, material_class: m.cls, description: m.description,
    process_ids: processes.filter(p => p.material_ids.includes(id)).map(p => p.id), model_ids: mds.map(x => x.id), company_ids: uniq(mds.map(x => x.company_id)),
    supplier_company_ids: [], grade_purity: null, safety_class: null,
    link_basis: m.match ? "Derived: text match on source-stated material / wafer / application fields" : "No model-level links (reference only)",
    content_basis: "Editorial reference" };
});
// Batch-1 materials/gas suppliers (company type) → materials they are documented for are not itemised; attach to class only.
const materialsCos = companies.filter(c => c.supplier_types.includes("Materials Supplier")).map(c => c.id);
materials.filter(m => m.material_class === "Gas").forEach(m => (m.supplier_company_ids_class_level = materialsCos));
const applications = APPLICATIONS.map(a => {
  const id = APP[a.slug];
  const mds = models.filter(m => m.application_ids.includes(id));
  return { id, entity_type: "application", slug: a.slug, name: a.name, group: a.grp, model_ids: mds.map(m => m.id), company_ids: uniq(mds.map(m => m.company_id)),
    link_basis: "Derived: text match on source-stated application / technology fields" };
});

// ---------------------------------------------------------------- suppliers, subsystems, components (from supplier register)
const spRows = L.sp.map(s => ({ ...s, supCo: cmpId(s.supid), oemCo: cmpId(s.oemid), cpn: CPN_BY_BOM[s.bom] || null }));
const components = COMPONENTS.map(c => {
  const id = CPN[c.slug];
  const rows = spRows.filter(s => s.cpn === id);
  return { id, entity_type: "component", slug: c.slug, name: c.name, category: c.cat, subsystem_id: SUB[c.subsystem], legacy_bom_codes: c.bom,
    capable_supplier_ids: uniq(rows.filter(s => s.type === "CAPABLE_SUPPLIER" && s.supCo).map(s => s.supCo)),
    documented_supply_links: rows.filter(s => ["DOCUMENTED_SUPPLY", "IN_HOUSE", "DISTRIBUTION"].includes(s.type)).map(s => s.id),
    gap: rows.some(s => s.type === "GAP"), gap_note: rows.filter(s => s.type === "GAP").map(s => nv(s.ev)).filter(Boolean).join("; ") || null,
    product_model_ids: models.filter(m => m.component_class_id === id).map(m => m.id),
    india_supplier_ids: uniq(rows.filter(s => s.supCo && CO[s.supCo]?.hq.country === "India").map(s => s.supCo)),
    source_ids: uniq(rows.flatMap(s => srcIds(s.src))),
    specification: null, operating_range: null, interface: null, obsolescence_status: null,
    content_basis: "Component class: editorial; supplier links: Batch-1 supplier register (source-backed capability, not proof of supply to a named OEM)" };
});
const subsystems = SUBSYSTEMS.map(s => {
  const id = SUB[s.slug];
  const cps = components.filter(c => c.subsystem_id === id);
  return { id, entity_type: "subsystem", slug: s.slug, name: s.name, architecture: s.architecture, functions: s.functions, inputs: s.inputs, outputs: s.outputs,
    critical_parameters: s.parameters, failure_modes: s.failure_modes, interfaces: s.interfaces, integration_requirements: s.integration, cost_drivers: s.cost_drivers,
    component_ids: cps.map(c => c.id), potential_supplier_ids: uniq(cps.flatMap(c => c.capable_supplier_ids)),
    typical_equipment_ids: equipment.filter(e => e.typical_subsystem_ids.includes(id) && e.level > 1).map(e => e.id),
    typical_oem_ids: uniq(equipment.filter(e => e.typical_subsystem_ids.includes(id)).flatMap(e => e.company_ids)).slice(0, 400),
    localization_notes: L.loc.filter(l => new RegExp(s.slug.replace("-", ".?"), "i").test(l.crit + " " + l.sub)).map(l => l.id),
    content_basis: "Editorial engineering reference; supplier lists from Batch-1 register" };
});
const suppliers = companies.map(c => {
  const rows = spRows.filter(s => s.supCo === c.id);
  return { company_id: c.id, name: c.name, country: c.hq.country, supplier_types: c.supplier_types, company_type: c.company_type,
    component_class_ids: uniq([...c.component_class_ids, ...rows.map(s => s.cpn).filter(Boolean)]),
    subsystem_ids: uniq(rows.map(s => s.cpn).filter(Boolean).map(id => components.find(x => x.id === id)?.subsystem_id)),
    documented_links: rows.filter(s => s.type !== "CAPABLE_SUPPLIER" && s.type !== "GAP").map(s => s.id),
    capability_links: rows.filter(s => s.type === "CAPABLE_SUPPLIER").map(s => s.id) };
});

// ---------------------------------------------------------------- fabs / OSATs / customers
const FAB_TYPES = /Foundry|IDM|Memory|Research foundry|Display|Service foundry|Glass substrate/;
const OSAT_TYPES = /OSAT|ATMP/;
const custOrgId = cu => {
  const c = L.cu.find(x => x.customer_id === cu); if (!c) return null;
  if (FAB_TYPES.test(c.customer_type)) return `FAB-${pad(num(cu))}`;
  if (OSAT_TYPES.test(c.customer_type)) return `OSAT-${pad(num(cu))}`;
  return `CUS-${pad(num(cu))}`;
};
function sitesFor(cu) {
  const sites = split(cu.key_sites).map(s => ({ name: s, basis: "Key sites field (customer register)", source_ids: srcIds(cu.source_ids) }));
  L.cr.filter(r => r.cu === cu.customer_id && (!NA(r.fab) || !NA(r.loc))).forEach(r => {
    const name = [nv(r.fab), nv(r.loc)].filter(Boolean).join(" · ");
    if (!sites.some(s => s.name === name)) sites.push({ name, basis: `Customer link ${r.id}`, source_ids: srcIds(r.src) });
  });
  return sites;
}
function orgRecord(cu, prefix, kind) {
  const id = `${prefix}-${pad(num(cu.customer_id))}`;
  const links = L.cr.filter(r => r.cu === cu.customer_id);
  return { id, legacy_id: cu.customer_id, entity_type: kind, name: cu.customer_name, facility_type: cu.customer_type, country: nv(cu.country), country_id: ctryId(cu.country),
    sites: sitesFor(cu), equipment_supplier_ids: uniq(links.map(r => cmpId(r.co))), model_ids: uniq(links.map(r => /^P/.test(r.pid) ? mdlId(r.pid) : null)),
    customer_link_ids: links.map(r => `REL-CR-${r.id.slice(2)}`), confirmed_links: links.filter(r => r.st === "CONFIRMED").length,
    capacity: null, process_node: null, wafer_size: null, investment: null, status: null,
    field_note: "Facility capacity, node, wafer size and investment are not captured in Batch 1 unless stated in a site description.",
    source_ids: srcIds(cu.source_ids), also_listed_as: null };
}
const fabs = L.cu.filter(c => FAB_TYPES.test(c.customer_type)).map(c => orgRecord(c, "FAB", "fab"));
const osats = L.cu.filter(c => OSAT_TYPES.test(c.customer_type)).map(c => orgRecord(c, "OSAT", "osat"));
fabs.forEach(f => { const o = osats.find(x => x.legacy_id === f.legacy_id); if (o) { f.also_listed_as = o.id; o.also_listed_as = f.id; } });
const otherCustomers = L.cu.filter(c => !FAB_TYPES.test(c.customer_type) && !OSAT_TYPES.test(c.customer_type)).map(c => orgRecord(c, "CUS", "customer"));

// ---------------------------------------------------------------- countries
const countries = COUNTRIES.map(([name, iso, region, lat, lon]) => {
  const legacy = L.ctry.find(x => x.country === name) || {};
  const cos = companies.filter(c => c.hq.country === name);
  const byType = t => cos.filter(c => c.supplier_types.includes(t)).map(c => c.id);
  return { id: `CTY-${iso}`, entity_type: "country", iso2: iso, name, region, lat, lon, centroid_note: "Approximate country centroid for map clustering only",
    company_ids: cos.map(c => c.id), equipment_oem_ids: byType("Equipment OEM"), subsystem_supplier_ids: byType("Subsystem Supplier"),
    component_supplier_ids: byType("Component Supplier"), materials_supplier_ids: byType("Materials Supplier"),
    fab_ids: fabs.filter(f => f.country === name).map(f => f.id), osat_ids: osats.filter(f => f.country === name).map(f => f.id),
    india_partnership_company_ids: name === "India" ? [] : uniq(cos.filter(c => c.india.has_presence).map(c => c.id)),
    verified_company_count: cos.filter(c => c.verification === "VERIFIED").length,
    batch1_search_status: legacy.batch1_search_status || "NOT_IN_BRIEF", legacy_notes: nv(legacy.notes), listed_in_brief: legacy.listed_in_brief === "Y",
    technology_strengths: null, export_dependencies: null, strengths_note: "Not assessed in Batch 1 — no source-backed assessment captured" };
});

// ---------------------------------------------------------------- relationships (knowledge graph edges)
const rels = []; let rn = 0;
const E = (type, from, to, o = {}) => { if (!from || !to) return; rels.push({ id: o.id || `REL-${pad(++rn)}`, type, from, to, basis: o.basis || "source", ...o, ...(o.id ? {} : {}) }); };
models.forEach(m => {
  E("manufactures", m.company_id, m.id, { source_ids: m.source_ids, confidence: m.confidence.level });
  E("part_of", m.id, m.family_id, { basis: "derived" });
  if (m.equipment_id) E("classified_as", m.id, m.equipment_id, { source_ids: m.source_ids });
  if (m.component_class_id) E("classified_as", m.id, m.component_class_id, { source_ids: m.source_ids });
  m.process_ids.forEach(p => E("used_in", m.id, p, { basis: "derived", via: "equipment category → process reference" }));
  m.technology_basis.from_laser_codes.forEach(t => E("uses_technology", m.id, t, { source_ids: m.source_ids, via: "source-stated laser type" }));
  m.technology_basis.from_category.filter(t => !m.technology_basis.from_laser_codes.includes(t)).forEach(t => E("uses_technology", m.id, t, { basis: "derived", via: "equipment category" }));
  m.material_ids.forEach(x => E("supports_material", m.id, x, { basis: "derived", via: "text match on source-stated fields", source_ids: m.source_ids }));
  m.application_ids.forEach(x => E("supports_application", m.id, x, { basis: "derived", via: "text match on source-stated fields", source_ids: m.source_ids }));
});
families.forEach(f => E("offers", f.company_id, f.id, { basis: "derived" }));
companies.forEach(c => {
  c.equipment_ids.forEach(e => E("offers_equipment", c.id, e, { source_ids: c.source_ids, confidence: c.confidence.level }));
  if (c.hq.country_id) E("located_in", c.id, c.hq.country_id, { basis: c.hq.country_basis_code === "SRC" && c.source_ids.length ? "source" : "analyst", note: c.hq.country_basis, source_ids: c.hq.country_basis_code === "SRC" ? c.source_ids : [] });
  c.india.records.forEach(r => E("present_in", c.id, "CTY-IN", { source_ids: r.source_ids, confidence: r.confidence, detail: { type: r.type, facility: r.facility, location: r.location, status: r.status } }));
});
spRows.forEach(s => {
  const t = { DOCUMENTED_SUPPLY: "supplies", IN_HOUSE: "integrates", DISTRIBUTION: "distributes", CAPABLE_SUPPLIER: "capable_of_supplying", EVALUATION: "evaluated_by" }[s.type];
  if (!t) return;
  const to = s.type === "CAPABLE_SUPPLIER" ? s.cpn : (s.oemCo || s.cpn);
  E(t, s.supCo, to, { id: `REL-SP-${s.id.slice(2)}`, legacy_id: s.id, source_ids: srcIds(s.src), confidence: s.cl, status: s.type,
    detail: { equipment: nv(s.eq), oem: nv(s.oem), subsystem: nv(s.sub), component: nv(s.comp), component_class_id: s.cpn, evidence: nv(s.ev) } });
});
L.cr.forEach(r => E("supplies_equipment_to", cmpId(r.co), custOrgId(r.cu), { id: `REL-CR-${r.id.slice(2)}`, legacy_id: r.id, status: r.st, confidence: r.cl, source_ids: srcIds(r.src), date: normDate(r.date),
  detail: { customer: r.cust, model_id: /^P/.test(r.pid) ? mdlId(r.pid) : null, product: nv(r.prod), site: nv(r.fab), location: nv(r.loc), process_step: nv(r.ps), application: nv(r.app), stage: nv(r.stage), evidence: nv(r.ev) } }));
const partyId = x => (/^C\d/.test(x) ? cmpId(x) : /^CU\d/.test(x) ? custOrgId(x) : null);
const DEAL_TYPE = t => /merger/i.test(t) ? "merger_with" : /acqui/i.test(t) ? "acquired" : /invest|funding/i.test(t) ? "invested_in" : /joint venture/i.test(t) ? "joint_venture_with"
  : /distribut/i.test(t) ? "distributes_for" : /spin/i.test(t) ? "spun_off" : /group|rename|consolidation/i.test(t) ? "corporate_group" : "partner_of";
const deals = L.pa.map(p => ({ id: `DEAL-${pad(num(p.id))}`, legacy_id: p.id, event_type: p.type, party_a: p.a, party_a_id: partyId(p.aid), party_b: p.b, party_b_id: partyId(p.bid),
  date: normDate(p.date) || nv(p.date), value_disclosed: nv(p.val), technology: nv(p.tech), status: p.st, confidence: p.cl, source_ids: srcIds(p.src),
  claim_type: /rumour|claim|UNVERIFIED/i.test(p.type + " " + p.st) ? "Unverified report" : "Reported event" }));
deals.forEach(d => { if (d.party_a_id && d.party_b_id) E(DEAL_TYPE(d.event_type), d.party_a_id, d.party_b_id, { id: `REL-PA-${d.legacy_id.slice(2)}`, legacy_id: d.legacy_id, status: d.status, confidence: d.confidence, source_ids: d.source_ids, date: d.date, detail: { event: d.event_type, value: d.value_disclosed } }); });
L.rel.forEach(r => {
  const a = cmpId(r.company_a_id), b = cmpId(r.company_b_id);
  const t = { BRAND: "brand_of", SUBSIDIARY: "subsidiary_of", ACQUIRED: "acquired", RELATED: "related_to", UNKNOWN: "unresolved_relationship" }[r.classification];
  if (a && b) { if (t === "subsidiary_of" || t === "brand_of") E(t, b, a, { id: `REL-RL-${r.rel_id.slice(2)}`, legacy_id: r.rel_id, source_ids: srcIds(r.source_ids), confidence: r.confidence_level, detail: { evidence: r.evidence } });
    else E(t, a, b, { id: `REL-RL-${r.rel_id.slice(2)}`, legacy_id: r.rel_id, source_ids: srcIds(r.source_ids), confidence: r.confidence_level, detail: { evidence: r.evidence } }); }
});
processes.forEach(p => { if (p.parent_id) E("part_of", p.id, p.parent_id, { basis: "reference" }); p.equipment_ids.filter(e => equipment.find(x => x.id === e)?.level > 1).forEach(e => E("used_in", e, p.id, { basis: "reference" })); });
subsystems.forEach(s => s.component_ids.forEach(c => E("contains", s.id, c, { basis: "reference" })));
// equipment → subsystem "contains" edges only for level-2 nodes that carry records (keeps the graph readable)
equipment.filter(e => e.level > 1 && (e.company_ids.length || e.model_ids.length)).forEach(e => e.typical_subsystem_ids.forEach(s => E("contains", e.id, s, { basis: "reference" })));
technologies.forEach(t => t.process_ids.forEach(p => E("used_in", t.id, p, { basis: "reference" })));

// ---------------------------------------------------------------- deduplication (candidates only; never auto-merged)
const knownPairs = new Set(L.rel.map(r => [cmpId(r.company_a_id), cmpId(r.company_b_id)].sort().join("|")));
const dupes = [];
for (let i = 0; i < companies.length; i++) for (let j = i + 1; j < companies.length; j++) {
  const a = companies[i], b = companies[j];
  const na = normName(a.canonical_name), nb = normName(b.canonical_name);
  const sim = similarity(na, nb);
  const contains = na.length > 3 && nb.length > 3 && (na.includes(nb) || nb.includes(na));
  const sameWeb = a.website && b.website && a.website.replace(/https?:\/\/(www\.)?/, "").split("/")[0] === b.website.replace(/https?:\/\/(www\.)?/, "").split("/")[0];
  if (sim >= 0.72 || contains || sameWeb) {
    const known = knownPairs.has([a.id, b.id].sort().join("|"));
    dupes.push({ id: `DUP-${pad(dupes.length + 1, 4)}`, entity_type: "company", a: a.id, b: b.id, a_name: a.name, b_name: b.name, similarity: +sim.toFixed(2),
      reasons: [sim >= 0.72 && `name similarity ${sim.toFixed(2)}`, contains && "one name contains the other", sameWeb && "same website domain"].filter(Boolean),
      known_relationship: known ? L.rel.find(r => [cmpId(r.company_a_id), cmpId(r.company_b_id)].sort().join("|") === [a.id, b.id].sort().join("|")).classification : null,
      resolution: known ? "Known relationship recorded — kept as separate entities" : "Needs review — not merged" });
  }
}
const mdKey = {}; models.filter(m => m.model_number).forEach(m => { const k = m.company_id + "|" + m.model_number.toLowerCase(); (mdKey[k] ||= []).push(m.id); });
Object.values(mdKey).filter(v => v.length > 1).forEach(v => dupes.push({ id: `DUP-${pad(dupes.length + 1, 4)}`, entity_type: "model", a: v[0], b: v[1], a_name: MD[v[0]].name, b_name: MD[v[1]].name,
  reasons: ["same manufacturer and model number"], known_relationship: null, resolution: "Needs review — not merged" }));

// ---------------------------------------------------------------- analysis tables carried forward (legacy views)
const mapCo = x => cmpId(x) || x;
const intel = {
  market: L.mk.map(m => ({ ...m, source_id: srcId(m.source_id) })),
  competitor_map: L.cm, teal_view: L.tv.map(t => ({ ...t, source_ids: srcIds(t.source_ids) })), gap_analysis: L.gap.map(g => ({ ...g, source_ids: srcIds(g.source_ids) })),
  partner_fit: L.pfit.map(p => ({ ...p, company_id: mapCo(p.company_id), source_ids: srcIds(p.source_ids) })),
  localization: L.loc.map(l => ({ ...l, source_ids: srcIds(l.src) })), qc_log: L.qc.map(q => ({ check: q[0], result: q[1], detail: q[2], note: q[3] })),
  completeness: L.comp.map(c => ({ dimension: c[0], pct: c[1], definition: c[2] })), coverage: L.cov,
  exhibitions: L.ex.map(e => ({ ...e, source_ids: srcIds(e.source_ids) })), exhibitors: L.exb.map(e => ({ ...e, company_id: mapCo(e.company_id), source_ids: srcIds(e.source_ids) })),
  patents: L.pt.map(p => ({ id: p.pt_id, holder: p.holder, patent_number: p.patent_number, technology: p.technology, filing_date: p.filing_date, grant_date: p.grant_date, country: p.country,
    equipment_id: CODES.includes(p.category) ? eqpId(p.category) : null, status: p.status, notes: nv(p.notes), source_ids: srcIds(p.source_ids), confidence: p.confidence_level })),
  legacy_process_steps: L.ps, legacy_laser_types: L.lt, teal_areas: L.teal, legacy_country_matrix: L.ctry,
};

// ---------------------------------------------------------------- publish
const entities = { companies, product_families: families, models, equipment, processes, technologies, materials, applications, subsystems, components, suppliers, fabs, osats, customers: otherCustomers, countries, deals, relationships: rels, sources };
const reference = { stages: STAGES, segments: SEGMENTS, equipment_groups: groups.map(([code, name]) => ({ code, name })), synonyms: SYNONYMS };
const quality = { conflicts: CONFLICTS, duplicate_candidates: dupes };
const report = validateAll({ ...entities }, { conflicts: CONFLICTS });
quality.validation = report;
const counts = Object.fromEntries(Object.entries(entities).map(([k, v]) => [k, v.length]));
const LATEST = [AS_OF, ...BATCHES.map(b => b.created).filter(Boolean)].sort().pop();
const meta = { name: "SEMICON-DB", title: "SEMICON-DB — Global Semiconductor Equipment Intelligence Graph", schema_version: SCHEMA_VERSION, evidence_as_of: LATEST, batch1_as_of: AS_OF, built: BUILD_DATE,
  batches: [{ batch: "Batch 1", date: AS_OF, companies: L.co.length - BATCHES.reduce((a, b) => a + (b.co || []).length, 0), products: L.pr.length - BATCHES.reduce((a, b) => a + (b.pr || []).length, 0), sources: L.src.length - BATCHES.reduce((a, b) => a + (b.src || []).length, 0), customer_links: L.cr.length, note: "Legacy public edition (single-file atlas)" },
    ...BATCHES.map(b => ({ batch: b.batch, date: b.created, companies: (b.co || []).length, products: (b.pr || []).length, sources: (b.src || []).length, note: b.method || "Imported batch (scripts/import.mjs)" })),
    { batch: "2.0 migration", date: BUILD_DATE, note: "Totals after 2.0 normalisation (schema, reference taxonomy, derived relationships) over Batch 1" + (BATCHES.length ? " plus " + BATCHES.map(b => b.batch).join(", ") : "; no new external facts added"), ...counts }],
  counts, id_prefixes: { company: "CMP", product_family: "PRD", model: "MDL", equipment: "EQP", process: "PRS", technology: "TEC", material: "MAT", application: "APP", subsystem: "SUB", component: "CMPN", fab: "FAB", osat: "OSAT", customer: "CUS", country: "CTY", deal: "DEAL", relationship: "REL", source: "SRC", conflict: "CNF", duplicate: "DUP" } };

const write = (f, obj) => fs.writeFileSync(path.join(OUT, f), JSON.stringify(obj, null, 0) + "\n");
Object.entries(entities).forEach(([k, v]) => write(`${k}.json`, v));
write("intel.json", intel); write("quality.json", quality); write("reference.json", reference); write("meta.json", meta);
write("bundle.json", { meta, reference, quality, intel, ...entities });
const size = fs.statSync(path.join(OUT, "bundle.json")).size;
console.log(`SEMICON-DB ${SCHEMA_VERSION} build: ${Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(" ")}`);
console.log(`bundle.json ${(size / 1024).toFixed(0)} KB · validation: ${report.errors.length} errors, ${report.warnings.length} warnings · ${dupes.length} duplicate candidates · ${CONFLICTS.length} conflicts`);
if (report.errors.length) { console.error(report.errors.slice(0, 30).map(e => "ERROR " + e.rule + ": " + e.message).join("\n")); process.exit(1); }

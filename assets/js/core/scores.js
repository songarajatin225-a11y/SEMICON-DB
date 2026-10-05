// Derived scores. Every score is computed from SEMICON-DB records only, publishes its formula, and describes the
// documented evidence — not the market. Inputs that the database does not hold (market share, lead time, export
// controls, CapEx, patents) are never estimated; the methods say so.
import { DB, get, out, inn } from "./store.js";
import { uniq } from "./util.js";

// ---------------------------------------------------------------- regional blocs (dependency view)
export const BLOCS = ["United States", "Japan", "Europe", "China", "Taiwan", "South Korea", "India", "Israel", "Other"];
const EUROPE = new Set(["Germany", "Netherlands", "Switzerland", "United Kingdom", "France", "Italy", "Belgium", "Austria", "Finland", "Sweden", "Denmark", "Norway", "Spain", "Portugal", "Ireland", "Czech Republic", "Poland", "Hungary", "Lithuania"]);
export const blocOf = country => !country ? null : EUROPE.has(country) ? "Europe" : country === "Hong Kong" ? "China" : BLOCS.includes(country) ? country : "Other";
export function blocShares(companies) {
  const known = companies.filter(c => c.hq?.country);
  const m = new Map(); known.forEach(c => { const b = blocOf(c.hq.country); m.set(b, (m.get(b) || 0) + 1); });
  return { known: known.length, unknown: companies.length - known.length,
    rows: BLOCS.filter(b => m.has(b)).map(b => ({ bloc: b, n: m.get(b), share: Math.round(100 * m.get(b) / known.length) })).sort((a, b) => b.n - a.n) };
}
// suppliers of one equipment category grouped by HQ bloc (competitor landscape by region)
export function playersByBloc(companyIds) {
  const cos = uniq(companyIds).map(get).filter(Boolean);
  return BLOCS.map(b => ({ bloc: b, cos: cos.filter(c => (blocOf(c.hq.country) || "Other") === b) })).filter(x => x.cos.length);
}

// ---------------------------------------------------------------- supplier criticality (company level)
export const CRIT_METHOD = "Points, capped at 100: 25 per equipment category where the company is the only documented supplier, 10 per category with exactly two documented suppliers, 10 per equipment OEM it is documented as supplying (subsystem / component links), 5 per fab or OSAT it is documented as supplying.";
let CRIT = null;
export function criticality(id) {
  if (!CRIT) {
    CRIT = new Map();
    const leaf = DB.equipment.filter(e => !(e.child_ids || []).length && e.level > 1);
    const sole = new Map(), duo = new Map();
    leaf.forEach(e => { const cos = uniq(e.company_ids); if (cos.length === 1) sole.set(cos[0], [...(sole.get(cos[0]) || []), e.id]); if (cos.length === 2) cos.forEach(c => duo.set(c, [...(duo.get(c) || []), e.id])); });
    DB.companies.forEach(c => {
      const oems = uniq(out(c.id, ["supplies", "integrates"]).map(r => r.to).filter(x => /^CMP-/.test(x) && x !== c.id));
      const sites = uniq(out(c.id, "supplies_equipment_to").map(r => r.to));
      const s = sole.get(c.id) || [], d = duo.get(c.id) || [];
      const score = Math.min(100, 25 * s.length + 10 * d.length + 10 * oems.length + 5 * sites.length);
      CRIT.set(c.id, { score, sole: s, duo: d, oems, sites });
    });
  }
  return CRIT.get(id) || { score: 0, sole: [], duo: [], oems: [], sites: [] };
}

// ---------------------------------------------------------------- SEMICON-DB Intelligence Score (company level)
export const INTEL_METHOD = [
  ["Data completeness", 30, "the company's completeness score (16 key fields)"],
  ["Source quality", 20, "60 % share of its sources that are Tier 1 + 40 % verification state (verified 1, partially verified 0.6, unverified 0.2)"],
  ["Portfolio breadth", 15, "10 points per equipment category + 5 per equipment model, capped at 100"],
  ["Supply-chain importance", 20, "supplier criticality (see method)"],
  ["Ecosystem connectivity", 15, "10 points per distinct documented counterparty (deals, customer links, supply links, facilities operated), capped at 100"],
];
const VER_W = { VERIFIED: 1, PARTIALLY_VERIFIED: 0.6, UNVERIFIED: 0.2 };
let INTEL = null;
export function intelScore(c) {
  if (!INTEL) INTEL = new Map();
  if (INTEL.has(c.id)) return INTEL.get(c.id);
  const srcs = c.source_ids.map(get).filter(Boolean);
  const t1 = srcs.length ? srcs.filter(s => s.tier === 1).length / srcs.length : 0;
  const quality = Math.round(100 * (0.6 * t1 + 0.4 * (VER_W[c.verification] ?? 0.2)));
  const models = DB.models.filter(m => m.company_id === c.id && !m.is_component).length;
  const breadth = Math.min(100, 10 * c.equipment_ids.length + 5 * models);
  const crit = criticality(c.id).score;
  const parties = uniq([...DB.relationships.filter(r => (r.from === c.id || r.to === c.id) && /supplies|integrates|distributes|partner_of|joint_venture_with|invested_in|acquired|merger_with|operates|supplies_equipment_to/.test(r.type)).map(r => (r.from === c.id ? r.to : r.from))]);
  const connect = Math.min(100, 10 * parties.length);
  const parts = [c.completeness?.score ?? 0, quality, breadth, crit, connect];
  const score = Math.round(parts.reduce((a, v, i) => a + v * INTEL_METHOD[i][1] / 100, 0));
  const r = { score, parts: INTEL_METHOD.map(([l, w], i) => ({ l, w, v: Math.round(parts[i]) })) };
  INTEL.set(c.id, r); return r;
}

// ---------------------------------------------------------------- localization below equipment level
export const BAND = s => (s >= 75 ? "VERY HIGH" : s >= 55 ? "HIGH" : s >= 35 ? "MEDIUM" : "LOW");
export const COMP_LOC_METHOD = "50 % documented Indian suppliers (3+ = full) + 25 % documented global alternatives (10+ = full) + 25 % breadth of use (equipment categories whose typical architecture includes the parent subsystem, 20+ = full). Bands as for equipment.";
export function componentLocalization() {
  return DB.components.map(k => {
    const sub = get(k.subsystem_id);
    const india = uniq(k.india_supplier_ids || []), global = uniq(k.capable_supplier_ids || []).filter(x => !india.includes(x));
    const uses = (sub?.typical_equipment_ids || []).length;
    const score = Math.round(50 * Math.min(india.length, 3) / 3 + 25 * Math.min(global.length, 10) / 10 + 25 * Math.min(uses, 20) / 20);
    return { id: k.id, k, sub, india, global, uses, score, band: BAND(score), evidence: india.length + global.length > 0 };
  });
}
export function subsystemLocalization() {
  const comp = componentLocalization();
  return DB.subsystems.map(s => { const cs = comp.filter(x => x.k.subsystem_id === s.id);
    const withIn = cs.filter(x => x.india.length).length, withAny = cs.filter(x => x.evidence).length;
    const score = cs.length ? Math.round(100 * withIn / cs.length) : 0;
    return { id: s.id, s, n: cs.length, withIn, withAny, score, band: BAND(score), oems: (s.typical_oem_ids || []).length }; });
}

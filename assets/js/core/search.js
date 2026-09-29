// Local search engine: inverted index + prefix + typo tolerance + synonym groups + structured
// constraint parsing ("200 mm SiC laser dicing equipment in Japan"). Constraints never guess:
// a record that does not publish the constrained value is shown as a *partial* match, not a match.
import { DB, get, nameOf } from "./store.js";
import { norm, uniq } from "./util.js";

const INCH = { 2: 50, 3: 75, 4: 100, 5: 125, 6: 150, 8: 200, 12: 300, 18: 450 };
const STOP = new Set("a an and the of for in on with to by from at or vs versus that which who what list show find me all any is are be used using use required need needed make makes making".split(" "));
const HINTS = {
  company: ["company", "companies", "manufacturer", "manufacturers", "maker", "makers", "oem", "oems", "vendor", "vendors", "supplier", "suppliers", "firm", "firms"],
  model: ["equipment", "tool", "tools", "machine", "machines", "system", "systems", "model", "models", "product", "products", "platform", "platforms"],
  fab: ["fab", "fabs", "foundry", "foundries"], osat: ["osat", "osats", "atmp"],
};
const HINT_OF = {}; Object.entries(HINTS).forEach(([k, ws]) => ws.forEach(w => (HINT_OF[w] = k)));
const KIND_WEIGHT = { company: 1.05, model: 1.1, product_family: 0.9, equipment: 1, process: 0.95, technology: 1, material: 0.9, application: 0.85, subsystem: 0.9, component: 0.9, fab: 0.95, osat: 0.95, country: 0.8, customer: 0.7 };

export const EXAMPLES = ["300 mm plasma etch equipment", "SiC wafer dicing equipment", "laser dicing suppliers in Japan", "GaN equipment suppliers", "advanced packaging die bonders",
  "equipment companies with India presence", "200 mm SiC equipment", "equipment required for HBM packaging", "hybrid bonding", "EUV lithography", "galvo scanner suppliers"];

let IDX = null;
const tok = s => norm(s).replace(/[^a-z0-9.+]+/g, " ").split(" ").map(t => t.replace(/^\.+|\.+$/g, "")).filter(t => t && t.length > 0);

function docFor(r) {
  const k = r.entity_type;
  const names = ids => (ids || []).map(nameOf);
  let title = r.name || r.title, sub = "", alias = [], body = [], f = {};
  if (k === "company") {
    const eq = names(r.equipment_ids);
    alias = [r.canonical_name, ...(r.aliases || []), ...(r.former_names || [])];
    sub = [r.company_type, r.hq.country].filter(Boolean).join(" · ");
    const models = DB.models.filter(m => m.company_id === r.id);
    body = [r.description, r.primary_equipment, r.company_type, r.supplier_types.join(" "), r.hq.country, r.hq.city, eq.join(" "), r.india.summary, r.parent_company, r.subsidiaries_brands,
      models.map(m => [m.name, m.technology_text, m.application_text].join(" ")).join(" "), names(uniq(models.flatMap(m => m.technology_ids))).join(" ")];
    f = { country: r.hq.country, india: r.india.has_presence || r.hq.country === "India", materials: uniq(models.flatMap(m => m.material_ids)), wafer: uniq(models.flatMap(m => m.wafer?.sizes_mm || [])), waferRanges: models.map(m => m.wafer?.range_mm).filter(Boolean) };
  } else if (k === "model") {
    const co = get(r.company_id);
    sub = [r.manufacturer, r.equipment_label, co?.hq.country].filter(Boolean).join(" · ");
    alias = [r.model_number, r.family_name];
    body = [r.manufacturer, r.equipment_label, r.technology_text, r.application_text, r.material_text, r.laser?.types_text, r.laser?.source, r.market_segment, r.segment,
      names(r.technology_ids).join(" "), names(r.process_ids).join(" "), names(r.application_ids).join(" "), (r.wafer?.sizes_mm || []).map(x => x + "mm").join(" "), r.is_component ? "component" : "equipment"];
    f = { country: co?.hq.country, india: !!(co && (co.india.has_presence || co.hq.country === "India")), materials: r.material_ids, wafer: r.wafer?.sizes_mm || [], waferRanges: r.wafer?.range_mm ? [r.wafer.range_mm] : [], waferKnown: !!r.wafer && (r.wafer.sizes_mm.length > 0 || !!r.wafer.range_mm) };
  } else if (k === "equipment") { sub = `${r.code} · ${r.group_name}`; alias = [r.code]; body = [r.group_name, r.segment, names(r.technology_ids).join(" "), names(r.process_ids).join(" ")]; }
  else if (k === "process") { sub = r.stage_name; body = [r.description, r.purpose, names(r.technology_ids).join(" "), (r.inputs || []).join(" "), (r.outputs || []).join(" ")]; }
  else if (k === "technology") { sub = r.family; alias = r.aliases; body = [r.description, names(r.process_ids).join(" ")]; }
  else if (k === "material") { sub = r.material_class; body = [r.description]; f = { materials: [r.id] }; }
  else if (k === "application") { sub = r.group; }
  else if (k === "subsystem") { sub = "Subsystem"; body = [r.architecture, (r.functions || []).join(" ")]; }
  else if (k === "component") { sub = `${r.category} component`; body = [nameOf(r.subsystem_id)]; }
  else if (k === "fab" || k === "osat" || k === "customer") { sub = [r.facility_type, r.country].filter(Boolean).join(" · "); body = [r.sites.map(s => s.name).join(" "), r.facility_type, r.country]; f = { country: r.country, india: r.country === "India" }; }
  else if (k === "country") { sub = r.region; alias = [r.iso2]; }
  else if (k === "product_family") { sub = r.manufacturer; body = [names(r.model_ids).join(" ")]; }
  return { id: r.id, kind: k, title, sub, t: tok(title), a: tok(alias.filter(Boolean).join(" ")), s: tok(sub), b: tok(body.filter(Boolean).join(" ")), text: norm([title, ...alias, sub, ...body].filter(Boolean).join(" ")), f };
}

export function buildIndex() {
  const t0 = performance.now();
  const kinds = ["companies", "models", "product_families", "equipment", "processes", "technologies", "materials", "applications", "subsystems", "components", "fabs", "osats", "customers", "countries"];
  const docs = kinds.flatMap(k => DB[k].map(docFor));
  const inv = new Map();
  docs.forEach((d, i) => {
    const add = (arr, w) => arr.forEach(t => { let m = inv.get(t); if (!m) inv.set(t, (m = new Map())); m.set(i, Math.max(m.get(i) || 0, w)); });
    add(d.b, 1); add(d.s, 2); add(d.a, 5); add(d.t, 6);
  });
  const vocab = [...inv.keys()];
  const syn = new Map();
  (DB.reference.synonyms || []).forEach(g => g.forEach(p => syn.set(norm(p), g.map(norm))));
  IDX = { docs, inv, vocab, syn, ms: performance.now() - t0 };
  return IDX;
}

function lev(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]; dp[0] = i; let rowMin = dp[0];
    for (let j = 1; j <= b.length; j++) { const tmp = dp[j]; dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = tmp; rowMin = Math.min(rowMin, dp[j]); }
    if (rowMin > max) return max + 1;
  }
  return dp[b.length];
}

// Parse a natural-language query into text terms + structured constraints.
export function parse(q) {
  let s = norm(q).trim();
  const out = { raw: q, wafer: [], countries: [], materials: [], india: false, hint: null, phrases: [], terms: [], notes: [] };
  s = s.replace(/"([^"]+)"/g, (_, p) => { out.phrases.push(p.trim()); return " "; });
  s = s.replace(/(\d+)\s*(?:-\s*)?(?:inch|inches|in\b|")/g, (_, n) => { if (INCH[n]) { out.wafer.push(INCH[n]); out.notes.push(`${n}-inch read as ${INCH[n]} mm`); } return " "; });
  s = s.replace(/\b(50|75|100|125|150|200|300|450)\s*-?\s*mm\b/g, (_, n) => { out.wafer.push(+n); return " "; });
  if (/\bindia(n)?\s+presence\b|\bpresence in india\b|\bin india\b|\bindia\b/.test(s)) { out.india = true; s = s.replace(/\b(with\s+)?india(n)?\s+presence\b|\bpresence in india\b|\bin india\b|\bindia(n)?\b/g, " "); }
  (DB.countries || []).filter(c => !/[()/]/.test(c.name)).forEach(c => {
    const n = norm(c.name); const re = new RegExp(`\\b(in |from |based in )?${n}\\b`);
    if (c.name !== "India" && n.length > 3 && re.test(s)) { out.countries.push(c.name); s = s.replace(re, " "); }
  });
  const demonyms = { japanese: "Japan", chinese: "China", korean: "South Korea", taiwanese: "Taiwan", german: "Germany", dutch: "Netherlands", american: "United States", israeli: "Israel", swiss: "Switzerland", french: "France", british: "United Kingdom", us: "United States", usa: "United States" };
  Object.entries(demonyms).forEach(([d, c]) => { const re = new RegExp(`\\b${d}\\b`); if (re.test(s)) { out.countries.push(c); s = s.replace(re, " "); } });
  // Substrate materials are resolved by name so ids never need to be hard-coded.
  const MATS = { sic: "silicon carbide", gan: "gallium nitride", gaas: "gallium arsenide", inp: "indium phosphide", sapphire: "sapphire", glass: "glass" };
  const matBy = n => (DB.materials.find(m => norm(m.name).startsWith(n)) || {}).id;
  Object.entries(MATS).forEach(([m, full]) => { const re = new RegExp(`\\b${m}\\b`); if (re.test(s)) { const id = matBy(full); if (id) out.materials.push({ id, token: m }); } });
  const words = s.split(/\s+/).filter(Boolean);
  const rest = [];
  // Entity-type hint: company words outrank fab/OSAT words, which outrank generic equipment words
  // ("equipment companies with India presence" asks for companies).
  const RANK = { company: 3, fab: 2, osat: 2, model: 1 };
  words.forEach(w => { const h = HINT_OF[w]; if (h && (!out.hint || RANK[h] > RANK[out.hint])) out.hint = h; if (h || STOP.has(w)) return; rest.push(w); });
  // multi-word synonym phrases first
  let joined = " " + rest.join(" ") + " ";
  const groups = [];
  const phrases = [...(IDX?.syn.keys() || [])].filter(p => p.includes(" ")).sort((a, b) => b.length - a.length);
  phrases.forEach(p => { if (joined.includes(" " + p + " ")) { groups.push({ term: p, alts: IDX.syn.get(p) }); joined = joined.replace(" " + p + " ", " "); } });
  tok(joined).forEach(t => groups.push({ term: t, alts: IDX?.syn.get(t) || [t] }));
  out.terms = groups;
  out.wafer = uniq(out.wafer); out.countries = uniq(out.countries);
  return out;
}

function termHits(alts) {
  // returns Map(docIdx → best weight) for any alternative (phrase alternatives split into tokens, all required)
  const best = new Map();
  alts.forEach(alt => {
    const toks = tok(alt);
    let acc = null;
    toks.forEach(t => {
      const m = new Map();
      const exact = IDX.inv.get(t);
      if (exact) exact.forEach((w, i) => m.set(i, Math.max(m.get(i) || 0, w)));
      if (t.length >= 3) IDX.vocab.forEach(v => { if (v !== t && v.startsWith(t)) IDX.inv.get(v).forEach((w, i) => m.set(i, Math.max(m.get(i) || 0, w * 0.6))); });
      if (!exact && t.length >= 4) { const max = t.length >= 8 ? 2 : 1; IDX.vocab.forEach(v => { if (v[0] === t[0] && lev(t, v, max) <= max) IDX.inv.get(v).forEach((w, i) => m.set(i, Math.max(m.get(i) || 0, w * 0.4))); }); }
      if (acc == null) acc = m; else { const n = new Map(); acc.forEach((w, i) => { if (m.has(i)) n.set(i, w + m.get(i)); }); acc = n; }
    });
    (acc || new Map()).forEach((w, i) => best.set(i, Math.max(best.get(i) || 0, w / Math.max(1, toks.length) * (toks.length > 1 ? 1.4 : 1))));
  });
  return best;
}

const CONSTRAINED = new Set(["company", "model", "fab", "osat", "customer"]);
function checkConstraints(d, P) {
  // → { ok:boolean, unknown:[labels] } ; ok=false means violated
  const unknown = [];
  if (!CONSTRAINED.has(d.kind)) return { ok: true, unknown, topic: true };
  if (P.countries.length) { if (!d.f.country) unknown.push("country"); else if (!P.countries.includes(d.f.country)) return { ok: false }; }
  if (P.india && !(d.kind === "company" || d.kind === "model" || d.f.india !== undefined)) unknown.push("India presence");
  else if (P.india && !d.f.india) return { ok: false };
  if (P.wafer.length && (d.kind === "model" || d.kind === "company")) {
    const sizes = d.f.wafer || [], ranges = d.f.waferRanges || [];
    const known = sizes.length || ranges.length;
    if (!known) unknown.push("wafer size");
    else if (!P.wafer.every(mm => sizes.includes(mm) || ranges.some(r => (r.min == null || r.min <= mm) && r.max >= mm))) return { ok: false };
  }
  return { ok: true, unknown };
}

export function search(q, { limit = 400 } = {}) {
  if (!IDX) buildIndex();
  const t0 = performance.now();
  const P = parse(q);
  // material constraints are required terms satisfied by text OR by the material facet
  const terms = [...P.terms];
  P.materials.forEach(m => terms.push({ term: m.token, alts: [m.token], material: m.id }));
  const scores = new Map(), matched = new Map();
  terms.forEach((g, ti) => {
    const hits = termHits(g.alts);
    if (g.material) IDX.docs.forEach((d, i) => { if ((d.f.materials || []).includes(g.material)) hits.set(i, Math.max(hits.get(i) || 0, 3)); });
    hits.forEach((w, i) => { scores.set(i, (scores.get(i) || 0) + w); matched.set(i, (matched.get(i) || 0) + 1); });
  });
  let cand;
  if (!terms.length && !P.phrases.length) {
    // pure-constraint query ("200 mm SiC equipment", "companies with India presence")
    cand = IDX.docs.map((d, i) => i).filter(i => (P.hint ? IDX.docs[i].kind === P.hint : ["company", "model"].includes(IDX.docs[i].kind)));
    cand.forEach(i => scores.set(i, 1));
  } else {
    const need = terms.length <= 2 ? terms.length : Math.ceil(terms.length * 0.67);
    cand = [...scores.keys()].filter(i => (matched.get(i) || 0) >= need);
    if (!cand.length && terms.length > 1) cand = [...scores.keys()].filter(i => (matched.get(i) || 0) >= Math.max(1, terms.length - 1)); // relax by one term
  }
  if (P.phrases.length) {
    const base = cand.length ? cand : IDX.docs.map((d, i) => i);
    cand = base.filter(i => P.phrases.every(p => IDX.docs[i].text.includes(p)));
    cand.forEach(i => scores.set(i, (scores.get(i) || 0) + 5));
  }
  const res = { matches: [], partial: [], topics: [], parsed: P, ms: 0 };
  cand.forEach(i => {
    const d = IDX.docs[i];
    const c = checkConstraints(d, P);
    if (!c.ok) return;
    let sc = (scores.get(i) || 0) * (KIND_WEIGHT[d.kind] || 1) + (matched.get(i) || 0) * 3;
    if (P.hint && (d.kind === P.hint || (P.hint === "company" && d.kind === "company"))) sc *= 1.5;
    const item = { id: d.id, kind: d.kind, title: d.title, sub: d.sub, score: sc, unknown: c.unknown || [] };
    const hasConstraints = P.wafer.length || P.countries.length || P.india;
    if (c.topic && hasConstraints) res.topics.push(item);
    else if (item.unknown.length) res.partial.push(item);
    else res.matches.push(item);
  });
  const by = (a, b) => b.score - a.score || a.title.localeCompare(b.title);
  res.matches.sort(by); res.partial.sort(by); res.topics.sort(by);
  res.matches = res.matches.slice(0, limit); res.partial = res.partial.slice(0, limit);
  res.ms = performance.now() - t0;
  return res;
}

// Fast prefix suggestions for the command palette.
export function suggest(q, n = 8) {
  if (!IDX) buildIndex();
  if (!q.trim()) return [];
  const r = search(q, { limit: 40 });
  return [...r.matches, ...r.topics, ...r.partial].sort((a, b) => b.score - a.score).slice(0, n);
}
export const indexStats = () => (IDX ? { docs: IDX.docs.length, tokens: IDX.vocab.length, ms: IDX.ms } : null);

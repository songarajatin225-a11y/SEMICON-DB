// Analyst workspace: grounded question answering, "Can we build this?" and the India localization index.
// No language model and no hidden scoring: every answer is assembled from SEMICON-DB records with the rule
// that produced it shown next to it. Where the database holds no evidence, the answer says so.
import { DB, get, hrefOf } from "../core/store.js";
import { esc, uniq, norm } from "../core/util.js";
import { href } from "../core/router.js";
import { search, resolveCompany } from "../core/search.js";
import { playersByBloc, componentLocalization, subsystemLocalization, COMP_LOC_METHOD, intelScore, criticality } from "../core/scores.js";
import { STATUS_LABEL, investText } from "./facilities.js";
import { pageHead, link, tags, kpi, empty } from "../ui/components.js";
import { dataTable } from "../ui/table.js";
import { categoryRisk } from "./risk.js";

const head = (t, lede) => pageHead({ eyebrow: "Intelligence", title: t, lede, crumb: [["Home", "#/"], ["Intelligence", "#/intelligence"], [t, null]] });
const indian = c => !!c && (c.hq.country === "India" || c.india.has_presence);
const indiaHQ = c => !!c && c.hq.country === "India";

// ----------------------------------------------------------------- shared evidence for one equipment category
export function buildEvidence(e) {
  const kids = uniq([e.id, ...(e.child_ids || [])]);
  const oems = uniq(e.company_ids_incl_children || e.company_ids).map(get).filter(Boolean);
  const models = DB.models.filter(m => kids.includes(m.equipment_id) || m.equipment_id === e.id);
  const subs = (e.typical_subsystem_ids || []).map(get).filter(Boolean).map(s => {
    const comps = (s.component_ids || []).map(get).filter(Boolean);
    const global = uniq([...(s.potential_supplier_ids || []), ...comps.flatMap(c => c.capable_supplier_ids || [])]).map(get).filter(Boolean);
    const india = uniq([...comps.flatMap(c => c.india_supplier_ids || []), ...global.filter(indiaHQ).map(c => c.id)]).map(get).filter(Boolean);
    return { s, comps, global, india };
  });
  const covered = subs.filter(x => x.india.length).length;
  const r = subs.length ? covered / subs.length : null;
  const risk = categoryRisk().find(x => x.id === e.id) || null;
  return { e, oems, indOem: oems.filter(indiaHQ), indPresence: oems.filter(indian), models, subs, covered, r, risk };
}

// Rule-based indication (shown on the page). r = share of required subsystems with ≥1 documented Indian supplier.
export const BUILD_RULE = "BUILD if ≥ 70 % of the typical subsystems have a documented Indian supplier; HYBRID (build the machine, import the critical subsystems) if 40–69 %; otherwise PARTNER (license / co-develop with a global OEM) when 3 or more global OEMs are documented, or BUY when fewer than 3.";
export function indication(ev) {
  if (ev.r == null) return { v: "INSUFFICIENT EVIDENCE", why: "No subsystem architecture is recorded for this category." };
  const pct = Math.round(100 * ev.r), n = ev.oems.length;
  if (ev.r >= 0.7) return { v: "BUILD", why: `${pct}% of subsystems have a documented Indian supplier.` };
  if (ev.r >= 0.4) return { v: "HYBRID", why: `${pct}% of subsystems have a documented Indian supplier; the rest would be imported.` };
  return n >= 3 ? { v: "PARTNER", why: `Only ${pct}% of subsystems have a documented Indian supplier, and ${n} global OEMs are documented as possible partners.` }
    : { v: "BUY", why: `Only ${pct}% of subsystems have a documented Indian supplier and fewer than 3 global OEMs are documented.` };
}

// India localization index (0–100), formula shown on the page.
export const LOC_RULE = "40 % Indian subsystem coverage (share of typical subsystems with a documented Indian supplier) + 20 % Indian OEM already documented (100 if any) + 20 % global alternatives (number of documented OEMs, capped at 10 = 100) + 20 % OEM India presence (share of documented OEMs with an Indian HQ or documented Indian presence).";
export function localization(ev) {
  if (ev.r == null || !ev.oems.length) return null;
  const p = { coverage: Math.round(100 * ev.r), indOem: ev.indOem.length ? 100 : 0, alt: Math.min(ev.oems.length, 10) * 10, presence: Math.round(100 * ev.indPresence.length / ev.oems.length) };
  const score = Math.round(0.4 * p.coverage + 0.2 * p.indOem + 0.2 * p.alt + 0.2 * p.presence);
  return { score, p, band: score >= 75 ? "VERY HIGH" : score >= 55 ? "HIGH" : score >= 35 ? "MEDIUM" : "LOW" };
}

const CANDIDATES = () => DB.equipment.filter(e => e.level >= 2 && (e.typical_subsystem_ids || []).length && (e.company_ids_incl_children || e.company_ids || []).length);

// ----------------------------------------------------------------- "Can we build this?"
function buildPanel(e) {
  const ev = buildEvidence(e), ind = indication(ev), loc = localization(ev);
  const rows = ev.subs.map(x => `<tr><th>${link(x.s.id)}<span class="sub">${x.comps.length} component class${x.comps.length === 1 ? "" : "es"}</span></th><td>${x.global.length} global supplier${x.global.length === 1 ? "" : "s"} documented${x.global.length ? ": " + x.global.slice(0, 5).map(c => link(c.id)).join(", ") + (x.global.length > 5 ? " …" : "") : ""}</td><td>${x.india.length ? x.india.map(c => link(c.id)).join(", ") : `<span class="na">No documented Indian supplier</span>`}</td></tr>`).join("");
  return `<div class="panel sec"><div class="row sp"><h2>${esc(e.code)} · ${esc(e.name)}</h2><span class="pill">${esc(ind.v)}</span></div>
    <p class="small"><b>Indication:</b> ${esc(ind.why)}</p>
    <div class="kpis">${kpi({ v: ev.oems.length, l: "Global OEMs documented" })}${kpi({ v: ev.indOem.length, l: "Indian OEMs" })}${kpi({ v: ev.models.length, l: "Reference models" })}${kpi({ v: `${ev.covered}/${ev.subs.length}`, l: "Subsystems with Indian supplier" })}${kpi({ v: loc ? loc.score : "—", l: "Localization index", s: loc ? loc.band : "insufficient evidence" })}${kpi({ v: ev.risk?.score ?? "—", l: "Concentration index", s: ev.risk?.band || "" })}</div>
    <h3 style="margin-top:14px">Subsystems and suppliers</h3>
    <div style="overflow-x:auto"><table class="spec"><thead><tr><th>Subsystem</th><th>Global suppliers (documented capability)</th><th>Indian suppliers</th></tr></thead><tbody>${rows || `<tr><td colspan="3" class="na">No subsystem architecture recorded.</td></tr>`}</tbody></table></div>
    <div class="grid g2 sec"><div><h3>Competitors / reference OEMs by region</h3>${playersByBloc(ev.oems.map(c => c.id)).map(g => `<p class="small" style="margin:4px 0"><b>${esc(g.bloc)}</b> (${g.cos.length}): ${g.cos.map(c => link(c.id)).join(", ")}</p>`).join("") || `<p class="na">None documented</p>`}</div><div><h3>Reference models</h3>${tags(ev.models.map(m => m.id), { max: 20, empty: "No models captured" })}</div></div>
    <p class="note">Rule: ${esc(BUILD_RULE)} Supplier links are documented capability (subsystem / component registers), not confirmed supply to a specific OEM. Not assessed because SEMICON-DB holds no evidence for them: CapEx, engineering effort, certification, IP barriers, pricing. This is an evidence summary, not a business recommendation.</p></div>`;
}

// ----------------------------------------------------------------- question router (grounded, rule-based)
const STOP = new Set(["a", "an", "the", "of", "for", "in", "india", "equipment", "system", "systems", "machine", "machines", "tool", "tools", "make", "build", "and", "we"]);
const stem = w => w.replace(/(ings?|ers?|ion|ions|s)$/, "") || w;
const toks = t => norm(t).split(/[^a-z0-9]+/).filter(w => w.length > 1 && !STOP.has(w)).map(stem);
// Equipment category whose name covers every content word of the request (bonder ≈ bonding, prober ≈ probing).
// Ties go to the category with the most documented suppliers and subsystems. Null when nothing covers the request.
function pickEquipment(q) {
  const want = toks(q); if (!want.length) return null;
  const scored = DB.equipment.map(e => { const have = toks(e.name); const hit = want.filter(w => have.includes(w)).length;
    return { e, hit, extra: have.length - hit, weight: (e.company_ids_incl_children || []).length + (e.typical_subsystem_ids || []).length }; })
    .filter(x => x.hit === want.length).sort((a, b) => a.extra - b.extra || b.weight - a.weight);
  return scored.length ? scored[0].e : null;
}
// Categories sharing at least one content word with the request, for "did you mean".
function nearEquipment(q) {
  const want = toks(q);
  return DB.equipment.map(e => ({ e, hit: want.filter(w => toks(e.name).includes(w)).length })).filter(x => x.hit)
    .sort((a, b) => b.hit - a.hit || (b.e.company_ids_incl_children || []).length - (a.e.company_ids_incl_children || []).length).slice(0, 8).map(x => x.e);
}
function pickCompany(q) {
  const exact = resolveCompany(q); if (exact) return exact; // canonical name, alias, short form, ticker
  const r = search(q, { limit: 50 }); const hit = [...r.matches, ...r.partial].find(x => x.kind === "company"); return hit ? get(hit.id) : null;
}
// ---- company comparison (resolves "ASML Holding N.V.", "AMAT", "TEL" …)
function compareAnswer(names) {
  const cs = names.map(n => ({ n, c: pickCompany(n) }));
  const ok = uniq(cs.filter(x => x.c).map(x => x.c.id)).map(get);
  const miss = cs.filter(x => !x.c).map(x => x.n);
  if (ok.length < 2) return `<div class="panel"><p class="na">Could not resolve at least two companies${miss.length ? ` (not found: ${esc(miss.join(", "))})` : ""}.</p></div>`;
  const nm = c => DB.models.filter(m => m.company_id === c.id && !m.is_component).length;
  const rev = c => { const f = (c.financials || []).filter(x => /^Revenue$/i.test(x.metric)).sort((a, b) => String(b.fiscal_year).localeCompare(String(a.fiscal_year)))[0];
    return f ? `${esc(f.currency)} ${Number(f.value).toLocaleString()} m<span class="sub">${esc(f.fiscal_year)} · ${esc(f.value_type)}</span>` : `<span class="na">Not captured</span>`; };
  const shared = ok[0].equipment_ids.filter(e => ok.every(c => c.equipment_ids.includes(e)));
  const rows = [
    ["HQ", c => esc([c.hq.city, c.hq.country].filter(Boolean).join(", ") || "Not captured")], ["Type", c => esc(c.company_type)],
    ["Equipment categories", c => `${c.equipment_ids.length}<span class="sub">${c.equipment_ids.slice(0, 6).map(e => esc(get(e)?.name || e)).join(", ")}${c.equipment_ids.length > 6 ? " …" : ""}</span>`],
    ["Equipment models captured", c => String(nm(c))], ["Revenue (latest captured)", rev], ["India presence", c => (c.hq.country === "India" ? "HQ in India" : c.india.has_presence ? esc(c.india.summary || "Documented") : `<span class="muted">None documented</span>`)],
    ["Supplier criticality", c => String(criticality(c.id).score)], ["SEMICON-DB Intelligence Score", c => String(intelScore(c).score)],
    ["Verification", c => esc(c.verification.replace(/_/g, " ").toLowerCase())], ["Sources", c => String(c.source_ids.length)]];
  return `<div class="panel"><h2>Comparison: ${ok.map(c => link(c.id)).join(" · ")}</h2>
    <div style="overflow-x:auto"><table class="spec"><thead><tr><th></th>${ok.map(c => `<th>${link(c.id)}</th>`).join("")}</tr></thead><tbody>${rows.map(([l, f]) => `<tr><th>${esc(l)}</th>${ok.map(c => `<td>${f(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
    <p class="small" style="margin-top:8px"><b>Shared categories (${shared.length}):</b> ${shared.length ? shared.map(e => link(e)).join(", ") : "none"}</p>
    ${miss.length ? `<p class="na">Not resolved: ${esc(miss.join(", "))}</p>` : ""}
    <p class="note">Rule: names resolved through entity-resolution keys (canonical name, aliases, short forms, tickers), then compared on captured fields only. Strengths, weaknesses, pricing and market position are not stated because SEMICON-DB holds no evidence for them. <a href="${href("/compare/companies", { companies: ok.slice(0, 4).map(c => c.id) })}">Open the full company comparison →</a></p></div>`;
}
// ---- requirement-based laser supplier matching ("I need a 200W pulsed laser for semiconductor marking")
const LASER_TYPES = { pulsed: /pulsed|q-switch|mopa|nanosecond|\bns\b/i, cw: /\bcw\b|continuous/i, fiber: /fib(er|re)/i, uv: /\buv\b|ultraviolet|355|343/i, green: /green|532/i, ir: /\bir\b|infrared|1064/i,
  ultrafast: /ultrafast|picosecond|femtosecond|\bps\b|\bfs\b/i, excimer: /excimer|308/i, co2: /co2|co₂/i };
const APPS = ["marking", "dicing", "grooving", "drilling", "annealing", "lift-off", "welding", "cutting", "debonding", "repair", "scribing", "ablation", "trimming"];
const numOf = s => { const m = /([\d.]+)/.exec(String(s || "")); return m ? +m[1] : null; };
function laserMatch(q) {
  const pw = /(\d+(?:\.\d+)?)\s*(k?)w\b/i.exec(q), wl = /(\d{3,4})\s*nm/i.exec(q);
  const need = { power: pw ? +pw[1] * (pw[2] ? 1000 : 1) : null, wl: wl ? +wl[1] : null, types: Object.keys(LASER_TYPES).filter(k => LASER_TYPES[k].test(q)), app: APPS.find(a => q.toLowerCase().includes(a.replace("-", " ")) || q.toLowerCase().includes(a)) || null };
  const models = DB.models.filter(m => m.laser);
  const rows = models.map(m => {
    const L = m.laser, txt = [L.types_text, m.application_text, m.technology_text, m.name].join(" ");
    const met = [], unknown = [], fail = [];
    if (need.app) (new RegExp(need.app.replace("-", "[- ]?"), "i").test(txt) ? met : fail).push(`application: ${need.app}`);
    need.types.forEach(t => (LASER_TYPES[t].test(txt + " " + (L.pulse_duration || "") + " " + (L.wavelength || "")) ? met : unknown).push(`type: ${t}`));
    if (need.power) { const v = numOf(L.average_power) != null ? numOf(L.average_power) * (/kw/i.test(L.average_power) ? 1000 : 1) : null; if (v == null) unknown.push("average power"); else (v >= need.power ? met : fail).push(`power ≥ ${need.power} W (stated ${L.average_power})`); }
    if (need.wl) { const ws = String(L.wavelength || "").match(/\d{3,4}/g)?.map(Number) || []; if (!ws.length) unknown.push("wavelength"); else (ws.some(w => Math.abs(w - need.wl) <= 0.05 * need.wl) ? met : fail).push(`wavelength ${need.wl} nm (stated ${L.wavelength})`); }
    return { m, c: get(m.company_id), met, unknown, fail, score: 3 * met.length - unknown.length };
  }).filter(r => !r.fail.length && r.met.length).sort((a, b) => b.score - a.score || a.unknown.length - b.unknown.length).slice(0, 25);
  // laser-source suppliers (component class "laser source" and laser-source companies), for buyers of the laser itself
  const srcCls = DB.components.filter(k => /laser/i.test(k.name));
  const sources = uniq([...DB.companies.filter(c => c.company_type === "Laser source").map(c => c.id), ...srcCls.flatMap(k => [...(k.capable_supplier_ids || []), ...(k.india_supplier_ids || [])])]).map(get).filter(Boolean)
    .map(c => { const ms = DB.models.filter(m => m.company_id === c.id && m.laser); const txt = [c.primary_equipment, c.description, ...ms.map(m => [m.name, m.laser.types_text, m.application_text].join(" "))].join(" ");
      const met = [...need.types.filter(t => LASER_TYPES[t].test(txt)), ...(need.app && new RegExp(need.app.replace("-", "[- ]?"), "i").test(txt) ? [need.app] : [])];
      const pwr = ms.map(m => m.laser.average_power).filter(Boolean); return { c, ms, met, pwr }; })
    .sort((a, b) => b.met.length - a.met.length || b.ms.length - a.ms.length || a.c.name.localeCompare(b.c.name));
  return `<div class="panel"><h2>Requirement match: ${esc([need.power && `${need.power} W`, need.wl && `${need.wl} nm`, ...need.types, need.app].filter(Boolean).join(" · ") || "laser")}</h2>
    <h3>Laser sources — documented suppliers (${sources.length})</h3>
    <table class="spec"><thead><tr><th>#</th><th>Supplier</th><th>Stated match</th><th>Power published</th><th>HQ · India</th><th>Captured laser models</th></tr></thead><tbody>${sources.map(({ c, ms, met, pwr }, i) =>
      `<tr><td>${i + 1}</td><th>${link(c.id)}</th><td>${met.length ? esc(met.join(", ")) : `<span class="muted">—</span>`}</td><td>${pwr.length ? esc(pwr.join("; ")) : `<span class="na">Not published</span>`}</td><td>${esc(c.hq.country || "—")} · ${c.hq.country === "India" ? "HQ" : c.india.has_presence ? "presence" : "—"}</td><td>${ms.length ? ms.map(m => link(m.id)).join(", ") : `<span class="na">No model captured</span>`}</td></tr>`).join("")}</tbody></table>
    <h3 style="margin-top:12px">Machines and modules matching (${rows.length})</h3>
    ${rows.length ? `<table class="spec"><thead><tr><th>#</th><th>Product</th><th>Meets</th><th>Not published</th></tr></thead><tbody>${rows.map((r, i) => `<tr><td>${i + 1}</td><th>${link(r.m.id)}<span class="sub">${esc(r.c?.name || "")} · ${esc(r.c?.hq.country || "")}</span></th><td>${esc(r.met.join("; "))}</td><td>${r.unknown.length ? `<span class="na">${esc(r.unknown.join("; "))}</span>` : "—"}</td></tr>`).join("")}</tbody></table>` : `<p class="na">No laser model in SEMICON-DB meets the stated requirements on published values.</p>`}
    <p class="note">Rule: a product is listed when at least one stated requirement is met by a published value or its stated laser type / application, and none is contradicted. Ranking: 3 points per requirement met, minus 1 per requirement whose value is not published. Specifications are sparse in the evidence (average power is published for ${DB.models.filter(m => m.laser?.average_power).length} laser models), so most suppliers appear without spec confirmation. Price, lead time and availability are not captured.</p></div>`;
}
// ---- business questions answered from derived tables
function concentrationAnswer() {
  const rows = categoryRisk().filter(r => r.n).sort((a, b) => b.score - a.score).slice(0, 15);
  return `<div class="panel"><h2>Most concentrated documented supplier bases</h2><table class="spec"><tbody>${rows.map(r => `<tr><th>${link(r.id)}</th><td><b>${r.score}</b> <span class="pill">${r.band}</span><span class="sub">${esc(r.why)}</span></td></tr>`).join("")}</tbody></table><p class="note">Rule: the concentration index on <a href="#/intelligence/risk">Supply-chain concentration</a>. Thin coverage can look like concentration; read as “where to look”.</p></div>`;
}
function localizeAnswer() {
  const rows = CANDIDATES().map(e => { const ev = buildEvidence(e); return { e, ev, loc: localization(ev), ind: indication(ev) }; }).filter(r => r.loc).sort((a, b) => b.loc.score - a.loc.score).slice(0, 15);
  return `<div class="panel"><h2>Highest India localization index</h2><table class="spec"><tbody>${rows.map(r => `<tr><th><a href="${href("/intelligence/analyst", { eq: r.e.id })}">${esc(r.e.name)}</a><span class="sub">${esc(r.e.code)}</span></th><td><b>${r.loc.score}</b> <span class="pill">${r.loc.band}</span> <span class="pill">${esc(r.ind.v)}</span><span class="sub">${r.ev.covered}/${r.ev.subs.length} subsystems with an Indian supplier · ${r.ev.indOem.length} Indian OEMs · ${r.ev.oems.length} OEMs</span></td></tr>`).join("")}</tbody></table><p class="note">Rule: ${esc(LOC_RULE)} “Realistic” also depends on CapEx, IP and demand, which are not scored.</p></div>`;
}
function facilitiesAnswer(q) {
  const F = (DB.facilities || []).filter(f => !/india/i.test(q) || f.country === "India");
  const want = /construction/i.test(q) ? ["UNDER_CONSTRUCTION", "FOUNDATION_LAID"] : /operat|production|running/i.test(q) ? ["OPERATIONAL", "PILOT_PRODUCTION"] : /approv/i.test(q) ? ["APPROVED"] : null;
  const hit = want ? F.filter(f => want.includes(f.status)) : F;
  return `<div class="panel"><h2>${hit.length} facilit${hit.length === 1 ? "y" : "ies"}${want ? ` with latest captured status ${want.map(w => STATUS_LABEL[w]).join(" / ")}` : ""}</h2>
    <table class="spec"><tbody>${hit.map(f => `<tr><th>${link(f.id)}<span class="sub">${esc(f.city)}, ${esc(f.state)} · ${esc(f.facility_type)}</span></th><td>${esc(STATUS_LABEL[f.status] || f.status)} · ${esc(f.status_date || "")}<span class="sub">${investText(f)}</span></td></tr>`).join("")}</tbody></table>
    <p class="note">Rule: latest dated milestone in a cited source. “Under construction” is shown via the foundation-laid milestone where no later construction update is captured — progress after the last source is not assumed. <a href="#/facilities">All facilities →</a></p></div>`;
}
function partnersAnswer() {
  const P = DB.intel.partner_fit || [];
  return `<div class="panel"><h2>Documented partner-fit candidates (${P.length})</h2><p class="small">From the TEAL partner-fit table: documented fit dimensions per candidate, no recommendation. <a href="#/intelligence/partners">Open Partner Fit →</a></p>${tags(uniq(P.map(p => p.company_id)).filter(id => get(id)), { max: 60 })}</div>`;
}
function answer(q) {
  const s = q.trim(); if (!s) return "";
  let m;
  if ((m = /^compare\s+(.+?)\??$/i.exec(s)) || /\s(?:vs\.?|versus)\s/i.test(s)) return compareAnswer((m ? m[1] : s).split(/\s+(?:vs\.?|versus|against|and|with)\s+|\s*,\s*/i).map(x => x.trim()).filter(Boolean));
  if (/\blaser\b/i.test(s) && (/\d+(?:\.\d+)?\s*k?w\b|\d{3,4}\s*nm/i.test(s) || /^(?:i\s+)?(?:need|want|require|looking for|find)\b/i.test(s))) return laserMatch(s);
  if (/(highest|most|greatest)\b.*concentrat|concentrat.*(highest|most)|single[- ]source/i.test(s)) return concentrationAnswer();
  if (/locali[sz]/i.test(s) && !/^(?:can|could)\b/i.test(s)) return localizeAnswer();
  if (/\b(facilit(y|ies)|plants?|units?|fabs?|osats?|atmps?)\b/i.test(s) && /\b(under construction|operational|approved|in india|indian)\b/i.test(s) && !/^(?:who|which companies) (?:supplies|makes)/i.test(s)) return facilitiesAnswer(s);
  if (/teal/i.test(s) && /partner/i.test(s)) return partnersAnswer();
  if ((m = /^(?:can|could) (?:we|india|teal|i) (?:build|make|manufacture|develop) (?:an? )?(.+?)(?: in india)?\??$/i.exec(s))) {
    const e = pickEquipment(m[1]);
    return e ? `<p class="small">Interpreted as: <b>build capability for ${esc(e.name)}</b> (${esc(e.code)}). <a href="${href("/intelligence/analyst", { eq: e.id })}">Open the full analysis</a></p>${buildPanel(e)}` : notFound(m[1]);
  }
  if ((m = /^(?:who|which companies) (?:supplies|supply|makes|make|manufactures|manufacture|sells|sell|offers|offer)\s+(.+?)\??$/i.exec(s)) || (m = /^(?:suppliers|makers|manufacturers) (?:of|for)\s+(.+?)\??$/i.exec(s))) {
    const e = pickEquipment(m[1]);
    if (e) { const ev = buildEvidence(e);
      return `<div class="panel"><h2>${ev.oems.length} documented suppliers of ${esc(e.name)}</h2>${tags(ev.oems.map(c => c.id), { max: 80 })}<p class="small" style="margin-top:8px">India-linked: ${ev.indPresence.length ? ev.indPresence.map(c => link(c.id)).join(", ") : "none documented"}. Models: ${ev.models.length}.</p><p class="note">Rule: companies with ${esc(e.name)} as a source-confirmed category or with a model in it. <a href="${hrefOf(e.id)}">Category page</a></p></div>`; }
    const cos = companyMatches(m[1]);
    return cos.length ? `<div class="panel"><h2>${cos.length} companies matching “${esc(m[1])}”</h2>${tags(cos.map(c => c.id), { max: 80 })}<p class="note">No equipment category covers “${esc(m[1])}”, so this lists companies whose recorded profile, products or discovery keywords mention every word. Rule: text match on company records only. <a href="${href("/search", { q: m[1] })}">Open in search</a></p></div>` : notFound(m[1]);
  }
  if ((m = /^(?:alternatives?|competitors?|rivals?|peers?) (?:to|for|of)\s+(.+?)\??$/i.exec(s))) {
    const c = pickCompany(m[1]); if (!c) return notFound(m[1]);
    const peers = DB.companies.filter(x => x.id !== c.id).map(x => ({ x, shared: x.equipment_ids.filter(id => c.equipment_ids.includes(id)) })).filter(p => p.shared.length).sort((a, b) => b.shared.length - a.shared.length).slice(0, 25);
    return `<div class="panel"><h2>Companies overlapping with ${link(c.id)}</h2>${peers.length ? `<table class="spec"><tbody>${peers.map(p => `<tr><th>${link(p.x.id)}<span class="sub">${esc(p.x.hq.country || "Country not captured")}</span></th><td>${p.shared.length} shared ${p.shared.length === 1 ? "category" : "categories"}: ${p.shared.slice(0, 5).map(id => link(id)).join(", ")}</td></tr>`).join("")}</tbody></table>` : `<p class="na">No other company shares a confirmed equipment category.</p>`}<p class="note">Rule: ranked by number of shared source-confirmed equipment categories. Overlap is not a claim of direct competition.</p></div>`;
  }
  // fallback: requirement-based matching over the index (supplier matching)
  const r = search(s, { limit: 30 });
  const items = [...r.matches, ...r.partial].slice(0, 20);
  return `<div class="panel"><h2>Best matching records</h2>${items.length ? `<table class="spec"><tbody>${items.map(x => `<tr><th><a href="${hrefOf(x.id)}">${esc(x.title)}</a><span class="sub">${esc(x.kind)}${x.sub ? " · " + esc(x.sub) : ""}</span></th><td>${x.unknown.length ? `<span class="na">Partial — not published: ${esc(x.unknown.join(", "))}</span>` : "Matches all stated constraints"}</td></tr>`).join("")}</tbody></table>` : `<p class="na">No record matches. Try fewer words.</p>`}
    <p class="note">Rule: full-text and synonym match with your constraints (wafer size, material, country, India). Records that do not publish a constrained value are shown as partial, never silently included. <a href="${href("/search", { q: s })}">Open in search</a></p></div>`;
}
function companyMatches(t) {
  const r = search(t, { limit: 80 }); return uniq(r.matches.filter(x => x.kind === "company").map(x => x.id)).map(get).filter(Boolean);
}
const notFound = t => { const near = nearEquipment(t);
  return `<div class="panel"><p class="na">“${esc(t)}” does not match an equipment category or company in SEMICON-DB.</p>${near.length ? `<p class="small">Closest categories: ${near.map(e => `<a href="${href("/intelligence/analyst", { eq: e.id })}">${esc(e.code)} · ${esc(e.name)}</a>`).join(" · ")}</p>` : ""}</div>`; };

const EXAMPLES = ["Can we build a laser marking machine in India?", "Who supplies wafer probing equipment?", "Compare ASML vs Canon vs Nikon", "Compare KLA, Onto and Hitachi High-Tech", "I need a 200W pulsed laser for semiconductor marking", "Which equipment categories have the highest supplier concentration?", "Which equipment can be localized in India?", "Which Indian semiconductor facilities are under construction?", "Alternatives to Hesse Mechatronics", "300 mm sputtering systems in Japan"];

function analyst({ params }) {
  const q = params.get("q") || "", eqId = params.get("eq");
  const focus = eqId ? get(eqId) : null;
  const cands = CANDIDATES();
  const locRows = cands.map(e => { const ev = buildEvidence(e); return { id: e.id, e, ev, loc: localization(ev), ind: indication(ev) }; }).filter(r => r.loc);
  const html = head("Analyst", "Ask a question in plain words and get an answer built only from SEMICON-DB records, with the rule used and links to the evidence. It also includes the “Can we build this?” engine and the India localization index.")
    + `<div class="panel"><label class="small" for="aq"><b>Ask</b> — e.g. “Can we build a laser marking machine in India?”, “Who supplies wafer probing equipment?”, “Alternatives to Hesse Mechatronics”, or a requirement such as “300 mm sputtering systems in Japan”.</label>
      <input id="aq" class="input" type="search" style="width:100%;margin-top:6px" value="${esc(q)}" data-qparam="q" placeholder="Type a question…" aria-label="Ask a question">
      <div class="row" style="margin-top:8px;flex-wrap:wrap;gap:6px">${EXAMPLES.map(x => `<a class="btn sm" href="${href("/intelligence/analyst", { q: x })}">${esc(x)}</a>`).join("")}</div></div>
    ${q ? `<div class="sec">${answer(q)}</div>` : ""}
    <div class="panel sec"><h2>Can we build this?</h2><label class="small">Equipment category <select class="input" data-param="eq" aria-label="Equipment category"><option value="">Choose…</option>${cands.map(e => `<option value="${e.id}"${e.id === eqId ? " selected" : ""}>${esc(e.code)} · ${esc(e.name)}</option>`).join("")}</select></label>
      <p class="note">${esc(BUILD_RULE)}</p></div>
    ${focus ? buildPanel(focus) : ""}
    <div class="panel sec"><h2>India localization index</h2><p class="small">${esc(LOC_RULE)} Bands: VERY HIGH ≥ 75 · HIGH 55–74 · MEDIUM 35–54 · LOW &lt; 35.</p><p class="note">Technology complexity, CapEx, IP barriers, talent and demand are part of a full localization assessment but are not scored here because SEMICON-DB has no evidence for them. Use the <a href="#/intelligence/india-opportunity">India opportunity</a> page to add your own criteria.</p></div>
    <div class="sec">${dataTable({ id: "loc-index", rows: locRows, title: "Localization index by equipment category", exportName: "semicon-db-localization-index", columns: [
      { k: "cat", label: "Equipment category", pin: true, get: r => r.e.name, html: r => `<a class="rowlink" href="${href("/intelligence/analyst", { eq: r.id })}">${esc(r.e.name)}</a><span class="sub">${esc(r.e.code)} · ${esc(r.e.group_name || "")}</span>` },
      { k: "score", label: "Index", num: true, get: r => r.loc.score, html: r => `<b>${r.loc.score}</b> <span class="pill">${r.loc.band}</span>` },
      { k: "ind", label: "Indication", get: r => r.ind.v, html: r => `<span class="pill">${esc(r.ind.v)}</span>` },
      { k: "cov", label: "Indian subsystem coverage", get: r => r.loc.p.coverage, html: r => `${r.ev.covered}/${r.ev.subs.length}<span class="sub">${r.loc.p.coverage}%</span>` },
      { k: "oems", label: "Global OEMs", num: true, get: r => r.ev.oems.length },
      { k: "indoem", label: "Indian OEMs", num: true, get: r => r.ev.indOem.length, html: r => r.ev.indOem.length ? r.ev.indOem.map(c => link(c.id)).join(", ") : "0" },
      { k: "pres", label: "OEMs with India presence", get: r => r.loc.p.presence, html: r => `${r.ev.indPresence.length}<span class="sub">${r.loc.p.presence}%</span>` }] })}</div>
    ${belowEquipment()}`;
  return { title: "Analyst", html };
}

// localization below equipment level: subsystems and component classes
function belowEquipment() {
  const subs = subsystemLocalization(), comps = componentLocalization().filter(r => r.evidence);
  return `<div class="panel sec"><h2>Localization by subsystem and component class</h2><p class="small">Subsystem: share of its component classes with a documented Indian supplier. Component class: ${esc(COMP_LOC_METHOD)}</p>
    <p class="note">Component-level supplier evidence is thin: ${comps.length} of ${DB.components.length} component classes have any documented supplier, so most rows read LOW for lack of evidence, not for lack of capability.</p></div>
    <div class="grid g2"><div>${dataTable({ id: "loc-sub", rows: subs, title: "Subsystems", exportName: "semicon-db-subsystem-localization", columns: [
      { k: "s", label: "Subsystem", pin: true, get: r => r.s.name, html: r => link(r.id) }, { k: "score", label: "Index", num: true, get: r => r.score, html: r => `<b>${r.score}</b> <span class="pill">${r.band}</span>` },
      { k: "in", label: "Classes with Indian supplier", get: r => r.withIn, html: r => `${r.withIn}/${r.n}` }, { k: "any", label: "Classes with any supplier", get: r => r.withAny, html: r => `${r.withAny}/${r.n}` }, { k: "oems", label: "Typical OEMs", num: true, get: r => r.oems }] })}</div>
    <div>${dataTable({ id: "loc-comp", rows: comps, title: "Component classes with supplier evidence", exportName: "semicon-db-component-localization", columns: [
      { k: "k", label: "Component class", pin: true, get: r => r.k.name, html: r => `${link(r.id)}<span class="sub">${esc(r.sub?.name || "")}</span>` }, { k: "score", label: "Index", num: true, get: r => r.score, html: r => `<b>${r.score}</b> <span class="pill">${r.band}</span>` },
      { k: "in", label: "Indian suppliers", num: true, get: r => r.india.length, html: r => r.india.length ? r.india.map(x => link(x)).join(", ") : "0" }, { k: "gl", label: "Global alternatives", num: true, get: r => r.global.length }, { k: "uses", label: "Used in categories", num: true, get: r => r.uses }] })}</div></div>`;
}

export const ANALYST_MODULES = [["analyst", "Analyst (ask · build · localize)", "Ask questions answered from records with the rule shown; “Can we build this?” engine; India localization index per equipment category."]];
export const ANALYST_SUB = { analyst };
export { empty };

// Analyst workspace: grounded question answering, "Can we build this?" and the India localization index.
// No language model and no hidden scoring: every answer is assembled from SEMICON-DB records with the rule
// that produced it shown next to it. Where the database holds no evidence, the answer says so.
import { DB, get, hrefOf } from "../core/store.js";
import { esc, uniq, norm } from "../core/util.js";
import { href } from "../core/router.js";
import { search } from "../core/search.js";
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
    <div class="grid g2 sec"><div><h3>Competitors / reference OEMs</h3>${tags(ev.oems.map(c => c.id), { max: 30 })}</div><div><h3>Reference models</h3>${tags(ev.models.map(m => m.id), { max: 20, empty: "No models captured" })}</div></div>
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
function pickCompany(q) { const r = search(q, { limit: 50 }); const hit = [...r.matches, ...r.partial].find(x => x.kind === "company"); return hit ? get(hit.id) : null; }
function answer(q) {
  const s = q.trim(); if (!s) return "";
  let m;
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

const EXAMPLES = ["Can we build a laser marking machine in India?", "Who supplies wafer probing equipment?", "Alternatives to Hesse Mechatronics", "Can we build a wire bonder?", "Who makes molecular beam epitaxy systems?", "300 mm sputtering systems in Japan", "laser dicing equipment India"];

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
      { k: "pres", label: "OEMs with India presence", get: r => r.loc.p.presence, html: r => `${r.ev.indPresence.length}<span class="sub">${r.loc.p.presence}%</span>` }] })}</div>`;
  return { title: "Analyst", html };
}

export const ANALYST_MODULES = [["analyst", "Analyst (ask · build · localize)", "Ask questions answered from records with the rule shown; “Can we build this?” engine; India localization index per equipment category."]];
export const ANALYST_SUB = { analyst };
export { empty };

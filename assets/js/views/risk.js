// Supply-chain concentration, critical suppliers, country × equipment heatmap and the events timeline.
// Everything here is DERIVED from the records in SEMICON-DB: it describes the documented supplier base,
// not the market. Every score shows its inputs and formula; nothing is hidden or estimated.
import { DB, get, hrefOf } from "../core/store.js";
import { esc, uniq, countBy, sortedEntries } from "../core/util.js";
import { pageHead, link, tags, bars, kpi, srcBtn, conf, empty } from "../ui/components.js";
import { dataTable } from "../ui/table.js";

const head = (t, lede) => pageHead({ eyebrow: "Intelligence", title: t, lede, crumb: [["Home", "#/"], ["Intelligence", "#/intelligence"], [t, null]] });
const indian = c => c.hq.country === "India" || c.india.has_presence;

// ----------------------------------------------------------------- concentration index per equipment category
// Score 0–100 = 40 % supplier scarcity + 35 % geographic concentration (HHI of HQ countries)
//             + 15 % no India-linked supplier + 10 % evidence weakness (share of suppliers not VERIFIED).
const SCARCITY = n => (n <= 1 ? 100 : n === 2 ? 75 : n <= 4 ? 50 : n <= 9 ? 25 : 0);
export const RISK_METHOD = "40 % supplier scarcity (1 documented supplier = 100, 2 = 75, 3–4 = 50, 5–9 = 25, 10+ = 0) + 35 % geographic concentration (Herfindahl index of supplier HQ countries, 0–100) + 15 % no India-linked supplier (100 if none) + 10 % evidence weakness (share of suppliers whose record is not VERIFIED).";
let CACHE = null;
export function categoryRisk() {
  if (CACHE) return CACHE;
  const leaf = DB.equipment.filter(e => !(e.child_ids || []).length && e.level > 1);
  CACHE = leaf.map(e => {
    const cos = uniq(e.company_ids).map(get).filter(Boolean);
    const n = cos.length;
    if (!n) return { id: e.id, e, n: 0 };
    const known = cos.filter(c => c.hq.country);
    const byC = sortedEntries(countBy(known, c => c.hq.country));
    const hhi = known.length ? Math.round(byC.reduce((a, [, v]) => a + (v / known.length) ** 2, 0) * 100) : null;
    const top = byC[0] ? { country: byC[0][0], share: Math.round(100 * byC[0][1] / known.length) } : null;
    const ind = cos.filter(indian);
    const ver = cos.filter(c => c.verification === "VERIFIED").length;
    const parts = { scarcity: SCARCITY(n), geo: hhi ?? 50, india: ind.length ? 0 : 100, evidence: Math.round(100 * (n - ver) / n) };
    const score = Math.round(0.4 * parts.scarcity + 0.35 * parts.geo + 0.15 * parts.india + 0.1 * parts.evidence);
    const band = score >= 70 ? "HIGH" : score >= 45 ? "ELEVATED" : score >= 25 ? "MODERATE" : "LOW";
    const why = [`${n} documented supplier${n === 1 ? "" : "s"} (scarcity ${parts.scarcity})`,
      top ? `${top.share}% HQ in ${top.country}${hhi != null ? `, HHI ${hhi}` : ""}` : "HQ countries not captured (geo 50)",
      ind.length ? `${ind.length} India-linked` : "no India-linked supplier", `${ver}/${n} verified`].join(" · ");
    return { id: e.id, e, n, cos, byC, hhi, top, ind, ver, parts, score, band, why };
  });
  return CACHE;
}

function riskView() {
  const all = categoryRisk(), rows = all.filter(r => r.n), none = all.filter(r => !r.n);
  const bands = Object.fromEntries(countBy(rows, r => r.band));
  const single = rows.filter(r => r.n === 1);
  // supplier centrality: categories covered, sole-supplier categories, customer links, models
  const sole = Object.fromEntries(countBy(single, r => r.cos[0].id));
  const catsOf = Object.fromEntries(countBy(rows.flatMap(r => r.cos.map(c => ({ c: c.id }))), x => x.c));
  const custLinks = Object.fromEntries(countBy(DB.relationships.filter(r => r.type === "supplies_equipment_to"), r => r.from));
  const nModels = Object.fromEntries(countBy(DB.models, m => m.company_id));
  const central = Object.keys(catsOf).map(id => ({ id, c: get(id), cats: catsOf[id], sole: sole[id] || 0, cust: custLinks[id] || 0, models: nModels[id] || 0 }))
    .sort((a, b) => b.sole - a.sole || b.cats - a.cats).slice(0, 40);
  const table = dataTable({ id: "risk", rows, title: "Concentration index by equipment category", exportName: "semicon-db-concentration", columns: [
    { k: "cat", label: "Equipment category", pin: true, get: r => r.e.name, html: r => `<a class="rowlink" href="${hrefOf(r.id)}">${esc(r.e.name)}</a><span class="sub">${esc(r.e.code)} · ${esc(r.e.group_name)}</span>` },
    { k: "score", label: "Index (0–100)", num: true, get: r => r.score, html: r => `<b>${r.score}</b> <span class="pill">${r.band}</span>` },
    { k: "n", label: "Suppliers", num: true, get: r => r.n },
    { k: "top", label: "Top HQ country", get: r => r.top?.country || "", html: r => r.top ? `${esc(r.top.country)}<span class="sub">${r.top.share}% of suppliers</span>` : `<span class="na">Not captured</span>` },
    { k: "hhi", label: "HHI", num: true, get: r => r.hhi },
    { k: "india", label: "India-linked", num: true, get: r => r.ind.length },
    { k: "ver", label: "Verified", get: r => `${r.ver}/${r.n}` },
    { k: "why", label: "Explanation", wrap: true, get: r => r.why },
    { k: "sup", label: "Suppliers", wrap: true, get: r => r.cos.map(c => c.name).join("; "), html: r => r.cos.slice(0, 6).map(c => link(c.id)).join(", ") + (r.n > 6 ? ` <span class="muted">+${r.n - 6}</span>` : "") }] });
  const html = head("Supply-chain concentration", "Where the documented supplier base is thin or geographically concentrated. Derived from SEMICON-DB records only — a category with few records may simply be under-researched, so read the index as “where to look”, not as market risk.")
    + `<div class="kpis">${kpi({ v: rows.length, l: "Categories with suppliers" })}${kpi({ v: bands.HIGH || 0, l: "High concentration (≥70)" })}${kpi({ v: bands.ELEVATED || 0, l: "Elevated (45–69)" })}${kpi({ v: single.length, l: "Single documented supplier" })}${kpi({ v: none.length, l: "No documented supplier" })}</div>
    <div class="panel sec"><h2>Method</h2><p class="small">${esc(RISK_METHOD)}</p><p class="note">Bands: HIGH ≥ 70 · ELEVATED 45–69 · MODERATE 25–44 · LOW &lt; 25. Not included because SEMICON-DB holds no evidence for them yet: lead times, export controls, patent dependency, raw-material exposure. They are not guessed.</p></div>
    <div class="sec">${table}</div>
    <div class="grid g2 sec"><div class="panel"><h2>Critical supplier nodes</h2><p class="small ink2">Companies that are the only documented supplier for one or more categories, then by breadth of categories covered.</p>
      <table class="spec"><tbody>${central.slice(0, 20).map(x => `<tr><th>${link(x.id)}<span class="sub">${esc(x.c.hq.country || "Country not captured")}</span></th><td>${x.sole ? `<b>Sole documented supplier in ${x.sole}</b> · ` : ""}${x.cats} categories · ${x.models} models · ${x.cust} customer links</td></tr>`).join("")}</tbody></table></div>
      <div class="panel"><h2>Categories with no documented supplier (${none.length})</h2>${tags(none.map(r => r.id), { max: 80 })}<p class="note">Research targets: the taxonomy has these nodes but no company is linked to them yet.</p></div></div>
    <div class="panel sec"><h2>Country × equipment group</h2>${heatmap()}<p class="note">Number of companies headquartered in each country with at least one confirmed category in the group. Darker = more companies. Only countries with 3+ companies shown.</p></div>`;
  return { title: "Supply-chain concentration", html };
}

function heatmap() {
  const groups = DB.equipment.filter(e => e.level === 1).sort((a, b) => a.code.localeCompare(b.code));
  const cos = DB.companies.filter(c => c.hq.country);
  const countries = sortedEntries(countBy(cos, c => c.hq.country)).filter(([, v]) => v >= 3).map(([k]) => k);
  const cell = {}; let max = 1;
  cos.forEach(c => uniq(c.equipment_ids.map(id => get(id)?.group_code).filter(Boolean)).forEach(g => { const k = c.hq.country + "|" + g; cell[k] = (cell[k] || 0) + 1; max = Math.max(max, cell[k]); }));
  return `<div style="overflow-x:auto"><table class="heat"><thead><tr><th>Country</th>${groups.map(g => `<th title="${esc(g.name)}"><a href="${hrefOf(g.id)}">${esc(g.code)}</a></th>`).join("")}</tr></thead><tbody>${countries.map(ct =>
    `<tr><th><a href="#/companies?country=${encodeURIComponent(ct)}">${esc(ct)}</a></th>${groups.map(g => { const v = cell[ct + "|" + g.code] || 0;
      return `<td title="${esc(`${ct} · ${g.name}: ${v}`)}" style="background:color-mix(in srgb, var(--s2) ${v ? Math.round(12 + 70 * v / max) : 0}%, transparent)">${v || ""}</td>`; }).join("")}</tr>`).join("")}</tbody></table></div>
    <p class="small ink2">${groups.map(g => `<b>${esc(g.code)}</b> ${esc(g.name)}`).join(" · ")}</p>`;
}

// ----------------------------------------------------------------- events timeline (deals + dated company press releases)
function events() {
  const cites = new Map();
  [...DB.companies, ...DB.models].forEach(r => (r.source_ids || []).forEach(s => { if (!cites.has(s)) cites.set(s, new Set()); cites.get(s).add(r.company_id || r.id); }));
  const deals = DB.deals.filter(d => d.date).map(d => ({ id: d.id, date: d.date, type: d.event_type, title: `${d.party_a}${d.party_b ? " — " + d.party_b : ""}${d.technology ? ": " + d.technology : ""}`, cos: [d.party_a_id, d.party_b_id].filter(x => x && get(x)), status: d.status, confidence: d.confidence, source_ids: d.source_ids, kind: "Deal record" }));
  const prs = DB.sources.filter(s => /Press release|Investor announcement/.test(s.source_type) && s.publication_date).map(s => ({ id: s.id, date: s.publication_date, type: s.source_type.startsWith("Investor") ? "Funding" : "Press release", title: s.title, cos: [...(cites.get(s.id) || [])].filter(id => get(id)?.entity_type === "company"), status: null, confidence: null, source_ids: [s.id], kind: "Dated source" }));
  return [...deals, ...prs].sort((a, b) => b.date.localeCompare(a.date));
}
function timelineView() {
  const rows = events();
  const byYear = sortedEntries(countBy(rows, r => r.date.slice(0, 4))).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 12).map(([l, v]) => ({ l, v }));
  const table = dataTable({ id: "timeline", rows, title: "Events", exportName: "semicon-db-events", columns: [
    { k: "date", label: "Date", pin: true, get: r => r.date },
    { k: "type", label: "Type", get: r => r.type, html: r => `<span class="pill">${esc(r.type)}</span><span class="sub">${esc(r.kind)}</span>` },
    { k: "title", label: "Event", wrap: true, get: r => r.title },
    { k: "cos", label: "Companies", wrap: true, get: r => r.cos.map(id => get(id)?.name).join("; "), html: r => r.cos.length ? r.cos.map(id => link(id)).join(", ") : `<span class="muted">—</span>` },
    { k: "status", label: "Status", get: r => r.status || "", html: r => r.status ? esc(r.status) : `<span class="muted">—</span>` },
    { k: "conf", label: "Confidence", get: r => r.confidence || "", html: r => r.confidence ? conf(r.confidence) : `<span class="muted">—</span>` },
    { k: "src", label: "Source", get: r => r.source_ids.length, html: r => srcBtn(r.source_ids) }] });
  const html = head("Events timeline", "Deals, partnerships and dated company announcements captured in the evidence base, newest first. Undated sources are left out rather than guessed.")
    + `<div class="grid g2"><div class="panel"><h2>Events by year</h2>${bars(byYear, { lw: 60 })}</div><div class="panel"><h2>What is included</h2><p class="small">${rows.filter(r => r.kind === "Deal record").length} deal / partnership records and ${rows.filter(r => r.kind === "Dated source").length} dated press releases and investor announcements. The event wording is the source title; impact is not assessed.</p></div></div>
    <div class="sec">${table}</div>`;
  return { title: "Events timeline", html };
}

export const RISK_MODULES = [
  ["risk", "Supply-chain Concentration", "Concentration index per equipment category with its formula, critical supplier nodes, uncovered categories and a country × equipment heatmap."],
  ["timeline", "Events Timeline", "Deals, partnerships and dated press releases by year, with sources."],
];
export const RISK_SUB = { risk: riskView, timeline: timelineView };
export { empty };

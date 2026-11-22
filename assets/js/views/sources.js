// Source register and source detail (which records cite it).
import { DB, get, hrefOf } from "../core/store.js";
import { esc, pretty, norm } from "../core/util.js";
import { readState, applyFacets, facetPanel, activeChips, listing } from "../ui/facets.js";
import { pageHead, crumbs, fresh, specTable, val, tags, empty, quickActions } from "../ui/components.js";
import { dataTable } from "../ui/table.js";

let citedBy = null;
function cites() {
  if (citedBy) return citedBy;
  citedBy = new Map();
  const add = (sid, id) => { if (!citedBy.has(sid)) citedBy.set(sid, new Set()); citedBy.get(sid).add(id); };
  [...DB.companies, ...DB.models, ...DB.fabs, ...DB.osats, ...DB.customers, ...DB.deals].forEach(r => (r.source_ids || []).forEach(s => add(s, r.id)));
  DB.relationships.forEach(r => (r.source_ids || []).forEach(s => { if (r.type === "supplies_equipment_to" || r.type === "capable_of_supplying" || r.type === "supplies") add(s, r.from); }));
  return citedBy;
}
export function sources({ path, params }) {
  if (path[1]) {
    const s = get(path[1]);
    if (!s || s.entity_type !== "source") return { title: "Not found", html: empty({ title: "Source not found." }) };
    const recs = [...(cites().get(s.id) || [])];
    const html = `${crumbs([["Home", "#/"], ["Sources", "#/sources"], [s.id, null]])}<div class="ehead"><div class="eyebrow">${esc(s.id)} · ${esc(s.tier_label)}</div><h1 class="pt">${esc(s.title)}</h1>
      <div class="row" style="margin-top:8px">${fresh(s.freshness)}${s.accessible ? "" : `<span class="chip b-outdated">Not accessible at capture</span>`}${s.source_url ? `<a class="btn sm" href="${esc(s.source_url)}" target="_blank" rel="noopener noreferrer">Open source ↗</a>` : ""}</div>${quickActions(s.id)}</div>
      <div class="grid g2"><div class="panel"><h2>Source metadata</h2>${specTable([["Publisher", val(s.publisher)], ["Type", esc(s.source_type)], ["Tier", esc(s.tier_label)], ["Publication / evidence date", val(s.publication_date, { reason: "Undated" })],
        ["Accessed", esc(s.accessed_date)], ["Age class", esc(pretty(s.age_class))], ["Access", s.accessible ? "Read" : esc(s.access_note)], ["URL", s.source_url ? `<a href="${esc(s.source_url)}" target="_blank" rel="noopener noreferrer" style="overflow-wrap:anywhere">${esc(s.source_url)}</a>` : val(null, { reason: "Internal / no URL" })], ["Notes", val(s.notes, { reason: "—" })]])}</div>
      <div class="panel"><h2>Captured excerpt</h2><p class="small">${s.excerpt ? `“${esc(s.excerpt)}”` : `<span class="na">No excerpt recorded.</span>`}</p><p class="note">Short excerpt or paraphrase kept for traceability; the source document itself is not republished.</p></div></div>
      <div class="panel sec"><h2>Records citing this source (${recs.length})</h2>${tags(recs, { max: 80, kind: true, empty: "No record cites it directly" })}</div>`;
    return { title: s.id, html };
  }
  const defs = [
    { key: "tier", label: "Tier", get: s => [String(s.tier)], label_of: v => (/^\d$/.test(v) ? "Tier " + v : v), open: true },
    { key: "type", label: "Source type", get: s => [s.source_type] },
    { key: "fresh", label: "Freshness", get: s => [s.freshness] },
    { key: "access", label: "Access", get: s => [s.accessible ? "Read" : s.access_mode === "search_index" ? "Title via web search" : "Not accessible"] },
  ];
  const state = readState(defs, params);
  const q = params.get("q") || "";
  const { rows, counts } = applyFacets(DB.sources, defs, state, q, s => norm([s.id, s.legacy_id, s.title, s.publisher, s.excerpt, s.notes].join(" ")));
  const table = dataTable({ id: "sources", rows, title: "", exportName: "semicon-db-sources", columns: [
    { k: "id", label: "Id", pin: true, get: r => r.id, html: r => `<a class="rowlink mono" href="${hrefOf(r.id)}">${esc(r.id)}</a><span class="sub mono">${esc(r.legacy_id)}</span>` },
    { k: "tier", label: "Tier", get: r => (typeof r.tier === "number" ? r.tier : 9), html: r => `<span class="pill">${esc(r.tier)}</span>` },
    { k: "title", label: "Title", wrap: true, get: r => r.title, html: r => `${r.source_url ? `<a href="${esc(r.source_url)}" target="_blank" rel="noopener noreferrer">${esc(r.title)} ↗</a>` : esc(r.title)}<span class="sub">${esc(r.publisher || "")}</span>` },
    { k: "type", label: "Type", get: r => r.source_type }, { k: "date", label: "Published", get: r => r.publication_date || "", html: r => `${val(r.publication_date, { reason: "Undated" })}<span class="sub">${fresh(r.freshness)}</span>` },
    { k: "access", label: "Access", get: r => (r.accessible ? "Read" : r.access_mode === "search_index" ? "Title via web search" : "Not accessible"), html: r => (r.accessible ? "Read" : r.access_mode === "search_index" ? `<span class="chip b-partial">Title via web search</span>` : `<span class="chip b-outdated">Not accessible</span>`) },
    { k: "excerpt", label: "Excerpt", wrap: true, get: r => r.excerpt || "", html: r => val(r.excerpt, { reason: "—" }) }, { k: "used", label: "Cited by", num: true, get: r => r.used_by }] });
  const n = Object.values(state).flat().length;
  const html = pageHead({ eyebrow: "Evidence", title: "Source register", crumb: [["Home", "#/"], ["Sources", null]], lede: "Every numbered source with its tier, date basis and accessibility. Pages that blocked access are marked and were not bypassed." })
    + listing({ facets: facetPanel(defs, state, counts), toolbar: `<div class="toolbar"><input class="input q" type="search" placeholder="Filter sources by id, title, publisher, excerpt…" value="${esc(q)}" data-qparam="q" data-fk="srcq" aria-label="Filter sources"><button class="btn filters-toggle" data-facets-toggle>Filters${n ? ` (${n})` : ""}</button><span class="rescount">${rows.length} of ${DB.sources.length}</span></div>`, chips: activeChips(defs, state, { q }), content: table });
  return { title: "Sources", html };
}

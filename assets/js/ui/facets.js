// Faceted filtering: multi-select, searchable, clearable, URL-state aware (bookmarkable), with
// counts computed against every *other* active facet (OR within a facet, AND across facets).
import { esc, norm } from "../core/util.js";
import { listParam } from "../core/router.js";

export function readState(defs, params) { const s = {}; defs.forEach(d => (s[d.key] = listParam(params, d.key))); return s; }

export function applyFacets(rows, defs, state, q = "", hay = null) {
  const terms = norm(q).split(/\s+/).filter(Boolean);
  const textOk = r => !terms.length || (() => { const h = hay ? hay(r) : norm(JSON.stringify(r)); return terms.every(t => h.includes(t)); })();
  const pass = (r, skip) => defs.every(d => { if (d.key === skip) return true; const sel = state[d.key]; if (!sel || !sel.length) return true; const vals = d.get(r) || []; return sel.some(v => vals.includes(v)); });
  const base = rows.filter(textOk);
  const counts = {};
  defs.forEach(d => { const m = new Map(); base.filter(r => pass(r, d.key)).forEach(r => (d.get(r) || []).forEach(v => m.set(v, (m.get(v) || 0) + 1))); counts[d.key] = m; });
  return { rows: base.filter(r => pass(r)), counts };
}

export function facetPanel(defs, state, counts, { title = "Filters" } = {}) {
  const nActive = defs.reduce((a, d) => a + (state[d.key] || []).length, 0);
  return `<aside class="facets" id="facets" aria-label="${esc(title)}"><div class="fhead"><b>${esc(title)}</b><span class="row">${nActive ? `<button class="btn sm" data-facet-clear="all">Clear all</button>` : ""}<button class="btn sm filters-toggle" data-facets-toggle aria-label="Close filters">Done</button></span></div>
  ${defs.map(d => {
    const sel = state[d.key] || [];
    const m = counts[d.key] || new Map();
    let opts = d.options ? d.options.map(o => (typeof o === "string" ? { v: o } : o)) : [...m.keys()].map(v => ({ v }));
    sel.forEach(v => { if (!opts.some(o => o.v === v)) opts.push({ v }); });
    opts = opts.map(o => ({ ...o, l: o.l || (d.label_of ? d.label_of(o.v) : o.v), n: m.get(o.v) || 0 }));
    if (!d.options || d.sort === "count") opts.sort((a, b) => (sel.includes(b.v) - sel.includes(a.v)) || b.n - a.n || String(a.l).localeCompare(String(b.l)));
    if (d.hideZero !== false) opts = opts.filter(o => o.n || sel.includes(o.v));
    if (!opts.length) return "";
    const open = d.open || sel.length;
    return `<details class="facet"${open ? " open" : ""}><summary>${esc(d.label)} ${sel.length ? `<span class="fcount">${sel.length} selected</span>` : ""}</summary><div class="fbody">
      ${opts.length > 8 ? `<input class="input fsearch" type="search" placeholder="Search ${esc(d.label.toLowerCase())}" data-fsearch aria-label="Search ${esc(d.label)} options">` : ""}
      <div class="opts" role="group" aria-label="${esc(d.label)}">${opts.map(o => `<label class="${o.n ? "" : "zero"}" data-fl="${esc(norm(o.l))}"><input type="checkbox" data-facet="${esc(d.key)}" value="${esc(o.v)}"${sel.includes(o.v) ? " checked" : ""}> <span>${esc(o.l)}</span><span class="c">${o.n}</span></label>`).join("")}</div>
      ${sel.length ? `<button class="btn sm" style="margin-top:6px" data-facet-clear="${esc(d.key)}">Clear ${esc(d.label.toLowerCase())}</button>` : ""}</div></details>`; }).join("")}
  ${defs.every(d => !(counts[d.key] || new Map()).size) ? `<p class="small muted" style="padding:8px 12px">No filter values available for the current selection.</p>` : ""}</aside>`;
}

export function activeChips(defs, state, { q, qKey = "q" } = {}) {
  const chips = [];
  if (q) chips.push(`<span class="fchip"><span class="k">Search</span> ${esc(q)}<button data-chip="${qKey}|" aria-label="Remove search ${esc(q)}">×</button></span>`);
  defs.forEach(d => (state[d.key] || []).forEach(v => chips.push(`<span class="fchip"><span class="k">${esc(d.label)}</span> ${esc(d.label_of ? d.label_of(v) : v)}<button data-chip="${esc(d.key)}|${esc(v)}" aria-label="Remove filter ${esc(d.label)} ${esc(d.label_of ? d.label_of(v) : v)}">×</button></span>`)));
  return chips.length ? `<div class="active-chips" aria-label="Active filters">${chips.join("")}${chips.length > 1 ? `<button class="btn sm" data-facet-clear="all">Clear all</button>` : ""}</div>` : "";
}

export function listing({ facets, toolbar, chips, content }) {
  return `<div class="listing">${facets}<div class="grow">${toolbar}${chips}${content}</div></div>`;
}

// Full-page relationship graph explorer with progressive disclosure (depth + type toggles).
import { get, hrefOf, KIND_LABEL, edges } from "../core/store.js";
import { esc, download } from "../core/util.js";
import { registerActions } from "../core/actions.js";
import { href, listParam } from "../core/router.js";
import { crumbs, empty } from "../ui/components.js";
import { graphKinds, KIND_COLOR, egoGraph } from "../ui/graph.js";
import { relationsSection } from "./shared.js";

let CURRENT = null;
registerActions({ graphjson: () => { if (!CURRENT) return; const g = egoGraph(CURRENT.id, CURRENT); download(`semicon-db-graph-${CURRENT.id}.json`, JSON.stringify(g.json, null, 1), "application/json"); } });

export function graphView({ path, params }) {
  const id = path[1] || "CMP-000010";
  const r = get(id);
  if (!r) return { title: "Not found", html: empty({ title: `No record ${id}.` }) };
  const depth = params.get("depth") === "2" ? 2 : 1;
  const hidden = new Set(listParam(params, "hide"));
  const kinds = graphKinds(id);
  const hideTypes = new Set(listParam(params, "xt")), sourceOnly = params.get("src") === "1";
  const st = (o = {}) => ({ depth: depth === 2 ? 2 : null, hide: [...hidden], xt: [...hideTypes], src: sourceOnly ? 1 : null, ...o });
  const toggle = k => { const h = new Set(hidden); h.has(k) ? h.delete(k) : h.add(k); return href("/graph/" + id, st({ hide: [...h] })); };
  const types = [...new Set(edges(id).map(e => e.type))].sort();
  const ttoggle = t => { const h = new Set(hideTypes); h.has(t) ? h.delete(t) : h.add(t); return href("/graph/" + id, st({ xt: [...h] })); };
  CURRENT = { id, depth, hidden, hideTypes, sourceOnly };
  const html = `${crumbs([["Home", "#/"], ["Relationship graph", null], [r.name || r.title, null]])}
    <div class="eyebrow">Knowledge graph</div><h1 class="pt">${esc(r.name || r.title)}</h1>
    <p class="lede">Direct relationships first; expand to a second level on request. Click any node to re-centre on it, or <a href="${hrefOf(id)}">open the record</a>.</p>
    <div class="toolbar"><div class="seg" role="group" aria-label="Depth"><a class="btn" href="${href("/graph/" + id, { hide: [...hidden] })}" aria-current="${depth === 1}">1 level</a><a class="btn" href="${href("/graph/" + id, { depth: 2, hide: [...hidden] })}" aria-current="${depth === 2}">2 levels</a></div>
      <span class="small muted">Show:</span>${kinds.map(k => `<a class="btn sm" href="${toggle(k)}" aria-current="${!hidden.has(k)}"><i style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${KIND_COLOR[k] || "var(--s4)"}"></i> ${esc(KIND_LABEL[k] || k)}<span class="sr-only">${hidden.has(k) ? " (hidden)" : " (shown)"}</span></a>`).join("")}</div>
    <div class="toolbar"><span class="small muted">Relationships:</span>${types.map(t => `<a class="btn sm" href="${ttoggle(t)}" aria-current="${!hideTypes.has(t)}">${esc(t.replace(/_/g, " "))}<span class="sr-only">${hideTypes.has(t) ? " (hidden)" : " (shown)"}</span></a>`).join("")}
      <a class="btn sm" href="${href("/graph/" + id, st({ src: sourceOnly ? null : 1 }))}" aria-current="${sourceOnly}">Source-backed only</a>
      <button class="btn sm" data-action="graphjson">Export graph JSON</button></div>
    ${relationsSection(id, { depth, hidden, hideTypes, sourceOnly })}`;
  return { title: `Graph: ${r.name || r.title}`, html };
}

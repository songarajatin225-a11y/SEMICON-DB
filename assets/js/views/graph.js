// Full-page relationship graph explorer with progressive disclosure (depth + type toggles).
import { get, hrefOf, KIND_LABEL } from "../core/store.js";
import { esc } from "../core/util.js";
import { href, listParam } from "../core/router.js";
import { crumbs, empty } from "../ui/components.js";
import { graphKinds, KIND_COLOR } from "../ui/graph.js";
import { relationsSection } from "./shared.js";

export function graphView({ path, params }) {
  const id = path[1] || "CMP-000010";
  const r = get(id);
  if (!r) return { title: "Not found", html: empty({ title: `No record ${id}.` }) };
  const depth = params.get("depth") === "2" ? 2 : 1;
  const hidden = new Set(listParam(params, "hide"));
  const kinds = graphKinds(id);
  const toggle = k => { const h = new Set(hidden); h.has(k) ? h.delete(k) : h.add(k); return href("/graph/" + id, { depth: depth === 2 ? 2 : null, hide: [...h] }); };
  const html = `${crumbs([["Home", "#/"], ["Relationship graph", null], [r.name || r.title, null]])}
    <div class="eyebrow">Knowledge graph</div><h1 class="pt">${esc(r.name || r.title)}</h1>
    <p class="lede">Direct relationships first; expand to a second level on request. Click any node to re-centre on it, or <a href="${hrefOf(id)}">open the record</a>.</p>
    <div class="toolbar"><div class="seg" role="group" aria-label="Depth"><a class="btn" href="${href("/graph/" + id, { hide: [...hidden] })}" aria-current="${depth === 1}">1 level</a><a class="btn" href="${href("/graph/" + id, { depth: 2, hide: [...hidden] })}" aria-current="${depth === 2}">2 levels</a></div>
      <span class="small muted">Show:</span>${kinds.map(k => `<a class="btn sm" href="${toggle(k)}" aria-current="${!hidden.has(k)}"><i style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${KIND_COLOR[k] || "var(--s4)"}"></i> ${esc(KIND_LABEL[k] || k)}<span class="sr-only">${hidden.has(k) ? " (hidden)" : " (shown)"}</span></a>`).join("")}</div>
    ${relationsSection(id, { depth, hidden })}`;
  return { title: `Graph: ${r.name || r.title}`, html };
}

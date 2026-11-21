// Full-page relationship graph explorer with progressive disclosure (depth + type toggles).
import { get, hrefOf, KIND_LABEL, edges } from "../core/store.js";
import { esc, download } from "../core/util.js";
import { registerActions } from "../core/actions.js";
import { href, listParam } from "../core/router.js";
import { crumbs, empty } from "../ui/components.js";
import { graphKinds, KIND_COLOR, egoGraph } from "../ui/graph.js";
import { relationsSection } from "./shared.js";

let CURRENT = null;

// Re-centre continuity: when a graph node is clicked on the graph page, the clicked node travels from where it was
// to the centre (250 ms, on-screen movement → strong ease-in-out) and the new neighbours fade in as it lands.
// Keyboard activation (click.detail === 0) and other routes get no motion; reduced motion gets a short fade only.
let PENDING = null;
document.addEventListener("click", e => {
  const a = e.target.closest?.(".graphbox a.gnode");
  if (!a || !location.hash.startsWith("#/graph/") || e.detail === 0) { PENDING = null; return; }
  const c = a.querySelector("circle")?.getBoundingClientRect(); if (!c) return;
  PENDING = { id: a.dataset.node, x: c.left + c.width / 2, y: c.top + c.height / 2 };
}, true);
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
function recentre(app, id) {
  const p = PENDING; PENDING = null;
  if (!p || p.id !== id) return;
  const svg = app.querySelector(".graphbox svg"); const center = svg?.querySelector("a.gcenter"); if (!center) return;
  if (reduced()) { svg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150, easing: "ease" }); return; }
  requestAnimationFrame(() => { // measure after the router's scroll reset, before the first paint
    const c = center.querySelector("circle").getBoundingClientRect(), box = svg.getBoundingClientRect();
    const k = svg.viewBox.baseVal.width / box.width; // screen px → SVG user units
    const dx = (p.x - (c.left + c.width / 2)) * k, dy = (p.y - (c.top + c.height / 2)) * k;
    if (Math.hypot(dx, dy) < 1) return;
    center.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0px, 0px)" }], { duration: 250, easing: "cubic-bezier(0.77, 0, 0.175, 1)" });
    // neighbours appear while it travels; edges connect only as it lands, so no edge points at an empty centre
    const fade = (sel, delay, duration) => svg.querySelectorAll(sel).forEach(el => el.animate([{ opacity: 0 }, { opacity: 1 }], { duration, delay, easing: "cubic-bezier(0.23, 1, 0.32, 1)", fill: "backwards" }));
    fade("a.gnode:not(.gcenter)", 100, 150);
    fade("line.gedge", 180, 120);
  });
}
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
  return { title: `Graph: ${r.name || r.title}`, html, after: app => recentre(app, id) };
}

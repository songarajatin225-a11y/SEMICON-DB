// Ego-network relationship graph with progressive disclosure: depth 1 by default, depth 2 on request,
// per-type caps so the picture never becomes a hairball. An equivalent relationship table is always rendered.
import { esc } from "../core/util.js";
import { get, edges, kindOf, nameOf, hrefOf, KIND_LABEL } from "../core/store.js";

export const KIND_COLOR = { company: "var(--s1)", model: "var(--s2)", product_family: "var(--s3)", equipment: "var(--s5)", process: "var(--s6)", technology: "#7B5EA7",
  material: "#8C6D3F", application: "#5E7F3A", subsystem: "#A0527A", component: "#C07A2C", fab: "#3B6FA0", osat: "#3B6FA0", customer: "#6B7C80", country: "#6B7C80", source: "#999" };
const CAP1 = 14, CAP2 = 5, MAX2 = 90;
const trunc = (s, n = 24) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

// Edge filters: hideTypes = relationship types to hide; sourceOnly = only source-backed edges (drops derived / reference / analyst).
export const edgeOk = (e, f = {}) => !(f.hideTypes && f.hideTypes.has(e.type)) && !(f.sourceOnly && (e.basis !== "source" || !(e.source_ids || []).length));
function neighbors(id, hidden, f = {}) {
  const seen = new Map();
  edges(id).filter(e => edgeOk(e, f)).forEach(e => {
    const other = e.from === id ? e.to : e.from;
    const k = kindOf(other);
    if (!k || hidden.has(k) || !get(other)) return;
    if (!seen.has(other)) seen.set(other, { id: other, kind: k, rels: [] });
    seen.get(other).rels.push(e);
  });
  return [...seen.values()];
}
export function graphKinds(id) { return [...new Set(edges(id).map(e => kindOf(e.from === id ? e.to : e.from)).filter(Boolean))]; }

export function egoGraph(id, { depth = 1, hidden = new Set(), hideTypes, sourceOnly } = {}) {
  const ef = { hideTypes, sourceOnly };
  const W = 960, H = depth > 1 ? 700 : 560, cx = W / 2, cy = H / 2;
  const R1 = depth > 1 ? 190 : 200, R2 = 310;
  const n1all = neighbors(id, hidden, ef);
  const byKind = new Map();
  n1all.forEach(n => (byKind.get(n.kind) || byKind.set(n.kind, []).get(n.kind)).push(n));
  const lvl1 = [], more = [];
  [...byKind.entries()].sort((a, b) => b[1].length - a[1].length).forEach(([k, arr]) => {
    arr.sort((a, b) => b.rels.length - a.rels.length || nameOf(a.id).localeCompare(nameOf(b.id)));
    lvl1.push(...arr.slice(0, CAP1));
    if (arr.length > CAP1) more.push({ kind: k, n: arr.length - CAP1 });
  });
  const pos = new Map([[id, { x: cx, y: cy, r: 16 }]]);
  lvl1.forEach((n, i) => { const a = (2 * Math.PI * i) / Math.max(1, lvl1.length) - Math.PI / 2; pos.set(n.id, { x: cx + R1 * Math.cos(a), y: cy + R1 * Math.sin(a) * (depth > 1 ? 0.95 : 0.82), a, r: 8 }); });
  const lvl2 = [];
  if (depth > 1) {
    const inner = new Set([id, ...lvl1.map(n => n.id)]);
    for (const p of lvl1) {
      if (lvl2.length >= MAX2) break;
      const ns = neighbors(p.id, hidden, ef).filter(n => !inner.has(n.id) && !pos.has(n.id)).slice(0, CAP2);
      ns.forEach((n, j) => { const a = pos.get(p.id).a + (j - (ns.length - 1) / 2) * 0.07; pos.set(n.id, { x: cx + R2 * Math.cos(a), y: cy + R2 * Math.sin(a) * 0.95, a, r: 5 }); lvl2.push({ ...n, parent: p.id }); });
    }
  }
  const edgeLine = (a, b, rel) => { const p = pos.get(a), q = pos.get(b); return `<line class="gedge ${rel.basis === "derived" ? "derived" : rel.basis === "reference" ? "reference" : ""}" x1="${p.x.toFixed(1)}" y1="${p.y.toFixed(1)}" x2="${q.x.toFixed(1)}" y2="${q.y.toFixed(1)}"><title>${esc(rel.type.replace(/_/g, " "))} · ${esc(rel.basis)}</title></line>`; };
  const node = (nid, kind, r, strong) => { const p = pos.get(nid); const name = nameOf(nid); const right = p.x >= cx;
    return `<a href="#/graph/${encodeURIComponent(nid)}${depth > 1 ? "?depth=2" : ""}" class="gnode" aria-label="${esc(KIND_LABEL[kind] || kind)}: ${esc(name)}"><circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${r}" fill="${KIND_COLOR[kind] || "var(--s4)"}"/><title>${esc(KIND_LABEL[kind] || kind)}: ${esc(name)}</title>
      <text x="${(p.x + (nid === id ? 0 : right ? r + 4 : -r - 4)).toFixed(1)}" y="${(p.y + (nid === id ? r + 16 : 4)).toFixed(1)}" text-anchor="${nid === id ? "middle" : right ? "start" : "end"}" style="${strong ? "font-weight:700;font-size:13px" : r < 6 ? "font-size:9.5px" : ""}">${esc(trunc(name, nid === id ? 48 : r < 6 ? 20 : 26))}</text></a>`; };
  const svg = `<svg viewBox="0 0 ${W} ${H}" role="group" aria-label="Relationship graph for ${esc(nameOf(id))}: ${lvl1.length} direct and ${lvl2.length} second-degree connections">
    ${lvl2.map(n => edgeLine(n.parent, n.id, n.rels[0])).join("")}${lvl1.map(n => edgeLine(id, n.id, n.rels[0])).join("")}
    ${lvl2.map(n => node(n.id, n.kind, 5)).join("")}${lvl1.map(n => node(n.id, n.kind, 8)).join("")}${node(id, kindOf(id), 16, true)}</svg>`;
  // graph JSON for export: nodes + the edges actually drawn
  const json = { center: id, depth, filters: { hidden_kinds: [...hidden], hidden_relationship_types: [...(hideTypes || [])], source_backed_only: !!sourceOnly },
    nodes: [{ id, kind: kindOf(id), name: nameOf(id) }, ...lvl1.map(n => ({ id: n.id, kind: n.kind, name: nameOf(n.id), level: 1 })), ...lvl2.map(n => ({ id: n.id, kind: n.kind, name: nameOf(n.id), level: 2 }))],
    edges: [...lvl1.flatMap(n => n.rels), ...lvl2.flatMap(n => n.rels)].map(r => ({ id: r.id, type: r.type, from: r.from, to: r.to, basis: r.basis, confidence: r.confidence || null, source_ids: r.source_ids || [] })) };
  return { svg, lvl1, lvl2, more, total1: n1all.length, json };
}

export function relTable(id, rels) {
  return rels.map(e => { const other = e.from === id ? e.to : e.from; const dir = e.from === id ? "→" : "←";
    return { id: e.id, type: e.type.replace(/_/g, " "), dir, other, kind: KIND_LABEL[kindOf(other)] || kindOf(other), basis: e.basis, status: e.status || "", confidence: e.confidence || "", source_ids: e.source_ids || [], detail: e.detail || null, href: hrefOf(other) }; });
}

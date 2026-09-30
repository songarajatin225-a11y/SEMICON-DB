// Reusable UI vocabulary. Every status, source and missing value renders the same way everywhere.
import { esc, fmt, pretty } from "../core/util.js";
import { get, hrefOf, nameOf, kindOf, KIND_LABEL } from "../core/store.js";
import { ws } from "../core/workspace.js";

// ---- evidence states
const STATE = {
  VERIFIED: ["b-verified", "●", "Verified"], PARTIALLY_VERIFIED: ["b-partial", "◐", "Partially verified"], UNVERIFIED: ["b-unverified", "○", "Unverified"],
  CONFLICTING: ["b-conflict", "⚠", "Conflicting sources"], OUTDATED: ["b-outdated", "◷", "Outdated"],
  CONFIRMED: ["b-verified", "●", "Confirmed"], PROBABLE: ["b-partial", "◐", "Probable"],
  DOCUMENTED_SUPPLY: ["b-verified", "●", "Documented supply"], IN_HOUSE: ["b-verified", "●", "In-house"], DISTRIBUTION: ["b-partial", "◐", "Distribution"],
  CAPABLE_SUPPLIER: ["b-info", "◇", "Capable supplier"], EVALUATION: ["b-partial", "◐", "Evaluation"], GAP: ["b-unverified", "○", "No supplier captured"],
};
export function badge(state, title) {
  const [cls, g, label] = STATE[state] || ["b-neutral", "", pretty(state)];
  return `<span class="chip ${cls}"${title ? ` title="${esc(title)}"` : ""}>${g ? `<span aria-hidden="true">${g}</span>` : ""}${esc(label)}</span>`;
}
const FRESH = { Recent: ["b-neutral", "Recent"], "Needs Review": ["b-outdated", "Needs review"], Stale: ["b-outdated", "Stale"], Unknown: ["b-unverified", "Freshness unknown"] };
export function fresh(f) { const [c, l] = FRESH[f] || FRESH.Unknown; return `<span class="chip ${c}" title="Freshness of the newest supporting source">${esc(l)}</span>`; }
export function conf(level) {
  const n = { HIGH: 4, MEDIUM: 3, LOW: 2, UNVERIFIED: 1 }[level] || 0;
  return `<span class="nowrap" title="Confidence: ${esc(pretty(level || "unknown"))}"><span class="conf" aria-hidden="true">${[1, 2, 3, 4].map(i => `<i class="${i <= n ? "on" : ""}"></i>`).join("")}</span><span class="xs muted">${esc(pretty(level || "Unknown"))}</span></span>`;
}
const BASIS = { source: ["b-verified", "Source-backed"], derived: ["b-derived", "Derived"], reference: ["b-editorial", "Editorial reference"], analyst: ["b-unverified", "Analyst — not source-traced"],
  editorial: ["b-editorial", "Editorial reference"], ai: ["b-editorial", "AI summary"], claim: ["b-info", "Manufacturer claim"] };
export const basis = b => { const [c, l] = BASIS[b] || ["b-neutral", pretty(b)]; return `<span class="chip ${c}">${esc(l)}</span>`; };

// ---- values
export function val(v, { reason } = {}) {
  if (v == null || v === "" || (Array.isArray(v) && !v.length)) return `<span class="na">${esc(reason || "Not found in captured sources")}</span>`;
  if (v === "NOT_DISCLOSED") return `<span class="na">Not publicly disclosed</span>`;
  return Array.isArray(v) ? v.map(esc).join("; ") : esc(v);
}
export const isEmpty = v => v == null || v === "" || (Array.isArray(v) && !v.length);

// ---- links
export function link(id, label, cls = "") { if (!id) return ""; const r = get(id); return `<a class="${cls}" href="${hrefOf(id)}">${esc(label || (r ? r.name || r.title : id))}</a>`; }
export function tags(ids, { max = 30, empty = "None captured", kind = false } = {}) {
  const list = (ids || []).filter(Boolean);
  if (!list.length) return `<span class="na">${esc(empty)}</span>`;
  const shown = list.slice(0, max).map(id => `<a class="tag" href="${hrefOf(id)}">${kind ? `<span class="k">${esc(KIND_LABEL[kindOf(id)] || "")}</span>` : ""}${esc(nameOf(id))}</a>`).join("");
  return `<div class="tags">${shown}${list.length > max ? `<span class="muted xs" style="align-self:center">+${list.length - max} more</span>` : ""}</div>`;
}
export function srcBtn(ids, { label } = {}) {
  const list = (ids || []).filter(Boolean);
  if (!list.length) return `<span class="chip b-unverified" title="No source attached">No source</span>`;
  const one = list.length === 1 ? get(list[0]) : null;
  const txt = label || (one ? (one.tier === 1 ? "Official source" : `Source · Tier ${one.tier}`) : `${list.length} sources`);
  return `<button type="button" class="srcbtn" data-sources="${esc(list.join(","))}" aria-label="Open ${list.length} source reference${list.length > 1 ? "s" : ""}">↗ ${esc(txt)}</button>`;
}
export function srcList(ids) {
  const list = (ids || []).map(get).filter(Boolean);
  if (!list.length) return `<p class="na">No source attached to this record.</p>`;
  return `<ul class="srclist">${list.map(s => `<li class="t${esc(s.tier)}"><div class="row"><span class="mono xs">${esc(s.id)}</span><span class="pill">${esc(typeof s.tier === "number" ? "Tier " + s.tier : s.tier)}</span><span class="xs muted">${esc(s.source_type)}</span>${fresh(s.freshness)}${s.accessible ? "" : s.access_mode === "search_index" ? `<span class="chip b-partial" title="${esc(s.access_note || "")}">Title via web search · page not read</span>` : `<span class="chip b-outdated">Not accessible</span>`}</div>
    <div style="margin-top:3px">${s.source_url ? `<a href="${esc(s.source_url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)} ↗</a>` : esc(s.title)}</div>
    <div class="xs muted">${esc(s.publisher || "")}${s.publication_date ? " · " + esc(s.publication_date) : " · undated"}${s.used_by ? ` · cited by ${s.used_by} records` : ""} · <a href="${hrefOf(s.id)}">record</a></div>
    ${s.excerpt ? `<div class="xs ink2" style="margin-top:3px">“${esc(s.excerpt)}”</div>` : ""}</li>`).join("")}</ul>`;
}

// ---- page furniture
export function crumbs(items) { return `<nav aria-label="Breadcrumb"><ol class="crumbs">${items.map(([l, h], i) => `<li>${h && i < items.length - 1 ? `<a href="${h}">${esc(l)}</a>` : `<span aria-current="${i === items.length - 1 ? "page" : "false"}">${esc(l)}</span>`}</li>`).join("")}</ol></nav>`; }
export function pageHead({ eyebrow, title, lede, crumb, actions = "" }) {
  return `${crumb ? crumbs(crumb) : ""}<div class="row sp" style="align-items:flex-start"><div class="grow">${eyebrow ? `<div class="eyebrow">${esc(eyebrow)}</div>` : ""}<h1 class="pt">${esc(title)}</h1></div>${actions ? `<div class="row">${actions}</div>` : ""}</div>${lede ? `<p class="lede">${lede}</p>` : ""}`;
}
export function tabs(base, active, list) {
  return `<div class="tabs" role="tablist">${list.map(([id, label, n]) => `<a role="tab" href="${base}${id === list[0][0] ? "" : "?tab=" + id}" aria-selected="${id === active}">${esc(label)}${n != null ? `<span class="n">${n}</span>` : ""}</a>`).join("")}</div>`;
}
export function kv(pairs) { return `<dl class="kvgrid">${pairs.filter(Boolean).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join("")}</dl>`; }
export function specTable(rows, { caption } = {}) {
  return `<table class="spec">${caption ? `<caption class="sr-only">${esc(caption)}</caption>` : ""}<tbody>${rows.filter(Boolean).map(([k, v, extra]) => `<tr><th scope="row">${esc(k)}</th><td>${v}${extra ? `<span class="sub">${extra}</span>` : ""}</td></tr>`).join("")}</tbody></table>`;
}
export function kpi({ v, l, s, href }) { const tag = href ? "a" : "div"; return `<${tag} class="kpi"${href ? ` href="${href}"` : ""}><div class="v">${typeof v === "number" ? fmt(v) : v}</div><div class="l">${esc(l)}</div>${s ? `<div class="s">${s}</div>` : ""}</${tag}>`; }
export function bars(items, { lw = 150, color, max } = {}) {
  const m = max || Math.max(1, ...items.map(i => i.v));
  return `<div class="bars" style="--lw:${lw}px">${items.map(i => { const tag = i.href ? "a" : "div";
    return `<${tag} class="bar"${i.href ? ` href="${i.href}"` : ""} data-tip="${esc(i.tip || `${i.l}: ${i.v}`)}"><span class="lab" title="${esc(i.l)}">${esc(i.l)}</span><span class="trk"><span class="fill" style="width:${(100 * i.v / m).toFixed(2)}%;background:${i.c || color || "var(--s2)"}"></span></span><span class="val">${i.lab ?? fmt(i.v)}</span></${tag}>`; }).join("")}</div>`;
}
export const PALETTE = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--s5)", "var(--s6)"];
export function stackBar(title, parts, { total } = {}) {
  const t = total || parts.reduce((a, p) => a + p.v, 0) || 1;
  return `<div class="stackrow"><h3><span>${esc(title)}</span><span class="muted mono">${fmt(parts.reduce((a, p) => a + p.v, 0))}</span></h3>
  <div class="stackbar" role="img" aria-label="${esc(title + ": " + parts.map(p => `${p.l} ${p.v}`).join(", "))}">${parts.filter(p => p.v).map(p => `<div style="flex:${p.v};background:${p.c}" data-tip="${esc(`${p.l}: ${p.v} (${Math.round(100 * p.v / t)}%)`)}"></div>`).join("")}</div>
  <div class="legend">${parts.map(p => `<span>${p.href ? `<a href="${p.href}">` : ""}<i style="background:${p.c}"></i>${esc(p.l)} <b class="mono">${fmt(p.v)}</b>${p.href ? "</a>" : ""}</span>`).join("")}</div></div>`;
}
export function empty({ title = "No records match.", tips = [], kind = "no-results" } = {}) {
  const lead = { "no-results": "", "not-available": "This information has not been captured yet.", "not-disclosed": "The company does not publicly disclose this.", "no-source": "No source could be found for this item." }[kind] || "";
  return `<div class="empty" role="status"><b>${esc(title)}</b>${lead ? `<div>${esc(lead)}</div>` : ""}${tips.length ? `<div style="margin-top:6px">Try:</div><ul>${tips.map(t => `<li>${t}</li>`).join("")}</ul>` : ""}</div>`;
}
export function skeleton() { return `<div aria-busy="true" aria-label="Loading"><div class="sk sk-h"></div><div class="sk sk-line" style="width:70%"></div><div class="grid g4 sec">${"<div class='sk sk-block'></div>".repeat(4)}</div><div class="sk sk-block sec"></div></div>`; }
export function stateBadges(r) {
  const extra = ["CONFLICTING", "OUTDATED"].includes(r.quality_state) ? " " + badge(r.quality_state) : "";
  return `${badge(r.verification)}${extra} ${r.freshness ? fresh(r.freshness) : ""}`;
}
export function quickActions(id, { compare, extra = [] } = {}) {
  const saved = ws.isSaved(id);
  return `<div class="qa" role="group" aria-label="Quick actions">
    <button class="btn sm" data-save="${esc(id)}" aria-pressed="${saved}">${saved ? "★ Saved" : "☆ Save"}</button>
    ${compare ? `<button class="btn sm" data-cmp-toggle="${esc(compare)}|${esc(id)}" aria-pressed="${ws.cmp(compare).includes(id)}">${ws.cmp(compare).includes(id) ? "✓ In compare" : "+ Compare"}</button>` : ""}
    <button class="btn sm" data-copylink="1">Copy link</button>
    <button class="btn sm" data-copyrecord="${esc(id)}">Copy record (JSON)</button>
    <button class="btn sm" data-print="1">Print</button>
    <a class="btn sm" href="#/graph/${encodeURIComponent(id)}">Relationship graph</a>
    ${extra.join("")}</div>`;
}

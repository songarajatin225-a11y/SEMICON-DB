// DataTable: sticky header, sort, column presets + show/hide, pinned first column, pagination,
// row expansion, compare checkboxes, CSV/JSON export and copy-to-clipboard. One convention for every table.
import { esc, toCSV, toTSV, download, copyText } from "../core/util.js";
import { ws } from "../core/workspace.js";
import { empty } from "./components.js";

const REG = new Map();
const PAGE_SIZES = [25, 50, 100, 250];

function st(id, opts) {
  let s = REG.get(id)?.state;
  if (!s) {
    const saved = ws.pref("tbl:" + id, null);
    s = { sort: opts.sort || null, page: 0, size: opts.pageSize || 50, preset: saved?.preset || opts.defaultPreset || "basic", custom: saved?.custom || null, expanded: new Set(), menu: false };
  }
  return s;
}
function visibleCols(t) {
  const { columns, presets } = t.opts; const s = t.state;
  if (s.custom) return columns.filter(c => s.custom.includes(c.k) || c.always);
  if (presets && presets[s.preset]) return columns.filter(c => presets[s.preset].includes(c.k) || c.always);
  return columns.filter(c => !c.hidden);
}
function sorted(t) {
  const { rows, columns } = t.opts; const s = t.state.sort;
  if (!s) return rows;
  const col = columns.find(c => c.k === s.k); if (!col) return rows;
  const g = col.sort || col.get || (r => r[col.k]);
  return [...rows].sort((a, b) => {
    const x = g(a), y = g(b);
    const ex = x == null || x === "", ey = y == null || y === "";
    if (ex && ey) return 0; if (ex) return 1; if (ey) return -1; // missing values always last
    if (typeof x === "number" && typeof y === "number") return (x - y) * s.d;
    return String(x).localeCompare(String(y), "en", { numeric: true }) * s.d;
  });
}
function body(t) {
  const { id, opts, state } = t;
  const cols = visibleCols(t);
  const rows = sorted(t);
  const pages = Math.max(1, Math.ceil(rows.length / state.size));
  if (state.page >= pages) state.page = pages - 1;
  const slice = rows.slice(state.page * state.size, (state.page + 1) * state.size);
  const cmpKind = opts.compareKind; const cmpSel = cmpKind ? ws.cmp(cmpKind) : [];
  const presetBtns = opts.presets ? `<div class="seg" role="group" aria-label="Column preset">${Object.keys(opts.presets).map(p => `<button data-dt="${id}" data-act="preset" data-v="${p}" aria-pressed="${!state.custom && state.preset === p}">${esc(p[0].toUpperCase() + p.slice(1).replace(/-/g, " "))}</button>`).join("")}</div>` : "";
  const colMenu = `<div class="colmenu"><button class="btn sm" data-dt="${id}" data-act="menu" aria-expanded="${state.menu}">Columns</button>${state.menu ? `<div role="group" aria-label="Show or hide columns">${opts.columns.filter(c => !c.always).map(c => `<label><input type="checkbox" data-dt="${id}" data-act="col" data-v="${c.k}"${cols.includes(c) ? " checked" : ""}> ${esc(c.label)}</label>`).join("")}<hr class="hr"><button class="btn sm" data-dt="${id}" data-act="resetcols">Reset to preset</button></div>` : ""}</div>`;
  const head = `<div class="tblbar"><div class="row">${opts.title ? `<h2>${esc(opts.title)}</h2>` : ""}<span class="muted small">${rows.length.toLocaleString("en-US")} ${rows.length === 1 ? "record" : "records"}${opts.note ? " · " + opts.note : ""}</span></div>
    <div class="row">${presetBtns}${colMenu}<button class="btn sm" data-dt="${id}" data-act="csv">Export CSV</button><button class="btn sm" data-dt="${id}" data-act="json">JSON</button><button class="btn sm" data-dt="${id}" data-act="copy">Copy table</button></div></div>`;
  if (!rows.length) return head + `<div class="tbl-wrap">${empty(opts.empty || { title: "No records match the current filters.", tips: ["removing one filter", "choosing a broader equipment category", "clearing the search text"] })}</div>`;
  const expandCol = !!opts.expand;
  const th = c => { const s = state.sort && state.sort.k === c.k ? state.sort : null;
    return `<th scope="col" class="${c.num ? "num " : ""}${c.pin ? "pin" : ""}"${s ? ` aria-sort="${s.d > 0 ? "ascending" : "descending"}"` : ""}>${c.nosort ? `<span class="h">${esc(c.label)}</span>` : `<button data-dt="${id}" data-act="sort" data-v="${c.k}" title="Sort by ${esc(c.label)}">${esc(c.label)}</button>`}</th>`; };
  const tr = r => {
    const rid = opts.rowId ? opts.rowId(r) : r.id;
    const open = state.expanded.has(rid);
    const cells = cols.map(c => `<td class="${c.num ? "num " : ""}${c.wrap ? "wrap " : ""}${c.pin ? "pin" : ""}">${c.html ? c.html(r) : esc(c.get ? c.get(r) : r[c.k])}</td>`).join("");
    return `<tr>${cmpKind ? `<td><input type="checkbox" data-cmp-toggle="${cmpKind}|${esc(rid)}" aria-label="Compare"${cmpSel.includes(rid) ? " checked" : ""}></td>` : ""}${expandCol ? `<td><button class="xbtn" data-dt="${id}" data-act="expand" data-v="${esc(rid)}" aria-expanded="${open}" aria-label="${open ? "Collapse" : "Expand"} row">${open ? "▾" : "▸"}</button></td>` : ""}${cells}</tr>
      ${open ? `<tr class="expand"><td colspan="${cols.length + (cmpKind ? 1 : 0) + 1}">${opts.expand(r)}</td></tr>` : ""}`;
  };
  const pager = rows.length > PAGE_SIZES[0] ? `<div class="pager"><span>Rows per page</span><select class="select" data-dt="${id}" data-act="size" aria-label="Rows per page">${PAGE_SIZES.map(n => `<option${n === state.size ? " selected" : ""}>${n}</option>`).join("")}</select>
    <span>${(state.page * state.size + 1).toLocaleString()}–${Math.min(rows.length, (state.page + 1) * state.size).toLocaleString()} of ${rows.length.toLocaleString()}</span>
    <button class="btn sm" data-dt="${id}" data-act="page" data-v="${state.page - 1}"${state.page === 0 ? " disabled" : ""}>‹ Prev</button><button class="btn sm" data-dt="${id}" data-act="page" data-v="${state.page + 1}"${state.page >= pages - 1 ? " disabled" : ""}>Next ›</button></div>` : "";
  return head + `<div class="tbl-wrap"><table class="tbl"><caption class="sr-only">${esc(opts.title || "Records")}</caption><thead><tr>${cmpKind ? `<th scope="col"><span class="h">Cmp</span></th>` : ""}${expandCol ? `<th scope="col"><span class="h sr-only">Expand</span></th>` : ""}${cols.map(th).join("")}</tr></thead><tbody>${slice.map(tr).join("")}</tbody></table></div>${pager}`;
}
export function dataTable(opts) {
  const id = opts.id;
  const prev = REG.get(id);
  const t = { id, opts, state: st(id, opts) };
  if (prev && prev.sig !== opts.rows.length) t.state.page = 0;
  t.sig = opts.rows.length;
  REG.set(id, t);
  return `<section class="dt" id="dt-${esc(id)}">${body(t)}</section>`;
}
function rerender(id) { const t = REG.get(id); const el = document.getElementById("dt-" + id); if (t && el) el.innerHTML = body(t); }
function persist(t) { ws.setPref("tbl:" + t.id, { preset: t.state.preset, custom: t.state.custom }); }

export function handleTableEvent(e) {
  const el = e.target.closest("[data-dt]"); if (!el) return false;
  const t = REG.get(el.dataset.dt); if (!t) return false;
  const s = t.state, act = el.dataset.act, v = el.dataset.v;
  if (e.type === "change" && act !== "size" && act !== "col") return false;
  if (e.type === "click" && (act === "size" || act === "col")) return false;
  if (act === "sort") { s.sort = s.sort && s.sort.k === v ? (s.sort.d > 0 ? { k: v, d: -1 } : null) : { k: v, d: t.opts.columns.find(c => c.k === v)?.num ? -1 : 1 }; s.page = 0; }
  else if (act === "page") s.page = Math.max(0, +v);
  else if (act === "size") { s.size = +el.value; s.page = 0; }
  else if (act === "preset") { s.preset = v; s.custom = null; persist(t); }
  else if (act === "menu") s.menu = !s.menu;
  else if (act === "col") { const cur = visibleCols(t).map(c => c.k); s.custom = el.checked ? [...cur, v] : cur.filter(k => k !== v); persist(t); }
  else if (act === "resetcols") { s.custom = null; s.menu = false; persist(t); }
  else if (act === "expand") { s.expanded.has(v) ? s.expanded.delete(v) : s.expanded.add(v); }
  else if (act === "csv" || act === "copy" || act === "json") {
    const cols = visibleCols(t).map(c => ({ label: c.label, get: c.get || (r => r[c.k]) }));
    const rows = sorted(t);
    if (act === "csv") download(`${t.opts.exportName || t.id}.csv`, toCSV(rows, cols), "text/csv");
    else if (act === "json") download(`${t.opts.exportName || t.id}.json`, JSON.stringify(rows.map(t.opts.exportRow || (r => r)), null, 2), "application/json");
    else copyText(toTSV(rows, cols), `Copied ${rows.length} rows`);
    return true;
  }
  rerender(t.id);
  if (act === "sort") document.querySelector(`#dt-${CSS.escape(t.id)} [data-act="sort"][data-v="${CSS.escape(v)}"]`)?.focus();
  if (act === "col") document.querySelector(`#dt-${CSS.escape(t.id)} [data-act="col"][data-v="${CSS.escape(v)}"]`)?.focus();
  return true;
}

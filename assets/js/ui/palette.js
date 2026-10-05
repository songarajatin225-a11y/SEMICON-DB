// Command palette (⌘K / Ctrl+K): navigation commands, live entity search, recent and saved searches.
import { esc } from "../core/util.js";
import { suggest, EXAMPLES } from "../core/search.js";
import { hrefOf, KIND_LABEL } from "../core/store.js";
import { ws } from "../core/workspace.js";
import { go } from "../core/router.js";

const COMMANDS = [
  ["Search equipment models", "/products"], ["Search companies", "/companies"], ["Search processes", "/processes"], ["Browse equipment taxonomy", "/equipment"],
  ["Open fabs", "/fabs"], ["Open OSAT / ATMP", "/osats"], ["Open facilities (site level)", "/facilities"], ["Open India ecosystem", "/india"], ["Open global map", "/map"], ["Compare products", "/compare"],
  ["Compare companies", "/compare/companies"], ["Open intelligence workspace", "/intelligence"], ["Equipment finder", "/intelligence/finder"], ["Open data quality", "/quality"],
  ["Open source register", "/sources"], ["Open saved workspace", "/saved"], ["Technologies", "/technologies"], ["Materials", "/materials"], ["Subsystems", "/subsystems"], ["Components", "/components"], ["Suppliers", "/suppliers"],
];
let el = null, sel = 0, items = [], lastFocus = null;

function render(q) {
  const list = [];
  const ql = q.trim().toLowerCase();
  if (ql) {
    list.push({ grp: "Search", label: `Search all records for “${q}”`, href: `#/search?q=${encodeURIComponent(q)}`, k: "Enter", q });
    suggest(q, 9).forEach(r => list.push({ grp: "Records", label: r.title, sub: r.sub, href: hrefOf(r.id), k: KIND_LABEL[r.kind] || r.kind }));
    COMMANDS.filter(([l]) => l.toLowerCase().includes(ql)).slice(0, 5).forEach(([l, p]) => list.push({ grp: "Commands", label: l, href: "#" + p, k: "Go" }));
  } else {
    COMMANDS.slice(0, 11).forEach(([l, p]) => list.push({ grp: "Commands", label: l, href: "#" + p, k: "Go" }));
    ws.recent().slice(0, 5).forEach(r => list.push({ grp: "Recent searches", label: r, href: `#/search?q=${encodeURIComponent(r)}`, k: "↺", q: r }));
    ws.searches().slice(0, 5).forEach(s => list.push({ grp: "Saved searches", label: s.label, href: `#/search?q=${encodeURIComponent(s.q)}`, k: "★", q: s.q }));
    EXAMPLES.slice(0, 6).forEach(e => list.push({ grp: "Try", label: e, href: `#/search?q=${encodeURIComponent(e)}`, k: "Example", q: e }));
  }
  items = list; sel = Math.min(sel, list.length - 1); if (sel < 0) sel = 0;
  let g = "";
  el.querySelector(".pres").innerHTML = list.map((it, i) => { const head = it.grp !== g ? `<div class="pgrp" role="presentation">${esc((g = it.grp))}</div>` : "";
    return `${head}<a class="pitem" role="option" id="pi-${i}" href="${it.href}" aria-selected="${i === sel}" data-pi="${i}"><span class="grow"><span>${esc(it.label)}</span>${it.sub ? `<div class="sub">${esc(it.sub)}</div>` : ""}</span><span class="k">${esc(it.k)}</span></a>`; }).join("") || `<div class="empty">No matches.</div>`;
  el.querySelector("input").setAttribute("aria-activedescendant", list.length ? "pi-" + sel : "");
}
function choose(i) { const it = items[i]; if (!it) return; if (it.q) ws.pushRecent(it.q); close(); location.hash = it.href.slice(1); }
export function open(prefill = "") {
  if (el) { el.querySelector("input").focus(); return; }
  lastFocus = document.activeElement;
  const scrim = document.createElement("div"); scrim.className = "scrim"; scrim.id = "pal-scrim";
  el = document.createElement("div"); el.className = "palette"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", "Command palette");
  el.innerHTML = `<input type="text" role="combobox" aria-expanded="true" aria-controls="pal-list" aria-autocomplete="list" placeholder="Search companies, equipment, models, processes, materials, technologies…" value="${esc(prefill)}" autocomplete="off" spellcheck="false">
    <div class="pres" role="listbox" id="pal-list" aria-label="Results"></div>
    <div class="phint"><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>Enter</kbd> open</span><span><kbd>Esc</kbd> close</span><span>Natural language works: “200 mm SiC laser dicing”</span></div>`;
  document.body.append(scrim, el);
  const input = el.querySelector("input");
  let t; input.addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => { sel = 0; render(input.value); }, 90); });
  input.addEventListener("keydown", e => {
    if (e.key === "ArrowDown") { e.preventDefault(); sel = Math.min(items.length - 1, sel + 1); render(input.value); el.querySelector(`#pi-${sel}`)?.scrollIntoView({ block: "nearest" }); }
    else if (e.key === "ArrowUp") { e.preventDefault(); sel = Math.max(0, sel - 1); render(input.value); el.querySelector(`#pi-${sel}`)?.scrollIntoView({ block: "nearest" }); }
    else if (e.key === "Enter") { e.preventDefault(); if (input.value.trim() && sel === 0) { ws.pushRecent(input.value.trim()); close(); go("/search", { q: input.value.trim() }); } else choose(sel); }
    else if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === "Tab") { e.preventDefault(); }
  });
  el.addEventListener("click", e => { const a = e.target.closest("[data-pi]"); if (a) { e.preventDefault(); choose(+a.dataset.pi); } });
  scrim.addEventListener("click", close);
  render(prefill); input.focus(); input.select();
}
export function close() { if (!el) return; el.remove(); document.getElementById("pal-scrim")?.remove(); el = null; lastFocus?.focus?.(); }
export const isOpen = () => !!el;

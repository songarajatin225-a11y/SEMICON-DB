// SEMICON-DB 2.0 application shell: data bootstrap, navigation, routing, delegated events.
import { $, esc, store, copyText, debounce, norm } from "./core/util.js";
import { DB, load, get, resolveLegacy, kindOf } from "./core/store.js";
import { current, setParams, listParam } from "./core/router.js";
import { ws } from "./core/workspace.js";
import { buildIndex } from "./core/search.js";
import { handleTableEvent } from "./ui/table.js";
import { open as openPalette, isOpen as paletteOpen, close as closePalette } from "./ui/palette.js";
import { openDrawer, closeDrawer } from "./ui/drawer.js";
import { srcList, empty } from "./ui/components.js";
import { ROUTES } from "./views/index.js";
import { fillClaims } from "./views/shared.js";
import { ACTIONS, setRenderer, registerActions } from "./core/actions.js";

const NAV = [
  ["Overview", [["", "Home"], ["intelligence", "Intelligence"], ["quality", "Data Quality"]]],
  ["Database", [["companies", "Companies", "companies"], ["equipment", "Equipment", "equipment"], ["products", "Products & models", "models"], ["processes", "Processes", "processes"],
    ["technologies", "Technologies", "technologies"], ["materials", "Materials", "materials"], ["components", "Components", "components"], ["subsystems", "Subsystems", "subsystems"]]],
  ["Ecosystem", [["fabs", "Fabs", "fabs"], ["osats", "OSAT / ATMP", "osats"], ["facilities", "Facilities", "facilities"], ["suppliers", "Suppliers"], ["india", "India"], ["countries", "Countries", "countries"], ["map", "Global map"]]],
  ["Workspace", [["compare", "Compare"], ["sources", "Sources", "sources"], ["saved", "Saved"]]],
];
function renderNav(section) {
  const n = k => (k && DB[k] ? DB[k].length : null);
  $("#rail").innerHTML = NAV.map(([g, items]) => `<h4>${esc(g)}</h4>${items.map(([p, l, k]) => `<a href="#/${p}"${(section || "") === p ? ' aria-current="page"' : ""}><span>${esc(l)}</span>${n(k) != null ? `<span class="n">${n(k).toLocaleString()}</span>` : ""}</a>`).join("")}`).join("")
    + `<h4>Editions</h4><a href="legacy/"><span>Legacy atlas (v1)</span><span class="n">↗</span></a>
    <p class="asof">Evidence as of <b>${esc(DB.meta?.evidence_as_of || "")}</b><br>Schema ${esc(DB.meta?.schema_version || "")} · ${DB.sources ? DB.sources.length : ""} numbered sources</p>`;
}

// ---------- rendering
let lastPath = null;
async function render() {
  const ctx = current();
  // legacy record ids (C0001, P00001 …) keep working inside 2.0 routes
  if (ctx.path[1]) { const r = resolveLegacy(ctx.path[1]); if (r !== ctx.path[1]) { location.replace("#/" + [ctx.path[0], r, ...ctx.path.slice(2)].join("/") + (ctx.params.toString() ? "?" + ctx.params : "")); return; } }
  const section = ctx.path[0] || "";
  const view = ROUTES[section];
  const app = $("#app");
  const pathKey = ctx.path.join("/") + "|" + (ctx.params.get("tab") || "");
  const samePage = pathKey === lastPath;
  const focusKey = document.activeElement?.dataset?.fk || (document.activeElement?.id && app.contains(document.activeElement) ? "#" + document.activeElement.id : null);
  const facetFocus = document.activeElement?.matches?.("[data-facet]") ? `[data-facet="${document.activeElement.dataset.facet}"][value="${CSS.escape(document.activeElement.value)}"]` : null;
  renderNav(section.split("/")[0]);
  document.body.classList.remove("nav-open");
  $("#menubtn").setAttribute("aria-expanded", "false");
  let out;
  try {
    if (!view) out = { title: "Page not found", html: empty({ title: "This page does not exist.", tips: [`<a href="#/">go to the command centre</a>`, "use the search (Ctrl K)"] }) };
    else out = await view(ctx);
  } catch (err) {
    console.error(err);
    out = { title: "Error", html: `<div class="callout crit"><b>This view could not be rendered.</b><br>${esc(err.message)}<br><span class="small">The data may be malformed or a relationship may point to a missing record. Report it with the URL above.</span></div>` };
  }
  if (typeof out === "string") out = { html: out };
  app.innerHTML = out.html + `<footer class="foot">SEMICON-DB ${esc(DB.meta.schema_version)} · Evidence as of ${esc(DB.meta.evidence_as_of)} · Every fact carries a source and verification state; missing values are shown as missing, never estimated. <a href="#/quality">Methodology &amp; data quality</a> · <a href="legacy/">Legacy edition</a></footer>`;
  document.title = (out.title ? out.title + " · " : "") + "SEMICON-DB";
  if (out.after) try { out.after(app); } catch (e) { console.error(e); }
  fillClaims(app).catch(e => console.error(e));
  if (!samePage) { window.scrollTo(0, 0); const h = app.querySelector("h1"); if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); } }
  else if (facetFocus) app.querySelector(facetFocus)?.focus();
  else if (focusKey) { const el = focusKey.startsWith("#") ? app.querySelector(focusKey) : app.querySelector(`[data-fk="${focusKey}"]`); if (el) { el.focus(); if (el.setSelectionRange && el.value) el.setSelectionRange(el.value.length, el.value.length); } }
  lastPath = pathKey;
}

// ---------- events
document.addEventListener("click", e => {
  const t = e.target;
  if (handleTableEvent(e)) return;
  const src = t.closest("[data-sources]"); if (src) { const ids = src.dataset.sources.split(","); openDrawer(`Evidence (${ids.length} source${ids.length > 1 ? "s" : ""})`, srcList(ids)); return; }
  if (t.closest("[data-drawer-close]")) { closeDrawer(); return; }
  const sv = t.closest("[data-save]"); if (sv) { const on = ws.toggleSaved(sv.dataset.save); sv.setAttribute("aria-pressed", on); sv.textContent = on ? "★ Saved" : "☆ Save"; return; }
  const ct = t.closest("button[data-cmp-toggle]"); if (ct) { const [k, id] = ct.dataset.cmpToggle.split("|"); const on = ws.toggleCmp(k, id); ct.setAttribute("aria-pressed", on); ct.textContent = on ? "✓ In compare" : "+ Compare"; return; }
  if (t.closest("[data-copylink]")) { copyText(location.href, "Link copied"); return; }
  const cr = t.closest("[data-copyrecord]"); if (cr) { const r = get(cr.dataset.copyrecord); copyText(JSON.stringify(r, null, 2), "Record copied as JSON"); return; }
  if (t.closest("[data-print]")) { window.print(); return; }
  const chip = t.closest("[data-chip]"); if (chip) { const [k, v] = chip.dataset.chip.split("|"); const { params } = current(); setParams({ [k]: v ? listParam(params, k).filter(x => x !== v) : null }); return; }
  const fc = t.closest("[data-facet-clear]"); if (fc) { const { params } = current(); const keys = fc.dataset.facetClear === "all" ? [...params.keys()].filter(k => !["tab", "view", "sort"].includes(k)) : [fc.dataset.facetClear]; setParams(Object.fromEntries(keys.map(k => [k, null]))); return; }
  if (t.closest("[data-facets-toggle]")) { document.body.classList.toggle("facets-open"); return; }
  const vm = t.closest("[data-viewmode]"); if (vm) { ws.setPref("viewmode:" + vm.dataset.scope, vm.dataset.viewmode); setParams({ view: vm.dataset.viewmode }); return; }
  const sp = t.closest("[data-setparam]"); if (sp) { const [k, v] = sp.dataset.setparam.split("="); setParams({ [k]: v || null }); return; }
  const ss = t.closest("[data-savesearch]"); if (ss) { ws.saveSearch(ss.dataset.savesearch); return; }
  const sf = t.closest("[data-savefilter]"); if (sf) { const label = prompt("Name this filter view", sf.dataset.savefilter) || sf.dataset.savefilter; ws.saveFilter(label, location.hash); return; }
  const scmp = t.closest("[data-savecmp]"); if (scmp) { const [k, ids] = scmp.dataset.savecmp.split("|"); ws.saveComparison(k, ids.split(",")); return; }
  const act = t.closest("[data-action]"); if (act && ACTIONS[act.dataset.action]) { ACTIONS[act.dataset.action](act, e); return; }
  if (t.closest("#gsearch")) { openPalette(); return; }
  if (t.closest("#themebtn")) { const cur = document.documentElement.getAttribute("data-theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"); const nx = cur === "dark" ? "light" : "dark"; document.documentElement.setAttribute("data-theme", nx); store.set("theme", nx); return; }
  if (t.closest("#menubtn")) { const on = document.body.classList.toggle("nav-open"); $("#menubtn").setAttribute("aria-expanded", on); return; }
});
document.addEventListener("change", e => {
  if (handleTableEvent(e)) return;
  const t = e.target;
  if (t.matches("input[type=checkbox][data-cmp-toggle]")) { const [k, id] = t.dataset.cmpToggle.split("|"); ws.toggleCmp(k, id); if (current().path[0] === "compare") render(); return; }
  if (t.matches("[data-facet]")) { const { params } = current(); const k = t.dataset.facet; const cur = listParam(params, k); setParams({ [k]: t.checked ? [...cur, t.value] : cur.filter(v => v !== t.value) }); return; }
  if (t.matches("[data-param]")) { setParams({ [t.dataset.param]: t.value || null }); return; }
  const act = t.closest("[data-change]"); if (act && ACTIONS[act.dataset.change]) ACTIONS[act.dataset.change](act, e);
});
const qInput = debounce(t => setParams({ [t.dataset.qparam]: t.value || null }), 220);
document.addEventListener("input", e => {
  const t = e.target;
  if (t.matches("[data-qparam]")) { qInput(t); return; }
  if (t.matches("[data-fsearch]")) { const q = norm(t.value); t.parentElement.querySelectorAll("label[data-fl]").forEach(l => (l.hidden = q && !l.dataset.fl.includes(q))); return; }
  const act = t.closest("[data-input]"); if (act && ACTIONS[act.dataset.input]) ACTIONS[act.dataset.input](act, e);
});
document.addEventListener("keydown", e => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); paletteOpen() ? closePalette() : openPalette(); return; }
  if (e.key === "/" && !/input|textarea|select/i.test(document.activeElement.tagName) && !paletteOpen()) { e.preventDefault(); openPalette(); return; }
  if (e.key === "Escape") { if (closeDrawer()) return; if (document.body.classList.contains("facets-open")) { document.body.classList.remove("facets-open"); return; } if (document.body.classList.contains("nav-open")) { document.body.classList.remove("nav-open"); return; } }
});
// tooltips
const tip = $("#tip");
document.addEventListener("mousemove", e => {
  const el = e.target.closest?.("[data-tip]");
  if (!el || !el.dataset.tip) { tip.hidden = true; return; }
  tip.textContent = el.dataset.tip; tip.hidden = false;
  tip.style.left = Math.min(e.clientX + 14, innerWidth - tip.offsetWidth - 8) + "px"; tip.style.top = Math.min(e.clientY + 14, innerHeight - tip.offsetHeight - 8) + "px";
});
document.addEventListener("scroll", () => (tip.hidden = true), true);

setRenderer(render);
registerActions({ palette: () => openPalette() });

// ---------- boot
(async function boot() {
  if (/Mac|iPhone|iPad/.test(navigator.platform)) $("#kbdhint").textContent = "⌘ K";
  const app = $("#app");
  try {
    const t0 = performance.now();
    await load();
    buildIndex();
    DB.loadMs = performance.now() - t0;
  } catch (err) {
    console.error(err);
    app.innerHTML = `<div class="callout crit" role="alert"><b>Data failed to load.</b><br>${esc(err.message)}.<br>If you opened this file directly from disk, serve the folder over HTTP (e.g. <code>npx serve</code> or <code>python3 -m http.server</code>) — browsers block local data requests. The <a href="legacy/">legacy single-file edition</a> works offline.</div>`;
    return;
  }
  window.addEventListener("hashchange", () => { closeDrawer(false); closePalette(); render(); });
  await render();
})();

// Global ecosystem map. Country-level clustering (bubbles at approximate centroids) keeps thousands of
// records readable. The base map is pre-rendered at build time (scripts/build-map.mjs → data/basemap.json)
// and fetched only when this page opens; no map library or CDN is needed. If it cannot load, bubbles render
// on a plain grid and the table below remains the accessible view.
import { DB, get, hrefOf } from "../core/store.js";
import { esc, plural } from "../core/util.js";
import { pageHead, tags, empty } from "../ui/components.js";
import { setParams } from "../core/router.js";
import { registerActions } from "../core/actions.js";

const LAYERS = {
  companies: ["All companies", c => c.company_ids],
  oem: ["Equipment OEMs", c => c.equipment_oem_ids],
  subsystem: ["Subsystem suppliers", c => c.subsystem_supplier_ids],
  component: ["Component suppliers", c => c.component_supplier_ids],
  materials: ["Materials suppliers", c => c.materials_supplier_ids],
  fabs: ["Fabs / device makers", c => c.fab_ids],
  osat: ["OSAT / ATMP", c => c.osat_ids],
  india: ["India ecosystem (HQ or documented presence)", c => (c.iso2 === "IN" ? c.company_ids : c.india_partnership_company_ids)],
};
const W = 960, H = 500;
let geoCache = null;
async function loadGeo() {
  if (geoCache) return geoCache;
  const r = await fetch("data/basemap.json");
  if (!r.ok) throw new Error("basemap " + r.status);
  const b = await r.json();
  geoCache = { proj: (lon, lat, iso) => b.points[iso] || eqRect(lon, lat), sphere: b.sphere, land: [b.land], borders: b.borders };
  return geoCache;
}
const eqRect = (lon, lat) => [(lon + 180) / 360 * W, (90 - lat) / 180 * H];

function drawBubbles(proj, layer, sel) {
  const rows = DB.countries.map(c => ({ c, ids: LAYERS[layer][1](c) })).filter(x => x.ids.length);
  const max = Math.max(1, ...rows.map(r => r.ids.length));
  return rows.sort((a, b) => b.ids.length - a.ids.length).map(({ c, ids }) => { const [x, y] = proj(c.lon, c.lat, c.iso2); const r = 5 + 22 * Math.sqrt(ids.length / max);
    return `<g><circle class="bubble${sel === c.iso2 ? " sel" : ""}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" tabindex="0" role="button" data-action="mapsel" data-iso="${c.iso2}" aria-label="${esc(c.name)}: ${ids.length}"><title>${esc(c.name)}: ${ids.length}</title></circle>
      ${r > 9 ? `<text class="bubble-t" x="${x.toFixed(1)}" y="${(y + 3.5).toFixed(1)}" text-anchor="middle">${ids.length}</text>` : ""}</g>`; }).join("");
}
registerActions({ mapsel: el => setParams({ c: el.dataset.iso }) });

export function mapView({ params }) {
  const layer = LAYERS[params.get("layer")] ? params.get("layer") : "companies";
  const sel = params.get("c");
  const selC = sel ? DB.countries.find(c => c.iso2 === sel) : null;
  const rows = DB.countries.map(c => ({ c, ids: LAYERS[layer][1](c) })).filter(x => x.ids.length).sort((a, b) => b.ids.length - a.ids.length);
  const unplaced = layer === "companies" ? DB.companies.filter(c => !c.hq.country_id).length : 0;
  const panel = selC ? `<div class="panel"><div class="row sp"><h2>${esc(selC.name)}</h2><a class="btn sm" href="${hrefOf(selC.id)}">Country page</a></div><p class="small muted">${esc(LAYERS[layer][0])}: ${LAYERS[layer][1](selC).length}</p>
      ${LAYERS[layer][1](selC).map(get).map(r => `<div style="padding:5px 0;border-bottom:1px solid var(--line-2)"><a href="${hrefOf(r.id)}"><b>${esc(r.name)}</b></a><div class="xs muted">${esc(r.company_type || r.facility_type || "")}${r.hq?.city ? " · " + esc(r.hq.city) : ""}${r.primary_equipment ? " · " + esc(r.primary_equipment) : ""}</div></div>`).join("")}</div>`
    : `<div class="panel"><h2>Select a country</h2><p class="small ink2">Click a bubble (or use Tab + Enter) to list the companies or facilities in that country.</p></div>`;
  const html = pageHead({ eyebrow: "Geography", title: "Global ecosystem map", crumb: [["Home", "#/"], ["Global map", null]],
    lede: "Headquarters clustered by country. Bubbles sit at approximate country centroids — they are not facility locations. Facility-level coordinates are not captured in the current evidence set." })
    + `<div class="toolbar"><label class="small" for="layer">Layer</label><select id="layer" class="select" data-param="layer">${Object.entries(LAYERS).map(([k, [l]]) => `<option value="${k}"${k === layer ? " selected" : ""}>${esc(l)}</option>`).join("")}</select>
      <span class="rescount">${plural(rows.reduce((a, r) => a + r.ids.length, 0), "record")} in ${plural(rows.length, "country", "countries")}${unplaced ? ` · ${unplaced} companies without a captured country are not drawn` : ""}</span></div>
    <div class="grid" style="grid-template-columns:minmax(0,2.2fr) minmax(260px,1fr);align-items:start"><div class="mapbox" id="mapbox"><div class="sk" style="height:420px" aria-label="Loading map"></div></div><div>${panel}</div></div>
    <div class="panel sec"><h2>Table view</h2><table class="spec"><tbody>${rows.map(({ c, ids }) => `<tr><th><a href="#/map?layer=${layer}&c=${c.iso2}">${esc(c.name)}</a><span class="sub">${esc(c.region)}</span></th><td>${ids.length}</td><td>${tags(ids.slice(0, 8))}</td></tr>`).join("") || `<tr><td>${empty({ title: "No records in this layer." })}</td></tr>`}</tbody></table></div>`;
  return { title: "Global map", html, after: async app => {
    const box = app.querySelector("#mapbox"); if (!box) return;
    let proj = eqRect, land = "", note = "";
    try { const g = await loadGeo(); proj = g.proj; land = `<path d="${g.sphere}" fill="var(--surface)" stroke="var(--line)"/>` + g.land.map(d => `<path class="land" d="${d}"/>`).join("") + `<path d="${g.borders}" fill="none" stroke="var(--surface)" stroke-width=".5"/>`; }
    catch { note = `<p class="note" style="padding:0 10px 8px">Base map could not be loaded — showing an equirectangular grid instead.</p>`;
      land = `<rect width="${W}" height="${H}" fill="var(--surface)"/>` + [-60, -30, 0, 30, 60].map(l => `<line x1="0" x2="${W}" y1="${eqRect(0, l)[1]}" y2="${eqRect(0, l)[1]}" stroke="var(--line)"/>`).join("") + [-120, -60, 0, 60, 120].map(l => `<line y1="0" y2="${H}" x1="${eqRect(l, 0)[0]}" x2="${eqRect(l, 0)[0]}" stroke="var(--line)"/>`).join(""); }
    if (!document.body.contains(box)) return;
    box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="group" aria-label="Map of ${esc(LAYERS[layer][0])} by country">${land}${drawBubbles(proj, layer, sel)}</svg>${note}`;
    box.addEventListener("keydown", e => { if (e.key === "Enter" && e.target.dataset.iso) setParams({ c: e.target.dataset.iso }); });
  } };
}

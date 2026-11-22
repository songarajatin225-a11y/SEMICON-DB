// Technology, material and application layers (list + detail pages share one layout).
import { DB, get, hrefOf } from "../core/store.js";
import { esc, uniq, plural, countBy } from "../core/util.js";
import { pageHead, crumbs, tags, link, basis, empty, quickActions, bars } from "../ui/components.js";
import { dataTable } from "../ui/table.js";
import { modelTable, relationsSection } from "./shared.js";

function listPage({ kind, title, lede, rows, groupKey, groupLabel, extraCols = [] }) {
  const groups = [...new Set(rows.map(r => r[groupKey]))];
  const html = pageHead({ eyebrow: "Database", title, crumb: [["Home", "#/"], [title, null]], lede })
    + `<div class="panel" style="margin-bottom:14px"><h2>${esc(groupLabel)}</h2>${bars(groups.map(g => ({ l: g, v: rows.filter(r => r[groupKey] === g).length, lab: `${rows.filter(r => r[groupKey] === g).length} · ${uniq(rows.filter(r => r[groupKey] === g).flatMap(r => r.model_ids)).length} models` })), { lw: 170 })}</div>`
    + dataTable({ id: kind, rows, title, exportName: "semicon-db-" + kind, columns: [
      { k: "name", label: "Name", pin: true, get: r => r.name, html: r => `<a class="rowlink" href="${hrefOf(r.id)}">${esc(r.name)}</a><span class="sub mono">${esc(r.id)}${r.legacy_code ? " · " + esc(r.legacy_code) : ""}</span>` },
      { k: groupKey, label: groupLabel, get: r => r[groupKey] },
      ...extraCols,
      { k: "models", label: "Models", num: true, get: r => r.model_ids.length },
      { k: "companies", label: "Companies", num: true, get: r => r.company_ids.length },
      { k: "processes", label: "Processes", wrap: true, get: r => (r.process_ids || []).length, html: r => (r.process_ids || []).length ? r.process_ids.slice(0, 3).map(p => link(p)).join(", ") : `<span class="muted">—</span>` },
    ], sort: { k: "models", d: -1 } });
  return { title, html };
}
function detailPage(r, { section, sectionHref, extra = "" }) {
  const models = r.model_ids.map(get);
  const html = `${crumbs([["Home", "#/"], [section, sectionHref], [r.name, null]])}
    <div class="ehead"><div class="eyebrow">${esc(r.id)} · ${esc(r.family || r.material_class || r.group || "")}</div><h1 class="pt">${esc(r.name)}</h1>
    ${r.description ? `<p class="lede" style="margin-bottom:6px">${esc(r.description)}</p>` : ""}<div class="row">${basis("reference")}<span class="xs muted">${esc(r.content_basis || r.link_basis || "")}</span></div>
    <div class="kv"><dl><dt>Models</dt><dd>${models.length}</dd></dl><dl><dt>Companies</dt><dd>${r.company_ids.length}</dd></dl>${r.aliases?.length ? `<dl><dt>Also called</dt><dd>${esc(r.aliases.join(", "))}</dd></dl>` : ""}</div>
    ${quickActions(r.id)}</div>
    ${extra}
    <div class="grid g2">${r.process_ids ? `<div class="panel"><h2>Processes</h2>${tags(r.process_ids, { empty: "—" })}</div>` : ""}${r.equipment_ids ? `<div class="panel"><h2>Equipment categories</h2>${tags(r.equipment_ids, { empty: "—" })}</div>` : ""}</div>
    <div class="panel sec"><h2>Companies in the database</h2>${tags(r.company_ids, { max: 40, empty: "None linked yet" })}<p class="note">Companies with a source-backed record in this ${esc(section.toLowerCase().replace(/s$/, ""))}. Listing is not a leadership or market-share claim.</p></div>
    <div class="sec">${models.length ? modelTable("tx-" + r.id, models, { title: "Models" }) : empty({ title: "No model is linked yet.", kind: "not-available" })}</div>
    <details class="panel sec"><summary><b>Relationship graph</b></summary>${relationsSection(r.id)}</details>`;
  return { title: r.name, html };
}

export function technologies({ path }) {
  if (path[1]) { const r = get(path[1]); if (!r || r.entity_type !== "technology") return { title: "Not found", html: empty({ title: "Technology not found." }) };
    return detailPage(r, { section: "Technologies", sectionHref: "#/technologies" }); }
  return listPage({ kind: "technologies", title: "Technologies", groupKey: "family", groupLabel: "Technology family", rows: DB.technologies,
    lede: "Technology layer: lithography, etch, deposition, doping, thermal, planarisation, inspection, dicing, bonding, packaging architectures, test and 25 laser process/source types. Model links come from source-backed equipment categories and source-stated laser types." });
}
export function materials({ path }) {
  if (path[1]) { const r = get(path[1]); if (!r || r.entity_type !== "material") return { title: "Not found", html: empty({ title: "Material not found." }) };
    const extra = r.supplier_company_ids_class_level?.length ? `<div class="callout">Materials/gas suppliers in the database (class level, not itemised per material): ${r.supplier_company_ids_class_level.map(x => link(x)).join(", ")}.</div>` : `<div class="callout">Grade/purity, safety class and material suppliers are not captured in Batch 1 for this material.</div>`;
    return detailPage(r, { section: "Materials", sectionHref: "#/materials", extra }); }
  return listPage({ kind: "materials", title: "Materials", groupKey: "material_class", groupLabel: "Material class", rows: DB.materials,
    lede: "Substrates, gases, chemicals, deposition materials, CMP consumables and packaging materials. Substrate links (SiC, GaN, glass …) are derived by text match on the material, wafer and application fields that each source states." });
}
export function applications({ path }) {
  if (path[1]) { const r = get(path[1]); if (!r || r.entity_type !== "application") return { title: "Not found", html: empty({ title: "Application not found." }) };
    return detailPage(r, { section: "Applications", sectionHref: "#/applications" }); }
  return listPage({ kind: "applications", title: "Applications & devices", groupKey: "group", groupLabel: "Device group", rows: DB.applications,
    lede: "Device and end-market dimensions (logic, memory, HBM, power, SiC, GaN, RF, MEMS, photonics, display, advanced packaging, automotive). Links are derived from the application text each source states." });
}
export { plural, countBy };

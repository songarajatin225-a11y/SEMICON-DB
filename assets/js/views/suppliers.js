// Supplier intelligence: OEMs separated from subsystem/component/materials/service suppliers,
// the reference laser-tool BOM with documented suppliers, and every named supply link.
import { DB, get, hrefOf, nameOf } from "../core/store.js";
import { esc, uniq, plural, norm } from "../core/util.js";
import { readState, applyFacets, facetPanel, activeChips, listing } from "../ui/facets.js";
import { pageHead, badge, srcBtn, link, val, empty } from "../ui/components.js";
import { dataTable } from "../ui/table.js";

const ROLE_ORDER = ["Equipment OEM", "Subsystem Supplier", "Component Supplier", "Laser Supplier", "Optics Supplier", "Motion Supplier", "Vacuum Supplier", "RF Supplier", "Automation Supplier", "Robotics Supplier", "Gas Supplier", "Materials Supplier", "Integrator", "Service Provider", "Distributor"];
export function suppliers({ params }) {
  const eqFocus = params.get("eq") ? get(params.get("eq")) : null;
  const rows0 = DB.suppliers.map(s => ({ ...s, id: s.company_id, c: get(s.company_id) }));
  let rows = rows0;
  let focusNote = "";
  if (eqFocus) {
    const subIds = eqFocus.typical_subsystem_ids;
    const capable = new Set(subIds.flatMap(s => get(s).potential_supplier_ids));
    const makers = new Set(eqFocus.company_ids_incl_children);
    rows = rows0.filter(r => capable.has(r.id) || makers.has(r.id));
    focusNote = `<div class="callout">Showing suppliers relevant to <b>${link(eqFocus.id)}</b>: ${makers.size} companies confirmed for the category, plus ${capable.size} with documented capability in its typical subsystems (${subIds.map(s => nameOf(s)).join(", ")}). <a href="#/suppliers">Show all</a></div>`;
  }
  const defs = [
    { key: "role", label: "Supplier role", get: r => r.supplier_types, options: ROLE_ORDER, open: true },
    { key: "component", label: "Component class", get: r => r.component_class_ids, label_of: nameOf },
    { key: "subsystem", label: "Subsystem", get: r => r.subsystem_ids, label_of: nameOf },
    { key: "country", label: "Country", get: r => [r.country || "Not captured"] },
    { key: "india", label: "India", get: r => [r.c.hq.country === "India" ? "hq" : r.c.india.has_presence ? "presence" : "none"], label_of: v => ({ hq: "HQ in India", presence: "Documented presence", none: "None documented" }[v]) },
    { key: "links", label: "Evidence of supply", get: r => [r.documented_links.length ? "documented" : r.capability_links.length ? "capability" : "none"], label_of: v => ({ documented: "Documented supply link", capability: "Capability only", none: "No supply-chain link" }[v]) },
    { key: "ver", label: "Verification", get: r => [r.c.verification] },
  ];
  const state = readState(defs, params);
  const q = params.get("q") || "";
  const { rows: shown, counts } = applyFacets(rows, defs, state, q, r => norm([r.name, r.company_type, r.country, r.supplier_types.join(" "), r.component_class_ids.map(nameOf).join(" ")].join(" ")));
  const table = dataTable({ id: "suppliers", rows: shown, title: "", exportName: "semicon-db-suppliers", compareKind: "company", columns: [
    { k: "name", label: "Supplier", pin: true, get: r => r.name, html: r => `<a class="rowlink" href="${hrefOf(r.id)}">${esc(r.name)}</a><span class="sub">${esc(r.company_type)}</span>` },
    { k: "roles", label: "Roles", wrap: true, get: r => r.supplier_types.join("; ") },
    { k: "country", label: "Country", get: r => r.country || "", html: r => val(r.country) },
    { k: "components", label: "Component classes", wrap: true, get: r => r.component_class_ids.map(nameOf).join("; "), html: r => r.component_class_ids.length ? r.component_class_ids.map(x => link(x)).join(", ") : `<span class="muted">—</span>` },
    { k: "doc", label: "Documented links", num: true, get: r => r.documented_links.length },
    { k: "cap", label: "Capability links", num: true, get: r => r.capability_links.length },
    { k: "equipment", label: "Equipment (source-confirmed)", wrap: true, get: r => r.c.primary_equipment || "", html: r => val(r.c.primary_equipment, { reason: "—" }) },
    { k: "ver", label: "Status", get: r => r.c.verification, html: r => badge(r.c.verification) },
    { k: "sources", label: "Sources", num: true, get: r => r.c.source_ids.length, html: r => srcBtn(r.c.source_ids) }], sort: { k: "doc", d: -1 } });
  const n = Object.values(state).flat().length;
  const toolbar = `<div class="toolbar"><input class="input q" type="search" placeholder="Filter suppliers…" value="${esc(q)}" data-qparam="q" data-fk="spq" aria-label="Filter suppliers"><button class="btn filters-toggle" data-facets-toggle>Filters${n ? ` (${n})` : ""}</button><span class="rescount">${plural(shown.length, "supplier")}</span></div>`;

  // Reference laser-dicing BOM (legacy supplier map, preserved)
  const bom = DB.components.filter(c => c.legacy_bom_codes.some(b => /^BOM/.test(b))).sort((a, b) => a.legacy_bom_codes[0].localeCompare(b.legacy_bom_codes[0]));
  const bomHtml = `<div class="cards">${bom.map(c => `<article class="card"><div class="top"><a class="ttl" href="${hrefOf(c.id)}">${esc(c.name)}</a><span class="code">${esc(c.legacy_bom_codes.join(", "))}</span></div>
    ${c.gap ? badge("GAP") : `<div class="tags" style="position:relative;z-index:1">${c.capable_supplier_ids.map(s => `<a class="tag" href="${hrefOf(s)}">${esc(nameOf(s))} <span class="k">${esc(get(s).hq.country || "")}</span></a>`).join("") || `<span class="na">None captured</span>`}</div>`}
    ${DB.relationships.filter(r => c.documented_supply_links.map(l => "REL-SP-" + l.slice(2)).includes(r.id)).map(r => `<p style="margin:0;position:relative;z-index:1" class="xs ink2">${badge(r.status)} ${esc(nameOf(r.from))} → ${esc(r.detail.oem || nameOf(r.to))}: ${esc(r.detail.component || "")}</p>`).join("")}</article>`).join("")}</div>`;
  const links = DB.relationships.filter(r => ["supplies", "integrates", "distributes", "evaluated_by"].includes(r.type));
  const linkTable = dataTable({ id: "supply-links", rows: links, title: "Named supply links", exportName: "semicon-db-supply-links", columns: [
    { k: "equipment", label: "Equipment", wrap: true, get: r => r.detail.equipment || "" }, { k: "oem", label: "OEM", get: r => r.detail.oem || nameOf(r.to), html: r => r.to.startsWith("CMP") ? link(r.to) : esc(r.detail.oem || "") },
    { k: "subsystem", label: "Subsystem", get: r => r.detail.subsystem || "" }, { k: "supplier", label: "Supplier", get: r => nameOf(r.from), html: r => link(r.from) },
    { k: "component", label: "Component", wrap: true, get: r => r.detail.component || "" }, { k: "type", label: "Link type", get: r => r.status, html: r => badge(r.status) },
    { k: "evidence", label: "Evidence", wrap: true, get: r => r.detail.evidence || "" }, { k: "sources", label: "Sources", get: r => r.source_ids.length, num: true, html: r => srcBtn(r.source_ids) }] });
  const html = pageHead({ eyebrow: "Ecosystem", title: "Suppliers", crumb: [["Home", "#/"], ["Suppliers", null]],
    lede: "Equipment OEMs are kept separate from subsystem, component, laser, optics, motion, vacuum, RF, automation, materials, integration, service and distribution suppliers. A capability link means a source documents the product class; only a documented link states supply to a named OEM." })
    + focusNote + listing({ facets: facetPanel(defs, state, counts), toolbar, chips: activeChips(defs, state, { q }), content: table })
    + `<section class="sec"><div class="eyebrow">Reference bill of materials</div><h2>Inside a laser dicing tool — documented suppliers per component class</h2><p class="small ink2">Batch-1 reference BOM (legacy supplier map). Capability is not the same as supply to a named OEM.</p>${bomHtml}</section>`
    + `<section class="sec">${linkTable}</section>`;
  return { title: "Suppliers", html };
}
export { uniq, empty };

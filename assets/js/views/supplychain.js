// Subsystem and component intelligence layers (equipment development / localisation view).
import { DB, get, hrefOf, inn } from "../core/store.js";
import { esc, uniq, plural } from "../core/util.js";
import { pageHead, crumbs, tags, link, basis, empty, specTable, badge, srcBtn, quickActions, val } from "../ui/components.js";
import { dataTable } from "../ui/table.js";
import { modelTable } from "./shared.js";

const supplierRow = (cpnId, coId) => {
  const rel = inn(cpnId, ["capable_of_supplying"]).find(r => r.from === coId) || null;
  return { id: coId, c: get(coId), rel };
};
export function components({ path }) {
  if (path[1]) {
    const x = get(path[1]);
    if (!x || x.entity_type !== "component") return { title: "Not found", html: empty({ title: "Component class not found." }) };
    const sups = x.capable_supplier_ids.map(id => supplierRow(x.id, id));
    const docs = DB.relationships.filter(r => x.documented_supply_links.map(l => "REL-SP-" + l.slice(2)).includes(r.id));
    const html = `${crumbs([["Home", "#/"], ["Components", "#/components"], [x.category, null], [x.name, null]])}
      <div class="ehead"><div class="eyebrow">${esc(x.id)} · ${esc(x.category)} component class</div><h1 class="pt">${esc(x.name)}</h1>
      <div class="kv"><dl><dt>Subsystem</dt><dd>${link(x.subsystem_id)}</dd></dl><dl><dt>Suppliers with documented capability</dt><dd>${sups.length}</dd></dl><dl><dt>India suppliers</dt><dd>${x.india_supplier_ids.length ? x.india_supplier_ids.map(i => link(i)).join(", ") : "None captured"}</dd></dl><dl><dt>Batch-1 BOM code</dt><dd class="mono">${esc(x.legacy_bom_codes.join(", ") || "—")}</dd></dl></div>
      ${quickActions(x.id)}</div>
      ${x.gap ? `<div class="callout warn"><b>No supplier captured.</b> ${esc(x.gap_note || "The Batch-1 laser-dicing BOM has no documented supplier for this class.")}</div>` : ""}
      <div class="grid g2"><div class="panel"><h2>Specification fields</h2>${specTable([["Specification", val(null)], ["Operating range", val(null)], ["Precision", val(null)], ["Interface", val(null)], ["Obsolescence status", val(null)]])}<p class="note">Class-level record: specifications belong to individual component products below.</p></div>
      <div class="panel"><h2>Where it is used</h2><p class="small">Part of the ${link(x.subsystem_id)}.</p>${tags(get(x.subsystem_id).typical_equipment_ids.slice(0, 16), { empty: "—" })}<p class="note">${basis("reference")}</p></div></div>
      <div class="sec">${dataTable({ id: "cpn-sup-" + x.id, rows: sups, title: "Suppliers with documented capability", exportName: "suppliers-" + x.slug, empty: { title: "No supplier captured for this component class yet." }, columns: [
        { k: "name", label: "Supplier", pin: true, get: r => r.c.name, html: r => `<a class="rowlink" href="${hrefOf(r.id)}">${esc(r.c.name)}</a><span class="sub">${esc(r.c.company_type)}</span>` },
        { k: "country", label: "Country", get: r => r.c.hq.country || "", html: r => val(r.c.hq.country) },
        { k: "india", label: "India", get: r => r.c.hq.country === "India" ? "HQ" : r.c.india.has_presence ? "Presence" : "", html: r => r.c.hq.country === "India" ? "HQ in India" : r.c.india.has_presence ? esc(r.c.india.summary) : `<span class="muted">—</span>` },
        { k: "evidence", label: "Capability evidence", wrap: true, get: r => r.rel?.detail?.evidence || "", html: r => val(r.rel?.detail?.evidence || r.rel?.detail?.component, { reason: "—" }) },
        { k: "status", label: "Link type", get: r => r.rel?.status || "", html: r => badge(r.rel?.status || "CAPABLE_SUPPLIER") },
        { k: "sources", label: "Sources", get: r => (r.rel?.source_ids || []).length, html: r => srcBtn(r.rel?.source_ids || r.c.source_ids) }] })}
      <p class="note">Capability means a source documents that the company makes this class of component. It is not evidence of supply to any named OEM.</p></div>
      ${docs.length ? `<div class="panel sec"><h2>Documented supply links</h2><table class="spec"><tbody>${docs.map(r => `<tr><th>${badge(r.status)}</th><td>${link(r.from)} → ${link(r.to)}<span class="sub">${esc([r.detail.equipment, r.detail.component, r.detail.evidence].filter(Boolean).join(" · "))}</span></td><td>${srcBtn(r.source_ids)}</td></tr>`).join("")}</tbody></table></div>` : ""}
      <div class="sec">${x.product_model_ids.length ? modelTable("cpn-md-" + x.id, x.product_model_ids.map(get), { title: "Component products" }) : ""}</div>`;
    return { title: x.name, html };
  }
  const cats = [...new Set(DB.components.map(c => c.category))];
  const html = pageHead({ eyebrow: "Database", title: "Components", crumb: [["Home", "#/"], ["Components", null]],
    lede: `${DB.components.length} component classes across motion, optics, vacuum, RF, thermal, gas/chemical, automation and electrical. Supplier links come from the Batch-1 supplier register; the register is deepest for the laser-dicing tool BOM.` })
    + `<div class="grid g4" style="margin-bottom:14px">${cats.map(k => { const cs = DB.components.filter(c => c.category === k); const sup = uniq(cs.flatMap(c => c.capable_supplier_ids));
      return `<div class="panel"><h2>${esc(k)}</h2><div class="small ink2">${plural(cs.length, "class", "classes")} · ${plural(sup.length, "supplier")}</div><div class="tags" style="margin-top:6px">${cs.map(c => `<a class="tag${c.capable_supplier_ids.length ? "" : " faint"}" href="${hrefOf(c.id)}">${esc(c.name)} <span class="k">${c.capable_supplier_ids.length}</span></a>`).join("")}</div></div>`; }).join("")}</div>`
    + dataTable({ id: "components", rows: DB.components, title: "Component classes", exportName: "semicon-db-components", sort: { k: "suppliers", d: -1 }, columns: [
      { k: "name", label: "Component", pin: true, get: r => r.name, html: r => `<a class="rowlink" href="${hrefOf(r.id)}">${esc(r.name)}</a><span class="sub mono">${esc(r.id)}</span>` },
      { k: "category", label: "Category" }, { k: "subsystem", label: "Subsystem", get: r => get(r.subsystem_id).name, html: r => link(r.subsystem_id) },
      { k: "suppliers", label: "Capable suppliers", num: true, get: r => r.capable_supplier_ids.length },
      { k: "docs", label: "Documented links", num: true, get: r => r.documented_supply_links.length },
      { k: "products", label: "Product records", num: true, get: r => r.product_model_ids.length },
      { k: "india", label: "India suppliers", num: true, get: r => r.india_supplier_ids.length },
      { k: "gap", label: "Status", get: r => (r.gap ? "GAP" : r.capable_supplier_ids.length ? "covered" : "not captured"), html: r => r.gap ? badge("GAP") : r.capable_supplier_ids.length ? `<span class="pill">Suppliers captured</span>` : `<span class="muted">Not captured</span>` }] });
  return { title: "Components", html };
}

export function subsystems({ path }) {
  if (path[1]) {
    const s = get(path[1]);
    if (!s || s.entity_type !== "subsystem") return { title: "Not found", html: empty({ title: "Subsystem not found." }) };
    const loc = DB.intel.localization.filter(l => s.localization_notes.includes(l.id));
    const html = `${crumbs([["Home", "#/"], ["Subsystems", "#/subsystems"], [s.name, null]])}
      <div class="ehead"><div class="eyebrow">${esc(s.id)} · Subsystem</div><h1 class="pt">${esc(s.name)}</h1><p class="lede" style="margin-bottom:6px">${esc(s.architecture)}</p>
      <div class="row">${basis("reference")}<span class="xs muted">${esc(s.content_basis)}</span></div>${quickActions(s.id)}</div>
      <div class="grid g2"><div class="panel"><h2>Architecture & function</h2>${specTable([["Functions", esc(s.functions.join("; "))], ["Inputs", esc(s.inputs.join(", "))], ["Outputs", esc(s.outputs.join(", "))],
        ["Interfaces", esc(s.interfaces.join("; "))], ["Integration requirements", esc(s.integration_requirements.join("; "))]])}</div>
      <div class="panel"><h2>Engineering risk</h2>${specTable([["Critical parameters", esc(s.critical_parameters.join(", "))], ["Failure modes", esc(s.failure_modes.join("; "))], ["Cost drivers", esc(s.cost_drivers.join("; "))], ["Cost figures", val(null, { reason: "Not recorded — no source-backed cost data" })]])}</div></div>
      <div class="grid g2 sec"><div class="panel"><h2>Critical components</h2>${tags(s.component_ids)}</div><div class="panel"><h2>Potential suppliers (${s.potential_supplier_ids.length})</h2>${tags(s.potential_supplier_ids, { max: 40, empty: "None captured" })}<p class="note">Companies with source-documented capability for at least one component class of this subsystem.</p></div></div>
      <div class="panel sec"><h2>Typical equipment</h2>${tags(s.typical_equipment_ids.filter(id => get(id).company_ids_incl_children.length), { max: 40, empty: "—" })}<p class="note">Equipment categories (with records) whose generic architecture includes this subsystem. ${s.typical_equipment_ids.length} categories in total.</p></div>
      <div class="panel sec"><h2>Localisation notes</h2>${loc.length ? `<table class="spec"><tbody>${loc.map(l => `<tr><th>${esc(l.eq)}<span class="sub">${esc(l.id)} · ${esc(l.pot)}</span></th><td>${esc(l.crit)}<span class="sub">Current suppliers: ${esc(l.cur)} · India: ${esc(l.ind)}</span></td><td>${srcBtn(l.source_ids)}</td></tr>`).join("")}</tbody></table><p class="note">Rule-based analyst assessment from Batch 1, shown with its sources.</p>` : `<p class="na">No localisation assessment references this subsystem.</p>`}</div>`;
    return { title: s.name, html };
  }
  const html = pageHead({ eyebrow: "Database", title: "Subsystems", crumb: [["Home", "#/"], ["Subsystems", null]],
    lede: "The building blocks inside semiconductor tools — laser, optics, motion, vacuum, RF/plasma, gas and chemical delivery, wafer handling, vision, metrology, cooling, thermal, electrical, control, safety and software — with their components, interfaces, failure modes and documented suppliers." })
    + `<div class="cards">${DB.subsystems.map(s => `<article class="card"><div class="top"><a class="ttl" href="${hrefOf(s.id)}">${esc(s.name)}</a><span class="code">${esc(s.id)}</span></div><div class="small ink2">${esc(s.architecture)}</div>
      <dl><dt>Components</dt><dd>${s.component_ids.length}</dd><dt>Suppliers</dt><dd>${s.potential_supplier_ids.length || "None captured"}</dd><dt>Equipment</dt><dd>${s.typical_equipment_ids.length} categories</dd></dl></article>`).join("")}</div>`;
  return { title: "Subsystems", html };
}

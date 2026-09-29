// Fab and OSAT/ATMP intelligence (organisation + site level), and other named customers.
import { DB, get, hrefOf, inn } from "../core/store.js";
import { esc, uniq, countBy, sortedEntries } from "../core/util.js";
import { pageHead, crumbs, tags, link, empty, specTable, badge, srcBtn, quickActions, val, bars, kpi } from "../ui/components.js";
import { dataTable } from "../ui/table.js";
import { relationsSection } from "./shared.js";

function listPage(kind, rows, title, lede, section) {
  const byC = sortedEntries(countBy(rows, r => r.country || "Not captured"));
  const links = rows.flatMap(r => inn(r.id, "supplies_equipment_to"));
  const html = pageHead({ eyebrow: "Ecosystem", title, crumb: [["Home", "#/"], [section, null]], lede })
    + `<div class="kpis" style="margin-bottom:14px">${kpi({ v: rows.length, l: title })}${kpi({ v: rows.reduce((a, r) => a + r.sites.length, 0), l: "Named sites" })}${kpi({ v: links.length, l: "Equipment-supplier links", s: `${links.filter(l => l.status === "CONFIRMED").length} confirmed` })}${kpi({ v: uniq(links.map(l => l.from)).length, l: "Equipment suppliers linked" })}</div>`
    + `<div class="grid g2" style="margin-bottom:14px"><div class="panel"><h2>By country</h2>${bars(byC.map(([l, v]) => ({ l, v })), { lw: 120 })}</div><div class="panel"><h2>By facility type</h2>${bars(sortedEntries(countBy(rows, r => r.facility_type)).map(([l, v]) => ({ l, v })), { lw: 170 })}</div></div>`
    + dataTable({ id: kind, rows, title, exportName: "semicon-db-" + kind, columns: [
      { k: "name", label: "Organisation", pin: true, get: r => r.name, html: r => `<a class="rowlink" href="${hrefOf(r.id)}">${esc(r.name)}</a><span class="sub mono">${esc(r.id)}</span>` },
      { k: "type", label: "Type", get: r => r.facility_type }, { k: "country", label: "Country", get: r => r.country || "", html: r => val(r.country) },
      { k: "sites", label: "Sites (as named in sources)", wrap: true, get: r => r.sites.map(s => s.name).join("; "), html: r => r.sites.length ? esc(r.sites.map(s => s.name).join("; ")) : `<span class="na">Not captured</span>` },
      { k: "suppliers", label: "Equipment suppliers", num: true, get: r => r.equipment_supplier_ids.length },
      { k: "confirmed", label: "Confirmed links", num: true, get: r => r.confirmed_links },
      { k: "sources", label: "Sources", num: true, get: r => r.source_ids.length, html: r => srcBtn(r.source_ids) }], sort: { k: "suppliers", d: -1 } })
    + `<p class="note">Capacity, process node, wafer size and investment are not captured at facility level in Batch 1 unless a site description states them. They are never estimated.</p>`;
  return { title, html };
}
function detail(r, section, sectionHref) {
  // an organisation listed as both fab and OSAT shares one set of supplier links
  const links = [...inn(r.id, "supplies_equipment_to"), ...(r.also_listed_as ? inn(r.also_listed_as, "supplies_equipment_to") : [])];
  const deals = DB.deals.filter(d => d.party_a_id === r.id || d.party_b_id === r.id);
  const models = uniq(links.map(l => l.detail.model_id)).map(get).filter(Boolean);
  const html = `${crumbs([["Home", "#/"], [section, sectionHref], [r.name, null]])}
    <div class="ehead"><div class="eyebrow">${esc(r.id)} · ${esc(r.facility_type)}</div><h1 class="pt">${esc(r.name)}</h1>
    <div class="kv"><dl><dt>Country</dt><dd>${r.country_id ? link(r.country_id) : val(r.country)}</dd></dl><dl><dt>Named sites</dt><dd>${r.sites.length}</dd></dl><dl><dt>Equipment suppliers</dt><dd>${r.equipment_supplier_ids.length}</dd></dl>
      ${r.also_listed_as ? `<dl><dt>Also listed as</dt><dd>${link(r.also_listed_as, get(r.also_listed_as).entity_type === "osat" ? "OSAT / ATMP record" : "Fab record")}</dd></dl>` : ""}</div>
    <div class="row" style="margin-top:8px">${srcBtn(r.source_ids)}</div>${quickActions(r.id)}</div>
    <div class="grid g2"><div class="panel"><h2>Sites</h2>${r.sites.length ? `<table class="spec"><tbody>${r.sites.map(s => `<tr><th>${esc(s.name)}</th><td class="xs muted">${esc(s.basis)}</td><td>${srcBtn(s.source_ids)}</td></tr>`).join("")}</tbody></table>` : `<p class="na">No site named in the captured sources.</p>`}</div>
      <div class="panel"><h2>Facility profile</h2>${specTable([["Status", val(r.status)], ["Monthly capacity", val(r.capacity)], ["Process node", val(r.process_node)], ["Wafer size", val(r.wafer_size)], ["Investment", val(r.investment)]])}<p class="note">${esc(r.field_note)} Where a site description above states such values, it is quoted verbatim.</p></div></div>
    <div class="panel sec"><h2>Equipment suppliers & tools (${links.length})</h2>${links.length ? `<table class="spec"><thead><tr><th>Supplier</th><th>Product / stage / site</th><th>Evidence</th></tr></thead><tbody>${links.map(l => `<tr><th>${link(l.from)}</th><td>${l.detail.model_id ? link(l.detail.model_id) : esc(l.detail.product || "Product not named")}<span class="sub">${esc([l.detail.stage, l.detail.site, l.detail.location, l.detail.application].filter(Boolean).join(" · "))}</span><span class="sub">${esc(l.detail.evidence || "")}</span></td><td>${badge(l.status)} ${srcBtn(l.source_ids)}<span class="sub">${esc(l.date || "")}</span></td></tr>`).join("")}</tbody></table>` : `<p class="na">No equipment supplier is publicly named for this organisation in the captured sources.</p>`}
      <p class="note">Confirmed = the supplier, the customer or a filing states it. Probable = reported or evaluation-stage.</p></div>
    ${models.length ? `<div class="panel sec"><h2>Known equipment models</h2>${tags(models.map(m => m.id))}</div>` : ""}
    ${deals.length ? `<div class="panel sec"><h2>Partnerships & agreements</h2><table class="spec"><tbody>${deals.map(d => `<tr><th>${esc(d.event_type)}</th><td>${esc(d.party_a)} · ${esc(d.party_b)}<span class="sub">${esc([d.date, d.technology, d.value_disclosed].filter(Boolean).join(" · "))}</span></td><td>${esc(d.status)} ${srcBtn(d.source_ids)}</td></tr>`).join("")}</tbody></table></div>` : ""}
    <details class="panel sec"><summary><b>Relationship graph</b></summary>${relationsSection(r.id)}</details>`;
  return { title: r.name, html };
}
const nf = kind => ({ title: "Not found", html: empty({ title: `No ${kind} record with this id.` }) });
export function fabs({ path }) {
  if (path[1]) { const r = get(path[1]); return r?.entity_type === "fab" ? detail(r, "Fabs", "#/fabs") : nf("fab"); }
  return listPage("fabs", DB.fabs, "Fabs & device makers", "Foundries, IDMs, memory makers, research fabs and display/substrate fabs that appear as equipment customers in the evidence, with their named sites and the equipment suppliers documented for them.", "Fabs");
}
export function osats({ path }) {
  if (path[1]) { const r = get(path[1]); return r?.entity_type === "osat" ? detail(r, "OSAT / ATMP", "#/osats") : nf("OSAT"); }
  const r = listPage("osats", DB.osats, "OSAT / ATMP", "Outsourced assembly and test and ATMP houses, including the Indian OSAT/ATMP lines coming online, with named sites and documented equipment suppliers.", "OSAT / ATMP");
  const segs = DB.models.filter(m => ["Back-End", "Test", "Advanced Packaging"].includes(m.segment));
  r.html += `<div class="panel sec"><h2>Back-end, test and packaging equipment in the database</h2><p class="small">${segs.length} models across dicing, bonding, molding, marking, test and advanced packaging. <a href="#/products?segment=Back-End,Test">Open in product explorer →</a></p>
    <div class="tags">${["Back-End", "Test", "Advanced Packaging"].map(s => `<a class="tag" href="#/products?segment=${encodeURIComponent(s)}">${esc(s)} <span class="k">${DB.models.filter(m => m.segment === s).length}</span></a>`).join("")}</div></div>`;
  return r;
}
export function customers({ path }) {
  if (path[1]) { const r = get(path[1]); return r ? detail(r, "Customers", "#/customers") : nf("customer"); }
  return listPage("customers", DB.customers, "Other named customers", "Customers that are neither fabs nor OSATs (systems companies, materials makers, undisclosed customers).", "Customers");
}

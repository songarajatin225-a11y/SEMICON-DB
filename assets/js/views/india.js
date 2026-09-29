// India semiconductor ecosystem: Indian companies, global OEM footprint, fabs/OSATs, supply chain and localisation.
import { DB, get, hrefOf, out, inn, nameOf } from "../core/store.js";
import { esc, uniq, countBy, sortedEntries } from "../core/util.js";
import { pageHead, kpi, link, tags, badge, srcBtn, conf, val, bars } from "../ui/components.js";
import { dataTable } from "../ui/table.js";

export function india() {
  const C = DB.companies;
  const hq = C.filter(c => c.hq.country === "India");
  const global = C.filter(c => c.hq.country !== "India" && c.india.has_presence);
  // Organisations listed as both fab and OSAT (e.g. Tata Electronics) are shown once.
  const orgs = [...DB.fabs, ...DB.osats].filter(o => o.country === "India").filter((o, i, a) => a.findIndex(x => x.legacy_id === o.legacy_id) === i);
  const orgLinks = o => [...inn(o.id, "supplies_equipment_to"), ...(o.also_listed_as ? inn(o.also_listed_as, "supplies_equipment_to") : [])];
  const orgIds = new Set(orgs.flatMap(o => [o.id, o.also_listed_as].filter(Boolean)));
  const loc = DB.intel.localization;
  const pot = countBy(loc, l => l.pot);
  const records = C.flatMap(c => c.india.records.map((r, i) => ({ ...r, id: c.id + "-in" + i, company_id: c.id, company: c.name, hq: c.hq.country })));
  const typeCounts = sortedEntries(countBy(records, r => r.type.replace(/^HQ India; /, "")));
  const chain = hq.map(c => {
    const sup = DB.supplierById.get(c.id);
    const subsIds = uniq((sup?.component_class_ids || []).map(x => get(x)?.subsystem_id));
    const fabLinks = out(c.id, "supplies_equipment_to").filter(r => orgIds.has(r.to));
    const deals = DB.relationships.filter(r => (r.from === c.id || r.to === c.id) && /partner_of|joint_venture_with|distributes_for|invested_in|acquired/.test(r.type));
    return { id: c.id, c, location: c.india.records.map(r => r.location).filter(Boolean).join("; ") || c.hq.city, capability: c.primary_equipment || c.description, equipment: c.equipment_ids, subsystems: subsIds, components: sup?.component_class_ids || [], fabLinks, deals };
  });
  const html = pageHead({ eyebrow: "Region", title: "India semiconductor ecosystem", crumb: [["Home", "#/"], ["India", null]],
    lede: "Indian equipment makers and suppliers, global OEMs' documented India footprint, the fabs and OSAT/ATMP lines coming online, and a rule-based localisation view. Local sourcing and manufacturing shares are not disclosed by any company and are not estimated here." })
    + `<div class="kpis">${kpi({ v: hq.length + global.length, l: "India-relevant companies" })}${kpi({ v: hq.length, l: "Headquartered in India", href: "#/companies?india=hq" })}${kpi({ v: global.length, l: "Global companies with documented presence", href: "#/companies?india=presence" })}
      ${kpi({ v: orgs.length, l: "Indian fabs / OSATs / ATMPs tracked" })}${kpi({ v: `${pot.get("HIGH") || 0} / ${pot.get("MEDIUM") || 0} / ${pot.get("LOW") || 0}`, l: "Localisation high / medium / low", href: "#/intelligence/india-opportunity" })}
      ${kpi({ v: DB.components.filter(c => c.india_supplier_ids.length).length, l: "Component classes with an Indian supplier" })}</div>

    <div class="panel sec"><h2>Indian fabs, OSATs and ATMPs</h2><div class="cards">${orgs.map(o => { const links = orgLinks(o);
      return `<article class="card"><div class="top"><a class="ttl" href="${hrefOf(o.id)}">${esc(o.name)}</a><span class="code">${esc(o.facility_type)}</span></div>${o.also_listed_as ? `<div class="xs muted" style="position:relative;z-index:1">Also listed: ${link(o.also_listed_as, "OSAT / ATMP record")}</div>` : ""}<div class="small ink2">${esc(o.sites.map(s => s.name).join("; ") || "Sites not captured")}</div>
      <div style="position:relative;z-index:1">${links.length ? `<ul class="list">${links.map(r => `<li>${link(r.from)}: ${esc(r.detail.stage || r.detail.product || "")} ${badge(r.status)}</li>`).join("")}</ul>` : `<p class="xs muted" style="margin:0">No equipment supplier named in sources.</p>`}</div></article>`; }).join("")}</div>
      <p class="note">Tool vendors for most Indian OSAT lines are not publicly named in the captured sources; links shown are MoU- or announcement-level where marked probable.</p></div>

    <section class="sec"><div class="eyebrow">Ecosystem chain</div><h2>India company → location → capability → equipment → subsystem → component → fab/OSAT</h2>
    ${dataTable({ id: "india-chain", rows: chain, title: "", exportName: "india-ecosystem-chain", columns: [
      { k: "name", label: "India company", pin: true, get: r => r.c.name, html: r => `<a class="rowlink" href="${hrefOf(r.id)}">${esc(r.c.name)}</a><span class="sub">${esc(r.c.company_type)}</span>` },
      { k: "location", label: "Location", wrap: true, get: r => r.location || "", html: r => val(r.location) },
      { k: "capability", label: "Capability (source-captured)", wrap: true, get: r => r.capability || "", html: r => val(r.capability) },
      { k: "equipment", label: "Equipment", wrap: true, get: r => r.equipment.map(nameOf).join("; "), html: r => r.equipment.length ? r.equipment.map(e => link(e)).join(", ") : `<span class="muted">—</span>` },
      { k: "subsystems", label: "Subsystem", wrap: true, get: r => r.subsystems.map(nameOf).join("; "), html: r => r.subsystems.length ? r.subsystems.map(e => link(e)).join(", ") : `<span class="muted">—</span>` },
      { k: "components", label: "Component", wrap: true, get: r => r.components.map(nameOf).join("; "), html: r => r.components.length ? r.components.map(e => link(e)).join(", ") : `<span class="muted">—</span>` },
      { k: "fab", label: "Fab / OSAT link", wrap: true, get: r => r.fabLinks.map(l => nameOf(l.to)).join("; "), html: r => r.fabLinks.length ? r.fabLinks.map(l => `${link(l.to)} ${badge(l.status)}`).join("<br>") : `<span class="muted">None documented</span>` },
      { k: "deals", label: "Documented partnerships", wrap: true, get: r => r.deals.length, html: r => r.deals.length ? r.deals.map(d => `${esc(d.type.replace(/_/g, " "))}: ${link(d.from === r.id ? d.to : d.from)}`).join("<br>") : `<span class="muted">—</span>` },
      { k: "status", label: "Evidence", get: r => r.c.verification, html: r => `${badge(r.c.verification)} ${srcBtn(r.c.source_ids)}` }] })}
    <p class="note">“Potential supplier relationship” is shown only where a source documents capability or an agreement; no relationship is inferred from geography alone.</p></section>

    <div class="grid g2 sec"><div class="panel"><h2>Type of India presence</h2>${bars(typeCounts.map(([l, v]) => ({ l, v })), { lw: 200 })}</div>
      <div class="panel"><h2>Indian suppliers by component class</h2>${tags(DB.components.filter(c => c.india_supplier_ids.length).map(c => c.id), { empty: "No Indian supplier captured for any component class yet" })}
      <p class="note">Classes without an Indian supplier are the documented capability gaps: ${DB.components.filter(c => c.capable_supplier_ids.length && !c.india_supplier_ids.length).length} classes have global but no Indian suppliers captured.</p></div></div>

    <section class="sec">${dataTable({ id: "india-presence", rows: records, title: "Documented India presence (all companies)", exportName: "india-presence", columns: [
      { k: "company", label: "Company", pin: true, html: r => `<a class="rowlink" href="${hrefOf(r.company_id)}">${esc(r.company)}</a><span class="sub">${esc(r.hq || "")}</span>` },
      { k: "type", label: "Presence type" }, { k: "facility", label: "Facility", wrap: true, html: r => val(r.facility, { reason: "—" }) }, { k: "location", label: "Location", html: r => val(r.location, { reason: "—" }) },
      { k: "scope", label: "Scope", wrap: true, html: r => val(r.scope, { reason: "—" }) }, { k: "opportunity", label: "Documented opportunity", wrap: true, html: r => val(r.opportunity, { reason: "—" }) },
      { k: "status", label: "Status", wrap: true, html: r => val(r.status, { reason: "—" }) }, { k: "confidence", label: "Confidence", html: r => conf(r.confidence) }, { k: "src", label: "Sources", get: r => r.source_ids.length, html: r => srcBtn(r.source_ids) }] })}</section>

    <section class="sec">${dataTable({ id: "india-loc", rows: loc, title: "Localisation assessment (rule-based, Batch 1)", exportName: "india-localisation", columns: [
      { k: "eq", label: "Imported equipment", wrap: true, html: r => `<b>${esc(r.eq)}</b><span class="sub mono">${esc(r.id)}</span>` },
      { k: "pot", label: "Potential", sort: r => ({ HIGH: 0, MEDIUM: 1, LOW: 2 }[r.pot]), html: r => `<span class="pill">${esc(r.pot)}</span>` },
      { k: "oem", label: "OEMs", wrap: true }, { k: "crit", label: "Critical technology", wrap: true }, { k: "cur", label: "Current subsystem suppliers", wrap: true }, { k: "ind", label: "Indian capability documented", wrap: true },
      { k: "why", label: "Rule applied", wrap: true }, { k: "src", label: "Sources", get: r => r.source_ids.length, html: r => srcBtn(r.source_ids) }] })}
    <p class="note">Rule: HIGH where a documented Indian supplier exists in the same class and the class is mechanical/automation; LOW where it depends on optics, sources or plasma physics with no Indian capability documented. An analyst reading, labelled as such. <a href="#/intelligence/india-opportunity">Open the TEAL opportunity workspace →</a></p></section>`;
  return { title: "India ecosystem", html };
}

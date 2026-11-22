// Country pages: companies by role, fabs/OSATs, India partnerships and Batch-1 search coverage.
import { DB, get, hrefOf, out } from "../core/store.js";
import { esc, uniq, countBy, sortedEntries } from "../core/util.js";
import { pageHead, crumbs, kpi, tags, badge, bars, empty, val, quickActions, stackBar, PALETTE } from "../ui/components.js";
import { dataTable } from "../ui/table.js";
import { COMPANY_COLS, COMPANY_PRESETS } from "./companies.js";

export function countries({ path }) {
  if (path[1]) {
    const k = get(path[1]);
    if (!k || k.entity_type !== "country") return { title: "Not found", html: empty({ title: "Country not found.", tips: [`<a href="#/countries">all countries</a>`] }) };
    const cos = k.company_ids.map(get);
    const groups = sortedEntries(countBy(cos.flatMap(c => uniq(c.equipment_ids.map(e => get(e)?.group_name))), g => g));
    const models = DB.models.filter(m => k.company_ids.includes(m.company_id));
    const cust = cos.flatMap(c => out(c.id, "supplies_equipment_to"));
    const html = `${crumbs([["Home", "#/"], ["Countries", "#/countries"], [k.region, null], [k.name, null]])}
      <div class="ehead"><div class="eyebrow">${esc(k.iso2)} · ${esc(k.region)}</div><h1 class="pt">${esc(k.name)}</h1>
      <div class="kv"><dl><dt>Batch-1 search</dt><dd>${esc(k.batch1_search_status.replace(/_/g, " ").toLowerCase())}</dd></dl><dl><dt>Listed in brief</dt><dd>${k.listed_in_brief ? "Yes" : "No"}</dd></dl>${k.legacy_notes ? `<dl><dt>Notes</dt><dd>${esc(k.legacy_notes)}</dd></dl>` : ""}</div>${quickActions(k.id)}</div>
      ${!cos.length ? `<div class="callout warn"><b>No company headquartered in ${esc(k.name)} has been captured yet.</b> This is a coverage gap in the current evidence, not a statement about the country's industry.</div>` : ""}
      <div class="kpis">${kpi({ v: cos.length, l: "Companies (HQ)", s: `${k.verified_company_count} verified` })}${kpi({ v: k.equipment_oem_ids.length, l: "Equipment OEMs" })}${kpi({ v: k.subsystem_supplier_ids.length, l: "Subsystem suppliers" })}${kpi({ v: k.component_supplier_ids.length, l: "Component suppliers" })}
        ${kpi({ v: k.materials_supplier_ids.length, l: "Materials suppliers" })}${kpi({ v: k.fab_ids.length, l: "Fabs / device makers" })}${kpi({ v: k.osat_ids.length, l: "OSAT / ATMP" })}${kpi({ v: models.length, l: "Models" })}${kpi({ v: k.india_partnership_company_ids.length, l: "Companies with India presence" })}</div>
      <div class="grid g2 sec"><div class="panel"><h2>Equipment groups covered</h2>${groups.length ? bars(groups.map(([l, v]) => ({ l, v })), { lw: 200 }) : `<p class="na">None.</p>`}</div>
        <div class="panel"><h2>Evidence</h2>${stackBar("Companies", [{ l: "Verified", v: cos.filter(c => c.verification === "VERIFIED").length, c: PALETTE[0] }, { l: "Partial", v: cos.filter(c => c.verification === "PARTIALLY_VERIFIED").length, c: PALETTE[2] }, { l: "Unverified", v: cos.filter(c => c.verification === "UNVERIFIED").length, c: "var(--s4)" }])}
        <h3>Technology strengths &amp; export dependencies</h3><p class="na">${esc(k.strengths_note)}</p>
        <h3>Fabs &amp; OSATs</h3>${tags([...k.fab_ids, ...k.osat_ids], { empty: "None captured" })}
        <h3 style="margin-top:10px">Companies with India presence</h3>${tags(k.india_partnership_company_ids, { empty: "None documented" })}</div></div>
      <div class="sec">${cos.length ? dataTable({ id: "cty-co-" + k.iso2, rows: cos, columns: COMPANY_COLS, presets: COMPANY_PRESETS, compareKind: "company", title: `${k.name} companies`, exportName: "companies-" + k.iso2 }) : ""}</div>
      ${cust.length ? `<div class="panel sec"><h2>Customers of ${esc(k.name)} companies</h2><table class="spec"><tbody>${cust.map(r => `<tr><th>${esc(r.detail.customer)}</th><td>${esc(r.detail.product || "")} <span class="muted">by ${esc(get(r.from).name)}</span></td><td>${badge(r.status)}</td></tr>`).join("")}</tbody></table></div>` : ""}`;
    return { title: k.name, html };
  }
  const rows = DB.countries;
  const html = pageHead({ eyebrow: "Geography", title: "Countries", crumb: [["Home", "#/"], ["Countries", null]], lede: "Country pages with companies by supply-chain role, fabs and OSATs, and Batch-1 search coverage. Countries with zero companies are coverage gaps." })
    + dataTable({ id: "countries", rows, title: "Countries", exportName: "semicon-db-countries", sort: { k: "companies", d: -1 }, columns: [
      { k: "name", label: "Country", pin: true, get: r => r.name, html: r => `<a class="rowlink" href="${hrefOf(r.id)}">${esc(r.name)}</a><span class="sub">${esc(r.iso2)}</span>` },
      { k: "region", label: "Region" }, { k: "companies", label: "Companies", num: true, get: r => r.company_ids.length }, { k: "verified", label: "Verified", num: true, get: r => r.verified_company_count },
      { k: "oem", label: "OEMs", num: true, get: r => r.equipment_oem_ids.length }, { k: "sub", label: "Subsystem", num: true, get: r => r.subsystem_supplier_ids.length }, { k: "cmp", label: "Component", num: true, get: r => r.component_supplier_ids.length },
      { k: "fabs", label: "Fabs", num: true, get: r => r.fab_ids.length }, { k: "osats", label: "OSATs", num: true, get: r => r.osat_ids.length },
      { k: "status", label: "Batch-1 search", get: r => r.batch1_search_status, html: r => `<span class="pill">${esc(r.batch1_search_status.replace(/_/g, " ").toLowerCase())}</span>` }] });
  return { title: "Countries", html };
}
export { val };

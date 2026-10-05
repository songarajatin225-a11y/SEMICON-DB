// Facility (site-level) database: one record per physical site with a dated status history, investment
// claims (several figures for one site are shown side by side as a conflict, never averaged), capacity,
// technology, scheme and sources. Unknown fields stay empty.
import { DB, get, hrefOf } from "../core/store.js";
import { esc, uniq, countBy, sortedEntries } from "../core/util.js";
import { href } from "../core/router.js";
import { pageHead, crumbs, link, empty, specTable, srcBtn, quickActions, val, bars, kpi, conf, badge } from "../ui/components.js";
import { dataTable } from "../ui/table.js";
import { relationsSection, conflictsFor, claimsMount } from "./shared.js";

export const STATUS_LABEL = { ANNOUNCED: "Announced", PLANNED: "Planned", APPROVED: "Approved", SITE_ACQUIRED: "Site acquired", FOUNDATION_LAID: "Foundation laid", UNDER_CONSTRUCTION: "Under construction", EQUIPMENT_INSTALLATION: "Equipment installation",
  PILOT_PRODUCTION: "Pilot production", RAMP: "Ramp", OPERATIONAL: "Operational", PRODUCTION: "Production", EXPANDED: "Expanded", PAUSED: "Paused", CANCELLED: "Cancelled", CLOSED: "Closed", FIRST_SHIPMENT: "First shipment", SCHEDULE_CHANGE: "Schedule change", UNKNOWN: "Not captured" };
const STATUS_RANK = { ANNOUNCED: 1, PLANNED: 2, APPROVED: 2, SITE_ACQUIRED: 3, FOUNDATION_LAID: 4, UNDER_CONSTRUCTION: 4, EQUIPMENT_INSTALLATION: 5, PILOT_PRODUCTION: 6, RAMP: 7, OPERATIONAL: 8, PRODUCTION: 8, EXPANDED: 9, PAUSED: 1, CANCELLED: 0, CLOSED: 0, UNKNOWN: 0 };
export const statusPill = f => `<span class="pill" title="Controlled status: ${esc(f.status_class || "")}">${esc(STATUS_LABEL[f.status] || f.status)}</span>${f.status_class && STATUS_LABEL[f.status_class] !== STATUS_LABEL[f.status] ? `<span class="sub">class: ${esc(f.status_class.replace(/_/g, " ").toLowerCase())}</span>` : ""}${f.status_date ? `<span class="sub">${esc(f.status_date)}</span>` : ""}`;
export const investText = f => f.investment.length ? f.investment.map(x => esc(x.label)).join(" · ") + (f.investment_conflict ? ` <span class="pill warn" title="Several figures reported">conflict</span>` : "") : `<span class="na">Not captured</span>`;
// Disclosed INR (crore) for one site: only when exactly one INR figure exists (conflicting figures are not summed).
export const inrOf = f => (f.investment.length === 1 && f.investment[0].inr_crore != null ? f.investment[0].inr_crore : null);
export const statusOk = f => ["PILOT", "RAMP", "PRODUCTION", "EXPANDED"].includes(f.status_class);
const crore = v => `₹${Math.round(v).toLocaleString("en-IN")} crore`;

export function facilityTable(rows, id = "facilities") {
  return dataTable({ id, rows, title: "", exportName: "semicon-db-" + id, columns: [
    { k: "name", label: "Facility", pin: true, get: f => f.name, html: f => `<a class="rowlink" href="${hrefOf(f.id)}">${esc(f.name)}</a><span class="sub mono">${esc(f.id)}</span>` },
    { k: "type", label: "Type", wrap: true, get: f => f.facility_type },
    { k: "operator", label: "Operator", wrap: true, get: f => f.operator, html: f => f.operator_ids.length ? f.operator_ids.slice(0, 1).map(x => link(x, f.operator)).join("") : esc(f.operator) },
    { k: "country", label: "Country", get: f => f.country }, { k: "state", label: "State / region", get: f => f.state }, { k: "city", label: "Site", get: f => f.city },
    { k: "status", label: "Latest captured status", get: f => STATUS_RANK[f.status] || 0, html: statusPill },
    { k: "invest", label: "Investment (as reported)", wrap: true, get: f => inrOf(f) ?? -1, html: investText },
    { k: "capacity", label: "Capacity (as reported)", wrap: true, get: f => f.capacity || "", html: f => val(f.capacity) },
    { k: "tech", label: "Technology / products", wrap: true, get: f => [f.technology, f.products].filter(Boolean).join("; "), html: f => val([f.technology, f.products].filter(Boolean).join(" · ") || null) },
    { k: "conf", label: "Confidence", get: f => f.confidence, html: f => conf(f.confidence) },
    { k: "src", label: "Sources", num: true, get: f => f.source_ids.length, html: f => srcBtn(f.source_ids) }], sort: { k: "status", d: -1 } });
}

export function stateRows(list) {
  return sortedEntries(countBy(list, f => f.state)).map(([state, n]) => {
    const fs = list.filter(f => f.state === state), inr = fs.map(inrOf).filter(v => v != null);
    return { state, n, fs, inr: inr.reduce((a, b) => a + b, 0), inrN: inr.length, op: fs.filter(statusOk).length };
  });
}
export function stateTable(list) {
  const rows = stateRows(list);
  return `<table class="spec"><thead><tr><th>State</th><th>Sites</th><th>Operating or pilot</th><th>Disclosed investment</th><th>Facilities</th></tr></thead><tbody>${rows.map(r => `<tr><th>${esc(r.state)}</th><td>${r.n}</td><td>${r.op}</td>
    <td>${r.inrN ? `${crore(r.inr)}<span class="sub">${r.inrN} of ${r.n} sites disclose a single INR figure</span>` : `<span class="na">Not captured</span>`}</td><td>${r.fs.map(f => link(f.id, f.name.split(",")[0])).join("<br>")}</td></tr>`).join("")}</tbody></table>
    <p class="note">State totals add only sites with one disclosed INR figure; sites with conflicting or foreign-currency figures are excluded from the sum, not converted.</p>`;
}

// India state tile map: schematic grid (not to scale). Tile = state; shade = number of facility records; click filters the list.
const IN_TILES = { "Jammu and Kashmir": [2, 0, "JK"], Ladakh: [3, 0, "LA"], Punjab: [1, 1, "PB"], "Himachal Pradesh": [2, 1, "HP"], Haryana: [1, 2, "HR"], Delhi: [2, 2, "DL"], Uttarakhand: [3, 2, "UK"], Sikkim: [5, 2, "SK"], "Arunachal Pradesh": [7, 2, "AR"],
  Rajasthan: [0, 3, "RJ"], "Uttar Pradesh": [2, 3, "UP"], Bihar: [4, 3, "BR"], Assam: [6, 3, "AS"], Nagaland: [7, 3, "NL"], Gujarat: [0, 4, "GJ"], "Madhya Pradesh": [1, 4, "MP"], Chhattisgarh: [3, 4, "CG"], Jharkhand: [4, 4, "JH"], "West Bengal": [5, 4, "WB"], Meghalaya: [6, 4, "ML"], Manipur: [7, 4, "MN"],
  Maharashtra: [1, 5, "MH"], Telangana: [2, 5, "TS"], Odisha: [4, 5, "OD"], Tripura: [6, 5, "TR"], Mizoram: [7, 5, "MZ"], Goa: [0, 6, "GA"], Karnataka: [1, 6, "KA"], "Andhra Pradesh": [3, 6, "AP"], Kerala: [1, 7, "KL"], "Tamil Nadu": [2, 7, "TN"], Puducherry: [3, 7, "PY"] };
export function indiaTileMap(list) {
  const rows = stateRows(list), by = Object.fromEntries(rows.map(r => [r.state, r])), max = Math.max(1, ...rows.map(r => r.n)), S = 46;
  const tiles = Object.entries(IN_TILES).map(([st, [x, y, ab]]) => { const r = by[st]; const fill = r ? `color-mix(in srgb, var(--s2) ${Math.round(18 + 50 * r.n / max)}%, var(--surface))` : "var(--surface)";
    const label = `${st}: ${r ? `${r.n} facilit${r.n === 1 ? "y" : "ies"}${r.inrN ? `, ₹${Math.round(r.inr).toLocaleString("en-IN")} crore disclosed` : ""}` : "no facility record"}`;
    const g = `<rect x="${x * S + 1}" y="${y * S + 1}" width="${S - 3}" height="${S - 3}" rx="5" style="fill:${fill};stroke:var(--line)"/><text x="${x * S + S / 2}" y="${y * S + 19}" text-anchor="middle" class="tile-ab">${ab}</text>${r ? `<text x="${x * S + S / 2}" y="${y * S + 34}" text-anchor="middle" class="tile-n">${r.n}</text>` : ""}<title>${esc(label)}</title>`;
    return r ? `<a href="${href("/facilities", { state: st })}" aria-label="${esc(label)}">${g}</a>` : `<g>${g}</g>`; }).join("");
  return `<div class="tilemap"><svg viewBox="0 0 ${8 * S} ${8 * S}" role="group" aria-label="India facility records by state (schematic tile map)">${tiles}</svg>
    <p class="note">Schematic tile map, not to geographic scale. Shade = facility records; click a state to filter. Hover for disclosed INR investment (sites with one INR figure only).</p></div>`;
}

function list({ params } = { params: new URLSearchParams() }) {
  const st = params.get("state"), ct = params.get("country");
  const F = (DB.facilities || []).filter(f => (!st || f.state === st) && (!ct || f.country === ct));
  const byStatus = sortedEntries(countBy(F, f => (f.status_class || "UNKNOWN").replace(/_/g, " ").toLowerCase()));
  const html = pageHead({ eyebrow: "Ecosystem", title: "Facilities", crumb: [["Home", "#/"], ["Facilities", null]],
    lede: "Site-level records: one row per physical fab, OSAT/ATMP, packaging or equipment plant, with a dated status history, investment as reported (conflicting figures shown side by side), capacity, technology and sources. Coverage: India's ISM-approved units and equipment plant, plus major fabs in the US, Japan and Germany. Company-level fab and OSAT records remain under Fabs and OSAT / ATMP. Status uses the controlled vocabulary (announced → planned → under construction → equipment installation → pilot → ramp → production; paused, cancelled, closed) while keeping each source's own milestone wording." })
    + `<div class="kpis">${kpi({ v: F.length, l: "Facilities (site level)" })}${kpi({ v: uniq(F.map(f => f.country)).length, l: "Countries", s: `${uniq(F.map(f => f.state)).length} states / regions` })}${kpi({ v: F.filter(statusOk).length, l: "Pilot or production" })}${kpi({ v: F.filter(f => f.investment_conflict).length, l: "Investment conflicts", href: "#/quality" })}</div>
    <div class="grid g2 sec"><div class="panel"><h2>By status class (latest captured milestone)</h2>${bars(byStatus.map(([l, v]) => ({ l, v })), { lw: 150 })}<p class="note">Status is the latest dated milestone in a cited source. A facility approved in 2024 with no later source stays “Approved” or “Foundation laid” — progress is not assumed.</p></div>
      <div class="panel"><h2>By type</h2>${bars(sortedEntries(countBy(F, f => f.facility_type)).map(([l, v]) => ({ l, v })), { lw: 230 })}</div></div>
    ${st || ct ? `<div class="callout">Filtered to <b>${esc(st || ct)}</b>. <a href="#/facilities">Show all facilities</a></div>` : ""}
    <div class="row" style="flex-wrap:wrap;gap:6px">${uniq((DB.facilities || []).map(f => f.country)).map(c => `<a class="btn sm${c === ct ? " primary" : ""}" href="${href("/facilities", { country: c })}">${esc(c)} <span class="k">${DB.facilities.filter(f => f.country === c).length}</span></a>`).join("")}</div>
    <section class="sec">${facilityTable(F)}</section>
    <div class="grid g2 sec"><div class="panel"><h2>India — facilities by state</h2>${indiaTileMap((DB.facilities || []).filter(f => f.country === "India"))}</div><div class="panel"><h2>India — state table</h2>${stateTable((DB.facilities || []).filter(f => f.country === "India"))}</div></div>
    ${(DB.intel.programs || []).length ? `<div class="panel sec"><h2>Programmes</h2>${DB.intel.programs.map(p => `<h3>${esc(p.name)}</h3>${specTable(p.facts.map(x => [x.label, `${esc(x.value)} ${srcBtn(x.source_ids)}`]))}`).join("")}</div>` : ""}`;
  return { title: "Facilities", html };
}

function detail(f) {
  const html = `${crumbs([["Home", "#/"], ["Facilities", "#/facilities"], [f.name, null]])}
    <div class="ehead"><div class="eyebrow">${esc(f.id)} · ${esc(f.facility_type)}</div><h1 class="pt">${esc(f.name)}</h1>
      <div class="kv"><dl><dt>Operator</dt><dd>${f.operator_ids.length ? f.operator_ids.map(x => link(x)).join(", ") : esc(f.operator)}</dd></dl><dl><dt>Location</dt><dd>${esc(f.city)}, ${esc(f.state)}, ${link(f.country_id)}</dd></dl>
        <dl><dt>Latest captured status</dt><dd>${statusPill(f)}</dd></dl><dl><dt>Confidence</dt><dd>${conf(f.confidence)} ${badge(f.verification)}</dd></dl></div>
      <div class="row" style="margin-top:8px">${srcBtn(f.source_ids)}</div>${quickActions(f.id)}</div>
    ${conflictsFor(f.id)}
    <div class="grid g2"><div class="panel"><h2>Facility profile</h2>${specTable([["Operator (as named)", esc(f.operator)], ["Partners", f.partners.length ? f.partners.map(esc).join("<br>") : `<span class="na">None named in reviewed sources</span>`],
      ["Scheme / incentive", val(f.scheme)], ["Approval date", val(f.approval_date)], ["Investment (as reported)", investText(f)], ["Capacity", val(f.capacity)], ["Technology", val(f.technology)], ["Wafer size", val(f.wafer_size)],
      ["Products / end markets", val(f.products)], ["Jobs", val(f.jobs)], ["Coordinates", f.coordinates ? `${f.coordinates.lat}, ${f.coordinates.lon}<span class="sub">${esc(f.coordinates.basis)}</span>` : `<span class="na">Not captured</span>`]])}</div>
      <div class="panel"><h2>Status history</h2><ol class="timeline">${f.status_history.map(h => `<li><b>${esc(h.date)}</b> · ${esc(STATUS_LABEL[h.status] || h.status)} ${srcBtn(h.source_ids)}</li>`).join("")}</ol>
        <p class="note">Each milestone cites its own source. No milestone is inferred from a later one.</p>
        ${f.investment.length ? `<h3>Investment claims</h3><table class="spec"><tbody>${f.investment.map(x => `<tr><th>${esc(x.label)}</th><td>${srcBtn(x.source_ids)}</td></tr>`).join("")}</tbody></table>` : ""}</div></div>
    <div class="callout">${esc(f.notes)}</div>
    ${claimsMount(f.id)}
    <details class="panel sec"><summary><b>Relationship graph</b></summary>${relationsSection(f.id)}</details>`;
  return { title: f.name, html };
}

export function facilities({ path, params }) {
  if (path[1]) { const f = get(path[1]); return f?.entity_type === "facility" ? detail(f) : { title: "Not found", html: empty({ title: "No facility record with this id." }) }; }
  return list({ params });
}

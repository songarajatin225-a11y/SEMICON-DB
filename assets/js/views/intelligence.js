// Intelligence workspace: guided finders, supply-chain and packaging explorers, fab intelligence,
// the TEAL opportunity layer (user-defined criteria, never auto-ranked) and the preserved Batch-1 analyses.
import { DB, get, hrefOf, nameOf, out, inn } from "../core/store.js";
import { esc, uniq, pretty, countBy, sortedEntries, plural, store } from "../core/util.js";
import { href, listParam } from "../core/router.js";
import { registerActions, rerender } from "../core/actions.js";
import { pageHead, crumbs, tags, link, badge, srcBtn, conf, val, bars, stackBar, PALETTE, empty, kpi, basis } from "../ui/components.js";
import { dataTable } from "../ui/table.js";
import { modelTable, waferText } from "./shared.js";

const MODULES = [
  ["finder", "Equipment Finder", "Guided: what are you trying to manufacture? → material, wafer, process, technology, application, location → matching equipment, companies, models, alternatives and suppliers."],
  ["supplier-finder", "Supplier Finder", "Find subsystem and component suppliers by component class, subsystem, country and India presence."],
  ["/technologies", "Technology Explorer", "Technologies with the processes, equipment, companies and models linked to them."],
  ["/processes", "Process Explorer", "Discover equipment from manufacturing-process requirements."],
  ["/compare", "Equipment Comparison", "Up to six models side by side with evidence states."],
  ["/compare/companies", "Company Comparison", "Up to four companies: portfolio, technology, process, geography, India, sources."],
  ["supply-chain", "Supply Chain Explorer", "Equipment → subsystems → components → documented suppliers → Indian suppliers."],
  ["india-opportunity", "India / TEAL Opportunity", "Evidence per equipment class with your own criteria. No automatic ranking."],
  ["fab", "Fab Intelligence", "Which equipment suppliers are documented at which fabs and OSATs."],
  ["packaging", "Packaging Intelligence", "Advanced packaging: technology → process → equipment → OEM → model → materials → fab/OSAT."],
  ["lasers", "Laser & Photonics Explorer", "Laser machines and sources with wavelength, power, pulse and application as published."],
  ["customers", "Customer Map", "Equipment company → product → customer → site, with confirmed/probable status."],
  ["competitive", "Competitive Landscape", "Players by equipment group (evidence-based classes), M&A, investments and alliances."],
  ["deals", "Deals & Partnerships", "All captured mergers, acquisitions, investments, JVs, MoUs and distribution agreements."],
  ["teal", "TEAL Portfolio View", "The fifteen TEAL portfolio areas (Batch-1 analysis)."], ["gap", "Gap Analysis", "Global technology against Indian capability (Batch-1 analysis)."],
  ["partners", "Partner Fit", "Documented fit dimensions per candidate — no recommendation."],
  ["segments/waferfab", "Segment: Wafer fab", "Front-end, mask and compound-semiconductor tools."], ["segments/packaging", "Segment: Back-end", "Dicing, grinding, bonding, molding, marking."], ["segments/automation", "Segment: Automation", "AMHS, EFEM, robots, motion and vision."],
];
const head = (t, lede, extra = []) => pageHead({ eyebrow: "Intelligence", title: t, lede, crumb: [["Home", "#/"], ["Intelligence", "#/intelligence"], ...extra, [t, null]] });

// ----------------------------------------------------------------- equipment finder
const FINDER_FIELDS = [
  ["app", "What are you trying to manufacture?", () => DB.applications.map(a => [a.id, `${a.name} (${a.model_ids.length})`])],
  ["material", "Material / substrate", () => DB.materials.filter(m => m.model_ids.length).map(m => [m.id, `${m.name} (${m.model_ids.length})`])],
  ["wafer", "Wafer size", () => [150, 200, 300].map(x => [String(x), `${x} mm`])],
  ["process", "Process", () => DB.processes.filter(p => p.model_ids.length).map(p => [p.id, `${p.stage} · ${p.name} (${p.model_ids.length})`])],
  ["tech", "Technology", () => DB.technologies.filter(t => t.model_ids.length).map(t => [t.id, `${t.name} (${t.model_ids.length})`])],
  ["loc", "Supplier location", () => [["IN", "India (HQ or documented presence)"], ...DB.countries.filter(c => c.company_ids.length).map(c => [c.iso2, `${c.name} (HQ)`])]],
];
function finder({ params }) {
  const sel = Object.fromEntries(FINDER_FIELDS.map(([k]) => [k, params.get(k) || ""]));
  const any = Object.values(sel).some(Boolean);
  const checks = m => {
    const c = get(m.company_id); const unknown = [];
    if (sel.app && !m.application_ids.includes(sel.app)) { if (!m.application_ids.length) unknown.push("application"); else return null; }
    if (sel.material && !m.material_ids.includes(sel.material)) { if (!m.material_ids.length) unknown.push("material"); else return null; }
    if (sel.wafer) { const w = m.wafer; const mm = +sel.wafer; if (!w || (!w.sizes_mm.length && !w.range_mm)) unknown.push("wafer size"); else if (!(w.sizes_mm.includes(mm) || (w.range_mm && (w.range_mm.min == null || w.range_mm.min <= mm) && w.range_mm.max >= mm))) return null; }
    if (sel.process && !m.process_ids.includes(sel.process)) return null;
    if (sel.tech && !m.technology_ids.includes(sel.tech)) return null;
    if (sel.loc) { if (sel.loc === "IN") { if (!(c.hq.country === "India" || c.india.has_presence)) return null; } else if (c.hq.country_id !== "CTY-" + sel.loc) return null; }
    return unknown;
  };
  const scored = DB.models.filter(m => !m.is_component).map(m => ({ m, u: checks(m) })).filter(x => x.u);
  const full = scored.filter(x => !x.u.length).map(x => x.m), partial = scored.filter(x => x.u.length).map(x => ({ ...x.m, _unknown: x.u }));
  const eqs = uniq(full.map(m => m.equipment_id)).filter(Boolean);
  const cos = uniq(full.map(m => m.company_id));
  const altTech = sel.process ? get(sel.process).technology_ids.filter(t => t !== sel.tech) : uniq(full.flatMap(m => m.technology_ids)).filter(t => t !== sel.tech);
  const subs = uniq(eqs.flatMap(e => get(e).typical_subsystem_ids));
  const sups = uniq(subs.flatMap(s => get(s).potential_supplier_ids));
  const form = `<div class="panel"><h2>Tell us the requirement</h2><div class="grid g3">${FINDER_FIELDS.map(([k, l, opts], i) => `<label class="small"><b>${i + 1}. ${esc(l)}</b><br><select class="select" style="width:100%;margin-top:4px" data-param="${k}"><option value="">Any</option>${opts().map(([v, t]) => `<option value="${esc(v)}"${sel[k] === v ? " selected" : ""}>${esc(t)}</option>`).join("")}</select></label>`).join("")}</div>
    <p class="note">Throughput requirements cannot be matched: throughput is published for very few records. Results list facts; there is no “best machine” score.</p>${any ? `<a class="btn sm" href="#/intelligence/finder">Reset</a>` : ""}</div>`;
  const results = !any ? `<div class="panel sec">${empty({ title: "Choose at least one requirement to see matching equipment." })}</div>` : `
    <div class="kpis sec">${kpi({ v: eqs.length, l: "Equipment categories" })}${kpi({ v: cos.length, l: "Companies" })}${kpi({ v: uniq(full.map(m => m.family_id)).length, l: "Product families" })}${kpi({ v: full.length, l: "Models (all criteria stated)" })}${kpi({ v: partial.length, l: "Partial (value not published)" })}${kpi({ v: sups.length, l: "Subsystem suppliers" })}</div>
    <div class="grid g2 sec"><div class="panel"><h2>Matching equipment categories</h2>${tags(eqs, { empty: "None" })}</div><div class="panel"><h2>Companies</h2>${tags(cos, { max: 30, empty: "None" })}</div>
      <div class="panel"><h2>Alternative technologies</h2>${tags(altTech, { empty: "None mapped" })}<p class="note">Other technologies used for the same process, from the reference library.</p></div>
      <div class="panel"><h2>Suppliers for these tools' subsystems</h2>${tags(sups, { max: 24, empty: "None captured" })}<p class="note">Documented component capability in ${plural(subs.length, "subsystem")}; not proof of supply.</p></div></div>
    <div class="sec">${modelTable("finder-full", full, { title: "Models matching every stated criterion", empty: { title: "No model states all of these values.", tips: ["removing the material or wafer-size requirement", "choosing a broader process", "checking the partial matches below"] } })}</div>
    ${partial.length ? `<div class="sec">${modelTable("finder-partial", partial, { title: "Partial matches — value not published", note: "match on stated fields; missing: " + uniq(partial.flatMap(p => p._unknown)).join(", ") })}</div>` : ""}
    <p class="note">Sources: every model row carries its own source link.</p>`;
  return { title: "Equipment finder", html: head("Equipment finder", "A guided route from a manufacturing requirement to equipment categories, companies, product families, models, alternative technologies and suppliers.") + form + results };
}

// ----------------------------------------------------------------- supplier finder
function supplierFinder() {
  const cats = [...new Set(DB.components.map(c => c.category))];
  const html = head("Supplier finder", "Pick what you need to source. Each link opens the supplier directory pre-filtered; suppliers are listed only where a source documents the capability.")
    + `<div class="grid g3">${cats.map(k => `<div class="panel"><h2>${esc(k)}</h2><div class="tags">${DB.components.filter(c => c.category === k).map(c => `<a class="tag${c.capable_supplier_ids.length ? "" : " faint"}" href="${href("/suppliers", { component: c.id })}">${esc(c.name)} <span class="k">${c.capable_supplier_ids.length}</span></a>`).join("")}</div></div>`).join("")}</div>
    <div class="panel sec"><h2>By subsystem</h2><div class="tags">${DB.subsystems.map(s => `<a class="tag" href="${href("/suppliers", { subsystem: s.id })}">${esc(s.name)} <span class="k">${s.potential_supplier_ids.length}</span></a>`).join("")}</div></div>
    <div class="panel sec"><h2>Indian suppliers</h2><div class="tags"><a class="tag" href="${href("/suppliers", { india: "hq" })}">Headquartered in India</a><a class="tag" href="${href("/suppliers", { india: "presence" })}">Global with India presence</a></div></div>`;
  return { title: "Supplier finder", html };
}

// ----------------------------------------------------------------- supply chain explorer
function supplyChain({ params }) {
  const eqWithRecords = DB.equipment.filter(e => e.level > 1 && e.company_ids_incl_children.length);
  const e = params.get("eq") ? get(params.get("eq")) : get("EQP-C01.02");
  const subs = e.typical_subsystem_ids.map(get);
  const html = head("Supply chain explorer", "Equipment → subsystems → component classes → suppliers with documented capability → Indian suppliers. Architecture is a generic reference; supplier links are source-backed.")
    + `<div class="toolbar"><label class="small" for="sceq">Equipment</label><select id="sceq" class="select" data-param="eq">${eqWithRecords.map(x => `<option value="${x.id}"${x.id === e.id ? " selected" : ""}>${esc(x.code)} · ${esc(x.name)}</option>`).join("")}</select><a class="btn sm" href="${hrefOf(e.id)}">Open category</a></div>
    <div class="panel"><h2>${esc(e.name)}</h2><p class="small">OEMs in database: ${tags(e.company_ids_incl_children, { max: 20 })}</p></div>
    ${subs.map(s => { const comps = s.component_ids.map(get); return `<div class="panel sec"><div class="row sp"><h2>${link(s.id)}</h2><span class="small muted">${plural(comps.length, "component class", "component classes")}</span></div>
      <table class="spec"><thead><tr><th>Component class</th><th>Suppliers with documented capability</th><th>Indian suppliers</th></tr></thead><tbody>${comps.map(c => `<tr><th>${link(c.id)}${c.gap ? " " + badge("GAP") : ""}</th><td>${c.capable_supplier_ids.length ? c.capable_supplier_ids.map(x => link(x)).join(", ") : `<span class="na">None captured</span>`}</td><td>${c.india_supplier_ids.length ? c.india_supplier_ids.map(x => link(x)).join(", ") : `<span class="muted">—</span>`}</td></tr>`).join("")}</tbody></table></div>`; }).join("")}
    <p class="note">${basis("reference")} subsystem architecture · ${basis("source")} supplier capability (Batch-1 supplier register).</p>`;
  return { title: "Supply chain explorer", html };
}

// ----------------------------------------------------------------- packaging intelligence
function packaging() {
  const techs = DB.technologies.filter(t => t.family === "Packaging" || ["tcb", "hybrid-bonding", "wafer-bonding", "flip-chip", "laser-drilling", "laser-debonding"].includes(t.slug));
  const rows = techs.map(t => { const ms = t.model_ids.map(get); return { id: t.id, t, procs: t.process_ids, eqs: t.equipment_ids.filter(e => get(e).company_ids_incl_children.length || get(e).model_ids_incl_children.length), oems: t.company_ids, models: ms,
    mats: uniq(ms.flatMap(m => m.material_ids)), cust: uniq(ms.flatMap(m => out(m.company_id, "supplies_equipment_to").filter(r => r.detail.model_id === m.id).map(r => r.to))) }; });
  const html = head("Advanced packaging intelligence", "2.5D/3D, chiplets, HBM, TSV, TGV/glass core, RDL, fan-out, panel-level, hybrid and thermo-compression bonding — mapped technology → process → equipment → OEM → model → materials → fab/OSAT.")
    + dataTable({ id: "pkg-intel", rows, title: "Technology chains", exportName: "packaging-intelligence", sort: { k: "models", d: -1 }, columns: [
      { k: "tech", label: "Technology", pin: true, get: r => r.t.name, html: r => `<a class="rowlink" href="${hrefOf(r.id)}">${esc(r.t.name)}</a>` },
      { k: "procs", label: "Process", wrap: true, get: r => r.procs.map(nameOf).join("; "), html: r => r.procs.map(p => link(p)).join(", ") || `<span class="muted">—</span>` },
      { k: "eqs", label: "Equipment (with records)", wrap: true, get: r => r.eqs.map(nameOf).join("; "), html: r => r.eqs.map(e => link(e)).join(", ") || `<span class="na">No records yet</span>` },
      { k: "oems", label: "OEMs", wrap: true, get: r => r.oems.length, html: r => r.oems.length ? r.oems.slice(0, 8).map(x => link(x)).join(", ") + (r.oems.length > 8 ? ` +${r.oems.length - 8}` : "") : `<span class="na">None captured</span>` },
      { k: "models", label: "Models", num: true, get: r => r.models.length },
      { k: "mats", label: "Materials", wrap: true, get: r => r.mats.map(nameOf).join("; "), html: r => r.mats.map(x => link(x)).join(", ") || `<span class="muted">—</span>` },
      { k: "cust", label: "Fab / OSAT documented", wrap: true, get: r => r.cust.map(nameOf).join("; "), html: r => r.cust.map(x => link(x)).join(", ") || `<span class="muted">—</span>` }] })
    + `<div class="sec">${modelTable("pkg-models", DB.models.filter(m => m.segment === "Advanced Packaging" || m.application_ids.includes(DB.applications.find(a => a.slug === "advanced-packaging")?.id) || ["C16", "C17", "C18", "C19", "C28"].includes(m.equipment_code)), { title: "Advanced-packaging equipment models" })}</div>`;
  return { title: "Packaging intelligence", html };
}

// ----------------------------------------------------------------- fab intelligence
function fabIntel() {
  const orgs = [...DB.fabs, ...DB.osats].filter((o, i, a) => a.findIndex(x => x.legacy_id === o.legacy_id) === i);
  const links = DB.relationships.filter(r => r.type === "supplies_equipment_to");
  const byOrg = sortedEntries(countBy(links, r => nameOf(r.to))).slice(0, 14);
  const byStatus = countBy(links, r => r.status);
  const html = head("Fab intelligence", "Documented equipment deployments at fabs, OSATs and other customers. A link is confirmed only when the supplier, the customer or a filing states it.")
    + `<div class="grid g2"><div class="panel"><h2>Links per customer</h2>${bars(byOrg.map(([l, v]) => ({ l, v })), { lw: 180 })}</div><div class="panel"><h2>Link status</h2>${stackBar("All equipment-supplier links", ["CONFIRMED", "PROBABLE", "UNVERIFIED"].map((s, i) => ({ l: pretty(s), v: byStatus.get(s) || 0, c: [PALETTE[0], PALETTE[2], "var(--s4)"][i] })))}
      <p class="note">${orgs.filter(o => !o.equipment_supplier_ids.length).length} tracked fabs/OSATs have no documented supplier yet: ${esc(orgs.filter(o => !o.equipment_supplier_ids.length).map(o => o.name).join(", "))}.</p></div></div>`
    + `<div class="sec">${customerTable("fab-links", links)}</div>`;
  return { title: "Fab intelligence", html };
}
function customerTable(id, links) {
  return dataTable({ id, rows: links, title: "Equipment → customer links", exportName: id, columns: [
    { k: "oem", label: "Equipment company", pin: true, get: r => nameOf(r.from), html: r => link(r.from) }, { k: "product", label: "Product", wrap: true, get: r => r.detail.product || "", html: r => r.detail.model_id ? link(r.detail.model_id) : val(r.detail.product, { reason: "Not named" }) },
    { k: "customer", label: "Customer", wrap: true, get: r => r.detail.customer, html: r => link(r.to, r.detail.customer) }, { k: "site", label: "Site / fab", wrap: true, get: r => [r.detail.site, r.detail.location].filter(Boolean).join(" · ") },
    { k: "status", label: "Status", get: r => r.status, html: r => badge(r.status) }, { k: "stage", label: "Stage", wrap: true, get: r => r.detail.stage || "" }, { k: "date", label: "Date", get: r => r.date || "" },
    { k: "sources", label: "Sources", num: true, get: r => r.source_ids.length, html: r => srcBtn(r.source_ids) }] });
}

// ----------------------------------------------------------------- TEAL / India opportunity (user-defined criteria)
const CRITERIA = ["Localization", "Technical complexity", "Supply risk", "Supplier concentration", "India availability", "Serviceability", "Manufacturing complexity", "IP dependence", "Capital intensity"];
const tealState = () => store.get("teal:scores", {});
registerActions({
  tealscore: el => { const s = tealState(); const [eq, cr] = el.dataset.k.split("|"); (s[eq] ||= {})[cr] = el.value === "" ? null : +el.value; store.set("teal:scores", s); },
  tealweight: el => { const w = store.get("teal:weights", {}); w[el.dataset.k] = el.value === "" ? null : +el.value; store.set("teal:weights", w); rerender(); },
  tealreset: () => { if (confirm("Clear all your scores and weights?")) { store.set("teal:scores", {}); store.set("teal:weights", {}); rerender(); } },
  tealrecalc: () => rerender(),
});
function tealOpportunity({ params }) {
  const scores = tealState(), weights = store.get("teal:weights", {});
  const eqs = DB.equipment.filter(e => e.level === 2 && (e.company_ids_incl_children.length || e.laser_relevant) && e.segment !== "Device class");
  const focus = params.get("eq") ? get(params.get("eq")) : null;
  const wsum = CRITERIA.reduce((a, c) => a + (weights[c] || 0), 0);
  const total = id => { const s = scores[id] || {}; const filled = CRITERIA.filter(c => s[c] != null && weights[c]); return filled.length ? (filled.reduce((a, c) => a + s[c] * weights[c], 0) / filled.reduce((a, c) => a + weights[c], 0)).toFixed(2) : null; };
  const evidence = e => {
    const subs = e.typical_subsystem_ids.map(get); const comps = uniq(subs.flatMap(s => s.component_ids)).map(get);
    const indiaOem = e.company_ids_incl_children.filter(id => get(id).hq.country === "India");
    return { oems: e.company_ids_incl_children, indiaOem, subSup: uniq(subs.flatMap(s => s.potential_supplier_ids)), compIndia: uniq(comps.flatMap(c => c.india_supplier_ids)),
      loc: DB.intel.localization.filter(l => new RegExp(e.name.split(/[ /]/)[0], "i").test(l.eq)), gap: DB.intel.gap_analysis.filter(g => g.category.startsWith(e.group_code)) };
  };
  const rows = eqs.map(e => ({ id: e.id, e, ev: evidence(e), total: total(e.id) }));
  const html = head("India / TEAL opportunity", "An evidence-based framework — not market truth. For each equipment class the page shows global OEMs, Indian OEMs, subsystem and component suppliers, localisation dependencies and documented gaps. <b>Scores are yours:</b> set weights and score classes 0–5; nothing is ranked automatically, and totals use only the inputs you enter.")
    + `<div class="panel"><div class="row sp"><h2>Your criteria weights</h2><button class="btn sm" data-action="tealreset">Clear my inputs</button></div>
      <div class="grid g3">${CRITERIA.map(c => `<label class="small">${esc(c)} <input class="input" type="number" min="0" max="10" step="1" style="width:70px" value="${weights[c] ?? ""}" data-change="tealweight" data-k="${esc(c)}" aria-label="Weight for ${esc(c)}"></label>`).join("")}</div>
      <p class="note">Weights and scores are stored only in this browser. ${wsum ? `Weighted totals are shown for classes you have scored.` : `Set at least one weight to see totals.`}</p></div>
    ${focus ? (() => { const r = rows.find(x => x.id === focus.id) || { e: focus, ev: evidence(focus) }; const s = scores[focus.id] || {};
      return `<div class="panel sec"><div class="row sp"><h2>${esc(focus.code)} · ${esc(focus.name)}</h2><a class="btn sm" href="#/intelligence/india-opportunity">Back to all classes</a></div>
      <div class="grid g2"><div>${[["Global OEMs", tags(r.ev.oems, { max: 20, empty: "None captured" })], ["Indian OEMs", tags(r.ev.indiaOem, { empty: "None documented" })], ["Subsystem suppliers (capability)", tags(r.ev.subSup, { max: 16, empty: "None captured" })], ["Indian component suppliers", tags(r.ev.compIndia, { empty: "None captured" })]].map(([l, h]) => `<h3 style="margin-top:10px">${l}</h3>${h}`).join("")}
        <h3 style="margin-top:10px">Localisation dependencies (Batch 1)</h3>${r.ev.loc.length ? r.ev.loc.map(l => `<p class="small">${esc(l.eq)}: <b>${esc(l.pot)}</b> — ${esc(l.why)} ${srcBtn(l.source_ids)}</p>`).join("") : `<p class="na">No assessment captured.</p>`}
        <h3 style="margin-top:10px">Capability gaps (Batch 1)</h3>${r.ev.gap.length ? r.ev.gap.map(g => `<p class="small"><b>${esc(g.category)}</b>: India — ${esc(g.available_in_india)}; critical IP — ${esc(g.critical_ip)} ${srcBtn(g.source_ids)}</p>`).join("") : `<p class="na">No gap row for this group.</p>`}</div>
      <div><h3>Your scores (0–5)</h3><table class="spec"><tbody>${CRITERIA.map(c => `<tr><th>${esc(c)}</th><td><input class="input" type="number" min="0" max="5" step="1" style="width:70px" value="${s[c] ?? ""}" data-change="tealscore" data-k="${focus.id}|${esc(c)}" aria-label="${esc(c)} score"></td></tr>`).join("")}</tbody></table>
        <button class="btn sm" data-action="tealrecalc">Update total</button> <span class="small">Your weighted total: <b>${total(focus.id) ?? "—"}</b></span></div></div></div>`; })() : ""}
    <div class="sec">${dataTable({ id: "teal-opp", rows, title: "Equipment classes — evidence summary", exportName: "india-opportunity", columns: [
      { k: "name", label: "Equipment class", pin: true, get: r => r.e.name, html: r => `<a class="rowlink" href="${href("/intelligence/india-opportunity", { eq: r.id })}">${esc(r.e.name)}</a><span class="sub mono">${esc(r.e.code)} · ${esc(r.e.segment || "")}</span>` },
      { k: "oems", label: "Global OEMs", num: true, get: r => r.ev.oems.length }, { k: "india", label: "Indian OEMs", num: true, get: r => r.ev.indiaOem.length },
      { k: "sub", label: "Subsystem suppliers", num: true, get: r => r.ev.subSup.length }, { k: "cmpIn", label: "Indian component suppliers", num: true, get: r => r.ev.compIndia.length },
      { k: "loc", label: "Localisation (Batch 1)", get: r => r.ev.loc.map(l => l.pot).join(", "), html: r => r.ev.loc.length ? r.ev.loc.map(l => `<span class="pill">${esc(l.pot)}</span>`).join(" ") : `<span class="muted">—</span>` },
      { k: "total", label: "Your total", num: true, get: r => (r.total == null ? null : +r.total), html: r => r.total ?? `<span class="muted">not scored</span>` }] })}</div>`;
  return { title: "India / TEAL opportunity", html };
}

// ----------------------------------------------------------------- preserved Batch-1 analyses
function lasers() {
  const rows = DB.models.filter(m => m.laser);
  const lt = sortedEntries(countBy(rows, m => m.technology_basis.from_laser_codes)).map(([id, v]) => ({ l: nameOf(id), v, href: hrefOf(id) }));
  return { title: "Laser explorer", html: head("Laser & photonics explorer", "Laser machines and sources with the source-stated wavelength, power, pulse and application. Blank cells mean the maker does not publish the value.")
    + `<div class="grid g2"><div class="panel"><h2>Laser process types</h2>${bars(lt.slice(0, 16), { lw: 180 })}</div><div class="panel"><h2>What is published</h2><ul class="list"><li>Wavelength: ${rows.filter(m => m.laser.wavelength).length} of ${rows.length} records.</li><li>Average power: ${rows.filter(m => m.laser.average_power).length}.</li><li>Pulse duration: ${rows.filter(m => m.laser.pulse_duration).length}.</li><li>Laser-source maker named: ${rows.filter(m => m.laser.source && !/not stated/i.test(m.laser.source)).length}.</li></ul><p class="note">Use the Laser band filter in the <a href="#/products">product explorer</a> for UV, green, IR, CO₂ or excimer.</p></div></div>`
    + `<div class="sec">${modelTable("lasers", rows, { title: "Laser equipment & sources", preset: "technical" })}</div>` };
}
function customersView() { const links = DB.relationships.filter(r => r.type === "supplies_equipment_to");
  return { title: "Customer map", html: head("Customer map", "Equipment company → product → customer → site. Confirmed only when the supplier, the customer or a filing states it; reported or evaluation-stage links are probable.") + customerTable("customers-map", links) }; }
function deals({ path }) {
  const focus = path[2];
  return { title: "Deals & partnerships", html: head("Deals & partnerships", "Mergers, acquisitions, investments, JVs, MoUs and distribution agreements as captured. Rumours and single-source claims are labelled unverified.")
    + (focus && get(focus) ? `<div class="callout">Highlighted: <b>${esc(get(focus).event_type)}</b> — ${esc(get(focus).party_a)} · ${esc(get(focus).party_b)}</div>` : "")
    + dataTable({ id: "deals", rows: DB.deals, title: "Deals", exportName: "semicon-db-deals", sort: { k: "date", d: -1 }, columns: [
      { k: "date", label: "Date", get: r => r.date || "" }, { k: "event_type", label: "Event", wrap: true }, { k: "a", label: "Party A", wrap: true, get: r => r.party_a, html: r => r.party_a_id ? link(r.party_a_id, r.party_a) : esc(r.party_a) },
      { k: "b", label: "Party B", wrap: true, get: r => r.party_b, html: r => r.party_b_id ? link(r.party_b_id, r.party_b) : esc(r.party_b) }, { k: "value", label: "Value disclosed", wrap: true, get: r => r.value_disclosed || "", html: r => val(r.value_disclosed, { reason: "Not disclosed" }) },
      { k: "tech", label: "Technology", wrap: true, get: r => r.technology || "" }, { k: "status", label: "Status", wrap: true, get: r => r.status, html: r => r.claim_type === "Unverified report" ? `${badge("UNVERIFIED")}<span class="sub">${esc(r.status)}</span>` : `<span class="pill">${esc(r.status)}</span>` },
      { k: "sources", label: "Sources", num: true, get: r => r.source_ids.length, html: r => srcBtn(r.source_ids) }] }) };
}
function competitive() {
  return { title: "Competitive landscape", html: head("Competitive landscape", "Players by equipment group, classed only on documented evidence (a published top-vendor ranking or company revenue). Everything else stays unclassified. No market shares are estimated.")
    + dataTable({ id: "cm", rows: DB.intel.competitor_map.map((r, i) => ({ ...r, id: "cm" + i })), title: "Competitor map (Batch 1)", exportName: "competitor-map", columns: [
      { k: "group", label: "Equipment group", pin: true, html: r => `<b>${esc(r.group)}</b><span class="sub">${r.n_companies} companies</span>` }, { k: "global_leader", label: "Global leaders", wrap: true }, { k: "tier_2", label: "Tier 2", wrap: true }, { k: "emerging", label: "Emerging", wrap: true },
      { k: "chinese", label: "Chinese", wrap: true }, { k: "japanese", label: "Japanese", wrap: true }, { k: "korean", label: "Korean", wrap: true }, { k: "taiwanese", label: "Taiwanese", wrap: true }, { k: "european", label: "European", wrap: true }, { k: "us", label: "US", wrap: true }, { k: "indian", label: "Indian", wrap: true }] })
    + `<p class="sec"><a class="btn" href="#/intelligence/deals">M&amp;A, investments and partnerships →</a></p>` };
}
function tealView() {
  return { title: "TEAL portfolio view", html: head("TEAL portfolio view", "For each of the fifteen TEAL portfolio areas: the OEMs in the database, the documented Indian demand, the localisation score and the capability TEAL would need. Required capability is an analyst reading of the evidence, labelled as such.")
    + `<div class="cards">${DB.intel.teal_view.map(t => `<article class="card"><div class="top"><b>${esc(t.portfolio_area)}</b><span class="code">${esc(t.code)}</span></div><div class="row"><span class="pill">${t.n_products} products mapped</span><span class="pill">${esc(t.potential_localization)}</span></div>
      <dl><dt>Technology</dt><dd>${esc(t.technology)}</dd><dt>OEMs in DB</dt><dd>${esc(t.global_oems)}</dd><dt>India demand</dt><dd>${esc(t.india_opportunity)}</dd><dt>Needed</dt><dd>${esc(t.required_teal_capability)} <span class="chip b-unverified">Analyst reading</span></dd><dt>Candidates</dt><dd>${esc(t.potential_partner)}</dd></dl>
      <div class="foot2">${srcBtn(t.source_ids)}</div></article>`).join("")}</div>` };
}
function gap() {
  return { title: "Gap analysis", html: head("Gap analysis", "Per category: what the world ships, what TEAL and India have today, what is imported, and where IP or components are the constraint. Partner, JV and licensor columns cite documented precedents only.")
    + dataTable({ id: "gap", rows: DB.intel.gap_analysis.map(g => ({ ...g, id: g.gap_id })), title: "Gap analysis (Batch 1)", exportName: "gap-analysis", columns: [
      { k: "category", label: "Category", pin: true, html: r => `<b>${esc(r.category)}</b><span class="sub mono">${esc(r.gap_id)}</span>` }, { k: "global_technology", label: "Global technology", wrap: true }, { k: "current_teal_capability", label: "Current TEAL capability", wrap: true },
      { k: "available_in_india", label: "Available in India", wrap: true }, { k: "localization_possibility", label: "Localisation", wrap: true }, { k: "critical_ip", label: "Critical IP", wrap: true }, { k: "critical_component", label: "Critical component", wrap: true },
      { k: "potential_partner", label: "Documented-fit candidates", wrap: true }, { k: "potential_jv", label: "JV precedent", wrap: true }, { k: "potential_technology_licensor", label: "Licensor precedent", wrap: true }, { k: "src", label: "Sources", get: r => r.source_ids.length, html: r => srcBtn(r.source_ids) }] }) };
}
function partners() {
  return { title: "Partner fit", html: head("Partner fit", "Six factual fit dimensions per candidate. The table does not recommend or rank a partner.")
    + dataTable({ id: "pfit", rows: DB.intel.partner_fit.map(p => ({ ...p, id: p.pf_id })), title: "Partner-fit matrix (Batch 1)", exportName: "partner-fit", columns: [
      { k: "candidate", label: "Candidate", pin: true, html: r => `${get(r.company_id) ? link(r.company_id, r.candidate) : esc(r.candidate)}<span class="sub">${esc(r.country)}</span>` }, { k: "partner_type", label: "Partner type", wrap: true }, { k: "teal_areas", label: "TEAL areas", wrap: true },
      { k: "technology_fit", label: "Technology fit", wrap: true }, { k: "product_fit", label: "Product fit", wrap: true }, { k: "geographic_fit", label: "Geography", wrap: true }, { k: "manufacturing_fit", label: "Manufacturing", wrap: true }, { k: "india_presence", label: "India presence", wrap: true },
      { k: "publicly_documented_partnerships", label: "Documented partnerships", wrap: true }, { k: "src", label: "Sources", get: r => r.source_ids.length, html: r => srcBtn(r.source_ids) }] }) };
}
const SEGMENTS = {
  waferfab: ["Wafer fab and mask equipment", "Front-end, mask/reticle and compound-semiconductor tools, plus wafer-level power-device processing.", m => ["A", "B", "G"].includes(m.category_group) || ["F01", "F02", "F03", "F04", "F05"].includes(m.equipment_code)],
  packaging: ["Back-end and packaging equipment", "Dicing, grinding, bonding, molding, laser marking and package processing.", m => m.category_group === "C" || ["F06", "F07", "F08", "F09", "F10"].includes(m.equipment_code)],
  automation: ["Automation, handling and motion", "AMHS, EFEMs, wafer robots and sorters, plus the motion, vision and control components inside laser tools.", m => m.category_group === "J" || /^A3[4-9]|^A40/.test(m.equipment_code) || ["BOM03", "BOM04", "BOM05", "BOM09", "BOM10", "BOM13"].includes(m.equipment_code)],
};
function segment({ path }) {
  const s = SEGMENTS[path[2]]; if (!s) return { title: "Not found", html: empty({ title: "Unknown segment." }) };
  const rows = DB.models.filter(s[2]); const cos = uniq(rows.map(m => m.company_id));
  const byEq = sortedEntries(countBy(rows, m => m.equipment_label)).slice(0, 12).map(([l, v]) => ({ l, v }));
  return { title: s[0], html: head(s[0], s[1], [["Segments", null]]) + `<div class="grid g2"><div class="panel"><h2>Products by equipment type</h2>${bars(byEq, { lw: 200 })}</div><div class="panel"><h2>${cos.length} companies</h2>${tags(cos, { max: 60 })}</div></div><div class="sec">${modelTable("seg-" + path[2], rows, { title: "Products" })}</div>` };
}

function hub() {
  const html = pageHead({ eyebrow: "Workspace", title: "Intelligence", crumb: [["Home", "#/"], ["Intelligence", null]], lede: "Guided tools and analyses built on the evidence graph. Every output links back to records and sources; nothing is scored unless you define the criteria." })
    + `<div class="cards">${MODULES.map(([p, t, d]) => `<article class="card"><a class="ttl" href="#${p.startsWith("/") ? p : "/intelligence/" + p}">${esc(t)}</a><div class="small ink2">${esc(d)}</div></article>`).join("")}</div>`;
  return { title: "Intelligence", html };
}
const SUB = { finder, "supplier-finder": supplierFinder, "supply-chain": supplyChain, packaging, fab: fabIntel, "india-opportunity": tealOpportunity, localization: tealOpportunity, lasers, customers: customersView, deals, competitive, teal: tealView, gap, partners, segments: segment };
export function intelligence(ctx) { const f = SUB[ctx.path[1]]; return f ? f(ctx) : ctx.path[1] ? { title: "Not found", html: empty({ title: "Unknown intelligence module.", tips: [`<a href="#/intelligence">open the workspace</a>`] }) } : hub(); }
export { waferText, conf, inn, listParam, crumbs };

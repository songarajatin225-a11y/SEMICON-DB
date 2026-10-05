// Company database: faceted list (table / grid / list) and company profiles with tabs.
import { DB, get, hrefOf, nameOf, out, inn } from "../core/store.js";
import { esc, uniq, fmt, pretty, plural, norm } from "../core/util.js";
import { ws } from "../core/workspace.js";
import { href } from "../core/router.js";
import { dataTable } from "../ui/table.js";
import { readState, applyFacets, facetPanel, activeChips, listing } from "../ui/facets.js";
import { pageHead, crumbs, badge, conf, fresh, srcBtn, tags, val, kv, specTable, tabs, quickActions, stateBadges, link, empty } from "../ui/components.js";
import { modelTable, relationsSection, sourcesSection, historySection, conflictsFor, verSort } from "./shared.js";

const indiaKey = c => (c.hq.country === "India" ? "hq" : c.india.has_presence ? "presence" : "none");
const INDIA_LABEL = { hq: "HQ in India", presence: "Documented India presence", none: "None documented" };
const groupsOf = c => uniq(c.equipment_ids.map(e => get(e)?.group_code));
const procsOf = c => uniq([...c.equipment_ids.flatMap(e => get(e)?.process_ids || []), ...DB.models.filter(m => m.company_id === c.id).flatMap(m => m.process_ids)]);
const techsOf = c => uniq([...c.equipment_ids.flatMap(e => get(e)?.technology_ids || []), ...DB.models.filter(m => m.company_id === c.id).flatMap(m => m.technology_ids)]);

export const COMPANY_FACETS = () => [
  { key: "role", label: "Supplier role", get: c => c.supplier_types, open: true },
  { key: "type", label: "Company type (Batch 1)", get: c => [c.company_type] },
  { key: "group", label: "Equipment group", get: groupsOf, label_of: v => DB.reference.equipment_groups.find(g => g.code === v)?.name || v, open: true },
  { key: "eq", label: "Equipment category", get: c => c.equipment_ids, label_of: v => `${get(v)?.code} · ${nameOf(v)}` },
  { key: "process", label: "Process", get: procsOf, label_of: nameOf },
  { key: "tech", label: "Technology", get: techsOf, label_of: nameOf },
  { key: "country", label: "Country (HQ)", get: c => [c.hq.country || "Not captured"] },
  { key: "region", label: "Region", get: c => [c.hq.region || "Not captured"] },
  { key: "india", label: "India", get: c => [indiaKey(c)], label_of: v => INDIA_LABEL[v], options: ["hq", "presence", "none"] },
  { key: "ver", label: "Verification", get: c => [c.verification], label_of: pretty, options: ["VERIFIED", "PARTIALLY_VERIFIED", "UNVERIFIED"] },
  { key: "conf", label: "Confidence", get: c => [c.confidence.level], label_of: pretty, options: ["HIGH", "MEDIUM", "LOW", "UNVERIFIED"] },
  { key: "qs", label: "Quality state", get: c => [c.quality_state], label_of: pretty },
  { key: "fresh", label: "Evidence freshness", get: c => [c.freshness] },
  { key: "cls", label: "Market class (evidence-based)", get: c => [c.market_class], label_of: pretty },
  { key: "own", label: "Ownership", get: c => [c.ownership || "Not captured"] },
];
const hay = c => norm([c.name, c.aliases.join(" "), c.description, c.primary_equipment, c.company_type, c.hq.country, c.hq.city, c.supplier_types.join(" ")].join(" "));

export const COMPANY_COLS = [
  { k: "name", label: "Company", pin: true, get: c => c.name, html: c => `<a class="rowlink" href="${hrefOf(c.id)}">${esc(c.name)}</a><span class="sub">${esc(c.company_type)} · ${esc(c.supply_chain_level)}</span>` },
  { k: "country", label: "HQ country", get: c => c.hq.country || "", html: c => `${val(c.hq.country)}${c.hq.country && c.hq.country_basis_code !== "SRC" ? ` <span class="xs muted" title="${esc(c.hq.country_basis)}">†</span>` : ""}<span class="sub">${esc(c.hq.city || "")}</span>` },
  { k: "roles", label: "Supplier roles", wrap: true, get: c => c.supplier_types.join("; ") },
  { k: "equipment", label: "Primary equipment (source-confirmed)", wrap: true, get: c => c.primary_equipment || "", html: c => val(c.primary_equipment, { reason: "Not confirmed" }) },
  { k: "ncat", label: "Categories", num: true, get: c => c.equipment_ids.length },
  { k: "nmodels", label: "Models", num: true, get: c => DB.models.filter(m => m.company_id === c.id).length },
  { k: "revenue", label: "Revenue USD m", num: true, get: c => c.revenue?.usd_m ?? null, html: c => c.revenue ? (c.revenue.usd_m != null ? `${fmt(c.revenue.usd_m)}<span class="sub">${esc((c.revenue.fiscal_year || "").split(" (")[0])}</span>` : `${esc(c.revenue.range_usd_m)}<span class="sub">derived range</span>`) : `<span class="na">Not captured</span>` },
  { k: "class", label: "Market class", get: c => c.market_class, html: c => `<span class="pill" title="${esc(c.market_class_basis || "")}">${esc(pretty(c.market_class))}</span>` },
  { k: "own", label: "Ownership", get: c => c.ownership || "", html: c => val(c.ownership) },
  { k: "ticker", label: "Listing", get: c => [c.exchange, c.ticker].filter(Boolean).join(" "), html: c => val([c.exchange, c.ticker].filter(Boolean).join(" ") || null) },
  { k: "employees", label: "Employees", get: c => c.employees || "", html: c => val(c.employees) },
  { k: "founded", label: "Founded", get: c => c.founded || "", html: c => val(c.founded) },
  { k: "level", label: "Supply-chain level", get: c => c.supply_chain_level },
  { k: "components", label: "Component classes", wrap: true, get: c => (DB.supplierById.get(c.id)?.component_class_ids || []).map(nameOf).join("; "), html: c => { const ids = DB.supplierById.get(c.id)?.component_class_ids || []; return ids.length ? ids.map(i => link(i)).join(", ") : `<span class="muted">—</span>`; } },
  { k: "parent", label: "Parent", get: c => c.parent_company || "", html: c => val(c.parent_company, { reason: "—" }) },
  { k: "india", label: "India", wrap: true, get: c => INDIA_LABEL[indiaKey(c)], html: c => indiaKey(c) === "none" ? `<span class="muted">None documented</span>` : esc(c.hq.country === "India" ? "HQ in India" : c.india.summary) },
  { k: "verification", label: "Status", get: c => c.verification, sort: verSort, html: c => badge(c.verification) + (["CONFLICTING", "OUTDATED"].includes(c.quality_state) ? " " + badge(c.quality_state) : "") },
  { k: "confidence", label: "Confidence", num: true, get: c => c.confidence.score, html: c => conf(c.confidence.level) },
  { k: "freshness", label: "Freshness", get: c => c.freshness, html: c => fresh(c.freshness) },
  { k: "depth", label: "Evidence depth", get: c => c.evidence_depth, html: c => esc(pretty(c.evidence_depth)) },
  { k: "sources", label: "Sources", num: true, get: c => c.source_ids.length, html: c => srcBtn(c.source_ids) },
  { k: "complete", label: "Completeness %", num: true, get: c => c.completeness?.score ?? null, html: c => c.completeness ? `${c.completeness.score}%<span class="sub">${c.completeness.filled}/${c.completeness.total} fields</span>` : val(null) },
];
export const COMPANY_PRESETS = {
  basic: ["name", "country", "equipment", "nmodels", "class", "india", "verification", "sources", "complete"],
  commercial: ["name", "country", "revenue", "class", "own", "ticker", "employees", "founded"],
  "supply-chain": ["name", "country", "roles", "level", "components", "parent", "india", "sources"],
  technical: ["name", "equipment", "ncat", "nmodels", "roles", "sources"],
  source: ["name", "verification", "confidence", "freshness", "depth", "sources"],
};

function card(c) {
  const n = DB.models.filter(m => m.company_id === c.id).length;
  return `<article class="card"><div class="top"><a class="ttl" href="${hrefOf(c.id)}">${esc(c.name)}</a><span class="code">${esc(c.id)}</span></div>
    <div class="row">${badge(c.verification)}${c.hq.country ? `<span class="pill">${esc(c.hq.country)}</span>` : ""}<span class="pill">${esc(c.company_type)}</span></div>
    <dl><dt>Equipment</dt><dd>${val(c.primary_equipment, { reason: "Not confirmed" })}</dd><dt>Models</dt><dd>${n || "—"}</dd><dt>India</dt><dd>${esc(INDIA_LABEL[indiaKey(c)])}</dd></dl>
    <div class="foot2"><button class="btn sm cmpchk" data-cmp-toggle="company|${c.id}" aria-pressed="${ws.cmp("company").includes(c.id)}">${ws.cmp("company").includes(c.id) ? "✓ In compare" : "+ Compare"}</button>${srcBtn(c.source_ids)}</div></article>`;
}
function rowItem(c) {
  return `<div class="ritem"><input type="checkbox" data-cmp-toggle="company|${c.id}" aria-label="Compare ${esc(c.name)}"${ws.cmp("company").includes(c.id) ? " checked" : ""}>
    <div><a class="ttl" href="${hrefOf(c.id)}">${esc(c.name)}</a><div class="xs muted">${esc(c.company_type)} · ${esc(c.hq.country || "Country not captured")}</div></div>
    <div class="small ink2">${val(c.primary_equipment, { reason: "Equipment not confirmed" })}</div><div class="small">${esc(INDIA_LABEL[indiaKey(c)])}</div><div class="row">${badge(c.verification)}${srcBtn(c.source_ids)}</div></div>`;
}

function list({ params }) {
  const defs = COMPANY_FACETS();
  const state = readState(defs, params);
  const q = params.get("q") || "";
  const { rows, counts } = applyFacets(DB.companies, defs, state, q, hay);
  const mode = params.get("view") || ws.pref("viewmode:companies", "table");
  const cmpN = ws.cmp("company").length;
  const toolbar = `<div class="toolbar"><input class="input q" type="search" placeholder="Filter companies by name, equipment, country…" value="${esc(q)}" data-qparam="q" data-fk="coq" aria-label="Filter companies">
    <button class="btn filters-toggle" data-facets-toggle>Filters${Object.values(state).flat().length ? ` (${Object.values(state).flat().length})` : ""}</button>
    <div class="seg" role="group" aria-label="View mode">${["table", "grid", "list"].map(m => `<button data-viewmode="${m}" data-scope="companies" aria-pressed="${mode === m}">${m[0].toUpperCase() + m.slice(1)}</button>`).join("")}</div>
    <a class="btn" href="#/compare/companies">Compare (${cmpN})</a><button class="btn" data-savefilter="Companies view">☆ Save view</button>
    <span class="rescount">${plural(rows.length, "company", "companies")} of ${DB.companies.length}</span></div>`;
  const content = mode === "table" ? dataTable({ id: "companies", rows, columns: COMPANY_COLS, presets: COMPANY_PRESETS, compareKind: "company", title: "", exportName: "semicon-db-companies", sort: { k: "verification", d: 1 } })
    : !rows.length ? empty({ title: "No companies matched your filters.", tips: ["removing one filter", "choosing a broader equipment group", "clearing the text filter"] })
    : mode === "grid" ? `<div class="cards">${rows.slice(0, 300).map(card).join("")}</div>` : `<div class="rlist">${rows.slice(0, 300).map(rowItem).join("")}</div>`;
  const html = pageHead({ eyebrow: "Database", title: "Companies", crumb: [["Home", "#/"], ["Companies", null]],
    lede: `Equipment OEMs, subsystem and component suppliers, laser-source makers, automation vendors and startups. Categories count only when a source confirms them. † = HQ country from analyst knowledge, not a cited source.` })
    + listing({ facets: facetPanel(defs, state, counts), toolbar, chips: activeChips(defs, state, { q }), content });
  return { title: "Companies", html };
}

function portfolioMatrix(c) {
  const segs = ["Wafer Manufacturing", "Front-End", "Test", "Back-End", "Advanced Packaging", "Display", "Automation & Facilities"];
  const groups = DB.reference.equipment_groups;
  const cats = c.equipment_ids.map(get).filter(Boolean);
  const models = DB.models.filter(m => m.company_id === c.id && !m.is_component);
  const rowsG = groups.filter(g => cats.some(e => e.group_code === g.code) || models.some(m => m.category_group === g.code));
  if (!rowsG.length) return `<p class="na">No source-confirmed equipment category.</p>`;
  return `<div style="overflow-x:auto"><table class="matrix"><thead><tr><th>Equipment group</th>${segs.map(s => `<th>${esc(s)}</th>`).join("")}</tr></thead><tbody>${rowsG.map(g => `<tr><td>${esc(g.name)}</td>${segs.map(s => {
    const n = cats.filter(e => e.group_code === g.code && e.segment === s).length + models.filter(m => m.category_group === g.code && m.segment === s).length;
    return `<td class="${n ? "on" : ""}">${n ? "✓" : ""}</td>`; }).join("")}</tr>`).join("")}</tbody></table></div><p class="note">✓ = at least one source-confirmed category or model record. Blank = none captured (not proof of absence).</p>`;
}

function profile({ path, params }) {
  const c = get(path[1]);
  if (!c || c.entity_type !== "company") return { title: "Not found", html: empty({ title: `No company with id ${path[1]}.`, tips: [`<a href="#/companies">browse companies</a>`] }) };
  const tab = params.get("tab") || "overview";
  const base = hrefOf(c.id);
  const models = DB.models.filter(m => m.company_id === c.id);
  const fams = DB.product_families.filter(f => f.company_id === c.id);
  const custLinks = out(c.id, "supplies_equipment_to");
  const supply = [...out(c.id, ["supplies", "integrates", "distributes", "capable_of_supplying"]), ...inn(c.id, ["supplies", "distributes"])];
  const deals = DB.deals.filter(d => d.party_a_id === c.id || d.party_b_id === c.id);
  const corp = [...out(c.id, ["subsidiary_of", "brand_of", "acquired", "related_to", "unresolved_relationship", "merger_with", "invested_in", "partner_of", "joint_venture_with", "distributes_for", "spun_off", "corporate_group"]), ...inn(c.id, ["subsidiary_of", "brand_of", "acquired", "related_to", "unresolved_relationship", "merger_with", "invested_in", "partner_of", "joint_venture_with", "distributes_for", "spun_off", "corporate_group"])];
  const techs = techsOf(c), procs = procsOf(c);
  const apps = uniq(models.flatMap(m => m.application_ids));
  const T = [["overview", "Overview"], ["portfolio", "Portfolio", c.equipment_ids.length], ["products", "Products & models", models.length], ["relationships", "Relationships"], ["geography", "Geography & India"],
    ["financials", "Financials", c.financials.length], ["customers", "Customers & deals", custLinks.length + deals.length + supply.length], ["sources", "Sources", c.source_ids.length], ["history", "History"]];
  const head = `<div class="ehead"><div class="eyebrow">${esc(c.id)} · ${esc(c.company_type)} · ${esc(c.supply_chain_level)}</div><h1 class="pt">${esc(c.name)}</h1>
    ${c.aliases.length ? `<div class="small muted">Also known as: ${esc(c.aliases.join(", "))}</div>` : ""}
    <div class="row" style="margin-top:8px">${stateBadges(c)} ${conf(c.confidence.level)} <span class="pill" title="${esc(c.market_class_basis || "")}">${esc(pretty(c.market_class))}</span>${srcBtn(c.source_ids)}</div>
    <div class="kv"><dl><dt>Country</dt><dd>${val(c.hq.country)} ${c.hq.country ? `<span class="xs muted">(${esc(c.hq.country_basis)})</span>` : ""}</dd></dl><dl><dt>City</dt><dd>${val(c.hq.city)}</dd></dl>
      <dl><dt>Website</dt><dd>${c.website ? `<a href="${esc(c.website)}" target="_blank" rel="noopener noreferrer">${esc(c.website.replace(/^https?:\/\/(www\.)?/, ""))} ↗</a>` : val(null)}</dd></dl>
      <dl><dt>India presence</dt><dd>${esc(INDIA_LABEL[indiaKey(c)])}</dd></dl><dl><dt>Supplier roles</dt><dd>${esc(c.supplier_types.join(", "))}</dd></dl></div>
    ${quickActions(c.id, { compare: "company", extra: [`<a class="btn sm" href="${href("/products", { company: c.id })}">View equipment</a>`, `<a class="btn sm" href="${href("/suppliers", { q: c.name })}">View in suppliers</a>`] })}</div>`;
  let body = "";
  if (tab === "overview") {
    body = `${conflictsFor(c.id)}${c.rationale ? `<div class="callout">${esc(c.rationale)}</div>` : ""}
    <div class="grid g2"><div class="panel"><h2>Business overview</h2><p class="small">${val(c.description)} <span class="basis">· source-captured focus</span></p>
      ${specTable([["Primary equipment", val(c.primary_equipment, { reason: "Not confirmed by a source" })], ["Confirmed categories", tags(c.equipment_ids, { empty: "None confirmed" })],
        ["Candidate categories", c.candidate_categories ? `${esc(c.candidate_categories.split(/;\s*/).map(x => (get("EQP-" + x) ? `${x} ${get("EQP-" + x).name}` : x)).join("; "))} <span class="chip b-unverified">Analyst knowledge — unverified</span>` : val(null, { reason: "None" })],
        ["Parent", val(c.parent_company, { reason: "None recorded" })], ...(c.discovery_keywords?.length ? [["Found via keywords", `${esc(c.discovery_keywords.join("; "))} <span class="basis">· search keywords that surfaced this company (discovery aid, not a claim)</span>`]] : []), ["Brands / subsidiaries", val(c.subsidiaries_brands, { reason: "None recorded" })], ["Notes", val(c.notes, { reason: "—" })]])}</div>
    <div class="panel"><h2>Key facts</h2>${specTable([["Ownership", val(c.ownership)], ["Listing", val([c.exchange, c.ticker].filter(Boolean).join(" ") || null)], ["Founded", val(c.founded)], ["Employees", val(c.employees)],
      ["Revenue", c.revenue ? (c.revenue.usd_m != null ? `USD ${fmt(c.revenue.usd_m)} m · ${esc(c.revenue.fiscal_year)}` : `USD ${esc(c.revenue.range_usd_m)} m (derived range)`) : val(null)], ["Revenue basis", c.revenue ? esc(c.revenue.basis) + (c.revenue.reported ? ` · reported ${esc(c.revenue.reported)} m` : "") : val(null, { reason: "—" })],
      ["Semiconductor revenue", val(c.semiconductor_revenue)], ["Market class basis", val(c.market_class_basis, { reason: "No ranking or revenue evidence — unclassified" })], ["Evidence depth", esc(pretty(c.evidence_depth))],
      ["Market share", `<span class="na">Not recorded — SEMICON-DB does not estimate market share</span>`]])}</div></div>
    ${c.startup ? `<div class="panel sec"><h2>Startup profile</h2>${kv([["Founded", val(c.startup.year)], ["Founders", val(c.startup.founders)], ["Funding", val(c.startup.funding)], ["Investors", val(c.startup.investors)], ["Product", val(c.startup.product)], ["Maturity", val(c.startup.maturity)], ["TRL", val(c.startup.trl)], ["Latest news", val(c.startup.latest_news)], ["Verification", badge(c.startup.verification)], ["Sources", srcBtn(c.startup.source_ids)]])}${c.evidence_depth === "SEARCH_SUMMARY" ? `<p class="note">Funding, founders and dates are as reported by the cited sources (search-result summaries; pages not read). SEMICON-DB does not estimate valuations.</p>` : ""}</div>` : ""}
    ${completenessPanel(c)}
    <div class="panel sec"><h2>Portfolio matrix</h2>${portfolioMatrix(c)}</div>`;
  } else if (tab === "portfolio") {
    body = `<div class="panel"><h2>Portfolio matrix</h2>${portfolioMatrix(c)}</div>
    <div class="grid g2 sec"><div class="panel"><h2>Equipment categories (source-confirmed)</h2>${tags(c.equipment_ids, { empty: "None confirmed" })}${(c.equipment_ids_from_models || []).length ? `<p class="note">${c.equipment_ids_from_models.length} of these come from the company’s sourced models rather than its profile: ${c.equipment_ids_from_models.map(x => link(x)).join(", ")}.</p>` : ""}</div>
      <div class="panel"><h2>Product families</h2>${tags(fams.map(f => f.id), { empty: "No product families captured" })}</div>
      <div class="panel"><h2>Technologies</h2>${tags(techs, { empty: "None mapped" })}<p class="note">Derived from confirmed categories and source-stated laser types.</p></div>
      <div class="panel"><h2>Processes</h2>${tags(procs, { empty: "None mapped" })}</div>
      <div class="panel"><h2>Applications</h2>${tags(apps, { empty: "None stated" })}<p class="note">Derived by text match on source-stated application fields.</p></div>
      <div class="panel"><h2>Component classes supplied</h2>${tags(DB.supplierById.get(c.id)?.component_class_ids || [], { empty: "None recorded" })}</div></div>`;
  } else if (tab === "products") {
    body = models.length ? `${fams.length ? `<div class="panel" style="margin-bottom:12px"><h2>Product families</h2><div class="tags">${fams.map(f => `<a class="tag" href="${hrefOf(f.id)}">${esc(f.name)} <span class="k">${f.model_ids.length}</span></a>`).join("")}</div></div>` : ""}${modelTable("co-models-" + c.id, models, { company: false, title: "Products & models" })}`
      : empty({ title: "No products or models captured for this company yet.", kind: "not-available" });
  } else if (tab === "relationships") body = relationsSection(c.id);
  else if (tab === "geography") {
    body = `<div class="grid g2"><div class="panel"><h2>Headquarters</h2>${specTable([["Country", val(c.hq.country)], ["Country basis", esc(c.hq.country_basis)], ["City", val(c.hq.city)], ["Region", val(c.hq.region)],
      ["Country page", c.hq.country_id ? link(c.hq.country_id) : val(null)], ["Manufacturing locations", val(null)], ["R&D locations", val(null)], ["Sales / service offices", val(null)]])}</div>
      <div class="panel"><h2>Presence signals (Batch 1)</h2>${specTable([["China", val(c.presence.china, { reason: "Not documented" })], ["Japan", val(c.presence.japan, { reason: "Not documented" })], ["South Korea", val(c.presence.korea, { reason: "Not documented" })], ["Taiwan", val(c.presence.taiwan, { reason: "Not documented" })]])}
      <p class="note">Presence signals come from the Batch-1 customer and HQ fields only.</p></div></div>
      <div class="panel sec"><h2>India presence</h2>${c.india.records.length ? `<table class="spec"><tbody>${c.india.records.map(r => `<tr><th>${esc(r.type)}</th><td>${esc([r.facility, r.location].filter(Boolean).join(" · "))}<span class="sub">${esc([r.scope, r.status].filter(Boolean).join(" · "))}</span><span class="sub">${r.opportunity ? "Documented opportunity: " + esc(r.opportunity) : ""}</span></td><td>${conf(r.confidence)} ${srcBtn(r.source_ids)}</td></tr>`).join("")}</tbody></table>`
        : c.hq.country === "India" ? `<p>Headquartered in India.</p>` : `<p class="na">No India presence documented in Batch-1 sources. This is not evidence of absence.</p>`}</div>`;
  } else if (tab === "financials") {
    body = c.financials.length ? dataTable({ id: "fin-" + c.id, rows: c.financials.map((f, i) => ({ ...f, id: c.id + "-f" + i })), title: "Financial facts (fiscal years kept separate)", exportName: "financials-" + c.id, columns: [
      { k: "fiscal_year", label: "Fiscal year" }, { k: "metric", label: "Metric" }, { k: "value", label: "Value (reported)", num: true, get: f => f.value, html: f => `${esc(f.currency)} ${typeof f.value === "number" ? fmt(f.value) : esc(f.value)}${f.currency === "%" ? "" : " m"}` },
      { k: "usd_m", label: "≈ USD m", num: true, get: f => f.usd_m, html: f => f.usd_m != null ? fmt(f.usd_m) : `<span class="muted">—</span>` }, { k: "value_type", label: "Type", html: f => f.value_type === "UNIT_CONFLICT" ? badge("CONFLICTING") : `<span class="pill">${esc(pretty(f.value_type))}</span>` },
      { k: "note", label: "Note", wrap: true, html: f => val(f.note, { reason: "—" }) }, { k: "src", label: "Source", get: f => f.source_ids.join(";"), html: f => srcBtn(f.source_ids) }] })
      : empty({ title: "No financial facts captured.", kind: "not-available" });
  } else if (tab === "customers") {
    body = `<div class="panel"><h2>Customer relationships</h2>${custLinks.length ? `<table class="spec"><tbody>${custLinks.map(r => `<tr><th>${link(r.to, r.detail.customer)}</th><td>${esc([r.detail.product, r.detail.stage, r.detail.site, r.detail.location].filter(Boolean).join(" · "))}<span class="sub">${esc(r.detail.evidence || "")}</span></td><td>${badge(r.status)} ${srcBtn(r.source_ids)}</td></tr>`).join("")}</tbody></table>` : `<p class="na">No customer relationship documented. Customers are never inferred.</p>`}</div>
    <div class="panel sec"><h2>Supply-chain links</h2>${supply.length ? `<table class="spec"><tbody>${supply.map(r => `<tr><th>${badge(r.status)}</th><td>${r.from === c.id ? "→ " + link(r.to) : "← " + link(r.from)} <span class="muted">${esc(r.type.replace(/_/g, " "))}</span><span class="sub">${esc([r.detail?.component, r.detail?.evidence].filter(Boolean).join(" · "))}</span></td><td>${srcBtn(r.source_ids)}</td></tr>`).join("")}</tbody></table>` : `<p class="na">None recorded.</p>`}</div>
    <div class="panel sec"><h2>Corporate relationships, deals &amp; partnerships</h2>${corp.length || deals.length ? `<table class="spec"><tbody>${corp.map(r => `<tr><th>${esc(r.type.replace(/_/g, " "))}</th><td>${r.from === c.id ? link(r.to) : link(r.from)} <span class="sub">${esc(r.detail?.evidence || r.detail?.event || "")}${r.detail?.value ? " · " + esc(r.detail.value) : ""}</span></td><td>${esc(r.status || "")} ${srcBtn(r.source_ids)}</td></tr>`).join("")}
      ${deals.filter(d => !(d.party_a_id && d.party_b_id)).map(d => `<tr><th>${esc(d.event_type)}</th><td>${esc(d.party_a)} · ${esc(d.party_b)}<span class="sub">${esc([d.date, d.value_disclosed, d.technology].filter(Boolean).join(" · "))}</span></td><td>${esc(d.status)} ${srcBtn(d.source_ids)}</td></tr>`).join("")}</tbody></table>` : `<p class="na">None recorded.</p>`}</div>`;
  } else if (tab === "sources") body = sourcesSection(c.source_ids, [...models.flatMap(m => m.source_ids), ...custLinks.flatMap(r => r.source_ids), ...deals.flatMap(d => d.source_ids)]);
  else if (tab === "history") body = historySection(c);
  const html = `${crumbs([["Home", "#/"], ["Companies", "#/companies"], ...(c.hq.country ? [[c.hq.country, c.hq.country_id ? hrefOf(c.hq.country_id) : null]] : []), [c.name, null]])}${head}${tabs(base, tab, T)}${body}`;
  return { title: c.name, html };
}

export function companies(ctx) { return ctx.path[1] ? profile(ctx) : list(ctx); }

// Objective field coverage + generated research queries for what is still unknown (never estimated).
const RESEARCH_Q = { "HQ country source-backed": "headquarters", City: "headquarters address", "Founded year": "founded year history", Description: "company overview",
  "Equipment category confirmed": "semiconductor equipment products", "At least one product / model": "semiconductor equipment product models", "Ownership / listing": "ownership stock listing",
  "Revenue (reported)": "annual report revenue", Employees: "number of employees", "Two or more sources": "semiconductor", "Official (Tier 1) source": "official website",
  "Verified (page read)": "product page", "India presence assessed": "India office facility", Website: "official website" };
function completenessPanel(c) {
  const k = c.completeness; if (!k) return "";
  const miss = k.groups.flatMap(g => g.missing);
  const qs = uniq(miss.map(m => RESEARCH_Q[m]).filter(Boolean)).slice(0, 8).map(q => `"${c.canonical_name || c.name}" ${q}`);
  return `<div class="panel sec"><div class="row sp"><h2>Data completeness</h2><span class="pill">${k.score}% · ${k.filled}/${k.total} key fields</span></div>
    <table class="spec"><tbody>${k.groups.map(g => `<tr><th>${esc(g.group)}<span class="sub">${g.filled}/${g.total}</span></th><td>${g.missing.length ? `<span class="na">Missing: ${esc(g.missing.join(", "))}</span>` : "Complete"}</td></tr>`).join("")}</tbody></table>
    ${qs.length ? `<h3 class="small" style="margin-top:12px">Research next</h3><ul class="small">${qs.map(q => `<li><code>${esc(q)}</code></li>`).join("")}</ul>` : ""}
    <p class="note">${esc(k.basis)}. This measures coverage of the record, not the company. Missing values stay “not captured” until a source is found.</p></div>`;
}

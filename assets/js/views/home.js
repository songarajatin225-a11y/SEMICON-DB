// Command centre: the whole database at a glance, every number clickable.
import { DB, hrefOf } from "../core/store.js";
import { esc, fmt, countBy, sortedEntries, plural } from "../core/util.js";
import { EXAMPLES } from "../core/search.js";
import { kpi, bars, stackBar, PALETTE, badge, link } from "../ui/components.js";
import { href } from "../core/router.js";

export function flowNodes(activeId) {
  const flow = DB.processes.filter(p => p.flow_position != null).sort((a, b) => a.flow_position - b.flow_position);
  const max = Math.max(1, ...flow.map(p => p.model_ids.length));
  return `<div class="flow">${flow.map(p => `<a class="fnode" href="${hrefOf(p.id)}"${p.id === activeId ? ' aria-current="true"' : ""} data-tip="${esc(p.description)}">
    <div class="st">${esc(p.stage)} · ${p.flow_position}</div><div class="t">${esc(p.name)}</div><div class="c">${plural(p.model_ids.length, "model")} · ${plural(p.company_ids.length, "company", "companies")}</div>
    <div class="h"><b style="width:${(100 * p.model_ids.length / max).toFixed(0)}%"></b></div></a>`).join("")}</div>`;
}

export function home() {
  const C = DB.companies, M = DB.models, eqNodes = DB.equipment.filter(e => e.level > 1);
  const ver = arr => countBy(arr, r => r.verification);
  const cv = ver(C), mv = ver(M);
  const needs = [...C, ...M].filter(r => r.verification !== "VERIFIED" || ["CONFLICTING", "OUTDATED"].includes(r.quality_state));
  const indiaCos = C.filter(c => c.hq.country === "India" || c.india.has_presence);
  const nonOEM = DB.suppliers.filter(s => s.supplier_types.some(t => t !== "Equipment OEM"));
  const tiers = countBy(DB.sources, s => String(s.tier));
  const relBasis = countBy(DB.relationships, r => r.basis);
  const seg = countBy(M.filter(m => !m.is_component), m => m.segment);
  const byGroup = DB.reference.equipment_groups.map(g => ({ l: g.name, v: C.filter(c => c.equipment_ids.some(e => e.startsWith("EQP-" + g.code))).length, href: `#/companies?group=${g.code}`, tip: `${g.name}: companies with a source-confirmed category` })).filter(x => x.v).sort((a, b) => b.v - a.v);
  const byRegion = sortedEntries(countBy(C, c => c.hq.region || "Not captured")).map(([l, v]) => ({ l, v, href: l === "Not captured" ? null : `#/companies?region=${encodeURIComponent(l)}` }));
  const conf = countBy(C, c => c.confidence.level);
  const recent = [...C, ...M].filter(r => r.dates?.latest_source_date).sort((a, b) => b.dates.latest_source_date.localeCompare(a.dates.latest_source_date)).slice(0, 8);
  const mk = DB.intel.market.filter(m => m.metric === "Equipment billings" && m.region_or_segment !== "World"), world = DB.intel.market.find(m => m.region_or_segment === "World");
  const segColors = { "Front-End": PALETTE[0], "Back-End": PALETTE[1], "Test": PALETTE[4], "Advanced Packaging": PALETTE[2], "Display": PALETTE[5], "Automation & Facilities": PALETTE[3], "Wafer Manufacturing": "#7B5EA7", Other: "var(--s4)" };
  const html = `
  <div class="eyebrow">Command centre</div>
  <h1 class="pt">Global Semiconductor Equipment Intelligence Graph</h1>
  <p class="lede">A relationship-driven database linking equipment companies, product families and models to processes, technologies, materials, subsystems, components, fabs, OSATs and geography — with the source and verification state behind every fact. Evidence as of ${esc(DB.meta.evidence_as_of)}.</p>
  <div class="panel" style="margin-bottom:14px"><button class="gsearch" data-action="palette" style="max-width:none;height:42px;width:100%" aria-label="Open search"><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M11 11l4 4" stroke="currentColor" stroke-width="1.6"/></svg><span>Try “200 mm SiC laser dicing equipment” or “hybrid bonding suppliers”</span><kbd>Ctrl K</kbd></button>
    <div class="tags" style="margin-top:10px">${EXAMPLES.map(q => `<a class="tag" href="${href("/search", { q })}">${esc(q)}</a>`).join("")}</div></div>
  <div class="kpis">
    ${kpi({ v: C.length, l: "Equipment & supply-chain companies", s: `${cv.get("VERIFIED") || 0} verified`, href: "#/companies" })}
    ${kpi({ v: eqNodes.length, l: "Equipment categories", s: `${DB.reference.equipment_groups.length} groups`, href: "#/equipment" })}
    ${kpi({ v: DB.product_families.length, l: "Product families", href: "#/products?view=table" })}
    ${kpi({ v: M.length, l: "Product & model records", s: `${M.filter(m => m.model_identified).length} with model number`, href: "#/products" })}
    ${kpi({ v: DB.processes.length, l: "Processes", href: "#/processes" })}
    ${kpi({ v: DB.technologies.length, l: "Technologies", href: "#/technologies" })}
    ${kpi({ v: DB.materials.length, l: "Materials", href: "#/materials" })}
    ${kpi({ v: DB.subsystems.length, l: "Subsystems", href: "#/subsystems" })}
    ${kpi({ v: DB.components.length, l: "Component classes", href: "#/components" })}
    ${kpi({ v: nonOEM.length, l: "Suppliers (non-OEM roles)", href: "#/suppliers" })}
    ${kpi({ v: DB.fabs.length, l: "Fabs / device makers", href: "#/fabs" })}
    ${kpi({ v: DB.osats.length, l: "OSAT / ATMP", href: "#/osats" })}
    ${kpi({ v: (DB.facilities || []).length, l: "Facilities (site level)", s: `${(DB.facilities || []).filter(f => f.country === "India").length} in India`, href: "#/facilities" })}
    ${kpi({ v: C.filter(c => c.is_startup).length, l: "Startups", href: "#/companies?startup=yes" })}
    ${kpi({ v: C.filter(c => c.batch && c.batch !== "Batch 1").length + M.filter(m => m.batch && m.batch !== "Batch 1").length, l: "Records added since Batch 1", s: `latest ${esc(DB.meta.evidence_as_of)}`, href: "#/intelligence/changes" })}
    ${kpi({ v: indiaCos.length, l: "India ecosystem companies", s: `${C.filter(c => c.hq.country === "India").length} HQ in India`, href: "#/india" })}
    ${kpi({ v: needs.length, l: "Records requiring verification", s: `${DB.quality.conflicts.length} conflicts`, href: "#/quality" })}
    ${kpi({ v: DB.relationships.length, l: "Relationships", s: `${relBasis.get("source") || 0} source-backed`, href: "#/quality?tab=relationships" })}
    ${kpi({ v: DB.sources.length, l: "Numbered sources", s: `${tiers.get("1") || 0} Tier 1`, href: "#/sources" })}
  </div>

  <div class="panel sec"><div class="row sp"><div><div class="eyebrow">Process chain</div><h2>Wafer start to final test — models mapped per process</h2></div><a class="btn sm" href="#/processes">Open process explorer</a></div>${flowNodes()}
    <p class="note">Counts derive from each model's source-backed equipment category mapped to the reference process library. Select a step to see its equipment, OEMs, materials and suppliers.</p></div>

  <div class="grid g2 sec">
    <div class="panel"><div class="eyebrow">Coverage</div><h2>Companies by equipment group</h2>${bars(byGroup, { lw: 200 })}<p class="note">Counts only source-confirmed categories. Analyst-candidate categories are kept separately and never counted.</p></div>
    <div class="panel"><div class="eyebrow">Split</div><h2>Front-end / back-end / test</h2>
      ${stackBar("Equipment models by segment", sortedEntries(seg).map(([l, v]) => ({ l, v, c: segColors[l] || "var(--s4)", href: `#/products?segment=${encodeURIComponent(l)}` })))}
      ${stackBar("India vs global companies", [{ l: "HQ in India", v: C.filter(c => c.hq.country === "India").length, c: PALETTE[0], href: "#/india" }, { l: "Global with documented India presence", v: C.filter(c => c.hq.country !== "India" && c.india.has_presence).length, c: PALETTE[1], href: "#/companies?india=presence" }, { l: "No India presence documented", v: C.filter(c => c.hq.country !== "India" && !c.india.has_presence).length, c: "var(--s4)" }])}
      <h3 style="margin-top:14px">Regional distribution (headquarters)</h3>${bars(byRegion, { lw: 130 })}
      <p class="note">HQ country for ${C.filter(c => c.hq.country_basis_code === "KNOW").length} companies is analyst knowledge rather than a cited source${C.some(c => c.hq.country_basis_code === "SUM") ? ` and for ${C.filter(c => c.hq.country_basis_code === "SUM").length} it comes from a search-result summary of a cited source` : ""}; the basis is labelled on every profile.</p></div>
  </div>

  <div class="grid g3 sec">
    <div class="panel"><div class="eyebrow">Evidence</div><h2>Verification state</h2>
      ${stackBar("Companies", [{ l: "Verified", v: cv.get("VERIFIED") || 0, c: PALETTE[0] }, { l: "Partial", v: cv.get("PARTIALLY_VERIFIED") || 0, c: PALETTE[2] }, { l: "Unverified", v: cv.get("UNVERIFIED") || 0, c: "var(--s4)" }])}
      ${stackBar("Models", [{ l: "Verified", v: mv.get("VERIFIED") || 0, c: PALETTE[0] }, { l: "Partial", v: mv.get("PARTIALLY_VERIFIED") || 0, c: PALETTE[2] }, { l: "Unverified", v: mv.get("UNVERIFIED") || 0, c: "var(--s4)" }])}
      ${stackBar("Relationships", [{ l: "Source-backed", v: relBasis.get("source") || 0, c: PALETTE[0] }, { l: "Derived", v: relBasis.get("derived") || 0, c: PALETTE[4] }, { l: "Editorial reference", v: relBasis.get("reference") || 0, c: PALETTE[2] }, { l: "Analyst", v: relBasis.get("analyst") || 0, c: "var(--s4)" }])}</div>
    <div class="panel"><div class="eyebrow">Sources</div><h2>Source confidence</h2>
      ${stackBar("Sources by tier", [{ l: "Tier 1 official", v: tiers.get("1") || 0, c: PALETTE[0] }, { l: "Tier 2 industry", v: tiers.get("2") || 0, c: PALETTE[1] }, { l: "Tier 3 directory", v: tiers.get("3") || 0, c: PALETTE[2] }, { l: "Tier 4 / internal", v: (tiers.get("4") || 0) + (tiers.get("INT") || 0) + (tiers.get("BRIEF") || 0), c: "var(--s4)" }])}
      ${stackBar("Company confidence", [{ l: "High", v: conf.get("HIGH") || 0, c: PALETTE[0] }, { l: "Medium", v: conf.get("MEDIUM") || 0, c: PALETTE[1] }, { l: "Low", v: conf.get("LOW") || 0, c: PALETTE[2] }, { l: "Unverified", v: conf.get("UNVERIFIED") || 0, c: "var(--s4)" }])}
      ${stackBar("Source freshness", ["Recent", "Needs Review", "Stale", "Unknown"].map((f, i) => ({ l: f, v: DB.sources.filter(s => s.freshness === f).length, c: [PALETTE[0], PALETTE[5], "var(--crit)", "var(--s4)"][i] })))}</div>
    <div class="panel"><div class="eyebrow">Growth</div><h2>Database batches</h2>
      <table class="spec"><tbody>${DB.meta.batches.map(b => `<tr><th>${esc(b.batch)}<span class="sub">${esc(b.date)}</span></th><td>${b.companies} companies · ${b.models ?? b.products} models · ${b.sources} sources${b.relationships ? ` · ${fmt(b.relationships)} relationships` : ""}<span class="sub">${esc(b.note)}</span></td></tr>`).join("")}</tbody></table>
      <p class="note">2.0 adds structure (taxonomy, processes, subsystems, relationships, quality layer) over the Batch-1 evidence. No external facts were added without a source.</p></div>
  </div>

  <div class="grid g2 sec">
    <div class="panel"><div class="eyebrow">Freshness</div><h2>Most recently evidenced records</h2><table class="spec"><tbody>${recent.map(r => `<tr><th>${esc(r.dates.latest_source_date)}</th><td>${link(r.id)} <span class="muted xs">${r.entity_type === "model" ? esc(r.manufacturer) : esc(r.company_type)}</span></td></tr>`).join("")}</tbody></table>
      <p class="note">Ordered by the publication date of the newest supporting source. Records were entered in ${esc(DB.meta.batches.filter(b => b.batch !== "2.0 migration").map(b => `${b.batch} (${b.date})`).join(" and "))}.</p></div>
    <div class="panel"><div class="eyebrow">Review queue</div><h2>Records requiring verification</h2><table class="spec"><tbody>${needs.slice(0, 9).map(r => `<tr><th>${badge(["CONFLICTING", "OUTDATED"].includes(r.quality_state) ? r.quality_state : r.verification)}</th><td>${link(r.id)}<span class="sub">${esc(r.entity_type === "model" ? r.manufacturer : r.company_type)}</span></td></tr>`).join("")}</tbody></table>
      <p class="note"><a href="#/quality">All ${needs.length} records in the Data Quality centre →</a></p></div>
  </div>

  <div class="panel sec"><div class="eyebrow">Market context</div><h2>2025 equipment billings by region</h2>
    ${bars(mk.map(r => ({ l: r.region_or_segment, v: r.value_usd_b, lab: `$${r.value_usd_b.toFixed(1)} B <span class="muted">${esc(r.change)}</span>`, tip: `${r.region_or_segment}: $${r.value_usd_b} B, ${r.change} vs 2024` })), { lw: 110 })}
    <p class="note">World total $${world.value_usd_b} B (${esc(world.change)}). Source: <button class="srcbtn" data-sources="${world.source_id}">↗ SEMI (${esc(world.source_id)})</button></p></div>`;
  return { title: "Command centre", html };
}

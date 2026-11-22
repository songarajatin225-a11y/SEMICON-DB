// Products & models: faceted list (table / grid / list), product-family pages and model detail pages.
import { DB, get, hrefOf, nameOf, out, inn } from "../core/store.js";
import { esc, uniq, pretty, plural, norm } from "../core/util.js";
import { ws } from "../core/workspace.js";
import { href } from "../core/router.js";
import { readState, applyFacets, facetPanel, activeChips, listing } from "../ui/facets.js";
import { pageHead, crumbs, badge, conf, fresh, srcBtn, tags, val, specTable, tabs, quickActions, stateBadges, link, empty, basis } from "../ui/components.js";
import { modelTable, relationsSection, sourcesSection, historySection, conflictsFor, waferText } from "./shared.js";

const STD = [50, 75, 100, 125, 150, 200, 300, 450];
const waferVals = m => { if (!m.wafer) return ["none"]; const s = new Set((m.wafer.sizes_mm || []).map(String)); if (m.wafer.range_mm) STD.filter(x => (m.wafer.range_mm.min == null || x >= m.wafer.range_mm.min) && x <= m.wafer.range_mm.max).forEach(x => s.add(String(x))); return s.size ? [...s] : ["none"]; };
const ancestors = id => { const out = []; let e = get(id); while (e) { out.push(e.id); e = e.parent_id ? get(e.parent_id) : null; } return out; };
const laserBand = m => { if (!m.laser) return []; const s = `${m.laser.wavelength || ""} ${m.laser.types_text || ""}`; const b = new Set();
  (s.match(/\d{3,4}(?=\s*(nm|\/|,|\s|$))/g) || []).forEach(x => { const n = +x; if (n < 400) b.add("UV"); else if (n >= 500 && n <= 560) b.add("Green"); else if (n >= 1000 && n < 2000) b.add("IR"); if (n === 308) b.add("Excimer"); });
  if (/\bUV\b/i.test(s)) b.add("UV"); if (/green/i.test(s)) b.add("Green"); if (/\bIR\b/.test(s)) b.add("IR"); if (/CO2|CO₂/.test(s)) b.add("CO₂"); if (/excimer/i.test(s)) b.add("Excimer"); return [...b]; };
const coOf = m => get(m.company_id);
export const MODEL_FACETS = () => [
  { key: "segment", label: "Front-end / back-end / test", get: m => [m.segment], open: true },
  { key: "group", label: "Equipment group", get: m => [m.category_group], label_of: v => v === "COMPONENT" ? "Components (laser-tool BOM, RF)" : DB.reference.equipment_groups.find(g => g.code === v)?.name || v },
  { key: "eq", label: "Equipment category", get: m => (m.equipment_id ? ancestors(m.equipment_id) : []), label_of: v => `${get(v)?.code} · ${nameOf(v)}` },
  { key: "process", label: "Process", get: m => m.process_ids, label_of: nameOf, open: true },
  { key: "tech", label: "Technology", get: m => m.technology_ids, label_of: nameOf },
  { key: "material", label: "Material / substrate", get: m => m.material_ids, label_of: nameOf },
  { key: "wafer", label: "Wafer size (stated or within stated range)", get: waferVals, label_of: v => (v === "none" ? "Not published" : v + " mm"), sort: "count" },
  { key: "app", label: "Application / device", get: m => m.application_ids, label_of: nameOf },
  { key: "company", label: "Manufacturer", get: m => [m.company_id], label_of: nameOf },
  { key: "country", label: "Manufacturer country", get: m => [coOf(m)?.hq.country || "Not captured"] },
  { key: "region", label: "Region", get: m => [coOf(m)?.hq.region || "Not captured"] },
  { key: "india", label: "Manufacturer India presence", get: m => [coOf(m)?.hq.country === "India" ? "hq" : coOf(m)?.india.has_presence ? "presence" : "none"], label_of: v => ({ hq: "HQ in India", presence: "Documented presence", none: "None documented" }[v]) },
  { key: "laser", label: "Laser band", get: laserBand },
  { key: "lifecycle", label: "Lifecycle", get: m => [m.lifecycle.status] },
  { key: "model", label: "Record level", get: m => [m.model_identified ? "model" : "family"], label_of: v => (v === "model" ? "Model number published" : "Family-level (no model number)") },
  { key: "ver", label: "Verification", get: m => [m.verification], label_of: pretty },
  { key: "conf", label: "Confidence", get: m => [m.confidence.level], label_of: pretty },
  { key: "fresh", label: "Evidence freshness", get: m => [m.freshness] },
];
const hay = m => norm([m.name, m.manufacturer, m.equipment_label, m.technology_text, m.application_text, m.material_text, m.laser?.types_text, m.model_number].join(" "));

function card(m) {
  const inCmp = ws.cmp("model").includes(m.id);
  return `<article class="card"><div class="top"><a class="ttl" href="${hrefOf(m.id)}">${esc(m.family_name)}</a><span class="code">${esc(m.equipment_code)}</span></div>
    <div class="small"><b>${esc(m.manufacturer)}</b> <span class="mono">${esc(m.model_number || "")}</span></div>
    <div class="row">${badge(m.verification)}<span class="pill">${esc(m.segment)}</span><span class="pill">${esc(m.lifecycle.status)}</span></div>
    <dl><dt>Category</dt><dd>${esc(m.equipment_label)}</dd><dt>Process</dt><dd>${m.process_ids.length ? esc(m.process_ids.map(nameOf).slice(0, 2).join(", ")) : val(null, { reason: "Not mapped" })}</dd>
      <dt>Wafer</dt><dd>${val(waferText(m.wafer), { reason: "Not published" })}</dd>${m.material_ids.length ? `<dt>Material</dt><dd>${esc(m.material_ids.map(nameOf).join(", "))}</dd>` : ""}
      <dt>India</dt><dd>${coOf(m)?.hq.country === "India" ? "HQ in India" : coOf(m)?.india.has_presence ? "Maker present" : "Not documented"}</dd></dl>
    <div class="foot2"><button class="btn sm cmpchk" data-cmp-toggle="model|${m.id}" aria-pressed="${inCmp}">${inCmp ? "✓ In compare" : "+ Compare"}</button>${srcBtn(m.source_ids)}</div></article>`;
}
function rowItem(m) {
  return `<div class="ritem"><input type="checkbox" data-cmp-toggle="model|${m.id}" aria-label="Compare ${esc(m.name)}"${ws.cmp("model").includes(m.id) ? " checked" : ""}>
    <div><a class="ttl" href="${hrefOf(m.id)}">${esc(m.name)}</a><div class="xs muted">${esc(m.manufacturer)} · ${esc(coOf(m)?.hq.country || "")}</div></div>
    <div class="small">${esc(m.equipment_label)}<div class="xs muted">${esc(m.process_ids.map(nameOf).slice(0, 2).join(", "))}</div></div>
    <div class="small">${val(waferText(m.wafer), { reason: "Wafer not published" })}</div><div class="row">${badge(m.verification)}${srcBtn(m.source_ids)}</div></div>`;
}

function list({ params }) {
  const defs = MODEL_FACETS();
  const state = readState(defs, params);
  const q = params.get("q") || "";
  const { rows, counts } = applyFacets(DB.models, defs, state, q, hay);
  const mode = params.get("view") || ws.pref("viewmode:products", "table");
  const n = Object.values(state).flat().length;
  const toolbar = `<div class="toolbar"><input class="input q" type="search" placeholder="Filter by model, manufacturer, technology, application…" value="${esc(q)}" data-qparam="q" data-fk="prq" aria-label="Filter products">
    <button class="btn filters-toggle" data-facets-toggle>Filters${n ? ` (${n})` : ""}</button>
    <div class="seg" role="group" aria-label="View mode">${["table", "grid", "list"].map(v => `<button data-viewmode="${v}" data-scope="products" aria-pressed="${mode === v}">${v[0].toUpperCase() + v.slice(1)}</button>`).join("")}</div>
    <a class="btn" href="#/compare">Compare (${ws.cmp("model").length})</a><button class="btn" data-savefilter="Products view">☆ Save view</button>
    <span class="rescount">${plural(rows.length, "record")} of ${DB.models.length}</span></div>`;
  const hint = state.wafer?.length ? `<div class="callout">Wafer filter matches the diameter a source states, or a stated range that covers it (e.g. “up to 305 mm” covers 300 mm). ${DB.models.filter(m => !m.wafer).length} of ${DB.models.length} records publish no wafer size and are excluded by this filter.</div>` : "";
  const content = hint + (mode === "table" ? modelTable("products", rows, { title: "", sort: { k: "verification", d: 1 } })
    : !rows.length ? empty({ title: "No equipment matched your filters.", tips: ["removing one material constraint", "selecting a broader equipment category", "changing or removing the wafer size"] })
    : mode === "grid" ? `<div class="cards">${rows.slice(0, 300).map(card).join("")}</div>` : `<div class="rlist">${rows.slice(0, 300).map(rowItem).join("")}</div>`);
  const html = pageHead({ eyebrow: "Database", title: "Products & models", crumb: [["Home", "#/"], ["Products", null]],
    lede: "Every product or model named by a source, organised Company → Product family → Model. Records without a published model number are shown as family-level records. Technical values appear only as the source states them." })
    + listing({ facets: facetPanel(defs, state, counts), toolbar, chips: activeChips(defs, state, { q }), content });
  return { title: "Products & models", html };
}

function family({ path }) {
  const f = get(path[1]);
  if (!f || f.entity_type !== "product_family") return { title: "Not found", html: empty({ title: `No product family ${path[1]}.`, tips: [`<a href="#/products">browse products</a>`] }) };
  const ms = f.model_ids.map(get);
  const html = `${crumbs([["Home", "#/"], ["Companies", "#/companies"], [f.manufacturer, hrefOf(f.company_id)], ["Product family", null]])}
    <div class="ehead"><div class="eyebrow">${esc(f.id)} · Product family</div><h1 class="pt">${esc(f.name)}</h1>
    <div class="row" style="margin-top:8px">${badge(f.verification)}${srcBtn(f.source_ids)}</div>
    <div class="kv"><dl><dt>Manufacturer</dt><dd>${link(f.company_id)}</dd></dl><dl><dt>Models</dt><dd>${f.model_ids.length}</dd></dl><dl><dt>Equipment</dt><dd>${f.equipment_ids.map(e => link(e)).join(", ") || val(null)}</dd></dl></div>
    ${quickActions(f.id)}<p class="note">${esc(f.basis)}.</p></div>
    <div class="grid g2"><div class="panel"><h2>Processes</h2>${tags(f.process_ids)}</div><div class="panel"><h2>Technologies</h2>${tags(f.technology_ids)}</div></div>
    <div class="sec">${modelTable("fam-" + f.id, ms, { company: false, title: "Models in this family" })}</div>`;
  return { title: f.name, html };
}
export function products(ctx) { return ctx.path[1] ? family(ctx) : list(ctx); }

// ------------------------------------------------------------------ model detail
const NOT_CAPTURED = ["Number of chambers", "Chamber configuration", "RF configuration", "Vacuum architecture", "Gas architecture", "Optical system", "Robot / load-port configuration", "FOUP compatibility",
  "Software & automation interfaces (SECS/GEM)", "Utilities (power, cooling, exhaust, CDA, water)", "Weight", "Consumables & critical spares", "Service model", "Launch year", "EOL date / replacement"];

// Alternative engine: same category → direct / partial substitute; same process via another category → different technology.
const ORDER = { "Direct substitute (candidate)": 0, "Partial substitute": 1, "Development-stage alternative": 2, "Different technology": 3 };
function classifyAlternatives(m, sameCat) {
  const wf = x => x.wafer ? [...(x.wafer.sizes_mm || []), ...(x.wafer.range_mm ? [x.wafer.range_mm.min, x.wafer.range_mm.max].filter(v => v != null) : [])] : [];
  const mw = wf(m), dev = x => /develop|prototype|pilot/i.test(`${x.lifecycle.status} ${x.lifecycle.maturity || ""}`);
  const rows = sameCat.map(x => { const ok = ["same equipment category"], no = [];
    const xw = wf(x); if (mw.length && xw.length) (mw.some(v => xw.includes(v)) ? ok : no).push(mw.some(v => xw.includes(v)) ? "overlapping wafer size" : "different wafer size"); else no.push("wafer size");
    const tech = x.technology_ids.filter(t => m.technology_ids.includes(t)); (tech.length ? ok : no).push(tech.length ? "shared technology" : "technology overlap");
    const cls = dev(x) ? "Development-stage alternative" : no.length ? "Partial substitute" : "Direct substitute (candidate)";
    return { x, cls, ok, no }; });
  const other = m.process_ids.length ? DB.models.filter(x => x.id !== m.id && !x.is_component && x.equipment_id && x.equipment_id !== m.equipment_id && x.process_ids.some(p => m.process_ids.includes(p))
    && get(x.equipment_id)?.parent_id === get(m.equipment_id)?.parent_id).slice(0, 25).map(x => ({ x, cls: "Different technology", ok: [`same process: ${x.process_ids.filter(p => m.process_ids.includes(p)).map(p => get(p)?.name).join(", ")}`, `category: ${get(x.equipment_id)?.name}`], no: [] })) : [];
  return [...rows, ...other].sort((a, b) => ORDER[a.cls] - ORDER[b.cls] || a.no.length - b.no.length);
}

export function modelView({ path, params }) {
  const m = get(path[1]);
  if (!m || m.entity_type !== "model") return { title: "Not found", html: empty({ title: `No model ${path[1] || ""}.`, tips: [`<a href="#/products">browse products & models</a>`] }) };
  const c = get(m.company_id), eq = m.equipment_id ? get(m.equipment_id) : null;
  const tab = params.get("tab") || "overview";
  const base = hrefOf(m.id);
  const cust = out(m.company_id, "supplies_equipment_to").filter(r => r.detail.model_id === m.id);
  const coCust = out(m.company_id, "supplies_equipment_to").filter(r => r.detail.model_id !== m.id);
  const alts = eq ? DB.models.filter(x => x.id !== m.id && x.equipment_id === m.equipment_id) : m.component_class_id ? DB.models.filter(x => x.id !== m.id && x.component_class_id === m.component_class_id) : [];
  const subs = eq ? eq.typical_subsystem_ids : m.component_class_id ? [get(m.component_class_id)?.subsystem_id].filter(Boolean) : [];
  const supplyIn = inn(m.company_id, ["supplies", "distributes"]).concat(out(m.company_id, "integrates"));
  const T = [["overview", "Overview"], ["specs", "Technical specifications", m.specs.length], ["process", "Process & technology"], ["applications", "Applications & materials"], ["subsystems", "Subsystems & components"],
    ["alternatives", "Alternatives", alts.length], ["customers", "Fab / OSAT use", cust.length], ["relationships", "Relationships"], ["sources", "Sources", m.source_ids.length], ["history", "History"]];
  const titleLevel = m.batch && m.batch !== "Batch 1";
  const NP = titleLevel ? "Not captured — source page not read" : "Not published";
  const head = `<div class="ehead"><div class="eyebrow">${esc(m.id)} · ${esc(m.segment)} · ${esc(m.equipment_code)}</div>
    <div class="kv" style="margin-top:0"><dl><dt>Manufacturer</dt><dd>${link(m.company_id)}</dd></dl><dl><dt>Product family</dt><dd>${link(m.family_id)}</dd></dl><dl><dt>Model</dt><dd>${m.model_number ? `<span class="mono">${esc(m.model_number)}</span>` : `<span class="na">No model number published (family-level record)</span>`}</dd></dl></div>
    <h1 class="pt" style="margin-top:8px">${esc(m.name)}</h1>
    <div class="row" style="margin-top:8px"><span class="pill">Lifecycle: ${esc(m.lifecycle.status)}</span>${m.lifecycle.maturity ? `<span class="pill">${esc(m.lifecycle.maturity)}</span>` : ""}${stateBadges(m)} ${conf(m.confidence.level)} ${srcBtn(m.source_ids)}</div>
    ${quickActions(m.id, { compare: "model", extra: [`<a class="btn sm" href="${href("/products", { eq: m.equipment_id })}">Related equipment</a>`, m.process_ids[0] ? `<a class="btn sm" href="${hrefOf(m.process_ids[0])}">View process</a>` : "", `<a class="btn sm" href="${href("/suppliers", { eq: m.equipment_id })}">View suppliers</a>`, `<a class="btn sm" href="${hrefOf(m.company_id)}">View company</a>`].filter(Boolean) })}</div>`;
  const spec = [
    ["Equipment category", eq ? `${link(eq.id)} <span class="mono xs muted">${esc(eq.code)}</span>` : esc(m.equipment_label)],
    ["Technology (as stated)", val(m.technology_text)], ["Wafer / substrate", m.wafer ? `${esc(waferText(m.wafer) || "—")}` : val(null, { reason: titleLevel ? NP : "Not published by the manufacturer in Batch-1 sources" }), m.wafer ? `Source wording: “${esc(m.wafer.source_value)}” · normalised to mm` : ""],
    ["Thickness / format", val(m.thickness, { reason: NP })], ["Throughput", val(m.throughput, { reason: NP })], ["Accuracy", val(m.accuracy, { reason: NP })],
    ["Motion", val(m.motion, { reason: NP })], ["Footprint", val(m.footprint, { reason: NP })], ["Price (public)", val(m.price_public, { reason: "Not publicly disclosed" })],
  ];
  const laser = m.laser ? [["Laser type", val(m.laser.types_text)], ["Laser source", val(m.laser.source, { reason: "Not stated" })], ["Wavelength", val(m.laser.wavelength, { reason: NP })], ["Average power", val(m.laser.average_power, { reason: NP })],
    ["Pulse duration", val(m.laser.pulse_duration, { reason: NP })], ["Pulse energy", val(m.laser.pulse_energy, { reason: NP })], ["Repetition rate", val(m.laser.repetition_rate, { reason: NP })],
    ["Scan / process speed", val(m.laser.scan_speed, { reason: NP })], ["Material", val(m.laser.material, { reason: "Not stated" })]] : null;
  let body = "";
  if (tab === "overview") {
    body = `${conflictsFor(m.id)}${titleLevel ? `<div class="callout"><b>${esc(m.batch)} record — title-level evidence.</b> The maker, product name and category come from the title of the manufacturer's own page, press release, brochure or filing (linked below), located by web search. The page itself was not read, so specifications are not captured yet.${/search-result summary/.test(m.notes || "") ? " The model name was taken from the search-result summary of that page, not its title." : ""}</div>` : ""}${m.reclassified ? `<div class="callout"><b>Category updated in 2.0:</b> moved from ${esc(m.reclassified.from_code)} to ${esc(m.reclassified.to_code)}. ${esc(m.reclassified.reason)}.</div>` : ""}<div class="grid g2"><div class="panel"><h2>Overview</h2>${specTable([["Manufacturer", `${link(m.company_id)} <span class="muted xs">${esc(c?.hq.country || "")}</span>`], ["Product family", link(m.family_id)],
      ["Equipment category", eq ? link(eq.id) : esc(m.equipment_label)], ["Segment", esc(m.segment)], ["Application", val(m.application_text)], ["Lifecycle", `${esc(m.lifecycle.status)}${m.lifecycle.maturity_evidence ? `<span class="sub">${esc(m.lifecycle.maturity_evidence)}</span>` : ""}`],
      ["Notes", val(m.notes, { reason: "—" })]])}</div>
      <div class="panel"><h2>Key specifications</h2>${specTable(spec.slice(1, 6))}<p class="note"><a href="${base}?tab=specs">All technical specifications →</a></p></div></div>
      <div class="grid g3 sec"><div class="panel"><h2>Processes</h2>${tags(m.process_ids, { empty: "Not mapped" })}</div><div class="panel"><h2>Technologies</h2>${tags(m.technology_ids, { empty: "Not mapped" })}</div>
      <div class="panel"><h2>India availability</h2>${c?.hq.country === "India" ? "<p class='small'>Manufacturer headquartered in India.</p>" : c?.india.has_presence ? `<p class="small">Manufacturer India presence: ${esc(c.india.summary)}.</p>` : `<p class="na">No India presence documented for the manufacturer.</p>`}<p class="note">Model-level India availability and service are not documented in Batch 1.</p></div></div>`;
  } else if (tab === "specs") {
    body = `<div class="grid g2"><div class="panel"><h2>General</h2>${specTable(spec, { caption: "General specifications" })}</div>${laser ? `<div class="panel"><h2>Laser parameters</h2>${specTable(laser, { caption: "Laser parameters" })}</div>` : ""}</div>
      <div class="panel sec"><div class="row sp"><h2>Stated specifications</h2>${basis("claim")}</div>${m.specs.length ? `<table class="spec"><thead><tr><th>Parameter</th><th>Value</th><th>Source wording</th><th>Evidence</th></tr></thead><tbody>${m.specs.map(s => `<tr><th>${esc(s.parameter)}</th><td><b>${esc(s.value)}</b> ${esc(s.unit || "")}</td><td class="mono xs">${esc(s.source_value)}</td><td>${badge(s.verification)} ${srcBtn(s.source_ids)}<span class="sub">${esc(s.source_scope)}</span></td></tr>`).join("")}</tbody></table>` : `<p class="na">No additional numeric specifications published in the captured sources.</p>`}</div>
      <details class="panel sec"><summary><b>Fields in the 2.0 model schema not captured for this record (${NOT_CAPTURED.length})</b></summary><p class="small ink2">${esc(NOT_CAPTURED.join(" · "))}</p><p class="note">Shown as missing rather than estimated. Add them with a source through the import pipeline (see CONTRIBUTING.md).</p></details>`;
  } else if (tab === "process") {
    body = `<div class="grid g2"><div class="panel"><h2>Processes</h2>${m.process_ids.length ? m.process_ids.map(p => { const P = get(p); return `<div style="margin-bottom:10px">${link(p)} <span class="muted xs">${esc(P.stage_name)}</span><div class="small ink2">${esc(P.description)}</div></div>`; }).join("") : `<p class="na">Not mapped.</p>`}
      <p class="note">${basis("derived")} from the model's source-backed equipment category via the reference process library.</p></div>
      <div class="panel"><h2>Technologies</h2>${m.technology_ids.map(t => `<div style="margin-bottom:8px">${link(t)} ${m.technology_basis.from_laser_codes.includes(t) ? basis("source") : basis("derived")}<div class="small ink2">${esc(get(t).description)}</div></div>`).join("") || `<p class="na">Not mapped.</p>`}
      <p class="note">Technology as stated by the source: ${val(m.technology_text)}</p></div></div>`;
  } else if (tab === "applications") {
    body = `<div class="grid g2"><div class="panel"><h2>Applications & devices</h2><p class="small">${val(m.application_text)}</p>${tags(m.application_ids, { empty: "No application class matched" })}<p class="note">${basis("derived")} Text match on the source-stated application.</p></div>
      <div class="panel"><h2>Supported materials & substrates</h2><p class="small">${val(m.material_text, { reason: "Material not stated" })}</p>${tags(m.material_ids, { empty: "No material stated" })}
      <h3 style="margin-top:12px">Compatible wafer</h3><p class="small">${m.wafer ? `${esc(waferText(m.wafer) || "")} <span class="muted">(“${esc(m.wafer.source_value)}”)</span>` : `<span class="na">Not published</span>`}</p></div></div>`;
  } else if (tab === "subsystems") {
    body = `<div class="callout">Subsystems below are the <b>generic architecture</b> of this equipment category (editorial reference). They are not a teardown of this specific model. Supplier names are companies with a source-documented capability for that component class — not proof they supply this model.</div>
      ${supplyIn.length ? `<div class="panel" style="margin-bottom:12px"><h2>Documented supply links for ${esc(m.manufacturer)}</h2><table class="spec"><tbody>${supplyIn.map(r => `<tr><th>${badge(r.status)}</th><td>${link(r.from)} → ${link(r.to)}<span class="sub">${esc([r.detail?.component, r.detail?.evidence].filter(Boolean).join(" · "))}</span></td><td>${srcBtn(r.source_ids)}</td></tr>`).join("")}</tbody></table></div>` : ""}
      <div class="cards">${subs.map(get).filter(Boolean).map(s => { const comps = s.component_ids.map(get); const sup = uniq(comps.flatMap(x => x.capable_supplier_ids));
        return `<article class="card"><div class="top"><a class="ttl" href="${hrefOf(s.id)}">${esc(s.name)}</a><span class="code">${esc(s.id)}</span></div><div class="small ink2">${esc(s.architecture)}</div>
        <dl><dt>Components</dt><dd>${comps.length}</dd><dt>Suppliers</dt><dd>${sup.length ? `${sup.length} with documented capability` : "None captured"}</dd></dl></article>`; }).join("") || empty({ title: "No subsystem reference for this category." })}</div>`;
  } else if (tab === "alternatives") {
    const cls = classifyAlternatives(m, alts);
    body = `<div class="callout">“What can replace this?” — records classified by rule: <b>direct substitute (candidate)</b> = same category, overlapping published wafer size and technology; <b>partial substitute</b> = same category but a key value is unpublished or differs; <b>different technology</b> = same process step through another equipment category; <b>development-stage</b> = lifecycle marked development / prototype. A substitute still needs process qualification; this is not a claim of equivalence.</div>
      ${cls.length ? `<div style="overflow-x:auto"><table class="spec"><thead><tr><th>Alternative</th><th>Class</th><th>Matches</th><th>Not published / differs</th></tr></thead><tbody>${cls.map(r => `<tr><th>${link(r.x.id)}<span class="sub">${esc(r.x.manufacturer)} · ${esc(get(r.x.company_id)?.hq.country || "")}</span></th><td><span class="pill">${esc(r.cls)}</span></td><td>${esc(r.ok.join("; ") || "—")}</td><td>${r.no.length ? `<span class="na">${esc(r.no.join("; "))}</span>` : "—"}</td></tr>`).join("")}</tbody></table></div>
        <p class="sec"><a class="btn primary" href="${href("/compare", { models: [m.id, ...cls.slice(0, 5).map(r => r.x.id)] })}">Compare side by side</a></p>` : empty({ title: "No alternative record yet.", kind: "not-available" })}`;
  } else if (tab === "customers") {
    body = `<div class="panel"><h2>Documented fab / OSAT use of this model</h2>${cust.length ? `<table class="spec"><tbody>${cust.map(r => `<tr><th>${link(r.to, r.detail.customer)}</th><td>${esc([r.detail.stage, r.detail.site, r.detail.location, r.detail.application].filter(Boolean).join(" · "))}<span class="sub">${esc(r.detail.evidence || "")}</span></td><td>${badge(r.status)} ${srcBtn(r.source_ids)}</td></tr>`).join("")}</tbody></table>` : `<p class="na">No customer documented for this specific model.</p>`}</div>
      ${coCust.length ? `<div class="panel sec"><h2>Other customer links of ${esc(m.manufacturer)}</h2><table class="spec"><tbody>${coCust.slice(0, 20).map(r => `<tr><th>${link(r.to, r.detail.customer)}</th><td>${esc(r.detail.product || "Product not named")}<span class="sub">${esc(r.detail.stage || "")}</span></td><td>${badge(r.status)}</td></tr>`).join("")}</tbody></table></div>` : ""}`;
  } else if (tab === "relationships") body = relationsSection(m.id);
  else if (tab === "sources") body = sourcesSection(m.source_ids, cust.flatMap(r => r.source_ids));
  else if (tab === "history") body = historySection(m);
  const html = `${crumbs([["Home", "#/"], ["Equipment", "#/equipment"], ...(eq ? [[eq.group_name, hrefOf("EQP-" + eq.group_code)], [eq.name, hrefOf(eq.id)]] : []), [m.manufacturer, hrefOf(m.company_id)], [m.family_name, hrefOf(m.family_id)], [m.model_number || "Family record", null]])}${head}${tabs(base, tab, T)}${body}`;
  return { title: m.name, html };
}
export { fresh };

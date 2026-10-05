// Process flows, "What changed" and the research queue.
// Flows are editorial reference sequences (simplified: real flows repeat steps many times and differ by fab); every
// step links to the process record and the evidence behind it. "What changed" and the research queue are computed
// from batch metadata and record coverage — nothing is estimated.
import { DB, get, hrefOf } from "../core/store.js";
import { esc, uniq, countBy, sortedEntries } from "../core/util.js";
import { href } from "../core/router.js";
import { pageHead, link, tags, kpi, bars, badge } from "../ui/components.js";
import { dataTable } from "../ui/table.js";
import { categoryRisk } from "./risk.js";
import { intelScore, criticality } from "../core/scores.js";
import { STATUS_LABEL } from "./facilities.js";

const head = (t, lede) => pageHead({ eyebrow: "Intelligence", title: t, lede, crumb: [["Home", "#/"], ["Intelligence", "#/intelligence"], [t, null]] });
const P = slug => DB.processes.find(p => p.slug === slug);

// ----------------------------------------------------------------- process flows (editorial reference)
export const FLOWS = [
  ["si-wafer", "Silicon wafer manufacturing", ["crystal-growth", "ingot-shaping", "wafer-slicing", "lapping", "wafer-grinding", "wafer-polishing", "wafer-cleaning-bare", "bare-wafer-inspection"]],
  ["logic", "Logic CMOS (FEOL + BEOL, one loop shown)", ["wafer-clean", "oxidation", "resist-coat", "lithography", "develop", "etch", "ash-strip", "ion-implant", "anneal", "deposition", "cmp", "pvd", "metallization", "metrology", "inspection", "wafer-test"]],
  ["dram", "DRAM", ["wafer-clean", "oxidation", "lithography", "etch", "ion-implant", "anneal", "cvd", "ald", "cmp", "metallization", "inspection", "wafer-test", "wafer-thinning", "dicing", "die-attach", "wire-bond", "molding", "burn-in", "final-test"]],
  ["nand", "3D NAND", ["deposition", "lithography", "etch", "ald", "cvd", "cmp", "metallization", "metrology", "inspection", "wafer-test", "wafer-thinning", "dicing", "die-attach", "wire-bond", "molding", "final-test"]],
  ["sic", "SiC power device", ["crystal-growth", "wafer-slicing", "lapping", "wafer-polishing", "epitaxy", "lithography", "etch", "ion-implant", "anneal", "oxidation", "deposition", "metallization", "wafer-test", "wafer-thinning", "dicing", "die-attach", "wire-bond", "molding", "final-test", "burn-in"]],
  ["gan", "GaN power / RF device", ["epitaxy", "lithography", "etch", "deposition", "metallization", "anneal", "wafer-test", "wafer-thinning", "dicing", "die-attach", "final-test"]],
  ["mems", "MEMS", ["wafer-clean", "oxidation", "deposition", "lithography", "etch", "temp-bond-debond", "hybrid-bond", "dicing", "wire-bond", "final-test"]],
  ["cis", "CMOS image sensor (stacked, BSI)", ["wafer-clean", "lithography", "etch", "ion-implant", "anneal", "deposition", "cmp", "hybrid-bond", "wafer-thinning", "metallization", "wafer-test", "dicing", "final-test"]],
  ["rf", "RF compound semiconductor (GaAs)", ["epitaxy", "lithography", "etch", "metallization", "deposition", "wafer-thinning", "wafer-test", "dicing", "die-attach", "final-test"]],
  ["hbm", "Advanced packaging — HBM / 3D stacking", ["tsv", "wafer-thinning", "temp-bond-debond", "rdl", "3d-stacking", "hybrid-bond", "molding", "interposer-25d", "flip-chip", "final-test"]],
  ["fanout", "Advanced packaging — fan-out / WLP", ["wlp", "rdl", "fan-out", "molding", "wafer-thinning", "singulation", "package-inspection", "final-test"]],
  ["backend", "Conventional back-end", ["wafer-test", "wafer-thinning", "wafer-mount", "dicing", "die-attach", "wire-bond", "molding", "marking", "singulation", "package-inspection", "final-test", "burn-in"]],
];
function stepStats(p) {
  const risk = categoryRisk();
  const eqs = p.equipment_ids.map(get).filter(Boolean);
  const r = risk.filter(x => p.equipment_ids.includes(x.id) && x.n);
  const cos = p.company_ids.map(get).filter(Boolean);
  return { eqs, cos, models: p.model_ids.length, india: cos.filter(c => c.hq.country === "India" || c.india.has_presence), maxRisk: r.sort((a, b) => b.score - a.score)[0] || null };
}
function flows({ params }) {
  const fid = params.get("flow") || "logic";
  const flow = FLOWS.find(f => f[0] === fid) || FLOWS[1];
  const steps = flow[2].map(P).filter(Boolean);
  const sel = get(params.get("step")) || steps[0];
  const st = stepStats(sel);
  const chain = steps.map((p, i) => { const s = stepStats(p);
    return `<a class="tag${p.id === sel.id ? " on" : ""}" href="${href("/intelligence/flows", { flow: fid, step: p.id })}" title="${esc(p.description || "")}"${p.id === sel.id ? ' aria-current="step"' : ""}><span class="k">${i + 1}</span> ${esc(p.name)} <span class="k">${s.cos.length} co</span></a>${i < steps.length - 1 ? `<span class="muted" aria-hidden="true">→</span>` : ""}`; }).join("");
  const html = head("Process flows", "Reference manufacturing flows for logic, memory, power, compound, MEMS, image-sensor and advanced-packaging devices. Click a step to see the equipment categories, documented suppliers, models, India-linked suppliers and supplier concentration behind it.")
    + `<div class="row" style="flex-wrap:wrap;gap:6px">${FLOWS.map(f => `<a class="btn sm${f[0] === fid ? " primary" : ""}" href="${href("/intelligence/flows", { flow: f[0] })}">${esc(f[1])}</a>`).join("")}</div>
    <div class="panel sec"><h2>${esc(flow[1])}</h2><div class="row" style="flex-wrap:wrap;gap:6px;align-items:center">${chain}</div>
      <p class="note">Editorial reference flow, simplified for navigation: real process flows repeat deposition–lithography–etch loops dozens of times and vary by fab and node. The sequence is a reading aid, not a claim about any specific fab.</p></div>
    <div class="panel sec"><div class="row sp"><h2>${link(sel.id)}</h2><span class="pill">${esc(sel.stage_name || sel.stage)}</span></div>
      <p class="small">${esc(sel.description || "")} ${sel.purpose ? `<b>Purpose:</b> ${esc(sel.purpose)}` : ""}</p>
      <div class="kpis">${kpi({ v: st.eqs.length, l: "Equipment categories" })}${kpi({ v: st.cos.length, l: "Documented suppliers" })}${kpi({ v: st.models, l: "Models" })}${kpi({ v: st.india.length, l: "India-linked suppliers" })}${kpi({ v: st.maxRisk ? st.maxRisk.score : "—", l: "Highest concentration index", s: st.maxRisk ? `${st.maxRisk.e.name} · ${st.maxRisk.band}` : "no supplier data" })}</div>
      <div class="grid g2 sec"><div><h3>Equipment required</h3>${tags(sel.equipment_ids, { empty: "No equipment mapped" })}</div><div><h3>Materials & inputs</h3>${tags(sel.material_ids || [], { empty: "None mapped" })}<p class="small">${esc((sel.inputs || []).join(" · "))}</p></div>
        <div><h3>Suppliers</h3>${tags(st.cos.map(c => c.id), { max: 24, empty: "No supplier documented" })}</div><div><h3>Critical parameters & quality metrics</h3><p class="small">${esc([...(sel.typical_parameters || []), ...(sel.quality_metrics || [])].join(" · ") || "Not recorded")}</p></div></div>
      <p class="note">Parameters and metrics are generic reference content for the process type. Supplier and model counts are evidence records. <a href="${hrefOf(sel.id)}">Open the process record →</a></p></div>`;
  return { title: "Process flows", html };
}

// ----------------------------------------------------------------- what changed (temporal view by batch)
function changes() {
  const bn = b => +/\d+/.exec(b)?.[0] || 0;
  const B = DB.meta.batches.filter(b => /^Batch \d+/.test(b.batch)).sort((a, b) => bn(a.batch) - bn(b.batch));
  const recent = [...DB.companies.map(c => ({ id: c.id, kind: "Company", date: c.dates?.first_added, batch: c.batch, name: c.name, sub: c.company_type })),
    ...DB.models.map(m => ({ id: m.id, kind: "Model", date: m.dates?.first_added, batch: m.batch, name: m.name, sub: m.manufacturer })),
    ...(DB.facilities || []).map(f => ({ id: f.id, kind: "Facility", date: f.dates?.first_added, batch: f.batch, name: f.name, sub: f.facility_type }))].filter(r => r.date);
  const latest = B[B.length - 1]?.date, after1 = recent.filter(r => r.batch && r.batch !== "Batch 1"), onLatest = recent.filter(r => r.date === latest);
  const fac = (DB.facilities || []).flatMap(f => f.status_history.map(h => ({ f, h }))).sort((a, b) => b.h.date.localeCompare(a.h.date)).slice(0, 12);
  const html = head("What changed", "New records by batch and recent facility milestones. Records are never overwritten silently: corrections are logged in the batch notes and conflicts stay visible in Data Quality.")
    + `<div class="kpis">${kpi({ v: B.length, l: "Batches" })}${kpi({ v: onLatest.length, l: "Records added on the latest batch date", s: latest || "" })}${kpi({ v: after1.filter(r => r.kind === "Company").length, l: "Companies added after Batch 1" })}${kpi({ v: after1.filter(r => r.kind === "Model").length, l: "Models added after Batch 1" })}${kpi({ v: (DB.facilities || []).length, l: "Facility records" })}${kpi({ v: DB.quality.conflicts.length, l: "Open conflicts", href: "#/quality" })}</div>
    <div class="grid g2 sec"><div class="panel"><h2>Batches</h2><table class="spec"><thead><tr><th>Batch</th><th>Date</th><th>Companies</th><th>Models</th><th>Facilities</th><th>Sources</th></tr></thead><tbody>${B.slice().reverse().map(b => `<tr><th>${esc(b.batch)}<span class="sub">${esc((b.note || "").slice(0, 140))}</span></th><td>${esc(b.date)}</td><td>${b.companies}</td><td>${b.products}</td><td>${b.facilities || 0}</td><td>${b.sources}</td></tr>`).join("")}</tbody></table></div>
      <div class="panel"><h2>Latest facility milestones</h2><table class="spec"><tbody>${fac.map(({ f, h }) => `<tr><th>${esc(h.date)}</th><td>${link(f.id)}<span class="sub">${esc(STATUS_LABEL[h.status] || h.status)}</span></td></tr>`).join("") || `<tr><td class="na">No facility milestones captured.</td></tr>`}</tbody></table></div></div>
    <section class="sec">${dataTable({ id: "changes", rows: recent.sort((a, b) => b.date.localeCompare(a.date) || a.kind.localeCompare(b.kind)), title: "Records by date added", exportName: "semicon-db-changes", columns: [
      { k: "date", label: "Added", pin: true, get: r => r.date }, { k: "batch", label: "Batch", get: r => r.batch }, { k: "kind", label: "Type", get: r => r.kind },
      { k: "name", label: "Record", wrap: true, get: r => r.name, html: r => `<a class="rowlink" href="${hrefOf(r.id)}">${esc(r.name)}</a><span class="sub">${esc(r.sub || "")}</span>` }] })}</section>`;
  return { title: "What changed", html };
}

// ----------------------------------------------------------------- research queue (ingestion waves)
const isType = re => c => re.test(c.company_type);
function research() {
  const C = DB.companies;
  const metro = c => c.equipment_ids.some(id => /^EQP-A(2[1-9]|3[01])/.test(id));
  const WAVES = [
    ["1", "Equipment OEMs", C.filter(isType(/Equipment OEM|Laser equipment OEM|Test & probe/))],
    ["2", "Materials, gases and chemical delivery", C.filter(isType(/Materials|Gas\/chemical/))],
    ["3", "Fabs (company and site level)", [...DB.fabs, ...(DB.facilities || []).filter(f => /fab/i.test(f.facility_type))]],
    ["4", "OSAT / ATMP", [...DB.osats, ...(DB.facilities || []).filter(f => /OSAT|ATMP|packaging/i.test(f.facility_type))]],
    ["5", "Metrology and inspection", C.filter(metro)],
    ["6", "Subsystem suppliers", C.filter(c => c.supplier_types.some(t => /Subsystem/i.test(t)))],
    ["7", "Component suppliers", C.filter(c => c.supplier_types.some(t => /Component/i.test(t)))],
    ["8", "Startups", C.filter(c => c.is_startup)],
    ["9", "India ecosystem", [...C.filter(c => c.hq.country === "India" || c.india.has_presence), ...(DB.facilities || []).filter(f => f.country === "India")]],
    ["10", "Long tail (search-level evidence only)", C.filter(c => ["TITLE", "SEARCH_SUMMARY", "TIER4"].includes(c.evidence_depth))],
  ].map(([n, l, rows]) => { const cos = rows.filter(r => r.entity_type === "company");
    return { n, l, count: rows.length, ver: cos.length ? Math.round(100 * cos.filter(c => c.verification === "VERIFIED").length / cos.length) : null, comp: cos.length ? Math.round(cos.reduce((a, c) => a + (c.completeness?.score || 0), 0) / cos.length) : null }; });
  // queue: important records with thin evidence first (criticality / intelligence high, completeness low)
  const queue = C.map(c => ({ c, crit: criticality(c.id).score, comp: c.completeness?.score || 0, miss: (c.completeness?.groups || []).flatMap(g => g.missing) }))
    .map(r => ({ ...r, pri: Math.round(0.6 * r.crit + 0.4 * (100 - r.comp)) })).sort((a, b) => b.pri - a.pri).slice(0, 60);
  const gaps = categoryRisk().filter(r => !r.n && !(get(r.id).see_also || []).length);
  const staleFac = (DB.facilities || []).filter(f => f.status_date && (Date.now() - new Date(f.status_date).getTime()) / 864e5 > 180);
  const html = head("Research queue", "What to research next, organised by ingestion wave: coverage per wave, important records with thin evidence, uncovered equipment categories and facilities whose latest milestone is more than six months old.")
    + `<div class="panel"><h2>Ingestion waves</h2><table class="spec"><thead><tr><th>Wave</th><th>Records</th><th>Verified</th><th>Avg completeness</th></tr></thead><tbody>${WAVES.map(w => `<tr><th>${esc(w.n)} · ${esc(w.l)}</th><td>${w.count}</td><td>${w.ver != null ? w.ver + "%" : "—"}</td><td>${w.comp != null ? w.comp + "%" : "—"}</td></tr>`).join("")}</tbody></table>
      <p class="note">Waves overlap (a company can sit in several). Each wave follows the same pipeline: discover → extract → normalise → verify → score → store → connect, through <code>scripts/import.mjs</code> and <code>scripts/build-data.mjs</code>.</p></div>
    <section class="sec">${dataTable({ id: "rq", rows: queue, title: "Priority records (important × thin evidence)", exportName: "semicon-db-research-queue", columns: [
      { k: "c", label: "Company", pin: true, get: r => r.c.name, html: r => `<a class="rowlink" href="${hrefOf(r.c.id)}">${esc(r.c.name)}</a><span class="sub">${esc(r.c.company_type)} · ${esc(r.c.hq.country || "")}</span>` },
      { k: "pri", label: "Priority", num: true, get: r => r.pri }, { k: "crit", label: "Criticality", num: true, get: r => r.crit }, { k: "comp", label: "Completeness %", num: true, get: r => r.comp },
      { k: "miss", label: "Missing", wrap: true, get: r => r.miss.join("; "), html: r => `<span class="na">${esc(r.miss.slice(0, 6).join(", "))}${r.miss.length > 6 ? " …" : ""}</span>` },
      { k: "q", label: "Suggested search", wrap: true, get: r => `"${r.c.canonical_name || r.c.name}" ${r.miss.includes("Revenue") ? "annual report revenue" : "products"}`, html: r => `<code>${esc(`"${r.c.canonical_name || r.c.name}" ${r.miss.some(m => /Revenue|Employees/.test(m)) ? "annual report" : r.miss.some(m => /Model|Product/.test(m)) ? "product datasheet" : "company overview"}`)}</code>` }] })}
      <p class="note">Priority = 60 % supplier criticality + 40 % missing completeness. Searches are suggestions for a researcher; nothing is fetched automatically.</p></section>
    <div class="grid g2 sec"><div class="panel"><h2>Uncovered equipment categories (${gaps.length})</h2>${tags(gaps.map(r => r.id), { max: 60, empty: "None" })}</div>
      <div class="panel"><h2>Facilities to re-check (${staleFac.length})</h2>${staleFac.length ? `<table class="spec"><tbody>${staleFac.map(f => `<tr><th>${link(f.id)}</th><td>${esc(STATUS_LABEL[f.status])} since ${esc(f.status_date)}</td></tr>`).join("")}</tbody></table>` : `<p class="na">None</p>`}<p class="note">Latest captured milestone older than 180 days: look for construction, pilot or production updates.</p></div></div>`;
  return { title: "Research queue", html };
}

export const RESEARCH_MODULES = [
  ["flows", "Process Flows", "Logic, DRAM, 3D NAND, SiC, GaN, MEMS, CIS, RF and advanced-packaging flows; click a step for equipment, suppliers, India-linked suppliers and concentration."],
  ["changes", "What Changed", "Records added per batch, newest first, and the latest facility milestones."],
  ["research", "Research Queue", "Coverage by ingestion wave, important records with thin evidence, uncovered categories and facilities to re-check."],
];
export const RESEARCH_SUB = { flows, changes, research };

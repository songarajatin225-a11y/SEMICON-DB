// Shared entity sections used by every detail page (relationships, sources, history, model tables).
import { DB, get, edges, hrefOf, nameOf, KIND_LABEL, kindOf } from "../core/store.js";
import { esc, uniq, pretty } from "../core/util.js";
import { ws } from "../core/workspace.js";
import { dataTable } from "../ui/table.js";
import { badge, conf, fresh, srcBtn, srcList, specTable, val, basis, link } from "../ui/components.js";
import { egoGraph, graphKinds, relTable, KIND_COLOR } from "../ui/graph.js";

export const verSort = r => ({ VERIFIED: 0, PARTIALLY_VERIFIED: 1, UNVERIFIED: 2 }[r.verification] ?? 3);
export const waferText = w => (!w ? null : w.sizes_mm?.length ? w.sizes_mm.map(x => x + " mm").join(", ") : w.range_mm ? `${w.range_mm.min ? w.range_mm.min + "–" : "up to "}${w.range_mm.max} mm` : null);

export function modelColumns({ company = true } = {}) {
  return [
    { k: "name", label: "Product · model", pin: true, get: r => r.name, html: r => `<a class="rowlink" href="${hrefOf(r.id)}">${esc(r.family_name)}</a><span class="sub mono">${r.model_number ? esc(r.model_number) : "Family-level record · no model number published"}</span>` },
    ...(company ? [{ k: "manufacturer", label: "Manufacturer", get: r => r.manufacturer, html: r => `${link(r.company_id, r.manufacturer)}<span class="sub">${esc(get(r.company_id)?.hq.country || "")}</span>` }] : []),
    { k: "equipment", label: "Equipment category", wrap: true, get: r => r.equipment_label, html: r => `${r.equipment_id ? link(r.equipment_id, r.equipment_label) : esc(r.equipment_label)}<span class="sub mono">${esc(r.equipment_code)}</span>` },
    { k: "segment", label: "Segment", get: r => r.segment },
    { k: "process", label: "Process", wrap: true, get: r => r.process_ids.map(nameOf).join("; "), html: r => r.process_ids.length ? r.process_ids.slice(0, 3).map(p => link(p)).join(", ") : val(null, { reason: "Not mapped" }) },
    { k: "technology", label: "Technology", wrap: true, get: r => r.technology_text, html: r => val(r.technology_text) },
    { k: "wafer", label: "Wafer / substrate", get: r => waferText(r.wafer) || "", sort: r => r.wafer?.sizes_mm?.[r.wafer.sizes_mm.length - 1] ?? r.wafer?.range_mm?.max ?? null, html: r => r.wafer ? `${esc(waferText(r.wafer) || "")}<span class="sub">“${esc(r.wafer.source_value)}”</span>` : val(null, { reason: "Not published" }) },
    { k: "materials", label: "Materials", wrap: true, get: r => r.material_ids.map(nameOf).join("; "), html: r => r.material_ids.length ? r.material_ids.map(m => link(m)).join(", ") : val(null, { reason: "Not stated" }) },
    { k: "throughput", label: "Throughput", wrap: true, get: r => r.throughput || "", html: r => val(r.throughput, { reason: "Not published" }) },
    { k: "accuracy", label: "Accuracy", wrap: true, get: r => r.accuracy || "", html: r => val(r.accuracy, { reason: "Not published" }) },
    { k: "wavelength", label: "Laser wavelength", get: r => r.laser?.wavelength || "", html: r => r.laser ? val(r.laser.wavelength, { reason: "Not published" }) : `<span class="muted">—</span>` },
    { k: "power", label: "Laser power", get: r => r.laser?.average_power || "", html: r => r.laser ? val(r.laser.average_power, { reason: "Not published" }) : `<span class="muted">—</span>` },
    { k: "application", label: "Application", wrap: true, get: r => r.application_text || "", html: r => val(r.application_text) },
    { k: "india", label: "India", get: r => (get(r.company_id)?.india.has_presence || get(r.company_id)?.hq.country === "India") ? "Yes" : "", html: r => { const c = get(r.company_id); return c?.hq.country === "India" ? "HQ in India" : c?.india.has_presence ? esc(c.india.summary) : `<span class="muted">Not documented</span>`; } },
    { k: "lifecycle", label: "Lifecycle", get: r => r.lifecycle.status, html: r => `<span class="pill">${esc(r.lifecycle.status)}</span><span class="sub">${esc(r.lifecycle.maturity || "")}</span>` },
    { k: "verification", label: "Evidence", get: r => r.verification, sort: verSort, html: r => `${badge(r.verification)}${["CONFLICTING", "OUTDATED"].includes(r.quality_state) ? " " + badge(r.quality_state) : ""}<span class="sub">${esc(pretty(r.confidence.level))} confidence</span>` },
    { k: "freshness", label: "Freshness", get: r => r.freshness, html: r => fresh(r.freshness) },
    { k: "sources", label: "Sources", nosort: false, get: r => r.source_ids.length, num: true, html: r => srcBtn(r.source_ids) },
  ];
}
export const MODEL_PRESETS = {
  basic: ["name", "manufacturer", "equipment", "process", "wafer", "india", "verification", "sources"],
  technical: ["name", "manufacturer", "technology", "wafer", "materials", "throughput", "accuracy", "wavelength", "power", "sources"],
  commercial: ["name", "manufacturer", "segment", "application", "lifecycle", "india", "sources"],
  "supply-chain": ["name", "manufacturer", "equipment", "segment", "materials", "india", "sources"],
  source: ["name", "manufacturer", "verification", "freshness", "sources"],
};
export function modelTable(id, rows, opts = {}) {
  return dataTable({ id, rows, columns: modelColumns(opts), presets: MODEL_PRESETS, defaultPreset: opts.preset || "basic", compareKind: "model", title: opts.title || "Products & models", exportName: id, note: opts.note,
    empty: opts.empty, sort: opts.sort });
}

export function relationsSection(id, { depth = 1, hidden = new Set(), withGraph = true } = {}) {
  const rels = edges(id);
  if (!rels.length) return `<div class="empty"><b>No relationships recorded for this record yet.</b></div>`;
  const kinds = graphKinds(id);
  const g = withGraph ? egoGraph(id, { depth, hidden }) : null;
  const rows = relTable(id, rels);
  return `${g ? `<div class="graphbox">${g.svg}</div>
    <div class="row small" style="margin:8px 0 14px">${kinds.map(k => `<span class="nowrap"><i style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${KIND_COLOR[k] || "var(--s4)"};vertical-align:-1px"></i> ${esc(KIND_LABEL[k] || k)}</span>`).join(" ")}
    <span class="muted">· solid = source-backed · dashed = derived · dotted = editorial reference</span>${g.more.length ? `<span class="muted">· not drawn: ${g.more.map(m => `${m.n} more ${esc((KIND_LABEL[m.kind] || m.kind).toLowerCase())}`).join(", ")}</span>` : ""}
    <a class="btn sm" href="#/graph/${encodeURIComponent(id)}?depth=2">Expand to 2 levels</a></div>` : ""}
    ${dataTable({ id: "rel-" + id, rows, title: "All relationships", exportName: "relationships-" + id, rowId: r => r.id,
      columns: [
        { k: "type", label: "Relationship", get: r => r.type, html: r => `<b>${esc(r.type)}</b> <span class="muted">${r.dir}</span>` },
        { k: "other", label: "Related record", wrap: true, get: r => nameOf(r.other), html: r => `<a href="${r.href}">${esc(nameOf(r.other))}</a><span class="sub">${esc(r.kind)}</span>` },
        { k: "basis", label: "Basis", get: r => r.basis, html: r => basis(r.basis) },
        { k: "status", label: "Status", get: r => r.status, html: r => (r.status ? badge(r.status) : `<span class="muted">—</span>`) + (r.confidence ? `<span class="sub">${esc(pretty(r.confidence))}</span>` : "") },
        { k: "detail", label: "Evidence / detail", wrap: true, get: r => r.detail ? Object.values(r.detail).filter(Boolean).join(" · ") : "", html: r => r.detail ? esc(Object.entries(r.detail).filter(([k, v]) => v && !/_id$/.test(k)).map(([k, v]) => `${pretty(k)}: ${v}`).join(" · ")) : `<span class="muted">—</span>` },
        { k: "sources", label: "Sources", get: r => r.source_ids.length, num: true, html: r => r.source_ids.length ? srcBtn(r.source_ids) : `<span class="muted xs">${r.basis === "source" ? "—" : "n/a"}</span>` },
      ] })}`;
}

export function sourcesSection(ids, related = []) {
  const own = uniq(ids);
  const rel = uniq(related).filter(x => !own.includes(x));
  return `<div class="grid g2"><div class="panel"><h2>Record sources (${own.length})</h2>${srcList(own)}</div>
    <div class="panel"><h2>Sources behind linked records (${rel.length})</h2>${rel.length ? srcList(rel.slice(0, 40)) + (rel.length > 40 ? `<p class="note">+${rel.length - 40} more</p>` : "") : `<p class="na">None.</p>`}</div></div>`;
}

export function historySection(r) {
  const d = r.dates || {};
  return `<div class="panel"><h2>Record history</h2>${specTable([
    ["Record id", `<span class="mono">${esc(r.id)}</span>${r.legacy_id ? ` <span class="muted xs">(Batch-1 id ${esc(r.legacy_id)} — old links keep working)</span>` : ""}`],
    ["First added", val(d.first_added)], ["Last updated", val(d.last_updated)], ["Last verified", val(d.last_verified, { reason: "Not verified" })],
    ["Newest source publication", val(d.latest_source_date, { reason: "Sources undated" })], ["Review due", val(d.review_due)],
    ["Freshness", r.freshness ? fresh(r.freshness) : val(null)], ["Quality state", r.quality_state ? badge(r.quality_state) : val(null)],
  ])}<h3 style="margin-top:14px">Change log</h3><ul class="list"><li><b>${esc(DB.meta.evidence_as_of)}</b> · Captured in Batch 1 (legacy atlas).</li><li><b>${esc(DB.meta.built)}</b> · Migrated to schema ${esc(DB.meta.schema_version)}: stable id assigned, fields normalised (original wording kept as source values), relationships derived.</li></ul></div>`;
}

export function conflictsFor(id) {
  const cs = DB.quality.conflicts.filter(c => c.entity === id || (c.also || []).includes(id));
  if (!cs.length) return "";
  return cs.map(c => `<div class="callout crit"><b>⚠ Conflicting source data — ${esc(c.field)}</b> <span class="pill">${esc(c.status)}</span>
    <table class="spec" style="margin-top:6px"><tbody>${c.claims.map(k => `<tr><th>${k.source_id ? `<button class="srcbtn" data-sources="${esc(k.source_id)}">↗ ${esc(k.source_id)}</button>` : "Unnumbered report"}</th><td>${esc(k.value)}</td></tr>`).join("")}</tbody></table>
    <div class="xs" style="margin-top:4px">${esc(c.note || "")} Not silently resolved — both claims are kept.</div></div>`).join("");
}
export { ws };

// ---------------------------------------------------------------- claim-level evidence ("show me the evidence")
// Placeholder rendered synchronously; fillClaims() (called after every render) fetches data/claims.json once and fills it.
export const CLAIM_TYPE_LABEL = { DIRECTLY_STATED: "Directly stated", DIRECTLY_SPECIFIED: "Published specification", CALCULATED: "Calculated", ANALYST_ESTIMATE: "Analyst estimate", INFERRED: "Inference / analyst assessment", UNVERIFIED: "Unverified" };
export const claimsMount = id => `<div class="panel sec" data-claims-for="${esc(id)}"><h2>Evidence by claim</h2><p class="small muted">Loading claim-level evidence…</p></div>`;
export async function fillClaims(root) {
  const mounts = [...root.querySelectorAll("[data-claims-for]")]; if (!mounts.length) return;
  const { loadClaims } = await import("../core/store.js");
  let map; try { map = await loadClaims(); } catch { mounts.forEach(m => (m.innerHTML = `<h2>Evidence by claim</h2><p class="na">Claim file could not be loaded.</p>`)); return; }
  mounts.forEach(m => {
    const cs = map.get(m.dataset.claimsFor) || [];
    const show = v => (typeof v === "string" && /^[A-Z]{2,5}-[\w.]+$/.test(v) && get(v) ? link(v) : esc(String(v)));
    m.innerHTML = `<div class="row sp"><h2>Evidence by claim (${cs.length})</h2><span class="small muted">value → evidence type → source → date → confidence</span></div>
      ${cs.length ? `<div style="overflow-x:auto"><table class="spec"><thead><tr><th>Claim</th><th>Value</th><th>Evidence type</th><th>Source</th><th>Valid from / verified</th><th>Confidence</th></tr></thead><tbody>${cs.map(c => `<tr${c.status === "CONFLICTED" ? ' class="warnrow"' : ""}>
        <th>${esc(c.predicate.replace(/_/g, " ").replace(/^status:/, "status · ").replace(/^spec:/, "spec · "))}<span class="sub mono">${esc(c.claim_id)}</span></th>
        <td>${show(c.value)}${c.unit ? ` <span class="muted">${esc(c.unit)}</span>` : ""}${c.formula ? `<span class="sub">Formula: ${esc(c.formula)}</span>` : ""}</td>
        <td>${esc(CLAIM_TYPE_LABEL[c.claim_type] || c.claim_type)}${c.evidence_depth ? `<span class="sub">${esc(String(c.evidence_depth).replace(/_/g, " ").toLowerCase())}</span>` : ""}${c.status === "CONFLICTED" ? ` <span class="pill warn">conflict</span>` : ""}</td>
        <td>${c.source_ids.length ? srcBtn(c.source_ids) : `<span class="na">No source — ${c.claim_type === "INFERRED" ? "analyst inference" : "unverified"}</span>`}</td>
        <td>${esc(c.valid_from || "")}<span class="sub">${esc(c.last_verified || "")}</span></td><td>${esc(c.confidence || "—")}</td></tr>`).join("")}</tbody></table></div>`
        : `<p class="na">No claims recorded for this record.</p>`}
      <p class="note">Each row is one claim with its own provenance. “Directly stated” claims located by web search carry the evidence depth “title” or “search summary”: the source was found but not read in full.</p>`;
  });
}

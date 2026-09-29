// Data Quality centre: verification states, freshness, missing fields, duplicates, conflicts,
// validation results, relationship basis, source hygiene, Batch-1 QC log and methodology.
import { DB, get, hrefOf, nameOf } from "../core/store.js";
import { esc, countBy, sortedEntries, pretty, uniq } from "../core/util.js";
import { pageHead, kpi, bars, stackBar, PALETTE, badge, fresh, link, srcBtn, tabs, basis, empty } from "../ui/components.js";
import { dataTable } from "../ui/table.js";

export function quality({ params }) {
  const tab = params.get("tab") || "overview";
  const recs = [...DB.companies, ...DB.models];
  const V = countBy(recs, r => r.verification), QS = countBy(recs, r => r.quality_state), F = countBy(recs, r => r.freshness);
  const missingSrc = recs.filter(r => !r.source_ids.length);
  const missingKey = recs.filter(r => r.missing_key_fields.length);
  const undatedSrc = DB.sources.filter(s => !s.publication_date);
  const review = recs.filter(r => r.verification !== "VERIFIED" || ["CONFLICTING", "OUTDATED"].includes(r.quality_state));
  const val = DB.quality.validation;
  const totalRecords = Object.entries(DB.meta.counts).filter(([k]) => !["relationships", "suppliers"].includes(k)).reduce((a, [, v]) => a + v, 0);
  const T = [["overview", "Overview"], ["review", "Review queue", review.length], ["missing", "Missing fields", missingKey.length], ["conflicts", "Conflicts", DB.quality.conflicts.length], ["duplicates", "Duplicate candidates", DB.quality.duplicate_candidates.length],
    ["validation", "Validation", val.errors.length + val.warnings.length], ["relationships", "Relationships"], ["sources", "Source hygiene"], ["qc", "Batch-1 QC log"], ["methodology", "Methodology"]];
  let body = "";
  if (tab === "overview") {
    body = `<div class="kpis">${kpi({ v: totalRecords, l: "Total records", s: `${DB.relationships.length.toLocaleString()} relationships` })}${kpi({ v: V.get("VERIFIED") || 0, l: "Verified", s: "companies + models" })}${kpi({ v: V.get("PARTIALLY_VERIFIED") || 0, l: "Partially verified" })}
      ${kpi({ v: V.get("UNVERIFIED") || 0, l: "Unverified" })}${kpi({ v: QS.get("CONFLICTING") || 0, l: "Conflicting", href: "#/quality?tab=conflicts" })}${kpi({ v: QS.get("OUTDATED") || 0, l: "Outdated (stale sources)" })}
      ${kpi({ v: missingKey.length, l: "Missing key fields", href: "#/quality?tab=missing" })}${kpi({ v: DB.quality.duplicate_candidates.length, l: "Duplicate candidates", href: "#/quality?tab=duplicates" })}${kpi({ v: missingSrc.length, l: "Records missing sources" })}
      ${kpi({ v: undatedSrc.length, l: "Sources missing evidence dates", href: "#/quality?tab=sources" })}${kpi({ v: review.length, l: "Records requiring review", href: "#/quality?tab=review" })}${kpi({ v: val.errors.length, l: "Validation errors", s: `${val.warnings.length} warnings`, href: "#/quality?tab=validation" })}</div>
    <div class="grid g3 sec"><div class="panel"><h2>Quality state</h2>${stackBar("Companies + models", ["VERIFIED", "PARTIALLY_VERIFIED", "UNVERIFIED", "CONFLICTING", "OUTDATED"].map((s, i) => ({ l: pretty(s), v: QS.get(s) || 0, c: [PALETTE[0], PALETTE[2], "var(--s4)", "var(--crit)", PALETTE[5]][i] })))}
      <p class="note">One state per record: CONFLICTING if a recorded conflict touches it, else OUTDATED if its freshest source is stale, else its verification state. Confidence is never treated as truth.</p></div>
      <div class="panel"><h2>Freshness</h2>${stackBar("Companies + models", ["Recent", "Needs Review", "Stale", "Unknown"].map((f, i) => ({ l: f, v: F.get(f) || 0, c: [PALETTE[0], PALETTE[5], "var(--crit)", "var(--s4)"][i] })))}
      <p class="note">Recent: newest source ≤ 12 months (or a live page read at capture). Needs review: 12–24 months. Stale: older. Unknown: undated sources only.</p></div>
      <div class="panel"><h2>Completeness (Batch 1)</h2>${DB.intel.completeness.map(c => `<div class="meter" data-tip="${esc(c.definition)}"><span>${esc(c.dimension)}</span><span class="trk"><b style="width:${c.pct}%"></b></span><span>${c.pct.toFixed(0)}%</span></div>`).join("")}
      <p class="note">Low figures are deliberate: missing values stay missing rather than being estimated.</p></div></div>
    <div class="grid g2 sec"><div class="panel"><h2>Most frequently missing fields</h2>${bars(sortedEntries(countBy(recs, r => r.missing_key_fields)).slice(0, 12).map(([l, v]) => ({ l, v })), { lw: 200 })}</div>
      <div class="panel"><h2>Coverage gaps</h2><ul class="list"><li>${DB.equipment.filter(e => e.level > 1 && !e.company_ids.length && !e.model_ids.length).length} equipment categories have no company or model yet.</li>
      <li>${DB.countries.filter(c => !c.company_ids.length).length} listed countries have no captured company (e.g. ${esc(DB.countries.filter(c => !c.company_ids.length).slice(0, 6).map(c => c.name).join(", "))}).</li>
      <li>${DB.components.filter(c => !c.capable_supplier_ids.length).length} of ${DB.components.length} component classes have no documented supplier.</li>
      <li>Facility capacity, process node and investment are not captured for fabs and OSATs.</li><li>Technical specifications (wafer size, throughput, accuracy) are published for a minority of models.</li>
      <li>${DB.companies.filter(c => c.hq.country_basis_code !== "SRC").length} companies' HQ country is analyst knowledge rather than a cited source.</li></ul></div></div>`;
  } else if (tab === "review") {
    body = dataTable({ id: "dq-review", rows: review, title: "Records requiring review", exportName: "review-queue", sort: { k: "state", d: 1 }, columns: [
      { k: "name", label: "Record", pin: true, get: r => r.name, html: r => `<a class="rowlink" href="${hrefOf(r.id)}">${esc(r.name)}</a><span class="sub">${esc(r.entity_type === "model" ? r.manufacturer : r.company_type)}</span>` },
      { k: "kind", label: "Type", get: r => r.entity_type }, { k: "state", label: "Quality state", get: r => r.quality_state, html: r => badge(r.quality_state) }, { k: "ver", label: "Verification", get: r => r.verification, html: r => badge(r.verification) },
      { k: "fresh", label: "Freshness", get: r => r.freshness, html: r => fresh(r.freshness) }, { k: "missing", label: "Missing key fields", wrap: true, get: r => r.missing_key_fields.join("; ") },
      { k: "due", label: "Review due", get: r => r.dates.review_due }, { k: "src", label: "Sources", num: true, get: r => r.source_ids.length, html: r => srcBtn(r.source_ids) }] });
  } else if (tab === "missing") {
    body = dataTable({ id: "dq-missing", rows: missingKey, title: "Records with missing key fields", exportName: "missing-fields", columns: [
      { k: "name", label: "Record", pin: true, get: r => r.name, html: r => `<a class="rowlink" href="${hrefOf(r.id)}">${esc(r.name)}</a>` }, { k: "kind", label: "Type", get: r => r.entity_type },
      { k: "n", label: "Missing", num: true, get: r => r.missing_key_fields.length }, { k: "fields", label: "Fields", wrap: true, get: r => r.missing_key_fields.join("; ") }, { k: "ver", label: "Verification", get: r => r.verification, html: r => badge(r.verification) }] });
  } else if (tab === "conflicts") {
    body = `<p class="small ink2">When sources disagree, both claims are stored and displayed. Nothing is silently resolved.</p>` + DB.quality.conflicts.map(c => `<div class="panel" style="margin-bottom:10px"><div class="row sp"><h2 style="margin:0">⚠ ${esc(c.field)}</h2><span class="row">${badge("CONFLICTING")}<span class="pill">${esc(c.status)}</span><span class="mono xs">${esc(c.id)}</span></span></div>
      <p class="small">Record: ${link(c.entity)}${(c.also || []).length ? ` · also: ${c.also.map(x => link(x)).join(", ")}` : ""}</p>
      <table class="spec"><thead><tr><th>Source</th><th>Claim</th></tr></thead><tbody>${c.claims.map(k => `<tr><th>${k.source_id ? `<button class="srcbtn" data-sources="${esc(k.source_id)}">↗ ${esc(k.source_id)} · Tier ${esc(get(k.source_id)?.tier ?? "?")}</button>` : "Unnumbered / observation"}</th><td>${esc(k.value)}</td></tr>`).join("")}</tbody></table><p class="note">${esc(c.note || "")}</p></div>`).join("");
  } else if (tab === "duplicates") {
    body = `<p class="small ink2">Candidates are flagged by normalised-name similarity, name containment or shared website domain. They are never merged automatically; known brand/subsidiary relationships are recorded as relationships and kept as separate entities.</p>`
      + dataTable({ id: "dq-dupes", rows: DB.quality.duplicate_candidates, title: "Duplicate candidates", exportName: "duplicate-candidates", columns: [
        { k: "a", label: "Record A", get: r => r.a_name, html: r => link(r.a, r.a_name) }, { k: "b", label: "Record B", get: r => r.b_name, html: r => link(r.b, r.b_name) },
        { k: "sim", label: "Similarity", num: true, get: r => r.similarity ?? null }, { k: "reasons", label: "Why flagged", wrap: true, get: r => r.reasons.join("; ") },
        { k: "known", label: "Known relationship", get: r => r.known_relationship || "", html: r => r.known_relationship ? `<span class="pill">${esc(pretty(r.known_relationship))}</span>` : `<span class="muted">—</span>` },
        { k: "resolution", label: "Resolution", wrap: true }] })
      + `<div class="panel sec"><h2>Aliases & name variants</h2><table class="spec"><tbody>${DB.companies.filter(c => c.aliases.length).map(c => `<tr><th>${link(c.id)}</th><td>${esc(c.aliases.join(", "))}</td></tr>`).join("")}</tbody></table></div>`;
  } else if (tab === "validation") {
    body = `<div class="panel"><h2>Validation rules (run at build)</h2><ul class="list">${val.rules.map(r => `<li>${esc(r)}</li>`).join("")}</ul><p class="note">${val.checked_records.toLocaleString()} records checked · ${val.errors.length} errors (errors block publishing) · ${val.warnings.length} warnings.</p></div>
      <div class="panel sec"><h2>Findings by rule</h2>${bars(Object.entries(val.by_rule).map(([l, v]) => ({ l, v })), { lw: 200 })}</div>
      <div class="sec">${dataTable({ id: "dq-val", rows: [...val.errors.map(e => ({ ...e, level: "error" })), ...val.warnings.map(w => ({ ...w, level: "warning" }))].map((x, i) => ({ ...x, _id: "v" + i })), rowId: r => r._id, title: "Findings", exportName: "validation", columns: [
        { k: "level", label: "Level", html: r => r.level === "error" ? badge("CONFLICTING", "error") : `<span class="pill">warning</span>` }, { k: "rule", label: "Rule" }, { k: "message", label: "Message", wrap: true },
        { k: "id", label: "Record", get: r => r.id || "", html: r => r.id && get(r.id) ? link(r.id, r.id) : esc(r.id || "") }] })}</div>`;
  } else if (tab === "relationships") {
    const byType = sortedEntries(countBy(DB.relationships, r => r.type));
    const byBasis = countBy(DB.relationships, r => r.basis);
    body = `<div class="grid g2"><div class="panel"><h2>Relationships by basis</h2>${stackBar("All relationships", [["source", PALETTE[0]], ["derived", PALETTE[4]], ["reference", PALETTE[2]], ["analyst", "var(--s4)"]].map(([b, c]) => ({ l: b, v: byBasis.get(b) || 0, c })))}
      <ul class="list"><li>${basis("source")} a numbered source states the link.</li><li>${basis("derived")} computed from source-backed fields (e.g. model → process via its equipment category; material by text match on a stated field).</li><li>${basis("reference")} generic engineering reference (process ↔ equipment, subsystem ↔ component).</li><li>${basis("analyst")} analyst knowledge, not source-traced (e.g. some HQ countries).</li></ul></div>
      <div class="panel"><h2>Relationships by type</h2>${bars(byType.map(([l, v]) => ({ l: l.replace(/_/g, " "), v })), { lw: 190 })}</div></div>`;
  } else if (tab === "sources") {
    const byType = sortedEntries(countBy(DB.sources, s => s.source_type));
    body = `<div class="kpis">${kpi({ v: DB.sources.length, l: "Sources" })}${kpi({ v: undatedSrc.length, l: "Undated" })}${kpi({ v: DB.sources.filter(s => !s.accessible).length, l: "Not accessible (not bypassed)" })}${kpi({ v: DB.sources.filter(s => s.tier === 4).length, l: "Tier 4 (never used alone to confirm)" })}${kpi({ v: DB.sources.filter(s => !s.used_by).length, l: "Uncited" })}</div>
      <div class="panel sec"><h2>Sources by type</h2>${bars(byType.map(([l, v]) => ({ l, v, href: `#/sources?type=${encodeURIComponent(l)}` })), { lw: 200 })}</div>
      <div class="sec">${dataTable({ id: "dq-undated", rows: undatedSrc, title: "Sources missing an evidence date", exportName: "undated-sources", columns: [
        { k: "id", label: "Id", html: r => `<a href="${hrefOf(r.id)}" class="mono">${esc(r.id)}</a>` }, { k: "title", label: "Title", wrap: true, html: r => r.source_url ? `<a href="${esc(r.source_url)}" target="_blank" rel="noopener noreferrer">${esc(r.title)} ↗</a>` : esc(r.title) },
        { k: "tier", label: "Tier" }, { k: "source_type", label: "Type" }, { k: "used_by", label: "Cited by", num: true }] })}</div>`;
  } else if (tab === "qc") {
    body = dataTable({ id: "dq-qc", rows: DB.intel.qc_log.map((q, i) => ({ ...q, id: "qc" + i })), title: "Batch-1 quality-control log", exportName: "qc-log", columns: [{ k: "check", label: "Check" }, { k: "result", label: "Result", html: r => r.result === "PASS" ? badge("VERIFIED").replace("Verified", "Pass") : `<span class="pill">${esc(pretty(r.result))}</span>` }, { k: "detail", label: "Detail", wrap: true }, { k: "note", label: "Note", wrap: true }] });
  } else if (tab === "methodology") {
    body = `<div class="grid g2"><div class="panel"><h2>Evidence rules</h2><ul class="list"><li><b>Confidence:</b> official source = HIGH; two independent industry sources = MEDIUM; single industry or distributor source = LOW; blog or market list only = UNVERIFIED.</li>
      <li><b>Customer links:</b> CONFIRMED only when the supplier, the customer or a filing states it; reported or evaluation-stage links are PROBABLE.</li><li><b>Market class:</b> assigned only from a published ranking or company revenue; otherwise UNCLASSIFIED. Market share is never estimated.</li>
      <li>Pages that blocked access are marked not accessible and were not bypassed.</li><li>Tier-4 sources never confirm a fact on their own.</li><li>Missing values are shown as missing — “Not found in Batch-1 sources”, “Not publicly disclosed”, “Not published” — never estimated.</li></ul></div>
      <div class="panel"><h2>Source tiers (Batch-1 scheme)</h2><table class="spec"><tbody>${["1", "2", "3", "4"].map(t => `<tr><th>Tier ${t}</th><td>${esc(DB.sources.find(s => String(s.tier) === t)?.tier_label || "")}</td><td>${DB.sources.filter(s => String(s.tier) === t).length}</td></tr>`).join("")}</tbody></table>
      <p class="note">The 2.0 brief proposes a six-tier scheme. Batch-1 tiers are kept as captured rather than re-graded without re-reading each source; see DATA_SOURCES.md for the crosswalk.</p></div>
      <div class="panel"><h2>Labels used for statements</h2><ul class="list"><li>${basis("source")} Source-backed fact</li><li>${basis("claim")} Manufacturer claim (specifications)</li><li>${basis("derived")} Derived from source-backed fields</li><li>${basis("reference")} Editorial reference (process, technology, subsystem descriptions)</li><li>${basis("analyst")} Analyst reading — not source-traced</li></ul>
      <p class="note">No AI-generated text is used as evidence. Reference descriptions are generic definitions and carry no company-specific claims.</p></div>
      <div class="panel"><h2>Normalisation</h2><ul class="list"><li>Wafer sizes: “12 inch”, “12-inch”, “300mm”, “300 mm” → 300 mm; the original wording is kept as the source value.</li><li>Dates: ISO (YYYY, YYYY-MM or YYYY-MM-DD).</li><li>Countries map to a reference list with ISO codes.</li><li>Stable ids per entity (CMP-, MDL-, PRD-, EQP-, PRS-, TEC-, MAT-, SUB-, CMPN-, FAB-, OSAT-, SRC-); Batch-1 ids remain as aliases.</li></ul></div></div>`;
  }
  const html = pageHead({ eyebrow: "Governance", title: "Data quality", crumb: [["Home", "#/"], ["Data quality", null]], lede: "How much of the database is verified, how fresh it is, what is missing, where sources disagree, and the rules every record is validated against." }) + tabs("#/quality", tab, T) + body;
  return { title: "Data quality", html };
}
export { uniq, nameOf, empty };

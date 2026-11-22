// Comparison workspace: up to 6 models or 4 companies side by side. Facts only — no scores, no ranking.
import { DB, get, hrefOf, nameOf, out, inn } from "../core/store.js";
import { esc, uniq, pretty, toCSV, download } from "../core/util.js";
import { ws } from "../core/workspace.js";
import { href, setParams, listParam } from "../core/router.js";
import { registerActions, rerender } from "../core/actions.js";
import { pageHead, badge, conf, fresh, srcBtn, empty } from "../ui/components.js";
import { waferText } from "./shared.js";

registerActions({
  cmpremove: el => { const [kind, id] = el.dataset.v.split("|"); const key = kind === "company" ? "companies" : "models"; const cur = current(kind).filter(x => x !== id); ws.setCmp(kind, cur); setParams({ [key]: cur }); },
  cmpadd: el => { const [kind] = el.dataset.v.split("|"); const id = el.value; if (!id) return; const key = kind === "company" ? "companies" : "models"; const max = kind === "company" ? ws.MAX_COMPANIES : ws.MAX_MODELS;
    const cur = uniq([...current(kind), id]).slice(-max); ws.setCmp(kind, cur); setParams({ [key]: cur }); },
  cmpclear: el => { const kind = el.dataset.v; ws.setCmp(kind, []); setParams({ [kind === "company" ? "companies" : "models"]: null }); rerender(); },
  cmpcsv: el => { const kind = el.dataset.v; const ids = current(kind); const rows = (kind === "company" ? companyRows : modelRows)().filter(r => !r.group);
    download(`semicon-db-compare-${kind}.csv`, toCSV(rows, [{ label: "Attribute", get: r => r.l }, ...ids.map(id => ({ label: nameOf(id), get: r => strip(r.f(get(id))) }))]), "text/csv"); },
});
const strip = h => String(h ?? "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
function current(kind) {
  const params = new URLSearchParams(location.hash.split("?")[1] || "");
  const key = kind === "company" ? "companies" : "models";
  const fromUrl = listParam(params, key).filter(id => get(id));
  return fromUrl.length ? fromUrl : ws.cmp(kind).filter(id => get(id));
}
const NA = `<span class="na">Not published</span>`;
const v = x => (x == null || x === "" || (Array.isArray(x) && !x.length) ? null : Array.isArray(x) ? esc(x.join("; ")) : esc(x));
const links = ids => (ids.length ? ids.map(i => `<a href="${hrefOf(i)}">${esc(nameOf(i))}</a>`).join(", ") : null);
function modelRows() {
  const R = (l, f) => ({ l, f }); const G = l => ({ group: l });
  return [G("Identity"), R("Manufacturer", m => `<a href="${hrefOf(m.company_id)}">${esc(m.manufacturer)}</a> <span class="muted xs">${esc(get(m.company_id)?.hq.country || "")}</span>`), R("Model number", m => v(m.model_number)),
    R("Product family", m => `<a href="${hrefOf(m.family_id)}">${esc(m.family_name)}</a>`), R("Equipment category", m => m.equipment_id ? `<a href="${hrefOf(m.equipment_id)}">${esc(m.equipment_label)}</a>` : v(m.equipment_label)), R("Segment", m => v(m.segment)),
    G("Process & technology"), R("Process", m => links(m.process_ids)), R("Technology (as stated)", m => v(m.technology_text)), R("Technologies", m => links(m.technology_ids)),
    G("Substrate"), R("Wafer size", m => m.wafer ? `${esc(waferText(m.wafer) || "")}<span class="sub">“${esc(m.wafer.source_value)}”</span>` : null), R("Substrate / material", m => links(m.material_ids) || v(m.material_text)), R("Thickness / format", m => v(m.thickness)),
    G("Performance (as published)"), R("Throughput", m => v(m.throughput)), R("Accuracy", m => v(m.accuracy)), R("Resolution", () => null), R("Chambers", () => null), R("Motion", m => v(m.motion)), R("Footprint", m => v(m.footprint)), R("Utilities", () => null), R("Automation", () => null),
    G("Laser"), R("Laser type", m => v(m.laser?.types_text)), R("Laser source", m => v(m.laser?.source)), R("Wavelength", m => v(m.laser?.wavelength)), R("Power", m => v(m.laser?.average_power)), R("Pulse duration", m => v(m.laser?.pulse_duration)), R("Repetition rate", m => v(m.laser?.repetition_rate)), R("Scan / process speed", m => v(m.laser?.scan_speed)),
    R("Other stated specs", m => m.specs.length ? m.specs.map(s => `${esc(s.parameter)}: <b>${esc(s.value)}</b> ${esc(s.unit || "")}`).join("<br>") + `<span class="sub">Manufacturer claims</span>` : null),
    G("Market & availability"), R("Applications", m => v(m.application_text)), R("Application classes", m => links(m.application_ids)),
    R("Customer evidence", m => { const cs = out(m.company_id, "supplies_equipment_to").filter(r => r.detail.model_id === m.id); return cs.length ? cs.map(r => `${esc(r.detail.customer)} ${badge(r.status)}`).join("<br>") : null; }),
    R("India presence (maker)", m => { const c = get(m.company_id); return c?.hq.country === "India" ? "HQ in India" : c?.india.has_presence ? esc(c.india.summary) : null; }), R("Service in India", () => null), R("Price (public)", m => v(m.price_public)),
    G("Lifecycle & evidence"), R("Lifecycle", m => `${esc(m.lifecycle.status)}${m.lifecycle.maturity ? ` · ${esc(m.lifecycle.maturity)}` : ""}`), R("Verification", m => badge(m.verification) + (m.quality_state === "CONFLICTING" ? " " + badge("CONFLICTING") : "")),
    R("Source confidence", m => conf(m.confidence.level)), R("Freshness", m => fresh(m.freshness)), R("Sources", m => srcBtn(m.source_ids))];
}
function companyRows() {
  const R = (l, f) => ({ l, f }); const G = l => ({ group: l });
  const models = c => DB.models.filter(m => m.company_id === c.id);
  return [G("Profile"), R("Company type", c => v(c.company_type)), R("Supplier roles", c => v(c.supplier_types)), R("Headquarters", c => c.hq.country ? `${esc(c.hq.country)}${c.hq.city ? ", " + esc(c.hq.city) : ""}<span class="sub">${esc(c.hq.country_basis)}</span>` : null),
    R("Ownership / listing", c => v([c.ownership, c.exchange, c.ticker].filter(Boolean).join(" · ") || null)), R("Founded", c => v(c.founded)), R("Employees", c => v(c.employees)),
    R("Revenue", c => c.revenue ? (c.revenue.usd_m != null ? `USD ${c.revenue.usd_m.toLocaleString()} m<span class="sub">${esc(c.revenue.fiscal_year)}</span>` : `USD ${esc(c.revenue.range_usd_m)} m (derived)`) : null), R("Market class", c => `${esc(pretty(c.market_class))}<span class="sub">${esc(c.market_class_basis || "No ranking evidence")}</span>`),
    R("Market share", () => `<span class="na">Not recorded (never estimated)</span>`),
    G("Portfolio"), R("Equipment categories", c => links(c.equipment_ids)), R("Product families", c => DB.product_families.filter(f => f.company_id === c.id).length || null), R("Models", c => models(c).length || null),
    R("Technology coverage", c => links(uniq([...c.equipment_ids.flatMap(e => get(e).technology_ids), ...models(c).flatMap(m => m.technology_ids)]))),
    R("Process coverage", c => links(uniq([...c.equipment_ids.flatMap(e => get(e).process_ids), ...models(c).flatMap(m => m.process_ids)]))),
    R("Applications", c => links(uniq(models(c).flatMap(m => m.application_ids)))), R("Market segments", c => v(uniq(models(c).map(m => m.segment)))),
    G("Geography & operations"), R("Presence (CN / JP / KR / TW)", c => v(Object.entries(c.presence).filter(([, x]) => x).map(([k, x]) => `${k}: ${x}`))), R("India presence", c => c.hq.country === "India" ? "HQ in India" : v(c.india.summary)),
    R("Manufacturing sites", () => null), R("R&D sites", () => null), R("Service network", () => null),
    R("Partnerships & deals", c => { const d = DB.deals.filter(x => x.party_a_id === c.id || x.party_b_id === c.id); return d.length ? d.map(x => `${esc(x.event_type)}: ${esc(x.party_a_id === c.id ? x.party_b : x.party_a)}`).join("<br>") : null; }),
    R("Customers documented", c => { const cs = out(c.id, "supplies_equipment_to"); return cs.length ? `${cs.length} (${cs.filter(r => r.status === "CONFIRMED").length} confirmed)` : null; }),
    R("Supply-chain links", c => { const n = out(c.id, ["supplies", "capable_of_supplying", "integrates", "distributes"]).length + inn(c.id, ["supplies", "distributes"]).length; return n || null; }),
    G("Evidence"), R("Verification", c => badge(c.verification)), R("Confidence", c => conf(c.confidence.level)), R("Freshness", c => fresh(c.freshness)),
    R("Source coverage", c => { const t = c.source_ids.map(get).filter(Boolean); return `${t.length} sources · ${t.filter(s => s.tier === 1).length} Tier 1<span class="sub">${srcBtn(c.source_ids)}</span>`; })];
}
function grid(kind, ids, rows, { diff, hideEmpty }) {
  const recs = ids.map(get);
  const body = rows.map(r => {
    if (r.group) return `<tr class="grp"><td colspan="${recs.length + 1}">${esc(r.group)}</td></tr>`;
    const vals = recs.map(x => r.f(x));
    if (hideEmpty && vals.every(x => x == null || x === "")) return "";
    const differs = diff && new Set(vals.map(x => strip(x))).size > 1;
    return `<tr class="${differs ? "diff" : ""}"><td>${esc(r.l)}</td>${vals.map(x => `<td class="${x == null || x === "" ? "miss" : ""}">${x == null || x === "" ? NA : x}</td>`).join("")}</tr>`;
  }).join("");
  return `<div class="tbl-wrap" style="max-height:none"><table class="cmp"><thead><tr><th>Attribute</th>${recs.map(x => `<th><a href="${hrefOf(x.id)}">${esc(x.name)}</a><div class="xs muted">${esc(x.entity_type === "model" ? x.manufacturer : x.company_type)}</div><button class="btn sm" style="margin-top:4px" data-action="cmpremove" data-v="${kind}|${x.id}" aria-label="Remove ${esc(x.name)}">Remove</button></th>`).join("")}</tr></thead><tbody>${body}</tbody></table></div>`;
}
export function compare({ path, params }) {
  const kind = path[1] === "companies" ? "company" : "model";
  const ids = current(kind);
  const diff = params.get("diff") !== "0", hideEmpty = params.get("hide") === "1";
  const pool = kind === "company" ? [...DB.companies].sort((a, b) => a.name.localeCompare(b.name)) : [...DB.models].sort((a, b) => a.manufacturer.localeCompare(b.manufacturer) || a.name.localeCompare(b.name));
  const max = kind === "company" ? ws.MAX_COMPANIES : ws.MAX_MODELS;
  const picker = ids.length < max ? `<select class="select" data-change="cmpadd" data-v="${kind}|" aria-label="Add to comparison" style="max-width:420px"><option value="">+ Add ${kind === "company" ? "a company" : "a model"}…</option>${pool.filter(x => !ids.includes(x.id)).map(x => `<option value="${x.id}">${esc(kind === "company" ? x.name : `${x.manufacturer} · ${x.name}`)}</option>`).join("")}</select>` : `<span class="small muted">Maximum of ${max} reached — remove one to add another.</span>`;
  const html = pageHead({ eyebrow: "Comparison workspace", title: kind === "company" ? "Company comparison" : "Equipment comparison", crumb: [["Home", "#/"], ["Compare", null]],
    lede: "Facts only, as each source states them. Hatched cells are values the source does not publish; highlighted rows differ between columns. SEMICON-DB does not score, rank or declare a best tool or company." })
    + `<div class="toolbar"><div class="seg" role="group" aria-label="Compare type"><a class="btn${kind === "model" ? "" : ""}" href="#/compare" aria-current="${kind === "model"}">Equipment (${ws.cmp("model").length})</a><a class="btn" href="#/compare/companies" aria-current="${kind === "company"}">Companies (${ws.cmp("company").length})</a></div>
      ${picker}<button class="btn sm" data-setparam="diff=${diff ? "0" : ""}" aria-pressed="${diff}">Highlight differences</button><button class="btn sm" data-setparam="hide=${hideEmpty ? "" : "1"}" aria-pressed="${hideEmpty}">Hide rows with no data</button>
      ${ids.length ? `<button class="btn sm" data-savecmp="${kind}|${ids.join(",")}">☆ Save comparison</button><button class="btn sm" data-copylink="1">Copy link</button><button class="btn sm" data-action="cmpcsv" data-v="${kind}">Export CSV</button><button class="btn sm" data-action="cmpclear" data-v="${kind}">Clear</button>` : ""}</div>
    <div class="legend" style="margin-bottom:10px"><span>${badge("VERIFIED")} verified record</span><span>${badge("CONFLICTING")} conflicting sources</span><span><span class="chip b-info">Manufacturer claim</span> value stated by the maker</span><span><i style="background:var(--info-wash);border:1px solid var(--line)"></i>differs</span><span><i style="background:repeating-linear-gradient(135deg,transparent 0 3px,var(--line) 3px 4px)"></i>not published</span></div>`
    + (ids.length ? grid(kind, ids, kind === "company" ? companyRows() : modelRows(), { diff, hideEmpty })
      : empty({ title: `No ${kind === "company" ? "companies" : "models"} selected.`, tips: [`use “+ Compare” on any ${kind === "company" ? "company profile" : "model page"}`, `tick the compare box in the <a href="${kind === "company" ? "#/companies" : "#/products"}">${kind === "company" ? "company" : "product"} explorer</a>`, "pick from the list above"] }));
  return { title: kind === "company" ? "Company comparison" : "Equipment comparison", html };
}
export { href };

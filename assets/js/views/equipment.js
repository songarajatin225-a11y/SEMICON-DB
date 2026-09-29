// Equipment taxonomy browser and equipment-category pages (category → companies → families → models).
import { DB, get, hrefOf, nameOf } from "../core/store.js";
import { esc, uniq, plural } from "../core/util.js";
import { href } from "../core/router.js";
import { pageHead, crumbs, tags, link, empty, basis, quickActions } from "../ui/components.js";
import { modelTable, relationsSection } from "./shared.js";
import { dataTable } from "../ui/table.js";
import { COMPANY_COLS, COMPANY_PRESETS } from "./companies.js";

function node(e) {
  const nc = e.company_ids_incl_children.length, nm = e.model_ids_incl_children.length;
  return `<a class="tag${nc || nm ? "" : " faint"}" style="justify-content:space-between" href="${hrefOf(e.id)}" title="${esc(e.name)} · ${esc(e.segment || "")}"><span><span class="k">${esc(e.code)}</span> ${esc(e.name)}${e.laser_relevant ? ` <span class="xs" title="Laser-relevant">◆</span>` : ""}</span><span class="k">${nc} co · ${nm} md</span></a>`;
}
function browse({ params }) {
  const seg = params.get("segment") || "";
  const groups = DB.equipment.filter(e => e.level === 1);
  const segs = DB.reference.segments.filter(s => DB.equipment.some(e => e.segment === s));
  const html = pageHead({ eyebrow: "Database", title: "Equipment taxonomy", crumb: [["Home", "#/"], ["Equipment", null]],
    lede: `${DB.equipment.filter(e => e.level > 1).length} equipment categories in ${groups.length} groups. Counts show source-confirmed companies (co) and mapped models (md), including sub-categories. Faded nodes have no record yet — they are coverage gaps, not empty markets. ◆ = laser-relevant.` })
    + `<div class="toolbar"><span class="small muted">Segment:</span><div class="seg" role="group" aria-label="Segment">${["", ...segs].map(s => `<button data-setparam="segment=${esc(s)}" aria-pressed="${seg === s}">${esc(s || "All")}</button>`).join("")}</div></div>`
    + groups.map(g => {
      const kids = DB.equipment.filter(e => e.group_code === g.code && e.level > 1 && (!seg || e.segment === seg));
      if (!kids.length) return "";
      const cov = kids.filter(k => k.company_ids.length || k.model_ids.length).length;
      return `<details class="panel sec" ${["A", "C", "D"].includes(g.code) || seg ? "open" : ""}><summary style="cursor:pointer;list-style:none"><div class="row sp"><span><span class="mono muted">${esc(g.code)}</span> <b style="font-size:15px">${esc(g.name)}</b> ${g.origin !== "Batch-1 taxonomy" ? `<span class="chip b-info">2.0 extension</span>` : ""}</span>
        <span class="small muted">${kids.length} categories · ${cov} with records · ${g.company_ids_incl_children.length} companies · ${g.model_ids_incl_children.length} models · <a href="${hrefOf(g.id)}">open group</a></span></div></summary>
        <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:6px;margin-top:10px">${kids.map(node).join("")}</div></details>`;
    }).join("");
  return { title: "Equipment taxonomy", html };
}
function detail({ path, params }) {
  const e = get(path[1]);
  if (!e || e.entity_type !== "equipment") return { title: "Not found", html: empty({ title: `No equipment category ${path[1]}.`, tips: [`<a href="#/equipment">browse the taxonomy</a>`] }) };
  const chain = []; let p = e; while (p) { chain.unshift(p); p = p.parent_id ? get(p.parent_id) : null; }
  const models = e.model_ids_incl_children.map(get);
  const cos = e.company_ids_incl_children.map(get);
  const makers = uniq([...cos.map(c => c.id), ...models.map(m => m.company_id)]).map(get);
  const fams = uniq(models.map(m => m.family_id));
  const tab = params.get("tab") || "overview";
  const suppliersForSubs = uniq(e.typical_subsystem_ids.flatMap(s => get(s).potential_supplier_ids));
  const html = `${crumbs([["Home", "#/"], ["Equipment", "#/equipment"], ...chain.map(c => [c.name, c.id === e.id ? null : hrefOf(c.id)])])}
    <div class="ehead"><div class="eyebrow">${esc(e.code)} · ${esc(e.level === 1 ? "Equipment group" : e.segment || "")} · ${esc(e.origin)}</div><h1 class="pt">${esc(e.name)}</h1>
    <div class="kv"><dl><dt>Group</dt><dd>${esc(e.group_name)}</dd></dl><dl><dt>Companies (incl. sub-categories)</dt><dd>${makers.length}</dd></dl><dl><dt>Product families</dt><dd>${fams.length}</dd></dl><dl><dt>Models</dt><dd>${models.length}</dd></dl><dl><dt>Laser-relevant</dt><dd>${e.laser_relevant ? "Yes" : "No"}</dd></dl></div>
    ${quickActions(e.id, { extra: [`<a class="btn sm" href="${href("/products", { eq: e.id })}">Open in product explorer</a>`, `<a class="btn sm" href="${href("/compare", { models: models.slice(0, 6).map(m => m.id) })}">Compare models</a>`] })}</div>
    <div class="tabs" role="tablist"><a role="tab" href="${hrefOf(e.id)}" aria-selected="${tab === "overview"}">Overview</a><a role="tab" href="${hrefOf(e.id)}?tab=relationships" aria-selected="${tab === "relationships"}">Relationships</a></div>
    ${tab === "relationships" ? relationsSection(e.id) : `
    ${!makers.length && !models.length ? `<div class="callout warn"><b>Coverage gap.</b> No company or model is mapped to this category in the current evidence set. This is a data gap, not a statement that no supplier exists.${e.see_also.length ? ` See also: ${e.see_also.map(x => link(x)).join(", ")}.` : ""}</div>` : ""}
    ${e.child_ids.length ? `<div class="panel"><h2>Sub-categories</h2><div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:6px">${e.child_ids.map(get).map(node).join("")}</div></div>` : ""}
    <div class="grid g3 sec"><div class="panel"><h2>Processes</h2>${tags(e.process_ids, { empty: "Not mapped" })}</div><div class="panel"><h2>Technologies</h2>${tags(e.technology_ids, { empty: "Not mapped" })}</div>
      <div class="panel"><h2>Typical subsystems</h2>${tags(e.typical_subsystem_ids, { empty: "—" })}<p class="note">${basis("reference")} generic architecture. ${suppliersForSubs.length} companies have documented capability in these subsystems' component classes.</p></div></div>
    <div class="sec">${makers.length ? dataTable({ id: "eq-co-" + e.id, rows: makers, columns: COMPANY_COLS, presets: COMPANY_PRESETS, compareKind: "company", title: "Companies", exportName: "companies-" + e.code }) : ""}</div>
    <div class="sec">${models.length ? modelTable("eq-md-" + e.id, models, { title: "Product families & models" }) : ""}</div>`}`;
  return { title: e.name, html };
}
export function equipment(ctx) { return ctx.path[1] ? detail(ctx) : browse(ctx); }
export { plural, nameOf };

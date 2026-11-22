// Process explorer: process tree (left) · flow diagram and equipment (centre) · process details (right).
import { DB, get, hrefOf } from "../core/store.js";
import { esc, uniq, plural } from "../core/util.js";
import { href } from "../core/router.js";
import { pageHead, crumbs, tags, link, basis, empty, specTable, quickActions } from "../ui/components.js";
import { flowNodes } from "./home.js";
import { modelTable } from "./shared.js";

function tree(active) {
  return DB.reference.stages.map(s => {
    const ps = DB.processes.filter(p => p.stage === s.id);
    const open = !active || ps.some(p => p.id === active.id) || s.id === "FE";
    return `<details ${open ? "open" : ""}><summary>${esc(s.name)} <span class="muted xs">${ps.length}</span></summary>${ps.map(p => `<a href="${hrefOf(p.id)}" class="${p.parent_id ? "child" : ""}" aria-current="${active && active.id === p.id}">${esc(p.name)} <span class="muted xs">${p.model_ids.length || ""}</span></a>`).join("")}</details>`;
  }).join("");
}
function details(p) {
  if (!p) return `<div class="panel"><h2>Select a process</h2><p class="small ink2">Choose a step in the tree or the flow to see its purpose, inputs, outputs, materials, equipment, OEMs, subsystems and suppliers.</p></div>`;
  const subs = uniq(p.equipment_ids.flatMap(e => get(e)?.typical_subsystem_ids || []));
  const suppliers = uniq(subs.flatMap(s => get(s).potential_supplier_ids));
  const alt = DB.processes.filter(x => x.id !== p.id && x.parent_id === p.parent_id && p.parent_id);
  return `<div class="panel"><div class="eyebrow">${esc(p.stage_name)}</div><h2 style="font-size:18px">${esc(p.name)}</h2><p class="small">${esc(p.description)}</p>
    ${specTable([["Purpose", esc(p.purpose)], ["Inputs", esc(p.inputs.join(", ") || "—")], ["Outputs", esc(p.outputs.join(", ") || "—")], ["Typical parameters", esc(p.typical_parameters.join(", ") || "—")],
      ["Quality metrics", esc(p.quality_metrics.join(", ") || "—")], ["Typical defects", esc(p.defects.join(", ") || "—")], ["Parent step", p.parent_id ? link(p.parent_id) : "—"],
      ["Sub-steps", DB.processes.filter(x => x.parent_id === p.id).map(x => link(x.id)).join(", ") || "—"], ["Related steps", alt.map(x => link(x.id)).join(", ") || "—"]])}
    <p class="note">${basis("reference")} Process text is a generic textbook description, not source-traced. Equipment, OEM and model links below are derived from source-backed records.</p>
    <h3 style="margin-top:12px">Technologies / alternatives</h3>${tags(p.technology_ids, { empty: "—" })}
    <h3 style="margin-top:12px">Materials</h3>${tags(p.material_ids, { empty: "—" })}
    <h3 style="margin-top:12px">Subsystems in this step's equipment</h3>${tags(subs, { empty: "—" })}
    <h3 style="margin-top:12px">Suppliers with documented subsystem capability</h3>${tags(suppliers, { max: 12, empty: "None captured" })}
    ${quickActions(p.id)}</div>`;
}
export function processes({ path }) {
  const p = path[1] ? get(path[1]) : null;
  if (path[1] && (!p || p.entity_type !== "process")) return { title: "Not found", html: empty({ title: `No process ${path[1]}.`, tips: [`<a href="#/processes">open the process explorer</a>`] }) };
  const eqs = p ? p.equipment_ids.map(get).filter(e => e.level > 1) : [];
  const withRecords = eqs.filter(e => e.company_ids.length || e.model_ids.length);
  const models = p ? p.model_ids.map(get) : [];
  const center = p ? `<div class="panel"><div class="row sp"><h2>Equipment used in ${esc(p.name.toLowerCase())}</h2><span class="small muted">${eqs.length} categories · ${withRecords.length} with records</span></div>
      <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:6px">${eqs.map(e => `<a class="tag${e.company_ids.length || e.model_ids.length ? "" : " faint"}" style="justify-content:space-between" href="${hrefOf(e.id)}"><span><span class="k">${esc(e.code)}</span> ${esc(e.name)}</span><span class="k">${e.company_ids_incl_children.length} co</span></a>`).join("") || `<p class="na">No equipment category mapped.</p>`}</div></div>
    <div class="panel sec"><h2>Major OEMs (by records in this process)</h2>${tags([...p.company_ids].sort((a, b) => DB.models.filter(m => m.company_id === b && m.process_ids.includes(p.id)).length - DB.models.filter(m => m.company_id === a && m.process_ids.includes(p.id)).length), { max: 24, empty: "None captured" })}
      <p class="note">Ordered by number of mapped models; not a market ranking.</p></div>
    <div class="sec">${models.length ? modelTable("proc-" + p.id, models, { title: "Models" }) : empty({ title: "No model mapped to this process yet.", kind: "not-available" })}</div>` : "";
  const html = `${crumbs([["Home", "#/"], ["Processes", p ? "#/processes" : null], ...(p ? [[p.stage_name, null], [p.name, null]] : [])])}
    <div class="eyebrow">Process explorer</div><h1 class="pt">${esc(p ? p.name : "Semiconductor manufacturing process atlas")}</h1>
    <p class="lede">${p ? esc(p.description) : `${DB.processes.length} processes from crystal growth to final test, advanced packaging and the subfab. Discover equipment from process requirements: pick a step to see the equipment, OEMs, models, materials, subsystems and suppliers involved.`}</p>
    <div class="panel" style="margin-bottom:14px"><h2>Main process flow</h2>${flowNodes(p?.id)}<p class="note">Front-end steps from cleaning to inspection repeat for every layer before wafer test.</p></div>
    <div class="pex"><nav class="panel ptree" aria-label="Process tree">${tree(p)}</nav><div>${center || `<div class="panel"><h2>How to use</h2><ul class="list"><li>Select a step in the flow or the tree.</li><li>The centre shows equipment categories, OEMs and models mapped to the step.</li><li>The right panel explains the step and lists materials, technologies, subsystems and suppliers.</li></ul></div>
      <div class="panel sec"><h2>Coverage by stage</h2><table class="spec"><tbody>${DB.reference.stages.map(s => { const ps = DB.processes.filter(x => x.stage === s.id); return `<tr><th>${esc(s.name)}</th><td>${plural(ps.length, "process", "processes")} · ${uniq(ps.flatMap(x => x.model_ids)).length} models · ${uniq(ps.flatMap(x => x.company_ids)).length} companies</td></tr>`; }).join("")}</tbody></table></div>`}</div>
    <div class="pdetail">${details(p)}</div></div>`;
  return { title: p ? p.name : "Process explorer", html };
}
export { href };

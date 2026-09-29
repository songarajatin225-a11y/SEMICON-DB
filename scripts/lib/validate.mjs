// Schema & integrity validation. Errors block publishing; warnings are reported in the Data Quality centre.
const ID_RE = {
  companies: /^CMP-\d{6}$/, product_families: /^PRD-\d{6}$/, models: /^MDL-\d{6}$/, equipment: /^EQP-[A-Z](\d\d)?(\.(\d\d|D\d\d))?$|^EQP-[A-Z]\.D\d\d$/,
  processes: /^PRS-\d{3}$/, technologies: /^TEC-\d{3}$/, materials: /^MAT-\d{3}$/, applications: /^APP-\d{3}$/, subsystems: /^SUB-\d{3}$/, components: /^CMPN-\d{6}$/,
  fabs: /^FAB-\d{6}$/, osats: /^OSAT-\d{6}$/, customers: /^CUS-\d{6}$/, countries: /^CTY-[A-Z]{2}$/, deals: /^DEAL-\d{6}$/, sources: /^SRC-[A-Z0-9-]+$/,
};
const REF_FIELDS = ["company_id", "family_id", "equipment_id", "parent_id", "subsystem_id", "component_class_id", "country_id"];
const REF_ARRAYS = ["model_ids", "equipment_ids", "process_ids", "technology_ids", "material_ids", "application_ids", "company_ids", "component_ids", "subsystem_ids",
  "typical_subsystem_ids", "child_ids", "fab_ids", "osat_ids", "capable_supplier_ids", "product_model_ids", "potential_supplier_ids", "typical_equipment_ids", "equipment_supplier_ids"];

export function validateAll(E, { conflicts = [] } = {}) {
  const errors = [], warnings = [];
  const err = (rule, message, id) => errors.push({ rule, message, id });
  const warn = (rule, message, id) => warnings.push({ rule, message, id });
  const index = new Map();
  for (const [kind, list] of Object.entries(E)) {
    if (kind === "suppliers") continue;
    for (const r of list) {
      if (!r.id) { err("id.required", `${kind} record without id`); continue; }
      if (index.has(r.id)) err("id.unique", `Duplicate id ${r.id}`, r.id);
      index.set(r.id, { kind, r });
      if (ID_RE[kind] && !ID_RE[kind].test(r.id)) err("id.format", `${kind} id ${r.id} does not match the ${ID_RE[kind]} pattern`, r.id);
    }
  }
  const has = id => index.has(id);
  const checkSources = (r, ids) => (ids || []).forEach(s => { if (!has(s)) err("source.exists", `${r.id} cites unknown source ${s}`, r.id); });

  for (const c of E.companies) {
    if (!c.name || !String(c.name).trim()) err("company.name", "Company name cannot be blank", c.id);
    if (!c.source_ids.length) warn("company.sources", `${c.name} has no sources`, c.id);
    if (c.hq.country && !c.hq.country_id) warn("company.country", `${c.name}: country "${c.hq.country}" does not map to the country reference`, c.id);
    if (c.website && !/^https?:\/\/[^\s]+\.[^\s]+/.test(c.website)) warn("company.website", `${c.name}: website is not a valid URL (${c.website})`, c.id);
    checkSources(c, c.source_ids);
  }
  for (const m of E.models) {
    if (!m.company_id || !has(m.company_id)) err("model.manufacturer", `Model ${m.name} has no valid manufacturer`, m.id);
    const fam = E.product_families.find(f => f.id === m.family_id);
    if (!fam) err("model.family", `Model ${m.id} points to missing family ${m.family_id}`, m.id);
    else if (fam.company_id !== m.company_id) err("family.company", `Family ${fam.id} company differs from model ${m.id}`, m.id);
    if (m.wafer && m.wafer.source_value && !m.wafer.sizes_mm.length && !m.wafer.range_mm) warn("normalize.wafer", `${m.name}: wafer value "${m.wafer.source_value}" not normalised to a diameter`, m.id);
    checkSources(m, m.source_ids);
    m.specs.forEach(s => { if (!s.source_ids.length) warn("spec.source", `${m.name}: spec ${s.parameter} has no source`, m.id); });
  }
  for (const f of E.product_families) if (!has(f.company_id)) err("family.company", `Family ${f.id} has no valid company`, f.id);
  for (const [kind, list] of Object.entries(E)) {
    if (kind === "suppliers" || kind === "relationships") continue;
    for (const r of list) {
      REF_FIELDS.forEach(k => { if (r[k] && !has(r[k])) err("ref.exists", `${r.id}.${k} → unknown ${r[k]}`, r.id); });
      REF_ARRAYS.forEach(k => (r[k] || []).forEach(x => { if (x && !has(x)) err("ref.exists", `${r.id}.${k} → unknown ${x}`, r.id); }));
      if (kind !== "companies" && kind !== "models") checkSources(r, r.source_ids);
    }
  }
  for (const rel of E.relationships) {
    if (!has(rel.from)) err("relationship.from", `${rel.id} (${rel.type}) from unknown ${rel.from}`, rel.id);
    if (!has(rel.to)) err("relationship.to", `${rel.id} (${rel.type}) to unknown ${rel.to}`, rel.id);
    checkSources(rel, rel.source_ids);
    if (rel.basis === "source" && !(rel.source_ids || []).length) warn("relationship.sources", `${rel.id} (${rel.type}) is source-based but cites no source`, rel.id);
  }
  const ids = new Set(E.relationships.map(r => r.id)); if (ids.size !== E.relationships.length) err("relationship.unique", "Duplicate relationship ids");
  for (const s of E.sources) {
    if (s.source_url) { try { new URL(s.source_url); } catch { err("source.url", `${s.id} has an invalid URL`, s.id); } }
    else if (!s.internal) warn("source.url", `${s.id} has no URL`, s.id);
    if (!s.publication_date) warn("source.date", `${s.id} has no publication / evidence date`, s.id);
    else if (!/^\d{4}(-\d\d){0,2}$/.test(s.publication_date)) err("source.date", `${s.id} has an invalid date ${s.publication_date}`, s.id);
    if (!s.accessible) warn("source.access", `${s.id} was not accessible at capture`, s.id);
  }
  for (const c of conflicts) { if (!has(c.entity)) err("conflict.entity", `${c.id} points to unknown ${c.entity}`, c.id); c.claims.forEach(k => { if (k.source_id && !has(k.source_id)) err("conflict.source", `${c.id} cites unknown ${k.source_id}`, c.id); }); }
  const byRule = {}; [...errors, ...warnings].forEach(x => (byRule[x.rule] = (byRule[x.rule] || 0) + 1));
  return { checked_records: index.size, errors, warnings: warnings, by_rule: byRule,
    rules: ["Company name cannot be blank", "Model cannot exist without a manufacturer", "Product family must belong to the model's company", "All referenced ids must exist (processes, technologies, materials, equipment, countries …)",
      "Relationship endpoints must exist", "Cited sources must exist", "Source URLs must parse", "Evidence dates must be ISO (YYYY, YYYY-MM or YYYY-MM-DD)", "Company countries should map to the country reference", "Stable id formats per entity"] };
}

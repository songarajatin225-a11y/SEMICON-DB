// Data store: loads the published bundle once, then exposes id lookups and graph adjacency.
export const DB = { ready: false };
const byId = new Map();
const outE = new Map(), inE = new Map();

export const KIND = {
  CMP: "company", PRD: "product_family", MDL: "model", EQP: "equipment", PRS: "process", TEC: "technology", MAT: "material", APP: "application",
  SUB: "subsystem", CMPN: "component", FAB: "fab", OSAT: "osat", CUS: "customer", CTY: "country", SRC: "source", DEAL: "deal", REL: "relationship",
};
export const KIND_LABEL = { company: "Company", product_family: "Product family", model: "Model", equipment: "Equipment category", process: "Process", technology: "Technology",
  material: "Material", application: "Application", subsystem: "Subsystem", component: "Component class", fab: "Fab / device maker", osat: "OSAT / ATMP", customer: "Customer",
  country: "Country", source: "Source", deal: "Deal / partnership" };
const ROUTE = { company: "companies", product_family: "products", model: "models", equipment: "equipment", process: "processes", technology: "technologies", material: "materials",
  application: "applications", subsystem: "subsystems", component: "components", fab: "fabs", osat: "osats", customer: "customers", country: "countries", source: "sources", deal: "intelligence/deals" };
export const kindOf = id => KIND[String(id).split("-")[0]] || null;
export const hrefOf = id => { const k = kindOf(id); return k ? `#/${ROUTE[k]}/${encodeURIComponent(id)}` : "#/"; };
export const get = id => byId.get(id);
export const nameOf = id => { const r = byId.get(id); return r ? (r.name || r.title || id) : id; };

export async function load(url = "data/bundle.json") {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Data failed to load (${res.status} ${res.statusText})`);
  const B = await res.json();
  Object.assign(DB, B);
  const lists = ["companies", "product_families", "models", "equipment", "processes", "technologies", "materials", "applications", "subsystems", "components", "fabs", "osats", "customers", "countries", "sources", "deals"];
  lists.forEach(k => (B[k] || []).forEach(r => byId.set(r.id, r)));
  (B.relationships || []).forEach(r => {
    byId.set(r.id, r);
    (outE.get(r.from) || outE.set(r.from, []).get(r.from)).push(r);
    (inE.get(r.to) || inE.set(r.to, []).get(r.to)).push(r);
  });
  // legacy-id aliases keep old deep links (C0001, P00001, S0001, CU001) working
  DB.legacy = new Map();
  [...B.companies, ...B.models, ...B.sources, ...B.fabs, ...B.osats, ...B.customers].forEach(r => r.legacy_id && !DB.legacy.has(r.legacy_id) && DB.legacy.set(r.legacy_id, r.id));
  DB.supplierById = new Map(B.suppliers.map(s => [s.company_id, s]));
  DB.ready = true;
  return DB;
}
export const out = (id, type) => (outE.get(id) || []).filter(r => !type || (Array.isArray(type) ? type.includes(r.type) : r.type === type));
export const inn = (id, type) => (inE.get(id) || []).filter(r => !type || (Array.isArray(type) ? type.includes(r.type) : r.type === type));
export const edges = id => [...(outE.get(id) || []), ...(inE.get(id) || [])];
export const resolveLegacy = id => DB.legacy?.get(id) || id;

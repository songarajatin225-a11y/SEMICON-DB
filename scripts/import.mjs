#!/usr/bin/env node
// Import pipeline: RAW (CSV / JSON / Excel-exported CSV) → VALIDATE → NORMALISE → DEDUPLICATE → stage as a batch.
//
//   node scripts/import.mjs <file.csv|file.json> --entity companies|models|sources|customers|customer_links [--batch NAME] [--write] [--allow-duplicates]
//
// JSON rows may carry several sources in a `sources` array ({url,title,type,tier,date,publisher,access,excerpt}); company rows
// may carry a `startup` object (founders, year, funding, investors, product, trl, latest_news, maturity) that is staged as a
// startup profile citing the company's sources. Customer links need an existing OEM and customer (import customers first);
// "UNDISCLOSED:<description>" links to the undisclosed-customer record and keeps the description.
//
// Without --write it is a dry run that prints the validation / duplicate report. With --write, accepted rows are
// appended to data/batches/<NAME>.json in the Batch-1 row format; `npm run build` then merges every batch file
// through the same normalisation, linking and quality pipeline as the legacy snapshot.
// Rules: every company/model row needs at least one source; nothing without evidence is accepted.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normWafer, normName, similarity } from "./lib/normalize.mjs";
import { COUNTRIES, COUNTRY_ALIASES } from "./reference/geo.mjs";
import { TAXONOMY_EXT, TAXONOMY_GROUPS_EXT } from "./reference/ontology.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith("--"));
const opt = k => { const i = args.indexOf("--" + k); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : true) : null; };
const entity = opt("entity");
const ENTITIES = ["companies", "models", "sources", "customers", "customer_links"];
if (!file || !ENTITIES.includes(entity)) {
  console.error(`Usage: node scripts/import.mjs <file.csv|file.json> --entity ${ENTITIES.join("|")} [--batch NAME] [--write] [--allow-duplicates]`);
  process.exit(2);
}
const batchName = String(opt("batch") || "batch-" + new Date().toISOString().slice(0, 10));
const BATCH_FILE = path.join(ROOT, "data/batches", batchName.replace(/[^\w.-]/g, "_") + ".json");

// ---------------------------------------------------------------- RAW
function parseCSV(text) {
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true; else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows.filter(r => r.some(x => x.trim()));
  const keys = head.map(h => h.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""));
  return body.map(r => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? "").trim()])));
}
const raw = fs.readFileSync(path.resolve(file), "utf8").replace(/^﻿/, "");
const input = file.endsWith(".json") ? JSON.parse(raw) : parseCSV(raw);

// ---------------------------------------------------------------- existing state (legacy + earlier batches)
const L = JSON.parse(fs.readFileSync(path.join(ROOT, "data/legacy/legacy_snapshot.json"), "utf8"));
const batchDir = path.join(ROOT, "data/batches");
const batches = fs.existsSync(batchDir) ? fs.readdirSync(batchDir).filter(f => f.endsWith(".json")).map(f => JSON.parse(fs.readFileSync(path.join(batchDir, f), "utf8"))) : [];
const all = k => [...L[k], ...batches.flatMap(b => b[k] || [])];
const CO = all("co"), PR = all("pr"), SRC = all("src"), CU = all("cu"), CR = all("cr"), ST = all("st");
// Batch-1 taxonomy plus the 2.0 extensions (K wafer manufacturing, L subfab & facilities).
// Bill-of-material codes (laser source, galvo, …) are accepted where earlier records already use them.
const BOM = PR.filter(p => /^BOM\d|^SUB-/.test(p.eqid));
const TAX = new Set([...L.tax.map(t => t.id), ...TAXONOMY_GROUPS_EXT.map(([k]) => k), ...TAXONOMY_EXT.map(([code]) => code), ...BOM.map(p => p.eqid)]);
const TAX_NAME = Object.fromEntries([...L.tax.map(t => [t.id, t.n]), ...TAXONOMY_EXT.map(([code, , n]) => [code, n]), ...BOM.map(p => [p.eqid, p.eq])]);
const nextId = (list, prefix, width) => prefix + String(Math.max(0, ...list.map(x => parseInt(String(x.id).replace(/\D/g, ""), 10) || 0)) + 1).padStart(width, "0");
const COUNTRY = new Map(COUNTRIES.map(([n]) => [n.toLowerCase(), n])); Object.entries(COUNTRY_ALIASES).forEach(([a, n]) => COUNTRY.set(a.toLowerCase(), n));
const pick = (r, ...ks) => { for (const k of ks) if (r[k] != null && String(r[k]).trim() !== "") return String(r[k]).trim(); return ""; };
const NA = v => (v === "" || v == null ? "N/A" : v);
const isURL = s => { try { const u = new URL(s); return /^https?:$/.test(u.protocol); } catch { return false; } };
const isDate = s => /^\d{4}(-\d\d){0,2}$/.test(s);
const VER = ["VERIFIED", "PARTIALLY_VERIFIED", "UNVERIFIED"], CONF = ["HIGH", "MEDIUM", "LOW", "UNVERIFIED"];
// Age class of a source date relative to today (same classes as Batch 1).
const TODAY = new Date();
function ageOf(date) {
  if (!date || !isDate(date)) return "UNDATED";
  const [y, m = 6] = date.split("-").map(Number);
  const months = (TODAY.getFullYear() - y) * 12 + (TODAY.getMonth() + 1 - m);
  return months <= 12 ? "CURRENT" : months <= 24 ? "AGING" : months <= 60 ? "STALE" : "VERY_STALE";
}
// How the source was accessed: Y = read directly; SEARCH_INDEX = official URL + title confirmed via web search, page not read.
const ACCESS = ["Y", "SEARCH_INDEX", "DATA_NOT_ACCESSIBLE"];
const LASER_CODE = Object.fromEntries(L.lt.map(([code, name]) => [name.toLowerCase(), code]));

// ---------------------------------------------------------------- sources embedded in rows
const newSources = [];   // committed sources (from accepted rows only)
let pending = [];        // sources proposed by the row currently being validated
function resolveSources(r, errs) {
  const ids = (Array.isArray(r.sources) ? pick(r, "source_ids") : pick(r, "source_ids", "sources")).split(/[;,\s]+/).filter(Boolean);
  ids.forEach(id => { if (![...SRC, ...newSources, ...pending].some(s => s.id === id)) errs.push(`unknown source id ${id}`); });
  // One source from the flat source_* columns, plus any in a JSON `sources` array.
  const specs = [];
  if (pick(r, "source_url")) specs.push({ url: pick(r, "source_url"), title: pick(r, "source_title"), publisher: pick(r, "source_publisher", "publisher"), type: pick(r, "source_type"),
    tier: pick(r, "source_tier"), date: pick(r, "source_date", "evidence_date", "publication_date"), access: pick(r, "source_access"), excerpt: pick(r, "source_excerpt", "excerpt") });
  (Array.isArray(r.sources) ? r.sources : []).forEach(x => specs.push(Object.fromEntries(Object.entries(x).map(([k, v]) => [k, v == null ? "" : String(v).trim()]))));
  for (const x of specs) {
    const url = x.url, date = x.date || "";
    if (!isURL(url)) { errs.push(`invalid source url ${url}`); continue; }
    if (date && !isDate(date)) errs.push(`source date "${date}" is not ISO (YYYY, YYYY-MM or YYYY-MM-DD)`);
    const acc = x.access || pick(r, "source_access") || "Y"; if (!ACCESS.includes(acc)) errs.push(`source access must be one of ${ACCESS}`);
    const existing = [...SRC, ...newSources, ...pending].find(s => s.url === url);
    if (existing) { ids.push(existing.id); continue; }
    const id = nextId([...SRC, ...newSources, ...pending], "S", 4);
    pending.push({ id, url, title: x.title || url, pub: NA(x.publisher), type: x.type || "Official website", tier: +x.tier || 1, date: date || "UNKNOWN", acc, exc: NA(x.excerpt),
      age: ageOf(date), note: `Imported ${batchName}`, used: 1 });
    ids.push(id);
  }
  if (!ids.length) errs.push("no source (source_ids, source_url or sources[] required — records without evidence are not accepted)");
  return [...new Set(ids)];
}

// ---------------------------------------------------------------- VALIDATE + NORMALISE + DEDUPLICATE
const accepted = [], rejected = [], warnings = [];
const staged = { co: [], pr: [], src: [], st: [], cu: [], cr: [] };
const STATUS = ["CONFIRMED", "PROBABLE", "UNVERIFIED"];
input.forEach((r, i) => {
  const errs = [], warns = [], line = i + 2;
  pending = [];
  if (entity === "sources") {
    const url = pick(r, "url", "source_url"); if (!isURL(url)) errs.push("invalid url");
    const date = pick(r, "date", "publication_date"); if (date && !isDate(date)) errs.push("date not ISO");
    if (SRC.some(s => s.url === url)) errs.push(`duplicate of existing source ${SRC.find(s => s.url === url).id}`);
    if (!errs.length) { const id = nextId([...SRC, ...staged.src], "S", 4); staged.src.push({ id, url, title: pick(r, "title") || url, pub: NA(pick(r, "publisher")), type: pick(r, "type") || "Official website", tier: +pick(r, "tier") || 1, date: date || "UNKNOWN", acc: "Y", exc: NA(pick(r, "excerpt")), age: date ? "CURRENT" : "UNDATED", note: `Imported ${batchName}`, used: 0 }); }
  } else if (entity === "companies") {
    const name = pick(r, "name", "company", "company_name");
    if (!name) errs.push("company name cannot be blank");
    const cRaw = pick(r, "country"); const country = cRaw ? COUNTRY.get(cRaw.toLowerCase()) : null;
    if (cRaw && !country) errs.push(`country "${cRaw}" does not map to the country reference`);
    const cats = pick(r, "equipment_categories", "categories", "cats").split(/[;,\s]+/).filter(Boolean);
    cats.forEach(c => { if (!TAX.has(c)) errs.push(`unknown equipment category ${c}`); });
    const web = pick(r, "website"); if (web && !isURL(web)) errs.push(`invalid website ${web}`);
    const ver = pick(r, "verification").toUpperCase() || "UNVERIFIED"; if (!VER.includes(ver)) errs.push(`verification must be one of ${VER}`);
    const cl = pick(r, "confidence").toUpperCase() || "LOW"; if (!CONF.includes(cl)) errs.push(`confidence must be one of ${CONF}`);
    const src = resolveSources(r, errs);
    const nn = normName(name);
    const exact = CO.find(c => normName(c.n) === nn);
    if (exact && !opt("allow-duplicates")) errs.push(`duplicate of existing company ${exact.id} (${exact.n}) — use --allow-duplicates only for genuinely distinct entities`);
    CO.filter(c => c !== exact && similarity(normName(c.n), nn) >= 0.72).forEach(c => warns.push(`possible duplicate of ${c.id} ${c.n} (similarity ${similarity(normName(c.n), nn).toFixed(2)})`));
    if (!errs.length) { const id = nextId([...CO, ...staged.co], "C", 4);
      staged.co.push({ id, n: name, c: country || "N/A", city: NA(pick(r, "city")), t: pick(r, "company_type", "type") || "Equipment OEM", lv: pick(r, "level") || "LV1", cats: cats.join(";") || "N/A",
        eq: NA(pick(r, "primary_equipment")), f: NA(pick(r, "description", "focus")), st: ver, cs: { HIGH: 90, MEDIUM: 70, LOW: 50, UNVERIFIED: 20 }[cl], cl, cc: "UNCLASSIFIED", ccb: "No ranking or revenue evidence",
        own: NA(pick(r, "ownership")), ex: NA(pick(r, "exchange")), tk: NA(pick(r, "ticker")), web: NA(web), rev: "N/A", rfy: "N/A", rorig: "N/A", emp: NA(pick(r, "employees")), fd: NA(pick(r, "founded")),
        par: NA(pick(r, "parent")), subs: NA(pick(r, "subsidiaries")), ind: pick(r, "india_presence") || "Not documented", cn: "N/A", jp: "N/A", kr: "N/A", tw: "N/A", src: src.join(";"), cand: "N/A", why: "N/A", note: pick(r, "notes") || `Imported ${batchName}`,
        evd: pick(r, "evidence_depth").toUpperCase() || "CONTENT", cb: country ? (pick(r, "country_basis").toUpperCase() || "SRC") : "KNOW", semi: "N/A" });
      const s = r.startup;
      if (s && typeof s === "object") {
        const sv = k => NA(s[k] == null ? "" : String(s[k]).trim());
        staged.st.push({ company_id: id, company: name, country: country || "N/A", technology: NA(pick(r, "primary_equipment")), founders: sv("founders"), year: sv("year"), funding: sv("funding"),
          investors: sv("investors"), product: sv("product"), trl: sv("trl"), customers: sv("customers"), partnerships: sv("partnerships"), patents: "N/A", website: NA(web),
          latest_funding_date: sv("latest_funding_date"), latest_news: sv("latest_news"), maturity: sv("maturity"), source_ids: src.join(";"), verification_status: ver, confidence_level: cl });
      } }
  } else if (entity === "models") {
    const mRef = pick(r, "manufacturer", "company", "company_id");
    const co = [...CO, ...staged.co].find(c => c.id === mRef || normName(c.n) === normName(mRef));
    if (!co) errs.push(`model cannot exist without a known manufacturer ("${mRef}" not found — import the company first)`);
    const fam = pick(r, "family", "product_family"); if (!fam) errs.push("product family is required");
    const eqid = pick(r, "equipment_code", "equipment_category"); if (!TAX.has(eqid)) errs.push(`unknown equipment category ${eqid}`);
    const ver = pick(r, "verification").toUpperCase() || "UNVERIFIED"; if (!VER.includes(ver)) errs.push(`verification must be one of ${VER}`);
    const cl = pick(r, "confidence").toUpperCase() || "LOW"; if (!CONF.includes(cl)) errs.push(`confidence must be one of ${CONF}`);
    const wafer = pick(r, "wafer", "wafer_size"); const w = normWafer(wafer || null);
    if (wafer && w && !w.sizes_mm.length && !w.range_mm) warns.push(`wafer "${wafer}" could not be normalised; kept verbatim`);
    const src = resolveSources(r, errs);
    const mdl = pick(r, "model_number", "model");
    if (co && mdl && PR.some(p => p.co === co.id && String(p.mdl).toLowerCase() === mdl.toLowerCase()) && !opt("allow-duplicates")) errs.push(`duplicate model ${mdl} for ${co.n}`);
    const tax = L.tax.find(t => t.id === eqid) || (TAX_NAME[eqid] ? { n: TAX_NAME[eqid], ps: /^K/.test(eqid) ? "PS01" : "PSX4" } : null);
    if (!errs.length) { const id = nextId([...PR, ...staged.pr], "P", 5);
      staged.pr.push({ id, co: co.id, cn: co.n, cat: eqid[0], eqid, eq: tax?.n || eqid, fam, mdl: NA(mdl), tech: NA(pick(r, "technology")), ps: tax?.ps || "N/A", psn: "N/A", app: NA(pick(r, "application")),
        seg: NA(pick(r, "segment")), wafer: NA(wafer), thr: NA(pick(r, "throughput")), acc: NA(pick(r, "accuracy")), lt: NA(pick(r, "laser_type")), ltc: "N/A", wl: NA(pick(r, "wavelength")), pw: NA(pick(r, "power")),
        st: (pick(r, "lifecycle") || "UNKNOWN").toUpperCase(), mat: NA(pick(r, "maturity")), mev: NA(pick(r, "maturity_evidence")), ver, cl, src: src.join(";"), age: ageOf(pick(r, "source_date", "evidence_date")), teal: "N/A", price: "N/A", las: !!pick(r, "laser_type"),
        ls: NA(pick(r, "laser_source")), pd: NA(pick(r, "pulse_duration")), rr: NA(pick(r, "repetition_rate")), pe: NA(pick(r, "pulse_energy")), lmat: NA(pick(r, "material")), scan: "N/A", motion: "N/A", dims: NA(pick(r, "footprint")), thk: "N/A",
        note: pick(r, "notes") || `Imported ${batchName}`, specs: [] });
      const lt = pick(r, "laser_type"); if (lt) staged.pr[staged.pr.length - 1].ltc = lt.split(/;\s*/).map(x => LASER_CODE[x.toLowerCase()]).filter(Boolean).join(";") || "N/A"; }
  } else if (entity === "customers") {
    const name = pick(r, "name", "customer", "customer_name");
    if (!name) errs.push("customer name cannot be blank");
    const cRaw = pick(r, "country"); const country = cRaw && cRaw !== "N/A" ? COUNTRY.get(cRaw.toLowerCase()) : null;
    if (cRaw && cRaw !== "N/A" && !country) errs.push(`country "${cRaw}" does not map to the country reference`);
    const dup = [...CU, ...staged.cu].find(c => normName(c.customer_name) === normName(name));
    if (dup) errs.push(`duplicate of existing customer ${dup.customer_id} (${dup.customer_name})`);
    const src = resolveSources(r, errs);
    if (!errs.length) {
      const id = "CU" + String(Math.max(0, ...[...CU, ...staged.cu].map(c => +c.customer_id.slice(2)).filter(n => n < 900)) + 1).padStart(3, "0");
      staged.cu.push({ customer_id: id, customer_name: name, customer_type: pick(r, "type", "customer_type") || "N/A", country: country || "N/A", key_sites: NA(pick(r, "sites", "key_sites")),
        source_ids: src.join(";"), relationships: 0, confirmed: 0 });
    }
  } else if (entity === "customer_links") {
    const oRef = pick(r, "oem", "manufacturer", "company");
    const co = [...CO, ...staged.co].find(c => c.id === oRef || normName(c.n) === normName(oRef));
    if (!co) errs.push(`supplier "${oRef}" not found — import the company first`);
    const cRef = pick(r, "customer", "customer_id");
    const undisclosed = /^UNDISCLOSED:/i.test(cRef);
    const cu = undisclosed ? CU.find(c => c.customer_id === "CU900") : [...CU, ...staged.cu].find(c => c.customer_id === cRef || normName(c.customer_name) === normName(cRef));
    if (!cu) errs.push(`customer "${cRef}" not found — import it with --entity customers first`);
    const mdl = pick(r, "model", "model_number");
    const pr = co && mdl ? [...PR, ...staged.pr].find(p => p.co === co.id && String(p.mdl).toLowerCase() === mdl.toLowerCase()) : null;
    if (mdl && co && !pr) errs.push(`model "${mdl}" not found for ${co.n}`);
    const st = (pick(r, "status") || "UNVERIFIED").toUpperCase(); if (!STATUS.includes(st)) errs.push(`status must be one of ${STATUS}`);
    const cl = pick(r, "confidence").toUpperCase() || "LOW"; if (!CONF.includes(cl)) errs.push(`confidence must be one of ${CONF}`);
    const date = pick(r, "date"); if (date && !isDate(date)) errs.push(`date "${date}" is not ISO`);
    const src = resolveSources(r, errs);
    if (co && cu && [...CR, ...staged.cr].some(x => x.co === co.id && x.cu === cu.customer_id && x.pid === (pr ? pr.id : "N/A") && (!undisclosed || x.cust === cRef.slice(12).trim()))) errs.push("duplicate customer link");
    if (!errs.length) {
      const id = "CR" + String(Math.max(0, ...[...CR, ...staged.cr].map(x => +x.id.slice(2))) + 1).padStart(3, "0");
      staged.cr.push({ id, co: co.id, oem: co.n, pid: pr ? pr.id : "N/A", prod: pr ? `${pr.fam} ${pr.mdl === "N/A" ? "" : pr.mdl}`.trim() : "N/A", cu: cu.customer_id,
        cust: undisclosed ? cRef.slice(12).trim() : cu.customer_name, cc: undisclosed ? "N/A" : cu.country, loc: NA(pick(r, "location")), fab: NA(pick(r, "fab")),
        ps: pr ? pr.ps : "N/A", app: NA(pick(r, "application") || (pr ? pr.app : "")), st, stage: pick(r, "stage") || "N/A", ev: pick(r, "evidence") || "N/A", src: src.join(";"), date: date || "N/A", cl });
    }
  }
  if (!errs.length) newSources.push(...pending);
  (errs.length ? rejected : accepted).push({ line, name: pick(r, "name", "company", "family", "title", "url", "oem"), errors: errs, warnings: warns });
  warns.forEach(w => warnings.push(`line ${line}: ${w}`));
});
staged.src.push(...newSources);

console.log(`Import ${entity} from ${file} → ${accepted.length} accepted, ${rejected.length} rejected, ${warnings.length} warnings, ${staged.src.length} new sources`);
rejected.forEach(r => console.log(`  REJECT line ${r.line} ${r.name}: ${r.errors.join("; ")}`));
warnings.forEach(w => console.log(`  WARN ${w}`));
if (opt("write") && accepted.length) {
  fs.mkdirSync(batchDir, { recursive: true });
  const cur = fs.existsSync(BATCH_FILE) ? JSON.parse(fs.readFileSync(BATCH_FILE, "utf8")) : { batch: batchName, created: new Date().toISOString().slice(0, 10), co: [], pr: [], src: [] };
  Object.keys(staged).forEach(k => { if (staged[k].length || cur[k]) cur[k] = [...(cur[k] || []), ...staged[k]]; });
  fs.writeFileSync(BATCH_FILE, JSON.stringify(cur, null, 1));
  console.log(`Staged into ${path.relative(ROOT, BATCH_FILE)}. Run \`npm run build\` to link, quality-check and publish.`);
} else if (!opt("write")) console.log("Dry run — nothing written. Re-run with --write to stage accepted rows.");
process.exit(rejected.length && !accepted.length ? 1 : 0);

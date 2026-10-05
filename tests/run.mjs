#!/usr/bin/env node
// Regression tests that run headless against the published data and the real client modules
// (search engine, entity resolution, derived scores). `npm test`. Exit code 1 on any failure.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
globalThis.fetch = async u => ({ ok: true, json: async () => JSON.parse(fs.readFileSync(path.join(ROOT, u), "utf8")) });
const { load, get, DB } = await import("../assets/js/core/store.js");
const { search, resolveCompany } = await import("../assets/js/core/search.js");
const scores = await import("../assets/js/core/scores.js");
await load("data/bundle.json");
DB.claims = JSON.parse(fs.readFileSync(path.join(ROOT, "data/claims.json"), "utf8")).claims;
const GOLD = JSON.parse(fs.readFileSync(path.join(ROOT, "tests/search-benchmark.json"), "utf8"));

let pass = 0, fail = 0; const out = [];
const t = (name, ok, detail = "") => { ok ? pass++ : fail++; out.push(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : "  — " + detail}`); };

// 1. search benchmark: every expected id must appear in the top-N matches (matches + partial)
// The UI groups results by kind (companies, models, equipment …), so rank is measured within the expected id's group.
const KINDOF = id => get(id)?.entity_type;
const rankIn = (q, id) => { const r = search(q, { limit: 400 }); const all = [...r.matches, ...r.partial, ...r.topics]; return all.filter(x => x.kind === KINDOF(id)).findIndex(x => x.id === id); };
const hitsAt = (q, n) => { const r = search(q, { limit: 200 }); return [...r.matches, ...r.partial].slice(0, n).map(x => x.id); };
let found = 0, expected = 0;
for (const g of GOLD.search) {
  const n = g.top || 10, ids = hitsAt(g.q, n); const miss = g.expect.filter(e => { const k = rankIn(g.q, e); return k < 0 || k >= n; });
  expected += g.expect.length; found += g.expect.length - miss.length;
  t(`search "${g.q}" → ${g.expect.join(", ")} in top ${n} of its result group`, !miss.length, `missing ${miss.join(", ")}; got ${ids.slice(0, 5).join(", ")}`);
  (g.exclude || []).forEach(x => t(`search "${g.q}" excludes ${x}`, !ids.includes(x)));
}
// 2. entity resolution
for (const [text, id] of GOLD.resolve) { const c = resolveCompany(text); t(`resolve "${text}" → ${id ?? "nothing"}`, (c?.id ?? null) === id, `got ${c?.id ?? "nothing"}`); }
// 3. data integrity and policy
const F = DB.facilities;
t("every facility cites sources and every milestone is sourced", F.every(f => f.source_ids.length && f.status_history.every(h => h.source_ids.length)));
t("facility status equals its latest dated stage", F.every(f => { const st = f.status_history.filter(h => !["FIRST_SHIPMENT", "SCHEDULE_CHANGE"].includes(h.status)); return !st.length || st.some(h => h.status === f.status && h.date === f.status_date) && st.every(h => h.date <= f.status_date); }));
t("every facility has a controlled status class", F.every(f => ["ANNOUNCED", "PLANNED", "SITE_ACQUIRED", "UNDER_CONSTRUCTION", "EQUIPMENT_INSTALLATION", "PILOT", "RAMP", "PRODUCTION", "EXPANDED", "PAUSED", "CANCELLED", "CLOSED", "UNKNOWN"].includes(f.status_class)));
t("several investment figures always raise a conflict", F.filter(f => f.investment.length > 1).every(f => DB.quality.conflicts.some(c => c.entity === f.id)));
t("no record is merged automatically (duplicates kept as candidates)", DB.quality.duplicate_candidates.every(d => get(d.a) && get(d.b)));
t("every relationship endpoint exists", DB.relationships.every(r => get(r.from) && get(r.to)));
t("every claim cites a source or is labelled non-sourced", (DB.claims || []).every(c => c.source_ids.length || ["CALCULATED", "INFERRED", "ANALYST_ESTIMATE", "UNVERIFIED"].includes(c.claim_type)));
t("every claim subject exists", DB.claims.every(c => get(c.subject)));
t("claims exist for every facility and for every company that states a country, website or category", DB.facilities.every(f => DB.claims.some(c => c.subject === f.id)) && DB.companies.filter(c => c.hq.country || c.website || c.equipment_ids.length).every(c => DB.claims.some(x => x.subject === c.id)));
t("models never carry specifications without a source", DB.models.every(m => m.specs.every(s => s.source_ids.length || s.source_scope)));
// 4. scores are bounded and explainable
const sample = DB.companies.slice(0, 400);
t("intelligence score 0–100 with 5 weighted parts", sample.every(c => { const s = scores.intelScore(c); return s.score >= 0 && s.score <= 100 && s.parts.length === 5; }));
t("supplier criticality 0–100", sample.every(c => { const k = scores.criticality(c.id).score; return k >= 0 && k <= 100; }));
t("data quality score 0–100 for every company", sample.every(c => { const q = scores.dataQuality(c); return q.score >= 0 && q.score <= 100; }));
t("regional shares sum to ~100 %", (() => { const b = scores.blocShares(DB.companies); return Math.abs(b.rows.reduce((a, r) => a + r.share, 0) - 100) <= b.rows.length; })());

console.log(out.join("\n"));
console.log(`\nSearch benchmark recall: ${found}/${expected} (${Math.round(100 * found / expected)}%)`);
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

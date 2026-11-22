#!/usr/bin/env node
// Validates the published data files (data/*.json) independently of the build. Exit code 1 on any error.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateAll } from "./lib/validate.mjs";

const DATA = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../data");
const read = f => JSON.parse(fs.readFileSync(path.join(DATA, f), "utf8"));
const kinds = ["companies", "product_families", "models", "equipment", "processes", "technologies", "materials", "applications", "subsystems", "components", "suppliers", "fabs", "osats", "customers", "facilities", "countries", "deals", "relationships", "sources"];
const E = Object.fromEntries(kinds.map(k => [k, read(k + ".json")]));
const q = read("quality.json");
const r = validateAll(E, { conflicts: q.conflicts });
const bundle = read("bundle.json");
const drift = kinds.filter(k => JSON.stringify(bundle[k]) !== JSON.stringify(E[k]));
if (drift.length) r.errors.push(...drift.map(k => ({ rule: "bundle.sync", message: `bundle.json is out of sync with ${k}.json — run npm run build` })));
console.log(`Validated ${r.checked_records} records: ${r.errors.length} errors, ${r.warnings.length} warnings`);
Object.entries(r.by_rule).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
r.errors.slice(0, 50).forEach(e => console.log("ERROR " + e.rule + ": " + e.message));
process.exit(r.errors.length ? 1 : 0);

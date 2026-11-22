#!/usr/bin/env node
// Browser smoke test: renders every route in routes.json against a local static server and fails on
// console errors, uncaught exceptions or a "view could not be rendered" banner. Conflict banners are expected
// on records with open conflicts and are reported, not failed.
//   python3 -m http.server 8765 &   then   node tests/browser/smoke.mjs [http://localhost:8765/]
// Uses the Playwright already installed on the machine (PLAYWRIGHT_PATH or the global npm root).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { unlock } from "./unlock.mjs";
const here = path.dirname(fileURLToPath(import.meta.url));
const base = process.argv[2] || "http://localhost:8765/";
const pw = process.env.PLAYWRIGHT_PATH || path.join(execSync("npm root -g").toString().trim(), "playwright");
const { chromium } = createRequire(import.meta.url)(pw);
const { routes } = JSON.parse(fs.readFileSync(path.join(here, "routes.json"), "utf8"));
const exe = ["/opt/pw-browsers/chromium", process.env.CHROMIUM_PATH].find(p => p && fs.existsSync(p));
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
const page = await browser.newPage({ viewport: { width: 1300, height: 900 } });
await unlock(page);
let errs = [];
page.on("pageerror", e => errs.push(e.message));
page.on("console", m => { if (m.type() === "error" && !/favicon|net::ERR/.test(m.text())) errs.push(m.text()); });
let failed = 0, conflicts = 0;
for (const r of routes) {
  errs = []; const t0 = Date.now();
  await page.goto(base + r); await page.waitForSelector("main h1, main .empty, main .callout", { timeout: 15000 }).catch(() => errs.push("no heading rendered"));
  await page.waitForTimeout(120);
  const crash = await page.$$eval("main .callout.crit", els => els.some(e => /could not be rendered/.test(e.textContent)));
  const conflict = await page.$$eval("main .callout", els => els.some(e => /Conflicting source data/.test(e.textContent)));
  const title = await page.title();
  if (crash) errs.push("view could not be rendered");
  if (errs.length) failed++; if (conflict) conflicts++;
  console.log(`${errs.length ? "FAIL" : "ok  "} ${r.padEnd(70)} | ${title.slice(0, 50)} | ${Date.now() - t0}ms${conflict ? " | conflict banner (expected)" : ""}${errs.length ? "\n      " + errs.join("\n      ") : ""}`);
}
await browser.close();
console.log(`\n${routes.length - failed}/${routes.length} routes rendered without errors · ${conflicts} with an expected conflict banner`);
process.exit(failed ? 1 : 0);

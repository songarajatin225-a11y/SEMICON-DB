#!/usr/bin/env node
// Passcode screen checks. The correct passcode is never stored in the repository: the unlock path runs only when
// SEMICONDB_PASSCODE is set in the environment, e.g.
//   SEMICONDB_PASSCODE=… node tests/browser/gate.mjs [http://localhost:8765/]
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { GATE_HASH, GATE_KEY } from "./unlock.mjs";
const base = process.argv[2] || "http://localhost:8765/";
const pw = process.env.PLAYWRIGHT_PATH || path.join(execSync("npm root -g").toString().trim(), "playwright");
const { chromium } = createRequire(import.meta.url)(pw);
const exe = ["/opt/pw-browsers/chromium", process.env.CHROMIUM_PATH].find(p => p && fs.existsSync(p));
const b = await chromium.launch(exe ? { executablePath: exe } : {});
let pass = 0, fail = 0; const t = (name, ok, got) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  — got ${got}`}`); };

let p = await b.newPage({ viewport: { width: 1300, height: 900 } });
const fetched = []; p.on("request", r => fetched.push(r.url()));
const errs = []; p.on("pageerror", e => errs.push(e.message));
await p.goto(base + "#/companies"); await p.waitForSelector(".gate input");
t("locked visitor sees the passcode screen", await p.isVisible(".gate h1"), "no gate");
t("app shell stays hidden while locked", (await p.$eval(".hdr", e => getComputedStyle(e).visibility)) === "hidden", "header visible");
t("passcode screen shows the creator credit", (await p.textContent(".gate")).includes("Created by Jatin Songara"), "no credit");
t("passcode field is focused", await p.evaluate(() => document.activeElement?.id === "gate-code"), "not focused");
await p.waitForTimeout(300);
t("no data is downloaded while locked", !fetched.some(u => /data\/(bundle|claims)\.json/.test(u)), fetched.filter(u => /data\//.test(u)).join(","));
t("page source does not contain a plain-text passcode field value", !(await p.content()).includes("value=\""), "value attribute present");

await p.fill("#gate-code", "not-the-passcode"); await p.press("#gate-code", "Enter");
await p.waitForFunction(() => document.querySelector(".gate-err")?.textContent.length > 0, null, { timeout: 15000 });
t("wrong passcode shows an error and stays locked", (await p.isVisible(".gate")) && (await p.$eval("#gate-code", e => e.getAttribute("aria-invalid"))) === "true", "unlocked or no error");
t("wrong passcode does not store an unlock", (await p.evaluate(k => localStorage.getItem(k), GATE_KEY)) === null, "stored");

await p.fill("#gate-code", ""); await p.press("#gate-code", "Enter");
t("empty submission asks for the passcode", (await p.$eval(".gate-err", e => e.textContent)).includes("Enter the passcode"), "no prompt");

const code = process.env.SEMICONDB_PASSCODE;
if (code) {
  await p.fill("#gate-code", code); await p.press("#gate-code", "Enter");
  await p.waitForSelector("main h1", { timeout: 20000 });
  t("correct passcode unlocks and loads the app", !(await p.$(".gate")) && (await p.$eval("main h1", e => e.textContent)).includes("Companies"), "still locked");
  t("footer and sidebar show the creator credit", (await p.textContent("footer.foot")).includes("Created by Jatin Songara") && (await p.textContent("#rail")).includes("Created by Jatin Songara"), "no credit");
  t("unlock is remembered on this device", (await p.evaluate(k => localStorage.getItem(k), GATE_KEY)) === GATE_HASH, "not stored");
  await p.reload(); await p.waitForSelector("main h1");
  t("reload stays unlocked", !(await p.$(".gate")), "gate shown again");
  await p.click("#lockbtn"); await p.waitForSelector(".gate input");
  t("Lock asks for the passcode again", (await p.evaluate(k => localStorage.getItem(k), GATE_KEY)) === null, "still stored");
} else console.log("SKIP  correct-passcode path (set SEMICONDB_PASSCODE to run it)");

await p.close();
p = await b.newPage({ viewport: { width: 1300, height: 900 } });
await p.goto(base + "legacy/"); await p.waitForSelector(".gate input");
t("legacy edition shows the passcode screen", await p.isVisible(".gate h1"), "no gate");
t("legacy content is hidden while locked", (await p.evaluate(() => [...document.body.children].filter(e => !e.classList.contains("gate") && e.tagName !== "SCRIPT").every(e => getComputedStyle(e).visibility === "hidden"))), "visible content");
await p.close();
t("no page errors", errs.length === 0, errs.join(" | "));
await b.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

#!/usr/bin/env node
// Motion regression test (from the review-animations audit): drawer curves and durations, Escape closes without
// animation, pointer close still animates, reduced motion fades instead of moving, skeleton shimmer runs on
// transform with linear easing, bars / meters never transition.  node tests/browser/motion.mjs [base-url]
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
const base = process.argv[2] || "http://localhost:8765/";
const pw = process.env.PLAYWRIGHT_PATH || path.join(execSync("npm root -g").toString().trim(), "playwright");
const { chromium } = createRequire(import.meta.url)(pw);
const exe = ["/opt/pw-browsers/chromium", process.env.CHROMIUM_PATH].find(p => p && fs.existsSync(p));
const b = await chromium.launch(exe ? { executablePath: exe } : {});
let pass = 0, fail = 0; const t = (name, ok, got) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  — got ${got}`}`); };
const DRAWER = "cubic-bezier(0.32, 0.72, 0, 1)";
let p = await b.newPage({ viewport: { width: 390, height: 800 } });
await p.goto(base + "#/companies"); await p.waitForSelector("main h1");
const sk = await p.evaluate(() => { const d = document.createElement("div"); d.className = "sk"; document.body.appendChild(d); const c = getComputedStyle(d, "::after"); const r = [c.animationName, c.animationTimingFunction, c.transform]; d.remove(); return r; });
t("skeleton shimmer animates a transform with linear easing", sk[0] === "sk" && sk[1] === "linear" && sk[2].startsWith("matrix"), sk.join(" "));
const bar = await p.evaluate(() => { const s = document.createElement("span"); s.innerHTML = '<span class="bar"><span class="trk"><span class="fill"></span></span></span>'; document.body.appendChild(s); const d = getComputedStyle(s.querySelector(".fill")).transitionDuration; s.remove(); return d; });
t("bars never transition", bar === "0s", bar);
const rail = await p.$eval(".rail", e => getComputedStyle(e).transition);
t("nav rail: transform 200ms on the drawer curve", rail === `transform 0.2s ${DRAWER}`, rail);
await p.click("#menubtn"); await p.waitForTimeout(30);
t("nav rail opens with an animation (pointer)", (await p.$eval(".rail", e => e.getAnimations().length)) === 1, "no animation");
await p.waitForTimeout(350); await p.keyboard.press("Escape");
const esc = await p.evaluate(() => [document.body.classList.contains("nav-open"), document.querySelector(".rail").getAnimations().length, document.querySelector("#menubtn").getAttribute("aria-expanded")]);
t("Escape closes the rail instantly and resets aria-expanded", !esc[0] && esc[1] === 0 && esc[2] === "false", esc.join(","));
await p.click("#menubtn"); await p.waitForTimeout(350); await p.click("#menubtn"); await p.waitForTimeout(30);
t("closing the rail by tap still animates", (await p.$eval(".rail", e => e.getAnimations().length)) === 1, "no animation");
await p.goto(base + "#/products"); await p.waitForSelector("main h1");
await p.click('.filters-toggle:not([aria-label="Close filters"])'); await p.waitForTimeout(30);
const sheet = await p.$eval(".facets", e => [getComputedStyle(e).transition, e.getAnimations().length]);
t("filter sheet: transform 280ms on the drawer curve, animates open", sheet[0] === `transform 0.28s ${DRAWER}` && sheet[1] === 1, sheet.join(" | "));
await p.waitForTimeout(400); await p.keyboard.press("Escape");
t("Escape closes the filter sheet instantly", (await p.evaluate(() => [document.body.classList.contains("facets-open"), document.querySelector(".facets").getAnimations().length].join())) === "false,0", "still animating");
await p.close();
p = await b.newPage({ viewport: { width: 390, height: 800 }, reducedMotion: "reduce" });
await p.goto(base + "#/companies"); await p.waitForSelector("main h1");
await p.click("#menubtn"); await p.waitForTimeout(30);
const rm = await p.$eval(".rail", e => e.getAnimations().map(a => a.transitionProperty).join(","));
t("reduced motion: rail fades (opacity) and does not slide", rm === "opacity", rm);
const sk2 = await p.evaluate(() => { const d = document.createElement("div"); d.className = "sk"; document.body.appendChild(d); const n = getComputedStyle(d, "::after").animationName; d.remove(); return n; });
t("reduced motion: skeleton shimmer is off", sk2 === "none", sk2);
await b.close();
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);

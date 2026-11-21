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
// a non-centre graph node whose circle centre is not covered by another node: [id, x, y]
const clickableNode = page => page.evaluate(() => { for (const a of document.querySelectorAll(".graphbox a.gnode:not(.gcenter)")) {
  const r = a.querySelector("circle").getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
  if (y > 60 && document.elementFromPoint(x, y)?.closest("a.gnode") === a) return [a.dataset.node, x, y]; } return null; });

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
// press feedback (find-animation-opportunities row 1)
await p.setViewportSize({ width: 1300, height: 900 }); await p.goto(base + "#/companies/CMP-000010"); await p.waitForSelector("main h1");
const btn = await p.$("main .qa .btn"); const bb = await btn.boundingBox();
t("buttons transition transform 160ms on the UI curve", (await btn.evaluate(e => getComputedStyle(e).transition)) === "transform 0.16s cubic-bezier(0.23, 1, 0.32, 1)", await btn.evaluate(e => getComputedStyle(e).transition));
await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.mouse.down(); await p.waitForTimeout(260);
const pressed = await btn.evaluate(e => getComputedStyle(e).transform);
await p.mouse.up(); await p.mouse.move(5, 5); await p.waitForTimeout(260);
const released = await btn.evaluate(e => getComputedStyle(e).transform);
t("button scales to 0.97 while pressed and returns on release", pressed === "matrix(0.97, 0, 0, 0.97, 0, 0)" && (released === "none" || released === "matrix(1, 0, 0, 1, 0, 0)"), `${pressed} -> ${released}`);
// toast enters and exits through the bottom edge (row 2)
await p.evaluate(() => import("/assets/js/core/util.js").then(m => m.toast("Test toast")));
await p.waitForSelector(".toast"); await p.waitForTimeout(30);
const enter = await p.$eval(".toast", e => e.getAnimations().map(a => a.transitionProperty).sort().join(","));
t("toast enters with opacity + transform transitions", enter === "opacity,transform", enter);
await p.waitForTimeout(2300);
const exit = await p.evaluate(() => { const e = document.querySelector(".toast"); return e ? [e.classList.contains("out"), e.getAnimations().map(a => a.transitionProperty).sort().join(",")].join("|") : "gone"; });
t("toast exits through the same edge (.out, animated)", exit === "true|opacity,transform", exit);
await p.waitForTimeout(700);
t("toast is taken out of the DOM after its exit", (await p.$$(".toast")).length === 0, "still in DOM");
// sources drawer entrance (row 3): pointer → short entrance; keyboard → instant
await p.goto(base + "#/companies/CMP-000010"); await p.waitForSelector("main h1");
await p.click("main [data-sources]"); await p.waitForSelector("#drawer"); await p.waitForTimeout(20);
const dr = await p.evaluate(() => [document.querySelector("#drawer").getAnimations().map(a => a.transitionProperty).sort().join(","), document.querySelector("#dr-scrim").getAnimations().map(a => a.transitionProperty).join(",")].join("|"));
t("sources drawer enters (transform + opacity) and scrim fades, when clicked", dr === "opacity,transform|opacity", dr);
await p.keyboard.press("Escape"); await p.waitForTimeout(50);
t("Escape closes the sources drawer at once", (await p.$$("#drawer")).length === 0, "drawer still open");
await p.focus("main [data-sources]"); await p.keyboard.press("Enter"); await p.waitForSelector("#drawer"); await p.waitForTimeout(20);
const drk = await p.evaluate(() => [document.querySelector("#drawer").classList.contains("instant"), document.querySelector("#drawer").getAnimations().length].join("|"));
t("sources drawer opened from the keyboard appears without motion", drk === "true|0", drk);
await p.keyboard.press("Escape");
// graph re-centre (row 4): clicked node travels to the centre, neighbours fade in; keyboard → no motion
await p.goto(base + "#/graph/CMP-000010"); await p.waitForSelector(".graphbox svg");
const [target, tx, ty] = await clickableNode(p);
await p.mouse.click(tx, ty);
await p.waitForFunction(id => document.querySelector(".graphbox a.gcenter")?.dataset.node === id, target); await p.waitForTimeout(40);
const flip = await p.evaluate(() => { const c = document.querySelector(".graphbox a.gcenter"); const a = c.getAnimations(); const k = a[0]?.effect.getKeyframes()[0].transform || "";
  const others = [...document.querySelectorAll(".graphbox a.gnode:not(.gcenter), .graphbox line.gedge")]; return [a.length, /translate\(/.test(k), a[0]?.effect.getTiming().duration, others.length > 0 && others.every(e => e.getAnimations().length === 1)].join("|"); });
t("graph re-centre: clicked node travels to the centre (250ms) and neighbours fade in", flip === "1|true|250|true", flip);
await p.waitForTimeout(400);
const [next] = await clickableNode(p);
await p.focus(`.graphbox a.gnode[data-node="${next}"]`); await p.keyboard.press("Enter");
await p.waitForFunction(id => document.querySelector(".graphbox a.gcenter")?.dataset.node === id, next); await p.waitForTimeout(40);
t("graph re-centre from the keyboard has no motion", (await p.$eval(".graphbox a.gcenter", e => e.getAnimations().length)) === 0, "animated");
await p.close();
p = await b.newPage({ viewport: { width: 390, height: 800 }, reducedMotion: "reduce" });
await p.goto(base + "#/companies"); await p.waitForSelector("main h1");
await p.click("#menubtn"); await p.waitForTimeout(30);
const rm = await p.$eval(".rail", e => e.getAnimations().map(a => a.transitionProperty).join(","));
t("reduced motion: rail fades (opacity) and does not slide", rm === "opacity", rm);
const sk2 = await p.evaluate(() => { const d = document.createElement("div"); d.className = "sk"; document.body.appendChild(d); const n = getComputedStyle(d, "::after").animationName; d.remove(); return n; });
t("reduced motion: skeleton shimmer is off", sk2 === "none", sk2);
await p.evaluate(() => import("/assets/js/core/util.js").then(m => m.toast("Reduced toast")));
await p.waitForSelector(".toast"); await p.waitForTimeout(30);
const rt = await p.$eval(".toast", e => e.getAnimations().map(a => a.transitionProperty).join(","));
t("reduced motion: toast fades (opacity only)", rt === "opacity", rt);
const rb = await p.$eval(".iconbtn, .btn", e => getComputedStyle(e).transitionDuration);
t("reduced motion: no press-scale transition", rb === "0s", rb);
await p.setViewportSize({ width: 1300, height: 900 });
await p.goto(base + "#/companies/CMP-000010"); await p.waitForSelector("main h1");
await p.click("main [data-sources]"); await p.waitForSelector("#drawer"); await p.waitForTimeout(20);
const rdr = await p.$eval("#drawer", e => e.getAnimations().map(a => a.transitionProperty).join(","));
t("reduced motion: sources drawer fades (opacity only)", rdr === "opacity", rdr);
await p.keyboard.press("Escape");
await p.goto(base + "#/graph/CMP-000010"); await p.waitForSelector(".graphbox svg");
const [rtarget, rx, ry] = await clickableNode(p);
await p.mouse.click(rx, ry);
await p.waitForFunction(id => document.querySelector(".graphbox a.gcenter")?.dataset.node === id, rtarget); await p.waitForTimeout(30);
const rg = await p.evaluate(() => [document.querySelector(".graphbox a.gcenter").getAnimations().length, document.querySelector(".graphbox svg").getAnimations().length].join("|"));
t("reduced motion: graph re-centre is a short fade, no travel", rg === "0|1", rg);
await b.close();
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);

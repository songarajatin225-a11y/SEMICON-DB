// Test helper: start a page already unlocked (the passcode screen is covered by tests/browser/gate.mjs).
// Reads the stored verifier from assets/js/gate.js, so the passcode itself never appears in the tests.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const src = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "../../assets/js/gate.js"), "utf8");
export const GATE_HASH = src.match(/const HASH = "([0-9a-f]{64})"/)[1];
export const GATE_KEY = src.match(/const KEY = "([^"]+)"/)[1];
export const unlock = page => page.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } }, [GATE_KEY, GATE_HASH]);

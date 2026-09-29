// Accessible side drawer (used for source evidence close to the claim it supports).
import { esc } from "../core/util.js";
let lastFocus = null;
export function openDrawer(title, html) {
  closeDrawer(false);
  lastFocus = document.activeElement;
  const scrim = document.createElement("div"); scrim.className = "scrim"; scrim.id = "dr-scrim";
  const d = document.createElement("aside"); d.className = "drawer"; d.id = "drawer"; d.setAttribute("role", "dialog"); d.setAttribute("aria-modal", "true"); d.setAttribute("aria-labelledby", "dr-title");
  d.innerHTML = `<div class="dhead"><h2 id="dr-title" style="margin:0">${esc(title)}</h2><button class="btn sm" data-drawer-close>Close</button></div><div style="margin-top:12px">${html}</div>`;
  document.body.append(scrim, d);
  scrim.addEventListener("click", () => closeDrawer());
  d.querySelector("[data-drawer-close]").focus();
}
export function closeDrawer(restore = true) {
  const d = document.getElementById("drawer"); if (!d) return false;
  d.remove(); document.getElementById("dr-scrim")?.remove();
  if (restore) lastFocus?.focus?.();
  return true;
}

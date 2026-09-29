// Saved workspace (stored locally in this browser; there is no server-side account).
import { get, hrefOf, KIND_LABEL, kindOf } from "../core/store.js";
import { esc } from "../core/util.js";
import { ws } from "../core/workspace.js";
import { href } from "../core/router.js";
import { registerActions, rerender } from "../core/actions.js";
import { pageHead, badge, empty } from "../ui/components.js";

registerActions({
  unsave: el => { ws.toggleSaved(el.dataset.v); rerender(); },
  unsearch: el => { ws.removeSearch(el.dataset.v); rerender(); },
  uncmp: el => { ws.removeComparison(+el.dataset.v); rerender(); },
  unfilter: el => { ws.removeFilter(+el.dataset.v); rerender(); },
});
export function saved() {
  const items = ws.saved().filter(id => get(id));
  const searches = ws.searches(), cmps = ws.comparisons(), filters = ws.filters(), recent = ws.recent();
  const block = (title, inner, n) => `<div class="panel sec"><h2>${esc(title)} <span class="muted small">${n}</span></h2>${inner}</div>`;
  const html = pageHead({ eyebrow: "Workspace", title: "Saved workspace", crumb: [["Home", "#/"], ["Saved", null]], lede: "Saved records, searches, filter views and comparisons. Stored only in this browser — clearing site data removes them." })
    + block("Saved records", items.length ? `<table class="spec"><tbody>${items.map(id => { const r = get(id); return `<tr><th>${esc(KIND_LABEL[kindOf(id)] || "")}</th><td><a href="${hrefOf(id)}">${esc(r.name || r.title)}</a> ${r.verification ? badge(r.verification) : ""}</td><td><button class="btn sm" data-action="unsave" data-v="${esc(id)}">Remove</button></td></tr>`; }).join("")}</tbody></table>` : empty({ title: "Nothing saved yet.", tips: ["use ☆ Save on any company, model or process page"] }), items.length)
    + block("Saved searches", searches.length ? `<table class="spec"><tbody>${searches.map(s => `<tr><th>${esc(s.at)}</th><td><a href="${href("/search", { q: s.q })}">${esc(s.label)}</a></td><td><button class="btn sm" data-action="unsearch" data-v="${esc(s.q)}">Remove</button></td></tr>`).join("")}</tbody></table>` : `<p class="na">No saved searches.</p>`, searches.length)
    + block("Saved filter views", filters.length ? `<table class="spec"><tbody>${filters.map((f, i) => `<tr><th>${esc(f.at)}</th><td><a href="${esc(f.hash)}">${esc(f.label)}</a><span class="sub mono">${esc(f.hash)}</span></td><td><button class="btn sm" data-action="unfilter" data-v="${i}">Remove</button></td></tr>`).join("")}</tbody></table>` : `<p class="na">No saved filter views. Use “☆ Save view” on the company or product explorer.</p>`, filters.length)
    + block("Saved comparisons", cmps.length ? `<table class="spec"><tbody>${cmps.map((c, i) => `<tr><th>${esc(c.at)}</th><td><a href="${href(c.kind === "company" ? "/compare/companies" : "/compare", { [c.kind === "company" ? "companies" : "models"]: c.ids })}">${esc(c.ids.map(id => get(id)?.name || id).join(" vs "))}</a></td><td><button class="btn sm" data-action="uncmp" data-v="${i}">Remove</button></td></tr>`).join("")}</tbody></table>` : `<p class="na">No saved comparisons.</p>`, cmps.length)
    + block("Recent searches", recent.length ? `<div class="tags">${recent.map(q => `<a class="tag" href="${href("/search", { q })}">${esc(q)}</a>`).join("")}</div>` : `<p class="na">None yet.</p>`, recent.length);
  return { title: "Saved", html };
}

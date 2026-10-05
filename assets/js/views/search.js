// Global search results: exact matches, partial matches (constraint value not published) and related topics.
import { search, EXAMPLES } from "../core/search.js";
import { KIND_LABEL, hrefOf, get } from "../core/store.js";
import { esc, plural } from "../core/util.js";
import { ws } from "../core/workspace.js";
import { pageHead, empty, badge } from "../ui/components.js";
import { href } from "../core/router.js";

const GROUP_ORDER = ["model", "company", "product_family", "equipment", "process", "technology", "material", "application", "subsystem", "component", "fab", "osat", "facility", "customer", "country"];
function group(items) {
  const m = new Map(); items.forEach(i => (m.get(i.kind) || m.set(i.kind, []).get(i.kind)).push(i));
  return GROUP_ORDER.filter(k => m.has(k)).map(k => [k, m.get(k)]);
}
function item(i) {
  const r = get(i.id);
  return `<li class="ritem" style="grid-template-columns:minmax(0,2fr) minmax(0,1.4fr) auto"><div><a class="ttl" href="${hrefOf(i.id)}">${esc(i.title)}</a><div class="xs muted">${esc(KIND_LABEL[i.kind] || i.kind)}</div></div>
    <div class="small ink2">${esc(i.sub || "")}${i.unknown?.length ? `<div class="xs" style="color:var(--warn)">Not published: ${esc(i.unknown.join(", "))}</div>` : ""}</div>
    <div>${r?.verification ? badge(r.verification) : ""}</div></li>`;
}
function section(title, note, items, cap = 12) {
  if (!items.length) return "";
  return `<section class="sec"><h2>${esc(title)} <span class="muted small">${items.length}</span></h2>${note ? `<p class="small muted" style="margin:-4px 0 8px">${note}</p>` : ""}
    ${group(items).map(([k, arr]) => `<h3 style="margin-top:12px">${esc(KIND_LABEL[k] || k)} <span class="muted">(${arr.length})</span></h3><ul class="rlist" style="list-style:none;padding:0;margin:0">${arr.slice(0, cap).map(item).join("")}</ul>${arr.length > cap ? `<p class="small"><a href="${href("/search", { q: new URLSearchParams(location.hash.split("?")[1]).get("q"), all: k })}">Show all ${arr.length} ${esc((KIND_LABEL[k] || k).toLowerCase())} results</a></p>` : ""}`).join("")}</section>`;
}
export function searchView({ params }) {
  const q = params.get("q") || "";
  const all = params.get("all");
  if (!q) return { title: "Search", html: pageHead({ eyebrow: "Search", title: "Search the database", lede: "Natural-language queries, abbreviations and typos are supported." }) + `<div class="tags">${EXAMPLES.map(e => `<a class="tag" href="${href("/search", { q: e })}">${esc(e)}</a>`).join("")}</div>` };
  ws.pushRecent(q);
  const r = search(q);
  const P = r.parsed;
  const cons = [
    ...P.wafer.map(w => `Wafer ${w} mm`), ...P.countries.map(c => `Country: ${c}`), ...(P.india ? ["India presence or HQ"] : []),
    ...P.materials.map(m => `Material: ${get(m.id)?.name || m.token}`), ...(P.hint ? [`Looking for: ${KIND_LABEL[P.hint] || P.hint}`] : []), ...P.phrases.map(p => `Exact: “${p}”`),
  ];
  const terms = P.terms.map(t => t.alts.length > 1 ? `${t.term} (≈ ${t.alts.filter(a => a !== t.term).slice(0, 3).join(", ")})` : t.term);
  const cap = all ? 1000 : 12;
  const only = arr => (all ? arr.filter(i => i.kind === all) : arr);
  const total = r.matches.length + r.partial.length + r.topics.length;
  const html = pageHead({ eyebrow: "Search", title: `Results for “${q}”`, crumb: [["Home", "#/"], ["Search", null]],
    actions: `<button class="btn sm" data-savesearch="${esc(q)}">☆ Save search</button><button class="btn sm" data-action="palette">Refine</button>` }) +
    `<div class="panel small"><div class="row"><b>Understood as</b>${cons.map(c => `<span class="pill">${esc(c)}</span>`).join("")}${terms.length ? `<span class="pill">Terms: ${esc(terms.join(" + "))}</span>` : ""}${!cons.length && !terms.length ? `<span class="muted">no usable terms</span>` : ""}
      <span class="muted" style="margin-left:auto">${plural(total, "result")} · ${r.ms.toFixed(0)} ms</span></div>${P.notes.length ? `<div class="xs muted" style="margin-top:4px">${esc(P.notes.join("; "))}</div>` : ""}</div>
    ${total ? "" : empty({ title: "No records matched this query.", tips: ["removing a constraint such as wafer size or country", "using a broader term (e.g. “dicing” instead of a model number)", "checking the spelling of a company name", `browsing the <a href="#/equipment">equipment taxonomy</a>`] })}
    ${section(P.wafer.length || P.countries.length || P.india || P.materials.length ? "Matches all constraints" : "Matches", "", only(r.matches), cap)}
    ${section("Partial matches", "These records match the terms but do not publish the constrained value (e.g. wafer size). They are neither confirmed nor excluded.", only(r.partial), cap)}
    ${section("Related topics", "Processes, technologies and categories matching the terms (constraints do not apply to reference topics).", only(r.topics), cap)}`;
  return { title: `Search: ${q}`, html };
}

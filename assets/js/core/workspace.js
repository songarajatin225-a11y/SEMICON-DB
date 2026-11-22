// Saved workspace (local only — there is no backend): saved records, searches, comparisons,
// recent searches, compare selections and view preferences. Everything degrades silently if storage is blocked.
import { store, toast } from "./util.js";

const MAX_MODELS = 6, MAX_COMPANIES = 4;
export const ws = {
  saved: () => store.get("saved", []),
  isSaved: id => store.get("saved", []).includes(id),
  toggleSaved(id) { const s = store.get("saved", []); const i = s.indexOf(id); if (i >= 0) s.splice(i, 1); else s.unshift(id); store.set("saved", s); toast(i >= 0 ? "Removed from saved" : "Saved to workspace"); return i < 0; },
  searches: () => store.get("savedSearches", []),
  saveSearch(q, label) { const s = store.get("savedSearches", []).filter(x => x.q !== q); s.unshift({ q, label: label || q, at: new Date().toISOString().slice(0, 10) }); store.set("savedSearches", s.slice(0, 50)); toast("Search saved"); },
  removeSearch(q) { store.set("savedSearches", store.get("savedSearches", []).filter(x => x.q !== q)); },
  recent: () => store.get("recent", []),
  pushRecent(q) { if (!q || !q.trim()) return; const r = store.get("recent", []).filter(x => x !== q); r.unshift(q); store.set("recent", r.slice(0, 12)); },
  comparisons: () => store.get("savedComparisons", []),
  saveComparison(kind, ids) { const s = store.get("savedComparisons", []); s.unshift({ kind, ids, at: new Date().toISOString().slice(0, 10) }); store.set("savedComparisons", s.slice(0, 30)); toast("Comparison saved"); },
  removeComparison(i) { const s = store.get("savedComparisons", []); s.splice(i, 1); store.set("savedComparisons", s); },
  filters: () => store.get("savedFilters", []),
  saveFilter(label, hash) { const s = store.get("savedFilters", []); s.unshift({ label, hash, at: new Date().toISOString().slice(0, 10) }); store.set("savedFilters", s.slice(0, 40)); toast("Filter view saved"); },
  removeFilter(i) { const s = store.get("savedFilters", []); s.splice(i, 1); store.set("savedFilters", s); },
  cmp: kind => store.get(kind === "company" ? "cmpCompanies" : "cmpModels", kind === "company" ? [] : ["MDL-000015", "MDL-000007", "MDL-000002", "MDL-000030"]),
  setCmp(kind, ids) { const max = kind === "company" ? MAX_COMPANIES : MAX_MODELS; store.set(kind === "company" ? "cmpCompanies" : "cmpModels", [...new Set(ids)].slice(0, max)); },
  toggleCmp(kind, id) {
    const max = kind === "company" ? MAX_COMPANIES : MAX_MODELS;
    let ids = this.cmp(kind); const had = ids.includes(id);
    ids = had ? ids.filter(x => x !== id) : [...ids, id];
    if (ids.length > max) { ids = ids.slice(ids.length - max); toast(`Compare holds up to ${max}; the oldest was removed`); }
    this.setCmp(kind, ids); return !had;
  },
  pref: (k, d) => store.get("pref:" + k, d),
  setPref: (k, v) => store.set("pref:" + k, v),
  MAX_MODELS, MAX_COMPANIES,
};

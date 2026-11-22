// Hash router: #/section/:id?filter=a,b — every page and filter state is a bookmarkable URL.
// Legacy 1.x view hashes (#products, #landscape, #china …) are redirected to their 2.0 routes.
export const LEGACY_ROUTES = {
  landscape: "/", coverage: "/quality", companies: "/companies", equipment: "/equipment", products: "/products", lasers: "/intelligence/lasers", compare: "/compare",
  waferfab: "/intelligence/segments/waferfab", packaging: "/intelligence/segments/packaging", advpkg: "/intelligence/packaging", atmp: "/osats", automation: "/intelligence/segments/automation",
  india: "/india", china: "/countries/CTY-CN", japan: "/countries/CTY-JP", korea: "/countries/CTY-KR", taiwan: "/countries/CTY-TW",
  suppliers: "/suppliers", customers: "/intelligence/customers", technology: "/technologies", localization: "/intelligence/india-opportunity", competitive: "/intelligence/competitive",
  teal: "/intelligence/teal", gap: "/intelligence/gap", partners: "/intelligence/partners", sources: "/sources",
};
export function current() {
  let h = location.hash.replace(/^#/, "");
  if (h && !h.startsWith("/")) {
    const mapped = LEGACY_ROUTES[h.split("?")[0]];
    h = mapped || "/";
    try { history.replaceState(null, "", "#" + h); } catch { /* ignore */ }
  }
  if (!h) h = "/";
  const [p, q] = h.split("?");
  return { path: p.split("/").filter(Boolean).map(s => decodeURIComponent(s)), params: new URLSearchParams(q || ""), raw: h };
}
export function href(path, params) {
  const q = params ? new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== "" && !(Array.isArray(v) && !v.length)).map(([k, v]) => [k, Array.isArray(v) ? v.join(",") : v])).toString() : "";
  return "#" + (path.startsWith("/") ? path : "/" + path) + (q ? "?" + q : "");
}
export function go(path, params, { replace = false } = {}) {
  const h = href(path, params);
  if (replace) { history.replaceState(null, "", h); window.dispatchEvent(new HashChangeEvent("hashchange")); }
  else location.hash = h.slice(1);
}
// Update query params on the current route (URL-state-aware filters). null/empty removes a key.
export function setParams(patch, { replace = true } = {}) {
  const { path, params } = current();
  Object.entries(patch).forEach(([k, v]) => {
    if (v == null || v === "" || (Array.isArray(v) && !v.length)) params.delete(k);
    else params.set(k, Array.isArray(v) ? v.join(",") : v);
  });
  const obj = Object.fromEntries(params.entries());
  go("/" + path.map(encodeURIComponent).join("/"), obj, { replace });
}
export const listParam = (params, k) => (params.get(k) ? params.get(k).split(",").filter(Boolean) : []);

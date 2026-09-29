// Small shared utilities. No framework: views return HTML strings; events are delegated.
export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const uniq = a => [...new Set(a.filter(x => x != null && x !== ""))];
export const fmt = n => (typeof n === "number" ? n.toLocaleString("en-US", { maximumFractionDigits: 1 }) : esc(n));
export const pretty = s => String(s ?? "").replace(/_/g, " ").toLowerCase().replace(/^\w/, c => c.toUpperCase());
export const plural = (n, w, p = w + "s") => `${n.toLocaleString("en-US")} ${n === 1 ? w : p}`;
export const countBy = (arr, fn) => { const m = new Map(); arr.forEach(x => { const ks = fn(x); (Array.isArray(ks) ? ks : [ks]).forEach(k => { if (k != null && k !== "") m.set(k, (m.get(k) || 0) + 1); }); }); return m; };
export const sortedEntries = m => [...m.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
export function debounce(fn, ms = 150) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
export const norm = s => String(s ?? "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
export function toast(msg) {
  const t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 2200);
}
export async function copyText(text, label = "Copied") {
  try { await navigator.clipboard.writeText(text); toast(label); }
  catch { const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); toast(label); } catch { toast("Copy not available"); } ta.remove(); }
}
export function download(name, text, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function toCSV(rows, cols) {
  const q = v => { const s = Array.isArray(v) ? v.join("; ") : v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return [cols.map(c => q(c.label)).join(","), ...rows.map(r => cols.map(c => q(c.get(r))).join(","))].join("\n");
}
export function toTSV(rows, cols) {
  const q = v => (Array.isArray(v) ? v.join("; ") : v == null ? "" : String(v)).replace(/[\t\n]/g, " ");
  return [cols.map(c => c.label).join("\t"), ...rows.map(r => cols.map(c => q(c.get(r))).join("\t"))].join("\n");
}
// Safe storage: private windows / blocked storage must never break rendering.
export const store = {
  get(k, d) { try { const v = localStorage.getItem("semicondb:" + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem("semicondb:" + k, JSON.stringify(v)); } catch { /* ignore */ } },
};

// Normalisation helpers. Every normalised value keeps its original wording as `source_value`.

const INCH_TO_MM = { 2: 50, 3: 75, 4: 100, 5: 125, 6: 150, 8: 200, 12: 300, 18: 450 };
const STANDARD_MM = [50, 75, 100, 125, 150, 200, 300, 450];

// Wafer / substrate diameter. Returns null when the source states no diameter.
// "300 mm", "12 inch", "12-inch", "300mm" → 300. Thickness values (µm) are ignored.
export function normWafer(raw) {
  if (raw == null || raw === "N/A" || raw === "") return null;
  const s = String(raw);
  const sizes = new Set();
  let range = null;
  // lists like "100/150/200/300 mm", "4/6/8 inch", "300 / 450 mm", "200 / 300 mm"
  const re = /((?:\d+(?:\.\d+)?\s*(?:\/|,|and)\s*)*\d+(?:\.\d+)?)\s*-?\s*(mm|inch(?:es)?|in\b|")/gi;
  let m;
  const found = [];
  while ((m = re.exec(s))) {
    const unit = m[2].toLowerCase().startsWith("mm") ? "mm" : "inch";
    const nums = m[1].split(/\/|,|and/).map(x => parseFloat(x)).filter(n => !isNaN(n));
    found.push({ unit, nums, index: m.index, text: m[0] });
    nums.forEach(n => { const mm = unit === "mm" ? n : INCH_TO_MM[n] || Math.round(n * 25.4); sizes.add(mm); });
  }
  if (!found.length) return { source_value: s, sizes_mm: [], range_mm: null, note: /um|µm/.test(s) ? "Thickness stated, no diameter" : "No diameter parsed" };
  if (/up to|<=|≤|max/i.test(s)) { range = { min: null, max: Math.max(...sizes) }; }
  else if (found.length === 2 && /\d\s*(inch|mm)\s*[-–]\s*\d/i.test(s)) { const v = [...sizes].sort((a, b) => a - b); range = { min: v[0], max: v[v.length - 1] }; }
  const list = [...sizes].sort((a, b) => a - b);
  return { source_value: s, sizes_mm: range ? [] : list.filter(x => STANDARD_MM.includes(x)), nonstandard_mm: range ? [] : list.filter(x => !STANDARD_MM.includes(x)), range_mm: range, unit: "mm" };
}

// Does a normalised wafer record support `mm`? Returns "stated" | "within-range" | null.
export function waferSupports(w, mm) {
  if (!w) return null;
  if (w.sizes_mm && w.sizes_mm.includes(mm)) return "stated";
  if (w.range_mm && (w.range_mm.min == null || w.range_mm.min <= mm) && w.range_mm.max >= mm) return "within-range";
  return null;
}

const STOP = /\b(inc|incorporated|corp|corporation|co|company|ltd|limited|llc|plc|gmbh|ag|sa|nv|bv|kk|holdings?|group|the|pvt|private|technolog(y|ies)|systems?|international|semiconductor|equipment)\b/g;
export function normName(s) {
  return String(s || "").toLowerCase().replace(/\(.*?\)/g, " ").replace(/&/g, " and ").replace(/[^a-z0-9 ]/g, " ").replace(STOP, " ").replace(/\s+/g, " ").trim();
}
// Sørensen–Dice coefficient on character bigrams.
export function similarity(a, b) {
  if (!a || !b) return 0; if (a === b) return 1;
  const bg = s => { const m = new Map(); for (let i = 0; i < s.length - 1; i++) { const k = s.slice(i, i + 2); m.set(k, (m.get(k) || 0) + 1); } return m; };
  const A = bg(a), B = bg(b); let inter = 0;
  for (const [k, v] of A) inter += Math.min(v, B.get(k) || 0);
  return (2 * inter) / (Math.max(1, a.length - 1) + Math.max(1, b.length - 1));
}

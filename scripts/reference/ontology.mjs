// Materials, applications/devices, equipment-segment rules and taxonomy extensions (editorial reference).
// `match` regexes are applied ONLY to source-stated text fields of model records (material, wafer,
// application, technology, family) to derive links; every derived link is labelled basis:"derived".

const M = (slug, cls, name, description, o = {}) => ({ slug, cls, name, description, ...o });
export const MATERIALS = [
  // Substrates
  M("silicon", "Substrate", "Silicon (Si)", "Mainstream single-crystal semiconductor substrate.", { match: /\bSi\b(?![A-Za-z])|silicon(?! carbide)/i }),
  M("soi", "Substrate", "Silicon-on-insulator (SOI)", "Silicon film on a buried oxide on a handle wafer.", { match: /\bSOI\b/ }),
  M("sic", "Substrate", "Silicon carbide (SiC)", "Wide-bandgap substrate for power devices; hard and difficult to slice and dice.", { match: /\bSiC\b|silicon carbide/i }),
  M("gan", "Substrate", "Gallium nitride (GaN)", "Wide-bandgap compound semiconductor for power, RF and LEDs, usually as epitaxy on Si, SiC or sapphire.", { match: /\bGaN\b|gallium nitride/i }),
  M("gaas", "Substrate", "Gallium arsenide (GaAs)", "III-V compound semiconductor for RF and optoelectronics.", { match: /\bGaAs\b/ }),
  M("inp", "Substrate", "Indium phosphide (InP)", "III-V substrate for photonics and high-frequency devices.", { match: /\bInP\b/ }),
  M("sige", "Substrate", "Silicon-germanium (SiGe)", "Strained/alloy layers for high-performance transistors.", { match: /\bSiGe\b/ }),
  M("germanium", "Substrate", "Germanium (Ge)", "Group-IV semiconductor substrate.", { match: /\bGe\b(?![A-Za-z])/ }),
  M("sapphire", "Substrate", "Sapphire", "Al₂O₃ substrate widely used for GaN LEDs.", { match: /sapphire/i }),
  M("glass", "Substrate", "Glass", "Glass carriers, interposers and core substrates.", { match: /\bglass\b/i }),
  M("lt-ln", "Substrate", "Lithium tantalate / niobate (LT/LN)", "Piezoelectric substrates for RF filters.", { match: /\bLT\b.*\bLN\b|lithium (tantalate|niobate)/i }),
  // Gases
  M("nitrogen", "Gas", "Nitrogen (N₂)", "Bulk purge and carrier gas."),
  M("hydrogen", "Gas", "Hydrogen (H₂)", "Carrier / reducing gas."),
  M("oxygen", "Gas", "Oxygen (O₂)", "Oxidation and ashing gas."),
  M("argon", "Gas", "Argon (Ar)", "Inert sputter and carrier gas."),
  M("helium", "Gas", "Helium (He)", "Backside cooling and carrier gas."),
  M("neon", "Gas", "Neon (Ne)", "Buffer gas in excimer laser light sources."),
  M("xenon", "Gas", "Xenon (Xe)", "Specialty gas used in some etch and light-source applications."),
  M("fluorine-gases", "Gas", "Fluorine-containing gases", "e.g. CF₄, SF₆, NF₃ — etch and chamber-clean gases."),
  M("chlorine-gases", "Gas", "Chlorine-containing gases", "e.g. Cl₂, BCl₃ — metal and compound etch gases."),
  M("precursor-gases", "Gas", "CVD / epitaxy precursor gases", "e.g. silane, ammonia, metal-organics."),
  M("dopant-gases", "Gas", "Dopant source gases", "e.g. arsine, phosphine, BF₃ used in implantation and doping."),
  // Chemicals
  M("acids", "Chemical", "Acids", "e.g. HF, H₂SO₄, HCl used for cleaning and etching."),
  M("bases", "Chemical", "Bases", "e.g. NH₄OH, TMAH solutions."),
  M("solvents", "Chemical", "Solvents", "e.g. IPA, PGMEA."),
  M("developers", "Chemical", "Developers", "Resist developers such as TMAH solutions."),
  M("strippers", "Chemical", "Strippers", "Wet resist and residue removers."),
  M("etchants", "Chemical", "Wet etchants", "Chemical mixtures for wet etching."),
  M("photoresists", "Chemical", "Photoresists", "Radiation-sensitive polymers for lithography."),
  M("plating-chemistry", "Chemical", "Plating chemistry", "Electrolytes and additives for electroplating."),
  M("ultrapure-water", "Chemical", "Ultrapure water (UPW)", "Water purified to very high resistivity for rinsing and cleaning."),
  // Deposition materials
  M("ald-precursors", "Deposition material", "ALD precursors", "Volatile metal-organic or halide precursors for ALD."),
  M("sputter-targets", "Deposition material", "PVD sputter targets", "High-purity metal and compound targets."),
  // CMP
  M("cmp-slurry", "CMP consumable", "CMP slurry", "Abrasive chemical slurries."),
  M("cmp-pad", "CMP consumable", "CMP pads", "Polymer polishing pads."),
  M("cmp-conditioner", "CMP consumable", "Pad conditioners", "Diamond disks that restore pad texture."),
  // Packaging
  M("substrates", "Packaging material", "Package substrates", "Organic laminate substrates for packages."),
  M("abf", "Packaging material", "ABF build-up film", "Ajinomoto build-up film dielectric used in package substrates.", { match: /\bABF\b/ }),
  M("leadframes", "Packaging material", "Leadframes", "Stamped/etched metal frames for leaded packages."),
  M("interposers", "Packaging material", "Interposers", "Silicon, organic or glass interposers."),
  M("molding-compound", "Packaging material", "Epoxy molding compound", "Encapsulant for packages."),
  M("underfill", "Packaging material", "Underfill", "Capillary or molded underfill for flip-chip joints."),
  M("die-attach-materials", "Packaging material", "Die-attach materials", "Epoxies, solders, sinter pastes, DAF."),
  M("bonding-wire", "Packaging material", "Bonding wire", "Au, Cu, Ag or Al wire."),
  M("solder", "Packaging material", "Solder & bumps", "Solder balls, bumps and pastes."),
  M("dicing-tape", "Packaging material", "Dicing / back-grinding tape", "Tapes supporting wafers during thinning and dicing.", { match: /dicing tape/i }),
  M("grinding-tape", "Packaging material", "Back-grinding tape", "Protective tape for wafer thinning."),
];

const A = (slug, grp, name, match) => ({ slug, grp, name, match });
export const APPLICATIONS = [
  A("logic", "Logic", "Logic / foundry", /\blogic\b|foundry|\bGAA\b|\b\d+\s?nm\b.*(logic|node)/i),
  A("cpu-gpu", "Logic", "CPU / GPU", /\bCPU\b|\bGPU\b/),
  A("ai-accelerator", "Logic", "AI accelerator / HPC", /\bAI\b|\bHPC\b|accelerator|data ?cent(er|re)/i),
  A("mcu", "Logic", "MCU / MPU", /\bMCU\b|\bMPU\b|microcontroller/i),
  A("memory", "Memory", "Memory (general)", /memory/i),
  A("dram", "Memory", "DRAM", /\bDRAM\b/),
  A("nand", "Memory", "NAND flash", /\bNAND\b|3D NAND/),
  A("hbm", "Memory", "HBM", /\bHBM\d?\b|high[- ]bandwidth memory/i),
  A("analog", "Analog & power", "Analog / mixed-signal", /\banalog\b/i),
  A("power", "Analog & power", "Power semiconductors", /\bpower (device|semiconductor|module|electronics)|\bIGBT\b|\bMOSFET\b|power semiconductor/i),
  A("sic-power", "Analog & power", "SiC power devices", /\bSiC\b.*(power|MOSFET|device|wafer)|(power|MOSFET).*\bSiC\b/i),
  A("gan-power-rf", "Analog & power", "GaN power / RF devices", /\bGaN\b/),
  A("rf", "RF", "RF devices & filters", /\bRF\b|filter|SAW|BAW/),
  A("mems", "MEMS & sensors", "MEMS", /\bMEMS\b/),
  A("sensor", "MEMS & sensors", "Sensors / image sensors", /sensor|\bCIS\b|image sens/i),
  A("led-microled", "Photonics & display", "LED / MicroLED", /\bLED\b|micro-?LED|µLED/i),
  A("display", "Photonics & display", "Display (OLED / LTPS / panel)", /display|OLED|LTPS|\bGen ?\d/i),
  A("photonics", "Photonics & display", "Photonics / optoelectronics", /photonic|optoelectronic|laser diode|silicon photonics|\bCPO\b/i),
  A("advanced-packaging", "Packaging", "Advanced packaging", /advanced packaging|chiplet|CoWoS|2\.5D|\b3D (IC|stack|integration|packaging)|fan-?out|hybrid bond|interposer|glass (core|substrate)/i),
  A("automotive", "End market", "Automotive", /automotive|\bEV\b/i),
];

// Equipment-segment classification for taxonomy codes (for Front-end / Back-end / Test splits).
export function segmentOf(code) {
  const c = code;
  if (/^K/.test(c)) return "Wafer Manufacturing";
  if (/^L/.test(c)) return "Automation & Facilities";
  if (/^F\.D/.test(c)) return "Device class";
  if (/^A3[23]/.test(c) || /^C3[7-9]|^C4[0-2]/.test(c) || /^E0[245]$/.test(c) || c === "F10" || c === "H08") return "Test";
  if (/^A3[4-9]|^A4[0-5]|^J/.test(c)) return "Automation & Facilities";
  if (/^A|^B|^G/.test(c) || /^F0[1-6]$/.test(c) || /^H0[1-57]$/.test(c)) return "Front-End";
  if (/^D/.test(c)) return "Advanced Packaging";
  if (/^C|^E|^F0[7-9]$/.test(c) || c === "H06") return "Back-End";
  if (/^I/.test(c)) return "Display";
  return "Other";
}
export const SEGMENTS = ["Wafer Manufacturing", "Front-End", "Test", "Back-End", "Advanced Packaging", "Display", "Automation & Facilities", "Device class", "Other"];

// Taxonomy extensions added in 2.0 (no records mapped yet unless noted; shown as coverage gaps).
export const TAXONOMY_GROUPS_EXT = [
  ["K", "Wafer Manufacturing / Substrate Equipment"],
  ["L", "Subfab & Fab Facilities"],
];
export const TAXONOMY_EXT = [
  ["K01", "K", "Crystal growth furnaces / pullers"], ["K02", "K", "Ingot grinding & shaping"], ["K03", "K", "Multi-wire saws"],
  ["K04", "K", "Laser ingot slicing"], ["K05", "K", "Lapping"], ["K06", "K", "Edge & surface grinding"], ["K07", "K", "Double-side polishing"],
  ["K08", "K", "Final wafer cleaning"], ["K09", "K", "Bare-wafer inspection & geometry"],
  ["L01", "L", "Vacuum pumps (dry / turbo / cryo)"], ["L02", "L", "Abatement & scrubbers"], ["L03", "L", "Chillers & heat exchangers"],
  ["L04", "L", "Gas distribution (bulk & specialty)"], ["L05", "L", "Chemical distribution"], ["L06", "L", "Exhaust systems"],
  ["L07", "L", "Waste & wastewater treatment"], ["L08", "L", "Ultrapure water (UPW)"], ["L09", "L", "Compressed / clean dry air (CDA)"],
  ["L10", "L", "Facilities monitoring"], ["L11", "L", "Electrical & power distribution"], ["L12", "L", "Facility controls"],
];
// Cross-references between 2.0 extension nodes and existing Batch-1 nodes that already carry records.
// Editorial cross-references between overlapping branches of the taxonomy (e.g. back-end "E12 Wire bonding" and
// assembly "C12 Wire Bonding"). They point readers to where documented suppliers sit; they are not supplier claims.
export const TAXONOMY_SEE_ALSO = { K01: ["A09.10"], K04: ["F01"], K09: ["A30"], L01: ["A42"], L02: ["A45"], L04: ["A43"], L05: ["A44"],
  A29: ["A26", "A25"], A35: ["J07", "A36"], "C01.05": ["C01.01", "C03"], C05: ["A19", "K07"], C22: ["C20", "C21"], C27: ["C26"],
  D01: ["D16"], D02: ["D13", "C17"], D03: ["C16", "D13"], D07: ["D19"], D08: ["D20"], D09: ["D16"], D17: ["D16"], D23: ["C17"],
  E01: ["C10", "C11", "C12"], E02: ["C40"], E04: ["C38"], E06: ["C34"], E07: ["C08"], E08: ["C39"], E09: ["C26"], E10: ["C01"],
  E11: ["C10"], E12: ["C12"], E13: ["C11"], E14: ["C20", "C21"],
  F02: ["G01"], F03: ["A09.10"], F04: ["A10"], F06: ["A15"], F09: ["C18"], F10: ["C40"],
  H01: ["H02"], H03: ["C18"], H04: ["A09"], H07: ["A21"], H08: ["A32"],
  I03: ["I02"], I09: ["C09"], I10: ["C11"], I11: ["I04"], J05: ["J07"], J13: ["J08"], K08: ["A04"], L06: ["L02"] };

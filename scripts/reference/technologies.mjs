// Reference technology layer (editorial). Model links are derived at build time from
// (a) the source-backed equipment category of each model (eq codes below) and
// (b) the source-stated laser process codes (legacy L01–L25) carried on laser records.
// Descriptions are generic definitions, not claims about any supplier.
const T = (slug, family, name, description, o = {}) => ({ slug, family, name, description, eq: [], ...o });

export const TECHNOLOGIES = [
  // Lithography
  T("euv", "Lithography", "EUV lithography", "Projection lithography at 13.5 nm wavelength using reflective optics and reflective masks in vacuum.", { eq: ["A01.01"], aliases: ["extreme ultraviolet"] }),
  T("duv", "Lithography", "DUV lithography", "Deep-ultraviolet projection lithography (248 nm KrF and 193 nm ArF excimer sources).", { eq: ["A01.02"], aliases: ["deep ultraviolet"] }),
  T("arf", "Lithography", "ArF / ArF immersion lithography", "193 nm lithography, dry or with water immersion between lens and wafer to raise numerical aperture.", { eq: ["A01.03"], aliases: ["arf immersion", "arfi", "193 nm"] }),
  T("krf", "Lithography", "KrF lithography", "248 nm krypton-fluoride excimer lithography.", { eq: ["A01.04"], aliases: ["248 nm"] }),
  T("i-line", "Lithography", "i-line lithography", "365 nm mercury-lamp lithography used for non-critical layers, packaging and MEMS.", { eq: ["A01.05"], aliases: ["365 nm"] }),
  T("ebeam-litho", "Lithography", "Electron-beam lithography / mask writing", "Direct writing of patterns with a focused electron beam; the main route for mask making.", { eq: ["A01.06", "B07"], aliases: ["e-beam lithography", "ebl"] }),
  T("nil", "Lithography", "Nanoimprint lithography", "Pattern transfer by mechanically imprinting a template into a resist and curing it.", { eq: ["A01.07"], aliases: ["nanoimprint", "nil"] }),
  T("maskless", "Lithography", "Maskless / direct-write lithography", "Patterning without a physical mask, e.g. laser direct imaging or multi-beam writing.", { eq: ["A01.08", "B08"], aliases: ["direct write", "laser direct imaging", "ldi"] }),
  // Etch
  T("plasma-etch", "Etch", "Plasma (dry) etch", "Material removal by reactive plasma species and ion bombardment.", { eq: ["A08.01", "A08.02"], aliases: ["dry etch", "plasma etching"] }),
  T("rie", "Etch", "Reactive ion etch (RIE)", "Anisotropic plasma etch combining chemical reaction and directional ion bombardment.", { eq: ["A08.03"] }),
  T("icp", "Etch", "Inductively coupled plasma (ICP) etch", "High-density plasma etch with separately controlled plasma density and ion energy.", { eq: ["A08.04"] }),
  T("drie", "Etch", "Deep reactive ion etch (DRIE)", "High-aspect-ratio silicon etching (e.g. the Bosch process) used for MEMS and TSV.", { eq: ["A08.05", "H02"], aliases: ["bosch process", "deep etch"] }),
  T("wet-etch", "Etch", "Wet etch", "Isotropic chemical etching in liquid etchants.", { eq: ["A08.06"] }),
  T("plasma-dicing", "Etch", "Plasma dicing", "Die singulation by deep plasma etching of the streets.", { eq: ["C01.04"] }),
  // Deposition
  T("cvd", "Deposition", "Chemical vapour deposition (CVD)", "Film growth from gas-phase precursors reacting on a heated surface.", { eq: ["A09.01"], aliases: ["chemical vapor deposition"] }),
  T("pecvd", "Deposition", "Plasma-enhanced CVD (PECVD)", "CVD assisted by plasma to lower deposition temperature.", { eq: ["A09.02"], aliases: ["plasma enhanced chemical vapor deposition"] }),
  T("lpcvd", "Deposition", "Low-pressure CVD (LPCVD)", "Thermal CVD at reduced pressure, typically in batch furnaces.", { eq: ["A09.03"] }),
  T("hdpcvd", "Deposition", "High-density-plasma CVD (HDPCVD) / SACVD", "Gap-fill oriented CVD variants (high-density plasma, sub-atmospheric).", { eq: ["A09.04", "A09.05"] }),
  T("ald", "Deposition", "Atomic layer deposition (ALD)", "Self-limiting cyclic surface reactions for atomic-scale thickness control.", { eq: ["A09.06"], aliases: ["atomic layer deposition"] }),
  T("pvd", "Deposition", "Physical vapour deposition / sputtering", "Deposition by sputtering a target in a low-pressure plasma.", { eq: ["A09.07", "A09.08"], aliases: ["physical vapor deposition", "sputter", "sputtering"] }),
  T("evaporation", "Deposition", "Evaporation", "Thermal or e-beam evaporation of source material in high vacuum.", { eq: ["A09.09"] }),
  T("epitaxy", "Deposition", "Epitaxy", "Single-crystal film growth on a single-crystal substrate.", { eq: ["A09.10", "F03"], aliases: ["epi"] }),
  T("mocvd", "Deposition", "MOCVD", "Metal-organic CVD, the main epitaxy route for GaN, GaAs and InP compound devices.", { eq: ["G01", "G03", "G04", "G05", "G06", "G07"], aliases: ["metal organic chemical vapor deposition", "movpe"] }),
  T("mbe", "Deposition", "Molecular beam epitaxy (MBE)", "Epitaxy from molecular beams in ultra-high vacuum.", { eq: ["A09.11"] }),
  T("electroplating", "Deposition", "Electroplating (ECD)", "Electrochemical deposition of metals such as copper for interconnect and bumps.", { eq: ["A18"], aliases: ["ecd", "plating"] }),
  // Doping / thermal
  T("ion-implantation", "Doping", "Ion implantation", "Dopant introduction by accelerated ion beams.", { eq: ["A10", "F04"], aliases: ["implant", "implanter"] }),
  T("furnace-thermal", "Thermal", "Furnace oxidation / diffusion", "Batch thermal processing for oxidation, diffusion and anneal.", { eq: ["A11", "A16"] }),
  T("rtp", "Thermal", "Rapid thermal processing (RTP)", "Single-wafer lamp-based heating with fast ramps.", { eq: ["A12", "A13"], aliases: ["rapid thermal anneal", "rta"] }),
  // Planarisation / clean
  T("cmp", "Planarisation", "Chemical mechanical planarisation (CMP)", "Combined chemical/mechanical polishing to planarise films.", { eq: ["A19"], aliases: ["chemical mechanical polishing"] }),
  T("wet-processing", "Clean", "Wet processing / cleaning", "Batch or single-wafer chemical cleaning and wet processing.", { eq: ["A04", "A05", "A20"] }),
  // Inspection & metrology
  T("optical-inspection", "Inspection", "Optical defect inspection", "Bright-/dark-field optical detection of wafer or package defects.", { eq: ["A21", "A22", "A23", "A31", "C36"], aliases: ["aoi"] }),
  T("ebeam-inspection", "Inspection", "E-beam inspection & review", "Scanning-electron-beam defect inspection and review.", { eq: ["A24"] }),
  T("xray-inspection", "Inspection", "X-ray inspection", "Non-destructive X-ray imaging of packages and interconnects.", { eq: ["C35"] }),
  T("cd-sem", "Metrology", "CD-SEM", "Critical-dimension measurement by scanning electron microscope.", { eq: ["A26", "A29"] }),
  T("optical-metrology", "Metrology", "Optical metrology (film, overlay, OCD)", "Optical measurement of film thickness, overlay and profiles.", { eq: ["A25", "A27", "A28", "A30"] }),
  T("afm-metrology", "Metrology", "AFM metrology", "Atomic-force-microscope-based surface and profile metrology.", { eq: [] }),
  // Dicing & singulation
  T("blade-dicing", "Dicing", "Blade (mechanical) dicing", "Sawing wafers with a thin diamond blade.", { eq: ["C01.01"], aliases: ["mechanical dicing", "dicing saw"] }),
  T("dbg", "Dicing", "Dicing before grinding (DBG)", "Half-cut dicing followed by back-grinding to separate dies.", { eq: ["C01.05"] }),
  // Bonding & assembly
  T("die-bonding", "Assembly", "Die bonding / die attach", "Pick-and-place attachment of dies to substrates or leadframes.", { eq: ["C10", "E11"], aliases: ["die attach", "die bonder"] }),
  T("wire-bonding", "Assembly", "Wire bonding", "Ball/wedge bonding of fine wires between die and package.", { eq: ["C12", "C13", "C14", "C15", "E12"], aliases: ["wire bonder"] }),
  T("flip-chip", "Assembly", "Flip-chip bonding", "Face-down bumped die attachment by reflow.", { eq: ["C11", "E13"], aliases: ["flip chip"] }),
  T("tcb", "Assembly", "Thermo-compression bonding (TCB)", "Bonding with controlled force and heat per die, widely used for HBM and fine-pitch stacks.", { eq: ["C16"], aliases: ["thermo compression bonding", "tc bonding", "tc bonder"] }),
  T("hybrid-bonding", "Assembly", "Hybrid bonding", "Direct Cu-Cu plus dielectric bonding without solder, die-to-wafer or wafer-to-wafer.", { eq: ["C17", "D12"], aliases: ["direct bonding", "cu-cu bonding"] }),
  T("wafer-bonding", "Assembly", "Wafer bonding (permanent / temporary)", "Wafer-to-wafer bonding, including temporary bonding to carriers.", { eq: ["C18", "H03", "D22"] }),
  T("compression-molding", "Assembly", "Compression / transfer molding", "Encapsulation with molding compounds.", { eq: ["C20", "C21", "C22", "C23", "E14"], aliases: ["molding", "encapsulation"] }),
  // Packaging architectures
  T("wlp", "Packaging", "Wafer-level packaging (WLP / WLCSP)", "Packaging at wafer level before singulation.", { eq: ["D08", "D20"], aliases: ["wafer level packaging", "wlcsp", "fan-in"] }),
  T("fan-out", "Packaging", "Fan-out packaging (FOWLP / FOPLP)", "Reconstituted wafer or panel packaging with RDL beyond the die edge.", { eq: ["D05", "D06", "D07", "D10"], aliases: ["fowlp", "fan out", "info"] }),
  T("panel-level", "Packaging", "Panel-level packaging", "Packaging processes on large rectangular panels instead of round wafers.", { eq: ["D07", "D19"], aliases: ["plp", "fo-plp", "copos"] }),
  T("interposer-25d", "Packaging", "2.5D interposer integration", "Dies side by side on silicon, organic or glass interposers or bridges.", { eq: ["D01", "D09", "D11", "D16", "D17", "D18"], aliases: ["2.5d", "cowos", "interposer", "emib"] }),
  T("3d-ic", "Packaging", "3D IC stacking", "Vertical stacking of active dies.", { eq: ["D02", "D21", "D23"], aliases: ["3d", "3d stacking"] }),
  T("hbm", "Packaging", "High-bandwidth memory (HBM) stacking", "Stacked DRAM dies connected by TSVs, bonded by TCB or hybrid bonding.", { eq: ["D03"], aliases: ["high bandwidth memory"] }),
  T("chiplet", "Packaging", "Chiplets", "Disaggregated multi-die designs assembled in one package.", { eq: ["D04"], aliases: ["chiplets"] }),
  T("tsv", "Packaging", "Through-silicon via (TSV)", "Vertical interconnect through silicon.", { eq: ["D13"] }),
  T("tgv", "Packaging", "Through-glass via (TGV) / glass core", "Vias in glass substrates and interposers.", { eq: ["D14"], aliases: ["glass core", "glass substrate"] }),
  T("rdl", "Packaging", "Redistribution layers (RDL)", "Thin-film re-routing layers.", { eq: ["D15"] }),
  // Test
  T("ate", "Test", "Automated test equipment (ATE)", "Instruments and handlers/probers that electrically test dies and packages.", { eq: ["A32", "A33", "C37", "C39", "C40", "C41", "C42", "E02"], aliases: ["automated test equipment", "tester", "prober", "handler"] }),
  T("burn-in", "Test", "Burn-in", "Elevated temperature/voltage stress screening.", { eq: ["C38", "E04"] }),
  // Wafer manufacturing
  T("wire-sawing", "Wafer manufacturing", "Multi-wire sawing", "Slicing ingots into wafers with diamond or slurry wire.", { eq: ["K03"] }),
  // Laser processing (legacy L01–L25 codes are source-stated on laser records)
  T("laser-marking", "Laser", "Laser marking", "Laser marking of wafers, strips and packages.", { legacy: "L01", eq: ["C26", "E09"] }),
  T("laser-dicing", "Laser", "Laser dicing", "Ablative laser singulation of wafers.", { legacy: "L02", eq: ["C01.02"] }),
  T("stealth-dicing", "Laser", "Stealth dicing", "Internal laser modification below the surface followed by tape expansion.", { legacy: "L03", eq: ["C01.03"], aliases: ["sd"] }),
  T("laser-ablation", "Laser", "Laser ablation", "Material removal by direct laser vaporisation.", { legacy: "L04", eq: ["C30"] }),
  T("laser-drilling", "Laser", "Laser drilling", "Via and hole formation by laser.", { legacy: "L05", eq: ["C28"] }),
  T("laser-grooving", "Laser", "Laser grooving", "Laser removal of low-k/metal layers in the street before blade dicing.", { legacy: "L06", eq: [] }),
  T("laser-cutting", "Laser", "Laser cutting", "Laser separation of wafers, glass, ingots and packages.", { legacy: "L07", eq: ["C29"] }),
  T("laser-welding", "Laser", "Laser welding", "Joining by laser heating.", { legacy: "L08", eq: ["C31"] }),
  T("laser-annealing", "Laser", "Laser annealing", "Laser-based thermal processing (dopant activation, crystallisation, silicidation).", { legacy: "L09", eq: ["A14", "I07"] }),
  T("laser-lift-off", "Laser", "Laser lift-off (LLO)", "Laser release of layers from transparent carriers.", { legacy: "L10", eq: ["I06"], aliases: ["llo"] }),
  T("laser-debonding", "Laser", "Laser debonding", "Laser release of temporarily bonded wafers.", { legacy: "L11", eq: [] }),
  T("laser-repair", "Laser", "Laser repair", "Laser repair of display or mask defects.", { legacy: "L12", eq: ["I05", "B05"] }),
  T("laser-trimming", "Laser", "Laser trimming", "Adjustment of resistors/devices by laser.", { legacy: "L13", eq: [] }),
  T("laser-micromachining", "Laser", "Laser micromachining", "General precision laser structuring.", { legacy: "L14", eq: ["A15"] }),
  T("uv-laser", "Laser source", "UV laser processing", "Processing with ultraviolet wavelengths (< 400 nm).", { legacy: "L15" }),
  T("green-laser", "Laser source", "Green laser processing", "Processing with ~515–532 nm wavelengths.", { legacy: "L16" }),
  T("ir-laser", "Laser source", "IR laser processing", "Processing with ~1 µm and longer wavelengths.", { legacy: "L17" }),
  T("ultrafast-laser", "Laser source", "Ultrafast laser processing", "Pico-/femtosecond pulse processing with minimal heat-affected zone.", { legacy: "L18", aliases: ["ultrashort pulse", "usp"] }),
  T("picosecond-laser", "Laser source", "Picosecond lasers", "Lasers with picosecond pulse durations.", { legacy: "L19", aliases: ["ps laser"] }),
  T("femtosecond-laser", "Laser source", "Femtosecond lasers", "Lasers with femtosecond pulse durations.", { legacy: "L20", aliases: ["fs laser"] }),
  T("co2-laser", "Laser source", "CO₂ lasers", "Gas lasers at ~9.3–10.6 µm.", { legacy: "L21", aliases: ["co2"] }),
  T("fiber-laser", "Laser source", "Fiber lasers", "Rare-earth-doped fiber lasers.", { legacy: "L22", aliases: ["fibre laser", "mopa"] }),
  T("dpss-laser", "Laser source", "DPSS lasers", "Diode-pumped solid-state lasers.", { legacy: "L23", aliases: ["dpss"] }),
  T("excimer", "Laser source", "Excimer lasers", "Pulsed UV gas lasers (e.g. 193, 248, 308 nm).", { legacy: "L24" }),
  T("diode-laser", "Laser source", "Diode lasers", "Semiconductor laser diodes.", { legacy: "L25" }),
];

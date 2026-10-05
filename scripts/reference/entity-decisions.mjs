// Curated entity-resolution decisions for duplicate candidates. Records are never merged automatically: a decision
// documents the reviewer's reading and is shown on both company pages so readers can treat the pair accordingly.
// status: PROBABLE_SAME_ENTITY | DISTINCT_ENTITIES | RELATED_ENTITIES
export const ENTITY_DECISIONS = [
  { a: "C0116", b: "C0357", status: "PROBABLE_SAME_ENTITY", reviewed: "2026-10-05",
    resolution: "Probable same entity — not merged",
    note: "“JSG” (Batch 1, wafer thinning, China, directory-level source) matches the short form used by Zhejiang Jingsheng Mechanical & Electrical (Batch 9, official site jsjd.cc). Kept as two records until a source ties the Batch-1 entry to Jingsheng; read them together." },
  { a: "C0001", b: "C0006", status: "DISTINCT_ENTITIES", reviewed: "2026-10-05", resolution: "Distinct entities (name overlap)",
    note: "ASML Holding and ASM International are separate companies with separate records, websites and product lines; the shared letters are not an alias." },
  { a: "C0006", b: "C0192", status: "DISTINCT_ENTITIES", reviewed: "2026-10-05", resolution: "Distinct entities (name overlap)",
    note: "ASM International (Netherlands, deposition equipment) and ASM Technologies (India) are different companies." },
  { a: "C0001", b: "C0192", status: "DISTINCT_ENTITIES", reviewed: "2026-10-05", resolution: "Distinct entities (name overlap)", note: "Different companies; name overlap only." },
];

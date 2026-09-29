# Contributing

## Ground rules

1. **No fabrication.** Never add a company, model, specification, customer, revenue, market share, location, partnership or certification without a source. “Not publicly disclosed” is better than a guess.
2. **Sources first.** Every company/model row needs `source_ids` or a `source_url`. Prefer official sources (Tier 1) for technical specifications.
3. **Never resolve conflicts silently.** If two sources disagree, add a conflict (see `scripts/build-data.mjs → CONFLICTS`) and keep both claims.
4. **Never merge duplicates automatically.** The build flags candidates; record brand/subsidiary relationships instead of merging.
5. **Don't edit generated files** (`data/*.json` except `data/legacy/` and `data/batches/`, `DATA_DICTIONARY.md`). Edit inputs and rebuild.
6. **Never edit `data/legacy/legacy_snapshot.json`** — it is the Batch-1 backup. Corrections go into a new batch or the reference files.

## Adding records

```bash
# 1. Prepare a CSV (Excel "Save as CSV" works) or JSON array.
#    companies: name,country,city,company_type,equipment_categories,website,description,ownership,verification,confidence,source_url,source_title,source_publisher,source_type,source_tier,source_date
#    models:    manufacturer,family,model_number,equipment_code,technology,application,wafer,throughput,accuracy,material,lifecycle,verification,confidence,source_url,…
#    sources:   url,title,publisher,type,tier,date,excerpt
node scripts/import.mjs my-batch.csv --entity companies --batch batch-2      # dry run: validation + duplicate report
node scripts/import.mjs my-batch.csv --entity companies --batch batch-2 --write
npm run build          # normalise, link, quality-check, publish data/*.json + bundle.json
npm run validate
node scripts/gen-dictionary.mjs
```

Validation rejects: blank names, unknown countries, unknown equipment codes, invalid URLs, non-ISO dates, models whose manufacturer is unknown, rows without sources, and exact duplicates (use `--allow-duplicates` only for genuinely distinct entities). Similar names are reported as warnings.

`verification`: `VERIFIED` (official source read), `PARTIALLY_VERIFIED`, `UNVERIFIED`. `confidence`: `HIGH` (official) · `MEDIUM` (two independent industry sources) · `LOW` (single industry/distributor source) · `UNVERIFIED` (blog/market list only).

## Reference taxonomy

Processes, technologies, materials, applications, subsystems, component classes, countries, synonyms and taxonomy extensions live in `scripts/reference/*.mjs`. They are editorial definitions and must stay generic (no company claims). After editing, run `npm run build` (and `npm run build:map` if countries changed).

## Front-end

No framework and no bundler: ES modules under `assets/js/`, one CSS file `assets/css/app.css` with design tokens. Views return HTML strings; interactions are delegated via `data-*` attributes in `main.js`. Reuse `ui/components.js`, `ui/table.js` and `ui/facets.js` rather than writing new widgets. Keep Arial/Calibri typography and use colour only to encode meaning.

Test locally with `python3 -m http.server` and check: search, filters (URL updates), sort/pagination, detail tabs, compare, source drawer, mobile width (no horizontal page scroll), dark theme, keyboard (Tab, Enter, Esc, ⌘K).

## Deploying

Commit to `gh-pages`. GitHub Pages serves the branch root; there is no CI build step, so commit the regenerated `data/` files.

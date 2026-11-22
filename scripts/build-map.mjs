#!/usr/bin/env node
// Pre-renders the ecosystem-map base layer (Equal Earth projection, 960×500) to data/basemap.json,
// and projects each country's approximate centroid, so the site needs no map library or CDN at runtime.
// Run after `npm install` whenever the country reference changes: npm run build:map
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { geoEqualEarth, geoPath } from "d3-geo";
import { feature, mesh } from "topojson-client";
import { COUNTRIES } from "./reference/geo.mjs";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const world = require("world-atlas/countries-110m.json");
const W = 960, H = 500;
const proj = geoEqualEarth().fitSize([W, H], { type: "Sphere" });
const gp = geoPath(proj).digits(1);
const out = {
  width: W, height: H, projection: "Equal Earth", source: "world-atlas 2.0 (Natural Earth 1:110m, public domain)",
  sphere: gp({ type: "Sphere" }),
  land: gp(feature(world, world.objects.land)),
  borders: gp(mesh(world, world.objects.countries, (a, b) => a !== b)),
  points: Object.fromEntries(COUNTRIES.map(([, iso, , lat, lon]) => [iso, proj([lon, lat]).map(v => +v.toFixed(1))])),
};
fs.writeFileSync(path.join(ROOT, "data/basemap.json"), JSON.stringify(out));
console.log(`data/basemap.json ${(fs.statSync(path.join(ROOT, "data/basemap.json")).size / 1024).toFixed(0)} KB`);

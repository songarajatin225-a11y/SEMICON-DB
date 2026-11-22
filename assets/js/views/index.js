// Route table: first path segment → view. Each view returns { title, html, after? }.
import { home } from "./home.js";
import { searchView } from "./search.js";
import { companies } from "./companies.js";
import { equipment } from "./equipment.js";
import { products, modelView } from "./products.js";
import { processes } from "./processes.js";
import { technologies, materials, applications } from "./taxonomies.js";
import { components, subsystems } from "./supplychain.js";
import { fabs, osats, customers } from "./orgs.js";
import { suppliers } from "./suppliers.js";
import { india } from "./india.js";
import { countries } from "./countries.js";
import { mapView } from "./map.js";
import { compare } from "./compare.js";
import { intelligence } from "./intelligence.js";
import { quality } from "./quality.js";
import { sources } from "./sources.js";
import { saved } from "./saved.js";
import { graphView } from "./graph.js";
import { facilities } from "./facilities.js";

export const ROUTES = {
  "": home, search: searchView, companies, equipment, products, models: modelView, processes, technologies, materials, applications,
  components, subsystems, fabs, osats, customers, facilities, suppliers, india, countries, map: mapView, compare, intelligence, quality, sources, saved, graph: graphView,
};

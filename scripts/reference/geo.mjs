// Country reference: ISO codes, region and an APPROXIMATE centroid used only to place
// country-level clusters on the ecosystem map. Centroids are not facility locations.
export const COUNTRIES = [
  ["United States", "US", "North America", 39.8, -98.6], ["Canada", "CA", "North America", 56.1, -106.3], ["Mexico", "MX", "North America", 23.6, -102.6],
  ["Germany", "DE", "Europe", 51.2, 10.4], ["Netherlands", "NL", "Europe", 52.1, 5.3], ["Switzerland", "CH", "Europe", 46.8, 8.2], ["United Kingdom", "GB", "Europe", 54.0, -2.5],
  ["France", "FR", "Europe", 46.6, 2.2], ["Italy", "IT", "Europe", 42.8, 12.6], ["Belgium", "BE", "Europe", 50.6, 4.6], ["Austria", "AT", "Europe", 47.6, 14.1],
  ["Finland", "FI", "Europe", 64.0, 26.0], ["Sweden", "SE", "Europe", 62.0, 15.0], ["Denmark", "DK", "Europe", 56.0, 9.5], ["Norway", "NO", "Europe", 61.0, 8.5], ["Spain", "ES", "Europe", 40.3, -3.7],
  ["Ireland", "IE", "Europe", 53.2, -8.2], ["Czech Republic", "CZ", "Europe", 49.8, 15.5], ["Poland", "PL", "Europe", 52.0, 19.4], ["Hungary", "HU", "Europe", 47.2, 19.5],
  ["Lithuania", "LT", "Europe", 55.2, 23.9], ["Israel", "IL", "Middle East", 31.4, 35.0], ["Middle East (UAE/Saudi Arabia/other)", "ME", "Middle East", 24.0, 45.0],
  ["Japan", "JP", "Asia-Pacific", 36.2, 138.3], ["South Korea", "KR", "Asia-Pacific", 36.5, 127.9], ["Taiwan", "TW", "Asia-Pacific", 23.7, 121.0], ["China", "CN", "Asia-Pacific", 35.0, 104.2],
  ["Hong Kong", "HK", "Asia-Pacific", 22.3, 114.2], ["Singapore", "SG", "Asia-Pacific", 1.35, 103.8], ["India", "IN", "Asia-Pacific", 22.0, 79.0], ["Malaysia", "MY", "Asia-Pacific", 4.2, 102.0],
  ["Vietnam", "VN", "Asia-Pacific", 16.0, 107.8], ["Thailand", "TH", "Asia-Pacific", 15.9, 100.9], ["Philippines", "PH", "Asia-Pacific", 12.9, 121.8],
  ["Australia", "AU", "Asia-Pacific", -25.3, 133.8], ["New Zealand", "NZ", "Asia-Pacific", -41.0, 174.0],
];
// Aliases seen in free-text location fields.
export const COUNTRY_ALIASES = { "US": "United States", "USA": "United States", "U.S.": "United States", "Korea": "South Korea", "UK": "United Kingdom" };

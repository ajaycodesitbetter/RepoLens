/**
 * Compact dataset for owner-country inference and the background globe.
 *
 * Indexed by ISO 3166-1 alpha-2 code. Coordinates are approximate centroids
 * (for marker placement on a stylized 2D grid; not for navigation).
 *
 * Curated, deterministic — no live geocoding service is used.
 */

export type CountryRecord = {
  /** Canonical English country name. */
  name: string;
  /** Lowercase normalized aliases used by the inference matcher. */
  aliases: string[];
  /** Approximate centroid latitude (-90 .. 90). */
  lat: number;
  /** Approximate centroid longitude (-180 .. 180). */
  lng: number;
};

export const COUNTRIES: Record<string, CountryRecord> = {
  US: {
    name: "United States",
    aliases: [
      "us",
      "usa",
      "u.s.",
      "u.s.a",
      "u.s.a.",
      "america",
      "united states",
      "united states of america",
    ],
    lat: 39.5,
    lng: -98.35,
  },
  GB: {
    name: "United Kingdom",
    aliases: [
      "uk",
      "u.k.",
      "u.k",
      "england",
      "scotland",
      "wales",
      "britain",
      "great britain",
      "united kingdom",
    ],
    lat: 54.0,
    lng: -2.0,
  },
  CA: { name: "Canada", aliases: ["canada"], lat: 56.13, lng: -106.35 },
  MX: { name: "Mexico", aliases: ["mexico", "méxico"], lat: 23.63, lng: -102.55 },
  BR: { name: "Brazil", aliases: ["brazil", "brasil"], lat: -14.24, lng: -51.93 },
  AR: { name: "Argentina", aliases: ["argentina"], lat: -38.42, lng: -63.62 },
  CL: { name: "Chile", aliases: ["chile"], lat: -35.68, lng: -71.54 },
  CO: { name: "Colombia", aliases: ["colombia"], lat: 4.57, lng: -74.3 },

  IE: { name: "Ireland", aliases: ["ireland", "éire"], lat: 53.41, lng: -8.24 },
  FR: { name: "France", aliases: ["france"], lat: 46.23, lng: 2.21 },
  DE: {
    name: "Germany",
    aliases: ["germany", "deutschland", "de"],
    lat: 51.17,
    lng: 10.45,
  },
  ES: { name: "Spain", aliases: ["spain", "españa"], lat: 40.46, lng: -3.75 },
  PT: { name: "Portugal", aliases: ["portugal"], lat: 39.4, lng: -8.22 },
  IT: { name: "Italy", aliases: ["italy", "italia"], lat: 41.87, lng: 12.57 },
  NL: {
    name: "Netherlands",
    aliases: ["netherlands", "the netherlands", "holland", "nederland"],
    lat: 52.13,
    lng: 5.29,
  },
  BE: { name: "Belgium", aliases: ["belgium", "belgique"], lat: 50.5, lng: 4.47 },
  CH: {
    name: "Switzerland",
    aliases: ["switzerland", "schweiz", "suisse"],
    lat: 46.82,
    lng: 8.23,
  },
  AT: {
    name: "Austria",
    aliases: ["austria", "österreich", "osterreich"],
    lat: 47.52,
    lng: 14.55,
  },
  SE: { name: "Sweden", aliases: ["sweden", "sverige"], lat: 60.13, lng: 18.64 },
  NO: { name: "Norway", aliases: ["norway", "norge"], lat: 60.47, lng: 8.47 },
  DK: { name: "Denmark", aliases: ["denmark", "danmark"], lat: 56.26, lng: 9.5 },
  FI: { name: "Finland", aliases: ["finland", "suomi"], lat: 61.92, lng: 25.75 },
  PL: { name: "Poland", aliases: ["poland", "polska"], lat: 51.92, lng: 19.15 },
  CZ: {
    name: "Czech Republic",
    aliases: ["czech republic", "czechia", "česko", "cesko"],
    lat: 49.82,
    lng: 15.47,
  },
  RO: { name: "Romania", aliases: ["romania", "românia"], lat: 45.94, lng: 24.97 },
  GR: { name: "Greece", aliases: ["greece", "ελλάδα"], lat: 39.07, lng: 21.82 },
  TR: { name: "Turkey", aliases: ["turkey", "türkiye", "turkiye"], lat: 38.96, lng: 35.24 },
  RU: {
    name: "Russia",
    aliases: ["russia", "russian federation", "россия"],
    lat: 61.52,
    lng: 105.32,
  },
  UA: { name: "Ukraine", aliases: ["ukraine", "україна"], lat: 48.38, lng: 31.17 },

  IN: { name: "India", aliases: ["india", "bharat", "भारत"], lat: 20.59, lng: 78.96 },
  PK: { name: "Pakistan", aliases: ["pakistan"], lat: 30.38, lng: 69.35 },
  BD: { name: "Bangladesh", aliases: ["bangladesh"], lat: 23.68, lng: 90.36 },
  CN: { name: "China", aliases: ["china", "中国", "prc"], lat: 35.86, lng: 104.2 },
  JP: { name: "Japan", aliases: ["japan", "日本"], lat: 36.2, lng: 138.25 },
  KR: {
    name: "South Korea",
    aliases: ["south korea", "korea", "republic of korea", "한국", "대한민국"],
    lat: 35.91,
    lng: 127.77,
  },
  TW: { name: "Taiwan", aliases: ["taiwan", "台灣"], lat: 23.7, lng: 120.96 },
  HK: { name: "Hong Kong", aliases: ["hong kong"], lat: 22.32, lng: 114.17 },
  SG: { name: "Singapore", aliases: ["singapore"], lat: 1.35, lng: 103.82 },
  ID: { name: "Indonesia", aliases: ["indonesia"], lat: -0.79, lng: 113.92 },
  TH: { name: "Thailand", aliases: ["thailand"], lat: 15.87, lng: 100.99 },
  VN: { name: "Vietnam", aliases: ["vietnam", "việt nam", "viet nam"], lat: 14.06, lng: 108.28 },
  PH: { name: "Philippines", aliases: ["philippines", "pilipinas"], lat: 12.88, lng: 121.77 },
  MY: { name: "Malaysia", aliases: ["malaysia"], lat: 4.21, lng: 101.98 },

  AU: { name: "Australia", aliases: ["australia"], lat: -25.27, lng: 133.78 },
  NZ: {
    name: "New Zealand",
    aliases: ["new zealand", "aotearoa"],
    lat: -40.9,
    lng: 174.89,
  },

  ZA: { name: "South Africa", aliases: ["south africa"], lat: -30.56, lng: 22.94 },
  EG: { name: "Egypt", aliases: ["egypt", "مصر"], lat: 26.82, lng: 30.8 },
  NG: { name: "Nigeria", aliases: ["nigeria"], lat: 9.08, lng: 8.68 },
  KE: { name: "Kenya", aliases: ["kenya"], lat: -0.02, lng: 37.91 },
  MA: { name: "Morocco", aliases: ["morocco", "maroc"], lat: 31.79, lng: -7.09 },

  IL: { name: "Israel", aliases: ["israel", "ישראל"], lat: 31.05, lng: 34.85 },
  AE: {
    name: "United Arab Emirates",
    aliases: ["united arab emirates", "uae", "u.a.e", "u.a.e."],
    lat: 23.42,
    lng: 53.85,
  },
  SA: {
    name: "Saudi Arabia",
    aliases: ["saudi arabia", "ksa"],
    lat: 23.89,
    lng: 45.08,
  },
  IR: { name: "Iran", aliases: ["iran"], lat: 32.43, lng: 53.69 },
};

/**
 * Aliases that are SO short they could be ambiguous (e.g. a two-letter
 * subdivision code), but in practice on GitHub they're nearly always the
 * country. Treated as `medium` confidence rather than `high`.
 */
const MEDIUM_CONFIDENCE_ALIASES = new Set<string>(["de"]);

/**
 * Curated map of major cities → country code. Lowercased.
 * Keep small and obvious — only world-recognized tech/business hubs.
 */
export const CITY_TO_COUNTRY: Record<string, string> = {
  // US
  "san francisco": "US",
  "san francisco bay area": "US",
  "sf": "US",
  "new york": "US",
  "new york city": "US",
  "nyc": "US",
  "brooklyn": "US",
  "manhattan": "US",
  "los angeles": "US",
  "la": "US",
  "seattle": "US",
  "austin": "US",
  "boston": "US",
  "chicago": "US",
  "denver": "US",
  "portland": "US",
  "san diego": "US",
  "san jose": "US",
  "palo alto": "US",
  "mountain view": "US",
  "menlo park": "US",
  "cupertino": "US",
  "cambridge ma": "US",
  "washington dc": "US",
  "washington d.c.": "US",
  "dc": "US",
  "atlanta": "US",
  "miami": "US",
  "philadelphia": "US",
  "pittsburgh": "US",
  "minneapolis": "US",
  "detroit": "US",
  "houston": "US",
  "dallas": "US",
  "phoenix": "US",
  "salt lake city": "US",
  "raleigh": "US",
  "durham": "US",
  "boulder": "US",
  // Greater Seattle / Microsoft metro — common in real GitHub profiles.
  "redmond": "US",
  "bellevue": "US",
  "kirkland": "US",
  // CA
  "toronto": "CA",
  "vancouver": "CA",
  "montreal": "CA",
  "ottawa": "CA",
  "waterloo": "CA",
  "calgary": "CA",
  // GB
  "london": "GB",
  "manchester": "GB",
  "edinburgh": "GB",
  "cambridge uk": "GB",
  "oxford": "GB",
  // EU
  "paris": "FR",
  "lyon": "FR",
  "berlin": "DE",
  "munich": "DE",
  "münchen": "DE",
  "hamburg": "DE",
  "frankfurt": "DE",
  "cologne": "DE",
  "köln": "DE",
  "amsterdam": "NL",
  "rotterdam": "NL",
  "the hague": "NL",
  "brussels": "BE",
  "zürich": "CH",
  "zurich": "CH",
  "geneva": "CH",
  "vienna": "AT",
  "wien": "AT",
  "stockholm": "SE",
  "gothenburg": "SE",
  "oslo": "NO",
  "copenhagen": "DK",
  "helsinki": "FI",
  "warsaw": "PL",
  "kraków": "PL",
  "krakow": "PL",
  "prague": "CZ",
  "praha": "CZ",
  "madrid": "ES",
  "barcelona": "ES",
  "lisbon": "PT",
  "lisboa": "PT",
  "porto": "PT",
  "rome": "IT",
  "roma": "IT",
  "milan": "IT",
  "milano": "IT",
  "athens": "GR",
  "istanbul": "TR",
  "ankara": "TR",
  "moscow": "RU",
  "saint petersburg": "RU",
  "st petersburg": "RU",
  "kyiv": "UA",
  "kiev": "UA",
  "dublin": "IE",
  // Asia
  "bangalore": "IN",
  "bengaluru": "IN",
  "mumbai": "IN",
  "bombay": "IN",
  "delhi": "IN",
  "new delhi": "IN",
  "hyderabad": "IN",
  "chennai": "IN",
  "pune": "IN",
  "kolkata": "IN",
  "noida": "IN",
  "gurgaon": "IN",
  "gurugram": "IN",
  "karachi": "PK",
  "lahore": "PK",
  "islamabad": "PK",
  "dhaka": "BD",
  "beijing": "CN",
  "shanghai": "CN",
  "shenzhen": "CN",
  "guangzhou": "CN",
  "hangzhou": "CN",
  "tokyo": "JP",
  "osaka": "JP",
  "kyoto": "JP",
  "seoul": "KR",
  "busan": "KR",
  "taipei": "TW",
  "hong kong": "HK",
  "singapore": "SG",
  "jakarta": "ID",
  "bandung": "ID",
  "bangkok": "TH",
  "ho chi minh city": "VN",
  "saigon": "VN",
  "hanoi": "VN",
  "manila": "PH",
  "kuala lumpur": "MY",
  // Oceania
  "sydney": "AU",
  "melbourne": "AU",
  "brisbane": "AU",
  "perth": "AU",
  "canberra": "AU",
  "auckland": "NZ",
  "wellington": "NZ",
  // Africa
  "cape town": "ZA",
  "johannesburg": "ZA",
  "nairobi": "KE",
  "lagos": "NG",
  "abuja": "NG",
  "cairo": "EG",
  "casablanca": "MA",
  // Middle East
  "tel aviv": "IL",
  "jerusalem": "IL",
  "dubai": "AE",
  "abu dhabi": "AE",
  "riyadh": "SA",
  "tehran": "IR",
  // LatAm
  "são paulo": "BR",
  "sao paulo": "BR",
  "rio de janeiro": "BR",
  "buenos aires": "AR",
  "santiago": "CL",
  "bogotá": "CO",
  "bogota": "CO",
  "mexico city": "MX",
  "ciudad de méxico": "MX",
  "ciudad de mexico": "MX",
  "guadalajara": "MX",
};

/** Build the alias → code lookup once at module load. */
const ALIAS_TO_CODE = new Map<string, string>();
for (const [code, rec] of Object.entries(COUNTRIES)) {
  ALIAS_TO_CODE.set(rec.name.toLowerCase(), code);
  for (const a of rec.aliases) {
    ALIAS_TO_CODE.set(a.toLowerCase(), code);
  }
}

export function lookupCountryByText(token: string): {
  code: string;
  isMediumAlias: boolean;
} | null {
  const lower = token.toLowerCase();
  const code = ALIAS_TO_CODE.get(lower);
  if (!code) return null;
  return { code, isMediumAlias: MEDIUM_CONFIDENCE_ALIASES.has(lower) };
}

export function lookupCountryByCity(token: string): string | null {
  return CITY_TO_COUNTRY[token.toLowerCase()] ?? null;
}

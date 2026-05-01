/**
 * Pure inference: turn a free-text "location" string from a GitHub profile
 * into a country, country code, and confidence level.
 *
 * Deterministic only — no external geocoding services.
 *
 * Strategy:
 *  1. Trim, normalize whitespace, strip punctuation per token.
 *  2. Split on `, / |` (typical "City, State, Country" separators).
 *  3. Walk segments from RIGHT to LEFT (country usually trails) trying:
 *     a. Country canonical name or alias (Map lookup).
 *     b. City name (Map lookup).
 *  4. First match wins.
 *  5. Confidence: high for canonical name / strong alias / known city,
 *     medium for ambiguous short alias, none if no match.
 */

import {
  COUNTRIES,
  lookupCountryByText,
  lookupCountryByCity,
} from "@/lib/data/countries";

export type LocationConfidence = "high" | "medium" | "low" | "none";

export type InferredLocation = {
  ownerLocationRaw: string | null;
  ownerCountry: string | null;
  ownerCountryCode: string | null;
  locationConfidence: LocationConfidence;
};

const NONE: InferredLocation = {
  ownerLocationRaw: null,
  ownerCountry: null,
  ownerCountryCode: null,
  locationConfidence: "none",
};

function normalizeToken(s: string): string {
  // Strip surrounding punctuation but keep internal characters meaningful.
  return s
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[*_~`"'()[\]{}]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function inferOwnerLocation(raw: string | null | undefined): InferredLocation {
  if (raw == null) return NONE;
  const trimmedRaw = String(raw).trim();
  if (!trimmedRaw) return NONE;

  const ownerLocationRaw = trimmedRaw;

  // Split on common separators. Keep order so we can prefer the trailing token.
  const segments = trimmedRaw
    .split(/[,/|]/g)
    .map(normalizeToken)
    .filter(Boolean);

  if (segments.length === 0) {
    return { ...NONE, ownerLocationRaw };
  }

  // 1) Right-to-left: try country (canonical name or alias) first,
  //    since "City, Country" is the dominant convention.
  for (let i = segments.length - 1; i >= 0; i--) {
    const seg = segments[i]!;
    const hit = lookupCountryByText(seg);
    if (hit) {
      const rec = COUNTRIES[hit.code]!;
      return {
        ownerLocationRaw,
        ownerCountry: rec.name,
        ownerCountryCode: hit.code,
        locationConfidence: hit.isMediumAlias ? "medium" : "high",
      };
    }
  }

  // 2) Right-to-left: try city. A known city → high confidence on its country.
  for (let i = segments.length - 1; i >= 0; i--) {
    const seg = segments[i]!;
    const code = lookupCountryByCity(seg);
    if (code) {
      const rec = COUNTRIES[code]!;
      return {
        ownerLocationRaw,
        ownerCountry: rec.name,
        ownerCountryCode: code,
        locationConfidence: "high",
      };
    }
  }

  // 3) Last-ditch: the WHOLE normalized string as a country (handles
  //    inputs like "the netherlands" that survive splitting unchanged).
  const whole = normalizeToken(trimmedRaw);
  const hit = lookupCountryByText(whole);
  if (hit) {
    const rec = COUNTRIES[hit.code]!;
    return {
      ownerLocationRaw,
      ownerCountry: rec.name,
      ownerCountryCode: hit.code,
      locationConfidence: hit.isMediumAlias ? "medium" : "high",
    };
  }

  return { ...NONE, ownerLocationRaw };
}

import { test } from "node:test";
import assert from "node:assert/strict";
import { inferOwnerLocation } from "../lib/github/infer-location";

/* ============== Empty / garbage input → none ============== */

test("returns 'none' for null", () => {
  const r = inferOwnerLocation(null);
  assert.equal(r.ownerLocationRaw, null);
  assert.equal(r.ownerCountry, null);
  assert.equal(r.ownerCountryCode, null);
  assert.equal(r.locationConfidence, "none");
});

test("returns 'none' for undefined", () => {
  const r = inferOwnerLocation(undefined);
  assert.equal(r.locationConfidence, "none");
  assert.equal(r.ownerLocationRaw, null);
});

test("returns 'none' for empty string", () => {
  const r = inferOwnerLocation("");
  assert.equal(r.locationConfidence, "none");
  assert.equal(r.ownerLocationRaw, null);
});

test("returns 'none' for whitespace-only string", () => {
  const r = inferOwnerLocation("   \t\n  ");
  assert.equal(r.locationConfidence, "none");
});

test("returns 'none' for string with no recognizable place", () => {
  const r = inferOwnerLocation("the third moon of jupiter");
  assert.equal(r.locationConfidence, "none");
  assert.equal(r.ownerCountry, null);
  assert.equal(r.ownerCountryCode, null);
  // raw is preserved even when we can't map.
  assert.equal(r.ownerLocationRaw, "the third moon of jupiter");
});

/* ============== Intentionally-vague profile locations stay unmapped ============== *
 * Many big orgs (Shopify, Mozilla, Django, etc) put placeholder strings in
 * their GitHub profile location field. We must NOT guess a country for these.
 * If any of these ever start mapping, that's a regression — the globe would
 * highlight a country we have no real evidence for. */
for (const vague of [
  "Internet",
  "the internet",
  "Worldwide",
  "Remote",
  "Earth",
  "🌍",
  "Everywhere",
]) {
  test(`vague location "${vague}" stays unmapped (no false country claim)`, () => {
    const r = inferOwnerLocation(vague);
    assert.equal(r.ownerCountry, null);
    assert.equal(r.ownerCountryCode, null);
    assert.equal(r.locationConfidence, "none");
    // raw is preserved so the UI can still show what the owner typed.
    assert.equal(r.ownerLocationRaw, vague);
  });
}

/* ============== Greater-Seattle data-coverage gap (regression: Microsoft) ============== */

test("'Redmond, WA' → US, high confidence (regression: microsoft profile)", () => {
  const r = inferOwnerLocation("Redmond, WA");
  assert.equal(r.ownerCountryCode, "US");
  assert.equal(r.ownerCountry, "United States");
  assert.equal(r.locationConfidence, "high");
});

test("'Bellevue, WA' → US, high confidence", () => {
  const r = inferOwnerLocation("Bellevue, WA");
  assert.equal(r.ownerCountryCode, "US");
  assert.equal(r.locationConfidence, "high");
});

test("'Kirkland, WA' → US, high confidence", () => {
  const r = inferOwnerLocation("Kirkland, WA");
  assert.equal(r.ownerCountryCode, "US");
  assert.equal(r.locationConfidence, "high");
});

/* ============== Exact canonical country names → high ============== */

test("'India' → IN, high confidence", () => {
  const r = inferOwnerLocation("India");
  assert.equal(r.ownerCountryCode, "IN");
  assert.equal(r.ownerCountry, "India");
  assert.equal(r.locationConfidence, "high");
});

test("'Germany' → DE, high confidence", () => {
  const r = inferOwnerLocation("Germany");
  assert.equal(r.ownerCountryCode, "DE");
  assert.equal(r.locationConfidence, "high");
});

test("'United States' → US, high confidence", () => {
  const r = inferOwnerLocation("United States");
  assert.equal(r.ownerCountryCode, "US");
  assert.equal(r.locationConfidence, "high");
});

test("'United Kingdom' → GB, high confidence", () => {
  const r = inferOwnerLocation("United Kingdom");
  assert.equal(r.ownerCountryCode, "GB");
  assert.equal(r.locationConfidence, "high");
});

test("country lookup is case-insensitive", () => {
  const a = inferOwnerLocation("germany");
  const b = inferOwnerLocation("GERMANY");
  const c = inferOwnerLocation("GeRmAnY");
  assert.equal(a.ownerCountryCode, "DE");
  assert.equal(b.ownerCountryCode, "DE");
  assert.equal(c.ownerCountryCode, "DE");
});

test("trims surrounding whitespace", () => {
  const r = inferOwnerLocation("   Japan   ");
  assert.equal(r.ownerCountryCode, "JP");
  assert.equal(r.locationConfidence, "high");
  assert.equal(r.ownerLocationRaw, "Japan");
});

/* ============== Aliases ============== */

test("'USA' → US, high confidence", () => {
  const r = inferOwnerLocation("USA");
  assert.equal(r.ownerCountryCode, "US");
  assert.equal(r.locationConfidence, "high");
});

test("'US' → US, high confidence", () => {
  const r = inferOwnerLocation("US");
  assert.equal(r.ownerCountryCode, "US");
  assert.equal(r.locationConfidence, "high");
});

test("'U.S.A.' → US, high confidence", () => {
  const r = inferOwnerLocation("U.S.A.");
  assert.equal(r.ownerCountryCode, "US");
  assert.equal(r.locationConfidence, "high");
});

test("'UK' → GB, high confidence", () => {
  const r = inferOwnerLocation("UK");
  assert.equal(r.ownerCountryCode, "GB");
  assert.equal(r.locationConfidence, "high");
});

test("'England' → GB, high confidence", () => {
  const r = inferOwnerLocation("England");
  assert.equal(r.ownerCountryCode, "GB");
});

test("'Holland' → NL, high confidence", () => {
  const r = inferOwnerLocation("Holland");
  assert.equal(r.ownerCountryCode, "NL");
  assert.equal(r.ownerCountry, "Netherlands");
});

test("'Deutschland' → DE, high confidence", () => {
  const r = inferOwnerLocation("Deutschland");
  assert.equal(r.ownerCountryCode, "DE");
  assert.equal(r.locationConfidence, "high");
});

test("'DE' → DE, MEDIUM confidence (short ambiguous alias)", () => {
  const r = inferOwnerLocation("DE");
  assert.equal(r.ownerCountryCode, "DE");
  assert.equal(r.locationConfidence, "medium");
});

/* ============== "City, Country" composite ============== */

test("'Berlin, Germany' → DE, high confidence", () => {
  const r = inferOwnerLocation("Berlin, Germany");
  assert.equal(r.ownerCountryCode, "DE");
  assert.equal(r.locationConfidence, "high");
});

test("'Bangalore, India' → IN, high confidence", () => {
  const r = inferOwnerLocation("Bangalore, India");
  assert.equal(r.ownerCountryCode, "IN");
  assert.equal(r.locationConfidence, "high");
});

test("'San Francisco, CA, USA' → US, high confidence", () => {
  const r = inferOwnerLocation("San Francisco, CA, USA");
  assert.equal(r.ownerCountryCode, "US");
  assert.equal(r.locationConfidence, "high");
});

test("'San Francisco, CA' (city only, no country segment) → US via city map", () => {
  const r = inferOwnerLocation("San Francisco, CA");
  assert.equal(r.ownerCountryCode, "US");
  assert.equal(r.ownerCountry, "United States");
  assert.equal(r.locationConfidence, "high");
});

test("'London, UK' → GB", () => {
  const r = inferOwnerLocation("London, UK");
  assert.equal(r.ownerCountryCode, "GB");
});

test("trailing country wins over leading city when they disagree", () => {
  // Berlin is a German city but trailing "Argentina" should win since
  // we walk right-to-left for the country pass first.
  const r = inferOwnerLocation("Berlin, Argentina");
  assert.equal(r.ownerCountryCode, "AR");
});

/* ============== City-only input (no country segment) ============== */

test("'Tokyo' (city only) → JP, high confidence", () => {
  const r = inferOwnerLocation("Tokyo");
  assert.equal(r.ownerCountryCode, "JP");
  assert.equal(r.ownerCountry, "Japan");
  assert.equal(r.locationConfidence, "high");
});

test("'NYC' alias → US", () => {
  const r = inferOwnerLocation("NYC");
  assert.equal(r.ownerCountryCode, "US");
});

test("'Bengaluru' (alternate Bangalore name) → IN", () => {
  const r = inferOwnerLocation("Bengaluru");
  assert.equal(r.ownerCountryCode, "IN");
});

/* ============== Slash and pipe separators ============== */

test("slash separator: 'San Francisco / California'", () => {
  const r = inferOwnerLocation("San Francisco / California");
  assert.equal(r.ownerCountryCode, "US");
});

test("pipe separator: 'Tokyo | Japan'", () => {
  const r = inferOwnerLocation("Tokyo | Japan");
  assert.equal(r.ownerCountryCode, "JP");
});

/* ============== Stripping decorative punctuation ============== */

test("strips decorative quotes and parens", () => {
  const r = inferOwnerLocation('"Berlin", (Germany)');
  assert.equal(r.ownerCountryCode, "DE");
});

test("preserves the raw input verbatim even when matching", () => {
  const r = inferOwnerLocation("Berlin, Germany 🌍");
  assert.equal(r.ownerLocationRaw, "Berlin, Germany 🌍");
  assert.equal(r.ownerCountryCode, "DE");
});

/* ============== Whole-string fallback ============== */

test("'the netherlands' (whole-string country alias) → NL", () => {
  const r = inferOwnerLocation("the netherlands");
  assert.equal(r.ownerCountryCode, "NL");
});

/* ============== Non-string input safety ============== */

test("number input is treated as 'none' safely", () => {
  // @ts-expect-error - intentional misuse to verify runtime tolerance
  const r = inferOwnerLocation(42);
  // The function String()s the input, so "42" → no match → none
  assert.equal(r.locationConfidence, "none");
  assert.equal(r.ownerLocationRaw, "42");
});

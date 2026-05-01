"use client";

/**
 * Decorative background visualization — premium technical wireframe.
 *
 * IDLE: black backdrop + slowly rotating wireframe globe with real
 *       world coastlines (110m world-atlas).
 * LOCATED: globe smoothly UNROLLS into a flat equirectangular map by
 *       interpolating each vertex between orthographic and equirectangular
 *       projections. The inferred owner country is then stroked in soft amber.
 *
 * - HTML Canvas (devicePixelRatio aware), single rAF loop.
 * - Pure monochrome: off-white wireframe on near-black backdrop.
 * - No glow, no gradients, no marker dots — only thin linework.
 * - Pauses when the tab is hidden; honours `prefers-reduced-motion`.
 *
 * NEVER claims the repo is "from" a country — labelling lives in the UI.
 */

import * as React from "react";
import { feature as topoFeature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type {
  Feature,
  FeatureCollection,
  Geometry,
  Polygon,
  MultiPolygon,
} from "geojson";

type Props = {
  countryCode: string | null;
  /** True when we have high/medium-confidence inference and should highlight. */
  highlight: boolean;
};

/** ISO-3166-1 alpha-2 → numeric (3-digit zero-padded) for the countries we
 *  can infer. Numeric ids are how world-atlas/countries-110m identifies
 *  features (`feature.id`). */
const ISO2_TO_ISO3NUM: Record<string, string> = {
  US: "840", GB: "826", CA: "124", MX: "484",
  BR: "076", AR: "032", CL: "152", CO: "170",
  IE: "372", FR: "250", DE: "276", ES: "724", PT: "620",
  IT: "380", NL: "528", BE: "056", CH: "756", AT: "040",
  SE: "752", NO: "578", DK: "208", FI: "246",
  PL: "616", CZ: "203", RO: "642", GR: "300", TR: "792",
  RU: "643", UA: "804",
  IN: "356", PK: "586", BD: "050", CN: "156", JP: "392", KR: "410",
  TW: "158", HK: "344", SG: "702", ID: "360", TH: "764", VN: "704",
  PH: "608", MY: "458",
  AU: "036", NZ: "554",
  ZA: "710", EG: "818", NG: "566", KE: "404", MA: "504",
  IL: "376", AE: "784", SA: "682", IR: "364",
};

const COLORS = {
  backdrop: "#08090c",
  graticule: "rgba(255, 255, 255, 0.10)",
  globeRim: "rgba(255, 255, 255, 0.20)",
  coastFront: "rgba(255, 255, 255, 0.55)",
  coastBack: "rgba(255, 255, 255, 0.55)", // alpha applied per-segment
  highlight: "#d4a056",
};

/** Globe rotation speed, degrees per second of longitude. */
const ROT_SPEED_DEG_PER_SEC = 6;
/** Length of the unfold animation. */
const MORPH_DURATION_MS = 1600;
/** Easing for the unfold. */
function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

/* -------------------------------------------------------------------- */
/*  Geometry / projection                                               */
/* -------------------------------------------------------------------- */

/** Lerp a point through orthographic ↔ equirectangular.
 *  Output is in *unit* coords (x ∈ [-1,1], y ∈ [-1,1]).
 *  Front-side gets alpha=1, back-side fades in as t→1. */
function morphProject(
  lng: number,
  lat: number,
  t: number,
  rotLng: number,
): { x: number; y: number; alpha: number } {
  // Apply rotation in longitude (so the globe spins), then wrap to [-180,180].
  const lambda = (((lng + rotLng + 180) % 360) + 360) % 360 - 180;
  const lamRad = (lambda * Math.PI) / 180;
  const phiRad = (lat * Math.PI) / 180;
  const cosP = Math.cos(phiRad);
  const cosL = Math.cos(lamRad);
  const cosc = cosP * cosL; // > 0 → visible (front) hemisphere
  // Orthographic (centred at lng=0,lat=0).
  const xO = cosP * Math.sin(lamRad);
  const yO = -Math.sin(phiRad);
  // Equirectangular.
  const xE = lambda / 180;
  const yE = -lat / 90;
  // Lerp.
  const x = xO * (1 - t) + xE * t;
  const y = yO * (1 - t) + yE * t;
  // Backside fades in as we unroll.
  const alpha = cosc >= 0 ? 1 : Math.max(0, (t - 0.4) / 0.5);
  return { x, y, alpha };
}

/** Walk a polygon ring and stroke its segments to the canvas. */
function drawRing(
  ctx: CanvasRenderingContext2D,
  ring: number[][],
  t: number,
  rotLng: number,
  scale: number,
  cx: number,
  cy: number,
  baseAlpha: number,
) {
  const n = ring.length;
  if (n < 2) return;
  let prev = morphProject(ring[0][0], ring[0][1], t, rotLng);
  for (let i = 1; i < n; i++) {
    const curr = morphProject(ring[i][0], ring[i][1], t, rotLng);
    const a = Math.min(prev.alpha, curr.alpha);
    if (a > 0.02) {
      ctx.globalAlpha = a * baseAlpha;
      ctx.beginPath();
      ctx.moveTo(cx + prev.x * scale, cy + prev.y * scale);
      ctx.lineTo(cx + curr.x * scale, cy + curr.y * scale);
      ctx.stroke();
    }
    prev = curr;
  }
}

/** Walk a polygon ring and *fill* it (used for highlighted country). */
function fillRing(
  ctx: CanvasRenderingContext2D,
  ring: number[][],
  t: number,
  rotLng: number,
  scale: number,
  cx: number,
  cy: number,
) {
  const n = ring.length;
  if (n < 3) return;
  // Skip rings that are entirely backside while on the globe.
  let anyVisible = false;
  for (let i = 0; i < n; i++) {
    const p = morphProject(ring[i][0], ring[i][1], t, rotLng);
    if (p.alpha > 0.5) {
      anyVisible = true;
      break;
    }
  }
  if (!anyVisible) return;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const p = morphProject(ring[i][0], ring[i][1], t, rotLng);
    const x = cx + p.x * scale;
    const y = cy + p.y * scale;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** Iterate the polygons of a feature: yields each linear ring (the
 *  *outer* boundary; we ignore holes since at 110m there's barely any). */
function* eachOuterRing(geom: Geometry): Generator<number[][]> {
  if (geom.type === "Polygon") {
    yield (geom as Polygon).coordinates[0];
  } else if (geom.type === "MultiPolygon") {
    for (const poly of (geom as MultiPolygon).coordinates) {
      yield poly[0];
    }
  }
}

/** Yield ALL rings (incl. holes) — used for the highlight fill so islands
 *  render correctly. */
function* eachRing(geom: Geometry): Generator<number[][]> {
  if (geom.type === "Polygon") {
    for (const ring of (geom as Polygon).coordinates) yield ring;
  } else if (geom.type === "MultiPolygon") {
    for (const poly of (geom as MultiPolygon).coordinates) {
      for (const ring of poly) yield ring;
    }
  }
}

/** Pre-built graticule (lng/lat grid). Returns an array of polylines in
 *  [lng, lat] coords. */
function buildGraticule(): number[][][] {
  const lines: number[][][] = [];
  // Meridians every 30°.
  for (let lng = -180; lng <= 180; lng += 30) {
    const line: number[][] = [];
    for (let lat = -80; lat <= 80; lat += 5) line.push([lng, lat]);
    lines.push(line);
  }
  // Parallels every 30°.
  for (let lat = -60; lat <= 60; lat += 30) {
    if (lat === 0) continue;
    const line: number[][] = [];
    for (let lng = -180; lng <= 180; lng += 5) line.push([lng, lat]);
    lines.push(line);
  }
  // Equator emphasised.
  const equator: number[][] = [];
  for (let lng = -180; lng <= 180; lng += 5) equator.push([lng, 0]);
  lines.push(equator);
  return lines;
}

/* -------------------------------------------------------------------- */
/*  Component                                                           */
/* -------------------------------------------------------------------- */

type WorldData = {
  features: Feature[];
  byNumericId: Map<string, Feature>;
};

export function BackgroundGlobe({ countryCode, highlight }: Props) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [world, setWorld] = React.useState<WorldData | null>(null);
  const reducedMotion = useReducedMotion();
  const graticule = React.useMemo(buildGraticule, []);

  // Load the world TopoJSON once on mount.
  React.useEffect(() => {
    let cancelled = false;
    fetch("/world-110m.json")
      .then((r) => r.json())
      .then((topology: Topology) => {
        if (cancelled) return;
        const fc = topoFeature(
          topology,
          topology.objects.countries as GeometryCollection,
        ) as unknown as FeatureCollection;
        const byNumericId = new Map<string, Feature>();
        for (const f of fc.features) {
          if (f.id != null) byNumericId.set(String(f.id), f);
        }
        setWorld({ features: fc.features, byNumericId });
      })
      .catch(() => {
        /* non-fatal: nothing renders if the world data fails to load */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Resolve highlight ISO numeric code (or null).
  const highlightFeature = React.useMemo<Feature | null>(() => {
    if (!world || !highlight || !countryCode) return null;
    const numId = ISO2_TO_ISO3NUM[countryCode];
    if (!numId) return null;
    return world.byNumericId.get(numId) ?? null;
  }, [world, highlight, countryCode]);

  /* Mutable animation state (refs to avoid re-renders). */
  const stateRef = React.useRef({
    rotation: 0,
    t: 0, // 0 = globe, 1 = flat map
    target: 0, // animate `t` toward this
    tStartedAt: 0,
    tStartValue: 0,
    morphDuration: MORPH_DURATION_MS,
    lastTs: 0,
  });

  // When `highlight` changes, drive `t` toward 0 or 1.
  React.useEffect(() => {
    const s = stateRef.current;
    const now = performance.now();
    s.target = highlight ? 1 : 0;
    s.tStartedAt = now;
    s.tStartValue = s.t;
    if (reducedMotion) {
      s.t = s.target;
      s.morphDuration = 0;
    } else {
      s.morphDuration = MORPH_DURATION_MS;
    }
  }, [highlight, reducedMotion]);

  // Main rAF render loop.
  React.useEffect(() => {
    if (!world) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let stopped = false;

    const onResize = () => sizeCanvasToWindow(canvas);
    sizeCanvasToWindow(canvas);
    window.addEventListener("resize", onResize);

    const onVisibility = () => {
      if (document.hidden) {
        stopped = true;
      } else if (stopped) {
        stopped = false;
        stateRef.current.lastTs = 0;
        raf = requestAnimationFrame(frame);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    const frame = (ts: number) => {
      if (stopped) return;
      const s = stateRef.current;
      const dt = s.lastTs ? Math.min((ts - s.lastTs) / 1000, 0.1) : 0;
      s.lastTs = ts;

      // Advance morph `t`.
      if (s.morphDuration === 0) {
        s.t = s.target;
      } else {
        const elapsed = ts - s.tStartedAt;
        const k = Math.max(0, Math.min(1, elapsed / s.morphDuration));
        s.t = s.tStartValue + (s.target - s.tStartValue) * easeInOutCubic(k);
      }

      // Rotation: only spin while we're on the globe side
      // (smoothly slow as we morph to the map).
      if (!reducedMotion) {
        const spinMul = 1 - s.t; // 1 when globe, 0 when flat
        s.rotation = (s.rotation + ROT_SPEED_DEG_PER_SEC * dt * spinMul) % 360;
      }

      draw(ctx, canvas, s.t, s.rotation, world, highlightFeature, graticule);

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [world, highlightFeature, graticule, reducedMotion]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{ background: COLORS.backdrop }}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}

/* -------------------------------------------------------------------- */
/*  Helpers                                                             */
/* -------------------------------------------------------------------- */

function sizeCanvasToWindow(canvas: HTMLCanvasElement) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  const ctx = canvas.getContext("2d");
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

function draw(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  t: number,
  rotation: number,
  world: WorldData,
  highlightFeature: Feature | null,
  graticule: number[][][],
) {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  ctx.clearRect(0, 0, w, h);

  // Sizing: unit projection scaled to fit nicely.
  // Globe diameter at t=0  = 2*R
  // Map width  at t=1      = 2*R, height = R
  const scale = Math.min(w * 0.27, h * 0.42);
  const cx = w / 2;
  const cy = h / 2;

  // ----- Globe rim / map frame (only meaningful at endpoints, but draw always for continuity) -----
  ctx.lineWidth = 1;
  ctx.strokeStyle = COLORS.globeRim;
  ctx.globalAlpha = 1;
  ctx.beginPath();
  // The outer silhouette interpolates from circle to rectangle; we approximate
  // by drawing the circle at low opacity that fades out as we morph.
  if (t < 0.95) {
    ctx.globalAlpha = (1 - t) * 0.7;
    ctx.arc(cx, cy, scale, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (t > 0.05) {
    ctx.globalAlpha = t * 0.45;
    ctx.beginPath();
    ctx.rect(cx - scale, cy - scale, scale * 2, scale * 2);
    ctx.stroke();
  }

  // ----- Graticule (lat/lng grid) -----
  ctx.lineWidth = 0.5;
  ctx.strokeStyle = COLORS.graticule;
  for (const line of graticule) {
    drawPolyline(ctx, line, t, rotation, scale, cx, cy, 1);
  }

  // ----- Country highlight FILL (under coastlines) -----
  if (highlightFeature && highlightFeature.geometry) {
    ctx.fillStyle = COLORS.highlight;
    ctx.globalAlpha = 0.18;
    for (const ring of eachRing(highlightFeature.geometry)) {
      fillRing(ctx, ring, t, rotation, scale, cx, cy);
      ctx.fill();
    }
  }

  // ----- Coastlines (all countries) -----
  ctx.lineWidth = 0.65;
  ctx.strokeStyle = COLORS.coastFront;
  for (const f of world.features) {
    if (!f.geometry) continue;
    if (f === highlightFeature) continue; // drawn separately below
    for (const ring of eachOuterRing(f.geometry)) {
      drawRing(ctx, ring, t, rotation, scale, cx, cy, 1);
    }
  }

  // ----- Highlighted country STROKE on top -----
  if (highlightFeature && highlightFeature.geometry) {
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = COLORS.highlight;
    for (const ring of eachOuterRing(highlightFeature.geometry)) {
      drawRing(ctx, ring, t, rotation, scale, cx, cy, 1);
    }
  }

  ctx.globalAlpha = 1;
}

function drawPolyline(
  ctx: CanvasRenderingContext2D,
  line: number[][],
  t: number,
  rotLng: number,
  scale: number,
  cx: number,
  cy: number,
  baseAlpha: number,
) {
  const n = line.length;
  if (n < 2) return;
  let prev = morphProject(line[0][0], line[0][1], t, rotLng);
  for (let i = 1; i < n; i++) {
    const curr = morphProject(line[i][0], line[i][1], t, rotLng);
    const a = Math.min(prev.alpha, curr.alpha);
    if (a > 0.02) {
      ctx.globalAlpha = a * baseAlpha;
      ctx.beginPath();
      ctx.moveTo(cx + prev.x * scale, cy + prev.y * scale);
      ctx.lineTo(cx + curr.x * scale, cy + curr.y * scale);
      ctx.stroke();
    }
    prev = curr;
  }
}

/**
 * Heuristic ranking of repo tree entries.
 *
 * Scores each file by summing:
 *   - exact filename matches (root-level config / docs files)
 *   - extension weights
 *   - small bonus for being inside an "important" top-level directory
 *   - depth penalty
 *
 * Excludes anything inside a known ignored directory.
 *
 * Keep these tables small and easy to tweak.
 */

import type { TreeEntry } from "@/lib/types";

const ROOT_PRIORITY_EXACT: Record<string, number> = {
  "README.md": 100,
  "README.rst": 90,
  "README": 80,
  "package.json": 80,
  "pyproject.toml": 80,
  "Cargo.toml": 80,
  "go.mod": 80,
  "pom.xml": 70,
  "build.gradle": 70,
  "Gemfile": 70,
  "composer.json": 70,
  "Dockerfile": 60,
  "Makefile": 55,
  "tsconfig.json": 50,
  "next.config.ts": 50,
  "next.config.js": 50,
  "vite.config.ts": 50,
  "vite.config.js": 50,
  "tailwind.config.ts": 40,
  "tailwind.config.js": 40,
  ".env.example": 40,
  "LICENSE": 35,
  "LICENSE.md": 35,
  "CONTRIBUTING.md": 35,
  "CHANGELOG.md": 30,
};

const EXTENSION_SCORE: Record<string, number> = {
  md: 8,
  ts: 7,
  tsx: 7,
  js: 6,
  jsx: 6,
  py: 7,
  rs: 7,
  go: 7,
  rb: 6,
  java: 6,
  kt: 6,
  cs: 6,
  cpp: 5,
  c: 5,
  h: 4,
  hpp: 4,
  swift: 6,
  vue: 6,
  svelte: 6,
  json: 3,
  yaml: 3,
  yml: 3,
  toml: 3,
  sh: 4,
  html: 3,
  css: 3,
};

const IMPORTANT_DIRS = new Set([
  "src",
  "app",
  "lib",
  "pages",
  "docs",
  "packages",
  "components",
]);

const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "out",
  ".next",
  ".turbo",
  "vendor",
  "target",
  ".venv",
  "venv",
  "__pycache__",
  ".cache",
  "coverage",
]);

function getExt(name: string): string {
  const idx = name.lastIndexOf(".");
  return idx > 0 ? name.slice(idx + 1).toLowerCase() : "";
}

function isIgnored(path: string): boolean {
  for (const segment of path.split("/")) {
    if (IGNORE_DIRS.has(segment)) return true;
  }
  return false;
}

function scoreEntry(path: string, type: "blob" | "tree"): number {
  if (type !== "blob") return 0;

  const segments = path.split("/");
  const name = segments[segments.length - 1];
  const depth = segments.length;

  let score = 0;

  // Exact root-level filename matches.
  if (depth === 1 && ROOT_PRIORITY_EXACT[name] != null) {
    score += ROOT_PRIORITY_EXACT[name];
  }

  // README in any directory still gets a boost (smaller).
  if (depth > 1 && /^README(\.[a-z]+)?$/i.test(name)) {
    score += 20;
  }

  // Extension weight.
  const ext = getExt(name);
  if (ext && EXTENSION_SCORE[ext] != null) {
    score += EXTENSION_SCORE[ext];
  }

  // Bonus if directly inside an important top-level directory.
  if (depth > 1 && IMPORTANT_DIRS.has(segments[0])) {
    score += 4;
  }

  // Depth penalty (root files > nested files of the same kind).
  score -= Math.max(0, depth - 1) * 1.5;

  return Math.max(0, Math.round(score));
}

/**
 * Score every tree entry and return the array with `importanceScore` filled in.
 * Ignored directories are filtered out entirely.
 */
export function rankFiles(
  entries: Array<{ path: string; type: "blob" | "tree"; size: number | null }>,
): TreeEntry[] {
  return entries
    .filter((e) => !isIgnored(e.path))
    .map((e) => ({
      path: e.path,
      type: e.type,
      size: e.size,
      importanceScore: scoreEntry(e.path, e.type),
    }));
}

/**
 * Pick the top N files (blobs only) by importance, descending.
 */
export function pickTopFiles(ranked: TreeEntry[], n = 10): TreeEntry[] {
  return ranked
    .filter((e) => e.type === "blob" && e.importanceScore > 0)
    .sort((a, b) => {
      if (b.importanceScore !== a.importanceScore) {
        return b.importanceScore - a.importanceScore;
      }
      return a.path.localeCompare(b.path);
    })
    .slice(0, n);
}

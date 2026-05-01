import { test } from "node:test";
import assert from "node:assert/strict";
import { buildOnboarding } from "../lib/analysis/onboarding";
import { detectProjectType } from "../lib/analysis/detect-project-type";
import type { TreeEntry } from "../lib/types";

function tree(paths: string[]): TreeEntry[] {
  return paths.map((p) => {
    const isDir = p.endsWith("/");
    const path = isDir ? p.slice(0, -1) : p;
    return {
      path,
      type: isDir ? "tree" : "blob",
      size: isDir ? null : 256,
      importanceScore: 0,
    } as TreeEntry;
  });
}

/* ------------------------------ Basics ----------------------------- */

test("README.md always becomes the first item when present", () => {
  const t = tree(["README.md", "package.json", "next.config.ts", "app/page.tsx"]);
  const pt = detectProjectType(t);
  const brief = buildOnboarding(t, [], pt);
  assert.equal(brief.readingList[0]?.path, "README.md");
  assert.equal(brief.readingList[0]?.order, 1);
});

test("entryPoint resolves to the first existing framework candidate", () => {
  const t = tree([
    "README.md",
    "package.json",
    "next.config.ts",
    "app/layout.tsx",
    "app/page.tsx",
  ]);
  const pt = detectProjectType(t);
  const brief = buildOnboarding(t, [], pt);
  // For Next.js App Router we try app/layout.tsx first.
  assert.equal(brief.entryPoint, "app/layout.tsx");
});

test("Vite + React entry resolves to src/main.tsx", () => {
  const t = tree([
    "README.md",
    "package.json",
    "vite.config.ts",
    "index.html",
    "src/main.tsx",
    "src/App.tsx",
  ]);
  const pt = detectProjectType(t);
  const brief = buildOnboarding(t, [], pt);
  assert.equal(brief.entryPoint, "src/main.tsx");
});

test("Rust binary entry resolves to src/main.rs", () => {
  const t = tree(["README.md", "Cargo.toml", "src/main.rs"]);
  const pt = detectProjectType(t);
  const brief = buildOnboarding(t, [], pt);
  assert.equal(brief.entryPoint, "src/main.rs");
});

test("Go service entry resolves to main.go", () => {
  const t = tree(["go.mod", "main.go", "internal/x.go"]);
  const pt = detectProjectType(t);
  const brief = buildOnboarding(t, [], pt);
  assert.equal(brief.entryPoint, "main.go");
});

/* --------------------- Top-files dedup + capping -------------------- */

test("top-files fill remaining slots without duplicating framework picks", () => {
  const t = tree([
    "README.md",
    "package.json",
    "next.config.ts",
    "app/layout.tsx",
    "app/page.tsx",
    "tailwind.config.ts",
    "tsconfig.json",
  ]);
  const pt = detectProjectType(t);
  const topFiles: TreeEntry[] = [
    { path: "README.md", type: "blob", size: 100, importanceScore: 100 },
    { path: "next.config.ts", type: "blob", size: 100, importanceScore: 50 },
    { path: "app/page.tsx", type: "blob", size: 100, importanceScore: 11 },
    { path: "tailwind.config.ts", type: "blob", size: 100, importanceScore: 40 },
    { path: "tsconfig.json", type: "blob", size: 100, importanceScore: 50 },
  ];
  const brief = buildOnboarding(t, topFiles, pt);
  const paths = brief.readingList.map((i) => i.path);
  // No duplicates.
  assert.equal(new Set(paths).size, paths.length);
  // README still first, framework picks come before generic top-files fallback.
  assert.equal(paths[0], "README.md");
  // Tailwind / tsconfig should appear from the top-files fill, not be skipped.
  assert.ok(paths.includes("tailwind.config.ts"));
});

test("reading list is capped at 6 items", () => {
  const paths = [
    "README.md",
    "package.json",
    "next.config.ts",
    "app/layout.tsx",
    "app/page.tsx",
    "tailwind.config.ts",
    "tsconfig.json",
    "postcss.config.js",
    "src/lib/util.ts",
    "src/components/Button.tsx",
  ];
  const t = tree(paths);
  const pt = detectProjectType(t);
  const topFiles: TreeEntry[] = paths.map((p, i) => ({
    path: p,
    type: "blob",
    size: 100,
    importanceScore: 100 - i,
  }));
  const brief = buildOnboarding(t, topFiles, pt);
  assert.equal(brief.readingList.length, 6);
  // Order is 1..6 contiguous.
  assert.deepEqual(
    brief.readingList.map((i) => i.order),
    [1, 2, 3, 4, 5, 6],
  );
});

test("framework candidate that doesn't exist in the tree is skipped silently", () => {
  // Next.js App Router detected, but no app/layout.* file actually exists.
  const t = tree([
    "README.md",
    "package.json",
    "next.config.ts",
    "app/page.tsx",
  ]);
  const pt = detectProjectType(t);
  const brief = buildOnboarding(t, [], pt);
  // entryPoint should fall through to app/page.tsx.
  assert.equal(brief.entryPoint, "app/page.tsx");
  const paths = brief.readingList.map((i) => i.path);
  assert.ok(!paths.includes("app/layout.tsx"), "non-existent file must not be listed");
});

/* ---------------------- Important directories ---------------------- */

test("importantDirs ranks code directories ahead of cosmetic ones", () => {
  const t = tree([
    "README.md",
    "package.json",
    "src/index.ts",
    "src/util.ts",
    "src/parse.ts",
    "components/Button.tsx",
    "components/Card.tsx",
    // public/, scripts/, tests/ are filtered out as support dirs.
    "public/logo.svg",
    "public/favicon.ico",
    "public/og.png",
    "scripts/build.sh",
    "tests/parse.test.ts",
    "tests/util.test.ts",
  ]);
  const brief = buildOnboarding(t, [], null);
  assert.ok(brief.importantDirs.includes("src"));
  assert.ok(brief.importantDirs.includes("components"));
  assert.ok(!brief.importantDirs.includes("public"));
  assert.ok(!brief.importantDirs.includes("scripts"));
  assert.ok(!brief.importantDirs.includes("tests"));
});

test("importantDirs is empty when every top-level dir has fewer than 2 blobs", () => {
  const t = tree(["README.md", "package.json", "src/index.ts"]);
  const brief = buildOnboarding(t, [], null);
  assert.deepEqual(brief.importantDirs, []);
});

/* --------------------- Defensive: null project type --------------- */

test("works with null projectType — falls back to README + top files", () => {
  const t = tree(["README.md", "notes.md", "scripts/run.sh"]);
  const topFiles: TreeEntry[] = [
    { path: "README.md", type: "blob", size: 100, importanceScore: 100 },
    { path: "notes.md", type: "blob", size: 100, importanceScore: 8 },
  ];
  const brief = buildOnboarding(t, topFiles, null);
  assert.equal(brief.entryPoint, null);
  assert.equal(brief.readingList[0]?.path, "README.md");
  assert.ok(brief.readingList.some((i) => i.path === "notes.md"));
});

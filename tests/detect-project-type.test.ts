import { test } from "node:test";
import assert from "node:assert/strict";
import { detectProjectType } from "../lib/analysis/detect-project-type";
import type { TreeEntry } from "../lib/types";

/** Build a synthetic ranked tree from a list of paths. */
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

/* ------------------------------ Next.js ------------------------------ */

test("detects Next.js App Router from next.config.ts + app/", () => {
  const t = tree([
    "package.json",
    "next.config.ts",
    "app/",
    "app/layout.tsx",
    "app/page.tsx",
  ]);
  const result = detectProjectType(t);
  assert.equal(result?.label, "Next.js (App Router)");
  assert.equal(result?.confidence, "high");
});

test("detects Next.js Pages Router from next.config.js + pages/", () => {
  const t = tree([
    "package.json",
    "next.config.js",
    "pages/",
    "pages/index.tsx",
    "pages/_app.tsx",
  ]);
  const result = detectProjectType(t);
  assert.equal(result?.label, "Next.js (Pages Router)");
  assert.equal(result?.confidence, "high");
});

test("detects Next.js (App) from app/ alone with package.json (no config) — medium", () => {
  const t = tree([
    "package.json",
    "app/",
    "app/layout.tsx",
    "app/page.tsx",
  ]);
  const result = detectProjectType(t);
  assert.equal(result?.label, "Next.js (App Router)");
  assert.equal(result?.confidence, "medium");
});

/* ------------------------------- Vite ------------------------------- */

test("detects Vite + React from vite.config.ts + .tsx", () => {
  const t = tree([
    "package.json",
    "vite.config.ts",
    "index.html",
    "src/main.tsx",
    "src/App.tsx",
  ]);
  const result = detectProjectType(t);
  assert.equal(result?.label, "Vite + React");
  assert.equal(result?.confidence, "high");
});

test("detects Vite + Vue from vite.config.ts + .vue", () => {
  const t = tree([
    "package.json",
    "vite.config.ts",
    "index.html",
    "src/main.ts",
    "src/App.vue",
  ]);
  const result = detectProjectType(t);
  assert.equal(result?.label, "Vite + Vue");
});

test("detects plain Vite app when no JSX/Vue/Svelte present", () => {
  const t = tree([
    "package.json",
    "vite.config.js",
    "index.html",
    "src/main.ts",
  ]);
  const result = detectProjectType(t);
  assert.equal(result?.label, "Vite app");
  assert.equal(result?.confidence, "medium");
});

/* ----------------------------- SvelteKit ---------------------------- */

test("detects SvelteKit from svelte.config + src/routes/", () => {
  const t = tree([
    "package.json",
    "svelte.config.js",
    "src/routes/",
    "src/routes/+page.svelte",
    "src/routes/+layout.svelte",
  ]);
  const result = detectProjectType(t);
  assert.equal(result?.label, "SvelteKit");
});

/* ------------------------------- Astro ------------------------------ */

test("detects Astro from astro.config.mjs", () => {
  const t = tree([
    "package.json",
    "astro.config.mjs",
    "src/pages/index.astro",
  ]);
  const result = detectProjectType(t);
  assert.equal(result?.label, "Astro");
});

/* ------------------------------ Remix ------------------------------- */

test("detects Remix from app/root.tsx (no remix.config)", () => {
  const t = tree([
    "package.json",
    "app/root.tsx",
    "app/routes/_index.tsx",
  ]);
  // app/ + package.json triggers Next.js (App Router) detector first because
  // app/page.* / app/layout.tsx aren't present here. Remix wins because of
  // app/root.tsx.
  const result = detectProjectType(t);
  assert.equal(result?.label, "Remix");
});

/* --------------------------- Node server --------------------------- */

test("detects Node HTTP server from package.json + server.ts", () => {
  const t = tree([
    "package.json",
    "server.ts",
    "src/routes/users.ts",
  ]);
  const result = detectProjectType(t);
  assert.equal(result?.label, "Node.js HTTP server");
});

/* ------------------------- JS/TS library --------------------------- */

test("detects JS/TS library from package.json + src/index.ts", () => {
  const t = tree([
    "package.json",
    "src/index.ts",
    "src/utils.ts",
    "tests/index.test.ts",
  ]);
  const result = detectProjectType(t);
  assert.equal(result?.label, "JavaScript / TypeScript library");
});

test("falls back to generic Node project when package.json is the only signal", () => {
  const t = tree(["package.json", "README.md", "scripts/build.sh"]);
  const result = detectProjectType(t);
  assert.equal(result?.label, "Node.js project");
  assert.equal(result?.confidence, "low");
});

/* ------------------------------- Rust ------------------------------ */

test("detects Rust binary from Cargo.toml + src/main.rs", () => {
  const t = tree(["Cargo.toml", "src/main.rs"]);
  const result = detectProjectType(t);
  assert.equal(result?.label, "Rust binary");
});

test("detects Rust library from Cargo.toml + src/lib.rs", () => {
  const t = tree(["Cargo.toml", "src/lib.rs"]);
  const result = detectProjectType(t);
  assert.equal(result?.label, "Rust library");
});

test("detects Rust binary + library when both present", () => {
  const t = tree(["Cargo.toml", "src/main.rs", "src/lib.rs"]);
  const result = detectProjectType(t);
  assert.equal(result?.label, "Rust crate (binary + library)");
});

test("Rust wins when both Cargo.toml AND package.json exist (regression: rust-lang/rust)", () => {
  // The rust-lang/rust repo ships a package.json for tooling at the root
  // alongside Cargo.toml. We must not mis-label it as "Node.js project".
  const t = tree([
    "Cargo.toml",
    "package.json",
    "README.md",
    "compiler/",
    "compiler/rustc/",
    "library/",
    "library/std/",
    "src/",
    "src/bootstrap/",
  ]);
  const result = detectProjectType(t);
  assert.equal(result?.label, "Rust crate");
  assert.equal(result?.confidence, "medium");
});

test("monorepo wins over jsLibrary: pnpm-workspace.yaml + src/index.ts → JS/TS monorepo", () => {
  // Many monorepos keep root-level bootstrap / re-export code at src/index.ts
  // alongside their workspace marker. The JS library detector must NOT win here.
  const t = tree([
    "pnpm-workspace.yaml",
    "package.json",
    "src/",
    "src/index.ts",
    "packages/",
    "packages/foo/",
    "packages/bar/",
    "README.md",
  ]);
  const result = detectProjectType(t);
  assert.equal(result?.label, "JS/TS monorepo");
});

test("monorepo wins over nodeServer: pnpm-workspace.yaml + src/server.ts → JS/TS monorepo", () => {
  // Same false-positive risk for the Node HTTP server detector — the
  // workspace label is more informative than "Node.js HTTP server".
  const t = tree([
    "pnpm-workspace.yaml",
    "package.json",
    "src/",
    "src/server.ts",
    "packages/",
    "packages/api/",
    "packages/web/",
    "README.md",
  ]);
  const result = detectProjectType(t);
  assert.equal(result?.label, "JS/TS monorepo");
});

test("polyglot monorepo: JS workspace signal beats embedded Cargo.toml (regression: vercel/next.js)", () => {
  // Repos like vercel/next.js, vercel/turbo, biomejs/biome ship Cargo.toml
  // at the root for native subsystems (Turbopack, Biome's parser, etc) but
  // the project itself is primarily a JS/TS monorepo. We must label it as
  // such, not as a Rust crate.
  const t = tree([
    "Cargo.toml",
    "pnpm-workspace.yaml",
    "package.json",
    "README.md",
    "packages/",
    "packages/next/",
    "crates/",
    "turbopack/",
  ]);
  const result = detectProjectType(t);
  assert.equal(result?.label, "JS/TS monorepo");
});

/* -------------------------------- Go ------------------------------- */

test("detects Go service from go.mod + main.go", () => {
  const t = tree(["go.mod", "main.go", "internal/foo/foo.go"]);
  const result = detectProjectType(t);
  assert.equal(result?.label, "Go service");
});

test("detects Go service from go.mod + cmd/", () => {
  const t = tree(["go.mod", "cmd/", "cmd/server/main.go"]);
  const result = detectProjectType(t);
  assert.equal(result?.label, "Go service");
});

test("detects Go module from go.mod alone", () => {
  const t = tree(["go.mod", "client.go", "internal/x.go"]);
  const result = detectProjectType(t);
  assert.equal(result?.label, "Go module");
});

/* ------------------------------ Python ----------------------------- */

test("detects Django from manage.py + settings.py", () => {
  const t = tree([
    "manage.py",
    "myapp/",
    "myapp/settings.py",
    "myapp/urls.py",
  ]);
  const result = detectProjectType(t);
  assert.equal(result?.label, "Django");
});

test("detects Python package from pyproject.toml", () => {
  const t = tree(["pyproject.toml", "src/foo/__init__.py"]);
  const result = detectProjectType(t);
  assert.equal(result?.label, "Python package");
});

test("detects Flask-style web app from app.py", () => {
  const t = tree(["app.py", "requirements.txt", "templates/index.html"]);
  const result = detectProjectType(t);
  assert.equal(result?.label, "Python web app (Flask-style)");
});

/* ----------------------------- Monorepo ---------------------------- */

test("detects JS/TS monorepo from pnpm-workspace.yaml (no framework)", () => {
  const t = tree([
    "pnpm-workspace.yaml",
    "packages/",
    "packages/a/README.md",
    "packages/b/README.md",
  ]);
  const result = detectProjectType(t);
  assert.equal(result?.label, "JS/TS monorepo");
});

test("framework wins over monorepo when both signals present", () => {
  // pnpm-workspace + Next.js config → Next.js wins (more specific).
  const t = tree([
    "pnpm-workspace.yaml",
    "package.json",
    "next.config.ts",
    "app/",
    "app/page.tsx",
  ]);
  const result = detectProjectType(t);
  assert.equal(result?.label, "Next.js (App Router)");
});

/* --------------------------- Documentation ------------------------- */

test("detects documentation site when >50% of files are markdown", () => {
  const t = tree([
    "README.md",
    "docs/intro.md",
    "docs/guide.md",
    "docs/api.md",
    "docs/faq.md",
    "docs/troubleshooting.md",
    ".gitignore",
  ]);
  const result = detectProjectType(t);
  assert.equal(result?.label, "Documentation site");
});

/* ----------------------------- No signal --------------------------- */

test("returns null when no recognised signal is present", () => {
  const t = tree([".gitignore", "LICENSE", "notes.txt"]);
  const result = detectProjectType(t);
  assert.equal(result, null);
});

test("returns null on an empty tree", () => {
  const result = detectProjectType([]);
  assert.equal(result, null);
});

/* --------------------------- Result shape -------------------------- */

test("every detection result includes label, confidence, reason and hint", () => {
  const t = tree(["package.json", "next.config.ts", "app/", "app/page.tsx"]);
  const result = detectProjectType(t);
  assert.ok(result);
  assert.equal(typeof result?.label, "string");
  assert.ok(["high", "medium", "low"].includes(result!.confidence));
  assert.equal(typeof result?.reason, "string");
  assert.equal(typeof result?.hint, "string");
  assert.ok(result!.reason.length > 0);
  assert.ok(result!.hint.length > 0);
});

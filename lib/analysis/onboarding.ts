/**
 * Build a deterministic "start reading here" plan from the ranked tree
 * and the detected project type.
 *
 * No AI, no external calls. Pure functions of the inputs.
 */

import type { TreeEntry } from "@/lib/types";
import type { ProjectType } from "@/lib/analysis/detect-project-type";

export type OnboardingItem = {
  path: string;
  reason: string;
  /** 1-indexed reading order. */
  order: number;
};

export type OnboardingBrief = {
  /** Best single "where the app starts" file (or null). */
  entryPoint: string | null;
  /** Top-level (or near-top) directories that hold most of the implementation. */
  importantDirs: string[];
  /** Ordered list of 3–6 files to read first. */
  readingList: OnboardingItem[];
};

/** Per-project-type ordered list of (candidate path, reason) pairs to try. */
type Candidate = { path: string; reason: string };

function candidatesFor(label: string | null): Candidate[] {
  switch (label) {
    case "Next.js (App Router)":
      return [
        { path: "app/layout.tsx", reason: "Root layout — wraps every page" },
        { path: "app/layout.jsx", reason: "Root layout — wraps every page" },
        { path: "app/page.tsx", reason: "Home route" },
        { path: "app/page.jsx", reason: "Home route" },
        { path: "next.config.ts", reason: "Build & runtime config" },
        { path: "next.config.js", reason: "Build & runtime config" },
        { path: "next.config.mjs", reason: "Build & runtime config" },
      ];
    case "Next.js (Pages Router)":
      return [
        { path: "pages/_app.tsx", reason: "App shell — runs on every page" },
        { path: "pages/_app.jsx", reason: "App shell — runs on every page" },
        { path: "pages/index.tsx", reason: "Home route" },
        { path: "pages/index.jsx", reason: "Home route" },
        { path: "next.config.ts", reason: "Build & runtime config" },
        { path: "next.config.js", reason: "Build & runtime config" },
      ];
    case "Next.js":
      return [
        { path: "next.config.ts", reason: "Build & runtime config" },
        { path: "next.config.js", reason: "Build & runtime config" },
      ];
    case "Vite + React":
      return [
        { path: "src/main.tsx", reason: "App entry — mounts React into the DOM" },
        { path: "src/main.jsx", reason: "App entry — mounts React into the DOM" },
        { path: "src/App.tsx", reason: "Top-level component" },
        { path: "src/App.jsx", reason: "Top-level component" },
        { path: "vite.config.ts", reason: "Build config" },
        { path: "vite.config.js", reason: "Build config" },
        { path: "index.html", reason: "Page shell that loads main.tsx" },
      ];
    case "Vite + Vue":
      return [
        { path: "src/main.ts", reason: "App entry — mounts Vue into the DOM" },
        { path: "src/main.js", reason: "App entry — mounts Vue into the DOM" },
        { path: "src/App.vue", reason: "Root component" },
        { path: "vite.config.ts", reason: "Build config" },
        { path: "vite.config.js", reason: "Build config" },
      ];
    case "Vite + Svelte":
      return [
        { path: "src/main.ts", reason: "App entry" },
        { path: "src/App.svelte", reason: "Root component" },
        { path: "vite.config.ts", reason: "Build config" },
      ];
    case "Vite app":
      return [
        { path: "src/main.ts", reason: "App entry" },
        { path: "src/main.js", reason: "App entry" },
        { path: "vite.config.ts", reason: "Build config" },
        { path: "index.html", reason: "Page shell" },
      ];
    case "SvelteKit":
      return [
        { path: "src/routes/+layout.svelte", reason: "Root layout for every page" },
        { path: "src/routes/+page.svelte", reason: "Home route" },
        { path: "svelte.config.js", reason: "Compiler & adapter config" },
        { path: "svelte.config.ts", reason: "Compiler & adapter config" },
      ];
    case "Nuxt":
      return [
        { path: "app.vue", reason: "Root component" },
        { path: "pages/index.vue", reason: "Home route" },
        { path: "nuxt.config.ts", reason: "Framework config" },
        { path: "nuxt.config.js", reason: "Framework config" },
      ];
    case "Astro":
      return [
        { path: "src/pages/index.astro", reason: "Home route" },
        { path: "astro.config.mjs", reason: "Framework config" },
        { path: "astro.config.ts", reason: "Framework config" },
      ];
    case "Remix":
      return [
        { path: "app/root.tsx", reason: "Document shell — wraps every route" },
        { path: "app/root.jsx", reason: "Document shell — wraps every route" },
        { path: "app/routes/_index.tsx", reason: "Home route" },
        { path: "remix.config.js", reason: "Framework config" },
      ];
    case "Node.js HTTP server":
      return [
        { path: "server.ts", reason: "HTTP server bootstrap" },
        { path: "server.js", reason: "HTTP server bootstrap" },
        { path: "src/server.ts", reason: "HTTP server bootstrap" },
        { path: "src/server.js", reason: "HTTP server bootstrap" },
        { path: "src/index.ts", reason: "Likely entry script" },
        { path: "index.ts", reason: "Likely entry script" },
        { path: "index.js", reason: "Likely entry script" },
      ];
    case "JavaScript / TypeScript library":
      return [
        { path: "src/index.ts", reason: "Public entry — defines exports" },
        { path: "src/index.tsx", reason: "Public entry — defines exports" },
        { path: "src/index.js", reason: "Public entry — defines exports" },
        { path: "lib/index.ts", reason: "Public entry — defines exports" },
        { path: "lib/index.js", reason: "Public entry — defines exports" },
        { path: "index.ts", reason: "Public entry — defines exports" },
        { path: "index.js", reason: "Public entry — defines exports" },
      ];
    case "Node.js project":
      return [
        { path: "index.ts", reason: "Likely entry script" },
        { path: "index.js", reason: "Likely entry script" },
        { path: "src/index.ts", reason: "Likely entry script" },
        { path: "src/index.js", reason: "Likely entry script" },
      ];
    case "Rust binary":
      return [
        { path: "src/main.rs", reason: "Program entry" },
        { path: "Cargo.toml", reason: "Dependencies & crate metadata" },
      ];
    case "Rust library":
      return [
        { path: "src/lib.rs", reason: "Public library API" },
        { path: "Cargo.toml", reason: "Dependencies & crate metadata" },
      ];
    case "Rust crate (binary + library)":
      return [
        { path: "src/main.rs", reason: "Binary entry" },
        { path: "src/lib.rs", reason: "Public library API" },
        { path: "Cargo.toml", reason: "Dependencies & crate metadata" },
      ];
    case "Rust crate":
      return [
        { path: "Cargo.toml", reason: "Dependencies & crate metadata" },
      ];
    case "Go service":
      return [
        { path: "main.go", reason: "Program entry" },
        { path: "go.mod", reason: "Module path & dependencies" },
      ];
    case "Go module":
      return [
        { path: "go.mod", reason: "Module path & dependencies" },
      ];
    case "Django":
      return [
        { path: "manage.py", reason: "Project admin / dev server entry" },
      ];
    case "Python web app (Flask-style)":
      return [
        { path: "app.py", reason: "WSGI app entry" },
        { path: "wsgi.py", reason: "WSGI entry" },
        { path: "src/app.py", reason: "WSGI app entry" },
      ];
    case "Python package":
      return [
        { path: "pyproject.toml", reason: "Build & dependency metadata" },
        { path: "setup.py", reason: "Build & dependency metadata" },
      ];
    case "Python project":
      return [
        { path: "main.py", reason: "Likely entry script" },
        { path: "app.py", reason: "Likely entry script" },
      ];
    case "Ruby on Rails app":
      return [
        { path: "config/routes.rb", reason: "URL → controller mapping" },
        { path: "Gemfile", reason: "Dependencies" },
      ];
    case "Ruby project":
      return [{ path: "Gemfile", reason: "Dependencies" }];
    case "Java (Maven)":
      return [{ path: "pom.xml", reason: "Build & dependency declaration" }];
    case "JVM project (Gradle)":
      return [
        { path: "build.gradle.kts", reason: "Build & dependency declaration" },
        { path: "build.gradle", reason: "Build & dependency declaration" },
      ];
    case "PHP project (Composer)":
      return [{ path: "composer.json", reason: "Dependencies & autoload config" }];
    case ".NET project":
      return [
        { path: "Program.cs", reason: "Program entry" },
      ];
    case "JS/TS monorepo":
      return [
        { path: "pnpm-workspace.yaml", reason: "Workspace package globs" },
        { path: "turbo.json", reason: "Build pipeline definition" },
        { path: "lerna.json", reason: "Workspace config" },
        { path: "nx.json", reason: "Workspace config" },
      ];
    case "Documentation site":
      return [
        { path: "docs/index.md", reason: "Docs landing page" },
        { path: "docs/README.md", reason: "Docs entry" },
      ];
    default:
      return [];
  }
}

/* -------------------------------------------------------------------- */
/*  Important directories                                                */
/* -------------------------------------------------------------------- */

/** Top-level directories that are conventional implementation homes (we
 *  prioritise these in the ordering when several have similar counts). */
const CODE_DIR_PRIORITY = new Set([
  "src", "app", "lib", "pages", "components", "routes",
  "api", "cmd", "internal", "pkg", "server", "client",
  "packages", "apps", "services", "controllers", "models",
  "handlers", "modules",
]);

/** Top-level directories that are infrastructural / cosmetic — not
 *  "where the implementation lives". */
const SUPPORT_DIRS = new Set([
  ".github", ".vscode", ".idea", ".husky", ".devcontainer",
  ".circleci", ".gitlab", ".changeset",
  "public", "static", "assets", "images", "img", "fonts",
  "bin", "scripts", "tools",
  "tests", "test", "__tests__", "spec", "specs", "e2e",
  "examples", "example", "samples", "demo",
]);

function pickImportantDirs(tree: TreeEntry[]): string[] {
  const counts = new Map<string, number>();
  for (const e of tree) {
    if (e.type !== "blob") continue;
    const slash = e.path.indexOf("/");
    if (slash <= 0) continue;
    const top = e.path.slice(0, slash);
    if (SUPPORT_DIRS.has(top)) continue;
    counts.set(top, (counts.get(top) ?? 0) + 1);
  }
  const entries = Array.from(counts.entries()).filter(([, n]) => n >= 2);
  entries.sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    // Tie-break: code-priority dirs first, then alphabetical.
    const aPri = CODE_DIR_PRIORITY.has(a[0]) ? 0 : 1;
    const bPri = CODE_DIR_PRIORITY.has(b[0]) ? 0 : 1;
    if (aPri !== bPri) return aPri - bPri;
    return a[0].localeCompare(b[0]);
  });
  return entries.slice(0, 5).map(([name]) => name);
}

/* -------------------------------------------------------------------- */
/*  Public API                                                          */
/* -------------------------------------------------------------------- */

const README_REGEX = /^README(\.[a-z0-9]+)?$/i;

function findReadme(tree: TreeEntry[]): string | null {
  for (const e of tree) {
    if (e.type !== "blob") continue;
    if (!e.path.includes("/") && README_REGEX.test(e.path)) return e.path;
  }
  return null;
}

const MAX_READING_LIST = 6;

export function buildOnboarding(
  tree: TreeEntry[],
  topFiles: TreeEntry[],
  projectType: ProjectType | null,
): OnboardingBrief {
  // Index of existing blob paths, case-insensitive.
  const blobLookup = new Map<string, string>();
  for (const e of tree) {
    if (e.type === "blob") blobLookup.set(e.path.toLowerCase(), e.path);
  }
  const exists = (p: string) => blobLookup.get(p.toLowerCase()) ?? null;

  const seen = new Set<string>();
  const items: { path: string; reason: string }[] = [];
  const push = (path: string, reason: string) => {
    if (seen.has(path)) return;
    seen.add(path);
    items.push({ path, reason });
  };

  // 1. README first if present.
  const readme = findReadme(tree);
  if (readme) push(readme, "Project overview — read first.");

  // 2. Framework-specific entry points.
  const candidates = candidatesFor(projectType?.label ?? null);
  let entryPoint: string | null = null;
  for (const cand of candidates) {
    const real = exists(cand.path);
    if (!real) continue;
    push(real, cand.reason);
    if (!entryPoint) entryPoint = real;
    if (items.length >= MAX_READING_LIST) break;
  }

  // 3. Fill remaining slots with the existing top-files ranking.
  if (items.length < MAX_READING_LIST) {
    for (const f of topFiles) {
      if (items.length >= MAX_READING_LIST) break;
      if (seen.has(f.path)) continue;
      push(f.path, "High-importance file (top-ranked).");
    }
  }

  return {
    entryPoint,
    importantDirs: pickImportantDirs(tree),
    readingList: items
      .slice(0, MAX_READING_LIST)
      .map((it, i) => ({ ...it, order: i + 1 })),
  };
}

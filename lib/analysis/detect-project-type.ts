/**
 * Project / framework type detection from the tree alone.
 *
 * Pure heuristics — no GitHub API calls, no package.json contents read.
 * The detector is deterministic: detectors are tried top-down and the
 * FIRST match wins. Order is roughly "more specific framework before
 * generic language" so a Next.js repo doesn't accidentally fall back to
 * "JS/TS library".
 */

import type { TreeEntry } from "@/lib/types";

export type ProjectTypeConfidence = "high" | "medium" | "low";

export type ProjectType = {
  /** Short human-readable label, e.g. "Next.js (App Router)". */
  label: string;
  confidence: ProjectTypeConfidence;
  /** What in the tree caused this match (1-line, no jargon dump). */
  reason: string;
  /** Where a developer should look first, in 1-2 sentences. */
  hint: string;
};

/* -------------------------------------------------------------------- */
/*  Tree index — built once per call                                    */
/* -------------------------------------------------------------------- */

type TreeIndex = {
  /** Lower-cased blob path → original path (for case-insensitive lookup). */
  blobs: Map<string, string>;
  /** Top-level directory names (lower-cased). */
  topDirs: Set<string>;
  /** All paths (blobs + trees), unmodified. */
  all: Set<string>;
  /** Count of blobs grouped by extension (no leading dot). */
  byExt: Map<string, number>;
};

function buildIndex(tree: TreeEntry[]): TreeIndex {
  const blobs = new Map<string, string>();
  const topDirs = new Set<string>();
  const all = new Set<string>();
  const byExt = new Map<string, number>();
  for (const e of tree) {
    all.add(e.path);
    if (e.type === "blob") {
      blobs.set(e.path.toLowerCase(), e.path);
      const dot = e.path.lastIndexOf(".");
      if (dot > 0 && dot < e.path.length - 1) {
        const ext = e.path.slice(dot + 1).toLowerCase();
        byExt.set(ext, (byExt.get(ext) ?? 0) + 1);
      }
    }
    const slash = e.path.indexOf("/");
    if (slash > 0) topDirs.add(e.path.slice(0, slash).toLowerCase());
    else if (e.type === "tree") topDirs.add(e.path.toLowerCase());
  }
  return { blobs, topDirs, all, byExt };
}

function hasRootFile(idx: TreeIndex, name: string): boolean {
  return idx.blobs.has(name.toLowerCase());
}

/** Match any of the given root-level filenames. */
function hasAnyRootFile(idx: TreeIndex, names: string[]): boolean {
  return names.some((n) => hasRootFile(idx, n));
}

function hasTopDir(idx: TreeIndex, name: string): boolean {
  return idx.topDirs.has(name.toLowerCase());
}

/** Any blob whose path starts with the given prefix (case-insensitive). */
function anyUnder(idx: TreeIndex, prefix: string): boolean {
  const p = prefix.toLowerCase();
  for (const k of idx.blobs.keys()) if (k.startsWith(p)) return true;
  return false;
}

/** True if the root has a JS/TS workspace marker (pnpm/turbo/lerna/nx). */
function hasJsWorkspaceMarker(idx: TreeIndex): boolean {
  return (
    hasRootFile(idx, "pnpm-workspace.yaml") ||
    hasRootFile(idx, "turbo.json") ||
    hasRootFile(idx, "lerna.json") ||
    hasRootFile(idx, "nx.json")
  );
}

/** Match `<name>.{ts|js|mjs|cjs}` at the root. */
function rootConfigOf(idx: TreeIndex, base: string): string | null {
  for (const ext of ["ts", "js", "mjs", "cjs"]) {
    const orig = idx.blobs.get(`${base}.${ext}`.toLowerCase());
    if (orig) return orig;
  }
  return null;
}

/* -------------------------------------------------------------------- */
/*  Detectors                                                            */
/* -------------------------------------------------------------------- */

type Detector = (idx: TreeIndex) => ProjectType | null;

/* Detector order matters. Roughly: most-specific first, generic last.
 *
 *   1. Specific JS/TS frameworks (Next, Nuxt, Astro, Remix, SvelteKit, Vite).
 *   2. Strong typed-language ecosystem markers that should beat any
 *      "package.json fallback" — repos like rust-lang/rust ship a
 *      package.json for tooling but are obviously Rust crates.
 *   3. Generic Node server / library / project fallbacks.
 *   4. Workspace, docs, last-ditch.
 */
const DETECTORS: Detector[] = [
  /* ---- JS/TS frameworks ---- */
  function nextjs(idx) {
    const cfg = rootConfigOf(idx, "next.config");
    const hasApp = hasTopDir(idx, "app");
    const hasPages = hasTopDir(idx, "pages");
    if (!cfg && !hasApp && !hasPages) return null;
    if (!cfg && !hasRootFile(idx, "package.json")) return null;
    // Disambiguate router style.
    if (hasApp && (cfg || anyUnder(idx, "app/page.") || hasRootFile(idx, "app/layout.tsx"))) {
      return {
        label: "Next.js (App Router)",
        confidence: cfg ? "high" : "medium",
        reason: cfg
          ? `${cfg} + app/ directory`
          : "app/ directory with package.json (no next.config.* found)",
        hint: "App routes live under app/. Each route is a folder with page.tsx and optional layout.tsx.",
      };
    }
    if (hasPages && (cfg || hasRootFile(idx, "package.json"))) {
      return {
        label: "Next.js (Pages Router)",
        confidence: cfg ? "high" : "medium",
        reason: cfg ? `${cfg} + pages/ directory` : "pages/ directory + package.json",
        hint: "Routes are files under pages/. _app.* wraps every page.",
      };
    }
    if (cfg) {
      return {
        label: "Next.js",
        confidence: "high",
        reason: `${cfg} present`,
        hint: "Look at the routes (app/ or pages/) and next.config for build customisations.",
      };
    }
    return null;
  },

  function nuxt(idx) {
    const cfg = rootConfigOf(idx, "nuxt.config");
    if (!cfg) return null;
    return {
      label: "Nuxt",
      confidence: "high",
      reason: `${cfg} present`,
      hint: "Pages live under pages/ and components under components/. Start at app.vue or pages/index.vue.",
    };
  },

  function sveltekit(idx) {
    const cfg = rootConfigOf(idx, "svelte.config");
    if (!cfg) return null;
    const hasRoutes = anyUnder(idx, "src/routes/");
    return {
      label: hasRoutes ? "SvelteKit" : "Svelte",
      confidence: hasRoutes ? "high" : "medium",
      reason: hasRoutes
        ? `${cfg} + src/routes/ tree`
        : `${cfg} present (no src/routes/ — likely plain Svelte)`,
      hint: hasRoutes
        ? "Routes live under src/routes/ as +page.svelte / +layout.svelte files."
        : "Svelte components live under src/. svelte.config sets up the compiler.",
    };
  },

  function astro(idx) {
    const cfg =
      rootConfigOf(idx, "astro.config") ||
      idx.blobs.get("astro.config.mjs") ||
      null;
    if (!cfg) return null;
    return {
      label: "Astro",
      confidence: "high",
      reason: `${cfg} present`,
      hint: "Pages live under src/pages/ as .astro files. astro.config.* configures integrations.",
    };
  },

  function remix(idx) {
    const cfg = rootConfigOf(idx, "remix.config");
    const hasRoot = hasRootFile(idx, "app/root.tsx") || hasRootFile(idx, "app/root.jsx");
    if (!cfg && !hasRoot) return null;
    return {
      label: "Remix",
      confidence: cfg ? "high" : "medium",
      reason: cfg ? `${cfg} present` : "app/root.tsx is the conventional Remix entry",
      hint: "Routes live under app/routes/. app/root.* is the document shell.",
    };
  },

  function vite(idx) {
    const cfg = rootConfigOf(idx, "vite.config");
    if (!cfg) return null;
    const hasTsx = (idx.byExt.get("tsx") ?? 0) > 0;
    const hasJsx = (idx.byExt.get("jsx") ?? 0) > 0;
    const hasVue = (idx.byExt.get("vue") ?? 0) > 0;
    const hasSvelte = (idx.byExt.get("svelte") ?? 0) > 0;
    if (hasVue) {
      return {
        label: "Vite + Vue",
        confidence: "high",
        reason: `${cfg} + .vue components`,
        hint: "App entry is usually src/main.ts, mounted into index.html.",
      };
    }
    if (hasSvelte) {
      return {
        label: "Vite + Svelte",
        confidence: "high",
        reason: `${cfg} + .svelte components`,
        hint: "App entry is usually src/main.ts. Components live under src/.",
      };
    }
    if (hasTsx || hasJsx) {
      return {
        label: "Vite + React",
        confidence: "high",
        reason: `${cfg} + ${hasTsx ? ".tsx" : ".jsx"} components`,
        hint: "App entry is usually src/main.tsx, rendered into index.html. Components live under src/.",
      };
    }
    return {
      label: "Vite app",
      confidence: "medium",
      reason: `${cfg} present`,
      hint: "App entry is usually src/main.{ts,js}, mounted into index.html.",
    };
  },

  /* ---- Strong typed-language ecosystem markers (beat generic Node fallback) ---- */
  function rustEarly(idx) {
    if (!hasRootFile(idx, "Cargo.toml")) return null;
    // Polyglot guard: if a JS/TS workspace signal coexists at the root, prefer
    // the monorepo label (e.g. vercel/next.js, vercel/turbo, biomejs/biome
    // ship Cargo.toml for embedded native subsystems but the project itself
    // is primarily a JS/TS monorepo).
    if (hasJsWorkspaceMarker(idx)) return null;
    const hasMain = hasRootFile(idx, "src/main.rs");
    const hasLib = hasRootFile(idx, "src/lib.rs");
    if (hasMain && hasLib) {
      return {
        label: "Rust crate (binary + library)",
        confidence: "high",
        reason: "Cargo.toml + src/main.rs + src/lib.rs",
        hint: "src/main.rs is the binary entry, src/lib.rs is the public library API.",
      };
    }
    if (hasMain) {
      return {
        label: "Rust binary",
        confidence: "high",
        reason: "Cargo.toml + src/main.rs",
        hint: "Program entry is src/main.rs. Cargo.toml lists dependencies and metadata.",
      };
    }
    if (hasLib) {
      return {
        label: "Rust library",
        confidence: "high",
        reason: "Cargo.toml + src/lib.rs",
        hint: "Public API starts at src/lib.rs. Cargo.toml lists dependencies and metadata.",
      };
    }
    return {
      label: "Rust crate",
      confidence: "medium",
      reason: "Cargo.toml present (no src/main.rs or src/lib.rs at expected locations)",
      hint: "Look for src/ entry files or [[bin]] / [lib] sections in Cargo.toml — sub-crates may live under crates/ or compiler/.",
    };
  },

  function golangEarly(idx) {
    if (!hasRootFile(idx, "go.mod")) return null;
    // Same polyglot guard as rustEarly — JS/TS monorepos sometimes embed Go
    // subsystems (workers, sidecars). Defer to the monorepo detector.
    if (hasJsWorkspaceMarker(idx)) return null;
    const hasMain = hasRootFile(idx, "main.go");
    const hasCmd = hasTopDir(idx, "cmd");
    if (hasMain || hasCmd) {
      return {
        label: "Go service",
        confidence: "high",
        reason: hasMain
          ? "go.mod + main.go"
          : "go.mod + cmd/ directory (multi-binary layout)",
        hint: hasMain
          ? "Program entry is main.go. go.mod declares the module path and deps."
          : "Each binary lives under cmd/<name>/main.go. go.mod declares the module path and deps.",
      };
    }
    return {
      label: "Go module",
      confidence: "medium",
      reason: "go.mod present, no main.go or cmd/ directory",
      hint: "This is likely a library / SDK module. Public API lives in package files at the module root.",
    };
  },

  function djangoEarly(idx) {
    if (!hasRootFile(idx, "manage.py")) return null;
    let hasSettings = false;
    for (const k of idx.blobs.keys()) {
      if (k.endsWith("/settings.py") || k === "settings.py") {
        hasSettings = true;
        break;
      }
    }
    if (!hasSettings) return null;
    return {
      label: "Django",
      confidence: "high",
      reason: "manage.py + a settings.py module",
      hint: "manage.py runs admin commands. URLs live in urls.py. Settings configure the project.",
    };
  },

  function pythonPackageEarly(idx) {
    if (
      hasRootFile(idx, "pyproject.toml") ||
      hasRootFile(idx, "setup.py") ||
      hasRootFile(idx, "setup.cfg")
    ) {
      return {
        label: "Python package",
        confidence: "high",
        reason: hasRootFile(idx, "pyproject.toml")
          ? "pyproject.toml present"
          : "setup.py / setup.cfg present",
        hint: "Public API lives under the package's top-level __init__.py. Build / dep metadata is in pyproject.toml or setup.py.",
      };
    }
    return null;
  },

  function rubyEarly(idx) {
    if (!hasRootFile(idx, "Gemfile")) return null;
    const isRails = hasRootFile(idx, "config/routes.rb") || hasRootFile(idx, "bin/rails");
    return {
      label: isRails ? "Ruby on Rails app" : "Ruby project",
      confidence: isRails ? "high" : "medium",
      reason: isRails ? "Gemfile + config/routes.rb (Rails layout)" : "Gemfile present",
      hint: isRails
        ? "Routes live in config/routes.rb. Models / controllers / views live under app/."
        : "Gemfile lists dependencies. Look for bin/, lib/, or a script at the root for the entry point.",
    };
  },

  function javaMavenEarly(idx) {
    if (!hasRootFile(idx, "pom.xml")) return null;
    return {
      label: "Java (Maven)",
      confidence: "high",
      reason: "pom.xml present",
      hint: "Source lives under src/main/java/. pom.xml declares dependencies and the build.",
    };
  },

  function javaGradleEarly(idx) {
    if (!hasRootFile(idx, "build.gradle") && !hasRootFile(idx, "build.gradle.kts")) {
      return null;
    }
    return {
      label: "JVM project (Gradle)",
      confidence: "high",
      reason: hasRootFile(idx, "build.gradle.kts")
        ? "build.gradle.kts present"
        : "build.gradle present",
      hint: "Source lives under src/main/{java,kotlin}/. build.gradle declares the build.",
    };
  },

  function dotnetEarly(idx) {
    let csproj: string | null = null;
    for (const k of idx.blobs.keys()) {
      if (k.endsWith(".csproj") || k.endsWith(".sln")) {
        csproj = idx.blobs.get(k)!;
        break;
      }
    }
    if (!csproj) return null;
    return {
      label: ".NET project",
      confidence: "high",
      reason: `${csproj} present`,
      hint: "The .csproj/.sln file declares targets. Program.cs is the typical entry.",
    };
  },

  /* ---- Server / library Node ----
   * All three Node fallbacks (server, library, generic) defer to the
   * monorepo detector when a JS/TS workspace marker is present at the
   * root. Otherwise a polyglot monorepo with root-level bootstrap code
   * (e.g. pnpm-workspace.yaml + src/index.ts) would be mis-labeled as
   * a single-package "JavaScript / TypeScript library" or "Node.js HTTP
   * server" instead of a "JS/TS monorepo".
   */
  function nodeServer(idx) {
    if (!hasRootFile(idx, "package.json")) return null;
    if (hasJsWorkspaceMarker(idx)) return null;
    const serverFile =
      idx.blobs.get("server.ts") ||
      idx.blobs.get("server.js") ||
      idx.blobs.get("src/server.ts") ||
      idx.blobs.get("src/server.js") ||
      null;
    const hasRoutes = hasTopDir(idx, "routes") || anyUnder(idx, "src/routes/");
    const hasApi = hasTopDir(idx, "api") || anyUnder(idx, "src/api/");
    if (!serverFile && !hasRoutes && !hasApi) return null;
    return {
      label: "Node.js HTTP server",
      confidence: serverFile ? "medium" : "low",
      reason: serverFile
        ? `${serverFile} + package.json`
        : "package.json + routes/ or api/ directory",
      hint: serverFile
        ? `Start at ${serverFile} — it boots the HTTP server. Look at routes/ or api/ for endpoints.`
        : "Start at the routes/ or api/ directory. The framework (Express, Fastify, etc.) needs reading package.json to confirm.",
    };
  },

  function jsLibrary(idx) {
    if (!hasRootFile(idx, "package.json")) return null;
    if (hasJsWorkspaceMarker(idx)) return null;
    const entry =
      idx.blobs.get("src/index.ts") ||
      idx.blobs.get("src/index.tsx") ||
      idx.blobs.get("src/index.js") ||
      idx.blobs.get("src/index.mjs") ||
      idx.blobs.get("lib/index.ts") ||
      idx.blobs.get("lib/index.js") ||
      idx.blobs.get("index.ts") ||
      idx.blobs.get("index.js") ||
      null;
    if (!entry) return null;
    return {
      label: "JavaScript / TypeScript library",
      confidence: "medium",
      reason: `package.json + ${entry} as the public entry`,
      hint: `Public surface starts at ${entry}. Tests and examples usually mirror its exports.`,
    };
  },

  function genericNode(idx) {
    if (!hasRootFile(idx, "package.json")) return null;
    if (hasJsWorkspaceMarker(idx)) return null;
    return {
      label: "Node.js project",
      confidence: "low",
      reason: "package.json present, no specific framework signature found",
      hint: "Inspect package.json to identify the framework and entry script.",
    };
  },

  /* ---- Python (after generic Node — pyproject already handled above) ---- */
  function flask(idx) {
    const hasApp =
      hasRootFile(idx, "app.py") ||
      hasRootFile(idx, "wsgi.py") ||
      hasRootFile(idx, "src/app.py");
    if (!hasApp) return null;
    return {
      label: "Python web app (Flask-style)",
      confidence: "medium",
      reason: "app.py / wsgi.py at root (typical Flask/WSGI layout)",
      hint: "Start at app.py or wsgi.py — it should construct the WSGI app object.",
    };
  },

  function pythonGeneric(idx) {
    const pyCount = idx.byExt.get("py") ?? 0;
    if (pyCount === 0) return null;
    if (
      hasRootFile(idx, "requirements.txt") ||
      hasRootFile(idx, "Pipfile") ||
      pyCount >= 5
    ) {
      return {
        label: "Python project",
        confidence: "low",
        reason: hasRootFile(idx, "requirements.txt")
          ? "requirements.txt + Python sources"
          : `${pyCount} Python source files (no packaging metadata at root)`,
        hint: "Look for a __main__.py, app.py, or top-level script to identify the entry point.",
      };
    }
    return null;
  },

  function php(idx) {
    if (!hasRootFile(idx, "composer.json")) return null;
    return {
      label: "PHP project (Composer)",
      confidence: "high",
      reason: "composer.json present",
      hint: "composer.json declares deps. PSR-4 autoloaded sources usually live under src/.",
    };
  },

  /* ---- Workspace / docs as last-resort signals ---- */
  function monorepo(idx) {
    if (
      hasRootFile(idx, "pnpm-workspace.yaml") ||
      hasRootFile(idx, "turbo.json") ||
      hasRootFile(idx, "lerna.json") ||
      hasRootFile(idx, "nx.json")
    ) {
      return {
        label: "JS/TS monorepo",
        confidence: "high",
        reason: hasRootFile(idx, "pnpm-workspace.yaml")
          ? "pnpm-workspace.yaml present"
          : hasRootFile(idx, "turbo.json")
            ? "turbo.json present"
            : hasRootFile(idx, "lerna.json")
              ? "lerna.json present"
              : "nx.json present",
        hint: "Each package lives under packages/ (or per workspace globs). Drill into a package to see its own framework.",
      };
    }
    return null;
  },

  function docs(idx) {
    const md = idx.byExt.get("md") ?? 0;
    const totalBlobs = idx.blobs.size;
    if (totalBlobs > 0 && md / totalBlobs > 0.5 && md >= 5) {
      return {
        label: "Documentation site",
        confidence: "medium",
        reason: `${md} of ${totalBlobs} files are Markdown`,
        hint: "Mostly Markdown — likely a documentation site or knowledge base. Start at README.md or docs/index.*.",
      };
    }
    return null;
  },
];

/* -------------------------------------------------------------------- */
/*  Public API                                                          */
/* -------------------------------------------------------------------- */

export function detectProjectType(tree: TreeEntry[]): ProjectType | null {
  const idx = buildIndex(tree);
  for (const detector of DETECTORS) {
    const hit = detector(idx);
    if (hit) return hit;
  }
  return null;
}

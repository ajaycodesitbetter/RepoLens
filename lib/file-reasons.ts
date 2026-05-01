/**
 * Explain WHY a file made the top-ranked list, in 1-3 words.
 * Mirrors the heuristics in lib/github/rank-files.ts but lives client-side
 * so the API contract stays unchanged.
 */

export function getFileReason(path: string): string | null {
  const segments = path.split("/");
  const name = segments[segments.length - 1] ?? "";
  const lower = name.toLowerCase();
  const depth = segments.length;
  const top = segments[0] ?? "";

  // README at root vs nested.
  if (depth === 1 && /^readme(\.[a-z]+)?$/i.test(name)) return "readme";
  if (depth > 1 && /^readme(\.[a-z]+)?$/i.test(name)) return "section readme";

  // License / contribution / change.
  if (/^license(\.|$)/i.test(name)) return "license";
  if (/^contributing(\.|$)/i.test(name)) return "contributor guide";
  if (/^changelog(\.|$)/i.test(name)) return "changelog";
  if (/^code_of_conduct(\.|$)/i.test(name)) return "code of conduct";
  if (/^security(\.|$)/i.test(name)) return "security policy";

  // Build / packaging.
  if (lower === "dockerfile") return "container build";
  if (lower === "makefile") return "build script";

  // Manifests.
  if (lower === "package.json") return "package manifest";
  if (lower === "pyproject.toml") return "python project";
  if (lower === "cargo.toml") return "rust manifest";
  if (lower === "go.mod") return "go module";
  if (lower === "gemfile") return "ruby manifest";
  if (lower === "composer.json") return "php manifest";
  if (lower === "pom.xml") return "maven build";
  if (lower === "build.gradle" || lower === "build.gradle.kts") return "gradle build";

  // Env templates.
  if (/^\.env(\..+)?\.example$/.test(lower) || lower === ".env.example") {
    return "env template";
  }

  // Configs — specific.
  if (lower === "tsconfig.json") return "typescript config";
  if (/^next\.config\.(ts|js|mjs|cjs)$/.test(lower)) return "next.js config";
  if (/^vite\.config\.(ts|js|mjs|cjs)$/.test(lower)) return "vite config";
  if (/^tailwind\.config\.(ts|js|mjs|cjs)$/.test(lower)) return "tailwind config";
  if (/^postcss\.config\.(ts|js|mjs|cjs)$/.test(lower)) return "postcss config";
  if (/^webpack\.config\.(ts|js|mjs|cjs)$/.test(lower)) return "webpack config";
  if (/^eslint\.config\.(ts|js|mjs|cjs)$/.test(lower)) return "eslint config";
  if (/\.config\.(ts|js|mjs|cjs)$/.test(lower)) return "config";

  // Entry points.
  if (
    /^(index|main)\.(ts|tsx|js|jsx|mjs|cjs|py|rs|go)$/.test(lower) &&
    depth <= 2
  ) {
    return "entry point";
  }

  // Directory-based hints.
  if (top === "docs") return "documentation";
  if (top === "src" || top === "app" || top === "lib" || top === "pages") {
    return "source";
  }
  if (top === "components") return "component";
  if (top === "tests" || top === "test" || top === "__tests__") return "test";
  if (top === "scripts") return "script";

  return null;
}

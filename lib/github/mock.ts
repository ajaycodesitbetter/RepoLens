/**
 * Deterministic mock response used when GITHUB_TOKEN is missing.
 * Exercises every UI state: description, stars/forks, mix of files+folders,
 * several "important" files, dark/light handling.
 */
import "server-only";

import type { BriefResponse } from "@/lib/types";
import { rankFiles, pickTopFiles } from "@/lib/github/rank-files";
import { inferOwnerLocation } from "@/lib/github/infer-location";
import { detectProjectType } from "@/lib/analysis/detect-project-type";
import { buildOnboarding } from "@/lib/analysis/onboarding";

const MOCK_OWNER = "octocat";
const MOCK_REPO = "hello-world";

const MOCK_TREE_RAW: Array<{ path: string; type: "blob" | "tree"; size: number | null }> = [
  { path: "README.md", type: "blob", size: 4821 },
  { path: "LICENSE", type: "blob", size: 1071 },
  { path: "package.json", type: "blob", size: 1342 },
  { path: "tsconfig.json", type: "blob", size: 612 },
  { path: ".gitignore", type: "blob", size: 240 },
  { path: "next.config.ts", type: "blob", size: 198 },
  { path: "tailwind.config.ts", type: "blob", size: 412 },
  { path: ".env.example", type: "blob", size: 88 },
  { path: "docs", type: "tree", size: null },
  { path: "docs/ARCHITECTURE.md", type: "blob", size: 5210 },
  { path: "docs/CONTRIBUTING.md", type: "blob", size: 1820 },
  { path: "src", type: "tree", size: null },
  { path: "src/index.ts", type: "blob", size: 312 },
  { path: "src/server.ts", type: "blob", size: 2104 },
  { path: "src/utils", type: "tree", size: null },
  { path: "src/utils/format.ts", type: "blob", size: 822 },
  { path: "src/utils/log.ts", type: "blob", size: 510 },
  { path: "src/components", type: "tree", size: null },
  { path: "src/components/Button.tsx", type: "blob", size: 1430 },
  { path: "src/components/Card.tsx", type: "blob", size: 980 },
  { path: "src/components/Header.tsx", type: "blob", size: 1620 },
  { path: "tests", type: "tree", size: null },
  { path: "tests/server.test.ts", type: "blob", size: 1840 },
  { path: "tests/utils.test.ts", type: "blob", size: 740 },
  { path: "scripts", type: "tree", size: null },
  { path: "scripts/build.sh", type: "blob", size: 312 },
  { path: "public", type: "tree", size: null },
  { path: "public/logo.svg", type: "blob", size: 1180 },
];

export function buildMockResponse(
  ownerOverride?: string,
  repoOverride?: string,
): BriefResponse {
  const ranked = rankFiles(MOCK_TREE_RAW);
  const topFiles = pickTopFiles(ranked, 10);
  const projectType = detectProjectType(ranked);
  const onboarding = buildOnboarding(ranked, topFiles, projectType);
  // Sample owner location to exercise the inference + globe highlight UI.
  const inferred = inferOwnerLocation("San Francisco, CA");

  return {
    meta: {
      owner: ownerOverride ?? MOCK_OWNER,
      repo: repoOverride ?? MOCK_REPO,
      description:
        "Mock repository used when GITHUB_TOKEN is not configured. Demonstrates the full RepoContext UI without hitting the GitHub API.",
      stars: 12483,
      forks: 1924,
      language: "TypeScript",
      defaultBranch: "main",
      isForked: false,
      isMock: true,
      ownerLocationRaw: inferred.ownerLocationRaw,
      ownerCountry: inferred.ownerCountry,
      ownerCountryCode: inferred.ownerCountryCode,
      locationConfidence: inferred.locationConfidence,
    },
    tree: ranked,
    topFiles,
    projectType,
    onboarding,
    treeTruncated: false,
  };
}

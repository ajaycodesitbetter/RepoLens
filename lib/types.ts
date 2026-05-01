/**
 * Shared TS types for the RepoContext API contract.
 * Imported directly by both server (route handler) and client (UI) — no codegen.
 */

export type LocationConfidence = "high" | "medium" | "low" | "none";

export type RepoMeta = {
  owner: string;
  repo: string;
  description: string | null;
  stars: number;
  forks: number;
  language: string | null;
  defaultBranch: string;
  isForked: boolean;
  isMock: boolean;

  /**
   * Inferred owner-location fields. Derived from the public `location` string
   * on the repository owner's GitHub profile via deterministic mapping
   * (no external geocoding). NEVER claims the repository is "from" anywhere —
   * UI must surface this as the OWNER'S country, not the repo's.
   */
  ownerLocationRaw: string | null;
  ownerCountry: string | null;
  ownerCountryCode: string | null;
  locationConfidence: LocationConfidence;
};

export type TreeEntry = {
  path: string;
  type: "blob" | "tree";
  size: number | null;
  importanceScore: number;
};

export type ProjectTypeConfidence = "high" | "medium" | "low";

/**
 * Heuristically-detected project / framework type for the repo.
 * Built from the file tree alone — no GitHub API contents read.
 */
export type ProjectType = {
  label: string;
  confidence: ProjectTypeConfidence;
  reason: string;
  hint: string;
};

export type OnboardingItem = {
  path: string;
  reason: string;
  /** 1-indexed reading order. */
  order: number;
};

/**
 * Deterministic developer-onboarding brief: which file is the entry
 * point, which directories matter, and what to read first.
 */
export type OnboardingBrief = {
  entryPoint: string | null;
  importantDirs: string[];
  readingList: OnboardingItem[];
};

export type BriefResponse = {
  meta: RepoMeta;
  tree: TreeEntry[];
  topFiles: TreeEntry[];
  /** Detected project / framework type (null if no signal matched). */
  projectType: ProjectType | null;
  /** Where to start reading and what directories matter. */
  onboarding: OnboardingBrief;
  /**
   * True when GitHub returned a partial tree (the recursive tree endpoint
   * truncates above ~100k entries or 7MB). The UI surfaces a warning so the
   * user knows the file list isn't exhaustive.
   */
  treeTruncated: boolean;
};

export type ApiError = {
  error: string;
};

/** Status codes the route handler may return. */
export type ApiStatus = 200 | 400 | 404 | 429 | 502;

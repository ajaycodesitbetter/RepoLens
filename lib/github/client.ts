/**
 * Server-only thin wrapper around the GitHub REST API.
 *
 * Uses GITHUB_TOKEN when present to raise rate limits.
 * Never imported into a client component.
 */
import "server-only";

const GITHUB_API = "https://api.github.com";
const REVALIDATE_SECONDS = 300;

export type GithubFetchError = {
  status: number;
  message: string;
};

export class GithubError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "GithubError";
    this.status = status;
  }
}

function authHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "RepoContext/0.1 (+https://repocontext.local)",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function gh<T>(path: string): Promise<T> {
  const res = await fetch(`${GITHUB_API}${path}`, {
    headers: authHeaders(),
    next: { revalidate: REVALIDATE_SECONDS },
  });

  if (res.status === 200) {
    return (await res.json()) as T;
  }

  if (res.status === 404) {
    throw new GithubError(404, "Repository not found. Check the owner and repo name, and that the repo is public.");
  }

  if (res.status === 403 || res.status === 429) {
    throw new GithubError(429, buildRateLimitMessage(res));
  }

  let detail = `GitHub returned ${res.status}.`;
  try {
    const body = (await res.json()) as { message?: string };
    if (body?.message) detail = `GitHub: ${body.message}`;
  } catch {
    // ignore parse errors
  }
  throw new GithubError(502, detail);
}

/**
 * Build a human-readable rate-limit message from GitHub's response headers.
 * Handles both primary rate limits (x-ratelimit-* headers) and secondary
 * rate limits (retry-after header).
 *
 * Exported for unit tests; not part of the public module surface.
 */
export function buildRateLimitMessage(res: Response): string {
  const remaining = res.headers.get("x-ratelimit-remaining");
  const resetHeader = res.headers.get("x-ratelimit-reset");
  const retryAfter = res.headers.get("retry-after");
  const tokenHint = process.env.GITHUB_TOKEN
    ? ""
    : " Set GITHUB_TOKEN in Secrets to raise the limit from 60 to 5,000 requests per hour.";

  // Primary rate limit: budget exhausted, x-ratelimit-reset is a Unix timestamp.
  if (remaining === "0" && resetHeader) {
    const resetSec = Number(resetHeader);
    if (Number.isFinite(resetSec)) {
      const waitSec = Math.max(0, resetSec - Math.floor(Date.now() / 1000));
      return `GitHub API rate limit exceeded. ${formatWait(waitSec)}${tokenHint}`;
    }
  }

  // Secondary / abuse rate limit: GitHub returns Retry-After in seconds.
  if (retryAfter) {
    const waitSec = Number(retryAfter);
    if (Number.isFinite(waitSec)) {
      return `GitHub asked us to slow down. ${formatWait(waitSec)}`;
    }
  }

  if (remaining === "0") {
    return `GitHub API rate limit exceeded. Try again later.${tokenHint}`;
  }

  return `GitHub denied the request (HTTP ${res.status}).${tokenHint}`;
}

function formatWait(seconds: number): string {
  if (seconds <= 0) return "Try again now.";
  if (seconds < 60) return `Try again in ${seconds} second${seconds === 1 ? "" : "s"}.`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
  const hours = Math.ceil(minutes / 60);
  return `Try again in ${hours} hour${hours === 1 ? "" : "s"}.`;
}

export type GithubRepoResponse = {
  name: string;
  full_name: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  default_branch: string;
  fork: boolean;
  owner: { login: string };
};

export type GithubTreeNode = {
  path: string;
  type: "blob" | "tree" | "commit";
  size?: number;
};

export type GithubTreeResponse = {
  sha: string;
  truncated: boolean;
  tree: GithubTreeNode[];
};

export async function fetchRepo(owner: string, repo: string): Promise<GithubRepoResponse> {
  return gh<GithubRepoResponse>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);
}

export async function fetchTree(
  owner: string,
  repo: string,
  branch: string,
): Promise<GithubTreeResponse> {
  return gh<GithubTreeResponse>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
  );
}

/**
 * Public profile for a GitHub user OR organization. Both account types are
 * served by /users/{login} and both expose a public `location` string.
 */
export type GithubOwnerProfile = {
  login: string;
  type: "User" | "Organization" | string;
  location: string | null;
  name?: string | null;
  blog?: string | null;
};

export async function fetchOwnerProfile(login: string): Promise<GithubOwnerProfile> {
  return gh<GithubOwnerProfile>(`/users/${encodeURIComponent(login)}`);
}

export function hasGithubToken(): boolean {
  return !!process.env.GITHUB_TOKEN;
}

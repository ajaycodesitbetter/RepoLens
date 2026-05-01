/**
 * Render a developer-onboarding brief as a portable Markdown document.
 *
 * Pure function — no DOM, no fetch, no clipboard. Safe to import from
 * server components, client components, and tests. The "Copy as markdown"
 * button in the UI is just `briefToMarkdown(...)` + `navigator.clipboard`.
 *
 * IMPORTANT: like the rest of the app, this NEVER claims a repository is
 * "from" a country. The owner-location section is explicitly framed as
 * the OWNER's profile location, with the inference confidence shown.
 */

import type {
  OnboardingBrief,
  ProjectType,
  RepoMeta,
} from "@/lib/types";

export type BriefMarkdownInput = {
  meta: RepoMeta;
  projectType: ProjectType | null;
  onboarding: OnboardingBrief;
  branch: string;
};

function escapeMd(s: string): string {
  // Escape the markdown characters most likely to appear in repo
  // descriptions / paths and break rendering. We deliberately keep this
  // narrow — over-escaping makes pasted output ugly. Parens are escaped
  // because we render `[label](url)` links and a `)` in a file path or
  // description would otherwise terminate the link target prematurely
  // and let following text be parsed as more markdown.
  return s.replace(/([\\`*_{}\[\]()])/g, "\\$1");
}

function fmtNumber(n: number): string {
  // Locale-free thousands separator so output is stable across environments.
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function briefToMarkdown(input: BriefMarkdownInput): string {
  const { meta, projectType, onboarding, branch } = input;
  const { owner, repo } = meta;
  const repoUrl = `https://github.com/${owner}/${repo}`;

  const lines: string[] = [];

  // ── Title ────────────────────────────────────────────────────────────────
  lines.push(`# ${escapeMd(`${owner}/${repo}`)} — onboarding brief`);
  lines.push("");
  lines.push(`Source: <${repoUrl}>`);
  lines.push("");

  // ── Repo summary ─────────────────────────────────────────────────────────
  lines.push("## Repository");
  lines.push("");
  if (meta.description) {
    lines.push(`> ${escapeMd(meta.description)}`);
    lines.push("");
  }
  const facts: string[] = [];
  if (meta.language) facts.push(`**Primary language:** ${escapeMd(meta.language)}`);
  facts.push(`**Stars:** ${fmtNumber(meta.stars)}`);
  facts.push(`**Forks:** ${fmtNumber(meta.forks)}`);
  facts.push(`**Default branch:** \`${escapeMd(meta.defaultBranch)}\``);
  if (meta.isForked) facts.push("**Note:** this repo is a fork.");
  for (const f of facts) lines.push(`- ${f}`);
  lines.push("");

  // ── Project type ─────────────────────────────────────────────────────────
  lines.push("## Likely project type");
  lines.push("");
  if (projectType) {
    lines.push(
      `**${escapeMd(projectType.label)}** _(${projectType.confidence} confidence)_`,
    );
    lines.push("");
    lines.push(`- Why: ${escapeMd(projectType.reason)}`);
    lines.push(`- Hint: ${escapeMd(projectType.hint)}`);
  } else {
    lines.push(
      "_No clear framework signature — couldn't infer the project type from the file tree alone._",
    );
  }
  lines.push("");

  // ── Reading list ─────────────────────────────────────────────────────────
  lines.push("## Start reading here");
  lines.push("");
  if (onboarding.readingList.length > 0) {
    for (const item of onboarding.readingList) {
      const fileUrl = `${repoUrl}/blob/${branch}/${item.path}`;
      lines.push(
        `${item.order}. [\`${escapeMd(item.path)}\`](${fileUrl}) — ${escapeMd(item.reason)}`,
      );
    }
  } else {
    lines.push(
      "_No specific entry points detected — explore the directories below._",
    );
  }
  lines.push("");

  // ── Important directories ────────────────────────────────────────────────
  lines.push("## Where to look");
  lines.push("");
  if (onboarding.importantDirs.length > 0) {
    for (const dir of onboarding.importantDirs) {
      lines.push(`- \`${escapeMd(dir)}/\``);
    }
    lines.push("");
    lines.push(
      "_Top-level directories (by file count) where most of the implementation lives._",
    );
  } else {
    lines.push("_No notable top-level directories detected._");
  }
  lines.push("");

  // ── Owner location (deliberately scoped) ─────────────────────────────────
  if (meta.ownerLocationRaw) {
    lines.push("## Owner profile location");
    lines.push("");
    lines.push(
      `Raw value from the **owner's** GitHub profile: \`${escapeMd(meta.ownerLocationRaw)}\`.`,
    );
    if (meta.ownerCountry && meta.ownerCountryCode) {
      lines.push("");
      lines.push(
        `Inferred country: **${escapeMd(meta.ownerCountry)}** (${meta.ownerCountryCode}) — _${meta.locationConfidence} confidence_.`,
      );
    }
    lines.push("");
    lines.push(
      "_This refers to the repository owner's stated profile location, not the project itself. A repository is not \"from\" a country._",
    );
    lines.push("");
  }

  // ── Footer ───────────────────────────────────────────────────────────────
  lines.push("---");
  lines.push("");
  lines.push(
    "_Generated by [RepoContext](https://github.com/) — heuristic, no AI._",
  );

  // Trim trailing blank lines and guarantee a single trailing newline.
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines.join("\n") + "\n";
}

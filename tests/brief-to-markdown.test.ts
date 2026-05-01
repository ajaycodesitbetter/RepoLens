import { test } from "node:test";
import assert from "node:assert/strict";
import { briefToMarkdown } from "../lib/analysis/brief-to-markdown";
import type {
  OnboardingBrief,
  ProjectType,
  RepoMeta,
} from "../lib/types";

const baseMeta: RepoMeta = {
  owner: "facebook",
  repo: "react",
  description: "The library for web and native user interfaces.",
  stars: 234567,
  forks: 48000,
  language: "JavaScript",
  defaultBranch: "main",
  isForked: false,
  isMock: false,
  ownerLocationRaw: "Menlo Park, CA",
  ownerCountry: "United States",
  ownerCountryCode: "US",
  locationConfidence: "high",
};

const baseProjectType: ProjectType = {
  label: "Node.js project",
  confidence: "high",
  reason: "package.json at repo root",
  hint: "Run `npm install` then check the scripts section.",
};

const baseOnboarding: OnboardingBrief = {
  entryPoint: "README.md",
  importantDirs: ["packages", "scripts"],
  readingList: [
    { order: 1, path: "README.md", reason: "Project overview." },
    { order: 2, path: "package.json", reason: "Scripts and dependencies." },
  ],
};

test("includes title, repo url, description, stars/forks", () => {
  const md = briefToMarkdown({
    meta: baseMeta,
    projectType: baseProjectType,
    onboarding: baseOnboarding,
    branch: "main",
  });
  assert.match(md, /^# facebook\/react — onboarding brief/);
  assert.match(md, /<https:\/\/github\.com\/facebook\/react>/);
  assert.match(md, /The library for web and native user interfaces\./);
  assert.match(md, /\*\*Stars:\*\* 234,567/);
  assert.match(md, /\*\*Forks:\*\* 48,000/);
  assert.match(md, /\*\*Default branch:\*\* `main`/);
});

test("renders project type with confidence + hint", () => {
  const md = briefToMarkdown({
    meta: baseMeta,
    projectType: baseProjectType,
    onboarding: baseOnboarding,
    branch: "main",
  });
  assert.match(md, /\*\*Node\.js project\*\* _\(high confidence\)_/);
  assert.match(md, /Why: package\.json at repo root/);
  assert.match(md, /Hint: Run/);
});

test("renders project type fallback when null", () => {
  const md = briefToMarkdown({
    meta: baseMeta,
    projectType: null,
    onboarding: baseOnboarding,
    branch: "main",
  });
  assert.match(md, /No clear framework signature/);
});

test("reading list items become numbered links to the right branch", () => {
  const md = briefToMarkdown({
    meta: baseMeta,
    projectType: baseProjectType,
    onboarding: baseOnboarding,
    branch: "v18-stable",
  });
  assert.match(
    md,
    /1\. \[`README\.md`\]\(https:\/\/github\.com\/facebook\/react\/blob\/v18-stable\/README\.md\) — Project overview\./,
  );
  assert.match(
    md,
    /2\. \[`package\.json`\]\(https:\/\/github\.com\/facebook\/react\/blob\/v18-stable\/package\.json\)/,
  );
});

test("important dirs render as backtick-quoted bullets", () => {
  const md = briefToMarkdown({
    meta: baseMeta,
    projectType: baseProjectType,
    onboarding: baseOnboarding,
    branch: "main",
  });
  assert.match(md, /- `packages\/`/);
  assert.match(md, /- `scripts\/`/);
});

test("owner-location section is present, scoped to the owner, not the repo", () => {
  const md = briefToMarkdown({
    meta: baseMeta,
    projectType: baseProjectType,
    onboarding: baseOnboarding,
    branch: "main",
  });
  assert.match(md, /## Owner profile location/);
  assert.match(md, /owner's\*\* GitHub profile/);
  assert.match(md, /Inferred country: \*\*United States\*\* \(US\)/);
  // The disclaimer must be there — this is the project's core invariant.
  assert.match(md, /A repository is not "from" a country\./);
});

test("owner-location section is omitted when raw location is null", () => {
  const md = briefToMarkdown({
    meta: { ...baseMeta, ownerLocationRaw: null, ownerCountry: null, ownerCountryCode: null, locationConfidence: "none" },
    projectType: baseProjectType,
    onboarding: baseOnboarding,
    branch: "main",
  });
  assert.doesNotMatch(md, /## Owner profile location/);
});

test("vague-but-present location renders raw without inferred country", () => {
  // e.g. owner profile says "The Internet" — we keep the raw string but
  // must NOT print an inferred country line.
  const md = briefToMarkdown({
    meta: {
      ...baseMeta,
      ownerLocationRaw: "The Internet",
      ownerCountry: null,
      ownerCountryCode: null,
      locationConfidence: "none",
    },
    projectType: baseProjectType,
    onboarding: baseOnboarding,
    branch: "main",
  });
  assert.match(md, /Raw value from the \*\*owner's\*\* GitHub profile: `The Internet`/);
  assert.doesNotMatch(md, /Inferred country:/);
});

test("escapes markdown-significant characters in description", () => {
  const md = briefToMarkdown({
    meta: { ...baseMeta, description: "Use *_special_* chars [here]" },
    projectType: baseProjectType,
    onboarding: baseOnboarding,
    branch: "main",
  });
  assert.match(md, /Use \\\*\\_special\\_\\\* chars \\\[here\\\]/);
});

test("escapes parentheses in file paths so they cannot break the link target", () => {
  // A path like `pkg/foo(legacy).ts` would otherwise close the link's url
  // early — leaving the rest of the brief parsed as raw markdown.
  const md = briefToMarkdown({
    meta: baseMeta,
    projectType: baseProjectType,
    onboarding: {
      entryPoint: null,
      importantDirs: ["src"],
      readingList: [
        {
          order: 1,
          path: "pkg/foo(legacy).ts",
          reason: "Legacy entry [important]",
        },
      ],
    },
    branch: "main",
  });
  // The path's parens AND the reason's brackets must be escaped.
  assert.match(md, /`pkg\/foo\\\(legacy\\\)\.ts`/);
  assert.match(md, /Legacy entry \\\[important\\\]/);
  // And the URL must still be a real, unescaped link target.
  assert.match(
    md,
    /\(https:\/\/github\.com\/facebook\/react\/blob\/main\/pkg\/foo\(legacy\)\.ts\)/,
  );
});

test("output ends with exactly one trailing newline", () => {
  const md = briefToMarkdown({
    meta: baseMeta,
    projectType: baseProjectType,
    onboarding: baseOnboarding,
    branch: "main",
  });
  assert.ok(md.endsWith("\n"));
  assert.ok(!md.endsWith("\n\n"));
});

test("empty reading list and dirs render fallback copy, not crash", () => {
  const md = briefToMarkdown({
    meta: baseMeta,
    projectType: null,
    onboarding: { entryPoint: null, importantDirs: [], readingList: [] },
    branch: "main",
  });
  assert.match(md, /No specific entry points detected/);
  assert.match(md, /No notable top-level directories detected/);
});

test("forked repo is flagged in the summary", () => {
  const md = briefToMarkdown({
    meta: { ...baseMeta, isForked: true },
    projectType: baseProjectType,
    onboarding: baseOnboarding,
    branch: "main",
  });
  assert.match(md, /this repo is a fork/);
});

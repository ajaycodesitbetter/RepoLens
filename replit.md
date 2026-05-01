# RepoContext

A public GitHub repository analysis tool that helps developers quickly orient themselves in an unfamiliar codebase.

## What it does

Given a public GitHub repo URL (or `owner/repo` shorthand), RepoContext fetches the repo's metadata and file tree, ranks the most important files using simple heuristics, and renders a concise **developer brief** so a new contributor can grasp the project at a glance.

## Stack

- **Framework:** Next.js (App Router) + TypeScript
- **UI:** React Server Components + Client Components, Tailwind CSS, shadcn/ui-style primitives
- **Data fetching:** Next.js Route Handlers (server-side only)
- **GitHub API:** REST v3 via server-side `fetch`, authenticated with `GITHUB_TOKEN` when present

## Hard constraints

These are non-negotiable for this project:

- **Next.js App Router only.** No Express, no separate Node API server.
- **No OpenAPI / no codegen.** Route handlers and React components share types via plain TS imports.
- **No separate frontend artifact.** UI lives inside the Next.js app.
- **No auth.** Public repos only.
- **No private repo access.**
- **No database.**
- **No AI summaries, no embeddings, no vector search.**
- **No background jobs / queues.**
- **All GitHub API calls run server-side only.** The `GITHUB_TOKEN` is never exposed to the client.
- **Mock fallback:** if `GITHUB_TOKEN` is missing, the server returns a deterministic mock response so the UI still renders.

## Source-of-truth docs

Read these before making product or architecture changes:

- `docs/PRODUCT.md` — what RepoContext is, who it's for, scope
- `docs/ARCHITECTURE.md` — folder layout, data flow, server/client boundary
- `docs/UI_GUIDE.md` — UI structure, states, visual conventions

## Onboarding brief layer

`lib/analysis/detect-project-type.ts` runs **tree-only heuristics** (file paths only — never reads file contents) to label the repo's stack: Next.js (App / Pages / generic), Nuxt, SvelteKit, Astro, Remix, Vite + React/Vue/Svelte, Node HTTP server, JS/TS library, Rust crate (binary / library / both), Go service / module, Django, Flask, Python package, Ruby / Rails, Java (Maven / Gradle), PHP, .NET, JS/TS monorepo, documentation site. Returns `{label, confidence, reason, hint}` or `null` when no signal matches.

`lib/analysis/onboarding.ts` builds `{entryPoint, importantDirs, readingList[ ≤6 ]}` from the tree, the top-files ranking, and the project type. README is always item 1 when present; framework-suggested files come next; the rest is filled by top-files dedup.

Both are wired through `lib/types.ts → BriefResponse.projectType + onboarding`, populated in `lib/github/service.ts` (live) and `lib/github/mock.ts` (fallback), and rendered by `components/onboarding-brief.tsx` above the tabs in `components/explorer.tsx`.

**Rules the onboarding card must follow:** every claim must be derivable from the tree alone; the `reason` field always cites the file/marker that triggered the label; confidence levels (`high` / `medium` / `low`) are surfaced in the UI; the card never makes geographic origin claims (the globe owner-country visualisation is a separate component).

## Markdown export

`lib/analysis/brief-to-markdown.ts` is a pure function that renders a `BriefResponse` (meta + projectType + onboarding) as a portable Markdown document. `components/copy-brief-button.tsx` is a small `"use client"` island in the onboarding-brief header that feeds those props into `briefToMarkdown` and writes the result to `navigator.clipboard` (with an `execCommand` fallback for non-secure contexts). The exported markdown carries the same "owner profile location, not the repo" disclaimer enforced by the rest of the app — locked in by `tests/brief-to-markdown.test.ts`.

## Environment

- `GITHUB_TOKEN` *(optional)* — GitHub personal access token used server-side to raise rate limits and fetch repo data. When absent, the API falls back to mock data.

## Deployment

Standard Next.js App Router deployment. For Replit Autoscale: build = `pnpm run build`, run = `pnpm run start`. The `start` script omits `-p` so Next.js picks up `$PORT` from the env (Autoscale injects it; locally falls back to Next's default of 3000 — use `PORT=5000 pnpm start` for a local production smoke-test on the standard dev port). Production gracefully serves the mock fixture if `GITHUB_TOKEN` is unset.

## Out of scope (do not add without explicit approval)

Auth, user accounts, private repos, persistence, AI/LLM features, embeddings, vector DBs, background workers, separate API service, OpenAPI specs, code generation pipelines.

## Session handoff (end of day, April 27, 2026)

**Completed this session.**
- Owner-location data: added `redmond` / `bellevue` / `kirkland` → `US` to `lib/data/countries.ts` (fixes Microsoft-org repos showing no globe highlight). Locked in by regression tests in `tests/infer-location.test.ts`, plus 7 vague-string tests (`Internet`, `Worldwide`, `Remote`, `Earth`, `🌍`, `Everywhere`, `the internet`) asserting they stay unmapped.
- "Copy as Markdown" export: pure renderer at `lib/analysis/brief-to-markdown.ts` + `"use client"` button at `components/copy-brief-button.tsx`, wired into the onboarding-brief header. Carries the "owner profile location, not the repo" disclaimer. 13 unit tests including a parens-in-path regression.
- Deployment readiness: `start` script now binds to `$PORT` (autoscale-friendly, cross-platform). Production build verified clean: `/` static (23.5 kB), `/api/repo` dynamic, ~125 kB first-load JS.
- Public-facing `README.md` written (separate from this internal doc).

**Verified.**
- `pnpm test` → 148 / 148 passing.
- `pnpm run typecheck` → clean.
- `pnpm run build` → clean.
- Live API smoke: `GET /api/repo?url=facebook/react` returns the expected brief (Node.js project, 6 reading items, 5 dirs).
- E2e click-test: button renders in the brief header, click flips label to "Copied!" (clipboard contents covered by unit tests; the e2e session crashed before the read-back step but the write succeeded).

**Intentionally left unchanged.**
- `.replit` deployment block — file is read-only by policy. The `[deployment]` section has `router = "application"` + `deploymentTarget = "autoscale"` but no `build` / `run` keys; user confirms `pnpm run build` / `pnpm run start` in the Publish dialog.
- Globe / world-map component, owner-country inference logic, GitHub service, all existing API contracts — frozen at user request ("done unless there is a bug").
- The curated city dataset — only the genuinely missing Redmond cluster was added. No fuzzy matching, no long-tail city expansion.

**Known limitations.**
- Owner-location inference is a hand-curated lookup, so smaller / non-tech-hub cities silently fall through to `none`. By design.
- Vague placeholders (`The Internet`, `Worldwide`, etc.) stay unmapped — no globe highlight. By design.
- GitHub recursive-tree endpoint truncates above ~100k entries / 7 MB; `treeTruncated: true` is surfaced in the UI but no pagination retry is attempted.
- The dev-preview proxy occasionally 502s to external callers (Firecrawl, testing subagent infra) — environmental, not a code bug.

**Next recommended task (tomorrow, first thing):** push the repo to GitHub, then publish to Replit Autoscale (or Netlify as a fallback). See `TOMORROW.md` for the full checklist.

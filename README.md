# RepoLens

A fast, opinionated brief for any public GitHub repository.

RepoLens turns a GitHub URL into a readable first-pass: project type, repository metadata, the files most worth reading first, and a globe view of the inferred owner country. It is built for engineers who evaluate open-source projects often and refuse to spend twenty minutes guessing where to start.

## Why RepoLens

Most repositories punish curiosity. The README is half-finished, the file tree is two hundred entries deep, and nothing tells you which three files actually matter. You end up clicking around for ten minutes just to decide whether the project is worth a serious look.

RepoLens fixes the first ten minutes. Paste a URL, get a structured brief, and start reading the right files first.

No accounts. No agents. No language-model calls. Every signal is heuristic and computed server-side.

## Current Features

- Public repository briefs from a GitHub URL or `owner/repo`
- Repository metadata: stars, forks, primary language, default branch, description
- Project-type and framework detection driven by file-tree heuristics
- Ranked "start reading here" list that surfaces the most useful files first
- Compact file tree with sensible depth limits
- Owner country inference from public GitHub profile location, with explicit confidence levels
- Interactive globe that highlights the inferred country only when confidence is high or medium
- One-click copy of the full brief as Markdown
- Server-side GitHub API access; tokens never reach the client
- Graceful mock fallback when no GitHub token is configured

## Planned Features

- Selective file download and lightweight in-app file access
- Per-file summaries and contributor signals
- Saved briefs and shareable permalinks
- CLI for use in terminals and CI pipelines

## How It Works

1. You paste a public GitHub repository URL or `owner/repo` reference.
2. The server fetches repository metadata and the file tree from the GitHub REST API.
3. Heuristics infer project type, the most useful entry-point files, and the owner country with a confidence score.
4. The UI renders a clean brief, a navigable file tree, and a globe pinned to the inferred country when the signal is strong enough to trust.

Country inference is intentionally conservative. If the owner location is empty, vague, or non-geographic, RepoLens marks it as unmapped instead of guessing. The globe never claims a repository is from a country.

## Tech Stack

- Next.js 15 with the App Router
- React 19
- TypeScript
- Tailwind CSS v4
- d3-geo for globe rendering
- GitHub REST API
- pnpm

## Getting Started

### Prerequisites

- Node.js 20 or newer
- pnpm
- A GitHub personal access token, recommended for real usage

### Installation

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

### Typecheck

```bash
pnpm run typecheck
```

### Tests

```bash
pnpm test
```

### Production build

```bash
pnpm run build
pnpm run start
```

## Environment Variables

Set the following in your environment or a local `.env.local` file:

```bash
GITHUB_TOKEN=your_github_token_here
```

Notes:

- `GITHUB_TOKEN` is strongly recommended for production. It raises the GitHub API rate limit and is required to reliably analyze larger repositories.
- Without a token, the app may fall back to mock data depending on runtime configuration.
- The token is read server-side only and is never sent to the browser.

## Deployment

RepoLens requires a server runtime because it exposes a dynamic API route for repository analysis. It is not suitable for static-only hosts such as GitHub Pages.

Any host that can run a Next.js server and inject environment variables will work. Common targets include Netlify, Vercel, Render, Fly.io, and self-hosted Node.js behind a reverse proxy.

Generic build and run commands:

```bash
pnpm run build
pnpm run start
```

Make sure `GITHUB_TOKEN` is set as an environment variable on the host.

## Status

Active development. The core brief, file-ranking, metadata pipeline, country inference, and globe view are implemented and covered by tests. Selective file download and per-file summaries are on the roadmap.

## License

Released under the MIT License.

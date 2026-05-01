# Architecture — RepoContext

## Stack

- **Next.js (App Router)** + **TypeScript**
- **Tailwind CSS** for styling
- **React Server Components** for the page shell, **Client Components** only where interactivity is required (input form, expandable tree).
- **No external API server.** All backend logic runs inside Next.js Route Handlers.
- **No code generation, no OpenAPI, no shared client SDK.** Types are plain TS, imported directly.

## Top-level folder layout

```
/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (fonts, theme, global styles)
│   ├── page.tsx                  # Home page = developer brief UI (server component shell)
│   ├── globals.css               # Tailwind + base styles
│   └── api/
│       └── repo/
│           └── route.ts          # GET /api/repo?url=... → { meta, tree, topFiles }
│
├── components/
│   ├── repo-input.tsx            # Client: URL/shorthand input + submit
│   ├── repo-meta.tsx             # Server: header card with stars/forks/language/etc.
│   ├── file-tree.tsx             # Client: collapsible tree view
│   ├── top-files.tsx             # Server: ranked important files list
│   └── ui/                       # Small presentational primitives (Button, Badge, etc.)
│
├── lib/
│   ├── github/
│   │   ├── parse-url.ts          # Parse + validate "owner/repo" or full URL
│   │   ├── client.ts             # Server-only fetch helpers (uses GITHUB_TOKEN)
│   │   ├── rank-files.ts         # Heuristic ranking of tree entries
│   │   ├── mock.ts               # Deterministic mock response (token-less fallback)
│   │   └── service.ts            # Orchestrates parse → fetch → rank
│   └── types.ts                  # Shared TS types (RepoMeta, TreeEntry, BriefResponse)
│
├── docs/                         # Source-of-truth product/architecture/UI docs
│   ├── PRODUCT.md
│   ├── ARCHITECTURE.md
│   └── UI_GUIDE.md
│
├── public/                       # Static assets
├── replit.md                     # Project context for the agent
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
└── package.json
```

> Anything outside this layout that pre-exists (legacy `artifacts/`, `lib/api-spec`, etc. from earlier wrong-stack scaffolding) is **not part of RepoContext** and should be removed in a dedicated cleanup step before further feature work.

## Data flow

```
[Browser]
   │  user submits URL
   ▼
[Client component: RepoInput]
   │  fetch('/api/repo?url=...')
   ▼
[Route Handler: app/api/repo/route.ts]   ← server only
   │  parseUrl(input)         (lib/github/parse-url.ts)
   │  if !GITHUB_TOKEN → return mock(...)   (lib/github/mock.ts)
   │  else:
   │    fetchMeta(owner, repo)    (lib/github/client.ts)
   │    fetchTree(owner, repo)    (lib/github/client.ts)
   │    rankFiles(tree)            (lib/github/rank-files.ts)
   ▼
[JSON response: { meta, tree, topFiles, isMock }]
   │
   ▼
[Client renders RepoMeta + TopFiles + FileTree]
```

## Server / client boundary

- **Server-only** (never imported into client components):
  - `lib/github/client.ts` (uses `GITHUB_TOKEN`)
  - `lib/github/service.ts`
  - `lib/github/mock.ts`
  - `app/api/repo/route.ts`
- **Client components** (`"use client"`):
  - `components/repo-input.tsx`
  - `components/file-tree.tsx` (interactive expand/collapse)
- **Server components** (default):
  - `app/page.tsx`, `components/repo-meta.tsx`, `components/top-files.tsx`

The `GITHUB_TOKEN` must never appear in any module that is imported by a client component. Treat `lib/github/client.ts` as a hard server boundary (`import "server-only"` at the top).

## API contract

### `GET /api/repo?url=<string>`

**Query params**
- `url` — full GitHub URL or `owner/repo` shorthand. Required.

**Response 200**
```ts
type BriefResponse = {
  meta: {
    owner: string;
    repo: string;
    description: string | null;
    stars: number;
    forks: number;
    language: string | null;
    defaultBranch: string;
    isForked: boolean;
    isMock: boolean;
  };
  tree: Array<{
    path: string;
    type: "blob" | "tree";
    size: number | null;
    importanceScore: number;
  }>;
  topFiles: Array<TreeEntry>; // subset of tree, highest importanceScore first
};
```

**Error responses**
- `400` — invalid URL / shorthand. Body: `{ error: string }`.
- `404` — repo not found. Body: `{ error: string }`.
- `429` — GitHub rate limited. Body: `{ error: string }`.
- `502` — upstream GitHub error. Body: `{ error: string }`.

## Ranking heuristics (`lib/github/rank-files.ts`)

Files are scored by summing:

- **Exact filename matches** at root: `README.md`, `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `Dockerfile`, `Makefile`, `tsconfig.json`, etc.
- **Extension weights**: `.md` (docs), `.ts/.tsx/.js/.jsx`, `.py`, `.rs`, `.go`, etc.
- **Important directories**: `src/`, `app/`, `lib/`, `pages/`, `docs/` boost children slightly.
- **Ignored directories**: `node_modules/`, `dist/`, `build/`, `.git/`, `vendor/` are excluded from ranking entirely.
- Path depth penalty so root-level files outrank deeply nested ones of the same kind.

The exact weight table lives in `rank-files.ts`. Keep it small, readable, and easy to tweak.

## Mock fallback (`lib/github/mock.ts`)

When `GITHUB_TOKEN` is unset:
- The route handler returns a hard-coded `BriefResponse` for a sample repo.
- `meta.isMock = true` so the UI can render a clear "Mock data" badge.
- The mock data must exercise every UI state (description present, stars/forks non-zero, mix of files and folders, several "important" files).

## Caching

- Use Next.js default `fetch` caching with `revalidate: 300` (5 min) for GitHub responses to stay polite to the API.
- No additional cache layer (no Redis, no DB).

## Out of scope (architecture)

No Express, no separate Node service, no OpenAPI, no codegen, no client SDK, no shared monorepo packages, no DB, no auth provider, no AI/LLM, no vector store, no background workers.

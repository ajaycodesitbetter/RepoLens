# Product — RepoContext

## One-liner

RepoContext turns any public GitHub repo URL into a fast, scannable **developer brief**: what the project is, what stack it uses, and which files matter most.

## Target user

A developer who just landed on an unfamiliar open-source repo and wants to answer, in under 30 seconds:

1. What is this project?
2. How big / active is it?
3. Where do I start reading?

## Core user flow

1. User pastes a GitHub URL (e.g. `https://github.com/facebook/react`) or `owner/repo` shorthand into a single input.
2. The app validates and parses the input.
3. The server fetches:
   - Repo metadata (name, description, stars, forks, primary language, default branch, fork status).
   - The full file tree of the default branch.
4. The server ranks files by importance using simple heuristics (filename, path depth, extension, well-known config files).
5. The UI renders the developer brief: header with repo metadata, a list of important files, and the full file tree.

## Features (MVP scope)

- Single repo URL / shorthand input with parsing and validation.
- Server-side metadata fetch.
- Server-side tree fetch (default branch, recursive).
- Heuristic-based ranking of "important" files.
- Developer brief UI with loading, empty, and error states.
- Deterministic mock fallback when `GITHUB_TOKEN` is missing, clearly labeled in the UI.

## Explicitly NOT in scope

- Auth, accounts, sessions, profiles.
- Private repo access.
- Persistence of any kind (no DB, no cache layer beyond Next.js fetch defaults).
- AI summaries, embeddings, vector search, semantic search.
- Background jobs, queues, schedulers.
- Multi-repo comparison, diffing, or watchlists.
- Editing, commenting, or any write operations against GitHub.

## Success criteria

- A user can paste any valid public repo URL and see a useful brief within a few seconds.
- When `GITHUB_TOKEN` is missing, the UI still renders correctly with mock data and clearly indicates that the data is mocked.
- All loading, empty, and error states are handled gracefully — the UI never breaks or shows raw errors.

# Tomorrow — RepoContext

End-of-day handoff for the next session. Read `replit.md` first for the full session log; this is the short, action-oriented version.

## Current status

- **Feature complete** for the planned scope: repo lookup, file tree, top files, project-type detection, onboarding brief, owner-country globe, Markdown export.
- **Tests:** 148 / 148 passing (`pnpm test`).
- **Typecheck:** clean (`pnpm run typecheck`).
- **Production build:** clean (`pnpm run build`). `/` static (23.5 kB), `/api/repo` dynamic, ~125 kB first-load JS.
- **Repo state:** committed via auto-checkpoint. Last checkpoint message: *"Add ability to copy onboarding brief as markdown"*.

The app is in a publishable state. Nothing is half-done.

## Deployment options considered

| Option                        | Verdict                                                                                                                                                |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Replit Publish (Autoscale)** | ✅ Best fit. Already configured for `router = "application"` + `deploymentTarget = "autoscale"`. Just confirm `pnpm run build` / `pnpm run start` in the Publish dialog and set `GITHUB_TOKEN` as a deployment secret. |
| **Netlify**                   | ✅ Solid fallback. The official `@netlify/plugin-nextjs` handles App Router route handlers as serverless functions. Set `GITHUB_TOKEN` in site env. |
| **Vercel**                    | ✅ Also fine — the canonical Next.js host. Skipped only because the user has not asked for a Vercel account.                                          |
| **GitHub Pages**              | ❌ Not a fit. See below.                                                                                                                               |
| **Replit Static**             | ❌ Same reason as Pages — no server runtime.                                                                                                           |

## Why GitHub Pages is not the right fit

GitHub Pages is a **static-file host**. RepoContext cannot run on it because:

1. **It has a server route.** `app/api/repo/route.ts` is a Next.js Route Handler that runs on every request, calls the GitHub REST API, composes the brief, and returns JSON. There is no static prerender for this — the input is a user-supplied repo URL chosen at runtime.
2. **It needs a server-held secret.** `GITHUB_TOKEN` must stay server-side (the whole point of putting GitHub calls in `lib/github/` with `server-only`). Pages cannot hold runtime secrets; anything in the bundle is public.
3. **Forcing a workaround would degrade the product.** The only way to ship to Pages would be `next export` (static export), which would either drop the route entirely or require us to call GitHub directly from the browser — exposing the token, capping us at 60 req/h per anonymous IP, and exposing the user to CORS pain. None of that is worth it.

If we ever want a static landing page on Pages that links to the live app, that's fine, but the app itself needs a Node runtime.

## Likely best next step: push to GitHub, then deploy

**Recommended flow.**

1. Push the repo to GitHub.
2. Publish to **Replit Autoscale** as the primary deployment (already configured here; one click).
3. Optionally also deploy to **Netlify** as a mirror so you have a non-Replit URL to share.

Both Replit Autoscale and Netlify will Just Work with the current `package.json` and Next.js config. No code changes required.

## Checklist for tomorrow

Order matters — don't skip ahead.

- [ ] **Sanity check.** `pnpm install && pnpm test && pnpm run build`. Should be 148 / 148, clean build.
- [ ] **Push to GitHub.**
  - [ ] Create a new public repo (suggest `repocontext`).
  - [ ] Add the GitHub remote.
  - [ ] Push the current branch.
  - [ ] Confirm `README.md` renders correctly on the GitHub repo page.
- [ ] **Deploy to Replit Autoscale.**
  - [ ] Click **Publish** in the workspace.
  - [ ] In the Publish dialog, confirm build = `pnpm run build`, run = `pnpm run start`.
  - [ ] Add `GITHUB_TOKEN` as a deployment secret (re-use the same token from the dev environment).
  - [ ] After publish, hit `<deployment-url>/api/repo?url=facebook/react` and confirm `meta.isMock === false`.
  - [ ] Open the deployment URL in a browser and verify the globe highlight + Copy-as-markdown button work.
- [ ] **(Optional) Mirror to Netlify.**
  - [ ] Create a new Netlify site from the GitHub repo.
  - [ ] Set `GITHUB_TOKEN` in Site Settings → Environment Variables.
  - [ ] Trust the autodetected Next.js plugin; do not add `output: 'export'`.
- [ ] **(Optional) Add a custom domain** in whichever host you picked.

## Things NOT to do tomorrow

- Don't change the globe / owner-country inference. Frozen unless there's a bug.
- Don't add auth, a database, AI summaries, embeddings, vector search, MCP, or chat. All explicitly out of scope.
- Don't expand the curated city dataset beyond the Redmond cluster unless a real org's location can't be mapped. The current dataset is intentionally small.
- Don't try to make this work on GitHub Pages. See above.

## First task tomorrow

Run `pnpm install && pnpm test && pnpm run build` to confirm the project is still green after the overnight checkpoint, then push to GitHub.

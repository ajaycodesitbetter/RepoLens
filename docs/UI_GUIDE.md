# UI Guide — RepoContext

## Goal

A focused, single-page developer brief. Calm, dense-but-readable, monospace where it helps (paths, identifiers). No marketing fluff.

## Layout

Single-column, max-width ~`4xl` (≈ 56rem), centered.

```
┌──────────────────────────────────────────────────────────┐
│  Header:  [logo] RepoContext        [ URL input ][Go]    │  ← sticky
├──────────────────────────────────────────────────────────┤
│                                                          │
│  RepoMeta card   (owner/repo, description, stars, etc.)  │
│                                                          │
│  [Mock data notice — only if isMock]                     │
│                                                          │
│  Tabs: [ File Tree ] [ Key Files ]                       │
│                                                          │
│   • File Tree tab → collapsible tree, important files    │
│     subtly highlighted                                   │
│   • Key Files tab → ranked list with extension badges    │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## Required states

Every data-bound view must explicitly handle:

1. **Idle / empty** — no query yet. Show a friendly intro and 3–4 example repo chips the user can click.
2. **Loading** — skeletons that match the eventual layout (meta card + tree rows).
3. **Error** — inline card with an icon, a short human message, and (when available) the upstream error reason. Never dump raw stack traces.
4. **Success** — meta + tabs.
5. **Mock fallback** — same as success, plus a clear amber notice explaining `GITHUB_TOKEN` is missing.
6. **Empty tree** — repo loaded but tree is empty: friendly message, no broken layout.

## Visual conventions

- **Theme:** light + dark via Tailwind `dark:` classes. Honor system preference.
- **Color usage:**
  - Primary accent: a single restrained brand color for buttons, links, and the logo tile.
  - Important file star: amber.
  - Mock notice: amber with low-saturation background.
  - Errors: destructive red, used sparingly.
- **Typography:**
  - UI: system sans-serif.
  - Paths, filenames, code: monospace.
- **Density:** tight vertical rhythm in the file tree; comfortable spacing elsewhere.
- **Borders & cards:** soft `rounded-xl`, `border border-border`, `bg-card`. Avoid heavy shadows.

## Components (UI layer)

- `RepoInput` — single text input + submit button. Accepts both full URLs and `owner/repo`. Submits on Enter. Disables the button when empty or while loading.
- `RepoMeta` — header card showing `owner/repo` (linked to GitHub), description, stars, forks, primary language, default branch, fork badge, and mock badge when applicable.
- `FileTree` — collapsible tree built from the flat tree response. Folders open by default for the first 1–2 depths. Important files get a subtle star and bolder weight.
- `TopFiles` — ranked list of the most important files. Each row links to the file on GitHub (default branch). Shows a small extension badge.
- `Tabs` — switch between **File Tree** and **Key Files** views.
- `LoadingSkeleton`, `ErrorState`, `EmptyState` — shared state components.

## Interaction rules

- The URL input is the primary affordance. Autofocus on first load.
- Clicking an example chip submits immediately.
- All external links (`github.com/...`) open in a new tab with `rel="noopener noreferrer"`.
- The file tree is read-only — no selection, no editing.
- No modals, no toasts for normal flows. Errors are inline.

## Accessibility

- All interactive elements reachable via keyboard.
- Inputs and buttons have visible focus rings.
- Icons that carry meaning have `aria-label`s; decorative icons use `aria-hidden`.
- Color is never the only signal (mock notice has both color and an icon + text).

## What to avoid

- Marketing copy, hero sections, gradients, animated backgrounds.
- Multi-column dashboards.
- Toolbars or feature buttons that don't have a working backend behind them.
- Anything implying auth, accounts, or saved state.

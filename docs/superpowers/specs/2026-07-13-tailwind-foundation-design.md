# Tailwind Foundation (Phase 1 of UI consistency/responsive rewrite)

## Context

FaceMark Pro's frontend (`frontend/src`) is a React 18 + Vite app styled with plain CSS across 8 numbered files (`01-base.css` → `08-responsive.css`) plus 2 page-specific files, aggregated via `src/styles.css`. There is already a real design-token layer: CSS custom properties (`--ui-bg`, `--ui-card`, `--ui-border`, `--ui-text`, `--ui-text-muted`, motion durations) that swap values under `body.light` / `body.dark` classes, toggled manually by a theme button (state persisted via `THEME_KEY` in localStorage) rather than OS preference alone.

Shared presentational components live in one 646-line file, `src/components/Shared.jsx`, exporting 15 things: 3 auth/logic components (`AuthGate`, `RequireFacultyAuth`, `RequireAdminAuth`) and 12 presentational ones (`PageShell`, `SectionCard`, `StatGrid`, `SimpleTable`, `ProfileFields`, `FormGrid`, `SkeletonBlock`, `TableSkeleton`, `FilterSkeleton`, `DashboardSkeleton`, `FullScreenPortalSkeleton`). All 32 pages across admin/faculty/student roles import from this file.

Goal of the overall initiative (this is Phase 1 of 5): migrate the UI to Tailwind CSS for consistency and better responsive/mobile behavior, without a visual re-brand — same palette, same gradients, same look, better-structured implementation. Later phases (2–4) migrate faculty, admin, and student pages respectively onto the new component set; Phase 5 deletes the legacy CSS files. This spec covers Phase 1 only: standing up Tailwind and rebuilding the shared component layer.

## Scope

**In scope:**
- Add and configure Tailwind v4 in the Vite build.
- Define a `@theme` block that reproduces the existing `--ui-*` design tokens and brand colors/gradients as Tailwind utilities.
- Move dark-mode triggering from `body.light`/`body.dark` classes to a `dark` class on `<html>`, using Tailwind's `dark:` variant (`darkMode: 'selector'`).
- Split `Shared.jsx` into `src/components/shared/*.jsx` by responsibility, rewrite the 12 presentational components' markup in Tailwind utilities matching current visuals pixel-for-pixel, keep the 3 auth/logic components' behavior unchanged (only their skeleton-fallback markup is touched, since it lives in the same file today).
- Keep a `Shared.jsx` barrel re-export so all 32 existing page imports (`from "../../components/Shared"`) require no changes in this phase.
- Update `main.jsx` to import the new Tailwind entry stylesheet instead of `styles.css`.

**Out of scope (deferred to later phases):**
- Migrating any of the 32 page files' own markup/CSS.
- Deleting the legacy numbered CSS files (they stay imported-free but present until Phase 5).
- Any visual/branding changes — same colors, gradients, spacing as today.
- `react-grid-layout` / `react-resizable` internals — their CSS imports and behavior are untouched in this phase (addressed in Phase 3, admin dashboards).
- Adding a component library (shadcn/ui, MUI, etc.) or a class-variance helper (e.g. `cva`) — components stay plain JS/JSX, matching current code style in `Shared.jsx`.

## Architecture

**Dependencies added:** `tailwindcss`, `@tailwindcss/vite` (Tailwind v4's first-class Vite plugin — no PostCSS config file needed).

**Vite config:** `frontend/vite.config.js` gets the Tailwind Vite plugin added alongside the existing `@vitejs/plugin-react` plugin.

**Stylesheet:** New `frontend/src/styles/tailwind.css`:
```css
@import "tailwindcss";

@theme {
  --color-ui-bg: #f5f7fb;
  --color-ui-card: #ffffff;
  --color-ui-card-muted: #f8fafc;
  --color-ui-border: #e2e8f0;
  --color-ui-text: #1f2937;
  --color-ui-text-muted: #64748b;
  /* dark variants expressed via Tailwind's dark: prefix at usage sites,
     not as a second token set — see Dark Mode below */
  --color-brand-from: #4facfe;
  --color-brand-to: #00f2fe;
  --color-brand-dark-from: #0f2027;
  --color-brand-dark-via: #203a43;
  --color-brand-dark-to: #2c5364;
  --ease-motion-fast: 160ms cubic-bezier(0.22, 1, 0.36, 1);
  --ease-motion-base: 240ms cubic-bezier(0.22, 1, 0.36, 1);
  --ease-motion-slow: 420ms cubic-bezier(0.22, 1, 0.36, 1);
  --ease-motion-bounce: 420ms cubic-bezier(0.2, 0.85, 0.24, 1.08);
}
```
`main.jsx` replaces the `import "./styles.css"` line with `import "./styles/tailwind.css"`. The old `styles.css` aggregator and the 8 numbered files + 2 page-specific files remain on disk, unimported, until Phase 5.

**Dark mode:** `darkMode: 'selector'` behavior comes for free from Tailwind v4's `dark:` variant working off a `.dark` ancestor class. `PageShell`'s theme state logic changes from toggling `document.body.classList` to toggling `document.documentElement.classList`, keeping the same localStorage persistence key (`THEME_KEY`) and toggle UX. Every migrated component pairs each light-mode utility with an explicit `dark:` utility (e.g. `bg-white dark:bg-slate-900`) reproducing the current `body.light`/`body.dark` values from `01-base.css`.

## Components

Split `src/components/Shared.jsx` into `src/components/shared/`:
- `auth.jsx` — `AuthGate`, `RequireFacultyAuth`, `RequireAdminAuth` (logic unchanged; renders `FullScreenPortalSkeleton` from `skeletons.jsx`)
- `PageShell.jsx` — sidebar/topbar shell, theme toggle logic (updated to target `<html>`)
- `Card.jsx` — `SectionCard`
- `StatGrid.jsx` — `StatGrid`
- `Table.jsx` — `SimpleTable`
- `ProfileFields.jsx` — `ProfileFields`
- `FormGrid.jsx` — `FormGrid`
- `Skeletons.jsx` — `SkeletonBlock`, `TableSkeleton`, `FilterSkeleton`, `DashboardSkeleton`, `FullScreenPortalSkeleton`

`src/components/Shared.jsx` becomes a barrel: re-exports everything from the new files, so all 32 pages' `import { PageShell, SectionCard, ... } from "../../components/Shared"` statements keep working unmodified.

Each component's JSX is rewritten to use Tailwind utility classes instead of the current custom class names (e.g. `portal-shell`, `sidebar-overlay`, `profile-section`), reproducing the same computed styles (colors, spacing, radius, shadow, transition timing) that the corresponding rules in `01-base.css` (and other numbered files, where relevant) currently produce.

## Error handling

No new failure modes are introduced — this phase does not touch data fetching or business logic. The only runtime behavior change is the dark-mode class target (`body` → `html`); if `THEME_KEY` in localStorage holds a stale value from before this change, it's read the same way (`"light"` / `"dark"` string), so no migration of stored data is needed.

## Testing / verification

No frontend test suite exists yet (`package.json` has no `test` script). Verification is manual and visual:
1. `npm run dev`, load a page using each migrated component: `PageShell` (any dashboard), `SectionCard` + `StatGrid` (`AdminDashboard`), `SimpleTable` (`AdminTablePage`), skeleton states (throttle network or force loading state).
2. Toggle dark mode; confirm every migrated component matches its current light/dark appearance, and the choice persists across a page reload.
3. Confirm the barrel export means zero page files needed edits — `git diff` should show changes only under `src/components/`, `src/styles/`, `vite.config.js`, `main.jsx`, `package.json`.

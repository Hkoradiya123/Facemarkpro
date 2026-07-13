# Collapsible Sidebar (Desktop Icon Rail)

## Context

`PageShell.jsx` (`frontend/src/components/shared/PageShell.jsx`) renders the fixed 306px sidebar shared by admin/faculty/student portals. Desktop always shows the full sidebar; mobile (<992px) already has a separate slide-in/out overlay toggle. This adds a desktop-only collapse to a 72px icon-only rail, independent of the mobile behavior.

## Scope

**In scope:**
- New `sidebarCollapsed` state in `PageShell`, persisted to `localStorage` (new key `SIDEBAR_COLLAPSED_KEY`), following the same init/persist pattern as the existing `theme` state.
- Desktop-only (≥993px) collapse: sidebar width `306px → 72px`; `portal-main`'s left margin/width adjust to match.
- Collapsed state hides: brand text/subtitle (logo mark stays), profile name/meta (avatar stays, centered), nav link labels (icons stay, centered), "Admin Dashboard" footer link label, logout label. Each collapsed nav/footer link gets a native `title` attribute for a browser tooltip.
- New toggle button in the sidebar footer row, next to the day/night switch.
- Below 992px (mobile breakpoint), collapse is ignored entirely — mobile overlay behavior is unchanged, sidebar always renders at full width when opened.

**Out of scope:**
- Any change to mobile overlay open/close behavior.
- Custom tooltip component (native `title` is sufficient).
- Per-role default collapse state (same default — expanded — for all roles).

## Behavior

- Default state: expanded (matches current behavior for existing users; no `localStorage` value = expanded).
- Toggle button icon reflects direction: collapsed → chevron pointing right (expand), expanded → chevron pointing left (collapse).
- Collapsing/expanding animates the width transition (existing `--motion-*` timing already used elsewhere in the file, e.g. the sidebar's own motion-slow transition for mobile).
- State change writes to `localStorage` immediately, same as theme.

## Testing / verification

No automated test suite. Manual: toggle collapse on desktop, confirm rail width/icon-only rendering, reload page and confirm collapsed state persisted, resize below 992px and confirm mobile overlay still works at full width regardless of collapsed state, resize back above 992px and confirm collapsed state resumes.

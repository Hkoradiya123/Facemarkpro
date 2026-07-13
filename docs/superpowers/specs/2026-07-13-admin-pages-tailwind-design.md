# Admin Pages Tailwind Migration + Grid/Widget Cleanup

## Context

This is the next phase after the completed Faculty+Student pairing (`docs/superpowers/specs/2026-07-13-faculty-pages-tailwind-design.md`, `docs/superpowers/specs/2026-07-13-student-pages-tailwind-design.md`). It covers the 7 admin pages under `frontend/src/pages/admin/` (2,598 lines) plus the two pieces deferred from the Faculty phase: `FacultyDashboard.jsx`'s `<ResponsiveGridLayout>` grid and all of `FacultyWidgetCard.jsx` (483 lines of widget-rendering internals).

`AdminDashboard.jsx` does **not** use `react-grid-layout` itself — it's a static dashboard built entirely from already-migrated `Shared` components (`PageShell`, `SectionCard`, `StatGrid`, `SimpleTable`) plus its own `admin-overview-*` classnames. The grid/widget system is exclusively a Faculty feature; it's grouped into this phase because it was explicitly deferred here, not because Admin needs it.

Also carried over from the Faculty phase: the `.admin-table` shared pattern (base row/cell styling with `:first-child`/`:last-child` border-radius) was deliberately left un-migrated in `FacultyReports.jsx` because it's used across 5 admin pages (`AdminAcademicSetup`, `AdminReports`, `AdminManageFaculty`, `AdminManageStudents`, `AdminManageFaces`) and doing it once, consistently, here is more efficient than duplicating the work.

## Scope

**In scope:**
- Migrate all 7 admin pages: `AdminTablePage` (33 lines), `AdminDashboard` (225), `AdminReports` (251), `AdminAcademicSetup` (399), `AdminManageStudents` (454), `AdminManageFaculty` (518), `AdminManageFaces` (718).
- Migrate the shared `.admin-table` base pattern once (th/td padding, border, `:first-child`/`:last-child` radius via Tailwind's `first:`/`last:` variants), applied consistently across every admin page and `FacultyReports.jsx` that uses it.
- Migrate `FacultyDashboard.jsx`'s `<ResponsiveGridLayout>` wrapper styling (`.faculty-widget-grid` and its `.react-grid-item` states) and all of `FacultyWidgetCard.jsx`'s widget-internal classnames (`.faculty-widget-card`, `.lecture-stack-*`, `.timetable-grid-*`, `.student-roster-*`, etc.).
- Same consistency-fix rounding rule as prior phases: snap to nearest standard Tailwind token when a legacy value is within a couple pixels, called out per occurrence; exact values preserved for brand colors, gradients, and anything design-specific.
- Same bridge conventions: legacy classnames retained alongside Tailwind utilities, dark mode via the now-fixed class-based `dark:` variant (confirmed working as of the `tailwind.css` fix).

**Out of scope (deferred to Cleanup phase):**
- Deleting any legacy CSS file.
- Removing the dual-stylesheet import in `main.jsx`.

## Architecture

Same bridge pattern as every prior phase. One addition specific to this phase: the `.admin-table` migration needs Tailwind's `first:`/`last:` pseudo-class variants (`first:rounded-l-[14px] first:border-l`, `last:rounded-r-[14px] last:border-r`) applied directly on `<td>` elements, since CSS `:first-child`/`:last-child` selectors can't be expressed as component-level base classes the way `Shared.jsx`'s `SimpleTable` handles its own (simpler, non-rounded) cells.

## Components / Pages

Migration order (simple → complex, then the deferred grid/widget work last since it's highest-risk):

1. `AdminTablePage.jsx` (33 lines)
2. `AdminDashboard.jsx` (225 lines)
3. `AdminReports.jsx` (251 lines)
4. `AdminAcademicSetup.jsx` (399 lines)
5. `AdminManageStudents.jsx` (454 lines)
6. `AdminManageFaculty.jsx` (518 lines)
7. `AdminManageFaces.jsx` (718 lines) — largest, includes camera/face-registration UI
8. `.admin-table` shared base pattern — migrated once, referenced by pages above and retrofitted into `FacultyReports.jsx`
9. `FacultyDashboard.jsx` grid wrapper + `FacultyWidgetCard.jsx` (483 lines) — grid/widget internals, done last

## Error handling

No new failure modes — visual/structural migration only, consistent with every prior phase.

## Testing / verification

Same as prior phases: no automated frontend test suite. After each page's migration, load it in light mode, dark mode (now verified working via the class-based `dark:` fix), and at a mobile width, confirming no visual regression. After the grid/widget work, specifically verify drag/resize still functions on `FacultyDashboard` (not just visual — the grid's interactive behavior must be unaffected).

# Faculty Pages Tailwind Migration (first spec of the Faculty+Student pairing)

## Context

Phase 1 (`docs/superpowers/specs/2026-07-13-tailwind-foundation-design.md`) stood up Tailwind v4 and migrated the shared component layer (`src/components/shared/*.jsx`) that all 32 pages consume, using a bridge approach: legacy CSS stays imported and legacy classnames stay on migrated elements, so unmigrated pages keep working unchanged. That bridge is still in place — this spec is the next phase that migrates actual page code onto it.

This spec covers the 12 faculty pages under `frontend/src/pages/faculty/` (3,908 lines total). A companion spec for the 6 student pages follows immediately after and executes back-to-back with this one, without a separate approval checkpoint — together they form the "Faculty+Student" pairing you approved. Admin pages and final legacy-CSS cleanup are a later, separate pairing.

Faculty pages currently style themselves via classes defined in `01-base.css` (shared, already covered by Phase 1's bridge), `02-faculty-profile.css` (603 lines, faculty-profile-specific: photo cropper, meta grid, etc.), `04-dashboard-widgets.css` (shared with admin — widget cards, sidebar overlay), and `05-attendance-pages.css` (471 lines, attendance flow pages), plus responsive overrides in `08-responsive.css`.

## Scope

**In scope:**
- Migrate all 12 faculty pages' own JSX/classnames to Tailwind utilities: `ManualAttendanceSelect`, `FacultyFormPage`, `FacultyStudents`, `FaceRegistrationsSummary`, `AttendanceResult`, `ManualAttendance`, `FacultyReports`, `ManualAttendanceMark`, `FacultyAttendance`, `FacultyWidgetCard`, `FacultyDashboard` (page chrome only — header, non-widget layout), `FacultyProfile` (including its photo cropper UI).
- Where a legacy value is within a couple pixels of a standard Tailwind scale token, snap to the token (e.g. `padding: 15px` → `p-4`) instead of an arbitrary value — call out each such rounding explicitly in the plan rather than applying it silently.
- Keep the Phase 1 bridge conventions: legacy classnames retained alongside new Tailwind utilities, dark mode class applied to both `<body>` and `<html>`.

**Out of scope (deferred):**
- `FacultyDashboard.jsx`'s `react-grid-layout` widget grid internals (the `<ResponsiveGridLayout>` and its direct widget-sizing CSS) — left on legacy CSS. Solved once, together with admin's identical pattern, in the Admin pairing.
- The 6 student pages — separate spec, executed immediately after this one.
- Deleting any legacy CSS file — still deferred to the final cleanup phase, once faculty, student, and admin are all migrated.
- Any change to data-fetching logic, routing, or component behavior — visual/structural migration only.

## Architecture

**Per-page migration pattern:** each page file's top-level JSX keeps its existing legacy classnames (e.g. `faculty-profile-hero`, `photo-cropper-body`, `report-filter-grid`) and gains Tailwind utility classes alongside them, following the exact same bridge pattern used for `Shared.jsx` in Phase 1 — Tailwind utilities are appended after legacy classnames in each `className` string, and since `tailwind.css` loads after `styles.css` in `main.jsx`, Tailwind wins the cascade for any overlapping property.

**Consistency-fix rounding:** the plan will note, page by page, any place a legacy pixel value is snapped to the nearest Tailwind scale token rather than reproduced as an arbitrary value. This only applies to generic spacing/sizing (padding, gap, margin) where the visual delta is 1-3px and imperceptible in context — not to brand colors, gradients, the 306px sidebar, or anything with a specific documented reason for its exact value.

**FacultyDashboard split:** the page's outer chrome (page header, section wrappers around the grid, any non-widget content) gets migrated normally. The `<ResponsiveGridLayout>` element and the widget components it renders (`FacultyWidgetCard`'s internal layout) keep 100% legacy styling untouched in this phase — same as `AdminDashboard`'s grid today.

## Components / Pages

Migration proceeds in this order (simple → complex, so early tasks validate the approach before the riskiest page):

1. `ManualAttendanceSelect.jsx` (8 lines)
2. `FacultyFormPage.jsx` (32 lines)
3. `FacultyStudents.jsx` (42 lines)
4. `FaceRegistrationsSummary.jsx` (46 lines)
5. `AttendanceResult.jsx` (120 lines) — also uses `pages/attendance-result.css`
6. `ManualAttendance.jsx` (179 lines)
7. `FacultyReports.jsx` (249 lines)
8. `ManualAttendanceMark.jsx` (257 lines)
9. `FacultyAttendance.jsx` (450 lines)
10. `FacultyWidgetCard.jsx` (483 lines) — page chrome only, widget internals excluded per scope
11. `FacultyDashboard.jsx` (699 lines) — page chrome only, grid excluded per scope
12. `FacultyProfile.jsx` (1,343 lines) — includes photo cropper UI, largest and most complex page, done last

## Error handling

No new failure modes — this is a visual/structural migration only, no data-fetching, routing, or business-logic changes. Any page not yet reached in the task order continues to render exactly as it does today (bridge CSS still active).

## Testing / verification

Same as Phase 1: no automated frontend test suite exists. Verification is manual — after each page's migration task, load that specific page in both light and dark mode, and at a mobile width (below 992px), and confirm no visual regression versus its pre-migration appearance. A final pass loads all 12 pages once more after the last task, to catch any cross-page regression (e.g. from a shared page-level CSS class change).

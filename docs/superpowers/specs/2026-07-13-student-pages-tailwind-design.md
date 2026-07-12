# Student Pages Tailwind Migration (second spec of the Faculty+Student pairing)

## Context

This is the companion spec to `docs/superpowers/specs/2026-07-13-faculty-pages-tailwind-design.md`, executed immediately after it without a separate approval checkpoint, per your instruction to treat Faculty+Student as one continuous pairing. It covers the 6 student pages under `frontend/src/pages/student/` (698 lines total) — the smaller half of this pairing.

Student pages style themselves via `01-base.css` (shared, Phase 1 bridge already covers it), `styles/pages/student-dashboard.css` (109 rules, dashboard-specific), and `04-dashboard-widgets.css` / `05-attendance-pages.css` (shared with faculty, attendance/widget classes), plus `08-responsive.css` overrides.

Unlike `FacultyDashboard.jsx`, no student page has a genuine `react-grid-layout` dependency — several files (`StudentChangePassword`, `RegisterStudentFace`, `StudentTimetable`, `StudentAttendance`) import `Responsive`/`WidthProvider` from `react-grid-layout` but never render them (dead imports, likely copy-pasted boilerplate). No grid-layout deferral is needed for this spec.

## Scope

**In scope:**
- Migrate all 6 student pages' own JSX/classnames to Tailwind utilities: `StudentChangePassword`, `RegisterStudentFace`, `StudentTimetable`, `StudentAttendance`, `StudentProfile`, `StudentDashboard`.
- Remove the dead `react-grid-layout` imports encountered in `StudentChangePassword.jsx`, `RegisterStudentFace.jsx`, `StudentTimetable.jsx`, `StudentAttendance.jsx` while touching those files (unused code directly in the diff's path — not an unrelated drive-by change).
- Same consistency-fix rounding rule as the Faculty spec: snap to the nearest standard Tailwind token when a legacy value is within a couple pixels of one, called out explicitly per occurrence; exact values preserved for brand colors, gradients, and anything with a specific reason to be precise.
- Keep the Phase 1 bridge conventions: legacy classnames retained alongside new Tailwind utilities, dark mode class applied to both `<body>` and `<html>`.

**Out of scope (deferred):**
- Admin pages and final legacy-CSS cleanup — separate, later pairing.
- Any change to data-fetching logic, routing, or component behavior — visual/structural migration only.

## Architecture

Identical bridge pattern to the Faculty spec and to Phase 1: legacy classnames stay on every element, Tailwind utilities are appended alongside them, `tailwind.css` loading after `styles.css` in `main.jsx` means Tailwind wins the cascade for overlapping properties.

## Components / Pages

Migration order (simple → complex):

1. `StudentChangePassword.jsx` (39 lines) — also drops its dead `react-grid-layout` import
2. `RegisterStudentFace.jsx` (44 lines) — also drops its dead `react-grid-layout` import
3. `StudentTimetable.jsx` (56 lines) — also drops its dead `react-grid-layout` import
4. `StudentAttendance.jsx` (60 lines) — also drops its dead `react-grid-layout` import
5. `StudentProfile.jsx` (203 lines)
6. `StudentDashboard.jsx` (296 lines) — uses `styles/pages/student-dashboard.css`, most complex page in this spec

## Error handling

No new failure modes — visual/structural migration only. Removing the 4 dead `react-grid-layout` imports has no runtime effect (they were never referenced in JSX), verified per-file before removal.

## Testing / verification

Same as the Faculty spec: no automated frontend test suite. After each page's migration task, load that page in light mode, dark mode, and at a mobile width (below 992px), confirming no visual regression. A final pass loads all 6 pages once more after the last task.

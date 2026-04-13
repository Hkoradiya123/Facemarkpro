All Things You Need To Do (Flask Templates to React Migration)

Decide rendering model first: API-only Flask + React SPA.

Keep Flask Blueprints for data and business logic, remove template rendering responses gradually.

Add a frontend catch-all route that serves React build for non-API paths (while preserving API prefixes like /api, /attendance, /admin, /student).

Replace all render_template pages with JSON API responses in these route files:
faculty_routes.py, attendance_routes.py, student_routes.py, admin_routes.py.

Define one auth contract for both faculty and student login currently split across:
faculty_routes.py:171 and student_routes.py:22.

Standardize auth response format for React (success, user, role, redirectPath, errors).

Replace Flask flash message pattern with structured JSON errors/warnings from all POST endpoints.

Keep session-based auth initially (lowest-risk), then optionally move to token auth later.

Expose a who-am-i endpoint for React bootstrapping user/session state.

Add role guards as API middleware equivalent to current admin before_request guard in admin_routes.py.

Migrate page-by-page UI from templates to React routes using this mapping:

Login page: multilogin.html and faculty_routes.py:163.

Faculty dashboard: dashboard.html with data from faculty_routes.py:389.

Faculty attendance live/upload: attendance.html with endpoints in attendance_routes.py.

Manual attendance pages: manual_attendance_select.html and manual_attendance_mark.html.

Faculty reports: reports.html from faculty_routes.py:628.

Faculty profile: faculty_profile.html.

Student dashboard/timetable/attendance/profile/change-password templates under student from student_routes.py.

Admin dashboard/faculty/students/faces/reports templates under admin from admin_routes.py.

Keep these existing JSON-ready endpoints and integrate directly in React first (high value, low rewrite):

Live attendance session endpoints in attendance_routes.py:641, attendance_routes.py:716, attendance_routes.py:829, attendance_routes.py:860.

Mobile API endpoints in mobile_api.py as model contracts for clean JSON patterns.

Replace template-embedded fetch/form behavior with React service layer calls.

Migrate multipart file upload flows:

Profile photo upload: faculty_routes.py:281.

Face registration upload/camera: admin_routes.py:501, student_routes.py:371.

Attendance video upload: attendance_routes.py:171.

Normalize route naming and prefixes before full migration.

There is mixed style now (/student/..., /attendance/..., /admin/..., and root faculty routes) across:
faculty_routes.py, student_routes.py, attendance_routes.py, admin_routes.py.

Introduce consistent API namespaces, for example /api/auth, /api/faculty, /api/student, /api/admin, /api/attendance.

Remove backend dependency on CSV in runtime APIs where possible.

Student and faculty flows still read CSV in places, e.g. student_routes.py (faculty_users.csv, timetable.csv).

Move those to Mongo-backed reads for consistent React API behavior.

Build a React data contract document before coding.

For each page define: endpoint, method, request payload, success schema, error schema, auth requirement, role requirement.

Add API-level validation + consistent status codes.

Return 400 for validation, 401 for unauthenticated, 403 for unauthorized, 404 for missing resources, 500 for internal.

Ensure all endpoints return JSON for React paths (not redirect + flash).

Preserve report exports while migrating.

CSV/PDF download is already implemented in:
faculty_routes.py:628 and admin_routes.py:130.

Keep these as direct file responses and wire React download buttons to query params.

Migrate sidebar/theme logic from legacy JS to React state/context.

Legacy behaviors are in script.js and sidebar.js.

Move remember-me/theme toggles to React + localStorage.

Move chart data to API-driven React chart components.

Legacy chart file charts.js is mostly static demo data, while real analytics comes from route data in faculty/admin report/dashboard handlers.

Add regression tests for critical workflows before removing templates:

Auth (faculty/student), dashboard load, attendance session start/process/stop, manual attendance submit, face registration add/delete/edit, admin CRUD, reports export.

Cutover in phases instead of big-bang:

Phase 1: React consumes existing JSON endpoints and keeps old template routes alive.

Phase 2: add missing JSON endpoints for remaining template-only pages.

Phase 3: switch frontend navigation entirely to React.

Phase 4: remove render_template and old template/static assets.

Important Risks I Found (fix during migration)

Potential template path mismatch: route returns faculty/register_student_face.html but template present is student/register_student_face.html in your backend tree.
There is a reference to /attendance/mark_attendance in attendance template JS but corresponding Flask route is not present in current attendance routes.
Mixed CSV + Mongo reads in student/faculty flows can cause inconsistent data.
student_logout exists in student_routes but is not route-decorated, so it is not callable as endpoint.
faculty_routes initializes a Flask app + mongo client at module import time, which is non-standard and should be removed/refactored during cleanup.
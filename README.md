---
title: FaceMarkPro - Facial Recognition Attendance System
emoji: 👤
colorFrom: blue
colorTo: purple
sdk: docker
pinned: false
license: mit
app_port: 7860
---

# FaceMarkPro

FaceMarkPro is a full-stack attendance platform that combines facial recognition, attendance workflows, reports, and role-based dashboards for faculty, students, and admins.

This repository is configured for Docker-first deployment and runs cleanly on Hugging Face Spaces (Docker SDK) without Docker Compose.

## Table of Contents

1. Overview
2. System Architecture
3. Caching Architecture
4. Configuration and Environment Variables
5. Local Run (Docker-only)
6. Hugging Face Spaces Deployment
7. API and Data Notes
8. Operations and Troubleshooting

## 1) Overview

### Core Capabilities

- Facial recognition attendance marking (live and uploaded media workflows)
- Faculty and admin dashboards with analytics and reports
- Student dashboard with timetable and attendance views
- Role-based authentication and session-aware routing
- Dashboard layout persistence (faculty desktop and mobile)

### Tech Stack

- Backend: Flask + Gunicorn
- Frontend: React + Vite (built static assets served by Flask in production)
- Database: MongoDB
- Caching: Flask-Caching, Redis-backed when configured
- Runtime: single Docker container

## 2) System Architecture

### Runtime Flow

1. React frontend is built during Docker image build.
2. Flask serves API routes and built frontend assets.
3. Gunicorn runs Flask workers.
4. Redis cache is started in-container by entrypoint for cache-backed responses.

### Project Structure (high-level)

- `backend/app`: Flask app, routes, services, extensions
- `frontend/src`: React application
- `Dockerfile`: multi-stage image build and runtime
- `docker-entrypoint.sh`: starts Redis and then application process

### Dashboard Layout Persistence (MongoDB)

Faculty widget positions are stored in MongoDB collection `faculty_layouts`:

- `desktop_layout` for 12-column layout
- `mobile_layout` for 6-column layout

Server-side constraints ensure:

- layout sanitization
- vertical gravity compaction
- bounds checking per breakpoint

Endpoints:

- `GET /api/faculty/dashboard/layout`
- `POST /api/faculty/dashboard/layout`

## 3) Caching Architecture

### What is cached

Read-heavy JSON payloads are cached:

- Student dashboard API
- Faculty dashboard API
- Admin dashboard API
- Faculty report filters
- Faculty reports
- Admin report filters
- Admin reports

### Where cache is implemented

- Cache extension init: `backend/app/extensions.py`
- App wiring: `backend/app/__init__.py`
- Cached routes:
	- `backend/app/routes/student_routes.py`
	- `backend/app/routes/api_routes.py`

### Cache backend behavior

- If `CACHE_REDIS_URL` is set, Redis is used.
- If unavailable, app can fall back to in-memory cache (`SimpleCache`).
- Docker image defaults are Redis-friendly and start `redis-server` in-container.

### TTL defaults

- `CACHE_DEFAULT_TIMEOUT=60`
- `DASHBOARD_CACHE_TTL=60`
- `REPORT_CACHE_TTL=120`

### Important caveat

This cache layer currently optimizes reads by TTL and does not yet do aggressive write-triggered invalidation for every mutation path. For strict freshness, reduce TTL values.

## 4) Configuration and Environment Variables

### Required

- `MONGO_URI`: MongoDB connection string
- `MONGODB_DB`: database name (example: `attendance_db`)
- `SECRET_KEY`: Flask session secret

### Common optional

- `PORT` (default `7860`)
- `BASE_DIR` (important on ephemeral environments)
- `INFERENCE_SERVICE_URL`
- `FACE_RECOGNITION_MODE`

### Caching

- `CACHE_TYPE` (default in container: `RedisCache`)
- `CACHE_REDIS_URL` (default in container: `redis://127.0.0.1:6379/0`)
- `CACHE_DEFAULT_TIMEOUT`
- `DASHBOARD_CACHE_TTL`
- `REPORT_CACHE_TTL`

To force in-memory caching only:

- set `CACHE_TYPE=SimpleCache`

## 5) Local Run (Docker-only)

No Docker Compose is required.

### Build

```bash
docker build -t facemarkpro:latest .
```

### Run (minimum)

```bash
docker run --rm -p 7860:7860 \
	-e PORT=7860 \
	-e MONGO_URI="<your-mongodb-uri>" \
	-e MONGODB_DB="attendance_db" \
	-e SECRET_KEY="<your-secret>" \
	facemarkpro:latest
```

### Run (with cache overrides)

```bash
docker run --rm -p 7860:7860 \
	-e MONGO_URI="<your-mongodb-uri>" \
	-e MONGODB_DB="attendance_db" \
	-e SECRET_KEY="<your-secret>" \
	-e DASHBOARD_CACHE_TTL=90 \
	-e REPORT_CACHE_TTL=180 \
	facemarkpro:latest
```

Open:

- `http://localhost:7860`

## 6) Hugging Face Spaces Deployment

### Space setup

1. Create a new Space.
2. Choose Docker SDK.
3. Push this repository.

### Required Space secrets/variables

- `MONGO_URI` (secret)
- `MONGODB_DB` (variable, default `attendance_db`)
- `SECRET_KEY` (secret)

Optional:

- `BASE_DIR` (defaults to `/tmp` behavior in app logic)
- `INFERENCE_SERVICE_URL`
- `FACE_RECOGNITION_MODE`
- cache TTL overrides

### Port and process

- Frontmatter sets `app_port: 7860`.
- Gunicorn binds to `${PORT}` (default `7860`).

### Post-deploy verification

- `GET /health` returns `200`
- auth works for all roles
- dashboards load without asset 404
- faculty widget layout save/load works
- reports load and export endpoints respond

## 7) API and Data Notes

### Auth/session

- API auth state is session-based.
- `/api/auth/whoami` should be used to verify active role and identity.

### Student dashboard payload

Student dashboard endpoint returns:

- `todayClasses`
- `attendanceSummary`
- `recentAttendance`
- `weeklyHeaders`
- `weeklyTimetable`

### Frontend asset serving

Flask serves built assets from frontend `dist` in production mode and has explicit `/assets/<path>` handling.

## 8) Operations and Troubleshooting

### Faculty layout not restoring

- verify MongoDB permissions and connectivity
- verify `faculty_layouts` collection is writable
- check `POST /api/faculty/dashboard/layout` response

### Reload shows old hashed asset 404

- ensure production serves matching built assets
- in local dev with Vite, avoid proxying frontend app routes to backend
- hard refresh browser cache

### Login role mismatch

- call `/api/auth/whoami` and verify role
- clear stale session cookies if switching roles often

### APIs slow under load

- confirm cache vars are set
- verify Redis started in container logs
- reduce expensive filter combinations
- tune `DASHBOARD_CACHE_TTL` and `REPORT_CACHE_TTL`

### Space build fails

- root-level `Dockerfile` must exist
- dependencies must install from `backend/requirements.txt`
- ensure no private package/network restrictions block `pip`

## Security Notes

- Never commit real secrets to git.
- Use Spaces secrets (or secure runtime secrets) in production.
- Restrict MongoDB access by IP/network and least-privilege credentials.

## Appendix A: Environment Variable Reference

| Variable | Required | Default | Scope | Description |
|---|---|---|---|---|
| `PORT` | No | `7860` | Runtime | Gunicorn bind port inside container. |
| `SECRET_KEY` | Yes | random if unset | Backend | Flask session signing key. Set explicitly in production. |
| `MONGO_URI` | Yes | none | Backend | MongoDB connection string. |
| `MONGODB_DB` | Yes | `attendance_db` | Backend | Target database name. |
| `BASE_DIR` | No | backend root (or `/tmp` on Spaces) | Backend | Writable data anchor for uploads/session/temp files. |
| `UPLOAD_FOLDER` | No | `dataset` | Backend | Dataset location relative to `BASE_DIR`. |
| `ENCODING_FILE` | No | `encodings/face_encodings.pickle` | Backend | Legacy global encoding file path. |
| `SPLIT_DIR` | No | `split_encodings` | Backend | Class-wise encoding pickle directory. |
| `ATTENDANCE_DIR` | No | `attendance_logs` | Backend | Attendance logs/output directory. |
| `TIMETABLE_FILE` | No | `timetable.csv` | Backend | Timetable CSV path relative to `BASE_DIR`. |
| `CACHE_TYPE` | No | `RedisCache` in Docker image | Backend | Flask-Caching backend selector. |
| `CACHE_REDIS_URL` | No | `redis://127.0.0.1:6379/0` in Docker image | Backend | Redis connection URL for cache. |
| `CACHE_DEFAULT_TIMEOUT` | No | `60` | Backend | Default cache TTL in seconds. |
| `DASHBOARD_CACHE_TTL` | No | `60` | Backend | Dashboard endpoint TTL in seconds. |
| `REPORT_CACHE_TTL` | No | `120` | Backend | Report endpoint TTL in seconds. |
| `INFERENCE_SERVICE_URL` | No | none | Backend | Remote face inference endpoint. |
| `FACE_RECOGNITION_MODE` | No | auto | Backend | `local`, `remote`, or `hybrid` depending on deployment strategy. |

## Appendix B: Cache Internals (In-depth)

### B.1 Cached route families

1. Student dashboard:
	- route: `GET /api/student/dashboard`
	- key shape: `student_dashboard:<roll_no>:<branch>:<semester>:<section>`
2. Faculty dashboard:
	- route: `GET /api/faculty/dashboard`
	- key shape: `faculty_dashboard:<faculty_email>:<role>`
3. Admin dashboard:
	- route: `GET /api/admin/dashboard`
	- key shape: `admin_dashboard:<faculty_email>:<role>`
4. Faculty reports and filter metadata:
	- routes: `GET /api/faculty/reports`, `GET /api/faculty/reports/filters`
	- report key includes query string for filter-specific caching
5. Admin reports and filter metadata:
	- routes: `GET /api/admin/reports`, `GET /api/admin/reports/filters`
	- report key includes query string for filter-specific caching

### B.2 Cache strategy

- Strategy is read-through cache with TTL expiration.
- First request computes payload and stores it.
- Subsequent requests return cached JSON until TTL expires.
- Current design favors simplicity and safe defaults over aggressive invalidation.

### B.3 Invalidation model

- TTL-based automatic invalidation is active.
- Write-triggered invalidation is not yet exhaustive across all mutation paths.
- If strict real-time consistency is required:
  1. reduce TTLs, or
  2. add targeted cache deletes on critical write endpoints.

### B.4 Fallback behavior

- If Flask-Caching/Redis cannot initialize, app remains available.
- A lightweight in-memory fallback cache implementation keeps routes functional.
- This avoids hard startup failures due to temporary cache dependencies.

## Appendix C: Docker Command Cookbook

### C.1 Build

```bash
docker build -t facemarkpro:latest .
```

### C.2 Run (minimum env)

```bash
docker run --rm -p 7860:7860 \
  -e MONGO_URI="<your-mongodb-uri>" \
  -e MONGODB_DB="attendance_db" \
  -e SECRET_KEY="<your-secret>" \
  facemarkpro:latest
```

### C.3 Run with explicit cache tuning

```bash
docker run --rm -p 7860:7860 \
  -e MONGO_URI="<your-mongodb-uri>" \
  -e MONGODB_DB="attendance_db" \
  -e SECRET_KEY="<your-secret>" \
  -e CACHE_DEFAULT_TIMEOUT=45 \
  -e DASHBOARD_CACHE_TTL=45 \
  -e REPORT_CACHE_TTL=90 \
  facemarkpro:latest
```

### C.4 Disable Redis cache (force in-memory cache)

```bash
docker run --rm -p 7860:7860 \
  -e MONGO_URI="<your-mongodb-uri>" \
  -e MONGODB_DB="attendance_db" \
  -e SECRET_KEY="<your-secret>" \
  -e CACHE_TYPE=SimpleCache \
  facemarkpro:latest
```

### C.5 Logs and health checks

```bash
docker ps
docker logs -f <container-id>
curl http://localhost:7860/health
```

## Appendix D: Verification Runbook

Use this post-deploy checklist in sequence:

1. Infrastructure sanity:
	- container is running
	- `/health` returns `200`
2. Auth sanity:
	- faculty login succeeds
	- student login succeeds
	- admin login succeeds
3. API sanity:
	- `/api/auth/whoami` shows expected role for current session
4. Dashboard sanity:
	- student dashboard renders timetable and attendance summary
	- faculty dashboard loads widgets and charts
	- admin dashboard loads aggregate stats
5. Reports sanity:
	- faculty reports filters load
	- faculty report query returns summary/detail rows
	- admin reports filters and report query return data
6. Cache sanity:
	- repeated same dashboard/report calls become faster
	- changing TTL updates refresh behavior as expected

## Appendix E: FAQ

### E.1 Is Redis mandatory?

No. The app can run with `SimpleCache` fallback. Redis is recommended for better cache behavior under load.

### E.2 Why single-container Redis instead of separate service?

Single container is simpler for this repository and Hugging Face Docker Spaces constraints. For scaled production, external Redis is preferred.

### E.3 Why do I still see occasional stale dashboard values?

Because current invalidation is primarily TTL-based. Lower `DASHBOARD_CACHE_TTL` or add write-triggered invalidation for critical update paths.

### E.4 How to force clear cached data quickly?

Restart container/process. For full Redis-managed invalidation workflow, add cache-key delete hooks in write endpoints.
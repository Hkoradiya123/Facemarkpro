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
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

FaceMarkPro is a full-stack attendance system using facial recognition, Flask APIs, MongoDB storage, and a React faculty/admin UI.

This repository is prepared for Docker-only deployment and Hugging Face Spaces (Docker SDK) without Docker Compose.

## Key Capabilities

- Facial recognition attendance marking
- Faculty, student, and admin role flows
- Reports and analytics views
- Mobile-friendly dashboard widgets
- MongoDB-backed layout persistence for faculty widgets

## Dashboard Layout Persistence (MongoDB)

Faculty dashboard widget positions are saved in MongoDB collection `faculty_layouts` using:

- `desktop_layout` for desktop breakpoints (12-column layout)
- `mobile_layout` for mobile breakpoints (6-column layout)

Server-side logic now enforces:

- layout sanitization
- gravity compaction (fills empty gaps by moving widgets upward)
- separate compaction constraints for desktop and mobile

API endpoints:

- `GET /api/faculty/dashboard/layout`
- `POST /api/faculty/dashboard/layout`

## Architecture

- Backend: Flask (`backend/app`)
- Frontend: React + Vite (`frontend/src`)
- DB: MongoDB Atlas (via `MONGO_URI`)
- Container runtime: single Docker container
- Process model: Gunicorn serving Flask API and built frontend static files

## Docker-Only Local Run

No Docker Compose is required or used.

1. Build image from repository root:

```bash
docker build -t facemarkpro:latest .
```

2. Run container:

```bash
docker run --rm -p 7860:7860 \
	-e PORT=7860 \
	-e MONGO_URI="<your-mongodb-uri>" \
	-e MONGODB_DB="attendance_db" \
	-e SECRET_KEY="<your-secret>" \
	facemarkpro:latest
```

3. Open:

- `http://localhost:7860`

## Hugging Face Spaces Deployment (Docker SDK)

### 1. Create Space

- Create a new Space
- Choose **Docker** SDK
- Push this repository

### 2. Required Space Variables / Secrets

Set in Space Settings:

- `MONGO_URI` (secret)
- `MONGODB_DB` (variable, default `attendance_db`)
- `SECRET_KEY` (secret)

Optional:

- `BASE_DIR` (defaults to `/tmp` on Spaces)
- `INFERENCE_SERVICE_URL`
- `FACE_RECOGNITION_MODE`

### 3. Port

Space metadata already sets:

- `app_port: 7860`

Container command binds Gunicorn to `${PORT}` (defaults to `7860`).

### 4. Verification Checklist

- `GET /health` returns `200`
- Login works for faculty/admin/student
- Faculty dashboard loads widgets
- Drag/reposition widgets on desktop and mobile layouts
- Refresh page and verify layout is restored from MongoDB

## Important Files

- `Dockerfile`: multi-stage build (frontend build + backend runtime)
- `.dockerignore`: optimized build context
- `backend/app/__init__.py`: serves frontend dist and API routes
- `backend/app/routes/api_routes.py`: dashboard layout read/write + gravity compaction
- `frontend/src/pages/faculty/FacultyDashboard.jsx`: desktop/mobile layout logic and save flow

## Development Notes

- Vite proxy is for local development only
- Production/Hugging Face serves built frontend from Flask
- Do not use Docker Compose for this deployment model

## Security Notes

- Never commit real secrets in `.env`
- Use Space secrets for production
- Restrict MongoDB network access and credentials

## Troubleshooting

### Layout not saving

- Check Mongo URI and DB permissions
- Verify `faculty_layouts` collection exists/accessible
- Confirm `POST /api/faculty/dashboard/layout` returns success

### Frontend loads but APIs fail

- Ensure backend process is running in container logs
- Verify `MONGO_URI` is set correctly
- Check `GET /health` and `/api/auth/whoami`

### Space build fails

- Ensure repository has root-level `Dockerfile`
- Ensure dependencies install from `backend/requirements.txt`
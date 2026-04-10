# syntax=docker/dockerfile:1

FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=7860 \
    CACHE_TYPE=RedisCache \
    CACHE_REDIS_URL=redis://127.0.0.1:6379/0 \
    CACHE_DEFAULT_TIMEOUT=60 \
    DASHBOARD_CACHE_TTL=60 \
    REPORT_CACHE_TTL=120

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential g++ redis-server \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

COPY backend/ /app/backend/
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 7860

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["gunicorn", "--chdir", "/app/backend", "--bind", "0.0.0.0:7860", "--workers", "2", "--threads", "4", "--timeout", "120", "run:app"]

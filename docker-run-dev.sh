#!/bin/sh
# Runs the backend container with the local backend/ folder mounted in and
# gunicorn's --reload enabled, so Python edits take effect without rebuilding
# the image or restarting the container. Rebuild (docker build) only when
# backend/requirements.txt or the Dockerfile itself changes.
set -eu

docker run --rm -it -p 5000:7860 \
  --env-file .env \
  -v "$(pwd)/backend:/app/backend" \
  --name fmp-local \
  fmp-local \
  gunicorn --chdir /app/backend --bind 0.0.0.0:7860 --workers 2 --threads 4 --timeout 120 --reload run:app

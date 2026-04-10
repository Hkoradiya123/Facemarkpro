#!/bin/sh
set -eu

REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_BIND="${REDIS_BIND:-127.0.0.1}"

redis-server --bind "$REDIS_BIND" --port "$REDIS_PORT" --save "" --appendonly no --daemonize yes

exec "$@"
#!/bin/bash
set -e

echo "Running database migrations..."
poetry run alembic upgrade head

echo "Starting application..."
exec poetry run uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}

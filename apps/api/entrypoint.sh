#!/bin/sh

# Exit on error
set -e

echo "Waiting for database to be ready..."
# Simple loop to wait for postgres
RETRIES=10
until pg_isready -h db -p 5432 -U postgres || [ $RETRIES -eq 0 ]; do
  echo "Waiting for postgres... ($RETRIES retries left)"
  RETRIES=$((RETRIES-1))
  sleep 2
done

echo "Running database migrations..."
# Use a temporary file to capture alembic output for debugging if it fails
if ! alembic upgrade head > alembic_output.log 2>&1; then
    echo "Migration failed! Check alembic_output.log"
    cat alembic_output.log
    # Don't exit here, still try to start gunicorn so we can at least reach health checks
    # and see errors in the UI if possible
fi

echo "Starting server..."
# Using exec to replace shell with gunicorn process
exec gunicorn app.main:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000 \
    --access-logfile - \
    --error-logfile -

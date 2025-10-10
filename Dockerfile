# Use official Python runtime as base image
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy backend files
COPY backend/ ./backend/

# Install Poetry
RUN pip install --no-cache-dir poetry

# Install Python dependencies
WORKDIR /app/backend
RUN poetry config virtualenvs.create false \
    && poetry install --only main --no-interaction --no-ansi --no-root

# Expose port (Railway will set PORT env var)
EXPOSE 8000

# Start command - Railway sets PORT env var automatically
CMD ["sh", "-c", "poetry run uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]

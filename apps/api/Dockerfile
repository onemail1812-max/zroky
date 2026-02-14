
# Python 3.11 Slim
FROM python:3.11-slim

# Working Directory
WORKDIR /app

# System dependencies (gcc for building some python packages)
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Environment Variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Application Code
COPY . .

# Security: Run as non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser
USER appuser

# Expose Port
EXPOSE 8000

# Start Command (Production Gunicorn + Uvicorn Workers)
# Workers should be tuned (2-4 x CPU cores). Defaulting to 4 for general purpose.
CMD ["gunicorn", "app.main:app", "--workers", "4", "--worker-class", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000", "--access-logfile", "-", "--error-logfile", "-"]

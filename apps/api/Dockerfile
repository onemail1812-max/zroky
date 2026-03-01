
# Python 3.11 Slim
FROM python:3.11-slim

# Working Directory
WORKDIR /app

# System dependencies (gcc for building some python packages)
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    postgresql-client \
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

# Create logs directory and set permissions BEFORE switching user
RUN mkdir -p /app/logs && chmod 755 /app/logs

# Set execution permissions for entrypoint
RUN chmod +x entrypoint.sh

# Security: Run as non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser
RUN chown -R appuser:appuser /app
USER appuser

# Expose Port
EXPOSE 8000

# Start Command using Entrypoint (handles migrations)
ENTRYPOINT ["./entrypoint.sh"]

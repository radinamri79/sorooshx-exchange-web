# ============================================
# SorooshX Backend Dockerfile
# Multi-stage build for Django + Channels
# ============================================

# ============================================
# Stage 1: Base Python image
# ============================================
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONFAULTHANDLER=1

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# ============================================
# Stage 2: Dependencies
# ============================================
FROM base AS dependencies

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ============================================
# Stage 3: Development
# ============================================
FROM dependencies AS development

# Copy application code
COPY . .

# Copy and setup entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Create directories
RUN mkdir -p /app/media /app/staticfiles

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/health/ || exit 1

ENTRYPOINT ["/entrypoint.sh"]
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

# ============================================
# Stage 4: Production
# ============================================
FROM dependencies AS production

# Create non-root user
RUN addgroup --system --gid 1001 django && \
    adduser --system --uid 1001 --gid 1001 django

# Copy application code
COPY --chown=django:django . .

# Copy and setup entrypoint
COPY --chown=django:django entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Create directories
RUN mkdir -p /app/media /app/staticfiles && \
    chown -R django:django /app/media /app/staticfiles

USER django

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/health/ || exit 1

ENTRYPOINT ["/entrypoint.sh"]
# Use daphne for ASGI (WebSocket support)
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "config.asgi:application"]

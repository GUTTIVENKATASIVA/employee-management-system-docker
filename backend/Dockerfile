FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Run as an unprivileged user
RUN useradd --create-home --uid 10001 appuser

# Dependencies first so this layer is cached between code changes.
# requirements-dev.txt includes requirements.txt and adds pytest, so
# `docker compose exec backend pytest` works inside the container.
COPY requirements.txt requirements-dev.txt ./
RUN pip install -r requirements-dev.txt

COPY --chown=appuser:appuser . .
RUN chown appuser:appuser /app
USER appuser

EXPOSE 5000

# Bind to 0.0.0.0 so other containers (the nginx proxy) can reach Flask.
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--access-logfile", "-", "app:create_app()"]

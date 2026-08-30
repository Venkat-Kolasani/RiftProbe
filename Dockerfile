# RiftProbe demo API — used by Render (Docker runtime).
# Canonical copy also lives at infra/docker/Dockerfile.api.demo

FROM python:3.11-slim

WORKDIR /app

COPY apps/api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY apps/api /app/apps/api
COPY engine /app/engine
COPY demo /app/demo

ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

CMD ["sh", "-c", "uvicorn apps.api.standalone_demo_server:app --host 0.0.0.0 --port ${PORT:-8000}"]

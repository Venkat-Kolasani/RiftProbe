import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from apps.api.database import engine, get_redis_client
from apps.api.migrations import run_migrations

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Run migrations on startup if possible
    try:
        await run_migrations()
    except Exception as e:
        print(f"Warning: Migration on startup failed (DB might not be reachable yet): {e}")
    yield

app = FastAPI(
    title="RiftProbe API",
    description="Control plane for RiftProbe agent evaluation and failure mining",
    version="0.1.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    db_status = "unknown"
    redis_status = "unknown"
    
    # Check Postgres
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
            db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
        
    # Check Redis
    try:
        redis_client = get_redis_client()
        await redis_client.ping()
        redis_status = "healthy"
        await redis_client.aclose()
    except Exception as e:
        redis_status = f"unhealthy: {str(e)}"

    return {
        "status": "ok" if db_status == "healthy" and redis_status == "healthy" else "degraded",
        "service": "riftprobe-api",
        "version": "0.1.0",
        "dependencies": {
            "database": db_status,
            "redis": redis_status
        }
    }

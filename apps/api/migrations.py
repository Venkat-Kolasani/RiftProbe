import os
import glob
from sqlalchemy import text
from apps.api.database import engine

async def run_migrations():
    migrations_dir = os.path.join(os.path.dirname(__file__), "..", "..", "infra", "migrations")
    migration_files = sorted(glob.glob(os.path.join(migrations_dir, "*.sql")))
    
    async with engine.begin() as conn:
        # Create migration tracking table if not exists
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS schema_migrations (
                filename VARCHAR(255) PRIMARY KEY,
                applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """))
        
        # Check applied migrations
        result = await conn.execute(text("SELECT filename FROM schema_migrations;"))
        applied_migrations = {row[0] for row in result.fetchall()}
        
        for file_path in migration_files:
            filename = os.path.basename(file_path)
            if filename not in applied_migrations:
                print(f"Applying migration: {filename}")
                with open(file_path, "r") as f:
                    sql = f.read()
                await conn.execute(text(sql))
                await conn.execute(
                    text("INSERT INTO schema_migrations (filename) VALUES (:filename);"),
                    {"filename": filename}
                )
                print(f"Applied migration: {filename}")

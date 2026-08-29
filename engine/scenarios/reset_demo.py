import asyncio
import os
import glob
from sqlalchemy import text
from apps.api.database import engine, AsyncSessionLocal
from apps.api.models import Agent, AgentVersion, Scenario
from engine.scenarios.generator import generate_baseline_scenarios

async def reset_demo():
    print("Resetting RiftProbe demo state to known baseline...")
    
    async with engine.begin() as conn:
        # Drop and re-create schema tables
        await conn.execute(text("DROP TABLE IF EXISTS release_gate CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS regression_test CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS failure CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS evaluation CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS trace CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS run CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS scenario CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS agent_version CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS agent CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS schema_migrations CASCADE;"))

    # Re-run migrations
    migrations_dir = os.path.join(os.path.dirname(__file__), "..", "..", "infra", "migrations")
    migration_files = sorted(glob.glob(os.path.join(migrations_dir, "*.sql")))
    
    async with engine.begin() as conn:
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS schema_migrations (
                filename VARCHAR(255) PRIMARY KEY,
                applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """))
        for file_path in migration_files:
            filename = os.path.basename(file_path)
            print(f"Applying migration: {filename}")
            with open(file_path, "r") as f:
                sql = f.read()
            await conn.execute(text(sql))
            await conn.execute(
                text("INSERT INTO schema_migrations (filename) VALUES (:filename);"),
                {"filename": filename}
            )

    # Seed 20 baseline scenarios
    async with AsyncSessionLocal() as session:
        scenarios_data = generate_baseline_scenarios()
        for s in scenarios_data:
            scenario_model = Scenario(
                goal=s.goal,
                user_turns=s.user_turns,
                state_patch=s.state_patch,
                fault_injections=s.fault_injections,
                policy_context=s.policy_context,
                expected_invariants=s.expected_invariants,
                parent_failure_id=s.parent_failure_id
            )
            session.add(scenario_model)
        await session.commit()

    print("Demo state reset complete! System is clean and ready.")

if __name__ == "__main__":
    asyncio.run(reset_demo())

import asyncio
from sqlalchemy import select, delete
from apps.api.database import AsyncSessionLocal, engine
from apps.api.models import Scenario
from engine.scenarios.generator import generate_baseline_scenarios

async def seed_baseline_scenarios():
    scenarios_data = generate_baseline_scenarios()
    print(f"Generated {len(scenarios_data)} baseline scenarios.")

    async with AsyncSessionLocal() as session:
        # Save scenarios
        created_count = 0
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
            created_count += 1

        await session.commit()
        print(f"Successfully seeded {created_count} baseline scenarios into Postgres.")

if __name__ == "__main__":
    asyncio.run(seed_baseline_scenarios())

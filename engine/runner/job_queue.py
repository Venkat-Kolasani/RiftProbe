import json
from typing import Dict, Any, Optional

QUEUE_NAME = "riftprobe_scenario_queue"

class ScenarioQueue:
    def __init__(self, redis_client: Optional[Any] = None):
        if redis_client:
            self.client = redis_client
        else:
            from apps.api.database import get_redis_client
            self.client = get_redis_client()

    async def enqueue_scenario(self, run_id: str, scenario_id: str, version_label: str):
        payload = {
            "run_id": run_id,
            "scenario_id": scenario_id,
            "version_label": version_label
        }
        await self.client.rpush(QUEUE_NAME, json.dumps(payload))

    async def dequeue_scenario(self, timeout: int = 1) -> Optional[Dict[str, Any]]:
        res = await self.client.blpop(QUEUE_NAME, timeout=timeout)
        if res:
            _, item = res
            return json.loads(item)
        return None

    async def queue_length(self) -> int:
        return await self.client.llen(QUEUE_NAME)

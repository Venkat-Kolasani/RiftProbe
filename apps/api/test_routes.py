import asyncio
import httpx

async def test_api_routes():
    print("Testing FastAPI control plane routes...")
    async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
        # Check health
        h = await client.get("/health")
        print("GET /health:", h.status_code, h.json())

if __name__ == "__main__":
    asyncio.run(test_api_routes())

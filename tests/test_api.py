import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from apps.api.main import app
from apps.api.database import get_db

client = TestClient(app)

def test_health_check_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["service"] == "riftprobe-api"

def test_runs_endpoint_404():
    mock_session = MagicMock()
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = None
    mock_res.scalars.return_value.all.return_value = []
    
    async def async_execute(*args, **kwargs):
        return mock_res
    
    mock_session.execute = async_execute
    app.dependency_overrides[get_db] = lambda: mock_session

    response = client.get("/v1/runs/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 404
    app.dependency_overrides.clear()

def test_failures_endpoint_404():
    mock_session = MagicMock()
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = None
    
    async def async_execute(*args, **kwargs):
        return mock_res

    mock_session.execute = async_execute
    app.dependency_overrides[get_db] = lambda: mock_session

    response = client.post("/v1/failures/00000000-0000-0000-0000-000000000000/mutate", json={"count": 5})
    assert response.status_code == 404
    app.dependency_overrides.clear()

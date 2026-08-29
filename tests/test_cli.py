import pytest
from unittest.mock import patch, MagicMock
from apps.cli.main import init_cmd, run_cmd, release_check_cmd

@patch("httpx.get")
def test_cli_init(mock_get):
    mock_res = MagicMock()
    mock_res.status_code = 200
    mock_res.json.return_value = {"status": "ok"}
    mock_get.return_value = mock_res

    args = MagicMock()
    init_cmd(args)
    mock_get.assert_called_once()

@patch("httpx.post")
def test_cli_run(mock_post):
    mock_res = MagicMock()
    mock_res.status_code = 201
    mock_res.json.return_value = {"run_id": "r1", "scenarios_count": 20}
    mock_post.return_value = mock_res

    args = MagicMock()
    args.version = "v1.0"
    run_cmd(args)
    mock_post.assert_called_once()

@patch("httpx.post")
def test_cli_release_check(mock_post):
    mock_res = MagicMock()
    mock_res.status_code = 200
    mock_res.json.return_value = {"verdict": "BLOCK", "reason": "Failing test", "summary": {}}
    mock_post.return_value = mock_res

    args = MagicMock()
    args.version = "v1.0"
    release_check_cmd(args)
    mock_post.assert_called_once()

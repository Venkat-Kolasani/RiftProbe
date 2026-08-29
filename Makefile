.PHONY: demo test up down build

demo:
	PYTHONPATH=. ./venv/bin/python engine/scenarios/run_demo_path.py

test:
	PYTHONPATH=. ./venv/bin/pytest -v tests/

up:
	docker compose up --build -d

down:
	docker compose down -v

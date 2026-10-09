# Loop

Loop is a web app that helps freshers prepare for DSA interviews.

- **Revise old problems** with a round robin queue, so every solved problem comes back about once every 30 days.
- **Pick the right new problems** with a priority score (fresher topics, target company, famous lists, design problems, new patterns).
- **Stay motivated** with XP, levels, streaks, badges and a Daily Byte (a code snippet or DSA fact).

> Work in progress. Features are built one at a time (see `PLAN.md`).

## Tech stack

- Backend: Python, FastAPI, PostgreSQL, SQLAlchemy, Alembic, JWT, pytest
- Frontend: React, Vite, TypeScript, Tailwind CSS
- Local run: docker-compose

## Run locally

### Option 1: Docker (easiest)

```bash
docker compose up --build
```

Open http://localhost:8000/health. You should see `{"status": "ok"}`.
API docs are at http://localhost:8000/docs.

### Option 2: Python on your machine

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Mac / Linux
pip install -r requirements.txt
copy .env.example .env         # Windows (use cp on Mac / Linux)
uvicorn app.main:app --reload
```

To start only the database with Docker: `docker compose up db`.

## Run tests

```bash
cd backend
pytest
```

## Project structure

```
backend/
  app/        FastAPI app (routers, models, schemas, services, core)
  data/       problem_bank.csv, my_solved.csv
  scripts/    CSV import scripts
  alembic/    database migrations
  tests/      pytest tests
frontend/     React app (later)
```

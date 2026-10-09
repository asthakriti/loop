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

This starts Postgres, creates the tables (Alembic migration), then starts the API.

Open http://localhost:8000/health. You should see `{"status": "ok"}`.
API docs are at http://localhost:8000/docs.

The Docker database is on port **5433** on your machine (not 5432), so it does not clash with a Postgres you may have installed locally.

### Option 2: Python on your machine

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Mac / Linux
pip install -r requirements.txt
copy .env.example .env         # Windows (use cp on Mac / Linux)
docker compose up -d db        # start only the database
alembic upgrade head           # create the tables
uvicorn app.main:app --reload
```

### Database migrations

```bash
alembic upgrade head                              # apply all migrations
alembic revision --autogenerate -m "what changed" # after editing a model
```

## Load the problem bank

Loads the 278 problems from `backend/data/problem_bank.csv`. Safe to run again (it updates, never duplicates).

```bash
docker compose exec backend python -m scripts.import_bank   # with Docker
python -m scripts.import_bank                               # or from the backend folder
```

## Try login

1. Open http://localhost:8000/docs.
2. `POST /auth/register` with `{"email": "you@example.com", "password": "atleast8chars"}`.
3. `POST /auth/login` with the same body. Copy the `access_token`.
4. Click **Authorize** (top right), paste the token, then try `GET /auth/me`.
5. Try `GET /bank` with filters like `pattern=Design`, `company=Amazon`, `difficulty=Easy`, `q=sum`.

Set your own long random `JWT_SECRET` in `.env` before deploying.

## Run tests

Tests need the Docker database running (`docker compose up -d db`).
They create their own `loop_test` database, so your real data is never touched.

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

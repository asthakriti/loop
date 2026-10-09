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

## Import your solved problems

Register first, then load `backend/data/my_solved.csv` into your list.
Imported problems go straight into the revision line. Problems you already have are skipped.

```bash
docker compose exec backend python -m scripts.import_my_solved you@example.com
```

Or upload the CSV with `POST /my/problems/import` in http://localhost:8000/docs.

## Try login

1. Open http://localhost:8000/docs.
2. `POST /auth/register` with `{"email": "you@example.com", "password": "atleast8chars"}`.
3. `POST /auth/login` with the same body. Copy the `access_token`.
4. Click **Authorize** (top right), paste the token, then try `GET /auth/me`.
5. Try `GET /bank` with filters like `pattern=Design`, `company=Amazon`, `difficulty=Easy`, `q=sum`.
6. Try `POST /my/problems` with `{"slug": "two-sum"}`, then `GET /my/problems`.
7. Try `GET /today`, then clear a problem with `POST /my/problems/{id}/done` and `{"section": "loop"}`.
8. Try `PUT /settings` with `{"round_days": 60}` and see `GET /today` give fewer problems per day.
9. Try `GET /suggest?limit=5`. Set `{"target_company": "Amazon"}` in settings and try again.
10. Try `GET /me/progress` for XP, level, streak and this week.
11. Try `GET /badges`. A `done` response lists any badge it just unlocked in `new_badges`.

## XP, levels and streak

- Clearing a problem gives XP: Warm-up +10, The Loop +15, New quest +30.
- 10 levels, from Beginner (0 XP) to Interview Ready (2400 XP).
- Clear **every** quest of the day to grow your streak. Miss a day and it starts again (your best streak is kept).
- 7 badges: Century (100 solved), Double Century (200), Full circle (whole line revised once), Builder (first design problem), Explorer (first Graphs problem), On fire (7-day streak), Unstoppable (30-day streak).

## How the round robin works

All your solved problems wait in one line, ordered by the date you last revised them
(never revised first, then oldest). Each day Loop takes `ceil(problems / round_days)` from the front.
When you clear one, its date becomes today, so it goes to the back of the line.
With 164 problems and a 30 day round, that is 6 a day, and each problem comes back about once a month.
Missed a day? Nothing is lost. The line just waits.

## How new problems are picked

Every unsolved problem in the bank gets a score:

| Rule | Points |
|---|---|
| Fresher topic (Arrays, Strings, Hashing, Binary Search, Sorting) | +3 |
| Your target company asks it | +3 |
| In 2 or more famous lists (Blind 75, NeetCode 150, ...) | +2 |
| Easy or Medium | +2 |
| Design problem | +3 |
| You solved fewer than 3 in this pattern | +2 |
| Hard | -2 |

Highest score first (max 15, shown as "Priority X/10"). The reasons are shown as tags.

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

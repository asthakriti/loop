# Loop — DSA Prep App: Build Plan

This file is the full plan. Build it **one feature at a time**, in the order below.
After each feature: test it, commit it, push it to GitHub, then **stop and wait** for the owner to say "next".

---

## 1. What we are building

Loop is a web app that helps a fresher prepare for DSA interviews. It does three things:

1. **Revise old problems** using a round robin queue, so every solved problem comes back about once every 30 days.
2. **Suggest the right new problems** using a priority score (fresher topics, target company, famous lists, design problems, uncovered patterns).
3. **Keep the user motivated** with XP, levels, streaks, badges, a Daily Byte (code snippet or DSA fact) and a real-life use for every problem.

### A day in the app
The **Today** page shows three sections:
- **Warm-up**: problems solved yesterday, revised once (+10 XP each)
- **The Loop**: the next round robin problems (+15 XP each)
- **New quests**: top unsolved problems by priority (+30 XP each)

Each problem shows a link to LeetCode, a 1-line note, and an "In real life" box.
Clicking **Clear it** gives XP and moves the problem to the back of the line.

---

## 2. Tech stack

| Part | Tool |
|---|---|
| Backend | Python 3.11+, FastAPI |
| Database | PostgreSQL + SQLAlchemy 2.x |
| Migrations | Alembic |
| Auth | JWT (python-jose) + passlib[bcrypt] |
| Validation | Pydantic v2 + pydantic-settings |
| Tests | pytest (+ httpx TestClient) |
| Frontend | React + Vite + TypeScript + Tailwind CSS |
| Run locally | docker-compose (Postgres + backend) |
| Deploy | Backend: Render or Railway. Frontend: Vercel |

The owner already built an e-commerce backend with FastAPI + PostgreSQL + JWT + Alembic + pytest + Docker.
Follow the same style (routers / models / schemas / services) so the code feels familiar.

---

## 3. Folder structure

```
loop/
  backend/
    app/
      main.py
      config.py          (settings from .env)
      database.py        (engine, SessionLocal, Base, get_db)
      models/            (one file per table)
      schemas/           (Pydantic models)
      routers/           (auth, bank, my_problems, today, byte, progress, patterns, stats, settings)
      services/
        queue.py         (round robin)
        priority.py      (priority score)
        xp.py            (XP, levels, streak)
        badges.py        (badge rules)
        byte.py          (Daily Byte)
        importer.py      (CSV loaders)
      core/
        security.py      (hashing, JWT)
        deps.py          (get_current_user)
    data/
      problem_bank.csv   (given — 278 problems)
      my_solved.csv      (given — owner's 164 solved problems)
      daily_bytes.csv    (created in Feature 10)
    scripts/
      import_bank.py
      import_my_solved.py
      import_bytes.py
    alembic/
    tests/
    requirements.txt
    dockerfile
    .env.example
  frontend/
    src/
      api/               (fetch client + one file per resource)
      components/        (QuestRow, DailyByte, XpBar, StreakWeek, BadgeCard, RealLifeBox, Nav ...)
      pages/             (Login, Today, MyProblems, Bank, Patterns, Settings)
      theme/             (colors, fonts)
    index.html
    package.json
    tailwind.config.js
  docker-compose.yml
  README.md
  PLAN.md
  CLAUDE.md
```

---

## 4. Data files (already made)

Put both files in `backend/data/`.

### problem_bank.csv (278 rows)
Columns:
`id, title, slug, link, topic, pattern, difficulty, companies, sources, is_design, real_life`

- `slug` is the LeetCode slug and is **unique**. It is the key used to join everything.
- `pattern` is one of: Arrays, Strings, Hashing, Two Pointers, Sliding Window, Binary Search, Sorting, Linked List, Stack / Queue, Recursion, Trees, Graphs, Heap, Basic DP, Design, Greedy, Bit Manipulation
- `difficulty`: Easy / Medium / Hard
- `companies`: comma-separated, e.g. "Amazon, Google" (estimates, not official)
- `sources`: comma-separated from Blind 75, NeetCode 150, Striver SDE, Fresher classic
- `is_design`: true / false (build a data structure from scratch)
- `real_life`: one sentence, where this problem is used in real apps

### my_solved.csv (164 rows)
Columns: `slug, title, link, difficulty, in_bank, pattern`

- `in_bank = true` → the problem exists in problem_bank.csv (153 rows)
- `in_bank = false` → contest/other problem (11 rows). Import these as **custom** problems in the bank (`is_custom = true`, pattern "Contest / other", real_life empty).

---

## 5. Database tables

**users**
- id (pk), email (unique), password_hash, created_at

**problem_bank**
- id (pk), title, slug (unique, indexed), link, topic, pattern, difficulty,
  companies (text), sources (text), is_design (bool), is_custom (bool, default false), real_life (text, nullable)

**user_problems**
- id (pk), user_id (fk), problem_id (fk → problem_bank)
- status: `new` | `in_queue` | `retired`
- solved_on (date), last_revised_on (date, nullable), times_revised (int, default 0)
- notes (text, nullable) — the user's 1-line trick
- unique (user_id, problem_id)

**revisions**
- id (pk), user_problem_id (fk), revised_on (date), section (`warmup` | `loop` | `new`), xp_earned (int)

**user_stats**
- user_id (pk, fk), total_xp (int), current_streak (int), best_streak (int), last_streak_day (date, nullable)

**badges**
- id (pk), code (unique), name, description

**user_badges**
- user_id, badge_id, unlocked_on — unique (user_id, badge_id)

**daily_bytes**
- id (pk), type (`code` | `fact`), title, content (text), why_it_matters (text), topic

**settings**
- user_id (pk, fk), round_days (default 30), max_daily (default 10), new_per_day (default 2), target_company (nullable, e.g. "Amazon")

---

## 6. Core logic (write these as plain functions in `services/`, with tests)

### 6.1 Round robin — `services/queue.py`

**Warm-up list** = user_problems with `status = new` and `solved_on < today`.

**Daily count** = `ceil(number of in_queue problems / round_days)`.
- Example: 164 problems, 30 days → 6 per day.
- If daily count > max_daily → still return the list, and also return a `warning` string:
  "Too many problems today. Make the round longer or retire easy problems."

**Loop list** = `in_queue` problems sorted by `last_revised_on` ascending (NULL first, then oldest), then by `id`; take the first *daily count*.
- Problems already revised **today** must not appear again today.

**Mark done**
- `last_revised_on = today`, `times_revised += 1`, `status = in_queue` (if it was `new`)
- add a row to `revisions` with the section and XP
- the problem now goes to the back of the line automatically (because its date is the newest)

**Retire** → `status = retired` (never shown again in the loop).

**Missed days**: nothing special. The line simply waits. Nothing is lost.

**When a new problem is solved today** → create a user_problem with `status = new`, `solved_on = today`. It shows in Warm-up tomorrow, then joins the line.

### 6.2 Priority score — `services/priority.py`

Only for bank problems the user has **not** solved (no user_problems row).

| Rule | Points |
|---|---|
| pattern in (Arrays, Strings, Hashing, Binary Search, Sorting) — fresher topics | +3 |
| `target_company` appears in `companies` | +3 |
| in 2 or more sources | +2 |
| difficulty Easy or Medium | +2 |
| is_design = true | +3 |
| the user has solved fewer than 3 problems with this pattern | +2 |
| difficulty Hard | −2 |

- Sort by score (desc), then Easy before Medium before Hard, then id.
- `/suggest` returns the top N with the score **and the list of reasons** (e.g. ["Design", "Amazon", "Blind 75", "New pattern"]) so the UI can show tags.
- Max possible score is 15. The UI shows "Priority X/10" by scaling: `round(score / 15 * 10)` (min 1).

### 6.3 XP, levels, streak — `services/xp.py`

**XP per problem**: warmup +10, loop +15, new +30.

**Levels** (total XP needed):

| Level | XP | Name |
|---|---|---|
| 1 | 0 | Beginner |
| 2 | 100 | Starter |
| 3 | 250 | Explorer |
| 4 | 450 | Builder |
| 5 | 700 | Problem Solver |
| 6 | 950 | Pattern Seeker |
| 7 | 1200 | Pattern Hunter |
| 8 | 1500 | Algorithm Ace |
| 9 | 1900 | Code Warrior |
| 10 | 2400 | Interview Ready |

**Streak**
- When every item in today's list is done → if `last_streak_day == yesterday` then `current_streak += 1`, else `current_streak = 1`. Set `last_streak_day = today`. Update `best_streak`.
- Only count once per day.
- If the user misses a day, the streak shows 0 next time (computed: `last_streak_day < yesterday` → 0). `best_streak` is kept.
- Week view: for the current week (Mon–Sun) return which days had a completed streak day (use `revisions` + streak days; store streak days in a small table `streak_days(user_id, day)` if simpler).

### 6.4 Badges — `services/badges.py`

Seed these rows. Check rules after every "done". Each badge unlocks only once.

| code | name | rule |
|---|---|---|
| century | Century | 100 problems in user_problems |
| double_century | Double Century | 200 problems in user_problems |
| full_circle | Full circle | every in_queue problem revised at least once since the user started (first full round) |
| builder | Builder | first is_design problem solved |
| explorer | Explorer | first Graphs problem solved |
| on_fire | On fire | 7-day streak |
| unstoppable | Unstoppable | 30-day streak |

`done` responses return any newly unlocked badges so the UI can celebrate.

### 6.5 Daily Byte — `services/byte.py`

- `daily_bytes.csv` has short code snippets and facts (start with 30: 15 code, 15 fact).
- Today's byte index = `(today - date(2026, 1, 1)).days % total` — same byte all day, next one tomorrow (round robin again).
- Also allow `/byte/today?type=code` or `type=fact` (pick within that type the same way).
- **Facts must be true.** Only include facts you are sure about (e.g. Python's `sort()` uses Timsort by Tim Peters, 2002; Dijkstra designed his shortest-path algorithm in about 20 minutes in 1956).

### 6.6 Patterns and stats

- Pattern checklist: the 15 main patterns in this order: Arrays, Strings, Hashing, Two Pointers, Sliding Window, Binary Search, Sorting, Linked List, Stack / Queue, Recursion, Trees, Graphs, Heap, Basic DP, Design.
- A pattern is **covered** when the user has solved 3+ problems in it. Return solved count, total in bank, status (covered / in progress / not started), and the next suggested problem for that pattern.
- Stats: solved per pattern, total solved, round progress (`round number`, `revised this round / total in queue`), milestones (next of 100, 200, 300 …).

---

## 7. API

All routes except auth need `Authorization: Bearer <token>`.

**Auth**
- `POST /auth/register` — email, password → user
- `POST /auth/login` — email, password → access token
- `GET /auth/me`

**Problem bank**
- `GET /bank` — filters: `pattern`, `difficulty`, `company`, `is_design`, `solved` (true/false), `q` (search title); pagination
- `GET /bank/{slug}`

**My problems**
- `POST /my/problems` — body `{slug}` (bank problem) or `{title, link, difficulty, pattern}` (custom). Status `new`, solved today.
- `POST /my/problems/import` — upload `my_solved.csv`; imported rows go **straight into the line** (`status = in_queue`, `last_revised_on = NULL`)
- `GET /my/problems` — filters: pattern, status, difficulty, q
- `PUT /my/problems/{id}` — edit notes
- `DELETE /my/problems/{id}`
- `POST /my/problems/{id}/done` — body `{section}` → returns `{xp_earned, total_xp, level, streak, new_badges}`
- `POST /my/problems/{id}/retire`

**Today**
- `GET /today` → `{ warmup: [...], loop: [...], new: [...], daily_count, warning, done_count, total_count, xp_today }`
  Each item: id, title, link, pattern, difficulty, notes, real_life, last_revised_on, done_today, xp.

**Suggest**
- `GET /suggest?limit=2` → top unsolved bank problems with score, scaled score, reasons, real_life

**Daily Byte**
- `GET /byte/today?type=code|fact`

**Progress**
- `GET /me/progress` → total_xp, level, level_name, next_level_xp, current_streak, best_streak, week (7 days with done true/false), round info
- `GET /badges` → all badges with unlocked true/false and date

**Patterns & stats**
- `GET /patterns`
- `GET /stats`

**Settings**
- `GET /settings`, `PUT /settings`

---

## 8. UI design (match this look)

Dark, calm, a little playful — like a game for studying.

**Colors**
| Token | Hex | Use |
|---|---|---|
| bg | #12141A | page background (with a faint dot grid: radial-gradient #1E222C 1px, 24px) |
| surface | #1A1D25 | cards |
| surface-2 | #1F232D | active nav item, unlocked badge |
| border | #242833 / #2A2E3A | card borders |
| text | #ECEEF3 | main text |
| muted | #9AA1B2 | secondary text |
| accent | #C6F36B | lime — main buttons, logo, progress |
| lavender | #A99BFF | XP, level, The Loop section |
| amber | #F5C46B | streak, Warm-up section, Medium |
| mint | #7EE0B5 | patterns covered, Easy |
| coral | #FF8A80 | Hard |
| sky | #7FD3F5 | "In real life" box (bg #15202A, border #1F3340) |
| byte-bg | #16141F | Daily Byte card (border #2E2A47, code area #0E0D14) |

**Fonts** (Google Fonts): Space Grotesk (headings, numbers), IBM Plex Sans (body), JetBrains Mono (code, small labels, XP numbers).

**Shapes**: cards radius 18–20px, buttons radius 12px, buttons at least 44px tall, pills radius 999px.

**Today page layout (desktop, max width 1200px)**
1. Top nav: lime square logo with a loop icon + "Loop"; links Today / My problems / Problem bank / Patterns / Settings; an XP pill and an avatar button on the right.
2. Hero (two columns):
   - Left: date in small mono caps, big heading "Keep the loop going.", line "X of Y quests cleared today. <cheer>"; a level card (lavender square "LVL 7", name, XP bar, "N XP to Level 8"); a streak card (flame icon, "12-day streak", "Best ever: 19", 7 day boxes M–S, today outlined).
   - Right: **Daily Byte** card with Code / Fact tabs, title, tagline, code with line numbers (comments dimmer), "Why it matters" line, footer with "A new byte every morning" and a Next button.
3. A strip: quote "You don't forget what you keep coming back to." and "N / 160 XP today". When everything is done, show a green "+XP — All quests cleared" banner instead.
4. Main column: **Warm-up**, **The Loop**, **New quests** sections. Each section header has a colored icon tile, title, small subtitle, and "+XP each" on the right.
   - Row: title, topic pill, difficulty in its color, "Last seen N days ago", mono note "↳ trick", the sky "In real life" box, a ↗ link button (44×44) and a lime "Clear it" button. Done rows fade to 50% and show "✓ +15 XP".
   - New quest cards: "Priority 10/10" pill, difficulty, big title, why line, real-life box, reason tags, Open + "Solved it" buttons.
5. Side column: Next milestone card (e.g. "200 solved, 36 to go"), Badges grid (2 columns, locked ones faded), Pattern gaps (bars out of 3) with "See all".

**Phone (≤ 640px)**: one column; hero cards stack; sections stack; a bottom tab bar (Today, Problems, Patterns, Settings).

Accessibility: real `<button>` and `<a>` elements, icon-only buttons need `aria-label`, text contrast at least 4.5:1.

---

## 9. Features — build in this order (one push each)

For **every** feature:
1. Create a branch `feature/<number>-<short-name>` from `main`.
2. Build only what that feature lists.
3. Write / update tests. Run them. All must pass.
4. Update README if something new needs setup.
5. Commit with the message given, push the branch, merge into `main`, push `main`.
6. Tell the owner what was built and how to try it. **Stop and wait for "next".**

---

### Feature 0 — Project setup
- Create the folder structure from section 3 (empty packages are fine).
- `docker-compose.yml` with Postgres 16 + backend service; `.env.example` (DATABASE_URL, JWT_SECRET, JWT_EXPIRE_MINUTES).
- FastAPI app with `GET /health` → `{"status": "ok"}`.
- `.gitignore` (venv, __pycache__, .env, node_modules, dist).
- README: what Loop is, how to run locally.
- Copy `problem_bank.csv` and `my_solved.csv` into `backend/data/`.
- Create the GitHub repo `loop` (ask the owner if it should be public or private) and push.
- Test: `pytest` runs a health check test.
- Commit: `feat: project setup with FastAPI, Postgres and docker-compose`

### Feature 1 — Database tables
- SQLAlchemy models for every table in section 5.
- First Alembic migration.
- Seed the badges table (section 6.4) in the migration or a seed script.
- Test: migration runs on a fresh database; models can insert and read a row.
- Commit: `feat: database models and first migration`

### Feature 2 — Login (JWT)
- Register, login, `/auth/me`, password hashing, `get_current_user` dependency.
- Create default `settings` and `user_stats` rows when a user registers.
- Tests: register, login, wrong password, protected route without token → 401.
- Commit: `feat: user register and login with JWT`

### Feature 3 — Problem bank import + API
- `scripts/import_bank.py` loads `problem_bank.csv` (upsert by slug, safe to run twice).
- `GET /bank` with filters and pagination, `GET /bank/{slug}`.
- Tests: import count is 278; running twice does not duplicate; filters work.
- Commit: `feat: problem bank import and browse API`

### Feature 4 — My problems
- Add, list, edit notes, delete.
- `POST /my/problems/import` for `my_solved.csv` (+ `scripts/import_my_solved.py`). Rows with `in_bank = false` become custom bank problems. Imported rows → `in_queue`, `last_revised_on = NULL`.
- Tests: importing the file gives 164 user problems; custom ones are created; duplicates are skipped.
- Commit: `feat: my problems CRUD and solved list import`

### Feature 5 — Round robin (the core)
- `services/queue.py` exactly as section 6.1.
- `GET /today` (warmup + loop only for now), `POST /my/problems/{id}/done`, `POST /my/problems/{id}/retire`.
- Tests (use fixed dates, no real clock):
  - 10 problems, round_days 5 → 2 per day
  - 164 problems, round_days 30 → 6 per day
  - a done problem goes to the back of the line
  - a problem done today is not shown again today
  - a new problem appears in warm-up tomorrow, then joins the line
  - skipping a day loses nothing
  - warning appears when daily count > max_daily
- Commit: `feat: round robin revision queue`

### Feature 6 — Settings
- `GET /settings`, `PUT /settings` (validate: round_days 7–90, max_daily 1–30, new_per_day 0–5).
- `/today` uses the user's settings.
- Tests: changing round_days changes the daily count.
- Commit: `feat: user settings`

### Feature 7 — Priority suggestions
- `services/priority.py` as section 6.2, with reasons.
- `GET /suggest`; `/today` now includes `new` (top `new_per_day`).
- "Solved it" on a new quest = `POST /my/problems` + mark it done with section `new` (+30 XP once XP exists).
- Tests: solved problems are never suggested; target company adds points; design adds points; Hard gets lower; uncovered pattern adds points.
- Commit: `feat: priority engine for new problem suggestions`

### Feature 8 — XP, levels, streak
- `services/xp.py` as section 6.3. `done` now returns XP, level and streak.
- `GET /me/progress` with week view.
- Tests: XP per section; level changes at 1200 and 1500; streak +1 only when all done; resets after a missed day; best streak kept; counted once per day.
- Commit: `feat: XP, levels and streaks`

### Feature 9 — Badges
- `services/badges.py` as section 6.4; `GET /badges`; `done` returns new badges.
- Tests: each badge unlocks once; Century at 100.
- Commit: `feat: badges`

### Feature 10 — Daily Byte
- Create `backend/data/daily_bytes.csv` with 30 entries (15 code in Python, 15 facts). Code snippets under 12 lines, each with a "why it matters" line. Facts must be accurate.
- `scripts/import_bytes.py`, `GET /byte/today`.
- Tests: same byte all day; a different one tomorrow; type filter works.
- Commit: `feat: daily byte (code snippet or DSA fact)`

### Feature 11 — Patterns and stats
- `GET /patterns`, `GET /stats` as section 6.6.
- Tests: a pattern with 3 solved is "covered"; next suggestion is unsolved.
- Commit: `feat: pattern checklist and stats`

### Feature 12 — Frontend setup
- React + Vite + TypeScript + Tailwind in `frontend/`.
- Theme tokens and fonts from section 8. App layout with the top nav.
- API client with the JWT token; Login / Register page; protected routes.
- Commit: `feat: frontend setup, theme and login page`

### Feature 13 — Today page
- Build the Today page exactly as section 8 describes, using `/today`, `/me/progress`, `/byte/today`, `/badges`, `/patterns`, `/stats`.
- "Clear it" calls `done`, updates XP and progress without a full reload, and shows a small toast for XP and new badges.
- Commit: `feat: today page with quests, XP, streak and daily byte`

### Feature 14 — My Problems and Problem Bank pages
- My Problems: table with search, filters, inline notes edit, retire/delete, CSV import button.
- Problem Bank: list sorted by priority, filter by pattern/company/difficulty/design, "Solved" mark, "Add to my problems" button.
- Commit: `feat: my problems and problem bank pages`

### Feature 15 — Patterns and Settings pages + phone layout
- Patterns page: 15 pattern cards with 3-dot progress, solved-by-topic bars, target company card, suggested next problem.
- Settings page: round days, daily limit, new per day, target company.
- Make every page work on a phone (bottom tab bar).
- Commit: `feat: patterns and settings pages, mobile layout`

### Feature 16 — Deploy
- Production dockerfile; deploy backend (Render/Railway) with a managed Postgres; deploy frontend (Vercel) with the API URL env variable.
- README: screenshots, live link, features, tech stack, how the round robin and priority work.
- Commit: `docs: deploy and final README`

---

## 10. Later ideas (not now)
- Daily email or Telegram reminder with today's quests
- Auto-sync solved problems from LeetCode
- Mock test mode with a timer
- Friends leaderboard

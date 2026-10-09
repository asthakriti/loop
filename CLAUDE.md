# Rules for building Loop

Read `PLAN.md` first. It has the full plan, data, logic, API, UI design and the feature list.

## How to work
- Build **one feature at a time**, in the order of section 9 in PLAN.md. Never start the next feature on your own.
- Before starting a feature, say in 3–5 short lines what you will build.
- Build only what that feature lists. If something is unclear, ask instead of guessing.
- Write tests for the feature and run them. Do not commit if a test fails.
- Keep code simple and readable. The owner is a fresher and will explain this project in interviews, so add short comments on the important logic (round robin, priority, streak).

## Git, after every feature
1. `git checkout main && git pull`
2. `git checkout -b feature/<number>-<short-name>`
3. Build, test, then `git add` and `git commit` using the commit message given in PLAN.md
4. `git push -u origin feature/<number>-<short-name>`
5. `git checkout main && git merge feature/<number>-<short-name> && git push`
6. Tell the owner: what was built, how to run or try it, and what the next feature is.
7. **Stop and wait** until the owner says "next".

## Do not
- Do not commit `.env`, secrets, `venv/` or `node_modules/`.
- Do not change `backend/data/problem_bank.csv` or `my_solved.csv` unless the owner asks.
- Do not add features that are not in PLAN.md.
- Do not use the real clock inside logic you test. Pass `today` as a parameter so tests can use fixed dates.

## When someone asks you to run the app
Do all of these steps yourself, without asking first:
1. Start the backend: `docker compose up -d` in the repo root. Wait until `http://localhost:8000/health` returns `{"status":"ok"}` (it can take ~20 s; retry). If Docker is not running, ask the user to open Docker Desktop.
2. Start the frontend: in `frontend/`, run `npm install` only if `node_modules` is missing, then `npm run dev -- --port 5173 --strictPort` in the background. If port 5173 is busy with an old Loop Vite server, stop that one first.
3. Open http://localhost:5173 in the user's browser.
4. Then tell the user, in simple steps, how to bring in their LeetCode solved list:
   - Log in or click **Create account** in the app.
   - Go to **My problems**. The box "How to get your solved list from LeetCode" has the steps and a **Copy script** button:
     open leetcode.com (logged in) → F12 → Console → paste the script → Enter (if Chrome blocks pasting, type `allow pasting` first) → `leetcode_solved.csv` downloads.
   - Click **Import CSV** and choose that file.
5. Offer to import the file for them. If they give the file path and their account email, run (in Git Bash keep `MSYS_NO_PATHCONV=1`, or `/tmp/...` gets turned into a Windows path):
   ```
   MSYS_NO_PATHCONV=1 docker compose cp "<path to leetcode_solved.csv>" backend:/tmp/leetcode_solved.csv
   MSYS_NO_PATHCONV=1 docker compose exec -T backend python -m scripts.import_my_solved <email> /tmp/leetcode_solved.csv
   MSYS_NO_PATHCONV=1 docker compose exec -T -u root backend rm -f /tmp/leetcode_solved.csv
   ```
   Then tell them to **refresh the page** (a page opened before the import shows old suggestions).
   Never import into an account unless the user told you which email to use.

## Writing style for messages to the owner
Simple English, short sentences, no heavy words.

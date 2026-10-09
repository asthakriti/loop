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

## Writing style for messages to the owner
Simple English, short sentences, no heavy words.

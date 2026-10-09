import csv
import re
from datetime import date
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import DailyByte, ProblemBank, UserProblem

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
BANK_CSV = DATA_DIR / "problem_bank.csv"
MY_SOLVED_CSV = DATA_DIR / "my_solved.csv"
BYTES_CSV = DATA_DIR / "daily_bytes.csv"
DIFFICULTIES = {"easy": "Easy", "medium": "Medium", "hard": "Hard"}
CUSTOM_PATTERN = "Contest / other"

# CSV columns that are copied straight into the problem_bank table.
BANK_FIELDS = ["title", "link", "topic", "pattern", "difficulty", "companies", "sources", "real_life"]


def _to_bool(value: str) -> bool:
    return value.strip().lower() == "true"


def import_bank(db: Session, csv_path: Path = BANK_CSV) -> dict:
    """Load problem_bank.csv into the database.

    Upsert by slug: a new slug is inserted, a known slug is updated.
    So running it twice never makes duplicates.
    """
    existing = {p.slug: p for p in db.scalars(select(ProblemBank))}
    created = updated = 0

    with open(csv_path, encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            values = {field: row[field].strip() for field in BANK_FIELDS}
            values["is_design"] = _to_bool(row["is_design"])

            problem = existing.get(row["slug"].strip())
            if problem is None:
                db.add(ProblemBank(slug=row["slug"].strip(), **values))
                created += 1
            else:
                for field, value in values.items():
                    setattr(problem, field, value)
                updated += 1

    db.commit()
    return {"created": created, "updated": updated}


def slug_from(link: str, title: str) -> str:
    """Take the slug from a LeetCode link, or make one from the title."""
    match = re.search(r"/problems/([^/?#]+)", link)
    if match:
        return match.group(1).lower()
    return re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")


def get_or_create_custom_problem(
    db: Session, slug: str, title: str, link: str, difficulty: str, pattern: str = CUSTOM_PATTERN
) -> ProblemBank:
    """Find a problem by slug, or add it to the bank as a custom problem (contest / other)."""
    problem = db.scalar(select(ProblemBank).where(ProblemBank.slug == slug))
    if problem is None:
        problem = ProblemBank(
            slug=slug,
            title=title,
            link=link,
            difficulty=difficulty,
            pattern=pattern,
            companies="",
            sources="",
            is_custom=True,
            real_life=None,
        )
        db.add(problem)
        db.flush()  # gives problem.id
    return problem


def _cell(row: dict, column: str) -> str:
    """A cell from the CSV, or "" if the column is not in this file."""
    return (row.get(column) or "").strip()


def import_my_solved(db: Session, user_id: int, reader: csv.DictReader, today: date) -> dict:
    """Import a list of solved problems for one user.

    Works with two CSV shapes:
      - my_solved.csv:          slug, title, link, difficulty, in_bank, pattern
      - leetcode_solved.csv:    slug, title, link, difficulty   (from the LeetCode export script)
    Only "slug" or "link" is required. For each row:
      - slug found in the bank      -> link to that bank problem (pattern, real-life, ... come from the bank)
      - slug not in the bank        -> create a custom problem ("Contest / other")
      - in_bank = true but missing  -> report it in "missing" (the bank was probably not imported yet)
    Imported problems go straight into the round robin line (status in_queue, never revised).
    Problems the user already has are skipped.
    """
    columns = set(reader.fieldnames or [])
    if not columns & {"slug", "link"}:
        raise ValueError("CSV needs a 'slug' or 'link' column (for example: two-sum).")

    bank_by_slug = {p.slug: p for p in db.scalars(select(ProblemBank))}
    already_have = set(db.scalars(select(UserProblem.problem_id).where(UserProblem.user_id == user_id)))
    created = skipped = custom_created = 0
    missing = []

    for row in reader:
        link, title = _cell(row, "link"), _cell(row, "title")
        slug = _cell(row, "slug").lower() or (slug_from(link, title) if link else "")
        if not slug:
            continue  # empty line
        problem = bank_by_slug.get(slug)

        if problem is None:
            if _cell(row, "in_bank").lower() == "true":
                missing.append(slug)
                continue
            problem = get_or_create_custom_problem(
                db,
                slug,
                title or slug.replace("-", " ").title(),
                link or f"https://leetcode.com/problems/{slug}/",
                DIFFICULTIES.get(_cell(row, "difficulty").lower(), "Medium"),
            )
            bank_by_slug[slug] = problem
            custom_created += 1

        if problem.id in already_have:
            skipped += 1
            continue

        db.add(
            UserProblem(
                user_id=user_id,
                problem_id=problem.id,
                status="in_queue",
                solved_on=today,
                last_revised_on=None,
            )
        )
        already_have.add(problem.id)
        created += 1

    db.commit()
    return {"created": created, "skipped": skipped, "custom_created": custom_created, "missing": missing}


def import_bytes(db: Session, csv_path: Path = BYTES_CSV) -> dict:
    """Load daily_bytes.csv. Upsert by (type, title), so running it twice never duplicates."""
    existing = {(b.type, b.title): b for b in db.scalars(select(DailyByte))}
    created = updated = 0

    with open(csv_path, encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            key = (row["type"].strip(), row["title"].strip())
            values = {
                "content": row["content"].rstrip(),
                "why_it_matters": row["why_it_matters"].strip(),
                "topic": row["topic"].strip() or None,
            }
            byte = existing.get(key)
            if byte is None:
                db.add(DailyByte(type=key[0], title=key[1], **values))
                created += 1
            else:
                for field, value in values.items():
                    setattr(byte, field, value)
                updated += 1

    db.commit()
    return {"created": created, "updated": updated}

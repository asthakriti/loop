import csv
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import ProblemBank

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
BANK_CSV = DATA_DIR / "problem_bank.csv"

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

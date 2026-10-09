"""Import data/my_solved.csv for one user. Safe to run many times (duplicates are skipped).

Run from the backend folder (import the problem bank first):
    python -m scripts.import_my_solved you@example.com
    python -m scripts.import_my_solved you@example.com path/to/other.csv
"""

import csv
import sys
from datetime import date
from pathlib import Path

from sqlalchemy import select

from app.database import SessionLocal
from app.models import User
from app.services.importer import MY_SOLVED_CSV, import_my_solved


def main():
    if len(sys.argv) < 2:
        sys.exit("Usage: python -m scripts.import_my_solved <email> [csv_path]")
    email = sys.argv[1].lower()
    csv_path = Path(sys.argv[2]) if len(sys.argv) > 2 else MY_SOLVED_CSV

    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == email))
        if user is None:
            sys.exit(f"No user with email {email}. Register first.")
        with open(csv_path, encoding="utf-8-sig", newline="") as f:
            result = import_my_solved(db, user.id, csv.DictReader(f), date.today())

    print(
        f"My problems: {result['created']} added, {result['skipped']} skipped, "
        f"{result['custom_created']} custom problems created"
    )
    if result["missing"]:
        print(f"Not found in the bank (run scripts.import_bank first): {', '.join(result['missing'])}")


if __name__ == "__main__":
    main()

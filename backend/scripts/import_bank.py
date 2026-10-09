"""Load data/problem_bank.csv into the database. Safe to run many times.

Run from the backend folder:
    python -m scripts.import_bank
"""

from app.database import SessionLocal
from app.services.importer import import_bank


def main():
    with SessionLocal() as db:
        result = import_bank(db)
    print(f"Problem bank: {result['created']} added, {result['updated']} updated")


if __name__ == "__main__":
    main()

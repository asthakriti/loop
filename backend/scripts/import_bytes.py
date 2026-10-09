"""Load data/daily_bytes.csv into the database. Safe to run many times.

Run from the backend folder:
    python -m scripts.import_bytes
"""

from app.database import SessionLocal
from app.services.importer import import_bytes


def main():
    with SessionLocal() as db:
        result = import_bytes(db)
    print(f"Daily bytes: {result['created']} added, {result['updated']} updated")


if __name__ == "__main__":
    main()

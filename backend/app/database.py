from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings

# The engine only connects when a query runs, so importing this is safe in tests.
engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    """Give one database session per request and always close it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

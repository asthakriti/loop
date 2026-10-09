import os
from pathlib import Path

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from alembic import command
from alembic.config import Config

# Tests use their own database so they never touch your real data.
TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL", "postgresql+psycopg://loop:loop@localhost:5433/loop_test"
)
ALEMBIC_INI = Path(__file__).resolve().parent.parent / "alembic.ini"


def _create_fresh_database(url: str) -> None:
    """Drop and re-create the test database, so every run starts empty."""
    test_url = make_url(url)
    admin_engine = create_engine(
        test_url.set(database="postgres"), isolation_level="AUTOCOMMIT"
    )
    with admin_engine.connect() as conn:
        conn.execute(text(f'DROP DATABASE IF EXISTS "{test_url.database}" WITH (FORCE)'))
        conn.execute(text(f'CREATE DATABASE "{test_url.database}"'))
    admin_engine.dispose()


@pytest.fixture(scope="session")
def engine():
    try:
        _create_fresh_database(TEST_DATABASE_URL)
    except OperationalError:
        pytest.skip("Postgres is not running. Start it with: docker compose up -d db")

    # Run the real Alembic migrations, the same way production does.
    config = Config(str(ALEMBIC_INI))
    config.set_main_option("sqlalchemy.url", TEST_DATABASE_URL)
    command.upgrade(config, "head")

    engine = create_engine(TEST_DATABASE_URL)
    yield engine
    engine.dispose()


@pytest.fixture
def db(engine):
    """A session whose changes are rolled back after each test."""
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection, join_transaction_mode="create_savepoint")
    yield session
    session.close()
    transaction.rollback()
    connection.close()

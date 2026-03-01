from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from app.db.base_class import Base
from app.config import settings

DATABASE_URL = settings.DATABASE_URL

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_size=20,
    max_overflow=30,
    pool_timeout=60,
    pool_recycle=3600,
)

# =============================================================================
# FIX: "Unknown PG numeric type: 1043" — systemic SQLAlchemy/psycopg2 issue.
#
# Root cause: SQLAlchemy's _PGNumeric.result_processor raises an error when
# PostgreSQL returns a column with OID 1043 (varchar) where SQLAlchemy expects
# a numeric type. This happens when PG schema has varchar columns but the
# SQLAlchemy model says Float/Numeric (schema drift from create_all failures).
#
# Fix: Monkey-patch _PGNumeric to gracefully handle varchar OIDs by casting
# the string value to float instead of raising InvalidRequestError.
# =============================================================================
if DATABASE_URL.startswith("postgresql"):
    try:
        from sqlalchemy.dialects.postgresql import psycopg2 as _pg_dialect

        _OrigNumeric = _pg_dialect._PGNumeric

        class _PatchedPGNumeric(_OrigNumeric):
            def result_processor(self, dialect, coltype):
                # OID 1043 = varchar, OID 25 = text — treat as string-to-float
                if coltype in (1043, 25):
                    def process(value):
                        if value is None:
                            return None
                        try:
                            return float(value)
                        except (ValueError, TypeError):
                            return value
                    return process
                return super().result_processor(dialect, coltype)

        _pg_dialect._PGNumeric = _PatchedPGNumeric
    except Exception:
        pass

    # Also register psycopg2 type casters for safety
    try:
        import psycopg2
        import psycopg2.extensions
        VARCHAR = psycopg2.extensions.new_type((1043,), "VARCHAR", psycopg2.extensions.UNICODE)
        psycopg2.extensions.register_type(VARCHAR)
    except Exception:
        pass


SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


import logging
logger = logging.getLogger(__name__)

def get_db():
    try:
        db = SessionLocal()
        yield db
    except Exception as e:
        import traceback
        err_msg = f"Database Connection Error: {str(e)}\n{traceback.format_exc()}"
        logger.error(err_msg)
        try:
            with open("last_error.txt", "w") as f:
                f.write(err_msg)
        except:
            pass
        raise
    finally:
        try:
            db.close()
        except:
            pass


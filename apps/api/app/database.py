from sqlalchemy import create_engine
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

# Fix: Register missing psycopg2 type adapters for PostgreSQL varchar OIDs.
# Without this, queries crash with "Unknown PG numeric type: 1043" on PG 15+.
if DATABASE_URL.startswith("postgresql"):
    try:
        import psycopg2
        import psycopg2.extensions
        # OID 1043 = varchar, OID 1015 = varchar[]
        VARCHAR = psycopg2.extensions.new_type((1043,), "VARCHAR", psycopg2.extensions.UNICODE)
        psycopg2.extensions.register_type(VARCHAR)
        VARCHAR_ARRAY = psycopg2.extensions.new_array_type((1015,), "VARCHAR[]", VARCHAR)
        psycopg2.extensions.register_type(VARCHAR_ARRAY)
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
        # Attempt to write to a diagnostic file for the user
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

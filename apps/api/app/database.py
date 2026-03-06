import logging
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker
from app.db.base_class import Base
from app.config import settings
from app.core.compat import apply_database_compat

logger = logging.getLogger(__name__)

DATABASE_URL = settings.DATABASE_URL

# Apply compatibility fixes (PGNumeric patch, etc.)
apply_database_compat(DATABASE_URL)

# ── Dialect-aware engine configuration ────────────────────────────────
# SQLite does not support pool_size/max_overflow; use StaticPool instead.
_is_sqlite = DATABASE_URL.startswith("sqlite")

if _is_sqlite:
    from sqlalchemy.pool import StaticPool
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
else:
    engine = create_engine(
        DATABASE_URL,
        pool_size=20,
        max_overflow=30,
        pool_timeout=60,
        pool_recycle=3600,
    )

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

def get_db():
    try:
        db = SessionLocal()
        yield db
    except Exception as e:
        logger.error(f"Database Connection Error: {str(e)}", exc_info=True)
        raise
    finally:
        try:
            db.close()
        except Exception:
            pass


# ── Schema Drift Detection ────────────────────────────────────────────

def check_schema_drift() -> list[str]:
    """
    Compare SQLAlchemy model metadata against the live database schema.
    Returns a list of human-readable drift warnings.
    
    Called at startup to detect when models have columns that don't exist
    in the database (common when using create_all in dev but Alembic in prod).
    """
    import app.models  # noqa: F401 — ensure all models are imported
    
    warnings: list[str] = []
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    
    for table_name, table in Base.metadata.tables.items():
        if table_name not in existing_tables:
            warnings.append(f"MISSING TABLE: '{table_name}' exists in models but not in database")
            continue
        
        db_columns = {col["name"] for col in inspector.get_columns(table_name)}
        model_columns = {col.name for col in table.columns}
        
        missing_in_db = model_columns - db_columns
        extra_in_db = db_columns - model_columns
        
        for col in missing_in_db:
            warnings.append(f"MISSING COLUMN: '{table_name}.{col}' exists in model but not in database")
        for col in extra_in_db:
            warnings.append(f"EXTRA COLUMN: '{table_name}.{col}' exists in database but not in model")
    
    return warnings

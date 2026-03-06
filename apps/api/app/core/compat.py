"""Database compatibility monkey-patches."""
import logging

logger = logging.getLogger(__name__)

def apply_database_compat(database_url: str):
    """Apply systemic fixes for database dialect issues."""
    if database_url.startswith("postgresql"):
        _patch_pg_numeric()
        _register_psycopg2_types()

def _patch_pg_numeric():
    """
    FIX: "Unknown PG numeric type: 1043" — systemic SQLAlchemy/psycopg2 issue.
    
    Root cause: SQLAlchemy's _PGNumeric.result_processor raises an error when
    PostgreSQL returns a column with OID 1043 (varchar) where SQLAlchemy expects
    a numeric type. This happens when PG schema has varchar columns but the
    SQLAlchemy model says Float/Numeric (schema drift from create_all failures).
    
    Fix: Monkey-patch _PGNumeric to gracefully handle varchar OIDs by casting
    the string value to float instead of raising InvalidRequestError.
    """
    try:
        from sqlalchemy.dialects.postgresql import _psycopg_common
        
        _orig_result_processor = _psycopg_common._PsycopgNumeric.result_processor
        
        def _patched_result_processor(self, dialect, coltype):
            # OID 1043 = varchar, OID 25 = text
            if coltype in (1043, 25):
                def process(value):
                    if value is None:
                        return None
                    try:
                        return float(value)
                    except (ValueError, TypeError):
                        return value
                return process
            return _orig_result_processor(self, dialect, coltype)
            
        _psycopg_common._PsycopgNumeric.result_processor = _patched_result_processor
        logger.debug("Successfully patched PGNumeric result processor for varchar compatibility.")
    except Exception as e:
        logger.error(f"Failed to patch PGNumeric: {e}")

def _register_psycopg2_types():
    """Register psycopg2 type casters for additional safety."""
    try:
        import psycopg2
        import psycopg2.extensions
        VARCHAR = psycopg2.extensions.new_type((1043,), "VARCHAR", psycopg2.extensions.UNICODE)
        psycopg2.extensions.register_type(VARCHAR)
    except Exception:
        # Psycopg2 might not be installed if using a different driver or in dev
        pass

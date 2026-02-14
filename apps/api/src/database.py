"""
Central Database Connector
Handles connection pooling and multi-tenant context (business_id)
"""

import psycopg2
from psycopg2 import pool
import os
from contextlib import contextmanager

# Get connection string from .env
DATABASE_URL = os.getenv("DATABASE_URL")

# Initialize connection pool
try:
    connection_pool = psycopg2.pool.SimpleConnectionPool(
        1, 20, dsn=DATABASE_URL
    )
    print("✅ Database connection pool initialized")
except Exception as e:
    print(f"❌ Failed to initialize database pool: {e}")
    connection_pool = None

@contextmanager
def get_db():
    """Context manager for database connections"""
    conn = connection_pool.getconn()
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        connection_pool.putconn(conn)

def set_tenant_context(cursor, business_id: str):
    """
    Enforce multi-tenancy at the database level.
    Sets the session variable used by Row-Level Security (RLS).
    """
    cursor.execute("SET app.current_business_id = %s", (business_id,))

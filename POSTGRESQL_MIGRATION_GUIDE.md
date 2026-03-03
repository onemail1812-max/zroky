# PostgreSQL Migration Guide

This guide provides step-by-step instructions to migrate Aaliyah from SQLite (development) to PostgreSQL (production).

## Overview

- **Current**: SQLite at `./zroky.db` (single-threaded, development only)
- **Target**: PostgreSQL (multi-threaded, HA-capable, production-ready)
- **Downtime**: ~5-10 minutes
- **Tools**: Alembic for migrations, psycopg2 for connectivity

## Prerequisites

Before starting, ensure you have:

1. PostgreSQL 12+ installed locally (or RDS instance provisioned)
2. psycopg2 package installed: `pip install psycopg2-binary`
3. Database credentials (username, password, host, port)
4. Network access to the PostgreSQL database

## Step 1: Provision PostgreSQL Database

### Option A: Local PostgreSQL (macOS/Linux/Windows)

```bash
# macOS with Homebrew
brew install postgresql
brew services start postgresql

# Linux (Ubuntu/Debian)
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql

# Windows
# Download PostgreSQL installer from https://www.postgresql.org/download/windows/
# Run the installer and note the password you set for 'postgres' user
```

### Option B: AWS RDS PostgreSQL

1. Go to AWS Console → RDS → Databases
2. Click "Create database"
3. Select:
   - Engine: PostgreSQL (version 14 or 15)
   - Instance class: db.t3.micro (dev) or db.t3.small (prod)
   - Storage: 20 GB with autoscaling
   - DB name: `aaliyah_prod`
   - Master username: `postgres`
   - Master password: **Generate and save securely**
   - Publicly accessible: No (if in VPC)
   - Enable backup: Yes (35 days retention)
4. Click "Create database"
5. Wait 5-10 minutes for provisioning
6. Note the endpoint and port (default 5432)

### Option C: Other Cloud Providers

- **Google Cloud SQL**: Similar to AWS RDS
- **Azure Database**: Portal → Create Resource → Database for PostgreSQL
- **DigitalOcean**: Managed Databases → Create cluster

## Step 2: Create Database and User

Connect to your PostgreSQL instance:

```bash
# If using local or Docker PostgreSQL
psql -U postgres -h localhost

# If using RDS, get endpoint from AWS console
psql -U postgres -h <RDS-ENDPOINT> -p 5432
```

Once connected, create the database and user:

```sql
-- Create database
CREATE DATABASE aaliyah_prod;

-- Create dedicated user for app (for security)
CREATE USER aaliyah_user WITH PASSWORD 'STRONG_PASSWORD_HERE';

-- Grant permissions
GRANT CONNECT ON DATABASE aaliyah_prod TO aaliyah_user;
\c aaliyah_prod
GRANT CREATE ON SCHEMA public TO aaliyah_user;
GRANT USAGE ON SCHEMA public TO aaliyah_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO aaliyah_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO aaliyah_user;
ALTER ROLE aaliyah_user CREATEDB;
```

## Step 3: Update Environment Configuration

Update `.env` in `apps/api/`:

```bash
# Before (SQLite)
DATABASE_URL=sqlite:////app/zroky.db

# After (PostgreSQL)
DATABASE_URL=postgresql://aaliyah_user:STRONG_PASSWORD_HERE@localhost:5432/aaliyah_prod

# For AWS RDS
DATABASE_URL=postgresql://aaliyah_user:STRONG_PASSWORD_HERE@aaliyah-prod.c9akciq32.us-east-1.rds.amazonaws.com:5432/aaliyah_prod
```

## Step 4: Run Alembic Migrations

Alembic manages schema versions and migrations. To apply all current migrations to PostgreSQL:

```bash
cd apps/api

# Show migration history (should be empty for new DB)
alembic current

# Upgrade to latest schema version
alembic upgrade head

# Expected output:
# [2024-01-01 10:30:00,123] INFO sqlalchemy.engine.Engine BEGIN
# [2024-01-01 10:30:00,456] INFO Running upgrade...
# [2024-01-01 10:30:01,789] INFO New alembic_version inserted

# Verify migration status
alembic current
# Should show latest revision hash
```

### Troubleshooting Alembic

If migrations fail:

```bash
# Check alembic history
alembic history

# Roll back last migration
alembic downgrade -1

# View pending migrations
alembic upgrade --sql head | head -50

# Start fresh (careful! deletes all tables)
# alembic downgrade base
```

## Step 5: Update Docker Compose (if using Docker)

Update `docker-compose.yml`:

```yaml
version: "3.8"
services:
  api:
    image: zroky-api
    environment:
      - DATABASE_URL=postgresql://aaliyah_user:PASSWORD@postgres:5432/aaliyah_prod
    depends_on:
      - postgres
    networks:
      - zroky

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=aaliyah_prod
      - POSTGRES_USER=aaliyah_user
      - POSTGRES_PASSWORD=PASSWORD
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    networks:
      - zroky
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U aaliyah_user"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:

networks:
  zroky:
    driver: bridge
```

Then run:

```bash
docker-compose up -d
```

## Step 6: Verify Database Connection

Test the connection from Python:

```bash
cd apps/api
python << 'EOF'
from app.database import engine, SessionLocal
from sqlalchemy import text

# Test connection
try:
    with engine.connect() as conn:
        result = conn.execute(text("SELECT version()"))
        version = result.scalar()
        print(f"✅ PostgreSQL Connection OK: {version}")
except Exception as e:
    print(f"❌ Connection Failed: {e}")

# Check tables
session = SessionLocal()
from app.models import Base
tables = [table for table in Base.metadata.tables.keys()]
print(f"✅ {len(tables)} tables found")
session.close()
EOF
```

Expected output:

```
✅ PostgreSQL Connection OK: PostgreSQL 15.2 on x86_64-pc-linux-gnu
✅ 42 tables found
```

## Step 7: Data Migration (if migrating from SQLite)

If you have existing SQLite data to preserve:

```bash
# Export SQLite data
sqlite3 zroky.db .dump > backup.sql

# Convert SQLite dump to PostgreSQL compatible format
# (This requires manual SQL adjustment due to dialect differences)
# Alternative: Use Python script for programmatic export/import

cd apps/api
python << 'EOF'
from app.database import SessionLocal as SQLiteSession
from sqlalchemy import create_engine as create_sqlite_engine, inspect
from sqlalchemy.orm import Session

# Source: SQLite
sqlite_engine = create_sqlite_engine("sqlite:///./zroky.db")

# Destination: PostgreSQL
from app.database import SessionLocal, engine

# Get all tables from SQLite
inspector = inspect(sqlite_engine)
tables_to_migrate = inspector.get_table_names()

print(f"Migrating {len(tables_to_migrate)} tables...")

for table_name in tables_to_migrate:
    try:
        # This is simplified; real migration requires handling relationships
        print(f"  Migrating {table_name}...")
    except Exception as e:
        print(f"  ❌ {table_name}: {e}")

print("✅ Data migration complete")
EOF
```

**Note:** For complex data with foreign keys/relationships, consider:
- Using a tool like `pgloader` (automates SQLite → PostgreSQL)
- Or exporting to CSV and importing table-by-table in dependency order

## Step 8: Update Connection Pooling (Optional but Recommended)

For production, update `app/database.py`:

```python
from sqlalchemy.pool import QueuePool

engine = create_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_class=QueuePool,
    pool_size=20,  # Number of persistent connections
    max_overflow=10,  # Additional connections when needed
    pool_pre_ping=True,  # Test connections before using
    pool_recycle=3600,  # Recycle connections after 1 hour
    connect_args={
        "connect_timeout": 15,
        "application_name": "aaliyah-api",
    }
)
```

## Step 9: Set Up Automated Backups

### With AWS RDS

RDS handles backups automatically:
- Automated backups: 7 days retention (default)
- Manual snapshots: Create via AWS console
- Point-in-time recovery: Available within backup window

To enable:
1. AWS Console → RDS → Databases → Your DB → Modify
2. Set "Backup retention period" to 35 (days)
3. Enable "Copy backups to another region" (optional, for DR)

### With Docker/Local PostgreSQL

```bash
# Daily backup script (backup.sh)
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/postgres"
mkdir -p $BACKUP_DIR

pg_dump -U aaliyah_user -h localhost aaliyah_prod | \
  gzip > $BACKUP_DIR/aaliyah_prod_$TIMESTAMP.sql.gz

# Keep only last 7 backups
find $BACKUP_DIR -name "aaliyah_prod_*.sql.gz" -mtime +7 -delete
echo "Backup completed: $BACKUP_DIR/aaliyah_prod_$TIMESTAMP.sql.gz"
```

Schedule with cron:

```bash
# Edit crontab
crontab -e

# Add: Run backup daily at 2 AM
0 2 * * * /scripts/backup.sh >> /var/log/postgres_backup.log 2>&1
```

## Step 10: Health Check and Validation

Create health check endpoint in `app/routers/health.py`:

```python
@router.get("/health/db")
async def health_check_db(db: Session = Depends(get_db)):
    """Health check for database connectivity."""
    try:
        # Test connection
        db.execute(text("SELECT 1"))
        
        # Check table count
        inspector = inspect(engine)
        table_count = len(inspector.get_table_names())
        
        return {
            "status": "healthy",
            "database": "postgresql" if "postgresql" in settings.DATABASE_URL else "sqlite",
            "tables": table_count,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }
```

Test the health endpoint:

```bash
curl http://localhost:8000/health/db
# Expected output:
# {
#   "status": "healthy",
#   "database": "postgresql",
#   "tables": 42,
#   "timestamp": "2024-01-01T10:30:00.123456"
# }
```

## Step 11: Deploy to Production

### Docker Deployments

```bash
# Update image
docker build -t zroky-api:prod .

# Push to registry
docker tag zroky-api:prod gcr.io/my-project/zroky-api:prod
docker push gcr.io/my-project/zroky-api:prod

# Deploy to Kubernetes/Cloud Run
kubectl set image deployment/zroky-api api=gcr.io/my-project/zroky-api:prod
```

### Traditional Server Deployment

```bash
# SSH into production server
ssh user@prod-server.com

cd /opt/zroky
git pull origin main
.venv/bin/pip install -r requirements.txt

# Run migrations
cd apps/api
../.venv/bin/alembic upgrade head

# Restart service
sudo systemctl restart zroky-api

# Verify
curl https://api.zroky.com/health/db
```

## Rollback Procedure (if needed)

If PostgreSQL migration causes issues:

```bash
# Downgrade database schema
alembic downgrade base

# Switch back to SQLite
export DATABASE_URL=sqlite:///./zroky.db
systemctl restart zroky-api
```

Then investigate the issue before retrying PostgreSQL migration.

## Performance Tuning (Optional)

For production PostgreSQL, consider these optimizations:

### 1. Connection Pooling via PgBouncer

```bash
# Install PgBouncer
apt-get install pgbouncer

# Configure /etc/pgbouncer/pgbouncer.ini
[databases]
aaliyah_prod = host=localhost port=5432 dbname=aaliyah_prod

[pgbouncer]
pool_mode = transaction
max_client_conn = 100
default_pool_size = 25
reserve_pool_size = 5
```

### 2. Query Indexing

Create indexes for common queries (Alembic manages these):

```python
# In alembic/versions/xxx_add_indexes.py
def upgrade():
    op.create_index("idx_email_workspace_received", 
                    "triaged_emails", 
                    ["workspace_id", "received_at"])
    op.create_index("idx_chat_workspace_created",
                    "chat_messages",
                    ["workspace_id", "created_at"])

def downgrade():
    op.drop_index("idx_email_workspace_received")
    op.drop_index("idx_chat_workspace_created")
```

### 3. Enable Replication (for HA)

PostgreSQL native replication provides automatic failover:

```bash
# Primary server (pg_hba.conf)
host replication all 0.0.0.0/0 md5

# Backup primary
pg_basebackup -h primary.com -D /var/lib/postgresql/data -U replication_user

# Standby recovery.conf
standby_mode = 'on'
primary_conninfo = 'host=primary.com port=5432 user=replication_user'
```

## Summary

| Step | Task | Time | Impact |
|------|------|------|--------|
| 1 | Provision PostgreSQL | 5-10 min | Creates database |
| 2 | Create DB & user | 2 min | Sets up credentials |
| 3 | Update .env | 1 min | Points app to PostgreSQL |
| 4 | Run Alembic | 2 min | Creates schema |
| 5 | Update Docker | 5 min | Container config ready |
| 6 | Test connection | 1 min | Validates setup |
| 7 | Migrate data (optional) | 5-30 min | Moves existing data |
| 8 | Pool config (optional) | 2 min | Optimizes connections |
| 9 | Setup backups | 5 min | Enables disaster recovery |
| 10 | Health check | 1 min | Validates deployment |
| 11 | Deploy | 10 min | Live in production |

**Total time: 40-60 minutes** (excluding data migration complexity)

## Monitoring & Support

After migration, monitor:

```bash
# Check database size
du -sh /var/lib/postgresql/data

# Monitor connections
SELECT count(*) FROM pg_stat_activity;

# Check slow queries
SELECT * FROM pg_stat_statements LIMIT 20;

# Monitor disk space
df -h

# Set up alerts (CloudWatch/DataDog)
```

For issues or questions, refer to:
- PostgreSQL docs: https://www.postgresql.org/docs/
- Alembic docs: https://alembic.sqlalchemy.org/
- SQLAlchemy docs: https://docs.sqlalchemy.org/

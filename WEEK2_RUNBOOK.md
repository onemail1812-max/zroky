# Week 2 Runbook: Step-by-Step Execution Guide

**Start**: Monday, March 4, 2026 @ 9:00 AM  
**End**: Friday, March 8, 2026 @ 4:00 PM  
**Owner**: Database & DevOps Team  
**Status**: Ready to Execute ✅

---

## Before You Start (Pre-Requisites)

### ✅ Verify Prerequisites
- [ ] AWS account access (or chosen cloud provider)
- [ ] psql client installed locally (`psql --version`)
- [ ] Python environment ready (`python --version`, should be 3.9+)
- [ ] Virtual environment activated in `apps/api/`
- [ ] PostgreSQL driver available: `pip list | grep psycopg2`
- [ ] Alembic installed: `alembic --version`

### ✅ Backup Current System
```bash
# Backup SQLite database
cp apps/api/dbs/aaliyah.db apps/api/dbs/aaliyah.db.backup.$(date +%Y%m%d)

# Export for reference
sqlite3 apps/api/dbs/aaliyah.db ".dump" > aaliyah_sqlite_dump.sql

# Verify backup exists
ls -lh apps/api/dbs/aaliyah.db.backup*
```

### ✅ Team Communication
- [ ] Notify stakeholders: Database migration starting Monday 9 AM
- [ ] Schedule 15-minute standup at 4 PM each day
- [ ] Set Slack channel for #week2-migration updates
- [ ] Prepare rollback contingency plan

---

# MONDAY: Database Provisioning & Initial Migration

## Task 1️⃣: Provision PostgreSQL (9:00 AM - 10:00 AM)

### Choose Provider
Pick ONE of the following:

#### Option A: AWS RDS (Recommended)
```bash
# Go to AWS Console > RDS > Create Database
# Fill in:
- Engine: PostgreSQL 15.2
- DB Instance Class: db.t3.small (1 vCPU, 2GB RAM)
- Allocated Storage: 20 GB
- Storage autoscaling: ENABLED (max 100GB)
- DB Instance Identifier: aaliyah-db
- Master username: aaliyah_app
- Master password: [GENERATE 32-CHAR RANDOM] ← SAVE SECURELY
- VPC & Security Group: Your app VPC
- Publicly accessible: NO (unless dev environment)
- Backup retention: 7 days
- Multi-AZ: YES (for staging/prod), NO (for dev)
- Performance Insights: ENABLED
- Enhanced Monitoring: ENABLED

# Wait 10-15 minutes for creation
# Note the endpoint: aaliyah-db.xxxxx.us-east-1.rds.amazonaws.com
```

#### Option B: Google Cloud SQL
```bash
# Go to Google Cloud Console > SQL > Create Instance
gcloud sql instances create aaliyah-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --backup
```

#### Option C: Azure Database for PostgreSQL
```bash
# Go to Azure Portal > Create Resource > Database for PostgreSQL
# Single Server: aaliyah-db
# PostgreSQL 13+
# Compute + Storage: Burstable B1s
```

#### Option D: DigitalOcean Managed Database
```bash
# Go to DigitalOcean > Databases > Create Cluster
# Engine: PostgreSQL 15
# Region: New York 3 (or your preference)
# Replica: No (for dev)
# Node Count: 1
```

### ✅ Verify Instance Created
```bash
# AWS (replace ENDPOINT with your RDS endpoint)
# Try to connect (password will be prompted)
psql -h aaliyah-db.xxxxx.us-east-1.rds.amazonaws.com \
     -U aaliyah_app \
     -d postgres \
     -c "SELECT version();"

# Expected output: PostgreSQL 15.x... (successful connection)
```

**CHECKPOINT**: ✅ PostgreSQL instance created and accessible
- [ ] Instance created in AWS/GCP/Azure/DO
- [ ] Endpoint noted: `_______________`
- [ ] Connection test passed
- [ ] Credentials stored securely

---

## Task 2️⃣: Create Database & User (10:00 AM - 10:30 AM)

```bash
# Connect as admin (postgres user)
psql -h <ENDPOINT> -U postgres -d postgres

# Run these SQL commands:
```

```sql
-- Create database
CREATE DATABASE aaliyah 
  WITH 
  ENCODING='UTF8' 
  OWNER aaliyah_app;

-- Create user (already created above, but verify it exists)
CREATE USER aaliyah_app WITH PASSWORD 'YOUR_SECURE_PASSWORD';

-- Grant all privileges on database
GRANT ALL PRIVILEGES ON DATABASE aaliyah TO aaliyah_app;

-- Grant connect permission
GRANT CONNECT ON DATABASE aaliyah TO aaliyah_app;

-- Set search path
ALTER USER aaliyah_app SET search_path = public;

-- Verify creation
\l
\du
```

**Output should show**:
```
 aaliyah | aaliyah_app | UTF8
```

**CHECKPOINT**: ✅ Database and user created
- [ ] Database `aaliyah` created
- [ ] User `aaliyah_app` created
- [ ] Permissions granted
- [ ] Connection test works

---

## Task 3️⃣: Configure Application (10:30 AM - 11:00 AM)

### Update Environment Variables
```bash
# Navigate to app directory
cd d:/Zroky/apps/api

# Open or create .env file
# Add or update:
DATABASE_URL=postgresql://aaliyah_app:YOUR_PASSWORD@<ENDPOINT>:5432/aaliyah

# Example (DO NOT USE - example only):
# DATABASE_URL=postgresql://aaliyah_app:SecureP@ssw0rd123!@aaliyah-db.c1234.us-east-1.rds.amazonaws.com:5432/aaliyah

# Verify environment variable is set
echo $DATABASE_URL  # Should show your PostgreSQL connection string

# Save .env file
```

### Verify Requirements
```bash
# Check psycopg2 is installed
pip list | grep psycopg2

# If not installed, add it
pip install psycopg2-binary

# Verify installation
python -c "import psycopg2; print('✅ psycopg2 installed')"
```

**CHECKPOINT**: ✅ App config updated
- [ ] .env file updated with PostgreSQL URL
- [ ] DATABASE_URL environment variable set
- [ ] psycopg2 installed
- [ ] No connection errors when importing

---

## Task 4️⃣: Run Alembic Migrations (11:00 AM - 11:30 AM)

### Pre-Migration Check
```bash
# Verify Alembic is installed
alembic --version

# Check current revision
alembic current

# List pending migrations
alembic branches
alembic history
```

### Run Migrations
```bash
# This creates all tables in PostgreSQL
alembic upgrade head

# Expected output:
# INFO  [alembic.runtime.migration] Context impl PostgresqlImpl
# INFO  [alembic.runtime.migration] Running upgrade -> [revision]... done
```

### Verify Tables Created
```bash
# Connect to PostgreSQL
psql -h <ENDPOINT> -U aaliyah_app -d aaliyah

# List all tables
\dt

# Should show tables like:
# users
# integrations
# threads
# chat_messages
# events
# etc.

# Count tables
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';
# Should return > 10

# Exit
\q
```

**CHECKPOINT**: ✅ Database schema created
- [ ] All migrations applied successfully
- [ ] All tables visible in PostgreSQL
- [ ] Schema matches SQLite structure

---

## Task 5️⃣: Verify Connection (11:30 AM - 12:00 PM)

### Test from Python
```bash
# Create a test script
cat > test_pg_connection.py << 'EOF'
import os
from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv("DATABASE_URL")
print(f"Connecting to: {DATABASE_URL.split('@')[1]}...")

engine = create_engine(DATABASE_URL)

try:
    with engine.connect() as conn:
        result = conn.execute(text("SELECT version();"))
        version = result.fetchone()[0]
        print(f"✅ Connected to PostgreSQL: {version}")
        
        # Count tables
        result = conn.execute(text(
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'"
        ))
        count = result.fetchone()[0]
        print(f"✅ Tables in database: {count}")
        
except Exception as e:
    print(f"❌ Connection failed: {e}")
    exit(1)

EOF

# Run test
python test_pg_connection.py

# Expected output:
# ✅ Connected to PostgreSQL: PostgreSQL 15.2...
# ✅ Tables in database: 12
```

### Check App Health
```bash
# Run the app
python -m uvicorn app.main:app --reload

# In another terminal
curl http://localhost:8000/health

# Expected:
# {"status": "healthy", "database": "connected", "db_type": "postgresql"}
```

**CHECKPOINT**: ✅ All connections working
- [ ] Python SQLAlchemy connection successful
- [ ] PostgreSQL version verified
- [ ] All tables visible
- [ ] App health endpoint responding
- [ ] Database connected message shown

**END OF MONDAY**: PostgreSQL live, migrations complete. All systems operational.

---

# TUESDAY: Application Testing

## Task 6️⃣: Quick Verification (9:00 AM - 9:30 AM)

```bash
# Verify PostgreSQL still running
psql -h <ENDPOINT> -U aaliyah_app -d aaliyah -c "SELECT 1;"
# Should return: 1 ✅

# Verify app can connect
python test_pg_connection.py
# Should show: ✅ Connected and table counts
```

## Task 7️⃣: Run Test Suite (10:00 AM - 12:00 PM)

### Run Unit Tests
```bash
cd d:/Zroky

# Run critical tests
pytest tests/test_email_ingestor.py -v --tb=short
# Expected: PASSED

pytest tests/test_availability_engine.py -v --tb=short
# Expected: 3 PASSED

pytest tests/test_drafting_agent.py -v --tb=short
# Expected: PASSED

# Run all unit tests
pytest tests/unit/ -v --tb=short --timeout=60
```

### Capture Results
```bash
# Save results
pytest tests/ -v --tb=short > test_results_tuesday.txt 2>&1

# Check for failures
grep -i "failed\|error" test_results_tuesday.txt
# Should return NOTHING (no failures)

# Count passing tests
grep "PASSED" test_results_tuesday.txt | wc -l
```

### Run Integration Tests
```bash
pytest tests/integration/ -v --tb=short --timeout=60

# Expected: All PASSED
```

### Run E2E Tests
```bash
pytest tests/e2e/ -v --tb=short --timeout=120

# Expected: All PASSED
```

**CHECKPOINT**: ✅ All tests passing against PostgreSQL
- [ ] Unit tests: 100% passing
- [ ] Integration tests: 100% passing  
- [ ] E2E tests: 100% passing
- [ ] No regressions detected
- [ ] Results saved to file

---

## Task 8️⃣: Production Mode Test (1:00 PM - 3:00 PM)

### Start App in Production Mode
```bash
# Install gunicorn if needed
pip install gunicorn

# Start app (4 workers)
cd d:/Zroky/apps/api
gunicorn app.main:app --workers=4 --bind 0.0.0.0:8000

# Expected output:
# [2026-03-04 13:00:00 +0000] [1234] [INFO] Starting gunicorn 21.2.0
# [2026-03-04 13:00:00 +0000] [1234] [INFO] Listening at: http://0.0.0.0:8000
```

### Health Checks
```bash
# In another terminal
for i in {1..10}; do
  curl -s http://localhost:8000/health | jq .
  sleep 1
done

# Expected: All should show healthy
```

### Test Critical Endpoints
```bash
# Get user profile (requires auth token - use test token)
curl -H "Authorization: Bearer <TEST_TOKEN>" \
     http://localhost:8000/api/users/me

# Test email fetch endpoint
curl -H "Authorization: Bearer <TEST_TOKEN>" \
     http://localhost:8000/api/emails/recent?limit=10

# Test draft generation
curl -X POST \
     -H "Authorization: Bearer <TEST_TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{"to": "test@example.com", "subject": "Test", "context": "test"}' \
     http://localhost:8000/api/drafts/generate
```

**CHECKPOINT**: ✅ App working in production mode
- [ ] Gunicorn starts without errors
- [ ] Health endpoint responds
- [ ] Critical endpoints responding (with auth)
- [ ] No 500 errors in logs
- [ ] Database queries fast (< 100ms)

**END OF TUESDAY**: All application tests passing against PostgreSQL. Zero regressions.

---

# WEDNESDAY: Baseline Load Testing

## Task 9️⃣: Setup Load Testing (9:00 AM - 10:00 AM)

### Install Locust
```bash
pip install locust

# Verify installation
locust --version
# Should show: locust 2.x.x
```

### Prepare Load Test Script
```bash
# The load test script should exist at:
ls -la apps/api/load_test.py

# If it doesn't exist, create it (copy from WEEK1 deliverable)
```

### Baseline Parameters
```
Expected Load Profile:
- Initial users: 0
- Ramp-up rate: 10 users/second
- Max users: 100
- Duration: 6 minutes
- Task types: Mail fetch, draft generation, availability check, etc.
```

---

## Task 🔟: Run Baseline Load Test (10:00 AM - 10:15 AM)

```bash
cd d:/Zroky/apps/api

# Start app in background
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 &
APP_PID=$!

# Wait for app to start
sleep 5

# Run baseline load test
locust -f load_test.py \
  --host=http://localhost:8000 \
  --users=100 \
  --spawn-rate=10 \
  --run-time=6m \
  --headless \
  --csv=baseline_metrics

# Expected output:
# Type     Name           requests  failures  Avg     Min     Max    Median  req/s
# ---------+----------------------------------...
# GET      /api/emails   1234      0        45ms    10ms   200ms   40ms    3.4
# POST     /api/drafts   567       0        120ms   50ms   400ms   100ms   1.5
```

### Capture Baseline Metrics
```bash
# Create results file
cat > LOAD_TEST_RESULTS.txt << 'EOF'
===========================================
BASELINE LOAD TEST RESULTS
===========================================
Date: 2026-03-05
Duration: 6 minutes
Test Profile: Baseline (ramp to 100 users)
Database: PostgreSQL (db.t3.small)

SUMMARY:
Total Requests: ___
Failed Requests: ___
Error Rate: ____%

PERFORMANCE METRICS:
Median Response Time: ____ ms
P95 Response Time: ____ ms  
P99 Response Time: ____ ms
Min Response Time: ____ ms
Max Response Time: ____ ms

THROUGHPUT:
Requests/Second (average): ____
Peak Requests/Second: ____

ENDPOINT PERFORMANCE:
GET /api/emails: ____ ms (median)
POST /api/drafts: ____ ms (median)
GET /api/availability: ____ ms (median)

SYSTEM METRICS:
Database Connections Used: ____/20
CPU Utilization: ____%
Memory Utilization: ____%

NOTES:
- [Any observations or anomalies]
EOF

# Copy metrics from locust output to this file
```

**CHECKPOINT**: ✅ Baseline metrics established
- [ ] 6-minute load test completed
- [ ] Metrics captured to file
- [ ] Response times documented
- [ ] Throughput measured
- [ ] No unexpected errors

**END OF WEDNESDAY MORNING**: Baseline performance established.

---

# THURSDAY: Stress Testing & Tuning

## Task 1️⃣1️⃣: Run Stress Test (9:00 AM - 9:15 AM)

```bash
# Start fresh app instance
pkill -f uvicorn
sleep 2
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 &
sleep 5

# Run stress test (500 users, find breaking point)
locust -f load_test.py \
  --host=http://localhost:8000 \
  --users=500 \
  --spawn-rate=20 \
  --run-time=10m \
  --headless \
  --csv=stress_metrics
```

### Monitor During Test
In separate terminal:
```bash
# Monitor app CPU/memory
top

# Monitor PostgreSQL connections
watch -n 1 "psql -h <ENDPOINT> -U aaliyah_app -d aaliyah -c 'SELECT count(*) FROM pg_stat_activity;'"

# Monitor app logs
tail -f /var/log/app.log
```

### Capture Stress Results
```bash
# Append to results file
cat >> LOAD_TEST_RESULTS.txt << 'EOF'

===========================================
STRESS TEST RESULTS
===========================================
Duration: 10 minutes
Test Profile: Stress (ramp to 500 users)
Date: 2026-03-06

SUMMARY:
Total Requests: ___
Failed Requests: ___
Error Rate: ____%

PERFORMANCE METRICS:
Median Response Time: ____ ms
P95 Response Time: ____ ms
P99 Response Time: ____ ms

THROUGHPUT:
Requests/Second (peak): ____

BREAKING POINT:
User Count at 5% Error Rate: ____
Response Time at Break: ____ ms

SYSTEM AT BREAKING POINT:
Database Connections: ____/20
CPU Utilization: ____%
Memory Utilization: ____%

RECOMMENDATION:
[Connection pool too small / Need caching / Need more instances / etc.]
EOF
```

**CHECKPOINT**: ✅ Stress test completed, breaking point identified
- [ ] 10-minute stress test completed
- [ ] Peak load reached
- [ ] Breaking point identified (X users = Y% error)
- [ ] System metrics captured
- [ ] Recommendations noted

---

## Task 1️⃣2️⃣: Performance Tuning (If Needed) (9:15 AM - 4:00 PM)

### If error rate < 1% at 500 users:
✅ **No tuning needed** - System performs well, proceed to next day

### If error rate > 5% before 500 users:
⚠️ **Tuning needed** - Follow steps below

#### Option A: Increase Connection Pool
```bash
# Edit apps/api/app/config.py
# Find: SQLALCHEMY_POOL_SIZE
# Change from default to: SQLALCHEMY_POOL_SIZE = 30

# Verify and re-run stress test
locust -f load_test.py \
  --host=http://localhost:8000 \
  --users=500 \
  --spawn-rate=20 \
  --run-time=5m \
  --headless
```

#### Option B: Add Indexes
```sql
-- Connect to PostgreSQL
psql -h <ENDPOINT> -U aaliyah_app -d aaliyah

-- Check slow queries
SELECT query, mean_exec_time 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Add missing indexes
CREATE INDEX idx_user_id ON chat_messages(user_id);
CREATE INDEX idx_thread_id ON chat_messages(thread_id);
CREATE INDEX idx_email_user ON emails(user_id, created_at);

-- Verify index creation
\d emails
\d chat_messages
```

#### Option C: Upgrade Instance
```bash
# If connection pool and indexes don't help:
# AWS: Change db.t3.small → db.t3.medium (2 vCPU, 4GB RAM)
# Cost increases from $15/mo to $30/mo
# Downtime: 5-10 minutes (AWS RDS will handle automatically)
```

**CHECKPOINT**: ✅ Performance tuning complete (if needed)
- [ ] Tuning option selected and applied
- [ ] Follow-up stress test run
- [ ] Acceptable performance confirmed (< 5% error at target load)
- [ ] Changes documented

**END OF THURSDAY**: System optimized for production load.

---

# FRIDAY: Staging Setup & Sign-Off

## Task 1️⃣3️⃣: Setup Backup Automation (9:00 AM - 10:00 AM)

### AWS RDS (if using AWS)
```bash
# Backup settings already enabled during creation, but verify:
# AWS Console → RDS → Databases → aaliyah-db
# Check:
# - Automated backups: ENABLED
# - Backup retention period: 7 days
# - Backup window: 03:00-04:00 UTC (or your preference)
# - Copy backups to another region: NO (for now)
```

### Create Manual Backup
```bash
# AWS CLI
aws rds create-db-snapshot \
  --db-instance-identifier aaliyah-db \
  --db-snapshot-identifier aaliyah-db-backup-$(date +%Y%m%d)

# Verify
aws rds describe-db-snapshots --db-snapshot-identifier aaliyah-db-backup-20260305
```

### Document Restore Procedure
```bash
# Create backup procedure document
cat > BACKUP_RESTORE_PROCEDURE.md << 'EOF'
# PostgreSQL Backup & Restore Procedure

## Backup (Automatic - Runs Daily)
- AWS handles daily snapshots automatically
- Retention: 7 days
- Point-in-time recovery available

## Manual Backup (Before Major Changes)
```bash
aws rds create-db-snapshot \
  --db-instance-identifier aaliyah-db \
  --db-snapshot-identifier aaliyah-backup-$(date +%Y%m%d)
```

## Restore Procedure

### Option 1: Restore to New Instance (Recommended)
```bash
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier aaliyah-db-restored \
  --db-snapshot-identifier aaliyah-backup-20260305

# Wait 10-15 minutes for creation
# Update app to point to new endpoint
# Test thoroughly
# Switch DNS/connection string to new instance
```

### Option 2: Restore to Existing Instance (Dangerous)
```bash
# Not recommended - requires downtime
# Use Option 1 instead
```

## Verification
```bash
# Connect to restored instance
psql -h <NEW_ENDPOINT> -U aaliyah_app -d aaliyah -c "SELECT COUNT(*) FROM users;"
```

## Time Required
- Manual backup: 5 minutes
- Restore to new instance: 15-20 minutes
- Testing: 10 minutes
- Total: 30-35 minutes
EOF
```

**CHECKPOINT**: ✅ Backup automation configured
- [ ] Automated backups enabled
- [ ] Backup frequency: Daily
- [ ] Backup retention: 7 days
- [ ] Manual backup created
- [ ] Restore procedure documented
- [ ] Team trained on restore process

---

## Task 1️⃣4️⃣: Setup Monitoring (10:00 AM - 11:30 AM)

### AWS CloudWatch (if using AWS)
```bash
# Create alarms for critical metrics

# 1. CPU Utilization
aws cloudwatch put-metric-alarm \
  --alarm-name aaliyah-db-cpu-high \
  --alarm-description "Alert when CPU > 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT:alert-topic

# 2. Database Connections
aws cloudwatch put-metric-alarm \
  --alarm-name aaliyah-db-connections-high \
  --alarm-description "Alert when connections > 80% of max" \
  --metric-name DatabaseConnections \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --threshold 16 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT:alert-topic

# 3. Storage Space
aws cloudwatch put-metric-alarm \
  --alarm-name aaliyah-db-storage-low \
  --alarm-description "Alert when storage < 2GB free" \
  --metric-name FreeStorageSpace \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --threshold 2000000000 \
  --comparison-operator LessThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT:alert-topic
```

### Application Logging
```bash
# Update app logging config
# In apps/api/app/config.py

LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "standard": {
            "format": "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "standard",
        },
        "file": {
            "class": "logging.handlers.RotatingFileHandler",
            "filename": "logs/aaliyah.log",
            "maxBytes": 10485760,  # 10MB
            "backupCount": 5,
            "formatter": "standard",
        },
    },
    "loggers": {
        "sqlalchemy.engine": {"level": "INFO"},  # Log SQL queries
        "app": {"level": "DEBUG"},
    },
}

# Queries slower than 1 second logged as warnings
```

**CHECKPOINT**: ✅ Monitoring configured
- [ ] CPU alert configured (> 80%)
- [ ] Database connections alert (> 90%)
- [ ] Storage alert configured (< 2GB free)
- [ ] SNS topic created for notifications
- [ ] Team email configured for alerts
- [ ] Application logging enabled
- [ ] Slow query logging configured

---

## Task 1️⃣5️⃣: Staging Environment Setup (11:30 AM - 1:00 PM)

### Create Staging Database Copy
```bash
# AWS RDS: Create snapshot of production and restore to staging

# Create snapshot
aws rds create-db-snapshot \
  --db-instance-identifier aaliyah-db \
  --db-snapshot-identifier aaliyah-db-staging-$(date +%Y%m%d)

# Wait for snapshot to complete (5-10 minutes)

# Restore to staging instance
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier aaliyah-staging-db \
  --db-snapshot-identifier aaliyah-db-staging-20260307
```

### Deploy App to Staging
```bash
# Create staging environment file
cat > apps/api/.env.staging << 'EOF'
DATABASE_URL=postgresql://aaliyah_app:PASSWORD@aaliyah-staging-db.xxxxx.rds.amazonaws.com:5432/aaliyah
ENVIRONMENT=staging
DEBUG=False
OPENROUTER_API_KEY=sk_live_...
EOF

# Deploy to staging server
cd d:/Zroky/apps/api
pip install -r requirements.txt
alembic upgrade head

# Start app
gunicorn app.main:app --workers=4 --bind 0.0.0.0:8000
```

### Run Smoke Tests
```bash
# Quick smoke tests in staging
pytest tests/smoke_test.py -v

# Expected: All green ✅
```

**CHECKPOINT**: ✅ Staging environment ready
- [ ] Staging database created
- [ ] App deployed to staging
- [ ] Database migrated
- [ ] Smoke tests passing
- [ ] Staging endpoint accessible
- [ ] Team can access staging

---

## Task 1️⃣6️⃣: Documentation & Sign-Off (2:00 PM - 4:00 PM)

### Create Deployment Checklist
```bash
cat > PRODUCTION_DEPLOYMENT_CHECKLIST.md << 'EOF'
# Production Deployment Checklist

## Pre-Deployment (1 day before)
- [ ] Notify stakeholders of deployment window
- [ ] Backup production database
- [ ] Review all changes since last deployment
- [ ] Verify load test results acceptable
- [ ] Team on standby

## Deployment Steps (RTO: 40 minutes total)
1. [ ] Create database snapshot: 5 min
2. [ ] Set app to maintenance mode: 1 min
3. [ ] Run Alembic migrations: 5 min
4. [ ] Verify schema: 2 min
5. [ ] Restart app instances: 5 min
6. [ ] Health checks: 2 min
7. [ ] User acceptance: 5 min
8. [ ] Monitor for 2 hours: Ongoing

## Post-Deployment
- [ ] Monitor error logs for 4 hours
- [ ] Check database performance metrics
- [ ] Verify all integrations still working
- [ ] Get stakeholder sign-off
- [ ] Document any issues encountered
- [ ] Schedule post-mortem (if needed)

## Rollback Procedure (if major issues)
1. Switch to backup database snapshot
2. Revert app code to previous version
3. Clear application cache
4. Restart services
5. Notify stakeholders
6. Schedule post-mortem

## Success Criteria
- [ ] All tests passing
- [ ] Response time < previous baseline
- [ ] Error rate < 0.5%
- [ ] No critical alerts triggered
- [ ] Users report system working
EOF
```

### Prepare Executive Briefing
```bash
cat > WEEK2_COMPLETION_BRIEFING.txt << 'EOF'
WEEK 2 COMPLETION SUMMARY
=========================

✅ Database Migration Complete
   - SQLite → PostgreSQL
   - 0 data loss
   - 0 unplanned downtime

✅ All Tests Passing
   - Unit tests: 100%
   - Integration tests: 100%
   - E2E tests: 100%
   - Production mode: ✅

✅ Performance Baseline Established
   - Baseline load: 100 users, 6 min, X req/sec
   - Stress load: 500 users, 10 min, breaking point at Y users
   - Median response: Z ms
   - P95 response: A ms

✅ Infrastructure Ready
   - Automated backups: Daily, 7-day retention
   - Monitoring: CloudWatch alarms configured
   - Scaling: Auto-scaling storage enabled
   - Disaster recovery: Tested restore procedure

✅ Documentation Complete
   - Migration runbook
   - Backup procedure
   - Monitoring setup
   - Deployment checklist
   - Troubleshooting guide

NEXT STEPS: Week 3 - Staging Verification
   - Deploy to staging environment
   - Run 24-hour stability test
   - Performance testing at scale
   - Final stakeholder sign-off
   - Target: Week 3 sign-off, Week 4 production deployment

TEAM COMMENTS:
[Add any observations or lessons learned]

Signed Off By:
- Database Admin: __________
- DevOps Lead: __________
- Project Manager: __________
- Engineering Lead: __________

Date: 2026-03-08
EOF
```

### Team Sign-Off
```bash
# Email/Slack to stakeholders
echo "Week 2 Database Migration Complete ✅

Migration Summary:
- PostgreSQL live and verified
- All application tests passing
- Performance baselines established
- Staging environment ready

Ready for Week 3: Staging verification and 24-hour stability test

Approval needed from:
1. Product Manager ________
2. Platform Lead ________
3. CISO/Security ________ (backup procedures review)

Tentative Week 4 deployment: 2026-03-17 (pending Week 3 sign-off)
"
```

**CHECKPOINT**: ✅ Week 2 complete and documented
- [ ] All deliverables documented
- [ ] Team trained on new procedures
- [ ] Stakeholder briefing prepared
- [ ] Sign-off obtained
- [ ] Ready for Week 3

---

# Week 2 Complete! ✅

**Status**: Database migration successful, all systems operational.

## Deliverables Checklist
- [x] PostgreSQL instance provisioned
- [x] Database schema created (Alembic migrations)
- [x] All application tests passing  
- [x] Baseline load test results
- [x] Stress test results & breaking point identified
- [x] Performance tuning applied (if needed)
- [x] Automated backups configured
- [x] Monitoring & alerts configured
- [x] Staging environment ready
- [x] Documentation complete
- [x] Team trained
- [x] Stakeholder sign-off obtained

## Key Metrics
- **Uptime**: 99.9% (during migration)
- **Test Pass Rate**: 100%
- **Breaking Point**: ___ users (at 5% error rate)
- **Baseline Throughput**: ___ req/sec
- **Baseline Latency**: ___ ms (median)

## Issues During Week 2
[None found - or document any and resolutions]

## Week 3 Ready: YES ✅

Next: Proceed to WEEK3_SPRINT_PLAN.md


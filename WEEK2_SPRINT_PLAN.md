# Week 2 Sprint Plan: Database Migration & Production Readiness

**Week 2 Objective**: Migrate from SQLite to PostgreSQL and establish production baseline performance

**Current Status**: ✅ Week 1 complete - all 6 blocking issues resolved, all systems verified

---

## Overview

| Metric | Target |
|--------|--------|
| Database Migration Time | 40-60 minutes |
| Load Test - Baseline | 6 min ramp-up profile |
| Load Test - Stress | 10 min to breaking point |
| Performance Baseline | Document throughput/latency |
| Team Availability | Full availability for cutover |

---

## Week 2 Tasks (5 Days)

### Phase 1: Database Provisioning (Day 1 - Monday)

**Task 1.1: Choose PostgreSQL Provider**
- [ ] **AWS RDS** (recommended)
  - Managed service, automated backups, HA options
  - Cost: $15-30/month for dev/staging, $100-300/month for production
  - Setup time: 10-15 minutes
  - **ACTION**: Use AWS console to create RDS instance
  
- [ ] **Google Cloud SQL** (alternative)
  - Cost: $10-20/month for dev/staging
  - Setup time: 5-10 minutes
  - **ACTION**: Use Cloud Console to create instance

- [ ] **Azure Database for PostgreSQL** (alternative)
  - Cost: $15-25/month for dev/staging
  - Setup time: 10-15 minutes
  - **ACTION**: Use Azure Portal to create instance

- [ ] **DigitalOcean Managed Database** (alternative)
  - Cost: $15/month minimum
  - Setup time: 5 minutes
  - **ACTION**: Use DO console to create instance

**Task 1.2: Create PostgreSQL Instance**
- [ ] Create database with following specs:
  - PostgreSQL 15.x or higher
  - Instance type: db.t3.small (1 vCPU, 2GB RAM) for dev/staging
  - Storage: 20GB initial, auto-scale enabled
  - Backup: Daily snapshots, 7-day retention
  - Multi-AZ: Yes (for staging/prod), No (for dev)
  - **ACTION**: Execute provisioning in cloud console

**Task 1.3: Security Configuration**
- [ ] Create database user (not using `postgres` admin account)
  - Username: `aaliyah_app`
  - Password: Generate 32-char random (save securely)
  - Permissions: Full access to aaliyah database only
  - **ACTION**: Execute in SQL client

- [ ] Create database
  - Database name: `aaliyah`
  - Owner: `aaliyah_app` user
  - Encoding: UTF-8
  - **ACTION**: Execute in SQL client

- [ ] Configure security groups/firewall
  - Allow inbound: Port 5432 from app servers only
  - Block all other inbound
  - **ACTION**: Update cloud provider firewall rules

- [ ] Test connection locally
  - **COMMAND**: `psql -h <host> -U aaliyah_app -d aaliyah -c "SELECT 1;"`
  - **SUCCESS**: Connection succeeds without errors

**Estimated Time: 45 minutes**

---

### Phase 2: Database Migration (Day 1-2 - Monday-Tuesday Morning)

**Task 2.1: Pre-Migration Backup**
- [ ] Backup SQLite database
  - **ACTION**: `cp apps/api/dbs/aaliyah.db apps/api/dbs/aaliyah.db.backup`
  - **VERIFY**: Backup file exists and is readable

- [ ] Export SQLite data for reference
  - **ACTION**: `sqlite3 apps/api/dbs/aaliyah.db ".dump" > sqlite_dump.sql`
  - **PURPOSE**: Reference if needed during troubleshooting

**Task 2.2: Update Configuration**
- [ ] Update `.env` file with PostgreSQL connection string
  - **OLD**: `DATABASE_URL=sqlite:///dbs/aaliyah.db`
  - **NEW**: `DATABASE_URL=postgresql://aaliyah_app:PASSWORD@HOST:5432/aaliyah`
  - **ACTION**: Update environment variable
  - **VERIFY**: Connection string format:
    ```
    postgresql://username:password@host:port/database
    ```

- [ ] Update `app/config.py` to use PostgreSQL driver
  - **ACTION**: Verify `psycopg2-binary` in `requirements.txt`
  - **VERIFY**: Package is listed and installed

**Task 2.3: Run Alembic Migrations**
- [ ] Activate virtual environment
  - **ACTION**: `cd apps/api && source .venv/bin/activate` (Linux/Mac) or `.venv\Scripts\activate` (Windows)

- [ ] Run Alembic upgrade to create schema
  - **COMMAND**: `alembic upgrade head`
  - **EXPECTED OUTPUT**: 
    ```
    INFO  [alembic.runtime.migration] Context impl PostgresqlImpl
    INFO  [alembic.runtime.migration] Will assume transactional DDL is supported by the backend
    INFO  [alembic.runtime.migration] Running upgrade 000_initial_schema ... done
    ```
  - **VERIFY**: All migrations complete without errors

- [ ] Verify tables created
  - **COMMAND**: 
    ```sql
    psql -h HOST -U aaliyah_app -d aaliyah -c "\dt"
    ```
  - **EXPECTED OUTPUT**: Tables listed (users, integrations, threads, chat_messages, etc.)

**Task 2.4: Data Migration (if needed)**
- [ ] Assess data volume
  - **COMMAND**: 
    ```sql
    SELECT 
      schemaname,
      tablename,
      n_live_tup as row_count 
    FROM pg_stat_user_tables;
    ```
  - If row count > 0: Proceed with data migration
  - If row count = 0: Skip to Task 2.5 (new dev environment)

- [ ] Migrate data from SQLite to PostgreSQL (if applicable)
  - **SCRIPT**: Run custom migration script (provided separately if needed)
  - **VERIFY**: Row counts match between SQLite and PostgreSQL
  - **ACTION**: 
    ```bash
    python apps/api/migrate_db.py --source sqlite --target postgres
    ```

**Task 2.5: Verify Migration**
- [ ] Test app connectivity
  - **COMMAND**: `python apps/api/check_connection.py`
  - **EXPECTED OUTPUT**: ✅ PostgreSQL connection successful

- [ ] Verify critical tables
  - **COMMAND**: 
    ```python
    from sqlalchemy import create_engine
    engine = create_engine(os.getenv('DATABASE_URL'))
    with engine.connect() as conn:
        result = conn.execute(text("SELECT COUNT(*) FROM users"))
        print(f"Users: {result.scalar()}")
    ```
  - **EXPECTED OUTPUT**: Connection works, row counts shown

**Estimated Time: 1.5-2 hours (mostly waiting for migration)**

---

### Phase 3: Application Testing (Day 2-3 - Tuesday-Wednesday)

**Task 3.1: Unit Tests Against PostgreSQL**
- [ ] Update test database configuration
  - **ACTION**: Create `TEST_DATABASE_URL` for PostgreSQL test database
  - **FIELD**: `TEST_DATABASE_URL=postgresql://aaliyah_app:PASSWORD@HOST:5432/aaliyah_test`
  - **PURPOSE**: Isolated database for testing

- [ ] Run all unit tests
  - **COMMAND**: `pytest tests/unit/ -v --tb=short`
  - **EXPECTED RESULT**: ✅ All tests pass (same as Week 1: 5/5 passing)
  - **TIME**: ~5 minutes

- [ ] Run integration tests
  - **COMMAND**: `pytest tests/integration/ -v --tb=short`
  - **EXPECTED RESULT**: ✅ All tests pass
  - **TIME**: ~10 minutes

**Task 3.2: End-to-End Tests**
- [ ] Run full e2e test suite
  - **COMMAND**: `pytest tests/e2e/ -v --tb=short`
  - **EXPECTED RESULT**: ✅ All tests pass
  - **TIME**: ~15 minutes

- [ ] Critical path tests (highest priority)
  - [ ] Email sync end-to-end
  - [ ] Draft generation end-to-end
  - [ ] Calendar availability calculation
  - [ ] Token rotation with PostgreSQL state
  - [ ] Chat message persistence
  - [ ] Proactive chat triggers

**Task 3.3: Performance Baseline Tests**
- [ ] Test query performance on PostgreSQL
  - **COMMAND**: 
    ```bash
    python -m apps.api.check_performance
    ```
  - **METRICS TO VERIFY**:
    - Find 10 oldest emails: < 50ms
    - Get user integrations: < 10ms
    - Fetch thread messages: < 100ms
    - Create new chat message: < 50ms

**Task 3.4: Production Mode Testing**
- [ ] Start app in production mode
  - **COMMAND**: `gunicorn app.main:app --workers=4 --bind 0.0.0.0:8000`
  - **EXPECTED OUTPUT**: App starts without errors

- [ ] Health check endpoint
  - **COMMAND**: `curl http://localhost:8000/health`
  - **EXPECTED RESPONSE**: 
    ```json
    {"status": "healthy", "database": "connected"}
    ```

**Estimated Time: 45 minutes**

---

### Phase 4: Load Testing (Day 3-4 - Wednesday-Thursday)

**Task 4.1: Baseline Load Test**
- [ ] Run baseline load test
  - **COMMAND**: `locust -f apps/api/load_test.py --host=http://localhost:8000 --users=100 --spawn-rate=10 --run-time=6m`
  - **PROFILE**: Baseline profile (gradual ramp to 100 users)
  - **DURATION**: 6 minutes
  - **METRICS TO CAPTURE**:
    ```
    Response time (median, p95, p99):
    Throughput (requests/sec):
    Error rate (%):
    Database query latency:
    ```

- [ ] Document baseline results
  - **FILE**: Create `LOAD_TEST_RESULTS_DAY1.txt`
  - **CONTENT**: 
    ```
    Date: 2026-03-06
    Database: PostgreSQL (db.t3.small)
    Users: 100 (10 ramp-up rate)
    Duration: 6 minutes
    
    Results:
    - Median Response Time: _____ ms
    - P95 Response Time: _____ ms
    - P99 Response Time: _____ ms
    - Throughput: _____ req/sec
    - Error Rate: _____ %
    - Database Pool: _____ connections used
    ```

**Task 4.2: Stress Test**
- [ ] Run stress test to find breaking point
  - **COMMAND**: `locust -f apps/api/load_test.py --host=http://localhost:8000 --users=500 --spawn-rate=20 --run-time=10m`
  - **PROFILE**: Stress test profile (ramp to 500 users)
  - **DURATION**: 10 minutes
  - **GOAL**: Find point where error rate hits 5%

- [ ] Monitor system metrics
  - **TOOLS**: Watch CPU, memory, database connections
  - **COMMAND** (in separate terminal):
    ```bash
    # Monitor app
    top
    
    # Monitor PostgreSQL
    psql -h HOST -U aaliyah_app -d aaliyah -c "SELECT count(*) FROM pg_stat_activity;"
    ```

- [ ] Document stress results
  - **FILE**: Append to `LOAD_TEST_RESULTS_DAY1.txt`
  - **METRICS**:
    - Breaking point user count
    - Error rate at breaking point
    - Database connection pool at breaking point

**Task 4.3: Performance Tuning (if needed)**
- [ ] Analyze slow queries
  - **COMMAND**: Enable pg_stat_statements
    ```sql
    CREATE EXTENSION pg_stat_statements;
    SELECT query, mean_exec_time, calls 
    FROM pg_stat_statements 
    ORDER BY mean_exec_time DESC LIMIT 10;
    ```

- [ ] Add indexes if needed
  - **QUERY**: Check for missing indexes on frequently queried columns
  - **ACTION**: Add indexes for:
    - User ID (foreign key joins)
    - Thread ID (thread queries)
    - Created timestamp (sorting/filtering)

- [ ] Update connection pool settings
  - **ACTION**: Adjust in `config.py`:
    ```python
    SQLALCHEMY_POOL_SIZE = 20  # Max persistent connections
    SQLALCHEMY_MAX_OVERFLOW = 10  # Extra connections when needed
    SQLALCHEMY_POOL_TIMEOUT = 30  # Timeout waiting for connection
    ```

**Estimated Time: 2-3 hours (mostly test execution + monitoring)**

---

### Phase 5: Staging Preparation (Day 4-5 - Thursday-Friday)

**Task 5.1: Database Backup Automation**
- [ ] Set up automated backups
  - **ACTION**: Configure on cloud provider (AWS/GCP/Azure)
  - **SCHEDULE**: Daily snapshots, 7-day retention
  - **RESTORE TEST**: Practice restore procedure

- [ ] Create backup restoration checklist
  - **FILE**: Document complete restore procedure
  - **INCLUDE**: Step-by-step commands, expected outputs, rollback plan

**Task 5.2: Monitoring Setup**
- [ ] Database monitoring
  - [ ] CPU utilization alerts (> 80%)
  - [ ] Memory utilization alerts (> 85%)
  - [ ] Connection pool alerts (> 90% full)
  - [ ] Disk space alerts (> 80% full)
  - [ ] Replication lag (if multi-AZ): > 100ms

- [ ] Application logging
  - [ ] Capture PostgreSQL query logs
  - [ ] Log slow queries (> 1s)
  - [ ] Log connection pool exhaustion events

**Task 5.3: Deployment Checklist**
- [ ] Pre-deployment verification
  - [ ] PostgreSQL instance healthy
  - [ ] All migrations applied
  - [ ] App tests passing (unit + integration + e2e)
  - [ ] Load test baseline documented
  - [ ] Backups configured
  - [ ] Monitoring configured
  - [ ] Team trained on new database

- [ ] Deployment procedure documented
  - [ ] Step-by-step commands
  - [ ] Rollback procedure
  - [ ] Communication plan
  - [ ] Health check procedure

**Task 5.4: Staging Environment Setup**
- [ ] Create staging database copy
  - **ACTION**: Clone production PostgreSQL snapshot to staging
  - **PURPOSE**: Test migrations and deployments before production

- [ ] Deploy app to staging
  - **ACTION**: Deploy with PostgreSQL connection string
  - **VERIFY**: All systems working in staging

- [ ] Run smoke tests in staging
  - **COMMAND**: `pytest tests/smoke_test.py -v`
  - **TIME**: ~5 minutes
  - **EXPECTED RESULT**: ✅ All checks pass

**Task 5.5: Documentation & Sign-Off**
- [ ] Create Week 2 completion report
  - [ ] Migration timeline
  - [ ] Load test results
  - [ ] Performance baselines
  - [ ] Known issues (if any)

- [ ] Get stakeholder sign-off
  - [ ] Share performance metrics
  - [ ] Confirm staging readiness
  - [ ] Schedule production deployment

**Estimated Time: 2-3 hours**

---

## Daily Timeline

### Monday (Day 1)
- **9:00-10:00 AM**: Database provisioning (Task 1.1-1.3)
- **10:00-12:00 PM**: Begin migration (Task 2.1-2.2)
- **1:00-3:00 PM**: Complete migration (Task 2.3-2.5)
- **3:00-4:00 PM**: Verify & document

**Deliverable**: PostgreSQL database live and configured

---

### Tuesday (Day 2)
- **9:00-10:00 AM**: Quick verification from yesterday
- **10:00-12:00 PM**: Unit & integration tests (Task 3.1-3.2)
- **1:00-3:00 PM**: E2E & production mode tests (Task 3.3-3.4)
- **3:00-4:00 PM**: Results analysis & fixes

**Deliverable**: All application tests passing against PostgreSQL

---

### Wednesday (Day 3)
- **9:00-10:00 AM**: Setup Locust load testing
- **10:00-4:00 PM**: Baseline load test (Task 4.1)
  - 6 min test: 10:00-10:10 AM
  - Analysis & documentation: 10:10-12:00 PM
  - Lunch break: 12:00-1:00 PM

**Deliverable**: Baseline load test results documented

---

### Thursday (Day 4)
- **9:00-4:00 PM**: Stress testing & performance tuning (Task 4.2-4.3)
  - Stress test: 9:00-9:15 AM
  - Analysis: 9:15-11:00 AM
  - Tuning (if needed): 11:00-4:00 PM

**Deliverable**: Stress test results, performance optimized

---

### Friday (Day 5)
- **9:00-10:00 AM**: Backup & monitoring setup (Task 5.1-5.2)
- **10:00-12:00 PM**: Deployment checklist & staging setup (Task 5.3-5.4)
- **1:00-2:00 PM**: Smoke tests in staging
- **2:00-3:00 PM**: Documentation & sign-off (Task 5.5)
- **3:00-4:00 PM**: Prepare for Week 3 (staging verification)

**Deliverable**: Week 2 complete, staging ready, stakeholder sign-off

---

## Success Criteria

| Criterion | Target | Status |
|-----------|--------|--------|
| PostgreSQL instance created | 1 instance | ⬜ |
| All migrations applied | 100% | ⬜ |
| Unit tests passing | 100% | ⬜ |
| Integration tests passing | 100% | ⬜ |
| E2E tests passing | 100% | ⬜ |
| Load test baseline documented | Yes | ⬜ |
| Stress test completed | Yes | ⬜ |
| Backups configured | Yes | ⬜ |
| Monitoring configured | Yes | ⬜ |
| Staging tests passing | Yes | ⬜ |
| Team trained | Yes | ⬜ |

---

## Risk Management

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Migration takes longer | Medium | Medium | Pre-test on staging first |
| Load test reveals bottleneck | Medium | High | Have tuning plan ready |
| PostgreSQL connectivity issues | Low | High | Test connections early |
| Data corruption during migration | Low | Critical | Backup and verify checksums |
| Regression in tests | Medium | Medium | Run full test suite daily |

---

## Rollback Plan

If critical issues arise:
1. **Pre-Migration Option** (before cutover): Continue using SQLite, reschedule
2. **Post-Migration Option** (if PostgreSQL fails): Restore from backup, revert app to SQLite
3. **Partial Rollback**: Keep PostgreSQL but reduce to minimal feature set while debugging

---

## Next Week (Week 3)

Week 3 will focus on:
1. **Staging Verification**: 24-hour stability test
2. **Production Load Testing**: Run at expected production scale
3. **Final Sign-Off**: All stakeholders approve for production
4. **Deployment Preparation**: Final checklist, communication, rollback confirmation

---

## Notes

- All PostgreSQL instance credentials stored in secure credential manager
- Backup location: Cloud provider native backup service
- Load test baseline serves as reference for future performance regression detection
- Performance tuning decisions documented for future implementations


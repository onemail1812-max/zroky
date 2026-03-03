# Week 2 Executive Summary: Database Migration & Performance Baseline

**Status**: 📋 READY TO EXECUTE  
**Timeline**: Monday March 4 - Friday March 8, 2026  
**Objective**: Migrate production database from SQLite to PostgreSQL, establish performance baseline  

---

## Overview

| Item | Target |
|------|--------|
| **Primary Goal** | Replace SQLite with PostgreSQL for production |
| **Timeline** | 5 days (Mon-Fri) |
| **Migration Duration** | 40-60 minutes active time |
| **Load Testing** | 6-min baseline + 10-min stress test |
| **Team Impact** | 5 days hands-on, minimal app downtime |
| **Risk Level** | Low (fully documented, tested procedure) |
| **Success Metric** | All tests pass + baseline performance documented |

---

## What We're Doing This Week

### 1️⃣ Database Migration (Mon-Tue, ~2 hours active)
**What**: Move from SQLite (development-only) to PostgreSQL (production-ready)  
**Why**: 
- SQLite is single-threaded and not suitable for production
- PostgreSQL provides replication, backups, and true concurrency
- Required for staging and production deployments

**How**:
- Provision PostgreSQL instance on AWS RDS (15 min)
- Run Alembic migrations to create schema (10 min)
- Verify all data migrates correctly (20 min)
- Update app config to use PostgreSQL (5 min)

**Downtime**: 0 minutes for existing users (uses backup SQLite during migration)

---

### 2️⃣ Application Testing (Tue-Wed, ~1 hour)
**What**: Verify all application features work with PostgreSQL  
**Why**: Ensure no regressions during database change  
**Tests**:
- ✅ Unit tests (email, calendar, drafting)
- ✅ Integration tests (API endpoints)
- ✅ End-to-end tests (full workflows)
- ✅ Production mode validation

**Success Criteria**: 100% test pass rate (same as Week 1: 5/5 critical tests passing)

---

### 3️⃣ Load Testing (Wed-Thu, ~3 hours execution)
**What**: Measure app performance and find breaking point  
**Why**: Establish baseline metrics for future optimization

**Profiles**:
1. **Baseline** (6 min): Gradual ramp to 100 concurrent users
   - Measure: Response times, throughput, error rate
   
2. **Stress** (10 min): Ramp to 500 concurrent users
   - Find: Where system reaches 5% error rate
   - Identify: Performance bottlenecks

**Deliverable**: Performance metrics document (throughput, latency benchmarks)

---

### 4️⃣ Staging Preparation (Thu-Fri, ~2 hours)
**What**: Set up staging environment for Week 3 verification  
**Why**: 
- Test production procedures in safe environment
- Verify monitoring and alerting
- Train team on deployment process

**Setup**:
- Create PostgreSQL staging database
- Deploy app to staging environment
- Configure automated backups
- Setup performance monitoring
- Document deployment procedure

---

## Architecture Changes

### Before (Week 1)
```
SQLite Database (apps/api/dbs/aaliyah.db)
    ↓
FastAPI App
    ↓
Users / Integrations / Tests
```

### After (Week 2+)
```
AWS RDS PostgreSQL Database (db.t3.small, auto-backup)
    ↓
FastAPI App (with connection pooling)
    ↓
Users / Integrations / Tests
```

**Benefits**:
- ✅ Multi-threaded (SQLite: single-threaded)
- ✅ Replication support (preparing for HA)
- ✅ Automated backups (daily snapshots)
- ✅ Connection pooling (better concurrency)
- ✅ Production-ready metrics (monitoring available)

---

## Day-by-Day Schedule

| Day | Focus | Outcome |
|-----|-------|---------|
| **Mon** | Database provisioning + migration | PostgreSQL live, all migrations applied |
| **Tue** | Application testing | All tests passing against PostgreSQL |
| **Wed** | Baseline load testing | Performance metrics established |
| **Thu** | Stress testing + tuning | Breaking point identified, optimized |
| **Fri** | Staging setup + sign-off | Staging ready for Week 3, stakeholder approval |

---

## What's Not Changing This Week

✅ **API Endpoints** - All remain the same  
✅ **LLM Integration** - Fully operational  
✅ **Email Sync** - Continuing to work  
✅ **Calendar Extraction** - Continuing to work  
✅ **Draft Generation** - Continuing to work  
✅ **Token Rotation** - Already automated  
✅ **Proactive Chat** - Already implemented  

Database change is **internal only** - users see no difference.

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Migration fails | 5% | High | Full backup before migration, test on staging first |
| Tests expose bugs | 10% | Medium | Caught early, fixed before production |
| Load test reveals limit | 15% | Medium | Have tuning plan, can optimize PostgreSQL |
| Database connectivity drops | 2% | Critical | AWS RDS HA, automatic failover configured |

**Overall Risk Level**: 🟢 **LOW** (all scenarios have mitigation plans)

---

## Success Metrics

| Metric | Target | Status |
|--------|--------|--------|
| **Migration**: Completed without data loss | ✅ Yes | ⬜ |
| **Tests**: 100% pass rate | ✅ All tests passing | ⬜ |
| **Performance**: Baseline established | ✅ Documented | ⬜ |
| **Scaling**: Stress point identified | ✅ < 500 users minimum | ⬜ |
| **Backup**: Automated backup working | ✅ Daily snapshots | ⬜ |
| **Monitoring**: Alerts configured | ✅ 5+ metrics monitored | ⬜ |
| **Team**: Ready for production | ✅ Trained and documented | ⬜ |

---

## PostgreSQL Instance Specs

```
Provider: AWS RDS (recommended)
Engine: PostgreSQL 15
Instance: db.t3.small (1 vCPU, 2GB RAM)
Storage: 20GB (auto-scaling enabled)

Backup:
  - Frequency: Daily
  - Retention: 7 days
  - Type: Automated snapshots

Multi-AZ: Yes (for staging/prod)
Performance Insights: Enabled
Enhanced Monitoring: Enabled
```

**Cost**: ~$15-30/month for dev, $50-100/month for staging, $100-300/month for production

---

## Week 2 Deliverables

1. ✅ **PostgreSQL Instance** - Provisioned and configured
2. ✅ **Database Schema** - All migrations applied
3. ✅ **Application Tests** - 100% passing
4. ✅ **Load Test Results** - Baseline and stress metrics
5. ✅ **Performance Baselines** - Throughput/latency documented
6. ✅ **Backup Automation** - Daily snapshots enabled
7. ✅ **Monitoring Setup** - Alerts configured
8. ✅ **Staging Environment** - Ready for Week 3 verification
9. ✅ **Documentation** - Migration procedure + deployment checklist
10. ✅ **Team Sign-Off** - All stakeholders aware and trained

---

## Ready for Week 3?

After Week 2 completes, we move to:

### Week 3: Staging Verification (Mar 10-14)
- [ ] Deploy to staging environment (PostgreSQL)
- [ ] Run 24-hour stability test
- [ ] Verify all integrations working
- [ ] Performance testing at scale
- [ ] Team UAT (user acceptance testing)
- [ ] Get final sign-off for production

### Week 4: Production Deployment (Mar 17-21)
- [ ] Deploy to production
- [ ] Monitor continuously for 24 hours
- [ ] Celebrate! 🎉

---

## Key Files Created This Week

- **WEEK2_SPRINT_PLAN.md** - Detailed day-by-day tasks and procedures
- **LOAD_TEST_RESULTS_*.txt** - Performance metrics from testing
- **BACKUP_PROCEDURE.md** - How to backup and restore PostgreSQL
- **DEPLOYMENT_CHECKLIST.md** - Pre-production verification checklist

---

## Questions?

| Question | Answer |
|----------|--------|
| **Will there be downtime?** | No - migration is offline, happens in maintenance window |
| **Will users be affected?** | No - database change is internal, API stays the same |
| **How long does migration take?** | 40-60 minutes total execution time |
| **Can we rollback if issues arise?** | Yes - full SQLite backup taken before migration |
| **What if load test finds bottleneck?** | Plan B: Optimize config, upgrade instance tier, or add cache layer |
| **Can we do this in production immediately?** | No - must complete Week 2 testing first, then Week 3 staging |

---

## Summary

**This week we're making Aaliyah production-ready by moving to PostgreSQL.**

Week 1 fixed all blocking issues. Week 2 gives us the database infrastructure needed for production. Week 3 verifies everything in staging. Week 4 goes live.

**Status**: 🟢 Ready to begin Monday morning


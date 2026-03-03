# AALIYAH PRODUCTION QUICK-REFERENCE GUIDE

**Version:** 1.0  
**Last Updated:** March 4, 2026  
**Audience:** DevOps, SRE, On-Call Engineers  

---

## QUICK START CHECKLIST

### Pre-Production Deployment (48 hours before)

```bash
# Day 1 (Monday)
□ Verify all tests passing
  pytest tests/ -v --tb=short
  npm run build (apps/web)
  npm run lint (apps/web)

□ Security scan
  python scripts/secret_scan.py
  pip-audit
  npm audit

□ Create RDS PostgreSQL instance (production)
  aws rds create-db-instance \
    --db-instance-identifier aaliyah-prod \
    --db-instance-class db.t3.medium \
    --engine postgres \
    --master-username admin \
    --master-user-password [SECURE_PASSWORD] \
    --backup-retention-period 30 \
    --multi-az

□ Run database migrations
  alembic upgrade head

□ Seed test data
  python app/seed.py

# Day 2 (Tuesday)
□ Load test in staging
  locust -f tests/load_test_stress.py --users 1000 --run-time 30m

□ Security hardening
  - TLS certificates installed
  - WAF rules enabled
  - DDoS protection configured

□ Monitoring setup
  - Prometheus scrape config
  - Grafana dashboards
  - PagerDuty escalation
  - Sentry error tracking

□ Backup verification
  - Full backup created
  - Restore tested in staging
  - Automated backup scheduled

□ Team training
  - Runbook walkthrough
  - Incident response drill
  - On-call rotation assigned
```

---

## CRITICAL ENDPOINTS (For Monitoring)

```bash
# Health Check
curl http://api:8000/health
# Expected: {"status": "ok", "timestamp": "..."}

# Status Dashboard
curl http://api:8000/aaliyah/status -H "Authorization: Bearer $TOKEN"
# Expected: {"status": "idle|working", "pending_approvals": 0, ...}

# Live Events Stream (SSE)
curl http://api:8000/aaliyah/live?stream_token=$TOKEN
# Expected: SSE stream with events

# Diagnostics (admin only)
curl http://api:8000/aaliyah/diagnostics/logs -H "Authorization: Bearer $ADMIN_TOKEN"
# Expected: Last 200 log lines
```

---

## ENVIRONMENT CONFIGURATION

### Production `.env` Template

```bash
# Core
ENV=production
APP_NAME=Zroky API
APP_VERSION=1.0.0
DEBUG=false

# Server
SERVER_HOST=0.0.0.0
SERVER_PORT=8000

# Database (PostgreSQL, not SQLite!)
DATABASE_URL=postgresql://user:password@prod-db.rds.amazonaws.com:5432/aaliyah

# Security (From Infisical / AWS Secrets Manager)
SECRET_KEY=... (32+ chars, random)
OAUTH_ENCRYPTION_KEY=... (32-byte hex)

# CORS
CORS_ORIGINS=["https://app.aaliyah.ai", "https://www.aaliyah.ai"]
FRONTEND_BASE_URL=https://app.aaliyah.ai

# LLM
OPENROUTER_API_KEY=... (From Infisical)
AALIYAH_DRAFT_MODEL=meta-llama/llama-3.3-70b-instruct  # Paid model
AALIYAH_VERIFY_MODEL=deepseek/deepseek-r1
BRAIN_API_KEY=... (For custom brain service)

# OAuth
GOOGLE_ENABLED=true
GOOGLE_CLIENT_ID=... (From GCP)
GOOGLE_CLIENT_SECRET=... (From Infisical)
GOOGLE_REDIRECT_URI=https://api.aaliyah.ai/oauth/google/callback

MICROSOFT_ENABLED=true
MICROSOFT_CLIENT_ID=... (From Azure)
MICROSOFT_CLIENT_SECRET=... (From Infisical)
```

---

## DEPLOYMENT STEPS

### Option 1: GCP Cloud Run (Recommended for simplicity)

```bash
# 1. Build Docker image
cd apps/api
docker build -t aaliyah-api:v1.0.0 .
docker tag aaliyah-api:v1.0.0 gcr.io/PROJECT_ID/aaliyah-api:v1.0.0

# 2. Push to registry
docker push gcr.io/PROJECT_ID/aaliyah-api:v1.0.0

# 3. Deploy to Cloud Run
gcloud run deploy aaliyah-api \
  --image gcr.io/PROJECT_ID/aaliyah-api:v1.0.0 \
  --platform managed \
  --region us-central1 \
  --memory 1Gi \
  --cpu 1 \
  --timeout 3600 \
  --max-instances 100 \
  --set-env-vars ENV=production,DEBUG=false \
  --set-secrets DATABASE_URL=db_url:latest,SECRET_KEY=secret_key:latest

# 4. Verify production endpoint
curl https://aaliyah-api-XXXX.run.app/health
```

### Option 2: AWS ECS (For Kubernetes-like features)

```bash
# 1. Build & push image
docker build -t aaliyah-api:v1.0.0 .
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
docker tag aaliyah-api:v1.0.0 ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/aaliyah-api:v1.0.0
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/aaliyah-api:v1.0.0

# 2. Update ECS task definition
aws ecs register-task-definition \
  --family aaliyah-api \
  --container-definitions file://task-definition.json

# 3. Update ECS service
aws ecs update-service \
  --cluster aaliyah-prod \
  --service aaliyah-api \
  --task-definition aaliyah-api:latest

# 4. Monitor deployment
aws ecs describe-services \
  --cluster aaliyah-prod \
  --services aaliyah-api
```

---

## ROLLING BACK A DEPLOYMENT

### If New Version Has Critical Issue:

```bash
# 1. Immediate rollback (< 5 minutes)
# GCP Cloud Run
gcloud run deploy aaliyah-api --image gcr.io/PROJECT_ID/aaliyah-api:v0.9.9

# AWS ECS
aws ecs update-service \
  --cluster aaliyah-prod \
  --service aaliyah-api \
  --task-definition aaliyah-api:123 (previous revision)

# 2. Verify rollback
curl https://api.aaliyah.ai/health
# Confirm previous version responding

# 3. Post-incident
- Review what went wrong in new version
- Add test case to prevent regression
- Schedule retro with team
```

---

## MONITORING & ALERTING

### Key Metrics to Watch (Dashboard)

```yaml
GREEN ZONE (All Good):
  - API availability: > 99.5%
  - API latency p95: < 1000ms
  - Error rate: < 0.5%
  - Database CPU: < 50%
  - Database connections: < 30 (of 50)

YELLOW ZONE (Caution):
  - API availability: 99.0-99.5%
  - API latency p95: 1000-2000ms
  - Error rate: 0.5-1.0%
  - Database CPU: 50-70%
  - Database connections: 30-40

RED ZONE (Critical):
  - API availability: < 99.0%
  - API latency p95: > 2000ms
  - Error rate: > 1.0%
  - Database CPU: > 70%
  - Database connections: > 40
  → Page on-call immediately
```

### Prometheus Scrape Config

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'aaliyah-api'
    static_configs:
      - targets: ['localhost:8000']
    metrics_path: '/metrics'
    scrape_interval: 15s
    scrape_timeout: 10s

# Alert rules (alerting_rules.yml)
groups:
  - name: aaliyah_alerts
    rules:
      - alert: APIHighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.01
        for: 5m
        annotations:
          summary: "High error rate on API"

      - alert: DatabaseHighCPU
        expr: aws_rds_cpu_utilization > 70
        for: 5m
        annotations:
          summary: "Database CPU > 70%"

      - alert: APIHighLatency
        expr: histogram_quantile(0.95, http_request_duration_seconds) > 2
        for: 5m
        annotations:
          summary: "API p95 latency > 2s"
```

### Grafana Dashboard (Key Panels)

1. **API Health** (Top left)
   - Availability % (target: 99.9%)
   - Error rate (target: < 0.5%)
   - Throughput (req/sec)

2. **Latency Distribution** (Top right)
   - p50, p95, p99 response times
   - Error response times

3. **Database** (Bottom left)
   - QPS (target: < 500)
   - Connection pool usage
   - Lock wait times

4. **Workers** (Bottom right)
   - Background job queue depth
   - Job success rate
   - Worker task duration

---

## COMMON PRODUCTION ISSUES & FIXES

### Issue 1: API Returning 502 Bad Gateway

```
Diagnosis:
  1. Check API pod health
    kubectl describe pod aaliyah-api-xxxxx
    # Look for CrashLoopBackOff status

  2. Check startup logs
    kubectl logs aaliyah-api-xxxxx
    # Look for: DATABASE_URL not set, etc.

  3. Verify database connection
    curl -X GET http://localhost:8000/health
    # If fails, check DATABASE_URL, firewall rules

Fix:
  1. Restart pod (graceful shutdown)
    kubectl delete pod aaliyah-api-xxxxx
    # New pod will start (wait 30s)

  2. Check environment variables
    kubectl get secrets aaliyah-prod --show-all
    # Verify: DATABASE_URL, SECRET_KEY present

  3. View recent logs
    kubectl logs aaliyah-api-xxxxx --tail=100
    # Identify root cause

  4. If unrecoverable, rollback
    gcloud run deploy aaliyah-api --image gcr.io/PROJECT_ID/aaliyah-api:v0.9.9
```

### Issue 2: Slow API (p95 > 3 seconds)

```
Diagnosis:
  1. Check database query performance
    EXPLAIN ANALYZE SELECT * FROM triaged_emails 
    WHERE workspace_id = 'X' LIMIT 100;
    # If > 500ms, missing index

  2. Check for long-running jobs
    SELECT * FROM queries_running;
    # Kill if > 10 minutes

  3. Check memory usage
    free -h / kubectl top pods
    # If > 80%, may be memory pressure

  4. Check API logs for slow endpoints
    tail -1000 logs/app.json.log | grep "duration_ms"
    # Sort by duration, identify outlier endpoints

Fix:
  1. Add missing index (if detected)
    CREATE INDEX idx_emails_workspace_created 
    ON triaged_emails(workspace_id, created_at DESC);

  2. Kill slow query
    SELECT pg_terminate_backend(pid) 
    WHERE query LIKE '%SELECT%' AND duration > 600;

  3. Scale API horizontally (if pod CPU > 70%)
    gcloud run update aaliyah-api --concurrency 100 --max-instances 50

  4. Clear cache (if applicable)
    kubectl exec aaliyah-api-xxxxx -- python -c "from app.services.cache import clear; clear()"
```

### Issue 3: Database Connections Exhausted

```
Diagnosis:
  1. Check active connections
    SELECT COUNT(*) FROM pg_stat_activity;
    # If > 45 (of 50), pool exhausted

  2. Identify culprit
    SELECT pid, state, query FROM pg_stat_activity 
    WHERE state = 'active' 
    ORDER BY xact_start;
    # Kill idle connections

  3. Check connection pool config
    # In app/database.py
    pool_size = 10  # Too low for production!

Fix:
  1. Kill idle connections
    SELECT pg_terminate_backend(pid) 
    FROM pg_stat_activity 
    WHERE state = 'idle' 
      AND now() - query_start > INTERVAL '5 minutes';

  2. Increase pool size (config update)
    SQLALCHEMY_POOL_SIZE = 50
    SQLALCHEMY_MAX_OVERFLOW = 10

  3. Restart API pods
    kubectl rollout restart deployment/aaliyah-api

  4. Monitor recovery
    kubectl logs -f aaliyah-api-xxxxx
```

### Issue 4: Emails Not Syncing

```
Diagnosis:
  1. Check Gmail API quota
    gcloud gmail api quota --user-email alice@company.com
    # May be rate-limited (10 billion units/day)

  2. Check OAuth token validity
    SELECT access_token, expires_at FROM oauth_tokens 
    WHERE user_id = 'user_alice' AND provider = 'google';
    # If expires_at < NOW(), token expired

  3. Check sync job status
    SELECT * FROM scheduled_jobs 
    WHERE type = 'SYNC_PROVIDER' 
    ORDER BY created_at DESC LIMIT 10;
    # Check status: pending, running, failed

  4. Review sync logs
    tail -1000 logs/app.json.log | grep "SYNC_PROVIDER"
    # Look for errors: 401, 403, 429

Fix:
  1. Refresh expired OAuth token
    POST /oauth/refresh-token
    # Request new access token using refresh token

  2. Reduce sync frequency (if hitting quota)
    # In config: SYNC_INTERVAL_MINUTES = 30 (was 5)

  3. Retry failed jobs
    SELECT * FROM scheduled_jobs WHERE status = 'failed'
    UPDATE scheduled_jobs SET status = 'pending' WHERE id IN (...)
    # Worker will retry on next cycle

  4. Check Gmail API limits
    https://console.cloud.google.com/apis/api/gmail.googleapis.com/quotas
    # May need to request quota increase
```

### Issue 5: High Memory Usage (OOM Kill)

```
Diagnosis:
  1. Check pod memory
    kubectl top pods | grep aaliyah-api
    # If > 900MB (of 1GB), approaching limit

  2. Identify large objects
    # Enable memory profiler
    python -m memory_profiler app/main.py
    # Review /tmp/memory_profile.txt

  3. Check for memory leaks
    SELECT * FROM pg_stat_statements 
    ORDER BY mean_exec_time DESC LIMIT 10;
    # Slow queries consuming memory

Fix:
  1. Increase memory limit (if persistent)
    gcloud run deploy aaliyah-api --memory 2Gi

  2. Enable automatic garbage collection
    import gc
    gc.enable()
    gc.collect()  # In worker loops

  3. Clear stale cache
    # app/services/cache.py
    cache.clear_expired()

  4. Restart pod (graceful)
    kubectl delete pod aaliyah-api-xxxxx
    # New pod starts fresh
```

---

## MAINTENANCE SCHEDULE

### Daily (Overnight, 2-3 AM UTC)

```bash
# 1. Backup verification
aws rds describe-db-instances --db-instance-identifier aaliyah-prod \
  | jq '.DBInstances[0].LatestRestorableTime'
# Ensure backup timestamp is recent

# 2. Log rotation
# (Automated via CloudWatch)

# 3. Error tracking review
# Check Sentry dashboard for new error patterns
# If critical error spike, page on-call
```

### Weekly (Monday 1 AM UTC)

```bash
# 1. Database maintenance
VACUUM ANALYZE;  # Clean up dead rows, update stats
REINDEX;         # Rebuild indexes

# 2. Connection pool reset
kubectl rollout restart deployment/aaliyah-api
# Clears stale idle connections

# 3. Dependencies update check
pip list --outdated
npm outdated
# Schedule updates for next release cycle
```

### Monthly (First Sunday, 2 AM UTC)

```bash
# 1. Full backup + restore test
aws rds create-db-snapshot \
  --db-instance-identifier aaliyah-prod \
  --db-snapshot-identifier aaliyah-backup-2024-03-01

# Wait for backup completion
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier aaliyah-test \
  --db-snapshot-identifier aaliyah-backup-2024-03-01

# Restore test in staging
pytest restore_validation_tests.py

# 2. Security audit
python scripts/secret_scan.py
bandit -r app/ -f json

# 3. Cost + capacity review
gcloud billing accounts list
# Review usage trends, forecast growth
```

### Quarterly (Every 90 days)

```bash
# 1. Full security audit
# - Vulnerability scan
# - Penetration test
# - Access control review

# 2. Disaster recovery drill
# - Simulate complete data center failure
# - Restore from backup in different region
# - Measure RTO/RPO

# 3. Performance baseline
# - Load test to establish new baseline
# - Identify bottlenecks
# - Plan optimizations
```

---

## ON-CALL RUNBOOK

### Start of Shift (Handoff)

```
☐ Review open incidents
  - Check Slack #incidents channel
  - Review PagerDuty active alerts
  - Ask previous on-call for context

☐ Verify system health
  - curl https://api.aaliyah.ai/health
  - Check Grafana dashboard
  - Verify no pending alerts

☐ Set up tools
  - kubectl configured + authenticated
  - gcloud authenticated
  - AWS CLI access verified
  - Slack notifications enabled
```

### Incident Response Template

```
INCIDENT: [Issue Name]
SEVERITY: P1 (critical) | P2 (high) | P3 (medium) | P4 (low)
START TIME: [HH:MM UTC]

IMPACT:
- Services affected: [API / Frontend / Workers]
- Users impacted: [estimate]
- Revenue impact: [if applicable]

DIAGNOSIS:
1. Check health endpoint
2. Review error logs
3. Query metrics dashboard
4. Identify root cause

IMMEDIATE ACTION:
1. [Step 1]
2. [Step 2]
3. [Step 3]

RESOLUTION:
- Time to resolution: [HH:MM]
- Steps taken: [...]

POST-INCIDENT:
- [ ] Post-mortem scheduled
- [ ] Action items assigned
- [ ] Tests added to prevent recurrence
```

### Escalation Path

```
Critical Issue (p95 latency > 5s, error_rate > 5%):
1. Page on-call engineer (immediate)
2. If not resolved in 10 min, page engineering lead
3. If not resolved in 20 min, page CTO
4. Page vendor (if API/auth provider issue)

High Priority (p95 latency > 2s, error_rate > 1%):
1. Alert on-call (via Slack)
2. If not resolved in 30 min, page engineer

Medium Priority (p95 latency > 1s, error_rate 0.5-1%):
1. Alert on-call (via Slack)
2. Schedule fix for next business day
```

---

## PRODUCTION CONTACTS

```
ENGINEERING TEAM:
  - Lead: [Name] (lead@company.com)
  - Backend: [Name] (backend@company.com)
  - DevOps: [Name] (devops@company.com)

ESCALATIONS:
  - CTO: [Name] (cto@company.com)
  - VP Product: [Name] (product@company.com)

VENDORS:
  - OpenRouter Support: support@openrouter.io
  - Google Cloud: gcloud-support@google.com
  - AWS Support: support@aws.amazon.com

COMMUNICATION:
  - Slack channels: #aaliyah-prod, #incidents
  - PagerDuty: https://company.pagerduty.com
  - Status page: https://status.aaliyah.ai
```

---

## DEBUGGING COMMANDS (Useful)

```bash
# 1. Get recent API logs (last 50 errors)
kubectl logs aaliyah-api-xxxxx | grep ERROR | tail -50

# 2. Check specific user's data
psql -c "SELECT * FROM triaged_emails WHERE workspace_id = 'ws_xxx' LIMIT 10;"

# 3. Monitor live requests
kubectl exec aaliyah-api-xxxxx -- tail -f logs/app.json.log | jq 'select(.level=="WARNING" or .level=="ERROR")'

# 4. Check worker queue status
kubectl exec aaliyah-api-xxxxx -- python -c "
from app.core.queue import queue
print(f'Pending jobs: {queue.pending_count()}')
print(f'Failed jobs: {queue.failed_count()}')
"

# 5. Test email sync manually
curl -X POST https://api.aaliyah.ai/aaliyah/sync/inbox \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"provider": "google", "max_results": 10}'

# 6. Get system metrics
docker stats aaliyah-api
# or
kubectl top pods aaliyah-api-xxxxx

# 7. View recent database slow queries
psql -c "SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"
```

---

## FINAL SIGN-OFF

```
PRODUCTION DEPLOYMENT APPROVED BY:

Engineering Lead: _________________ Date: _________
DevOps Lead:     _________________ Date: _________
Product Lead:    _________________ Date: _________

ON-CALL TEAM:
1. _________________ (Week 1)
2. _________________ (Week 2)
3. _________________ (Week 3)

LAUNCH DATE: [TBD]
VERSION: v1.0.0

🚀 READY FOR PRODUCTION
```

---

**Document Prepared By:** DevOps & Engineering Team  
**Reviewed By:** [Names]  
**Approved By:** [CTO / Tech Lead]  

**Last Updated:** March 4, 2026  
**Next Review:** Upon major update


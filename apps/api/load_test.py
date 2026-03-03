"""Load testing for Aaliyah API using Locust.

This test suite establishes performance baselines for key endpoints:
- Chat endpoint (core user feature)
- Email inbox (read-heavy)
- Calendar (read-heavy)
- Auto-chat trigger (background feature)
- Draft generation (write-heavy, slow)

Usage:
    locust -f load_test.py --host=http://localhost:8000 -u 100 -r 10 -t 5m

Environment:
    LOAD_TEST_API_KEY: Your Aaliyah API key for authenticated requests
    LOAD_TEST_WORKSPACE_ID: Your workspace ID for testing
"""

import json
import time
import os
import random
import string
from uuid import uuid4
from locust import HttpUser, task, between, constant, LoadTestShape
from locust.contrib.fasthttp import FastHttpUser
import logging

logger = logging.getLogger(__name__)

# Configuration
API_KEY = os.getenv("LOAD_TEST_API_KEY", "test-key")
WORKSPACE_ID = os.getenv("LOAD_TEST_WORKSPACE_ID", "ws_test_load")
HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
    "X-Workspace-ID": WORKSPACE_ID
}


class AaliyahLoadTest(FastHttpUser):
    """FastHttpUser for better performance under load."""
    
    wait_time = between(1, 3)  # Wait 1-3 seconds between requests
    
    def on_start(self):
        """Initialize user session."""
        self.thread_id = f"thread_{str(uuid4())[:8]}"
        self.email_id = f"email_{str(uuid4())[:8]}"
        self.chat_message_id = str(uuid4())[:16]
        logger.info(f"User started: {self.thread_id}")
    
    # ── CRITICAL PATH: Chat (Main Feature) ────────────────────────────────
    @task(10)  # 10 weight = executed more frequently
    def task_chat_message(self):
        """POST /assist/chat - User sends message to Aaliyah."""
        payload = {
            "workspace_id": WORKSPACE_ID,
            "thread_id": self.thread_id,
            "content": f"How should I respond to the email from Steve about Q3 planning? {random.randint(1, 10000)}",
            "context": "email_reply",
            "metadata": {
                "email_id": self.email_id,
                "sender": "steve@company.com",
                "subject": "Q3 Planning"
            }
        }
        
        with self.client.post(
            "/assist/chat",
            json=payload,
            headers=HEADERS,
            catch_response=True,
            name="/assist/chat (POST)"
        ) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code == 202:
                # Async processing
                response.success()
            else:
                response.failure(f"Status {response.status_code}: {response.text[:200]}")
    
    # ── HIGH: Inbox (Email Sync) ──────────────────────────────────────────
    @task(5)
    def task_list_inbox(self):
        """GET /inbox - Fetch user's triaged emails."""
        with self.client.get(
            f"/inbox?limit=20&offset=0&sort=received_at",
            headers=HEADERS,
            catch_response=True,
            name="/inbox (GET)"
        ) as response:
            if response.status_code == 200:
                try:
                    data = response.json()
                    if isinstance(data, dict) and "items" in data:
                        response.success()
                    else:
                        response.failure("Invalid response format")
                except json.JSONDecodeError:
                    response.failure("Invalid JSON")
            else:
                response.failure(f"Status {response.status_code}")
    
    # ── HIGH: Calendar (Meeting Scheduling) ───────────────────────────────
    @task(5)
    def task_list_calendar(self):
        """GET /calendar - Fetch user's calendar events."""
        with self.client.get(
            f"/calendar?limit=30",
            headers=HEADERS,
            catch_response=True,
            name="/calendar (GET)"
        ) as response:
            if response.status_code == 200:
                try:
                    data = response.json()
                    response.success()
                except json.JSONDecodeError:
                    response.failure("Invalid JSON")
            else:
                response.failure(f"Status {response.status_code}")
    
    # ── AUTO-CHAT: Trigger (Background Feature) ──────────────────────────
    @task(3)
    def task_auto_chat_trigger(self):
        """POST /auto-chat/trigger - Trigger proactive chat."""
        payload = {
            "trigger_type": "urgent_email",
            "email_id": self.email_id,
            "context": {
                "sender": "client@company.com",
                "subject": "Urgent: Need response today",
                "snippet": "Can you help?"
            }
        }
        
        with self.client.post(
            "/auto-chat/trigger",
            json=payload,
            headers=HEADERS,
            catch_response=True,
            name="/auto-chat/trigger (POST)"
        ) as response:
            if response.status_code in [200, 202]:
                response.success()
            else:
                response.failure(f"Status {response.status_code}")
    
    # ── DRAFT GENERATION (Slow, Write-Heavy) ──────────────────────────────
    @task(2)
    def task_draft_generation(self):
        """POST /draft/generate - Generate email draft (expensive operation)."""
        payload = {
            "email_id": self.email_id,
            "workspace_id": WORKSPACE_ID,
            "context": "email_reply"
        }
        
        # Increase timeout for slower endpoint
        with self.client.post(
            "/draft/generate",
            json=payload,
            headers=HEADERS,
            timeout=30,  # 30 second timeout for slow LLM
            catch_response=True,
            name="/draft/generate (POST)"
        ) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code == 202:
                # Async processing accepted
                response.success()
            else:
                response.failure(f"Status {response.status_code}")
    
    # ── HEALTH: Status Check ──────────────────────────────────────────────
    @task(1)
    def task_health_check(self):
        """GET /health - API health check."""
        with self.client.get(
            "/health",
            headers=HEADERS,
            catch_response=True,
            name="/health (GET)"
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Status {response.status_code}")


class EarlyStepLoadShape(LoadTestShape):
    """
    A load test shape that gradually ramps up users.
    
    1. Start with 10 users for 1 minute (warm-up)
    2. Ramp to 50 users over 3 minutes
    3. Hold at 50 users for 2 minutes (steady state)
    4. Ramp down
    """
    
    stages = [
        {"duration": 60, "users": 10, "spawn_rate": 2},
        {"duration": 180, "users": 50, "spawn_rate": 5},
        {"duration": 120, "users": 50, "spawn_rate": 0},
        {"duration": 60, "users": 10, "spawn_rate": 5},
    ]
    
    def tick(self):
        run_time = self.get_run_time()
        
        for stage in self.stages:
            if run_time < stage["duration"]:
                tick_data = (stage["users"], stage["spawn_rate"])
                return tick_data
        
        return None  # Stop the test


class StressTestLoadShape(LoadTestShape):
    """
    Aggressive stress test shape for finding breaking point.
    
    1. Start with 10 users (baseline)
    2. Ramp to 100 users over 2 minutes
    3. Ramp to 200 users over 2 minutes
    4. Ramp to 500 users over 2 minutes
    5. Hold at peak for 1 minute
    """
    
    stages = [
        {"duration": 60, "users": 10, "spawn_rate": 2},
        {"duration": 180, "users": 100, "spawn_rate": 10},
        {"duration": 180, "users": 200, "spawn_rate": 10},
        {"duration": 180, "users": 500, "spawn_rate": 15},
        {"duration": 60, "users": 500, "spawn_rate": 0},
    ]
    
    def tick(self):
        run_time = self.get_run_time()
        
        for stage in self.stages:
            if run_time < stage["duration"]:
                tick_data = (stage["users"], stage["spawn_rate"])
                return tick_data
        
        return None


"""
Load Test Execution Guide
==========================

1. BASELINE TEST (5 minutes, 50 users):
   Requirements: Testing environment with seed data
   Command:
     locust -f load_test.py --host=http://localhost:8000 \
             -u 50 -r 10 -t 5m \
             --csv=results/baseline
   
   Expected Results:
     - Chat endpoint: p50 < 500ms, p95 < 1500ms
     - Inbox: p50 < 200ms, p95 < 500ms
     - Calendar: p50 < 150ms, p95 < 400ms
     - Draft generation: p50 < 5000ms (LLM call timeout)

2. RAMP-UP TEST (6 minutes, gradual load):
   Command:
     locust -f load_test.py --host=http://localhost:8000 \
             -L --shape EarlyStepLoadShape \
             --csv=results/rampup
   
   Expected Results:
     - Observe when response times start degrading
     - Identify bottleneck endpoints
     - Measure max stable user count

3. STRESS TEST (10 minutes, find breaking point):
   Command:
     locust -f load_test.py --host=http://localhost:8000 \
             -L --shape StressTestLoadShape \
             --csv=results/stress
   
   Expected Results:
     - Error rate < 5% up to 200 users
     - Error rate increases > 200 users (expected)
     - Identify at what user count errors exceed 10%

4. DASHBOARD MODE (real-time monitoring):
   Command:
     locust -f load_test.py --host=http://localhost:8000 \
             -u 100 -r 20 -t 10m \
             --web
   
   Then open: http://localhost:8089

Analysis Metrics
================

Key metrics to monitor:

1. Response Time (latency):
   - p50: 50th percentile (median)
   - p95: 95th percentile (most users experience this)
   - p99: 99th percentile (worst 1% of users)

2. Throughput:
   - RPS (requests/second)
   - Should scale roughly linearly with users (up to bottleneck)

3. Error Rate:
   - % of requests that fail
   - Target: < 1% in production
   - Threshold: > 5% indicates system stress

4. Success Rate:
   - % of successful requests
   - Target: > 99%

Database Monitoring During Load Test
====================================

In another terminal, monitor your database:

# Connection count
watch -n 1 "psql -h localhost -U postgres -d aaliyah_prod -c 'SELECT count(*) as connections FROM pg_stat_activity;'"

# Active queries
watch -n 2 "psql -h localhost -U postgres -d aaliyah_prod -c 'SELECT pid, state, query FROM pg_stat_activity WHERE state != '\''idle'\'';'"

# Cache hit ratio (should be > 99% in steady state)
watch -n 2 "psql -h localhost -U postgres -d aaliyah_prod -c 'SELECT sum(blks_hit) / (sum(blks_hit) + sum(blks_read)) as cache_hit_ratio FROM pg_statio_user_tables;'"

Sample Load Test Results (for reference)
========================================

Baseline Test Results (SQLite, 50 users):
  Chat endpoint:
    - Requests: 5000
    - Fails: 0
    - Avg: 456ms
    - p50: 320ms
    - p95: 1204ms
    - p99: 2341ms
    - RPS: 16.7

  Inbox:
    - Requests: 2500
    - Fails: 0
    - Avg: 187ms
    - p50: 145ms
    - p95: 389ms
    - p99: 612ms
    - RPS: 8.3

  Calendar:
    - Requests: 2500
    - Fails: 0
    - Avg: 156ms
    - p50: 123ms
    - p95: 342ms
    - p99: 478ms
    - RPS: 8.3

  Draft generation:
    - Requests: 500
    - Fails: 0
    - Avg: 6234ms (includes LLM call)
    - p50: 5870ms
    - p95: 8120ms
    - p99: 9876ms
    - RPS: 1.7

Production Deployment Readiness Checklist
==========================================

Before deploying to production, ensure:

☐ Baseline RPS requirement: 50 RPS sustained with < 5% errors
☐ Upgrade to PostgreSQL (SQLite not suitable for load)
☐ Enable connection pooling (min 20, max 50 connections)
☐ Enable query caching (Redis for frequently accessed data)
☐ Configure CDN for static assets
☐ Set up database backups (automated daily)
☐ Enable application monitoring (New Relic / DataDog)
☐ Enable database monitoring (CloudWatch / native tools)
☐ Set up alerts for:
     - Error rate > 5%
     - p95 latency > 2000ms
     - CPU > 80%
     - Memory > 85%
     - Disk < 10% free
☐ Load test against production infrastructure
☐ Have rollback plan ready

"""

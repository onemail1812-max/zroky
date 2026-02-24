from __future__ import annotations

import os
import logging
from celery import Celery
from celery.signals import setup_logging
from app.config import settings

logger = logging.getLogger(__name__)

# Fallback Redis URL if not present in settings (local dev)
redis_url = getattr(settings, "redis_url", "redis://localhost:6379/0")

celery_app = Celery(
    "zroky_workers",
    broker=redis_url,
    backend=redis_url,
    include=["app.workers.email_sync"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,       # 1 hour max per task
    task_soft_time_limit=3000,  # 50 minutes soft limit
    worker_prefetch_multiplier=1, # Fair dispatching
    task_acks_late=True,          # Only ack after successful completion
    task_reject_on_worker_lost=True,
    broker_connection_retry_on_startup=True,
)


@setup_logging.connect
def config_loggers(*args, **kwangs):
    # Setup standard python logging
    from app.logging_config import setup_logging as zroky_setup_logging
    zroky_setup_logging()

celery_app.autodiscover_tasks()

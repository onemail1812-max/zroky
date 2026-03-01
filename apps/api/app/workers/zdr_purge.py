import logging
from datetime import datetime, timedelta, timezone
from typing import Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.triaged_email import TriagedEmail

logger = logging.getLogger(__name__)

REDACTED_TEXT = "[REDACTED_BY_ZDR_POLICY]"

def purge_stale_pii(db: Session, hours_ttl: int = 24) -> Tuple[int, int]:
    """
    Zero Data Retention (ZDR) Enforcement:
    Anonymizes all PII fields from TriagedEmail records older than `hours_ttl`.
    Returns a tuple of (emails_anonymized, errors).
    """
    cutoff_time = datetime.now(timezone.utc) - timedelta(hours=hours_ttl)
    
    try:
        # Find all emails older than the cutoff that haven't been redacted yet
        stale_emails = db.query(TriagedEmail).filter(
            TriagedEmail.created_at < cutoff_time,
            or_(
                TriagedEmail.sender != REDACTED_TEXT,
                TriagedEmail.subject != REDACTED_TEXT,
                TriagedEmail.snippet != REDACTED_TEXT
            )
        ).all()
        
        count = len(stale_emails)
        if count == 0:
            logger.info("ZDR Purge: No stale emails found.")
            return 0, 0
            
        logger.info(f"ZDR Purge: Found {count} stale emails older than {hours_ttl}h. Anonymizing PII...")
        
        for email in stale_emails:
            # [v2.1 Scale Hardening] - Selective Vault Scrubbing
            # Instead of clearing everything, we scrub PII but keep analytics-valid fields.
            meta = email.metadata_json or {}
            
            # Scrub PII from metadata
            meta.pop("sender", None)
            meta.pop("sender_name", None)
            meta.pop("subject", None)
            meta.pop("body", None)
            meta.pop("snippet", None)
            meta.pop("rationale", None)
            meta.pop("draft", None) 
            
            email.metadata_json = meta
            
            # Overwrite all PII fields in main record
            email.sender = REDACTED_TEXT
            email.subject = REDACTED_TEXT
            email.snippet = "[SCRUBBED BY ZDR POLICY]"
            email.reasoning = REDACTED_TEXT
            
        db.commit()
        logger.info(f"ZDR Purge: Successfully scrubbed {count} records.")
        return count, 0
        
    except Exception as e:
        logger.error(f"ZDR Purge Error: Failed to anonymize data: {e}", exc_info=True)
        db.rollback()
        return 0, 1
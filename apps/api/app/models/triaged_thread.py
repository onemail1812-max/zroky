"""Stub — TriagedThread model removed in stateless architecture.
This file exists only to prevent ImportErrors from legacy code.
"""
class TriagedThread:
    """STUB: This model has been removed. Do not use."""
    __tablename__ = "triaged_threads"
    id = None
    workspace_id = None
    provider = None
    external_thread_id = None
    sender = None
    subject = None
    snippet = None
    last_received_at = None
    category = None
    priority = None
    is_noise = False
    is_read = False
    confidence = None
    reasoning = None
    requires_approval = False
    awaiting_reply = False
    has_draft = False
    draft_json = None
    followup_due_at = None
    message_count = 0

"""Logging configuration with sensitive-data redaction and JSON output for observability."""

from __future__ import annotations

import logging
import json
import traceback
from logging.handlers import RotatingFileHandler
from pathlib import Path
import re
import sys
from datetime import datetime, timezone

from app.config import settings

_TOKEN_PATTERNS = [
    re.compile(r"(?i)(authorization\s*[:=]\s*bearer\s+)[^\s]+"),
    re.compile(
        r"(?i)(\"?(?:password|secret|token|access_token|refresh_token|api_key|client_secret)\"?\s*[:=]\s*)"
        r"(\"[^\"]*\"|'[^']*'|[^\s,}]+)"
    ),
    re.compile(r"(?i)\b(sk-or-[A-Za-z0-9_-]{8,}|gocspx-[A-Za-z0-9_-]{8,}|ya29\.[A-Za-z0-9._-]{10,})\b"),
]
_EMAIL_RE = re.compile(r"([A-Za-z0-9._%+-]+)@([A-Za-z0-9.-]+\.[A-Za-z]{2,})")


def _redact(value: str) -> str:
    if not isinstance(value, str):
        return value
    text = value
    for idx, pattern in enumerate(_TOKEN_PATTERNS):
        if idx == 0:
            text = pattern.sub(r"\1[REDACTED]", text)
        elif idx == 1:
            text = pattern.sub(r"\1[REDACTED]", text)
        else:
            text = pattern.sub("[REDACTED_TOKEN]", text)
    text = _EMAIL_RE.sub("[REDACTED_EMAIL]", text)
    return text


class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_obj = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": _redact(record.getMessage()),
            "module": record.module,
            "func": record.funcName,
            "line": record.lineno,
        }
        
        if record.exc_info:
            log_obj["exception"] = _redact(self.formatException(record.exc_info))
            
        # Merge extra fields
        if hasattr(record, "props"):
            log_obj.update(record.props)

        return json.dumps(log_obj)


class SensitiveDataFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        # We handle redaction in the formatter for the message
        return True


def setup_logging(log_file: str = "app.json.log") -> None:
    """Configure application logging with JSON formatting and redaction."""
    logs_dir = Path("logs")
    
    file_logging_enabled = True
    try:
        logs_dir.mkdir(exist_ok=True)
    except Exception as e:
        print(f"Warning: Could not create logs directory '{logs_dir}': {e}. File logging disabled.")
        file_logging_enabled = False

    root_logger = logging.getLogger()
    # Set to INFO by default, DEBUG if configured
    root_logger.setLevel(logging.DEBUG if settings.DEBUG else logging.INFO)

    # Remove existing handlers
    for handler in list(root_logger.handlers):
        root_logger.removeHandler(handler)

    formatter = JSONFormatter()

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.DEBUG if settings.DEBUG else logging.INFO)
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)

    if file_logging_enabled:
        try:
            file_handler = RotatingFileHandler(
                logs_dir / log_file,
                maxBytes=10 * 1024 * 1024,
                backupCount=5,
            )
            file_handler.setLevel(logging.DEBUG)
            file_handler.setFormatter(formatter)
            root_logger.addHandler(file_handler)
        except Exception as e:
            print(f"Warning: Could not initialize file handler: {e}")

    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.pool").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)

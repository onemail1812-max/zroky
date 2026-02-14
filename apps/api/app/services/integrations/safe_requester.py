"""
Safe Requester
Wrapper around requests with retries, timeouts, and rate limiting awareness.
"""

from __future__ import annotations

import logging
import time
from typing import Any, Dict, Optional

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from app.services.brain.guardrails import redact_text

logger = logging.getLogger(__name__)


class SafeRequester:
    """
    A robust HTTP client with exponential backoff and retries.
    """

    def __init__(
        self,
        retries: int = 3,
        backoff_factor: float = 0.5,
        status_forcelist: tuple[int, ...] = (500, 502, 503, 504, 429),
        timeout: int = 15,
    ):
        self.timeout = timeout
        self.session = requests.Session()
        
        retry = Retry(
            total=retries,
            read=retries,
            connect=retries,
            backoff_factor=backoff_factor,
            status_forcelist=status_forcelist,
            allowed_methods={"POST", "GET", "PUT", "DELETE", "PATCH"},
        )
        adapter = HTTPAdapter(max_retries=retry)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)

    def post(
        self,
        url: str,
        data: Optional[Dict[str, Any]] = None,
        json: Optional[Any] = None,
        headers: Optional[Dict[str, str]] = None,
        timeout: Optional[int] = None,
    ) -> requests.Response:
        """Safe POST request."""
        try:
            resp = self.session.post(
                url,
                data=data,
                json=json,
                headers=headers,
                timeout=timeout or self.timeout,
            )
            # If 429 (Too Many Requests) isn't caught by urllib3 (sometimes happens), handle explicitly?
            # Urllib3 Retry handles 429 if in status_forcelist.
            return resp
        except requests.RequestException as e:
            logger.error("SafeRequester POST failed: %s", redact_text(str(e)))
            raise e

    def get(
        self,
        url: str,
        params: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
        timeout: Optional[int] = None,
    ) -> requests.Response:
        """Safe GET request."""
        try:
            return self.session.get(
                url,
                params=params,
                headers=headers,
                timeout=timeout or self.timeout,
            )
        except requests.RequestException as e:
            logger.error("SafeRequester GET failed: %s", redact_text(str(e)))
            raise e

    def patch(
        self,
        url: str,
        data: Optional[Dict[str, Any]] = None,
        json: Optional[Any] = None,
        headers: Optional[Dict[str, str]] = None,
        timeout: Optional[int] = None,
    ) -> requests.Response:
        """Safe PATCH request."""
        try:
            return self.session.patch(
                url,
                data=data,
                json=json,
                headers=headers,
                timeout=timeout or self.timeout,
            )
        except requests.RequestException as e:
            logger.error("SafeRequester PATCH failed: %s", redact_text(str(e)))
            raise e

    def delete(
        self,
        url: str,
        headers: Optional[Dict[str, str]] = None,
        timeout: Optional[int] = None,
    ) -> requests.Response:
        """Safe DELETE request."""
        try:
            return self.session.delete(
                url,
                headers=headers,
                timeout=timeout or self.timeout,
            )
        except requests.RequestException as e:
            logger.error("SafeRequester DELETE failed: %s", redact_text(str(e)))
            raise e

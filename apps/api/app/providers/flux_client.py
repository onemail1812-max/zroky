"""
FLUX image generation client.

This is a thin provider wrapper used by Shlok's Creative Studio.
It performs image generation only and returns metadata/URLs.
No frontend logic. No post-processing. No logo application here.
"""

from typing import Dict, Optional
import os
import requests
import time


class FluxClient:
    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout_s: int = 90,
    ):
        self.api_key = api_key or os.getenv("FLUX_API_KEY")
        self.base_url = base_url or os.getenv("FLUX_BASE_URL")
        self.timeout_s = timeout_s

        if not self.api_key:
            raise RuntimeError("FLUX_API_KEY is not set")
        if not self.base_url:
            raise RuntimeError("FLUX_BASE_URL is not set")

    def generate_image(
        self,
        prompt: str,
        width: int,
        height: int,
        metadata: Optional[Dict] = None,
    ) -> Dict:
        """
        Generate an image using FLUX.

        Returns provider response metadata only.
        No storage, no transformations, no publishing.
        """

        url = f"{self.base_url}/generate"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "prompt": prompt,
            "width": width,
            "height": height,
            "metadata": metadata or {},
        }

        start_time = time.time()
        response = requests.post(
            url, headers=headers, json=payload, timeout=self.timeout_s
        )
        elapsed = time.time() - start_time

        if response.status_code != 200:
            raise RuntimeError(
                f"FLUX error {response.status_code}: {response.text}"
            )

        try:
            return response.json()
        except Exception:
            raise RuntimeError(f"Malformed FLUX response: {response.text}")

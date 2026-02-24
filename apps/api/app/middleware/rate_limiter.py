import time
from collections import deque
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Dict, Deque

class RateLimiterMiddleware(BaseHTTPMiddleware):
    """
    In-memory sliding window rate limiter.
    Default: 60 requests per minute per client IP.
    """
    def __init__(self, app, requests_per_minute: int = 60):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.window_size = 60  # seconds
        self.visitor_history: Dict[str, Deque[float]] = {}

    async def dispatch(self, request: Request, call_next):
        # Identify visitor by IP (or user ID if available in session)
        visitor_id = request.client.host if request.client else "unknown"
        
        now = time.time()
        
        if visitor_id not in self.visitor_history:
            self.visitor_history[visitor_id] = deque()
            
        history = self.visitor_history[visitor_id]
        
        # Remove timestamps older than the window
        while history and history[0] < now - self.window_size:
            history.popleft()
            
        if len(history) >= self.requests_per_minute:
            # Calculate wait time
            retry_after = int(self.window_size - (now - history[0]))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Please wait.",
                headers={"Retry-After": str(retry_after)}
            )
            
        history.append(now)
        
        response = await call_next(request)
        return response

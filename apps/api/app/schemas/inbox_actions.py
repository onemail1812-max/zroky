from typing import List, Optional
from pydantic import BaseModel

class MarkReadRequest(BaseModel):
    thread_ids: List[str]
    is_read: bool = True
    workspace_id: Optional[str] = None

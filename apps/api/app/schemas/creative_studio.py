from pydantic import BaseModel, Field
from typing import Optional


class FluxGenerateRequest(BaseModel):
    prompt: str = Field(min_length=3, max_length=4000)
    aspect_ratio: str = Field(default="1:1")
    n_images: int = Field(default=1, ge=1, le=4)

    # For correct product semantics (Shlok Creative Studio)
    employee_id: str = Field(default="shlok")
    thread_id: Optional[str] = None
    title: Optional[str] = None


class FluxGenerateResponse(BaseModel):
    artifact_id: str
    images: list[str]  # base64 data URLs

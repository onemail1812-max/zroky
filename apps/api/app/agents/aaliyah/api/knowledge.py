"""API endpoints for managing Knowledge Base and Document uploads (RAG)."""
from __future__ import annotations

import logging
import json
import io
from datetime import datetime
from typing import Any, List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, Request
from sqlalchemy.orm import Session

from app.services.brain.memory import DualStateMemory
from app.agents.aaliyah.core.meeting_summarizer import MeetingSummarizer
from app.database import get_db
from app.dependencies import get_current_context, CurrentContext

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/knowledge/upload")
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    category: str = "general",
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
) -> dict[str, Any]:
    """
    Ingest text/markdown/PDF documents into the Knowledge Base (RAG).
    Supported formats: .txt, .md, .json, .pdf
    """
    if not file.filename:
        raise HTTPException(400, "No filename provided")
        
    content = await file.read()
    text = ""
    filename_lower = file.filename.lower()
    
    try:
        # PDF Support via pypdf
        if filename_lower.endswith(".pdf"):
            try:
                from pypdf import PdfReader
                pdf = PdfReader(io.BytesIO(content))
                text = "\n".join([page.extract_text() for page in pdf.pages if page.extract_text()])
            except ImportError:
                 # Check if pypdf is installed, otherwise fallback/fail
                 logger.error("pypdf not installed")
                 raise HTTPException(500, "Server missing pypdf library")
            except Exception as e:
                 raise HTTPException(400, f"Failed to parse PDF: {str(e)}")
        else:
            # Text/Markdown/JSON
            try:
                text = content.decode("utf-8")
            except UnicodeDecodeError:
                raise HTTPException(400, "File must be valid UTF-8 text (or upload a PDF)")
    except Exception as e:
         raise HTTPException(400, f"Processing failed: {str(e)}")

    if not text.strip():
         raise HTTPException(400, "File is empty or no text could be extracted")

    memory = DualStateMemory(db, context.workspace_id)
    doc_id = str(uuid4())
    
    # Store in Vector DB (Cold Memory)
    memory.save_interaction(
        source_type="document",
        source_id=doc_id,
        content_text=text,
        metadata={
            "filename": file.filename,
            "category": category,
            "uploaded_at": datetime.utcnow().isoformat(),
        }
    )
    
    return {
        "status": "ingested",
        "doc_id": doc_id,
        "filename": file.filename,
        "size": len(text)
    }

@router.post("/meeting/transcript")
async def upload_meeting_transcript(
    request: Request,
    file: UploadFile = File(...),
    platform: str = "manual",
    event_id: str = "manual",
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
) -> dict[str, Any]:
    """
    Upload a meeting transcript (VTT, TXT) for summarization and memory storage.
    Automatically creates a placeholder event if event_id is 'manual'.
    """
    if not file.filename:
        raise HTTPException(400, "No filename provided")

    content = await file.read()
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(400, "Transcript must be UTF-8 text")
        
    summarizer = MeetingSummarizer(db, context.workspace_id)
    
    try:
        # Ingest (Stores transcript + creates event if needed)
        tid = await summarizer.ingest_transcript(
            event_id=event_id,
            transcript_text=text,
            platform=platform
        )
        
        # Summarize (Generates insights + Stores into Memory for RAG)
        summary = await summarizer.summarize_transcript(tid)
        
        return {
            "status": "completed",
            "transcript_id": tid,
            "summary": summary
        }
    except Exception as e:
        logger.exception("Failed to process transcript upload")
        raise HTTPException(500, f"Transcript processing failed: {str(e)}")

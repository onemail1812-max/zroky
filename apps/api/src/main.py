"""
Executive Assistant Brain - Main FastAPI Application
Multi-tenant • Adaptive • OSS-first • Vertex-powered
"""

import logging
from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uvicorn

from .brain.orchestration.langgraph_orchestrator import ChiefOfStaffOrchestrator
from .brain.knowledge.document_parser import DocumentParser, SemanticChunker
from .brain.knowledge.embeddings import VertexEmbeddings
from .database import get_db
import os

# Initialize FastAPI
app = FastAPI(
    title="Executive Assistant Brain",
    description="Multi-tenant AI brain with deterministic rules + Vertex AI reasoning",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger = logging.getLogger(__name__)
is_debug = os.getenv("ENVIRONMENT") != "production"

@app.exception_handler(Exception)
async def unhandled_exception_handler(_request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception: %s", str(exc))
    
    content = {
        "error": {
            "code": "internal_error", 
            "message": "Internal server error"
        }
    }
    
    if is_debug:
        import traceback
        content["error"]["message"] = f"Internal server error: {str(exc)}"
        content["error"]["traceback"] = traceback.format_exc()
        
    return JSONResponse(
        status_code=500,
        content=content,
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(_request: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": "http_error", "message": exc.detail}},
    )

# Initialize components
orchestrator = ChiefOfStaffOrchestrator()
document_parser = DocumentParser(
    tika_server_url=os.getenv("TIKA_SERVER_URL", "http://localhost:9998")
)
embedder = VertexEmbeddings(
    project_id=os.getenv("GOOGLE_CLOUD_PROJECT"),
    location=os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
)

# ============================================
# REQUEST/RESPONSE MODELS
# ============================================

class QueryRequest(BaseModel):
    business_id: str
    query: str
    user_id: Optional[str] = None

class QueryResponse(BaseModel):
    response: str
    decisions: list
    intent: dict
    confidence: float
    status: str

class DocumentUploadRequest(BaseModel):
    business_id: str
    source_type: str  # 'pdf', 'url', 'note'
    source: str  # File path or URL or text
    title: Optional[str] = None

class DocumentUploadResponse(BaseModel):
    source_id: str
    chunks_created: int
    status: str

# ============================================
# ENDPOINTS
# ============================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "executive-assistant-brain",
        "version": "1.0.0"
    }

@app.post("/query", response_model=QueryResponse)
async def query_brain(request: QueryRequest):
    """
    Main endpoint: Query the Executive Assistant brain
    
    Flow:
    1. Recall knowledge (LAYER 1, 6)
    2. Get signals (LAYER 4)
    3. Run rules (LAYER 5A)
    4. LLM reasoning if needed (LAYER 5B)
    5. Generate intent (LAYER 7)
    6. Format response (LAYER 12)
    """
    try:
        result = orchestrator.run(
            business_id=request.business_id,
            user_query=request.query
        )
        
        return QueryResponse(
            response=result["final_response"],
            decisions=result["decisions"],
            intent=result["intent"],
            confidence=result.get("reasoning", {}).get("confidence", 1.0),
            status=result["status"]
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/knowledge/upload", response_model=DocumentUploadResponse)
async def upload_knowledge(request: DocumentUploadRequest, db = Depends(get_db)):
    """
    Upload knowledge to the brain
    
    Supports:
    - PDFs (via Apache Tika)
    - URLs (via Trafilatura)
    - Notes (direct text)
    - Docs, PPT, etc. (via Apache Tika)
    """
    try:
        # Parse document
        parsed_doc = document_parser.parse(request.source, request.source_type)
        
        # Chunk document
        chunker = SemanticChunker()
        chunks = chunker.chunk(parsed_doc)
        
        # Generate embeddings
        chunk_texts = [c["content"] for c in chunks]
        embeddings = embedder.embed_batch(chunk_texts)
        
        # Store in database
        from uuid import uuid4
        source_id = str(uuid4())
        
        # Insert source
        db.execute("""
            INSERT INTO knowledge_sources (id, business_id, source_type, source_url, title, status)
            VALUES (%s, %s, %s, %s, %s, 'completed')
        """, (source_id, request.business_id, request.source_type, request.source, parsed_doc.title))
        
        # Insert chunks
        for chunk, embedding in zip(chunks, embeddings):
            chunk_id = str(uuid4())
            db.execute("""
                INSERT INTO knowledge_chunks (id, business_id, source_id, content, embedding, chunk_index, metadata)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                chunk_id,
                request.business_id,
                source_id,
                chunk["content"],
                embedding,
                chunk["chunk_index"],
                chunk["metadata"]
            ))
        
        db.commit()
        
        return DocumentUploadResponse(
            source_id=source_id,
            chunks_created=len(chunks),
            status="completed"
        )
    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/business/{business_id}/profile")
async def get_business_profile(business_id: str, db = Depends(get_db)):
    """Get business profile (LAYER 2 - Source of Truth)"""
    try:
        result = db.execute("""
            SELECT profile_data FROM business_profiles WHERE business_id = %s
        """, (business_id,))
        
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Business not found")
        
        return row[0]
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/business/{business_id}/decisions")
async def get_decisions(business_id: str, limit: int = 10, db = Depends(get_db)):
    """Get recent decisions (LAYER 2 - Decisions Log)"""
    try:
        result = db.execute("""
            SELECT decision_type, context, decision, reasoning, confidence, created_at
            FROM decisions
            WHERE business_id = %s
            ORDER BY created_at DESC
            LIMIT %s
        """, (business_id, limit))
        
        decisions = []
        for row in result.fetchall():
            decisions.append({
                "decision_type": row[0],
                "context": row[1],
                "decision": row[2],
                "reasoning": row[3],
                "confidence": float(row[4]) if row[4] else None,
                "created_at": row[5].isoformat()
            })
        
        return decisions
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/business/{business_id}/learning")
async def get_episodic_memory(business_id: str, limit: int = 10, db = Depends(get_db)):
    """Get episodic learning memory (LAYER 3)"""
    try:
        result = db.execute("""
            SELECT context, decision, outcome, confidence, success_score, created_at
            FROM episodic_memory
            WHERE business_id = %s
            ORDER BY created_at DESC
            LIMIT %s
        """, (business_id, limit))
        
        memories = []
        for row in result.fetchall():
            memories.append({
                "context": row[0],
                "decision": row[1],
                "outcome": row[2],
                "confidence": float(row[3]) if row[3] else None,
                "success_score": float(row[4]) if row[4] else None,
                "created_at": row[5].isoformat()
            })
        
        return memories
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# RUN
# ============================================

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=os.getenv("ENVIRONMENT") != "production"
    )

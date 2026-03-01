"""PostgresVectorStore-compatible memory service with real embedding support.

Upgrades:
  - Uses native pgvector `<=>` cosine distance operator on PostgreSQL.
  - Falls back to in-Python cosine for SQLite.
  - EmbeddingClient retains deterministic fallback for test/dev.
"""

from __future__ import annotations

import hashlib
import json
import logging
import math
import uuid
from typing import Any, Iterable, Optional

import requests
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings
from app.models.memory_entry import MemoryEntry

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Embedding helpers
# ---------------------------------------------------------------------------

def _hash_embedding(text_input: str, dimensions: int = 256) -> list[float]:
    """Deterministic fallback embedding when provider embeddings are unavailable."""
    if not text_input:
        return [0.0] * dimensions

    buckets = [0.0] * dimensions
    words = text_input.lower().split()
    if not words:
        return buckets

    for token in words:
        digest = hashlib.sha256(token.encode("utf-8")).hexdigest()
        idx = int(digest[:8], 16) % dimensions
        sign = -1.0 if int(digest[8:10], 16) % 2 else 1.0
        buckets[idx] += sign

    norm = math.sqrt(sum(v * v for v in buckets))
    if norm == 0:
        return buckets
    return [v / norm for v in buckets]


def _align_dimensions(a: list[float], b: list[float]) -> tuple[list[float], list[float]]:
    if len(a) == len(b):
        return a, b
    target = min(len(a), len(b))
    if target <= 0:
        return [], []
    return a[:target], b[:target]


def _cosine_similarity(a: Iterable[float], b: Iterable[float]) -> float:
    a_list, b_list = _align_dimensions(list(a), list(b))
    if not a_list or not b_list:
        return 0.0
    dot = sum(x * y for x, y in zip(a_list, b_list))
    na = math.sqrt(sum(x * x for x in a_list))
    nb = math.sqrt(sum(y * y for y in b_list))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


class EmbeddingClient:
    """OpenRouter-compatible embedding client with deterministic fallback."""

    def __init__(self):
        self.base_url = settings.OPENROUTER_BASE_URL.rstrip("/")
        self.model = settings.OPENROUTER_EMBEDDING_MODEL
        self.api_key = settings.OPENROUTER_API_KEY

    def embed(self, text_input: str) -> list[float]:
        if not self.api_key or self.api_key.startswith("test-"):
            return _hash_embedding(text_input)
        payload = {
            "model": self.model,
            "input": text_input,
        }
        try:
            response = requests.post(
                f"{self.base_url}/embeddings",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": settings.OPENROUTER_APP_URL,
                    "X-Title": settings.OPENROUTER_APP_NAME,
                },
                json=payload,
                timeout=15,
            )
            if not response.ok:
                return _hash_embedding(text_input)
            body = response.json()
            data = body.get("data") or []
            if not data:
                return _hash_embedding(text_input)
            embedding = (data[0] or {}).get("embedding")
            if not isinstance(embedding, list):
                return _hash_embedding(text_input)
            vector = [float(value) for value in embedding]
            norm = math.sqrt(sum(v * v for v in vector))
            if norm == 0:
                return _hash_embedding(text_input)
            return [v / norm for v in vector]
        except Exception:
            return _hash_embedding(text_input)


# ---------------------------------------------------------------------------
# Detect database dialect
# ---------------------------------------------------------------------------

def _is_postgres(db: Session) -> bool:
    try:
        return db.bind.dialect.name == "postgresql"  # type: ignore[union-attr]
    except Exception:
        return False


def _has_pgvector(db: Session) -> bool:
    """Check if pgvector extension is available."""
    if not _is_postgres(db):
        return False
    try:
        result = db.execute(text("SELECT 1 FROM pg_extension WHERE extname = 'vector'"))
        return result.scalar() is not None
    except Exception:
        return False


# ---------------------------------------------------------------------------
# PostgresVectorStore
# ---------------------------------------------------------------------------

class PostgresVectorStore:
    """
    Memory storage abstraction.

    - On PostgreSQL+pgvector: uses native `<=>` cosine distance for O(1)-ish search.
    - On PostgreSQL without pgvector: falls back to Python cosine.
    - On SQLite: stores embeddings as JSON and computes cosine in Python.
    """

    def __init__(self, db: Session, workspace_id: str):
        self.db = db
        self.workspace_id = workspace_id
        self.embedding_client = EmbeddingClient()
        self._pgvector_available: Optional[bool] = None

    def _check_pgvector(self) -> bool:
        if self._pgvector_available is None:
            self._pgvector_available = _has_pgvector(self.db)
        return self._pgvector_available

    def upsert_text(
        self,
        *,
        source_type: str,
        source_id: str,
        content_text: str,
        metadata: Optional[dict[str, Any]] = None,
        embedding: Optional[list[float]] = None,
    ) -> MemoryEntry:
        entry = (
            self.db.query(MemoryEntry)
            .filter(
                MemoryEntry.workspace_id == self.workspace_id,
                MemoryEntry.source_type == source_type,
                MemoryEntry.source_id == source_id,
            )
            .first()
        )
        vector = embedding or self.embedding_client.embed(content_text)

        if entry:
            entry.content_text = content_text
            entry.embedding_json = vector
            entry.metadata_json = metadata or {}
        else:
            entry = MemoryEntry(
                id=str(uuid.uuid4()),
                workspace_id=self.workspace_id,
                source_type=source_type,
                source_id=source_id,
                content_text=content_text,
                embedding_json=vector,
                metadata_json=metadata or {},
            )
            self.db.add(entry)

        self.db.commit()
        self.db.refresh(entry)
        return entry

    def similarity_search(self, query_text: str, top_k: int = 3, filter_metadata: Optional[dict[str, Any]] = None) -> list[dict[str, Any]]:
        """
        Level 5 Retrieval: Hybrid Search with Reciprocal Rank Fusion (RRF).
        Combines Semantic (Vector) + Keyword (FTS) for best-in-class accuracy.
        """
        query_embedding = self.embedding_client.embed(query_text)

        # 1. Semantic Search
        semantic_results = []
        if self._check_pgvector():
            semantic_results = self._pgvector_search(query_embedding, top_k=20, filter_metadata=filter_metadata)
        else:
            semantic_results = self._python_cosine_search(query_embedding, top_k=20, filter_metadata=filter_metadata)

        # 2. Keyword Search (Full Text)
        keyword_results = self._keyword_search(query_text, top_k=20, filter_metadata=filter_metadata)

        # 3. Reciprocal Rank Fusion (RRF)
        return self._rrf_merge(semantic_results, keyword_results, top_k)

    def _keyword_search(self, query_text: str, top_k: int, filter_metadata: Optional[dict[str, Any]] = None) -> list[dict[str, Any]]:
        """Simple keyword search using SQLAlchemy ORM (avoids raw SQL OID issues)."""
        try:
            search_pattern = f"%{query_text}%"
            query = self.db.query(MemoryEntry).filter(
                MemoryEntry.workspace_id == self.workspace_id,
                MemoryEntry.content_text.like(search_pattern),
            )
            rows = query.limit(top_k).all()
            return [
                {
                    "id": row.id,
                    "source_type": row.source_type,
                    "source_id": row.source_id,
                    "content_text": row.content_text,
                    "metadata": row.metadata_json or {},
                    "similarity": 0.5,  # Base similarity for keyword hits
                }
                for row in rows
            ]
        except Exception as e:
            logger.warning("Keyword search failed: %s", e)
            return []

    def _rrf_merge(self, semantic: list[dict], keyword: list[dict], top_k: int, k_factor: int = 60) -> list[dict[str, Any]]:
        """
        Reciprocal Rank Fusion algorithm to merge multiple search result sets.
        score = sum(1 / (k + rank))
        """
        scores: dict[str, float] = {}
        items: dict[str, dict] = {}

        # Process Semantic Rank
        for rank, item in enumerate(semantic):
            item_id = item["id"]
            scores[item_id] = scores.get(item_id, 0.0) + 1.0 / (k_factor + rank + 1)
            items[item_id] = item

        # Process Keyword Rank
        for rank, item in enumerate(keyword):
            item_id = item["id"]
            scores[item_id] = scores.get(item_id, 0.0) + 1.0 / (k_factor + rank + 1)
            if item_id not in items:
                items[item_id] = item

        # Sort by fused score
        fused_ids = sorted(scores.keys(), key=lambda x: scores[x], reverse=True)
        
        final_results = []
        for i_id in fused_ids[:top_k]:
            item = items[i_id]
            # Normalize fused score back to a pseudo-similarity for the UI
            item["similarity"] = scores[i_id] * 10 
            final_results.append(item)
            
        return final_results

    def _pgvector_search(self, query_embedding: list[float], top_k: int, filter_metadata: Optional[dict[str, Any]] = None) -> list[dict[str, Any]]:
        """Use native pgvector cosine distance operator."""
        try:
            vector_str = "[" + ",".join(str(v) for v in query_embedding) + "]"
            where_clause = "workspace_id = :ws_id"
            params = {
                "query_vec": vector_str,
                "ws_id": self.workspace_id,
                "top_k": max(1, min(top_k, 20)),
            }

            if filter_metadata:
                for i, (key, value) in enumerate(filter_metadata.items()):
                    pk = f"mk_{i}"
                    pv = f"mv_{i}"
                    where_clause += f" AND metadata_json->>:{pk} = :{pv}"
                    params[pk] = key
                    params[pv] = str(value)

            sql = text(f"""
                SELECT id, source_type, source_id, content_text, metadata_json,
                       1 - (embedding_json::vector <=> :query_vec::vector) AS similarity
                FROM memory_entries
                WHERE {where_clause}
                ORDER BY embedding_json::vector <=> :query_vec::vector
                LIMIT :top_k
            """)
            result = self.db.execute(sql, params)
            rows = result.fetchall()
            return [
                {
                    "id": row.id,
                    "source_type": row.source_type,
                    "source_id": row.source_id,
                    "content_text": row.content_text,
                    "metadata": row.metadata_json or {},
                    "similarity": float(row.similarity) if row.similarity else 0.0,
                }
                for row in rows
            ]
        except Exception as exc:
            logger.warning("pgvector search failed, falling back to Python cosine: %s", exc)
            self._pgvector_available = False
            return self._python_cosine_search(query_embedding, top_k)

    def _python_cosine_search(self, query_embedding: list[float], top_k: int, filter_metadata: Optional[dict[str, Any]] = None) -> list[dict[str, Any]]:
        """In-Python cosine similarity (works with SQLite and Postgres without pgvector)."""
        query = self.db.query(MemoryEntry).filter(MemoryEntry.workspace_id == self.workspace_id)
        
        rows = (
            query
            .order_by(MemoryEntry.updated_at.desc())
            .limit(500)
            .all()
        )

        scored: list[tuple[float, MemoryEntry]] = []
        for row in rows:
            if filter_metadata:
                match = True
                row_meta = row.metadata_json or {}
                for k, v in filter_metadata.items():
                    if str(row_meta.get(k)) != str(v):
                        match = False
                        break
                if not match:
                    continue

            embedding = row.embedding_json
            if isinstance(embedding, str):
                try:
                    embedding = json.loads(embedding)
                except Exception:
                    embedding = None
            if not isinstance(embedding, list):
                continue
            try:
                emb = [float(x) for x in embedding]
            except Exception:
                continue
            similarity = _cosine_similarity(query_embedding, emb)
            scored.append((similarity, row))

        scored.sort(key=lambda item: item[0], reverse=True)
        top = scored[: max(1, min(top_k, 20))]
        return [
            {
                "id": row.id,
                "source_type": row.source_type,
                "source_id": row.source_id,
                "content_text": row.content_text,
                "metadata": row.metadata_json or {},
                "similarity": score,
            }
            for score, row in top
        ]

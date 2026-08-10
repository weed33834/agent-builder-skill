"""L6 - Vector Store Interface

Provides a unified interface to vector databases, supporting semantic search and RAG retrieval.
"""

from typing import Optional
import hashlib


class VectorStore:
    """Vector store abstraction

    Provides a unified vector store interface.
    Uses in-memory storage by default, can switch to ChromaDB, FAISS, etc. in production.
    """

    def __init__(self, collection_name: str = "default"):
        self.collection_name = collection_name
        # In-memory storage: {id: {"text": str, "metadata": dict, "embedding": list}}
        self._documents: dict[str, dict] = {}

    async def add_texts(
        self,
        texts: list[str],
        metadatas: Optional[list[dict]] = None,
        ids: Optional[list[str]] = None,
    ):
        """Add texts to the vector store

        Args:
            texts: List of texts
            metadatas: List of metadata
            ids: List of IDs, auto-generated if not provided
        """
        if ids is None:
            ids = [hashlib.md5(t.encode()).hexdigest()[:12] for t in texts]
        if metadatas is None:
            metadatas = [{} for _ in texts]

        for text, metadata, doc_id in zip(texts, metadatas, ids):
            self._documents[doc_id] = {
                "text": text,
                "metadata": metadata,
                "id": doc_id,
            }

    async def similarity_search(
        self,
        query: str,
        k: int = 4,
    ) -> list[dict]:
        """Semantic search

        Since there is no embedding model, uses keyword matching as a fallback.
        Production environments should integrate a real embedding service.

        Args:
            query: Query text
            k: Number of results to return
        Returns:
            list[dict]: List of matching documents
        """
        if not self._documents:
            return []

        # Keyword matching (fallback solution)
        query_lower = query.lower()
        scored = []

        for doc_id, doc in self._documents.items():
            text_lower = doc["text"].lower()
            score = text_lower.count(query_lower)
            if score > 0:
                scored.append((score, doc))

        # Sort by match score
        scored.sort(key=lambda x: x[0], reverse=True)
        return [doc for _, doc in scored[:k]]

    async def delete(self, ids: list[str]):
        """Delete documents"""
        for doc_id in ids:
            self._documents.pop(doc_id, None)

    async def clear(self):
        """Wipe all documents in this collection"""
        self._documents.clear()

    def count(self) -> int:
        """Get document count"""
        return len(self._documents)

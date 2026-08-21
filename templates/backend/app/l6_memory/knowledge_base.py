"""L6 - Knowledge Base Management

High-level knowledge base (M5.9): document collection management,
cross-document search, CRUD operations.

Wraps RAGEngine + VectorStore with knowledge-base semantics:
    kb = KnowledgeBase(name="support-docs")
    await kb.add_document("path/to/manual.pdf")
    await kb.add_text("...", source="notes")
    results = await kb.query("how to reset password?")
    await kb.delete_document(doc_id)
    stats = await kb.stats()
"""

from typing import Any, Optional

from .vector_store import VectorStore
from .rag_engine import RAGEngine, RAGResult, RetrievedChunk
from ..l10_infra.errors import RetrievalError


class KnowledgeBase:
    """A named, queryable knowledge base (M5.9)"""

    def __init__(
        self,
        name: str = "default",
        vector_store: Optional[VectorStore] = None,
        llm: Any = None,
        chunk_size: int = 800,
        chunk_overlap: int = 100,
    ):
        self.name = name
        self.vector_store = vector_store or VectorStore(collection_name=f"kb_{name}")
        self.engine = RAGEngine(
            vector_store=self.vector_store,
            llm=llm,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            collection=f"kb_{name}",
        )

    # ── write operations ──────────────────────────────────────

    async def add_text(self, text: str, source: str = "") -> list[str]:
        """Add a text document, return chunk IDs"""
        return await self.engine.ingest_text(text, source=source)

    async def add_document(self, path: str, source: Optional[str] = None) -> list[str]:
        """Add a document file (PDF/Word/Excel/TXT/MD)"""
        return await self.engine.ingest_file(path, source=source)

    async def delete_document(self, doc_id: str) -> bool:
        """Delete all chunks of a document"""
        await self.vector_store.delete([doc_id])
        return True

    async def clear(self):
        """Wipe the entire knowledge base"""
        return await self.vector_store.clear()

    # ── read operations ───────────────────────────────────────

    async def query(self, question: str, k: int = 5) -> RAGResult:
        """Ask a question against this knowledge base (with citations)"""
        return await self.engine.answer(question, k=k)

    async def retrieve(self, query: str, k: int = 5) -> list[RetrievedChunk]:
        """Retrieve raw chunks (no generation)"""
        return await self.engine.retrieve(query, k=k)

    async def stats(self) -> dict:
        """Knowledge base statistics"""
        return {
            "name": self.name,
            "chunk_count": self.vector_store.count(),
            "collection": self.vector_store.collection_name,
        }


class KnowledgeBaseManager:
    """Registry of named knowledge bases (M5.9)"""

    def __init__(self):
        self._kbs: dict[str, KnowledgeBase] = {}

    def get(self, name: str = "default", create: bool = True) -> KnowledgeBase:
        """Get (or create) a knowledge base by name"""
        if name not in self._kbs and create:
            self._kbs[name] = KnowledgeBase(name=name)
        return self._kbs.get(name)

    def create(self, name: str) -> KnowledgeBase:
        if name in self._kbs:
            return self._kbs[name]
        kb = KnowledgeBase(name=name)
        self._kbs[name] = kb
        return kb

    def list(self) -> list[str]:
        return list(self._kbs.keys())

    async def remove(self, name: str) -> bool:
        kb = self._kbs.pop(name, None)
        if kb:
            await kb.clear()
            return True
        return False


# Global knowledge base manager
kb_manager = KnowledgeBaseManager()

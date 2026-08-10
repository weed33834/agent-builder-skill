"""L6 - RAG Engine

Retrieval-Augmented Generation engine (M5.9 + M5.10).
Combines vector retrieval with BM25/keyword retrieval (hybrid search, M5.8)
and produces cited answers (M12.21).

Usage:
    engine = RAGEngine(vector_store=vs, llm=llm)
    await engine.ingest_document("doc.pdf")          # parse + chunk + index
    answer = await engine.answer("What is X?")       # retrieve + generate
    chunks = await engine.retrieve("What is X?", k=5)
"""

import hashlib
import re
from dataclasses import dataclass, field
from typing import Any, Optional, Sequence

from .vector_store import VectorStore
from ..l10_infra.errors import RetrievalError


@dataclass
class RetrievedChunk:
    """A retrieved knowledge chunk with metadata"""
    text: str
    score: float = 0.0
    source: str = ""
    doc_id: str = ""


@dataclass
class RAGResult:
    """Full RAG answer with citations (M12.21)"""
    answer: str
    chunks: list[RetrievedChunk] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "answer": self.answer,
            "citations": [
                {"text": c.text[:200], "score": round(c.score, 4), "source": c.source}
                for c in self.chunks
            ],
        }


class RAGEngine:
    """Hybrid retrieval + generation engine"""

    def __init__(
        self,
        vector_store: Optional[VectorStore] = None,
        llm: Any = None,
        chunk_size: int = 800,
        chunk_overlap: int = 100,
        collection: str = "knowledge_base",
    ):
        self.vector_store = vector_store or VectorStore(collection_name=collection)
        self.llm = llm
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self._bm25_index: dict[str, dict[str, float]] = {}  # term -> {doc_id: tf}
        self._doc_texts: dict[str, str] = {}

    # ── ingestion (M5.10) ─────────────────────────────────────

    async def ingest_text(self, text: str, source: str = "") -> list[str]:
        """Chunk + embed + index a plain-text document.

        Returns the list of chunk IDs.
        """
        chunks = self._split_chunks(text)
        ids = []
        for i, chunk in enumerate(chunks):
            chunk_id = self._chunk_id(source, i, chunk)
            await self.vector_store.add_texts(
                [chunk],
                metadatas=[{"source": source, "chunk_index": i, "doc_id": chunk_id}],
                ids=[chunk_id],
            )
            self._index_bm25(chunk_id, chunk)
            self._doc_texts[chunk_id] = chunk
            ids.append(chunk_id)
        return ids

    async def ingest_file(self, path: str, source: Optional[str] = None) -> list[str]:
        """Parse a document file (PDF/Word/Excel/TXT/MD) and index it (M5.10)"""
        import os
        text = self._extract_file_text(path)
        return await self.ingest_text(text, source or os.path.basename(path))

    def _extract_file_text(self, path: str) -> str:
        """Extract text from common document formats"""
        suffix = path.rsplit(".", 1)[-1].lower() if "." in path else ""

        if suffix in ("txt", "md", "csv", "json", "yaml", "yml"):
            with open(path, encoding="utf-8", errors="replace") as f:
                return f.read()

        if suffix == "pdf":
            try:
                from pypdf import PdfReader
                reader = PdfReader(path)
                return "\n".join(page.extract_text() or "" for page in reader.pages)
            except ImportError as e:
                raise RetrievalError("PDF parsing requires pypdf: pip install pypdf") from e

        if suffix == "docx":
            try:
                from docx import Document
                doc = Document(path)
                return "\n".join(p.text for p in doc.paragraphs)
            except ImportError as e:
                raise RetrievalError("DOCX parsing requires python-docx: pip install python-docx") from e

        if suffix in ("xlsx", "xls"):
            try:
                import openpyxl
                wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
                parts = []
                for ws in wb.worksheets:
                    for row in ws.iter_rows(values_only=True):
                        parts.append("\t".join(str(c) for c in row if c is not None))
                return "\n".join(parts)
            except ImportError as e:
                raise RetrievalError("XLSX parsing requires openpyxl: pip install openpyxl") from e

        raise RetrievalError(f"Unsupported file type: {suffix}")

    # ── retrieval (M5.8 hybrid) ───────────────────────────────

    async def retrieve(self, query: str, k: int = 5, hybrid: bool = True) -> list[RetrievedChunk]:
        """Retrieve relevant chunks (vector + optional BM25 hybrid)"""
        try:
            vector_hits = await self.vector_store.similarity_search(query, k=k * 2)
        except Exception as e:
            raise RetrievalError(f"Vector search failed: {e}") from e

        results: list[RetrievedChunk] = []
        seen: set[str] = set()

        for hit in vector_hits:
            doc_id = hit.get("id") or self._chunk_id("", 0, hit.get("text", ""))
            if doc_id in seen:
                continue
            seen.add(doc_id)
            text = hit.get("text", "")
            # Score: fallback keyword-match count (in-memory store has no real embedding)
            score = text.lower().count(query.lower()) if query else 0.0
            results.append(RetrievedChunk(
                text=text,
                score=float(score),
                source=hit.get("metadata", {}).get("source", "") if isinstance(hit.get("metadata"), dict) else "",
                doc_id=doc_id,
            ))

        if hybrid and self._bm25_index:
            bm25_hits = self._bm25_search(query)
            for doc_id, score in bm25_hits:
                if doc_id in seen or len(results) >= k:
                    continue
                seen.add(doc_id)
                results.append(RetrievedChunk(
                    text=self._doc_texts.get(doc_id, ""),
                    score=score * 0.5,  # scale BM25 to comparable range
                    doc_id=doc_id,
                ))

        # Sort by score desc, keep top k
        results.sort(key=lambda c: c.score, reverse=True)
        return results[:k]

    # ── generation (M5.9) ─────────────────────────────────────

    async def answer(self, query: str, k: int = 5, prompt: Optional[str] = None) -> RAGResult:
        """Retrieve context and generate a cited answer"""
        chunks = await self.retrieve(query, k=k)
        context = "\n\n".join(
            f"[{i+1}] {c.text}" for i, c in enumerate(chunks)
        )

        if self.llm is None:
            # No-LLM mode: return the top chunks as the "answer"
            return RAGResult(answer=context, chunks=chunks)

        prompt_tpl = prompt or (
            "Answer the question using ONLY the context below. "
            "If the context does not contain the answer, say so. "
            "Cite sources using [1], [2] markers.\n\n"
            "Context:\n{context}\n\nQuestion: {query}\n\nAnswer:"
        )

        try:
            from langchain_core.messages import HumanMessage
            response = await self.llm.ainvoke(
                [HumanMessage(content=prompt_tpl.format(context=context, query=query))]
            )
            answer = str(getattr(response, "content", response)).strip()
        except Exception as e:
            raise RetrievalError(f"RAG generation failed: {e}") from e

        return RAGResult(answer=answer, chunks=chunks)

    # ── internals ─────────────────────────────────────────────

    def _split_chunks(self, text: str) -> list[str]:
        """Split text into overlapping chunks"""
        text = re.sub(r"\s+", " ", text).strip()
        if len(text) <= self.chunk_size:
            return [text] if text else []
        chunks = []
        start = 0
        step = self.chunk_size - self.chunk_overlap
        while start < len(text):
            chunk = text[start:start + self.chunk_size]
            # Try to break at sentence boundary
            if len(chunk) == self.chunk_size:
                cut = max(chunk.rfind(". "), chunk.rfind("。"), chunk.rfind("\n"))
                if cut > self.chunk_size // 2:
                    chunk = chunk[:cut + 1]
            chunks.append(chunk)
            start += step
        return chunks

    def _chunk_id(self, source: str, index: int, chunk: str) -> str:
        raw = f"{source}:{index}:{hashlib.md5(chunk.encode()).hexdigest()[:12]}"
        return hashlib.md5(raw.encode()).hexdigest()

    def _index_bm25(self, doc_id: str, text: str):
        tokens = self._tokenize(text)
        freq: dict[str, float] = {}
        for t in tokens:
            freq[t] = freq.get(t, 0) + 1
        self._bm25_index[doc_id] = freq

    def _bm25_search(self, query: str, k: int = 5) -> list[tuple[str, float]]:
        query_tokens = self._tokenize(query)
        if not query_tokens or not self._bm25_index:
            return []
        import math
        n_docs = len(self._bm25_index)
        scores: dict[str, float] = {}
        for doc_id, freq in self._bm25_index.items():
            score = 0.0
            for tok in query_tokens:
                tf = freq.get(tok, 0)
                if tf == 0:
                    continue
                df = sum(1 for f in self._bm25_index.values() if tok in f)
                idf = math.log((n_docs - df + 0.5) / (df + 0.5) + 1)
                score += idf * (tf * 1.5) / (tf + 1.5)
            if score > 0:
                scores[doc_id] = score
        ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        return ranked[:k]

    def _tokenize(self, text: str) -> list[str]:
        # Simple tokenizer: lowercase, split on non-alphanumeric (CJK-safe)
        text = text.lower()
        tokens = re.findall(r"[a-z0-9]+|[\u4e00-\u9fff]", text)
        # Add CJK bigrams for better Chinese matching
        cjk = re.findall(r"[\u4e00-\u9fff]", text)
        bigrams = [cjk[i] + cjk[i+1] for i in range(len(cjk) - 1)]
        return tokens + bigrams

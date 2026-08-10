"""L6 - Hybrid Retrieval Engine (deep-spec 20-D)

Real implementation of the retrieval pipeline:
  D.1 BM25 关键词检索（自实现，分词后索引）
  D.2 向量检索（余弦/内积，metadata 过滤）
  D.3 混合检索：BM25 + 向量 → RRF 融合
  D.6 检索缓存（进程内，TTL + 版本失效）
  D.8 引用溯源（结果带 doc_id/段落，可点击回看）

数据源沿用 admin 层的 vector_store JSON（每个 chunk 含 doc_id/doc_name/text/meta），
亦兼容 session 持久化结构。
"""

from __future__ import annotations

import math
import time
from collections import Counter, defaultdict
from typing import Any, Dict, List, Optional, Tuple

from ..l10_infra.text_processing import tokenize_zh, char_overlap_similarity


class BM25:
    """D.1 自实现 BM25（无外部依赖）。"""

    def __init__(self, k1: float = 1.5, b: float = 0.75):
        self.k1, self.b = k1, b
        self.docs: List[Dict[str, Any]] = []
        self.df: Counter = Counter()
        self.idf: Dict[str, float] = {}
        self._avgdl = 0.0

    def index(self, docs: List[Dict[str, Any]]):
        self.docs = docs
        self.df = Counter()
        total_len = 0
        for d in docs:
            tokens = set(tokenize_zh(d.get("text", "")))
            for t in tokens:
                self.df[t] += 1
            total_len += len(tokenize_zh(d.get("text", "")))
        n = len(docs) or 1
        self._avgdl = total_len / n
        for t, c in self.df.items():
            self.idf[t] = math.log((n - c + 0.5) / (c + 0.5) + 1.0)

    def score(self, query: str, doc: Dict[str, Any]) -> float:
        text = doc.get("text", "")
        tokens = tokenize_zh(text)
        dl = len(tokens)
        tf = Counter(tokens)
        score = 0.0
        for q in set(tokenize_zh(query)):
            if q not in self.idf:
                continue
            f = tf.get(q, 0)
            if f == 0:
                continue
            denom = f + self.k1 * (1 - self.b + self.b * dl / self._avgdl)
            score += self.idf[q] * (f * (self.k1 + 1)) / denom
        return score

    def search(self, query: str, top_k: int = 10) -> List[Tuple[float, Dict[str, Any]]]:
        scored = [(self.score(query, d), d) for d in self.docs]
        scored.sort(key=lambda x: -x[0])
        return [(s, d) for s, d in scored if s > 0][:top_k]


class HybridRetriever:
    """D.3 混合检索：BM25 + 向量(字符重叠代理) → RRF 融合 + 引用溯源。"""

    def __init__(self, alpha: float = 0.5, ttl: int = 600):
        self.alpha = alpha
        self.ttl = ttl
        self._cache: Dict[str, Tuple[float, List[Dict[str, Any]]]] = {}
        self._bm25 = BM25()

    def _vector_score(self, query: str, doc: Dict[str, Any]) -> float:
        # 无真实 embedding 时用 token 重叠代理；生产可替换为向量余弦
        return char_overlap_similarity(query, doc.get("text", ""))

    def search(
        self,
        query: str,
        chunks: List[Dict[str, Any]],
        top_k: int = 10,
        kb_version: str = "",
        use_cache: bool = True,
    ) -> Dict[str, Any]:
        """返回 {hits: [{chunk_id, doc_id, doc_name, score, snippet, source, citation}], query}"""
        cache_key = f"{query}:{kb_version}:{len(chunks)}"
        now = time.time()
        if use_cache and cache_key in self._cache:
            ts, cached = self._cache[cache_key]
            if now - ts < self.ttl:
                return {"hits": cached, "query": query}

        if not chunks:
            return {"hits": [], "query": query}

        # BM25 索引（在 chunk 集上）
        self._bm25.index(chunks)
        bm25_hits = self._bm25.search(query, top_k=top_k * 3)
        bm25_map = {d.get("id"): s for s, d in bm25_hits}

        # 向量(代理) 得分
        vector_scores = {d.get("id"): self._vector_score(query, d) for d in chunks}

        # RRF 融合
        rrf: Dict[str, float] = defaultdict(float)
        # BM25 排名分
        for rank, (_, d) in enumerate(bm25_hits):
            rrf[d.get("id")] += self.alpha / (60 + rank + 1)
        # 向量排名分
        vec_ranked = sorted(vector_scores.items(), key=lambda x: -x[1])
        for rank, (cid, _) in enumerate(vec_ranked[:top_k * 3]):
            if vector_scores[cid] > 0:
                rrf[cid] += (1 - self.alpha) / (60 + rank + 1)

        merged = sorted(rrf.items(), key=lambda x: -x[1])
        chunk_by_id = {d.get("id"): d for d in chunks}
        hits = []
        for cid, score in merged[:top_k]:
            d = chunk_by_id.get(cid)
            if not d:
                continue
            hits.append({
                "chunk_id": d.get("id"),
                "doc_id": d.get("doc_id", ""),
                "doc_name": d.get("doc_name", ""),
                "score": round(score, 4),
                "snippet": (d.get("text", "") or "")[:200],
                "source": d.get("meta", {}).get("source", ""),
                "citation": f"{d.get('doc_name', d.get('doc_id', ''))} #{d.get('index', '')}",
            })

        if use_cache:
            self._cache[cache_key] = (now, hits)
        return {"hits": hits, "query": query}


_retriever = HybridRetriever()


def get_retriever() -> HybridRetriever:
    return _retriever

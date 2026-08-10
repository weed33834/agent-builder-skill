"""L8 - NLP & Algorithm API (deep-spec 20-C/D/B)

Exposes the real text-processing & retrieval capabilities to the frontend and
to the runtime pipeline:

  POST /api/nlp/keywords   C.2 关键词提取 (tfidf / textrank / hybrid)
  POST /api/nlp/analyze    C 一次性文本分析（清洗+关键词+摘要）
  POST /api/nlp/summary    C.7 提取式摘要
  POST /api/nlp/validate   B.5 结构化输出校验
  POST /api/nlp/retrieve   D.3 混合检索（BM25+向量+引用溯源）
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ...l10_infra.text_processing import (
    extract_keywords,
    extractive_summary,
    analyze as analyze_text,
    normalize_text,
)
from ...l3_prompt.output_validator import OutputValidator
from ...l6_memory.retrieval import get_retriever

router = APIRouter()


@router.post("/nlp/keywords")
async def keywords(payload: dict):
    """C.2 关键词提取。contract: {documents:[str], top_n?, method?, extra_weights?}"""
    documents = payload.get("documents") or [payload.get("text", "")]
    documents = [d for d in documents if isinstance(d, str) and d.strip()]
    if not documents:
        raise HTTPException(status_code=400, detail="documents/text is required")
    top_n = int(payload.get("top_n", 5))
    method = payload.get("method", "tfidf")
    try:
        result = extract_keywords(documents, top_n, method, payload.get("extra_weights"))
        return {"keywords": result, "method": method, "count": len(result)}
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"keyword extraction failed: {exc}")


@router.post("/nlp/analyze")
async def analyze(payload: dict):
    """C 文本全量分析。contract: {text}"""
    text = payload.get("text", "")
    if not text:
        raise HTTPException(status_code=400, detail="text is required")
    return analyze_text(text)


@router.post("/nlp/summary")
async def summary(payload: dict):
    """C.7 提取式摘要。contract: {text, sentences?}"""
    text = payload.get("text", "")
    if not text:
        raise HTTPException(status_code=400, detail="text is required")
    n = int(payload.get("sentences", 3))
    return {"sentences": extractive_summary(text, n), "summary": "".join(extractive_summary(text, n))}


@router.post("/nlp/validate")
async def validate(payload: dict):
    """B.5 结构化输出校验。contract: {data, schema} -> {ok, errors, correct_prompt?}"""
    data = payload.get("data")
    schema = payload.get("schema", {})
    if data is None:
        raise HTTPException(status_code=400, detail="data is required")
    return OutputValidator(schema).validate(data)


@router.post("/nlp/retrieve")
async def retrieve(payload: dict):
    """D.3 混合检索。contract: {query, chunks?, kb_id?, top_k?, kb_version?}"""
    query = payload.get("query", "")
    if not query:
        raise HTTPException(status_code=400, detail="query is required")
    chunks = payload.get("chunks")
    if chunks is None:
        # 从 memory 知识库按 kb_id 加载
        from ...l8_api.routes.admin import _load
        kb_id = payload.get("kb_id", "default")
        chunks = _load("memory").get("vector_store", {}).get(kb_id, [])
    retriever = get_retriever()
    return retriever.search(
        query,
        chunks,
        top_k=int(payload.get("top_k", 10)),
        kb_version=str(payload.get("kb_version", "")),
    )

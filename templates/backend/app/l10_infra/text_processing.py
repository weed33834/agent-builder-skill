"""L0/L10 - Text Processing & Algorithm Module (deep-spec 20-C)

Real implementations of the "must-do-right" foundation text capabilities:
  - C.1 分词 (jieba)
  - C.2 关键词提取: TF-IDF 基线 + TextRank 增强 (纯 Python, 无 sklearn 依赖)
  - C.3 停用词与清洗
  - C.4 文本归一化
  - C.5 相似度计算 (余弦 / 内积)
  - C.7 提取式摘要 (TextRank 句子)

Every function returns JSON-serializable results with clear signatures so the
admin console and the retrieval pipeline can consume them directly.
"""

from __future__ import annotations

import math
import re
import unicodedata
from collections import Counter, defaultdict
from typing import Iterable, List, Optional, Tuple

# ── C.1 中文分词 ──────────────────────────────────────────────
try:
    import jieba
    _HAS_JIEBA = True
except Exception:  # noqa: BLE001
    _HAS_JIEBA = False

# 加载自定义停用词（合并默认英文停用词）
_STOPWORDS = set(
    """的 了 和 是 在 我 有 就 不 人 都 一 一个 上 也 很 到 说 要 去 你 会 着 没有
    看 好 自己 这 那 吗 吧 呢 啊 并 与 及 或 等 我们 你们 他们 它 被 把 让 但 而 从
    向 于 对 中 为 又 还 再 只 能 应 该 可 以 已 将 这个 那个 什么 怎么 如何 是否
    the and of to in is are was were be been for on with as at by an a it this that
    not no do does did have has had will would can could should may might must about
    into over after before between out off up down I you he she we they them me him her""".split()
)


def tokenize_zh(text: str, keep_stopwords: bool = False) -> List[str]:
    """C.1 中文分词（jieba 精确模式）；英文按空白与标点切分。"""
    text = normalize_text(text)
    if not text:
        return []
    if _HAS_JIEBA:
        words = [w.strip().lower() for w in jieba.lcut(text)]
    else:  # 兜底：按连续非标点字符切分
        words = re.findall(r"[\u4e00-\u9fff]{2,}|[a-zA-Z0-9]+", text.lower())
    result = []
    for w in words:
        if len(w) < 2:
            continue
        if not keep_stopwords and w in _STOPWORDS:
            continue
        result.append(w)
    return result


# ── C.3 / C.4 清洗与归一化 ───────────────────────────────────
def clean_text(text: str, remove_emoji: bool = True) -> str:
    """C.3 清洗管道：去 HTML / 去 emoji / 统一全半角 / 去零宽字符。"""
    text = text or ""
    text = re.sub(r"<[^>]+>", " ", text)                    # 去 HTML
    text = text.replace("\u200b", "").replace("\ufeff", "")  # 去零宽字符
    if remove_emoji:
        # 移除常见 emoji 区块
        text = re.sub(
            r"[\U0001F000-\U0001FAFF\U00002600-\U000027BF\U0001F900-\U0001F9FF\U0001F1E6-\U0001F1FF]",
            " ", text,
        )
    return text


def normalize_text(text: str) -> str:
    """C.4 归一化：NFKC 统一（全角→半角/组合字符）、空白折叠。"""
    text = clean_text(text or "")
    text = unicodedata.normalize("NFKC", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


# ── C.2 关键词提取 ───────────────────────────────────────────
def _idf(corpus_docs: List[str]) -> Dict[str, float]:
    """计算 IDF（平滑）。"""
    n = len(corpus_docs)
    df: Counter = Counter()
    for doc in corpus_docs:
        for w in set(tokenize_zh(doc)):
            df[w] += 1
    return {w: math.log((n + 1) / (c + 1)) + 1.0 for w, c in df.items()}


def extract_keywords_tfidf(
    documents: List[str],
    top_n: int = 5,
    extra_weights: Optional[Dict[str, float]] = None,
) -> List[dict]:
    """C.2 TF-IDF 关键词提取（多文档用 IDF 加权；单文档退化为词频）。
    返回 [{"keyword", "score", "tf", "idf"}] 按 score 降序。"""
    if not documents:
        return []
    idf = _idf(documents) if len(documents) > 1 else {}
    doc = " ".join(documents)
    tf = Counter(tokenize_zh(doc))
    total = sum(tf.values()) or 1
    scored = []
    for w, c in tf.items():
        base = c / total
        w_idf = idf.get(w, 1.0) if idf else 1.0
        score = base * w_idf
        if extra_weights:
            score *= extra_weights.get(w, 1.0)
        scored.append({"keyword": w, "score": round(score, 4), "tf": c, "idf": round(w_idf, 4)})
    scored.sort(key=lambda x: -x["score"])
    return scored[:top_n]


def _textrank_weights(
    sentences: List[str],
    damp: float = 0.85,
    iterations: int = 30,
) -> Dict[str, float]:
    """TextRank 句子/词图权重（无向图，共现窗口=相邻句子）。"""
    sent_tokens = [set(tokenize_zh(s)) for s in sentences if tokenize_zh(s)]
    if not sent_tokens:
        return {}
    nodes: Dict[str, float] = {w: 1.0 for st in sent_tokens for w in st}
    edges: Dict[str, Counter] = defaultdict(Counter)
    for i in range(len(sent_tokens)):
        for j in range(i + 1, len(sent_tokens)):
            for a in sent_tokens[i]:
                for b in sent_tokens[j]:
                    if a == b:
                        continue
                    edges[a][b] += 1
                    edges[b][a] += 1
    # 幂迭代求解
    for _ in range(iterations):
        new_nodes = {}
        for w in nodes:
            s = 0.0
            for nb, wgt in edges[w].items():
                total = sum(edges[nb].values())
                if total:
                    s += (wgt / total) * nodes[nb]
            new_nodes[w] = (1 - damp) + damp * s
        nodes = new_nodes
    return nodes


def extract_keywords_textrank(documents: List[str], top_n: int = 5) -> List[dict]:
    """C.2 TextRank 关键词提取（句子图，适合单文档/摘要场景）。"""
    sentences = re.split(r"[。！？!?；;\n]", " ".join(documents))
    weights = _textrank_weights(sentences)
    total = sum(weights.values()) or 1
    scored = sorted(weights.items(), key=lambda x: -x[1])[:top_n]
    return [{"keyword": w, "score": round(s / total, 4), "weight": round(s, 4)} for w, s in scored]


def extract_keywords(
    documents: List[str],
    top_n: int = 5,
    method: str = "tfidf",
    extra_weights: Optional[Dict[str, float]] = None,
) -> List[dict]:
    """统一入口：method = tfidf | textrank | hybrid"""
    if method == "textrank":
        return extract_keywords_textrank(documents, top_n)
    tfidf = extract_keywords_tfidf(documents, top_n * 2, extra_weights)
    if method == "hybrid" and len(documents) >= 1:
        tr = {k["keyword"]: k["weight"] for k in extract_keywords_textrank(documents, top_n * 2)}
        for item in tfidf:
            item["score"] = round(item["score"] * (1 + tr.get(item["keyword"], 0)), 4)
        tfidf.sort(key=lambda x: -x["score"])
    return tfidf[:top_n]


# ── C.6 相似度计算 ───────────────────────────────────────────
def cosine_similarity(a: List[float], b: List[float]) -> float:
    """C.6 余弦相似度。"""
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


def char_overlap_similarity(a: str, b: str) -> float:
    """轻量字符级相似度（无向量时的 BM25 代理）。"""
    ta = tokenize_zh(a)
    tb = tokenize_zh(b)
    if not ta or not tb:
        return 0.0
    sa, sb = set(ta), set(tb)
    inter = sa & sb
    return len(inter) / math.sqrt(len(sa) * len(sb)) if sa and sb else 0.0


# ── C.7 提取式摘要 ───────────────────────────────────────────
def extractive_summary(text: str, sentences_count: int = 3) -> List[str]:
    """C.7 TextRank 句子摘要：按句子权重排序取 top-N，保留原文顺序。"""
    sentences = [s.strip() for s in re.split(r"(?<=[。！？!?；;])\s*", clean_text(text)) if s.strip()]
    if not sentences:
        return []
    sent_tokens = [set(tokenize_zh(s)) for s in sentences]
    nodes = {i: 1.0 for i, st in enumerate(sent_tokens) if st}
    for _ in range(20):
        new_nodes = {}
        for i in nodes:
            s = 0.0
            for j in nodes:
                if i == j or not sent_tokens[i] or not sent_tokens[j]:
                    continue
                overlap = len(sent_tokens[i] & sent_tokens[j])
                if overlap:
                    s += overlap / max(len(sent_tokens[j]), 1) * nodes[j]
            new_nodes[i] = 0.85 + 0.15 * s
        nodes = new_nodes
    ranked = sorted(nodes.items(), key=lambda x: -x[1])[:sentences_count]
    picked = sorted(i for i, _ in ranked)
    return [sentences[i] for i in picked]


# 便于外部测试的封装
def analyze(text: str) -> dict:
    """一次性分析：清洗 → 关键词(tfidf+textrank) → 摘要。供 NLP 端点使用。"""
    cleaned = clean_text(text)
    return {
        "normalized": normalize_text(text),
        "keywords_tfidf": extract_keywords_tfidf([cleaned], top_n=6),
        "keywords_textrank": extract_keywords_textrank([cleaned], top_n=6),
        "summary": extractive_summary(text, sentences_count=2),
        "length": len(text),
    }

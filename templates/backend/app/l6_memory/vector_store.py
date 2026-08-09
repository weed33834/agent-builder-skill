"""L6 - 向量存储接口

提供向量数据库的统一接口，支持语义搜索和 RAG 检索。
"""

from typing import Optional
import hashlib


class VectorStore:
    """向量存储抽象
    
    提供统一的向量存储接口。
    默认使用内存存储，生产环境可切换为 ChromaDB、FAISS 等。
    """
    
    def __init__(self, collection_name: str = "default"):
        self.collection_name = collection_name
        # 内存存储：{id: {"text": str, "metadata": dict, "embedding": list}}
        self._documents: dict[str, dict] = {}
    
    async def add_texts(
        self,
        texts: list[str],
        metadatas: Optional[list[dict]] = None,
        ids: Optional[list[str]] = None,
    ):
        """添加文本到向量存储
        
        Args:
            texts: 文本列表
            metadatas: 元数据列表
            ids: ID 列表，不传则自动生成
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
        """语义搜索
        
        由于没有 embedding 模型，使用关键词匹配作为降级方案。
        生产环境应接入真正的 embedding 服务。
        
        Args:
            query: 查询文本
            k: 返回结果数
        Returns:
            list[dict]: 匹配的文档列表
        """
        if not self._documents:
            return []
        
        # 关键词匹配（降级方案）
        query_lower = query.lower()
        scored = []
        
        for doc_id, doc in self._documents.items():
            text_lower = doc["text"].lower()
            score = text_lower.count(query_lower)
            if score > 0:
                scored.append((score, doc))
        
        # 按匹配度排序
        scored.sort(key=lambda x: x[0], reverse=True)
        return [doc for _, doc in scored[:k]]
    
    async def delete(self, ids: list[str]):
        """删除文档"""
        for doc_id in ids:
            self._documents.pop(doc_id, None)
    
    def count(self) -> int:
        """获取文档数量"""
        return len(self._documents)
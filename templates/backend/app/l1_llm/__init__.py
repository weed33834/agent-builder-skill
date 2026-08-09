"""L1 - 大模型层 (LLM Foundation)

最底层，提供实际的推理能力。
支持多种模型提供商和本地部署。

使用方式：
    from app.l1_llm.factory import create_llm
    llm = create_llm(provider="openai", model="gpt-4o")
    response = await llm.invoke(messages)
"""
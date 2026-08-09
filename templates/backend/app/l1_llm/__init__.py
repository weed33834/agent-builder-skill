"""L1 - LLM Foundation

The lowest layer, providing actual reasoning capabilities.
Supports multiple model providers and local deployment.

Usage:
    from app.l1_llm.factory import create_llm
    llm = create_llm(provider="openai", model="gpt-4o")
    response = await llm.invoke(messages)
"""
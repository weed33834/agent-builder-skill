# Agent Type Templates

This directory contains 5 predefined Agent type templates, each corresponding to a YAML configuration file.

## Template List

| Template File | Agent Type | Use Case | Complexity |
|----------|------------|----------|--------|
| `chat.yaml` | Chat Assistant | General conversation, simple Q&A | ★☆☆☆☆ |
| `research.yaml` | Research Assistant | Search, summarize, and analyze information | ★★★☆☆ |
| `coding.yaml` | Coding Assistant | Write code, review, debug | ★★★☆☆ |
| `customer_service.yaml` | Customer Service System | Multi-Agent collaborative customer service | ★★★★★ |
| `data_analysis.yaml` | Data Analysis | Data upload, analysis, visualization | ★★★★☆ |

## Usage

```bash
# Generate an Agent using a template
python scripts/generate.py templates/agent-types/research.yaml ./my_agent
```

## Customization

Copy any template and modify the configuration items to create a custom Agent type.

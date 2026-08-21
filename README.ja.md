# Agent-Builder

> [Agent Plugins 1.0.0](https://agent-plugins.org) 準拠のプロダクションレベル AI エージェントスキャフォールド——
> MCP のハードゲートにより、AI は証拠なしに完了を宣言できません。

[English](./README.md) · [简体中文](./README.zh.md)

## 概要

一行の要件と `agent.yaml` から、**完全に実行可能なフルスタック Agent プロジェクト**
（FastAPI バックエンド + React フロントエンド + pytest スイート）を生成します。
3つの MCP ゲートがパイプラインを強制します：

| ゲート | ツール | 保証 |
|---|---|---|
| 1 | `validate_config` | 不正な設定は生成前に拒否 |
| 2 | `build_agent` | 空でないディレクトリを決して上書きしない |
| 3 | `verify_product` | 生成物がインポート可能でテスト全緑 |

**差別化ポイント**：全テンプレート × フレームワークの組み合わせを CI の
`scripts/verify_all.py`（生成→インポート→pytest）が検証。デモではなく、
CI ゲートの下で生まれたエンジニアリング成果物を提供します。

## クイックスタート

```bash
python scripts/generate.py templates/agent-types/chat.yaml ./my_agent --framework=langgraph
cd my_agent && pip install -r requirements.txt -r requirements-dev.txt
python -m pytest tests -q
uvicorn app.main:app --reload --port 8000
```

AI クライアント向け：本リポジトリを Agent Plugins / MCP 対応クライアントに置くだけで、
`skills/build-agent/SKILL.md`（約130行の権威あるワークフロー）と
`mcp.json`（3つのゲートツール）が自動検出されます。

## License

Apache-2.0

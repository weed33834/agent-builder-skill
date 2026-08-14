# Agent-Builder-Skill

> **エージェントを作成するためのスキル（プリロード済みプロンプトワークフロー）** —— 各スキルは**自己完結型・プリロード済みのプロンプトワークフロー**で、エージェントは一度読めば正しく実行でき、往復のやり取りが不要になります。

[English](./README.md) | [简体中文](./README.zh.md) | **日本語** · [ドキュメント](./docs/README.md) · [機能リスト](./docs/feature-checklist.md)

[![Release](https://img.shields.io/badge/release-v0.1.0-blue.svg)](https://github.com/weed33834/agent-builder-skill/releases/latest)
[![CI](https://img.shields.io/github/actions/workflow/status/weed33834/agent-builder-skill/ci.yml?branch=main&label=CI&logo=github)](https://github.com/weed33834/agent-builder-skill/actions)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Deep Specs](https://img.shields.io/badge/deep--specs-37-green.svg)](docs/deep-spec/00-template.md)
[![Features](https://img.shields.io/badge/features-1465%2B-brightgreen.svg)](docs/feature-checklist.md)

---

## Agent-Builder-Skill とは

**スキル（Skill）はドキュメントではなく、プリロードされたプロンプトワークフローです。** ある仕事を完了するための工程全体（手順・プロンプト・デフォルト値・UI仕様・受入条件）を1ファイルにまとめ、エージェントはそれを読むだけで**最初から正しく、余計な往復なしで**実行できます。

Agent-Builder-Skill は、実際に使って磨き上げた**実用的で特別なスキル**を収集します。

### フラッグシップスキル：Universal Agent Builder（`agent-builder`）

このハブの中心。**1行の要件**から、**本番運用可能な完全な AI エージェント**（バックエンド + フロントエンド + テスト）を自動構築します：

- 🏗️ **10層アーキテクチャ**（L1 LLM → L10 インフラ）
- 🔌 **フレームワーク非依存**：bare / LangGraph / OpenAI Agents / Claude SDK / ADK / AutoGen（統一 `AgentRuntime` インターフェース）
- 📡 **オープンプロトコル**：MCP（ツール実行）+ A2A（エージェント間連携）
- ⚙️ **設定駆動生成**：`agent.yaml` → `generate.py` でフルアプリを生成
- 🖥️ **完全なUI**：チャット + 管理コンソール + ワークスペース
- 🔒 **セキュリティ内蔵**：プロンプトインジェクション防御 + PII マスキングをパイプラインで強制
- 🧠 **思考層**：オプションのプランニング + リフレクションノード
- ✅ **テスト済み**：43 pytest、11 テンプレートが `bare` / `langgraph` 両方で起動

---

## なぜ「プリロードワークフロー」が重要か

従来のエージェント構築 = 数十回の質問の往復。スキルを使えば：

1. **デフォルトが事前決定**（フレームワーク/モデル/ツール/メモリ/セキュリティ/レイアウト…）
2. **全モジュールが詳細仕様化**（目的/場所/UI/操作/AI生成/受入条件）
3. **深いエンジニアリングも仕様化**（コンテキスト/トークン、ツール呼び出し、メモリ階層、プランニング、リフレクション、マルチエージェント、信頼性、可観測性、評価、運用、性能）
4. **ルール：問題がある時だけ質問、なければデフォルト**

---

## 位置づけ

本スキルの位置づけは**エージェントを作成すること**：1行の要件から、デフォルト値を適用して本番運用可能な AI エージェント（バックエンド+フロントエンド+テスト）を直接生成します。

## クイックスタート（agent-builder）

```bash
# 1) agent.yaml にエージェントを記述（フィールド辞書は SKILL.md 参照）
# 2) 生成
python scripts/generate.py agent.yaml ./my_agent --framework=langgraph   # または --framework=bare
# 3) バックエンド起動
cd my_agent && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8000
# 4) フロントエンド起動
cd my_agent/frontend && npm install && npm run dev
```

> **クイックスタート：** [`DEMO.md`](./DEMO.md)
> 深いドキュメント・機能リスト・受入テスト： [`docs/`](./docs/README.md)

---

## リポジトリ構成

```
SKILL.md                 フラッグシップスキル（Universal Agent Builder）
scripts/generate.py      Agent 生成器（設定 → フルプロジェクト）
templates/               生成器が出力するバックエンド + フロントエンドのテンプレート
docs/                    深度仕様・機能リスト・受入テスト
docs/universal-agent-capability-map.md   市場調査：汎用エージェント能力マップ
```

---

## License

[Apache-2.0](./LICENSE)

**言語：** English（[English](./README.md)）· 简体中文（[简体中文](./README.zh.md)）· 日本語

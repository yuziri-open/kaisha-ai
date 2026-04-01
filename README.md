# KAISHA AI オーケストレーター

KAISHA 向けの AI エージェント管理ダッシュボードです。Paperclip の設計思想を参考にしつつ、コードは新規実装し、SQLite + Express + React + Vite で軽量に構成しています。

## 特徴

- Liquid Glass 風 UI
- 日本語 UI
- エージェント CRUD
- タスクのカンバン / リスト切り替え
- ゴールツリー表示
- ルーティン / Heartbeat の定期実行と手動トリガー
- コスト可視化と予算進捗表示
- 承認管理
- ダークモード切り替え
- SSE によるライブ更新

## 技術スタック

- フロントエンド: React + Vite + TypeScript + Tailwind CSS v4
- コンポーネント方針: shadcn/ui 風の再利用コンポーネント構成
- バックエンド: Node.js + Express
- DB: SQLite (`better-sqlite3`)
- リアルタイム: Server-Sent Events (SSE)
- パッケージマネージャ: pnpm

## 起動

```bash
pnpm install
pnpm dev
```

- API サーバー: `http://localhost:3200`
- UI: `http://localhost:3201`

`pnpm dev` でサーバーと UI が同時起動します。

## ディレクトリ構成

```text
kaisha-ai/
├── server/
├── ui/
├── docs/
├── package.json
└── pnpm-workspace.yaml
```

## 補足

- 初回起動時に seed データが自動投入されます。
- `server/data/kaisha-ai.sqlite` に DB を保存します。
- 詳細手順は [docs/SETUP_GUIDE.md](./docs/SETUP_GUIDE.md) を参照してください。

# GEMINI.md

## 目的
- Gemini CLI 向けのコンテキストと作業方針を定義する。

## 出力スタイル
- 言語: 日本語
- トーン: 簡潔で事実ベース
- 形式: Markdown

## 共通ルール
- 会話は日本語で行う。
- PR とコミットは Conventional Commits に従う。
- PR タイトルとコミット本文の言語: PR タイトルは Conventional Commits 形式（英語推奨）。PR 本文は日本語。コミットは Conventional Commits 形式（description は日本語）。
- 日本語と英数字の間には半角スペースを入れる。

## プロジェクト概要
RSS フィードの多言語翻訳ブリッジサーバー。Google Apps Script API を使用してバッチ翻訳し、翻訳済み RSS XML を配信します。

### 技術スタック
- **言語**: TypeScript
- **フレームワーク**: Fastify
- **パッケージマネージャー**: pnpm@9.0.0
- **主要な依存関係**:
  - fastify 4.25.0
  - axios 1.6.0
  - rss-parser 3.13.0
  - xml2js 0.6.2

## コーディング規約
- フォーマット: 既存設定（ESLint / Prettier / formatter）に従う。
- 命名規則: 既存のコード規約に従う。
- コメント言語: 日本語
- エラーメッセージ: 英語

### 開発コマンド
```bash
# install
pnpm install

# dev
pnpm dev

# build
tsc

# test
jest

# lint
pnpm lint (prettier, eslint, tsc チェック)

```

## 注意事項
- 認証情報やトークンはコミットしない。
- ログに機密情報を出力しない。
- 既存のプロジェクトルールがある場合はそれを優先する。

## リポジトリ固有
- Google Apps Script 翻訳 API 統合
- Vercel デプロイ対応
- バッチ翻訳処理
- HTML コンテンツ対応
- 環境変数ベース設定
- Conventional Commits 準拠
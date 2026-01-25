# GEMINI.md

## 目的

このファイルは、Gemini CLI がこのリポジトリで作業する際のコンテキストと作業方針を定義します。

## 出力スタイル

- **言語**: 日本語
- **トーン**: 簡潔で明確、技術的に正確
- **形式**: マークダウン形式で構造化された回答

## 共通ルール

- 会話は日本語で行う
- コミットメッセージは [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) に従う
  - 形式: `<type>(<scope>): <description>`
  - `<description>` は日本語で記載
  - 例: `feat: ユーザー認証機能を追加`
- ブランチ命名は [Conventional Branch](https://conventional-branch.github.io) に従う
  - 形式: `<type>/<description>`
  - `<type>` は短縮形（feat, fix）を使用
  - 例: `feat/add-user-auth`
- 日本語と英数字の間には半角スペースを入れる

## プロジェクト概要

RSS Translator Bridge は、RSS フィードを翻訳する Fastify ベースの Web サーバーです。

### 主な機能

- RSS フィードの取得と解析
- Google Apps Script（GAS）翻訳 API を使用したバッチ翻訳
- 翻訳済み RSS フィードの配信（XML 形式）
- ヘルスチェックエンドポイント

### 技術スタック

- **言語**: TypeScript (ES modules)
- **フレームワーク**: Fastify
- **パッケージマネージャー**: pnpm
- **テストフレームワーク**: Jest + ts-jest
- **Lint/Format**: ESLint (`@book000/eslint-config`) + Prettier
- **Node.js**: 18.0.0 以上
- **デプロイ先**: Vercel

## コーディング規約

- **フォーマット**: Prettier による自動フォーマット
- **命名規則**: camelCase (変数・関数)、PascalCase (クラス・型)
- **コメント言語**: 日本語
- **エラーメッセージ言語**: 英語
- **TypeScript strict モード**: 有効
- **型安全性**: `any` 型の多用を避ける
- **docstring**: 関数・インターフェースに JSDoc を日本語で記載

## 開発コマンド

```bash
# 依存関係のインストール
pnpm install

# 開発サーバー起動（ホットリロード）
pnpm dev

# プロダクションサーバー起動
pnpm start

# ビルド
pnpm build

# 品質チェック
pnpm lint

# テスト実行
pnpm test

# 型チェック
pnpm typecheck

# Prettier チェック
pnpm lint:prettier

# ESLint チェック
pnpm lint:eslint

# TypeScript 型チェック
pnpm lint:tsc

# Prettier 自動修正
pnpm fix:prettier

# ESLint 自動修正
pnpm fix:eslint
```

## 環境変数

### 必須

- `GAS_URL`: Google Apps Script 翻訳 API の URL

### オプション

- `PORT`: サーバーポート（デフォルト: 3000）
- `HOST`: サーバーホスト（デフォルト: 0.0.0.0）
- `DEFAULT_SOURCE_LANG`: デフォルトソース言語（デフォルト: auto）
- `DEFAULT_TARGET_LANG`: デフォルトターゲット言語（デフォルト: ja）
- `DEFAULT_EXCLUDE_FEED_TITLE`: RSS フィードタイトルを翻訳しないかどうか（デフォルト: true）
- `DEFAULT_EXCLUDE_ITEM_TITLE`: RSS 記事タイトルを翻訳しないかどうか（デフォルト: false）

## 注意事項

### セキュリティ / 機密情報

- API キーや認証情報は `.env` ファイルで管理し、Git にコミットしない
- `.env.example` にはサンプル値のみを記載する
- ログに個人情報や認証情報を出力しない
- 本番環境の環境変数は Vercel の設定で管理する

### 既存ルールの優先

- 既存のコーディング規約、フォーマットルールに従う
- 既存のアーキテクチャパターンを踏襲する
- `@book000/eslint-config` の ESLint ルールに従う

### 既知の制約

- Vercel の 30 秒タイムアウト制限（サーバーレス関数）
- GAS API のタイムアウトは 25 秒に設定
- RSS フィードのアイテム数制限なし（全件翻訳）

## リポジトリ固有

- このプロジェクトは Vercel にデプロイされる
- 翻訳失敗時は元のテキストをフォールバックとして使用する
- HTML コンテンツの翻訳に対応（`content:encoded`, `description`, `summary`）
- サーバーレス関数は `/api/serverless.ts` で実装
- `vercel.json` で Vercel 設定済み

## 主要ファイル

- `src/index.ts`: Fastify サーバーの設定と起動、メインのルーティング
- `src/rss-processor.ts`: RSS フィード取得・解析・XML 再構築
- `src/translator.ts`: GAS API を使用したバッチ翻訳処理
- `src/types.ts`: TypeScript 型定義
- `src/config.ts`: 環境変数ベースの設定管理
- `api/serverless.ts`: Vercel サーバーレス関数エントリーポイント

## API 仕様

### GET /

RSS フィードを翻訳して返すメインエンドポイント

**クエリパラメータ:**

- `url` (必須): 翻訳対象の RSS フィード URL
- `sourceLang` (オプション): ソース言語コード
- `targetLang` (オプション): ターゲット言語コード
- `excludeFeedTitle` (オプション): RSS フィードタイトルを翻訳しないかどうか（true/false）
- `excludeItemTitle` (オプション): RSS 記事タイトルを翻訳しないかどうか（true/false）

**レスポンス:** 翻訳済み RSS XML または エラー JSON

### GET /health

ヘルスチェックエンドポイント

## Gemini CLI の役割

Gemini CLI は、以下の観点での相談・確認に特化します：

- **外部サービス仕様**: Google Apps Script、Vercel などの最新仕様確認
- **最新情報**: 言語・ランタイムのバージョン差、料金・制限・クォータ
- **外部一次情報**: 公式ドキュメント、最新の技術情報の確認
- **外部前提条件**: API の制約、サービスの制限事項の検証

実装の詳細や既存コードのレビューは、Codex CLI の領域です。

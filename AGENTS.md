# AGENTS.md

## 目的

このファイルは、一般的な AI エージェント（Claude Code、GitHub Copilot、Gemini CLI 以外）がこのリポジトリで作業する際の共通作業方針を定義します。

## 基本方針

- **会話言語**: 日本語
- **コード内コメント**: 日本語
- **エラーメッセージ**: 英語
- **日本語と英数字の間**: 半角スペースを挿入
- **コミットメッセージ**: [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) に従う
  - 形式: `<type>(<scope>): <description>`
  - `<description>` は日本語で記載
  - 例: `feat: ユーザー認証機能を追加`
- **ブランチ命名**: [Conventional Branch](https://conventional-branch.github.io) に従う
  - 形式: `<type>/<description>`
  - `<type>` は短縮形（feat, fix）を使用
  - 例: `feat/add-user-auth`

## 判断記録のルール

判断を行う際は、以下の内容を記録する：

1. **判断内容の要約**: 何を決定したか
2. **検討した代替案**: どのような選択肢があったか
3. **採用しなかった案とその理由**: なぜその選択肢を選ばなかったか
4. **前提条件・仮定・不確実性**: 前提としていること、不確実な要素

**重要**: 前提・仮定・不確実性を明示し、仮定を事実のように扱わない。

## プロジェクト概要

RSS Translator Bridge は、RSS フィードを翻訳する Fastify ベースの Web サーバーです。Google Apps Script（GAS）翻訳 API を使用して RSS フィードのタイトルと本文をバッチ翻訳し、翻訳済みの RSS XML を返します。

### 主な機能

- RSS フィードの取得と解析
- Google Apps Script（GAS）翻訳 API によるバッチ翻訳
- 翻訳済み RSS フィードの配信（XML 形式）
- ヘルスチェックエンドポイント

## 技術スタック

- **言語**: TypeScript (ES modules)
- **フレームワーク**: Fastify
- **パッケージマネージャー**: pnpm
- **テストフレームワーク**: Jest + ts-jest
- **Lint/Format**: ESLint (`@book000/eslint-config`) + Prettier
- **Node.js**: 18.0.0 以上
- **デプロイ先**: Vercel

## 開発手順（概要）

### 1. プロジェクト理解

- README.md とプロジェクト固有ドキュメント（CLAUDE.md など）を読む
- src/ ディレクトリ配下の主要ファイルを確認する
- 既存のコードパターンとアーキテクチャを理解する

### 2. 依存関係インストール

```bash
pnpm install
```

### 3. 変更実装

- 既存のコーディング規約に従う
- TypeScript strict モード準拠
- 関数・インターフェースに docstring (JSDoc) を日本語で記載
- 日本語と英数字の間に半角スペースを挿入

### 4. テストと Lint/Format 実行

```bash
# Lint チェック
pnpm lint

# テスト実行
pnpm test

# 型チェック
pnpm typecheck
```

### 5. コミット

- Conventional Commits 形式でコミット
- センシティブな情報が含まれていないことを確認

## コーディング規約

- **TypeScript strict モード**: 有効
- **型安全性**: `any` 型の多用を避ける
- **docstring**: 関数・インターフェースに JSDoc を日本語で記載
- **フォーマット**: Prettier による自動フォーマット
- **Lint**: ESLint ルールに従う

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
- `TRANSLATION_CACHE_ENABLED`: 翻訳キャッシュを有効にするかどうか（デフォルト: true）
- `TRANSLATION_CACHE_TTL_MS`: 翻訳キャッシュの TTL (ミリ秒)（デフォルト: 21600000）
- `TRANSLATION_CACHE_MAX_ITEMS`: 翻訳キャッシュの最大件数（デフォルト: 1000）
- `CDN_CACHE_ENABLED`: CDN キャッシュを有効にするかどうか（デフォルト: true）
- `CDN_CACHE_S_MAXAGE`: CDN キャッシュの TTL (秒)（デフォルト: 300）
- `CDN_CACHE_STALE_WHILE_REVALIDATE`: CDN 再検証の猶予時間 (秒)（デフォルト: 60）

## セキュリティ / 機密情報

- API キーや認証情報は `.env` ファイルで管理し、Git にコミットしない
- `.env.example` にはサンプル値のみを記載する
- ログに個人情報や認証情報を出力しない
- 本番環境の環境変数は Vercel の設定で管理する

## リポジトリ固有

- このプロジェクトは Vercel にデプロイされる（30 秒タイムアウト制限）
- GAS API のタイムアウトは 25 秒に設定
- 翻訳失敗時は元のテキストをフォールバックとして使用する
- RSS フィードのアイテム数制限なし（全件翻訳）
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

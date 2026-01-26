# GitHub Copilot Instructions

## プロジェクト概要

- **目的**: RSS フィードを翻訳して配信する
- **主な機能**: RSS 取得、Google Apps Script（GAS）翻訳 API によるバッチ翻訳、翻訳済み RSS の配信
- **対象ユーザー**: 開発者、多言語 RSS フィードを必要とするユーザー

## 共通ルール

- 会話は日本語で行う。
- コミットメッセージは [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) に従う。
  - 形式: `<type>(<scope>): <description>`
  - `<description>` は日本語で記載
  - 例: `feat: ユーザー認証機能を追加`
- ブランチ命名は [Conventional Branch](https://conventional-branch.github.io) に従う。
  - 形式: `<type>/<description>`
  - `<type>` は短縮形（feat, fix）を使用
  - 例: `feat/add-user-auth`
- 日本語と英数字の間には半角スペースを入れる。

## 技術スタック

- **言語**: TypeScript (ES modules)
- **フレームワーク**: Fastify
- **パッケージマネージャー**: pnpm
- **テストフレームワーク**: Jest + ts-jest
- **Lint/Format**: ESLint (`@book000/eslint-config`) + Prettier
- **Node.js**: 18.0.0 以上

## コーディング規約

- TypeScript strict モード有効
- 型安全性を重視し、`any` 型の多用を避ける
- 関数・インターフェースには docstring (JSDoc) を日本語で記載
- Prettier による自動フォーマット
- ESLint ルールに従う

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

# 品質チェック（コミット前に必須実行）
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

## テスト方針

- **テストフレームワーク**: Jest + ts-jest
- **テストディレクトリ**: `src/__tests__/`
- **テストコマンド**: `pnpm test`
- 新しい機能を追加する際は、必ずテストを追加する。
- Unit Tests と Integration Tests の両方を実装する。
- 外部 API は axios のモックを使用する。

## セキュリティ / 機密情報

- API キーや認証情報は `.env` ファイルで管理し、Git にコミットしない。
- `.env.example` にはサンプル値のみを記載する。
- ログに個人情報や認証情報を出力しない。
- 本番環境の環境変数は Vercel の設定で管理する。

## ドキュメント更新

変更に応じて以下のドキュメントを更新する：

- `README.md`: 使用方法、API 仕様、環境変数
- `CLAUDE.md`: アーキテクチャ、開発コマンド
- `.github/copilot-instructions.md` (このファイル): 開発ルール

## リポジトリ固有

- このプロジェクトは Vercel にデプロイされる（30 秒タイムアウト制限）。
- GAS API のタイムアウトは 25 秒に設定。
- 翻訳失敗時は元のテキストをフォールバックとして使用する。
- RSS フィードのアイテム数制限なし（全件翻訳）。
- HTML コンテンツの翻訳に対応（`content:encoded`, `description`, `summary`）。
- サーバーレス関数は `/api/serverless.ts` で実装。

# CLAUDE.md

## 目的

このファイルは、Claude Code (claude.ai/code) がこのリポジトリで作業する際の作業方針とプロジェクト固有ルールを示します。

## 判断記録のルール

判断は必ずレビュー可能な形で記録すること：

1. **判断内容の要約**: 何を決定したか
2. **検討した代替案**: どのような選択肢があったか
3. **採用しなかった案とその理由**: なぜその選択肢を選ばなかったか
4. **前提条件・仮定・不確実性**: 前提としていること、不確実な要素
5. **他エージェントによるレビュー可否**: 必要に応じて Codex CLI や Gemini CLI に相談可能か

**重要**: 前提・仮定・不確実性を明示すること。仮定を事実のように扱ってはならない。

## プロジェクト概要

RSS Translator Bridge は、RSS フィードを翻訳する Fastify ベースの Web サーバーです。Google Apps Script（GAS）翻訳 API を使用して RSS フィードのタイトルと本文をバッチ翻訳し、翻訳済みの RSS XML を返します。

## 重要ルール

- **会話言語**: 日本語
- **コード内コメント**: 日本語
- **エラーメッセージ**: 英語
- **日本語と英数字の間**: 半角スペースを挿入
- **コミットメッセージ**: [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) に従う
  - 形式: `<type>(<scope>): <description>`
  - `<description>` は日本語で記載
  - 例: `feat: ユーザー認証機能を追加`

## 環境のルール

- **ブランチ命名**: [Conventional Branch](https://conventional-branch.github.io) に従う
  - 形式: `<type>/<description>`
  - `<type>` は短縮形（feat, fix）を使用
  - 例: `feat/add-user-auth`
- **GitHub リポジトリ調査**: テンポラリディレクトリに git clone してコード検索
- **Renovate PR**: Renovate が作成した既存のプルリクエストに対して、追加コミットや更新を行ってはならない

## コード改修時のルール

- 日本語と英数字の間には、半角スペースを挿入しなければならない
- 既存のエラーメッセージで、先頭に絵文字がある場合は、全体でエラーメッセージに絵文字を設定する。絵文字はエラーメッセージに即した一文字の絵文字である必要がある
- TypeScript プロジェクトでは型安全性を重視し、`any` 型の多用を避ける
- 関数やインターフェースには、docstring (JSDoc など) を記載・更新する。日本語で記載する必要がある

## 相談ルール

Codex CLI や Gemini CLI の他エージェントに相談することができる。以下の観点で使い分ける：

### Codex CLI (ask-codex)

- 実装コードに対するソースコードレビュー
- 関数設計、モジュール内部の実装方針などの局所的な技術判断
- アーキテクチャ、モジュール間契約、パフォーマンス／セキュリティといった全体影響の判断
- 実装の正当性確認、機械的ミスの検出、既存コードとの整合性確認

### Gemini CLI (ask-gemini)

- SaaS 仕様、言語・ランタイムのバージョン差、料金・制限・クォータといった、最新の適切な情報が必要な外部依存の判断
- 外部一次情報の確認、最新仕様の調査、外部前提条件の検証

### 指摘への対応ルール

他エージェントが指摘・異議を提示した場合、Claude Code は必ず以下のいずれかを行う。**黙殺・無言での不採用は禁止する**。

- 指摘を受け入れ、判断を修正する
- 指摘を退け、その理由を明示する

以下は必ず実施する：

- 他エージェントの提案を鵜呑みにせず、その根拠や理由を理解する
- 自身の分析結果と他エージェントの意見が異なる場合は、双方の視点を比較検討する
- 最終的な判断は、両者の意見を総合的に評価した上で、自身で下す

## 開発コマンド

### パッケージマネージャー

このプロジェクトは **pnpm** を使用します（package.json に packageManager が指定済み）。

### 基本コマンド

```bash
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
```

### 詳細コマンド

```bash
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

## アーキテクチャと主要ファイル

### 主要コンポーネント

- **src/index.ts**: Fastify サーバーの設定と起動、メインのルーティング
- **src/rss-processor.ts**: RSSParser を使用したフィード取得・解析・XML 再構築
- **src/translator.ts**: GAS API を使用したバッチ翻訳処理
- **src/types.ts**: TypeScript 型定義（RSS、翻訳リクエスト/レスポンス）
- **src/config.ts**: 環境変数ベースの設定管理
- **api/serverless.ts**: Vercel サーバーレス関数エントリーポイント

### データフロー

1. クライアント → `GET /?url=&sourceLang=&targetLang=&excludeFeedTitle=&excludeItemTitle=`
2. RSSProcessor → RSS 取得・解析 → バッチ翻訳項目の準備
3. Translator → GAS API への バッチ翻訳リクエスト
4. レスポンス → 翻訳結果を RSS に適用 → XML 形式で返却

### 環境変数

**必須**:

- `GAS_URL`: Google Apps Script 翻訳 API の URL

**オプション**:

- `PORT`: サーバーポート（デフォルト: 3000）
- `HOST`: サーバーホスト（デフォルト: 0.0.0.0）
- `DEFAULT_SOURCE_LANG`: デフォルトソース言語（デフォルト: auto）
- `DEFAULT_TARGET_LANG`: デフォルトターゲット言語（デフォルト: ja）
- `DEFAULT_EXCLUDE_FEED_TITLE`: RSS フィードタイトルを翻訳しないかどうか（デフォルト: true）
- `DEFAULT_EXCLUDE_ITEM_TITLE`: RSS 記事タイトルを翻訳しないかどうか（デフォルト: false）

## 実装パターン

### 推奨パターン

- Fastify のプラグインシステムを活用する
- 環境変数は `src/config.ts` で一元管理する
- エラーハンドリングは適切に行い、翻訳失敗時は元のテキストをフォールバックとして使用する
- TypeScript の型定義を活用し、型安全性を保つ

### 非推奨パターン

- グローバル変数の使用
- `any` 型の多用
- センシティブな情報のコミット

## テスト

### テスト方針

- Jest + ts-jest を使用
- `src/__tests__/` ディレクトリにテストファイルを配置
- Unit Tests と Integration Tests の両方を実装
- 外部 API（axios）はモックを使用

### 追加テスト条件

- 新しい機能を追加する際は、必ずテストを追加する
- エラーハンドリングのテストも含める
- 翻訳失敗時のフォールバック動作をテストする

### テスト実行

```bash
# 全テスト実行
pnpm test

# 単一ファイルテスト
pnpm test rss-processor.test.ts
```

## ドキュメント更新ルール

### 更新対象

- `README.md`: 使用方法、API 仕様、環境変数
- `CLAUDE.md` (このファイル): アーキテクチャ、開発コマンド、実装パターン
- `.github/copilot-instructions.md`: 開発ルール

### 更新タイミング

- 新しい機能を追加したとき
- API 仕様を変更したとき
- 環境変数を追加・変更したとき
- 開発コマンドを追加・変更したとき

## 作業チェックリスト

### 新規改修時

1. プロジェクトについて詳細に探索し理解すること
2. 作業を行うブランチが適切であること。すでに PR を提出しクローズされたブランチでないこと
3. 最新のリモートブランチに基づいた新規ブランチであること
4. PR がクローズされ、不要となったブランチは削除されていること
5. プロジェクトで指定されたパッケージマネージャ（pnpm）により、依存パッケージをインストールしたこと

### コミット・プッシュする前

1. コミットメッセージが [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) に従っていること。ただし、`<description>` は日本語で記載する
2. コミット内容にセンシティブな情報が含まれていないこと
3. Lint / Format エラーが発生しないこと（`pnpm lint`）
4. 動作確認を行い、期待通り動作すること（`pnpm test`）

### プルリクエストを作成する前

1. プルリクエストの作成をユーザーから依頼されていること
2. コミット内容にセンシティブな情報が含まれていないこと
3. コンフリクトする恐れが無いこと

### プルリクエストを作成したあと

プルリクエストを作成したあとは、以下を必ず実施する。PR 作成後のプッシュ時に毎回実施する。
時間がかかる処理が多いため、Task を使って並列実行すること。

1. コンフリクトが発生していないこと
2. PR 本文の内容は、ブランチの現在の状態を、今までのこの PR での更新履歴を含むことなく、最新の状態のみ、漏れなく日本語で記載されていること。この PR を見たユーザーが、最終的にどのような変更を含む PR なのかをわかりやすく、細かく記載されていること
3. `gh pr checks <PR ID> --watch` で GitHub Actions CI を待ち、その結果がエラーとなっていないこと。成功している場合でも、ログを確認し、誤って成功扱いになっていないこと。もし GitHub Actions が動作しない場合は、ローカルで CI と同等のテストを行い、CI が成功することを保証しなければならない
4. `request-review-copilot` コマンドが存在する場合、`request-review-copilot https://github.com/$OWNER/$REPO/pull/$PR_NUMBER` で GitHub Copilot へレビューを依頼すること。レビュー依頼は自動で行われる場合もあるし、制約により `request-review-copilot` を実行しても GitHub Copilot がレビューしないケースがある
5. 10 分以内に投稿される GitHub Copilot レビューへの対応を行うこと。対応したら、レビューコメントそれぞれに対して返信を行うこと。レビュアーに GitHub Copilot がアサインされていない場合はスキップして構わない
6. `/code-review:code-review` によるコードレビューを実施したこと。コードレビュー内容に対しては、**スコアが 50 以上の指摘事項** に対して対応する（80 がボーダーラインではない）

## リポジトリ固有

- このプロジェクトは Vercel にデプロイされる（30 秒タイムアウト制限）
- GAS API のタイムアウトは 25 秒に設定
- 翻訳失敗時は元のテキストをフォールバックとして使用する
- RSS フィードのアイテム数制限なし（全件翻訳）
- HTML コンテンツの翻訳に対応（`content:encoded`, `description`, `summary`）
- サーバーレス関数は `/api/serverless.ts` で実装
- `vercel.json` で Vercel 設定済み

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

## ワークフロー自動化

### Issue 対応フロー

`"issue #nn を対応してください"` コマンドで以下を自動実行:

```bash
1. gh issue view {nn}                    # Issue情報取得
2. git checkout -b issue-{nn}-{description} --no-track origin/master  # デフォルトブランチからブランチ作成
3. # 実装作業
4. pnpm lint && pnpm test                # 品質検証
5. git commit -m "feat: {title}\n\nCloses #{nn}"  # コミット
6. git push -u origin {branch}           # プッシュ
7. gh pr create --title "feat: {title}" --body "Closes #{nn}"  # PR作成
```

### レビュー対応フロー

`"レビューに対応してください"` コマンドで以下を自動実行:

```bash
1. gh api repos/{owner}/{repo}/pulls/{pr}/comments  # コメント取得
2. Copilot/Human コメントの分類・対応
3. 修正実装
4. pnpm lint && pnpm test               # 品質検証
5. git commit && git push               # コミット・プッシュ
6. GraphQL APIでreview thread解決
```

### Git 操作の自動化

- リモート判定: upstream 優先、非存在時は origin 使用
- ブランチ作成: `--no-track` で独立ブランチ作成
- Conventional Commits 形式でのコミット

# RSS Translator Bridge

RSS Feedの翻訳橋渡しツール。RSSフィードのタイトルと本文を翻訳してRSS形式でそのまま返すサーバー。

## 使用方法

```
https://example.com/?url=https://...&sourceLang=en&targetLang=ja
```

### パラメータ

- `url` (必須): 翻訳したいRSSフィードのURL
- `sourceLang` (オプション): ソース言語（デフォルト: auto）
- `targetLang` (オプション): ターゲット言語（デフォルト: ja）

## セットアップ

### 環境変数

- `GAS_URL` (必須): Google App Script翻訳APIのURL
- `PORT` (オプション): サーバーポート（デフォルト: 3000）
- `HOST` (オプション): サーバーホスト（デフォルト: 0.0.0.0）
- `DEFAULT_SOURCE_LANG` (オプション): デフォルトソース言語（デフォルト: auto）
- `DEFAULT_TARGET_LANG` (オプション): デフォルトターゲット言語（デフォルト: ja）

### 開発

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev

# ビルド
npm run build

# プロダクションサーバーの起動
npm start
```

### デプロイ

Vercel へのデプロイ:

```bash
vercel
```

## ライセンス

MIT

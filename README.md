# ChatGPT Code Saver

ChatGPT 上のコードブロックやチャット内容を、ローカルの project folder に保存しやすくする Chrome 拡張です。
コード保存だけでなく、テンプレート挿入、チャットログ一覧、Download Log 確認にも対応しています。

内部実装や設計メモは [DEVELOPERS.md](DEVELOPERS.md) にまとめています。利用方法だけを知りたい場合は、この README を参照してください。

## できること

- コードブロック先頭の `// file: path/to/file.ext` または `# file: path/to/file.ext` を読み取り、`Save` で project folder 配下へ保存
- `Save As` / `Save All` / `Save As All` による個別保存・一括保存
- `Templates` パネルからのテンプレート挿入、追加、編集
- `Chat Log` モーダルで発話、見出し、コードブロック、リンクを一覧表示
- `Download Log` モーダルで保存結果、保存先、action、source を確認
- `Lightweight Mode`、`Preview lines`、`Compact All` / `Expand All` による表示量の調整

## 画面イメージ

### README ワークフロー

README の説明に対応する代表的な画面です。コード保存、チャットログ、右下パネルの導線をまとめて確認できます。

![Workflow screenshot](docs/images/readme/workflow.png)

### メインパネル

project folder、保存オプション、表示設定、ログ導線をまとめた右下パネルです。

![Main panel screenshot](docs/images/readme/main-panel.png)

### Templates パネル

テンプレートを選択し、チャット入力欄へ挿入できます。

![Templates panel screenshot](docs/images/readme/templates-panel.png)

### Download Log

保存後の履歴を確認できます。保存先、action、source をあとから追えます。

![Download log screenshot](docs/images/readme/download-log.png)

## インストール

1. このリポジトリを `git clone` するか、ZIP で取得します。
2. Chrome で `chrome://extensions/` を開き、右上の `デベロッパーモード` をオンにします。
3. `パッケージ化されていない拡張機能を読み込む` を選び、このリポジトリの `extension/` ディレクトリを指定します。
4. `https://chatgpt.com/` または `https://chat.openai.com/` を開くと、右下にパネルが表示されます。

ビルドは不要です。`extension/` 配下をそのまま読み込みます。

## 使い方

### 1. コードブロックを保存する

1. ChatGPT の回答で、コードブロック先頭に `file:` 付きのパスを含めます。
2. コードブロック上の `Save` を押すと、設定済み project folder 配下へ保存します。
3. 保存先を毎回選びたい場合は `Save As` を使います。
4. 複数ブロックをまとめて保存したい場合は `Save All` / `Save As All` を使います。

### 2. project folder を設定する

1. 右下のパネルで `Set Project Folder` を押して保存先の基準ディレクトリを設定します。
2. `Remove the first "file:" line when saving` をオンにすると、保存時に先頭の `file:` 行を除去します。
3. `Lightweight Mode`、`Preview lines`、`Compact All` / `Expand All` で表示量を調整できます。

### 3. テンプレートを使う

1. `Templates` を開いてテンプレートを選択します。
2. `Insert` でチャット入力欄へ挿入します。
3. `Add` と `Edit` でテンプレートを管理できます。

### 4. チャットログと保存履歴を確認する

1. `Chat Log` では発話、見出し、コードブロック、リンクを一覧できます。
2. `Chat Log` 内のコードブロックにも `Save` / `Save As` / `Save All` / `Save As All` を使えます。
3. `Download Log` では保存結果、保存先、action、source を確認できます。

## 権限とプライバシー

- 使用している権限は `chrome.storage`, `chrome.downloads`, `downloads.open`, `activeTab`, `scripting` です。
- テンプレートとログは Chrome 拡張のストレージに保存されます。
- コードやチャット本文はローカル保存のためにのみ扱います。
- 外部サーバーへ送信する同期機能はありません。

## テスト

```bash
npm test
```

主なテストコマンド:

- `npm run test:unit`
- `npm run test:e2e`
- `npm run test:e2e:ui`
- `npm run test:e2e:live`

## 関連ドキュメント

- 開発者向けメモ: [DEVELOPERS.md](DEVELOPERS.md)
- 補足ドキュメント: [docs/misc](docs/misc)

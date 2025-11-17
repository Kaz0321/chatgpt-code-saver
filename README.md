# gpt-code-saver-extension

Chrome 拡張「ChatGPT Code Apply Helper」のソースです。ChatGPT が生成したコードブロックの 1 行目に `// file: path/to/file.ext` または `# file: path/to/file.ext` を記述すると、ボタン 1 つでローカル プロジェクトに直接保存できます。さらに、ChatGPT 入力欄に貼り付けるテンプレートの管理・貼り付け・編集 UI も提供します。

## 主な機能
- ✅ **コードブロックの自動保存** – `Apply to project` ボタンで `chrome.downloads` API を利用し、指定したファイルパスに上書き保存します。
- ✅ **保存ログの記録・閲覧** – 成功／失敗を `chrome.storage.local` に保存し、UI モーダルから参照・削除できます。
- ✅ **テンプレート管理パネル** – ChatGPT の画面右下にフローティング パネルを追加し、テンプレートの追加・編集・削除・貼り付けを行えます。
- ✅ **テンプレート同期** – テンプレートは `chrome.storage.sync` に保存され、ブラウザ間で同期されます。
- ✅ **拡張機能リロード通知** – バックグラウンドの更新時にトースト通知で知らせます。

## セットアップ & インストール
1. このリポジトリをクローンまたは ZIP で取得し、任意のディレクトリに展開します。
2. Chrome で `chrome://extensions/` を開き、右上の **デベロッパーモード** を有効にします。
3. **パッケージ化されていない拡張機能を読み込む** をクリックし、展開したディレクトリを選択します。
4. ChatGPT (`https://chat.openai.com/` または `https://chatgpt.com/`) を開き、右下に表示される「ChatGPT Helper」パネルとコードブロックの `Apply to project` ボタンを確認します。

> ビルド ステップは不要です。`background/` や `content/` 以下のファイルがそのまま読み込まれます。

## 使い方
### コードブロックを保存する
1. ChatGPT にコードの生成を依頼するとき、**必ず 1 行目に保存先パスを記述**するようプロンプトします。
2. 回答のコードブロック右上に追加される **Apply to project** ボタンを押すと、バックグラウンド サービスワーカーが `chrome.downloads.download` を実行してローカル ファイルに上書き保存します。
3. 成功／失敗は画面下部のトーストとログに記録されます。ログはパネルの「ログ」ボタンから参照できます。

### テンプレート パネルを使う
1. 「テンプレ」ドロップダウンからテンプレートを選択し、「選択テンプレ貼り付け」で ChatGPT 入力欄に貼り付けます。
2. 「編集」「追加」ボタンでテンプレート モーダルを開き、タイトルと内容を編集します。保存すると `chrome.storage.sync` に永続化されます。
3. 「この拡張をリロード」ボタンでサービスワーカーを再起動できます。最新版へ更新した直後は `reloadNotifier` がトースト通知を表示します。

## アーキテクチャ
```
manifest.json (MV3)
├─ background/
│  ├─ index.js          … メッセージルーター。apply/log/template/reload を仲介。
│  ├─ applyCode.js      … ダウンロード API を呼び出して保存＆ログを記録。
│  ├─ logStore.js       … chrome.storage.local でログの追加・取得・削除。
│  └─ templateStore.js  … chrome.storage.sync でテンプレートを取得・保存。
└─ content/
   ├─ init.js           … 初期化エントリ。テンプレ読込→UI生成→コード監視。
   ├─ state.js          … グローバル state (テンプレ配列/選択 ID)。
   ├─ templateStore.js  … テンプレの同期、入力欄への貼り付けヘルパ。
   ├─ templateEditor.js … モーダル UI と CRUD 操作。
   ├─ panel.js          … 画面右下のフローティング パネル。
   ├─ codeBlocks.js     … `pre code` を装飾し、保存ボタンを付与。
   ├─ logModal.js       … 保存ログのモーダル表示。
   ├─ toast.js          … 軽量トースト通知。
   └─ reloadNotifier.js … 拡張リロード通知の表示。
```

### クラス図 (モジュール間の責務)
```mermaid
classDiagram
    class BackgroundServiceWorker {
      +onInstalled()
      +onMessage(message)
    }
    class ApplyCodeHandler {
      +cgptHandleApplyCodeBlock(msg)
    }
    class LogStore {
      +cgptAppendLog(entry)
      +cgptGetLogs()
      +cgptClearLogs()
    }
    class TemplateStoreBG {
      +cgptGetTemplates()
      +cgptSetTemplates(templates)
    }
    class ContentInit {
      +init()
    }
    class TemplateStoreContent {
      +loadTemplatesFromStorage()
      +saveTemplatesToStorage()
      +insertTemplateToInput()
    }
    class TemplatePanel {
      +createFloatingPanel()
    }
    class TemplateEditor {
      +openTemplateEditor(mode)
    }
    class CodeBlockDecorator {
      +decorateCodeBlocks()
      +setupMutationObserver()
    }
    class LogViewer {
      +openLogViewer()
    }
    class Toast {
      +showToast(message)
    }
    class ReloadNotifier {
      +checkAndNotifyReloaded()
    }

    BackgroundServiceWorker --> ApplyCodeHandler : delegates applyCodeBlock
    BackgroundServiceWorker --> LogStore : append/get/clear logs
    BackgroundServiceWorker --> TemplateStoreBG : get/set templates
    ContentInit --> TemplateStoreContent : load templates
    ContentInit --> TemplatePanel
    ContentInit --> CodeBlockDecorator
    TemplatePanel --> TemplateEditor
    TemplatePanel --> TemplateStoreContent
    TemplateStoreContent --> Toast
    CodeBlockDecorator --> BackgroundServiceWorker : sendMessage
    LogViewer --> BackgroundServiceWorker : getLogs/clearLogs
    ReloadNotifier --> Toast
```

## メッセージ フロー
| 送信元 | 宛先 | type | 役割 |
| ------ | ---- | ---- | ---- |
| content/codeBlocks | background/index | `applyCodeBlock` | コード保存を要求し、結果をログ化 |
| content/templateStore | background/index | `getTemplates` / `setTemplates` | テンプレートの同期 |
| content/logModal | background/index | `getLogs` / `clearLogs` | 保存ログをモーダルに表示 |
| content/panel | background/index | `reloadExtension` | バックグラウンドをリロード |

## 開発メモ
- 依存する npm パッケージやビルドはありません。必要に応じて `content/` や `background/` の JS ファイルを直接編集してください。
- デバッグ時は DevTools > Sources > Service Workers で `background/index.js` を確認し、`chrome.runtime.sendMessage` のレスポンスを追跡します。
- 既定テンプレート文言は `content/state.js` の `DEFAULT_TEMPLATE_CONTENT` で定義されています。社内規約などに合わせて編集してください。

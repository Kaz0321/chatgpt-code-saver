# 開発者向けガイド

このドキュメントでは gpt-code-saver-extension のアーキテクチャ、メッセージ フロー、開発時の注意点をまとめています。ユーザー向けの概要やセットアップは [README.md](README.md) を参照してください。README には利用に必要な情報のみを記載し、実装やリファクタリングの詳細は本ドキュメント側で管理します。

## リポジトリ構成
```
extension/
├─ manifest.json (MV3)
├─ background/
│  ├─ index.js          … ルート初期化。onInstalled 登録とメッセージハンドラ設定。
│  ├─ applyCode.js      … ダウンロード API を呼び出して保存＆ログを記録。
│  ├─ logStore.js       … chrome.storage.local でログの追加・取得・削除。
│  ├─ templateStore.js  … chrome.storage.sync でテンプレートを取得・保存。
│  ├─ messageHandlers.js … type ごとの runtime メッセージハンドラを集約。
│  └─ reloadState.js    … 拡張の再読込状態を管理し、初回起動で更新。
├─ shared/
│  └─ filePathValidation.js … 背景・コンテンツ共通のファイルパス検証ロジック。
└─ content/
   ├─ init.js           … 初期化エントリ。テンプレ読込→UI生成→コード監視。
   ├─ state.js          … テンプレ配列/選択 ID を集約管理するアクセサ群。
   ├─ saveOptions.js    … 保存時のメタデータ除去フラグを保持。
   ├─ chatInput.js      … ChatGPT 入力欄の検出とテキスト挿入ユーティリティ。
   ├─ templateStore.js  … テンプレの同期、貼り付けコマンドの調停役。
   ├─ templateEditor.js … モーダル UI と CRUD 操作。
   ├─ panel.js          … 画面右下のフローティング パネル。
   ├─ codeBlockMetadata.js … コードブロック先頭の `file:` メタデータを解析。
   ├─ codeBlockViewMode.js … ラップ要素生成、行数制御、ビュー切替処理。
   ├─ codeBlockButtons.js … 保存/コピー/表示切替ボタン生成とハンドラ群。
   ├─ codeBlocks.js     … `pre code` 装飾のエントリ。各責務モジュールを連携。
   ├─ logModal.js       … 保存ログのモーダル表示＋ファイルオープン。
   ├─ chatLogTracker.js … ユーザー／アシスタント発話とコードブロックを追跡。
   ├─ chatLogModal.js   … チャット履歴と対応コードブロックを一覧化。
   ├─ toast.js          … 軽量トースト通知。
   └─ reloadNotifier.js … 拡張リロード通知の表示。

tests/
├─ e2e/                … Playwright の E2E / 収集系 spec
├─ unit/               … Node 組み込み test による unit test
├─ fixtures/           … 追跡する HTML fixture
├─ helpers/            … テスト共通 helper
├─ tools/              … 収集・検証・環境補助コマンド
├─ config/             … Playwright 補助設定
└─ artifacts/          … Git 管理しない証跡出力
```

## モジュール間の責務
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
    class DownloadOpener {
      +openDownloadedFile(downloadId)
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
    class ChatLogTracker {
      +initChatLogTracker()
      +getChatLogEntries()
      +highlightChatMessageElement()
    }
    class ChatLogModal {
      +openChatLogModal()
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
    BackgroundServiceWorker --> DownloadOpener : openDownloadedFile
    ContentInit --> TemplateStoreContent : load templates
    ContentInit --> TemplatePanel
    ContentInit --> CodeBlockDecorator
    ContentInit --> ChatLogTracker
    TemplatePanel --> TemplateEditor
    TemplatePanel --> TemplateStoreContent
    TemplatePanel --> ChatLogModal
    TemplateStoreContent --> Toast
    CodeBlockDecorator --> BackgroundServiceWorker : sendMessage
    LogViewer --> BackgroundServiceWorker : getLogs/clearLogs
    ChatLogModal --> ChatLogTracker : readEntries/highlight
    ChatLogModal --> BackgroundServiceWorker : applyCodeBlock
    ReloadNotifier --> Toast
```

## メッセージ フロー
| 送信元 | 宛先 | type | 役割 |
| ------ | ---- | ---- | ---- |
| content/codeBlocks | background/index | `applyCodeBlock` | コード保存を要求し、結果をログ化 |
| content/chatLogModal | background/index | `applyCodeBlock` | 履歴モーダルから即時ダウンロードを要求 |
| content/templateStore | background/index | `getTemplates` / `setTemplates` | テンプレートの同期 |
| content/logModal | background/index | `getLogs` / `clearLogs` | 保存ログをモーダルに表示 |
| content/logModal | background/index | `openDownloadedFile` | ダウンロード済みファイルを OS で開く |

## 開発フローのメモ
- 依存する npm パッケージやビルドはなく、拡張本体は `extension/content/` と `extension/background/` を直接編集します。
- デバッグ時は DevTools > Sources > Service Workers で `extension/background/index.js` のログや `chrome.runtime.sendMessage` のレスポンスを確認します。
- 既定テンプレート文言は `extension/content/state.js` の `DEFAULT_TEMPLATE_CONTENT` で定義されています。アクセサ (`cgptSetTemplates`, `cgptSetSelectedTemplateId` など) を経由して状態を更新し、単一責務を保ってください。
- 権限を追加／削除する場合は `extension/manifest.json` を更新し、README の「権限とプライバシー」節の整合性も確認します。

### v0.2.0 リファクタリングのポイント
- `background/applyCode.js` は入力バリデーション・ログ生成・ダウンロード実行をそれぞれ独立関数に分割し、単体で差し替えやすくしました。
- `content/init.js` では、オプション読み込みごとのラッパー (`cgptEnsureLoaded` など) を追加して初期化手順を段階化し、読み込み順の可読性を向上させています。
- バージョンは `manifest.json` と `package.json` を 0.2.0 にそろえています。双方の更新漏れがないか、リリース前に必ず確認してください。

## リリースとバージョン管理
- 拡張の公開バージョンは `manifest.json` と `package.json` の両方で同じ値にそろえます。権限の追加・削除が伴う場合は、README の説明も合わせて見直してください。
- リリースタグは `vX.Y.Z` 形式で作成します。タグを打つ前に `git status` がクリーンであることと、サービスワーカーのバージョンが期待どおりに更新されていることを確認してください。
- 機能追加やリファクタリングでは、保存処理・テンプレ管理・チャットログ管理といった単一機能ごとにファイルを分け、変更範囲を限定します。

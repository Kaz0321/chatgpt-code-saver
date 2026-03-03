# TODO

進行中の改善項目を整理するためのメモです。完了した項目も履歴として残します。

## Status

- `pending`: 未着手
- `in_progress`: 作業中
- `done`: 完了
- `deferred`: 保留

## Work Items

| Order | Status | Theme | Task | Notes |
| --- | --- | --- | --- | --- |
| 1 | done | Code Save UI | コードブロックの保存導線を改善する | 2026-03-03: 保存導線を画面上で扱いやすい構成に調整。表示位置やレイアウトも見直し。 |
| 2 | done | Save Path UX | `file:` メタデータの扱いを改善する | 2026-03-03: 要件を再確認し、現状の `// file:` / `# file:` をコードブロック先頭に置く運用を継続する方針でクローズ。必要なら将来は表示面のみ改善する。 |
| 3 | deferred | Code View | コードブロックの compact 表示を見直す | 現状は compact 表示のメリットより読みにくさが目立つため保留。必要なら別案で再検討。 |
| 4 | done | Chat Tools | チャット系 UI の表示整理を行う | 2026-03-03: Chat Log は `User` / `GPT 5.2 Thinking` 表示へ整理。チャットウィンドウ本体でもタグの横に時刻を表示するよう修正。 |
| 5 | done | Heading Fold | 見出し fold の挙動を改善する | 2026-03-03: 階層に応じた fold 表示を整理し、インラインの視認性と操作性を調整。 |
| 6 | done | Panel UX | 常設フローティングパネルの視認性を改善する | 2026-03-03: FAB から常設パネルへ変更し、操作箇所を集約。 |
| 7 | pending | Save Flow | Chat Log 保存と Code Save の保存系を整理する | Chat Log と Code Save の保存先や役割の違いを分かりやすくする。 |
| 8 | pending | Settings | 設定項目の整理を進める | lightweight mode、view mode、heading controls などの役割を見直す。 |
| 9 | done | Layout | レイアウト調整を行う | 2026-03-03: `main` の `margin-right` / `padding-bottom` を調整し、パネルと本文の干渉を減らした。 |
| 10 | pending | Scope | Save UI の適用範囲を見直す | すべてのコードブロックへ適用するか、メタデータ付きだけにするかを整理する。 |

## Recommended Order

1. Code Save UI
2. Save Path UX
3. Layout
4. Panel UX
5. Chat Tools
6. Heading Fold
7. Settings
8. Save Flow
9. Code View
10. Scope

## Update Rules

- 作業を始めたら `Status` を `in_progress` に更新する。
- 完了したら `done` に更新し、`Notes` に日付と内容を追記する。
- 保留にした項目は `deferred` にし、理由を `Notes` に残す。
## 2026-03-03 UI Update

- Done: unified chat chips, panel buttons, helper modal buttons, and shared button/chip rendering through `extension/shared/uiStyles.js`.
- Done: simplified the main tool panel layout to avoid horizontal overflow and keep `Logs` at the bottom of the panel flow.
- Done: moved template management out of the main panel. `Templates` is now opened from a floating button next to `Tools`.
- Done: added current UI evidence captures.
  - `tests/artifacts/panel-readability/screenshots/panel-only.png`
  - `tests/artifacts/template-panel-readability/screenshots/template-panel-only.png`
  - `tests/artifacts/template-panel-readability/screenshots/template-panel-context.png`
- Done: updated `tests/e2e/readme-behavior.spec.js` for the new `Templates` entrypoint.

## Remaining UI Checks

- Decide whether the panel title should be shortened to reduce wrapping in narrow widths.
- Decide whether the floating `Templates` panel should remember open/closed state across reloads.

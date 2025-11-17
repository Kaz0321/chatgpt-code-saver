# gpt-code-saver-extension

Chrome extension that saves ChatGPT code blocks directly to local files and provides template management helpers.

## Project structure

- `background/` – background service worker and supporting modules such as logging, template persistence, and download handling.
- `content/` – content scripts split by concern (state, templates, UI panel, log viewer, etc.) for easier review and maintenance.
- `manifest.json` – Chrome extension manifest (MV3).

The large monolithic background/content scripts were divided so future diffs remain targeted and reviewers can easily locate logic.

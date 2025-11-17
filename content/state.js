// Shared state for the content scripts
const DEFAULT_TEMPLATE_CONTENT = `【コード出力ルール】
- 1行目に "// file: /Volumes/data/Users/soneky/Downloads/chatgpt-code-apply-helper/ファイル名.ext" または "# file: 相対/パス/ファイル名.ext" を書いてください。
- 2行目以降をファイル内容として扱ってください。
- 1ファイルにつき1つのコードブロックを使ってください。
`;

let templates = [];
let selectedTemplateId = null;

function generateId() {
  return "tpl_" + Math.random().toString(36).slice(2);
}

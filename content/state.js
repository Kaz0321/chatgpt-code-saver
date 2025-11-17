// Shared state for the content scripts
const DEFAULT_TEMPLATE_CONTENT = `【コード出力ルール】
- 1行目に "// file: /Volumes/data/Users/soneky/Downloads/chatgpt-code-apply-helper/ファイル名.ext" または "# file: 相対/パス/ファ
イル名.ext" を書いてください。
- 2行目以降をファイル内容として扱ってください。
- 1ファイルにつき1つのコードブロックを使ってください。
`;

const cgptTemplateState = {
  templates: [],
  selectedTemplateId: null,
};

function cgptGetTemplates() {
  return cgptTemplateState.templates;
}

function cgptSetTemplates(newTemplates) {
  cgptTemplateState.templates = Array.isArray(newTemplates)
    ? newTemplates
    : [];
}

function cgptGetSelectedTemplateId() {
  return cgptTemplateState.selectedTemplateId;
}

function cgptSetSelectedTemplateId(templateId) {
  cgptTemplateState.selectedTemplateId = templateId;
}

function cgptGenerateTemplateId() {
  return "tpl_" + Math.random().toString(36).slice(2);
}

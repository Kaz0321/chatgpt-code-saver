// Shared state for the content scripts
const DEFAULT_TEMPLATE_CONTENT = `// Code output rules
// - Add "// file: relative/path.ext" or "# file: relative/path.ext" on the first line.
// - Treat every line after the first as file content.
// - Use one code block per file.
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

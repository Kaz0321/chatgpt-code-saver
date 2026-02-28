// Shared state for the content scripts

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

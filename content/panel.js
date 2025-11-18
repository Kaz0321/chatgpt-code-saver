function createFloatingPanel() {
  if (document.getElementById("cgpt-code-helper-panel")) return;

  const panel = createPanelContainer();
  panel.appendChild(createPanelTitle());
  panel.appendChild(createProjectFolderSection());
  panel.appendChild(createSaveOptionsSection());
  panel.appendChild(createTemplateSection());
  panel.appendChild(createViewSection());
  panel.appendChild(createLogSection());

  document.body.appendChild(panel);
}

function createLogSection() {
  const logSection = document.createElement("div");
  logSection.appendChild(createSectionLabel("Logs"));
  const logButtons = createButtonRow();
  const logButtonVariant = "accent";

  const chatLogBtn = createPanelButton("Chat Log", logButtonVariant);
  chatLogBtn.style.flex = "1";
  chatLogBtn.addEventListener("click", () => {
    if (typeof openChatLogModal === "function") {
      openChatLogModal();
    } else {
      alert("Unable to open the chat log viewer.");
    }
  });
  logButtons.appendChild(chatLogBtn);

  const historyBtn = createPanelButton("Save Log", logButtonVariant);
  historyBtn.style.flex = "1";
  historyBtn.addEventListener("click", () => {
    openLogViewer();
  });
  logButtons.appendChild(historyBtn);
  logSection.appendChild(logButtons);
  return logSection;
}

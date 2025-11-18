function createLogSection() {
  const logSection = document.createElement("div");
  logSection.appendChild(createSectionLabel("履歴・ログ"));
  const logButtons = createButtonRow();

  const chatLogBtn = createPanelButton("チャットログ", "accent");
  chatLogBtn.style.flex = "1";
  chatLogBtn.addEventListener("click", () => {
    if (typeof openChatLogModal === "function") {
      openChatLogModal();
    } else {
      alert("チャットログビューを開けませんでした。");
    }
  });
  logButtons.appendChild(chatLogBtn);

  const historyBtn = createPanelButton("保存ログ", "secondary");
  historyBtn.style.flex = "1";
  historyBtn.addEventListener("click", () => {
    openLogViewer();
  });
  logButtons.appendChild(historyBtn);
  logSection.appendChild(logButtons);
  return logSection;
}

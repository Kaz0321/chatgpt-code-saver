function cgptInitChatToolsFeature(root = document) {
  if (typeof initChatLogTracker === "function") {
    initChatLogTracker(root);
  }
}

function cgptFindChatInputElement() {
  const selectors = [
    "div[contenteditable='true'][data-testid='textbox']",
    "div[contenteditable='true'][role='textbox']",
    "div[contenteditable='true']",
    "textarea[data-testid='chat-input']",
    "textarea",
  ];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) return el;
  }
  return null;
}

function cgptInsertTextToChatInput(text) {
  const input = cgptFindChatInputElement();
  if (!input) {
    return false;
  }

  if (input.tagName === "TEXTAREA") {
    const existing = input.value;
    const prefix =
      existing && existing.trim().length > 0
        ? existing.replace(/\s*$/, "") + "\n\n"
        : "";
    input.focus();
    input.value = prefix + text;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }

  input.focus();
  const selection = window.getSelection();
  const doc = input.ownerDocument || document;
  const frag = doc.createDocumentFragment();

  const hasExisting =
    (input.textContent && input.textContent.trim().length > 0) ||
    (input.innerHTML && input.innerHTML.replace(/<br\s*\/?>/gi, "").trim().length > 0);

  if (hasExisting) {
    frag.appendChild(doc.createElement("br"));
  }

  const lines = text.split("\n");
  lines.forEach((line, index) => {
    if (index > 0) {
      frag.appendChild(doc.createElement("br"));
    }
    if (line.length > 0) {
      frag.appendChild(doc.createTextNode(line));
    }
  });

  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    range.collapse(false);
    range.insertNode(frag);
    selection.removeAllRanges();
    const rangeEnd = doc.createRange();
    rangeEnd.selectNodeContents(input);
    rangeEnd.collapse(false);
    selection.addRange(rangeEnd);
  } else {
    input.appendChild(frag);
  }

  return true;
}

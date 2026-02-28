function cgptParseCodeBlockMetadata(code) {
  if (!code) return null;
  const normalized = (code.innerText || "").replace(/^\ufeff/, "").replace(/\r\n/g, "\n");
  const { firstLineRaw, remainingText } = cgptExtractFirstLine(normalized);
  const match =
    firstLineRaw.trim().match(/^\/\/\s*file:\s*(.+)$/i) ||
    firstLineRaw.trim().match(/^#\s*file:\s*(.+)$/i);
  if (!match) return null;

  const filePath = match[1].trim();
  if (!filePath) return null;

  return { filePath, content: remainingText, metadataLine: firstLineRaw };
}

function cgptExtractFirstLine(text) {
  const newlineIndex = text.indexOf("\n");
  const firstLineRaw = newlineIndex === -1 ? text : text.slice(0, newlineIndex);
  const remainingText = newlineIndex === -1 ? "" : text.slice(newlineIndex + 1);
  return { firstLineRaw, remainingText };
}

function cgptGetNormalizedCodeText(code) {
  if (!code) return "";
  const text = code.innerText || code.textContent || "";
  return text.replace(/\r\n/g, "\n");
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    cgptParseCodeBlockMetadata,
    cgptGetNormalizedCodeText,
  };
}

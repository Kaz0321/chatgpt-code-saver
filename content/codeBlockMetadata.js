function cgptParseCodeBlockMetadata(code) {
  if (!code) return null;
  const text = (code.innerText || "").replace(/^\ufeff/, "").replace(/\r\n/g, "\n");
  const lines = text.split("\n");
  if (!lines.length) return null;

  const firstLineRaw = (lines[0] || "").replace(/^\ufeff/, "");
  const match =
    firstLineRaw.trim().match(/^\/\/\s*file:\s*(.+)$/i) ||
    firstLineRaw.trim().match(/^#\s*file:\s*(.+)$/i);
  if (!match) return null;

  const filePath = match[1].trim();
  if (!filePath) return null;

  const content = lines.slice(1).join("\n");
  return { filePath, content, metadataLine: firstLineRaw };
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

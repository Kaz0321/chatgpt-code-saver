function cgptParseCodeBlockMetadata(code) {
  if (!code) return null;
  const text = (code.innerText || "").replace(/^\ufeff/, "").replace(/\r\n/g, "\n");
  const lines = text.split("\n");
  if (!lines.length) return null;

  const firstLine = lines[0].replace(/^\ufeff/, "");
  const match =
    firstLine.trim().match(/^\/\/\s*file:\s*(.+)$/i) ||
    firstLine.trim().match(/^#\s*file:\s*(.+)$/i);
  if (!match) return null;

  const filePath = match[1].trim();
  if (!filePath) return null;

  const content = lines.slice(1).join("\n");
  return { filePath, content };
}

function cgptGetNormalizedCodeText(code) {
  if (!code) return "";
  const text = code.innerText || code.textContent || "";
  return text.replace(/\r\n/g, "\n");
}

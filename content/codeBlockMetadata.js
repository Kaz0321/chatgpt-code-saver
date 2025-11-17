function cgptParseCodeBlockMetadata(code) {
  if (!code) return null;
  const text = (code.innerText || "").replace(/^\ufeff/, "").replace(/\r\n/g, "\n");
  const lines = text.split("\n");
  if (!lines.length) return null;

  let metadataLineIndex = -1;
  let filePath = "";

  for (let i = 0; i < lines.length; i++) {
    const trimmedLine = lines[i].replace(/^\ufeff/, "").trim();
    if (!trimmedLine) {
      continue;
    }
    const match =
      trimmedLine.match(/^\/\/\s*file:\s*(.+)$/i) ||
      trimmedLine.match(/^#\s*file:\s*(.+)$/i);
    if (!match) {
      break;
    }
    filePath = match[1].trim();
    if (!filePath) {
      break;
    }
    metadataLineIndex = i;
    break;
  }

  if (metadataLineIndex === -1 || !filePath) return null;

  const content = lines.slice(metadataLineIndex + 1).join("\n");
  return { filePath, content };
}

function cgptGetNormalizedCodeText(code) {
  if (!code) return "";
  const text = code.innerText || code.textContent || "";
  return text.replace(/\r\n/g, "\n");
}

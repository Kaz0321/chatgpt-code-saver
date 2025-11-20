function cgptNormalizeChatLogLineEndings(text) {
  return String(text || "").replace(/\r\n/g, "\n");
}

function cgptCreateSingleLinePreview(text, lineLimit = 1) {
  if (!text) return "";
  if (!lineLimit || lineLimit <= 0) return text;
  const normalized = cgptNormalizeChatLogLineEndings(text);
  const lines = normalized.split("\n");
  const firstLine = lines[0] || "";
  const hasMore = lines.length > lineLimit;
  return hasMore ? `${firstLine.trimEnd()}...` : firstLine;
}

function cgptFormatChatLogTimestamp(ts) {
  const date = new Date(ts);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleString();
  }
  return ts || "";
}

function cgptCollectAssistantBlocksForEntry(entry, nextEntry, allEntries) {
  const blocks = [];
  if (!entry || !Array.isArray(allEntries)) {
    return blocks;
  }
  const startOrder = entry.order;
  const endOrder = nextEntry ? nextEntry.order : Infinity;
  allEntries
    .filter((candidate) => candidate.role === "assistant" && candidate.order > startOrder && candidate.order < endOrder)
    .forEach((assistantEntry) => {
      if (!assistantEntry.element) return;
      cgptExtractFormattedCodeBlocksFromElement(assistantEntry.element).forEach((block) => {
        blocks.push(block);
      });
    });
  return blocks;
}

function cgptCollectAssistantUrlsForEntry(entry, nextEntry, allEntries) {
  const urls = [];
  if (!entry || !Array.isArray(allEntries)) {
    return urls;
  }
  const startOrder = entry.order;
  const endOrder = nextEntry ? nextEntry.order : Infinity;
  const seen = new Set();
  allEntries
    .filter((candidate) => candidate.role === "assistant" && candidate.order > startOrder && candidate.order < endOrder)
    .forEach((assistantEntry) => {
      if (!assistantEntry.element) return;
      cgptExtractStandaloneUrlsFromElement(assistantEntry.element).forEach((link) => {
        const key = `${link.url}|${link.text}`;
        if (seen.has(key)) return;
        seen.add(key);
        urls.push(link);
      });
    });
  return urls;
}

function cgptExtractFormattedCodeBlocksFromElement(element) {
  const results = [];
  if (!element) return results;
  element.querySelectorAll("pre code").forEach((codeEl) => {
    const rawText = codeEl.textContent || "";
    const normalized = cgptNormalizeChatLogLineEndings(rawText);
    const lines = normalized.split("\n");
    if (!lines.length) return;
    const firstLine = lines[0].trim();
    const match =
      firstLine.match(/^\/\/\s*file:\s*(.+)$/i) || firstLine.match(/^#\s*file:\s*(.+)$/i);
    if (!match) return;
    const filePath = match[1].trim();
    if (!filePath) return;
    const content = lines.slice(1).join("\n");
    const blockElement = codeEl.closest("pre") || codeEl;
    results.push({ filePath, fileName: cgptDeriveFileName(filePath), content, element: blockElement });
  });
  return results;
}

function cgptExtractStandaloneUrlsFromElement(element) {
  const results = [];
  if (!element) return results;
  element.querySelectorAll("a[href]").forEach((anchor) => {
    if (anchor.closest("pre")) return;
    const href = anchor.getAttribute("href") || "";
    if (!/^https?:\/\//i.test(href)) return;
    const text = (anchor.textContent || "").trim();
    results.push({ url: href, text });
  });
  return results;
}

function cgptDeriveFileName(filePath) {
  if (!filePath) return "";
  const normalized = filePath.replace(/\\/g, "/");
  const parts = normalized.split("/");
  return parts[parts.length - 1] || filePath;
}

function cgptBuildCodeMetaInfoText(content) {
  if (!content) {
    return "No code detected in this block.";
  }
  const normalized = cgptNormalizeChatLogLineEndings(content);
  const lines = normalized.split("\n");
  const nonEmptyLines = lines.filter((line) => line.trim().length > 0).length;
  const totalChars = normalized.length;
  const summaryParts = [];
  summaryParts.push(`Lines: ${lines.length}`);
  summaryParts.push(`Non-empty: ${nonEmptyLines}`);
  summaryParts.push(`Characters: ${totalChars}`);
  return summaryParts.join(" • ");
}

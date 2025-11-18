const CGPT_FILE_PATH_ERROR_MESSAGES = {
  missing: "ファイルパスが指定されていません",
  empty: "ファイルパスが空です",
  leadingSlash: "ファイルパスの先頭に / または \\ は使用できません",
  invalidChar: "ファイルパスに使用できない文字が含まれています",
  parentTraversal: "ファイルパスに .. は使用できません",
};

function cgptValidateFilePath(rawFilePath) {
  if (typeof rawFilePath !== "string") {
    return { ok: false, error: CGPT_FILE_PATH_ERROR_MESSAGES.missing };
  }

  const trimmed = rawFilePath.trim();
  if (!trimmed) {
    return { ok: false, error: CGPT_FILE_PATH_ERROR_MESSAGES.empty };
  }

  if (/^[\\/]/.test(trimmed)) {
    return { ok: false, error: CGPT_FILE_PATH_ERROR_MESSAGES.leadingSlash };
  }

  const invalidCharPattern = /[<>:"|?*\x00]/;
  if (invalidCharPattern.test(trimmed)) {
    return { ok: false, error: CGPT_FILE_PATH_ERROR_MESSAGES.invalidChar };
  }

  const segments = trimmed.split(/[\\/]+/);
  if (segments.some((segment) => segment === "..")) {
    return { ok: false, error: CGPT_FILE_PATH_ERROR_MESSAGES.parentTraversal };
  }

  return { ok: true, filePath: trimmed };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    CGPT_FILE_PATH_ERROR_MESSAGES,
    cgptValidateFilePath,
  };
}

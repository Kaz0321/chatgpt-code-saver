const CGPT_FILE_PATH_ERROR_MESSAGES = {
  missing: "File path is not provided.",
  empty: "File path cannot be empty.",
  leadingSlash: "File path must not start with / or \\\\.",
  invalidChar: "File path contains unsupported characters.",
  parentTraversal: "File path cannot include .. segments.",
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

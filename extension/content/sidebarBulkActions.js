const CGPT_SIDEBAR_ACTION_LABELS = {
  archive: ["Archive", "アーカイブ"],
  delete: ["Delete", "削除"],
  rename: ["Rename", "Rename title", "名前を変更", "タイトルを変更"],
  addToProject: [
    "Add to project",
    "Move to project",
    "Move to project...",
    "Project に追加",
    "Project に移動",
    "プロジェクトに追加",
    "プロジェクトに移動",
    "プロジェクトに移動する",
  ],
  newProject: ["New project", "プロジェクトを作成", "新しいプロジェクト"],
  confirmDelete: ["Delete", "削除", "Confirm", "確認"],
  confirmArchive: ["Archive", "アーカイブ", "Confirm", "確認"],
  confirmRename: ["Save", "Rename", "保存", "変更"],
};

function cgptSidebarWait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cgptHasOpenSidebarDialog() {
  return Boolean(
    document.querySelector("[data-cgpt-dialog='1'], [role='dialog']")
  );
}

function cgptIsSidebarHelperNode(node) {
  if (!node || node.nodeType !== 1) return false;
  if (node.id && String(node.id).startsWith("cgpt-helper-")) {
    return true;
  }
  return Boolean(
    typeof node.closest === "function" &&
      node.closest("[id^='cgpt-helper-'], .cgpt-helper-fold")
  );
}

async function cgptWaitForSidebarRefresh() {
  await cgptSidebarWait(120);
  if (typeof cgptRefreshSidebarConversationSnapshot === "function") {
    cgptRefreshSidebarConversationSnapshot(document);
  }
}

function cgptFindConversationRowElement(conversation) {
  const key = conversation && (conversation.conversationId || conversation.id);
  if (!key || typeof document.querySelectorAll !== "function") return null;
  const anchors = Array.from(document.querySelectorAll("a[href*='/c/']"));
  return (
    anchors
      .find((anchor) => {
        const href = anchor.getAttribute("href") || "";
        return href.includes(`/c/${key}`);
      })
      ?.closest("[data-cgpt-conversation-row='1'], li, [role='listitem'], div") || null
  );
}

function cgptResolveConversationActionButton(conversation) {
  const row = cgptFindConversationRowElement(conversation) || conversation.domRef || null;
  if (!row || typeof row.querySelector !== "function") return null;
  return (
    row.querySelector("[data-cgpt-conversation-menu='1']") ||
    row.querySelector("button[aria-haspopup='menu']") ||
    row.querySelector("button[aria-label*='More']") ||
    row.querySelector("button")
  );
}

async function cgptOpenConversationMenu(conversation) {
  const button = cgptResolveConversationActionButton(conversation);
  if (!button) {
    throw new Error("failed_menu_open");
  }
  button.click();
  await cgptSidebarWait(40);
  return button;
}

function cgptFindMenuItemByLabels(labels = []) {
  const openContainers = Array.from(
    document.querySelectorAll(
      [
        "[data-cgpt-menu='1']",
        "[data-cgpt-dialog='1']",
        "[role='dialog']",
        "[role='menu']",
        "[role='listbox']",
        "[data-state='open']",
        "[data-radix-popper-content-wrapper]",
      ].join(", ")
    )
  ).filter((container) => !cgptIsSidebarHelperNode(container));
  const scope = openContainers.length ? openContainers : [document.body || document];
  const loweredLabels = labels.map((label) => String(label || "").trim().toLowerCase()).filter(Boolean);
  const directItems = scope.flatMap((container) =>
    Array.from(
      container.querySelectorAll(
        [
          "[data-cgpt-menu-item]",
          "[role='menuitem']",
          "[role='menuitemradio']",
          "[role='menuitemcheckbox']",
          "[role='option']",
          "[data-testid='menu-item']",
          "button",
          "a",
        ].join(", ")
      )
    )
  ).filter((item) => !cgptIsSidebarHelperNode(item));
  const directMatch = directItems.find((item) => {
    const text = String(item.textContent || item.getAttribute("aria-label") || "").trim().toLowerCase();
    return loweredLabels.some((label) => text === label || text.includes(label));
  });
  if (directMatch) {
    return directMatch;
  }
  const fallbackNodes = scope
    .flatMap((container) => Array.from(container.querySelectorAll("*")))
    .filter((node) => !cgptIsSidebarHelperNode(node));
  for (const node of fallbackNodes) {
    const text = String(node.textContent || node.getAttribute && node.getAttribute("aria-label") || "")
      .trim()
      .toLowerCase();
    if (!text || !loweredLabels.some((label) => text === label || text.includes(label))) {
      continue;
    }
    const clickable =
      (typeof node.closest === "function" &&
        node.closest(
          [
            "[data-cgpt-menu-item]",
            "[role='menuitem']",
            "[role='menuitemradio']",
            "[role='menuitemcheckbox']",
            "[role='option']",
            "[data-testid='menu-item']",
            "button",
            "a",
            "[tabindex]",
            "li",
            "div",
          ].join(", ")
        )) ||
      null;
    if (clickable) {
      return clickable;
    }
  }
  return null;
}

async function cgptWaitForMenuItemByLabels(labels = []) {
  const startedAt = Date.now();
  while (Date.now() - startedAt <= 1500) {
    const item = cgptFindMenuItemByLabels(labels);
    if (item) {
      return item;
    }
    await cgptSidebarWait(50);
  }
  return null;
}

function cgptGetProjectTargetCandidateStrings(projectTarget = {}) {
  const values = [
    projectTarget.projectName,
    projectTarget.projectId,
  ];
  return values
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean);
}

function cgptFindProjectTargetOption(projectTarget = {}, root = document) {
  const candidateStrings = cgptGetProjectTargetCandidateStrings(projectTarget);
  if (!candidateStrings.length || !root || typeof root.querySelectorAll !== "function") {
    return null;
  }
  const selector = [
    "[data-cgpt-project-option='1']",
    "[data-cgpt-project='1']",
    "[role='option']",
    "[role='menuitem']",
    "[role='menuitemradio']",
    "[role='menuitemcheckbox']",
    "[role='treeitem']",
    "button",
    "a",
    "li",
  ].join(", ");
  const items = Array.from(root.querySelectorAll(selector));
  return (
    items.find((item) => {
      const text = String(item.textContent || "").trim().toLowerCase();
      const projectName = String(item.dataset && item.dataset.cgptProjectName || "").trim().toLowerCase();
      const projectId = String(item.dataset && item.dataset.cgptProjectId || "").trim().toLowerCase();
      const href = String(item.getAttribute && item.getAttribute("href") || "").trim().toLowerCase();
      return candidateStrings.some((candidate) => {
        if (!candidate) return false;
        return (
          text === candidate ||
          text.includes(candidate) ||
          projectName === candidate ||
          projectId === candidate ||
          href.endsWith(`/${candidate}`) ||
          href.includes(candidate)
        );
      });
    }) || null
  );
}

function cgptFindProjectChooserInput(root = document) {
  if (!root || typeof root.querySelector !== "function") return null;
  return (
    root.querySelector("input[data-cgpt-project-name-input='1']") ||
    root.querySelector("input[placeholder*='project' i]") ||
    root.querySelector("input[aria-label*='project' i]") ||
    root.querySelector("input[type='search']") ||
    root.querySelector("input[type='text']")
  );
}

function cgptSetNativeInputValue(input, value) {
  if (!input || !("value" in input)) return;
  const nextValue = String(value || "");
  input.focus();
  input.value = nextValue;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

async function cgptWaitForProjectTargetOption(projectTarget = {}) {
  const startedAt = Date.now();
  let seededSearch = false;
  while (Date.now() - startedAt <= 2500) {
    const openContainers = Array.from(
      document.querySelectorAll(
        [
          "[data-cgpt-dialog='1']",
          "[role='dialog']",
          "[data-cgpt-menu='1']",
          "[role='menu']",
          "[role='listbox']",
          "[data-state='open']",
          "[data-radix-popper-content-wrapper]",
        ].join(", ")
      )
    ).filter((container) => !cgptIsSidebarHelperNode(container));
    const scopes = openContainers.length ? openContainers : [document];
    for (const scope of scopes) {
      const option = cgptFindProjectTargetOption(projectTarget, scope);
      if (option) {
        return option;
      }
      if (!seededSearch) {
        const input = cgptFindProjectChooserInput(scope);
        if (input) {
          cgptSetNativeInputValue(input, projectTarget.projectName || projectTarget.projectId || "");
          seededSearch = true;
        }
      }
    }
    await cgptSidebarWait(80);
  }
  return null;
}

async function cgptClickMenuItemByText(labels = []) {
  const item = await cgptWaitForMenuItemByLabels(labels);
  if (!item) {
    throw new Error("failed_action_not_found");
  }
  item.click();
  await cgptSidebarWait(40);
  return item;
}

function cgptWaitForDialog() {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const tick = () => {
      const dialog =
        document.querySelector("[data-cgpt-dialog='1']") ||
        document.querySelector("[role='dialog']");
      if (dialog) {
        resolve(dialog);
        return;
      }
      if (Date.now() - startedAt > 1500) {
        reject(new Error("failed_timeout"));
        return;
      }
      setTimeout(tick, 50);
    };
    tick();
  });
}

function cgptFindActiveRenameEditor() {
  const scopes = Array.from(document.querySelectorAll("[data-cgpt-dialog='1'], [role='dialog']")).concat([document]);
  for (const scope of scopes) {
    const input =
      scope.querySelector("input[data-cgpt-rename-input='1']") ||
      scope.querySelector("input[aria-label*='title' i]") ||
      scope.querySelector("input[placeholder*='title' i]") ||
      scope.querySelector("input[type='text']") ||
      scope.querySelector("textarea") ||
      scope.querySelector("[contenteditable='true']");
    if (input && !(input.closest && input.closest("[id^='cgpt-helper-']"))) {
      return input;
    }
  }
  return null;
}

async function cgptWaitForRenameEditor() {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const tick = () => {
      const editor = cgptFindActiveRenameEditor();
      if (editor) {
        resolve(editor);
        return;
      }
      if (Date.now() - startedAt > 2000) {
        reject(new Error("failed_timeout"));
        return;
      }
      setTimeout(tick, 50);
    };
    tick();
  });
}

function cgptSetRenameEditorValue(editor, value) {
  if (!editor) return;
  if ("value" in editor) {
    editor.value = value;
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    editor.dispatchEvent(new Event("change", { bubbles: true }));
    return;
  }
  editor.textContent = value;
  editor.dispatchEvent(new Event("input", { bubbles: true }));
}

async function cgptCommitRenameEditor(editor) {
  const dialog = editor.closest && editor.closest("[data-cgpt-dialog='1'], [role='dialog']");
  if (dialog) {
    const saveButton = Array.from(dialog.querySelectorAll("button, [role='button']")).find((button) => {
      const text = String(button.textContent || "").trim().toLowerCase();
      return CGPT_SIDEBAR_ACTION_LABELS.confirmRename.some((label) =>
        text.includes(String(label).trim().toLowerCase())
      );
    });
    if (saveButton) {
      saveButton.click();
      await cgptSidebarWait(80);
      return;
    }
  }
  if (typeof editor.focus === "function") {
    editor.focus();
  }
  editor.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true }));
  editor.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", code: "Enter", bubbles: true }));
  await cgptSidebarWait(120);
}

async function cgptConfirmDialog(labels = []) {
  const dialog = await cgptWaitForDialog();
  const buttons = Array.from(dialog.querySelectorAll("button, [role='button']"));
  const loweredLabels = labels.map((label) => String(label || "").trim().toLowerCase()).filter(Boolean);
  const button = buttons.find((candidate) => {
    const text = String(candidate.textContent || "").trim().toLowerCase();
    return loweredLabels.some((label) => text === label || text.includes(label));
  });
  if (!button) {
    throw new Error("failed_confirmation");
  }
  button.click();
  await cgptSidebarWait(60);
}

async function cgptHandleProjectTarget(projectTarget = {}) {
  if (!projectTarget || !projectTarget.projectName || projectTarget.mode === "create") {
    throw new Error("failed_action_not_found");
  }
  try {
    await cgptWaitForDialog();
  } catch (_error) {
  }
  const projectOption = await cgptWaitForProjectTargetOption(projectTarget);
  if (!projectOption) {
    throw new Error("failed_project_target_not_found");
  }
  projectOption.click();
  await cgptSidebarWait(60);
}

async function cgptOpenSidebarProjectCreationUi() {
  const explicitButton =
    document.querySelector("[data-cgpt-open-project-create='1']") ||
    document.querySelector("[data-cgpt-project-create='1']");
  if (explicitButton) {
    explicitButton.click();
    await cgptSidebarWait(40);
    return true;
  }

  const sidebarRoot =
    typeof cgptFindSidebarRoot === "function" ? cgptFindSidebarRoot(document) : null;
  if (!sidebarRoot) {
    return false;
  }

  const projectSections = Array.from(
    sidebarRoot.querySelectorAll("[data-cgpt-project-list='1'], [data-cgpt-section-label], section, nav, aside, div")
  ).filter((section) => {
    const label = String(
      (section.dataset && section.dataset.cgptSectionLabel) ||
      ((section.querySelector &&
        section.querySelector("h1, h2, h3, h4, h5, h6, [role='heading'], [data-cgpt-section-heading]")) || {})
        .textContent || ""
    )
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
    return label.includes("project") || label.includes("プロジェクト");
  });
  const buttons = projectSections.flatMap((section) =>
    Array.from(section.querySelectorAll("button, a"))
  );
  const newProjectButton = buttons.find((button) => {
    const text = String(button.textContent || "").trim().toLowerCase();
    if (!text) return false;
    if (button.getAttribute && String(button.getAttribute("href") || "").includes("/c/")) {
      return false;
    }
    return CGPT_SIDEBAR_ACTION_LABELS.newProject.some((label) =>
      text.includes(String(label).trim().toLowerCase())
    );
  });
  if (!newProjectButton) {
    return false;
  }
  newProjectButton.click();
  await cgptSidebarWait(40);
  return true;
}

async function cgptRunSingleSidebarAction(conversation, action, projectTarget) {
  await cgptOpenConversationMenu(conversation);
  if (action === "archive") {
    await cgptClickMenuItemByText(CGPT_SIDEBAR_ACTION_LABELS.archive);
    try {
      await cgptConfirmDialog(CGPT_SIDEBAR_ACTION_LABELS.confirmArchive);
    } catch (_error) {
    }
    await cgptWaitForSidebarRefresh();
    return;
  }
  if (action === "delete") {
    await cgptClickMenuItemByText(CGPT_SIDEBAR_ACTION_LABELS.delete);
    await cgptConfirmDialog(CGPT_SIDEBAR_ACTION_LABELS.confirmDelete);
    await cgptWaitForSidebarRefresh();
    return;
  }
  if (action === "project") {
    await cgptClickMenuItemByText(CGPT_SIDEBAR_ACTION_LABELS.addToProject);
    await cgptHandleProjectTarget(projectTarget);
    await cgptWaitForSidebarRefresh();
    return;
  }
  throw new Error("failed_action_not_found");
}

async function cgptRenameSidebarConversationViaUi(conversation, nextTitle) {
  const normalizedTitle = String(nextTitle || "").trim();
  if (!normalizedTitle) {
    throw new Error("failed_confirmation");
  }
  await cgptOpenConversationMenu(conversation);
  await cgptClickMenuItemByText(CGPT_SIDEBAR_ACTION_LABELS.rename);
  const editor = await cgptWaitForRenameEditor();
  cgptSetRenameEditorValue(editor, normalizedTitle);
  await cgptCommitRenameEditor(editor);
  await cgptWaitForSidebarRefresh();
}

async function cgptRunSidebarBulkAction({ action, conversationIds, projectTarget } = {}) {
  const snapshot =
    typeof cgptGetSidebarConversationSnapshot === "function"
      ? cgptGetSidebarConversationSnapshot()
      : { conversations: [] };
  const conversationMap = new Map(
    (snapshot.conversations || []).map((conversation) => [
      String(conversation.conversationId || conversation.id || ""),
      conversation,
    ])
  );
  const results = [];
  for (const conversationId of Array.isArray(conversationIds) ? conversationIds : []) {
    const key = String(conversationId || "");
    const conversation = conversationMap.get(key);
    if (!conversation) {
      results.push({ ok: false, status: "skipped_missing_dom", conversationId: key });
      continue;
    }
    if (conversation.isProjectItem) {
      results.push({ ok: false, status: "skipped_project", conversationId: key, title: conversation.title });
      continue;
    }
    try {
      await cgptRunSingleSidebarAction(conversation, action, projectTarget);
      results.push({ ok: true, status: "success", conversationId: key, title: conversation.title });
    } catch (error) {
      results.push({
        ok: false,
        status: error && error.message ? error.message : "failed_timeout",
        conversationId: key,
        title: conversation.title,
      });
    }
  }
  return {
    action,
    results,
    counts: results.reduce(
      (acc, result) => {
        acc.total += 1;
        if (result.ok) {
          acc.success += 1;
        } else if (String(result.status || "").startsWith("skipped_")) {
          acc.skipped += 1;
        } else {
          acc.failed += 1;
        }
        return acc;
      },
      { total: 0, success: 0, failed: 0, skipped: 0 }
    ),
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    cgptOpenSidebarProjectCreationUi,
    cgptRenameSidebarConversationViaUi,
    cgptRunSidebarBulkAction,
  };
}

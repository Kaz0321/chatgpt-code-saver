let cgptSidebarConversationSnapshot = {
  sidebarFound: false,
  conversations: [],
  projects: [],
  updatedAt: 0,
};

let cgptSidebarConversationObserver = null;
let cgptSidebarConversationRefreshTimer = null;

const CGPT_SIDEBAR_PROJECT_SECTION_LABELS = [
  "projects",
  "project",
  "プロジェクト",
];

function cgptIsSidebarBulkHelperNode(node) {
  if (!node || node.nodeType !== 1) return false;
  if (node.id && String(node.id).startsWith("cgpt-helper-")) {
    return true;
  }
  if (typeof node.closest === "function" && node.closest("[id^='cgpt-helper-'], .cgpt-helper-fold")) {
    return true;
  }
  return false;
}

function cgptNormalizeSidebarText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function cgptNormalizeSidebarLowerText(value) {
  return cgptNormalizeSidebarText(value).toLowerCase();
}

function cgptGetSidebarSectionLabel(element) {
  if (!element || typeof element.closest !== "function") return "";
  const section = element.closest("[data-cgpt-section-label], section, nav, aside, div, ul");
  if (!section) return "";
  if (section.dataset && section.dataset.cgptSectionLabel) {
    return cgptNormalizeSidebarLowerText(section.dataset.cgptSectionLabel);
  }
  const heading = section.querySelector &&
    section.querySelector("h1, h2, h3, h4, h5, h6, [role='heading'], [data-cgpt-section-heading]");
  if (heading) {
    return cgptNormalizeSidebarLowerText(heading.textContent || "");
  }
  return "";
}

function cgptIsProjectSectionLabel(label) {
  return CGPT_SIDEBAR_PROJECT_SECTION_LABELS.some((candidate) => label.includes(candidate));
}

function cgptExtractConversationIdFromHref(href) {
  const raw = String(href || "");
  if (!raw) return "";
  const match = raw.match(/\/c\/([^/?#]+)/i);
  return match ? match[1] : "";
}

function cgptFindSidebarRoot(root = document) {
  if (!root || typeof root.querySelectorAll !== "function") return null;
  const explicit = root.querySelector("[data-cgpt-sidebar-root='1']");
  if (explicit) return explicit;
  const candidates = Array.from(root.querySelectorAll("aside, nav, [role='navigation']"));
  for (const candidate of candidates) {
    if (candidate.querySelector("a[href*='/c/']")) {
      return candidate;
    }
  }
  return null;
}

function cgptResolveConversationTitle(anchor) {
  if (!anchor) return "";
  const explicit = anchor.dataset && anchor.dataset.cgptConversationTitle;
  if (explicit) return cgptNormalizeSidebarText(explicit);
  const text = cgptNormalizeSidebarText(anchor.textContent || "");
  return text;
}

function cgptResolveProjectName(element) {
  if (!element) return "";
  const explicit = element.dataset && element.dataset.cgptProjectName;
  if (explicit) return cgptNormalizeSidebarText(explicit);
  const section = element.closest && element.closest("[data-cgpt-project-name]");
  if (section && section.dataset && section.dataset.cgptProjectName) {
    return cgptNormalizeSidebarText(section.dataset.cgptProjectName);
  }
  return "";
}

function cgptCollectSidebarConversations(root = document) {
  const sidebarRoot = cgptFindSidebarRoot(root);
  if (!sidebarRoot) return [];
  const anchors = Array.from(sidebarRoot.querySelectorAll("a[href*='/c/']"));
  const seen = new Set();
  return anchors.map((anchor, index) => {
    const href = anchor.getAttribute("href") || "";
    const conversationId = cgptExtractConversationIdFromHref(href);
    const fallbackId = `sidebar-conversation-${index + 1}`;
    const id = conversationId || anchor.dataset.cgptConversationId || fallbackId;
    if (seen.has(id)) {
      return null;
    }
    seen.add(id);
    const row =
      anchor.closest("[data-cgpt-conversation-row='1'], li, [role='listitem'], div") || anchor;
    const sectionLabel = cgptGetSidebarSectionLabel(row);
    const isProjectItem =
      anchor.dataset.cgptProjectItem === "1" ||
      (row.dataset && row.dataset.cgptProjectItem === "1") ||
      cgptIsProjectSectionLabel(sectionLabel);
    return {
      id,
      title: cgptResolveConversationTitle(anchor),
      href,
      conversationId,
      isActive:
        anchor.getAttribute("aria-current") === "page" ||
        anchor.dataset.cgptConversationActive === "1" ||
        (row.dataset && row.dataset.cgptConversationActive === "1"),
      isProjectItem,
      projectName: isProjectItem ? cgptResolveProjectName(row) : "",
      domRef: row,
      menuAnchorInfo: {
        conversationId: conversationId || id,
      },
    };
  }).filter(Boolean);
}

function cgptCollectSidebarProjects(root = document) {
  const sidebarRoot = cgptFindSidebarRoot(root);
  if (!sidebarRoot) return [];
  const explicitProjects = Array.from(
    sidebarRoot.querySelectorAll("[data-cgpt-project='1'], [data-cgpt-project-option='1']")
  );
  let projectCandidates = explicitProjects;
  if (!projectCandidates.length) {
    const projectSections = Array.from(
      sidebarRoot.querySelectorAll("[data-cgpt-project-list='1'], [data-cgpt-section-label], section, nav, aside, div")
    ).filter((section) => {
      const label = cgptNormalizeSidebarLowerText(
        (section.dataset && section.dataset.cgptSectionLabel) ||
        ((section.querySelector &&
          section.querySelector("h1, h2, h3, h4, h5, h6, [role='heading'], [data-cgpt-section-heading]")) || {})
          .textContent || ""
      );
      return cgptIsProjectSectionLabel(label);
    });
    projectCandidates = projectSections.flatMap((section) =>
      Array.from(section.querySelectorAll("button, a")).filter((element) => {
        const href = element.getAttribute ? element.getAttribute("href") || "" : "";
        if (href.includes("/c/")) return false;
        if (element.closest("[data-cgpt-conversation-row='1'], li[role='listitem']")) return false;
        const rowLabel = cgptNormalizeSidebarLowerText(
          (element.dataset && element.dataset.cgptProjectName) || element.textContent || ""
        );
        return Boolean(
          rowLabel &&
          rowLabel !== "projects" &&
          rowLabel !== "project" &&
          rowLabel !== "プロジェクト"
        );
      })
    );
  }
  const seen = new Set();
  return projectCandidates.map((element, index) => {
    const name =
      cgptNormalizeSidebarText(
        (element.dataset && element.dataset.cgptProjectName) ||
          (element.textContent || "").replace(/^project:\s*/i, "")
      ) || `Project ${index + 1}`;
    const id = String((element.dataset && element.dataset.cgptProjectId) || name);
    if (!id || seen.has(id)) return null;
    seen.add(id);
    return {
      id,
      name,
      isCurrent:
        element.dataset.cgptProjectCurrent === "1" || element.getAttribute("aria-current") === "page",
      domRef: element,
      supportsCreateNew: true,
    };
  }).filter(Boolean);
}

function cgptRefreshSidebarConversationSnapshot(root = document) {
  cgptSidebarConversationSnapshot = {
    sidebarFound: Boolean(cgptFindSidebarRoot(root)),
    conversations: cgptCollectSidebarConversations(root),
    projects: cgptCollectSidebarProjects(root),
    updatedAt: Date.now(),
  };
  return cgptGetSidebarConversationSnapshot();
}

function cgptGetSidebarConversationSnapshot() {
  return {
    sidebarFound: cgptSidebarConversationSnapshot.sidebarFound,
    conversations: cgptSidebarConversationSnapshot.conversations.slice(),
    projects: cgptSidebarConversationSnapshot.projects.slice(),
    updatedAt: cgptSidebarConversationSnapshot.updatedAt,
  };
}

function cgptScheduleSidebarSnapshotRefresh(root = document) {
  if (cgptSidebarConversationRefreshTimer) {
    clearTimeout(cgptSidebarConversationRefreshTimer);
  }
  cgptSidebarConversationRefreshTimer = setTimeout(() => {
    cgptSidebarConversationRefreshTimer = null;
    cgptRefreshSidebarConversationSnapshot(root);
    if (typeof cgptRenderSidebarBulkPanel === "function") {
      cgptRenderSidebarBulkPanel();
    }
  }, 80);
}

function cgptStartSidebarConversationTracker(root = document) {
  cgptRefreshSidebarConversationSnapshot(root);
  if (cgptSidebarConversationObserver || typeof MutationObserver !== "function" || !document.body) {
    return;
  }
  cgptSidebarConversationObserver = new MutationObserver((mutations) => {
    const shouldRefresh = mutations.some((mutation) => {
      if (cgptIsSidebarBulkHelperNode(mutation.target)) {
        return false;
      }
      if (mutation.type === "attributes") {
        return true;
      }
      const addedNodes = Array.from(mutation.addedNodes || []).filter((node) => !cgptIsSidebarBulkHelperNode(node));
      const removedNodes = Array.from(mutation.removedNodes || []).filter((node) => !cgptIsSidebarBulkHelperNode(node));
      return addedNodes.length > 0 || removedNodes.length > 0;
    });
    if (!shouldRefresh) return;
    cgptScheduleSidebarSnapshotRefresh(root);
  });
  cgptSidebarConversationObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["aria-current", "data-cgpt-project-item", "data-cgpt-project-name"],
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    cgptCollectSidebarConversations,
    cgptCollectSidebarProjects,
    cgptExtractConversationIdFromHref,
    cgptFilterProjectSectionLabel: cgptIsProjectSectionLabel,
  };
}

let cgptSidebarConversationSnapshot = {
  sidebarFound: false,
  conversations: [],
  projects: [],
  updatedAt: 0,
  source: "internal_api",
  diagnostics: null,
};

let cgptSidebarConversationObserver = null;
let cgptSidebarConversationRefreshTimer = null;
let cgptSidebarConversationRefreshPromise = null;

const CGPT_SIDEBAR_PROJECT_SECTION_LABELS = [
  "projects",
  "project",
  "プロジェクト",
];

const CGPT_SIDEBAR_PROJECT_CREATE_LABELS = [
  "new project",
  "create project",
  "create new project",
  "プロジェクトを新規作成",
  "新しいプロジェクト",
  "新規プロジェクト",
];

const CGPT_SIDEBAR_PROJECT_MORE_LABELS = [
  "show more",
  "more",
  "see more",
  "さらに表示",
  "もっと見る",
];

const CGPT_SIDEBAR_PROJECT_SWEEP_STEPS = 16;
const CGPT_SIDEBAR_PROJECT_SWEEP_DELAY_MS = 80;

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

function cgptIsSidebarProjectCreateLabel(label) {
  return CGPT_SIDEBAR_PROJECT_CREATE_LABELS.some((candidate) =>
    cgptNormalizeSidebarLowerText(label).includes(cgptNormalizeSidebarLowerText(candidate))
  );
}

function cgptIsSidebarProjectMoreLabel(label) {
  return CGPT_SIDEBAR_PROJECT_MORE_LABELS.some((candidate) =>
    cgptNormalizeSidebarLowerText(label).includes(cgptNormalizeSidebarLowerText(candidate))
  );
}

function cgptExtractConversationIdFromHref(href) {
  const raw = String(href || "");
  if (!raw) return "";
  const match = raw.match(/\/c\/([^/?#]+)/i);
  return match ? match[1] : "";
}

function cgptExtractProjectIdFromHref(href) {
  const raw = String(href || "");
  if (!raw) return "";
  const match = raw.match(/\/g\/([^/?#]+)\/project/i);
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

function cgptDelay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, Number(ms) || 0));
  });
}

function cgptDispatchSidebarProjectTriggerEvent(element, eventName, EventClass, extra = {}) {
  if (!element || typeof element.dispatchEvent !== "function" || typeof EventClass !== "function") {
    return;
  }
  try {
    element.dispatchEvent(new EventClass(eventName, {
      bubbles: true,
      cancelable: true,
      view: window,
      ...extra,
    }));
  } catch (_error) {
  }
}

function cgptOpenSidebarProjectMoreTrigger(trigger) {
  if (!trigger) return;
  const PointerEvt = typeof PointerEvent === "function" ? PointerEvent : MouseEvent;
  cgptDispatchSidebarProjectTriggerEvent(trigger, "pointerenter", PointerEvt, { pointerType: "mouse" });
  cgptDispatchSidebarProjectTriggerEvent(trigger, "mouseenter", MouseEvent);
  cgptDispatchSidebarProjectTriggerEvent(trigger, "mouseover", MouseEvent);
  cgptDispatchSidebarProjectTriggerEvent(trigger, "mousemove", MouseEvent);
  cgptDispatchSidebarProjectTriggerEvent(trigger, "pointerdown", PointerEvt, { pointerType: "mouse", buttons: 1 });
  cgptDispatchSidebarProjectTriggerEvent(trigger, "mousedown", MouseEvent, { buttons: 1 });
  cgptDispatchSidebarProjectTriggerEvent(trigger, "pointerup", PointerEvt, { pointerType: "mouse" });
  cgptDispatchSidebarProjectTriggerEvent(trigger, "mouseup", MouseEvent);
  if (typeof trigger.click === "function") {
    try {
      trigger.click();
    } catch (_error) {
    }
  }
}

function cgptCloseSidebarProjectMoreTrigger(trigger) {
  if (!trigger) return;
  const PointerEvt = typeof PointerEvent === "function" ? PointerEvent : MouseEvent;
  cgptDispatchSidebarProjectTriggerEvent(trigger, "pointerleave", PointerEvt, { pointerType: "mouse" });
  cgptDispatchSidebarProjectTriggerEvent(trigger, "mouseleave", MouseEvent);
  try {
    if (typeof document !== "undefined" && document.body && typeof document.body.click === "function") {
      document.body.click();
    }
  } catch (_error) {
  }
}

function cgptExtractSidebarProjectDisplayHint(value) {
  const raw = cgptNormalizeSidebarText(value);
  if (!raw) return "";
  const slugMatch = raw.match(/^g-p-[0-9a-f-]+-(.+)$/i);
  const candidate = slugMatch ? slugMatch[1] : raw;
  return cgptNormalizeSidebarText(candidate.replace(/-/g, " "));
}

function cgptNormalizeSidebarProjectMatchKey(value) {
  return cgptExtractSidebarProjectDisplayHint(value)
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
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
          rowLabel !== "プロジェクト" &&
          !cgptIsSidebarProjectCreateLabel(rowLabel)
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
    if (cgptIsSidebarProjectCreateLabel(name)) return null;
    const href = element.getAttribute ? element.getAttribute("href") || "" : "";
    const id = String(
      (element.dataset && element.dataset.cgptProjectId) ||
      cgptExtractProjectIdFromHref(href) ||
      name
    );
    if (!id || seen.has(id)) return null;
    seen.add(id);
    return {
      id,
      name,
      isCurrent:
        element.dataset.cgptProjectCurrent === "1" || element.getAttribute("aria-current") === "page",
      domRef: element,
      supportsCreateNew: true,
      raw: {
        displayNameSource: "dom_visible",
      },
    };
  }).filter(Boolean);
}

function cgptGetSidebarProjectSections(sidebarRoot) {
  if (!sidebarRoot || typeof sidebarRoot.querySelectorAll !== "function") {
    return [];
  }
  return Array.from(
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
}

function cgptResolveSidebarProjectMoreTriggerLabel(element) {
  if (!element) return "";
  return cgptNormalizeSidebarText(
    (element.getAttribute && (
      element.getAttribute("aria-label") ||
      element.getAttribute("title")
    )) ||
    (element.textContent || "")
  );
}

function cgptFindSidebarProjectMoreTriggers(sidebarRoot) {
  if (!sidebarRoot || typeof sidebarRoot.querySelectorAll !== "function") {
    return [];
  }
  const candidates = Array.from(
    sidebarRoot.querySelectorAll("button, a, [role='button'], div, span")
  );
  const seen = new Set();
  return candidates.map((element) => {
    const label = cgptResolveSidebarProjectMoreTriggerLabel(element);
    if (!cgptIsSidebarProjectMoreLabel(label)) {
      return null;
    }
    const clickable =
      (typeof element.closest === "function" &&
        element.closest("button, a, [role='button'], [tabindex], li, div")) ||
      element;
    if (!clickable) return null;
    const key = `${clickable.tagName || "node"}:${label}`;
    if (seen.has(key)) return null;
    seen.add(key);
    return clickable;
  }).filter(Boolean);
}

function cgptCollectSidebarProjectsFromOpenProjectMenus(root = document) {
  if (!root || typeof root.querySelectorAll !== "function") {
    return [];
  }
  const candidates = Array.from(
    root.querySelectorAll(
      "a[href*='/g/'][href*='/project'], [role='menu'] a, [role='dialog'] a, [data-radix-popper-content-wrapper] a"
    )
  );
  const seen = new Set();
  return candidates.map((element, index) => {
    const href = element.getAttribute ? element.getAttribute("href") || "" : "";
    const id = cgptExtractProjectIdFromHref(href) || `sidebar-menu-project-${index + 1}`;
    const name = cgptNormalizeSidebarText(
      (element.dataset && element.dataset.cgptProjectName) || element.textContent || ""
    );
    if (!id || !name || cgptIsSidebarProjectCreateLabel(name) || cgptIsSidebarProjectMoreLabel(name) || seen.has(id)) {
      return null;
    }
    seen.add(id);
    return {
      id,
      name,
      isCurrent: element.getAttribute && element.getAttribute("aria-current") === "page",
      domRef: element,
      supportsCreateNew: true,
      raw: {
        displayNameSource: "dom_more_menu",
      },
    };
  }).filter(Boolean);
}

async function cgptCollectSidebarProjectsFromMoreMenus(root = document) {
  const sidebarRoot = cgptFindSidebarRoot(root);
  if (!sidebarRoot) {
    return [];
  }
  const triggerCandidates = cgptFindSidebarProjectMoreTriggers(sidebarRoot);
  const collected = [];
  for (const trigger of triggerCandidates) {
    try {
      cgptOpenSidebarProjectMoreTrigger(trigger);
      await cgptDelay(CGPT_SIDEBAR_PROJECT_SWEEP_DELAY_MS);
      const menuProjects = cgptCollectSidebarProjectsFromOpenProjectMenus(document);
      collected.push(...menuProjects);
    } catch (_error) {
    } finally {
      cgptCloseSidebarProjectMoreTrigger(trigger);
      await cgptDelay(20);
    }
  }
  return cgptMergeSidebarProjectCollections([], collected);
}

function cgptMergeSidebarProjectCollections(existingProjects = [], nextProjects = []) {
  const seen = new Set();
  return []
    .concat(Array.isArray(existingProjects) ? existingProjects : [])
    .concat(Array.isArray(nextProjects) ? nextProjects : [])
    .filter((project) => {
      const key = String((project && (project.id || project.name)) || "");
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function cgptFindSidebarProjectScrollContainer(root = document) {
  const sidebarRoot = cgptFindSidebarRoot(root);
  if (!sidebarRoot) return null;
  let best = null;
  let bestDepth = -1;
  const candidates = [sidebarRoot].concat(Array.from(sidebarRoot.querySelectorAll("div, nav, aside, section, ul")));
  candidates.forEach((element) => {
    if (!element || typeof element.scrollTop !== "number") return;
    const scrollHeight = Number(element.scrollHeight || 0);
    const clientHeight = Number(element.clientHeight || 0);
    if (!(scrollHeight > clientHeight + 8 && clientHeight > 0)) return;
    let depth = 0;
    let cursor = element;
    while (cursor && cursor !== sidebarRoot) {
      depth += 1;
      cursor = cursor.parentElement || null;
    }
    if (depth > bestDepth) {
      best = element;
      bestDepth = depth;
    }
  });
  return best;
}

async function cgptCollectSidebarProjectsDeep(root = document) {
  let collectedProjects = cgptCollectSidebarProjects(root);
  const scrollContainer = cgptFindSidebarProjectScrollContainer(root);
  if (scrollContainer) {
    const initialScrollTop = Number(scrollContainer.scrollTop || 0);
    let previousSignature = "";
    try {
      for (let step = 0; step < CGPT_SIDEBAR_PROJECT_SWEEP_STEPS; step += 1) {
        const currentProjects = cgptCollectSidebarProjects(root);
        collectedProjects = cgptMergeSidebarProjectCollections(collectedProjects, currentProjects);
        const currentSignature = collectedProjects.map((project) => `${project.id}:${project.name}`).join("|");
        const maxScrollTop = Math.max(0, Number(scrollContainer.scrollHeight || 0) - Number(scrollContainer.clientHeight || 0));
        const nextScrollTop = Math.min(
          maxScrollTop,
          Number(scrollContainer.scrollTop || 0) + Math.max(120, Math.floor(Number(scrollContainer.clientHeight || 0) * 0.85))
        );
        if (nextScrollTop <= Number(scrollContainer.scrollTop || 0) && currentSignature === previousSignature) {
          break;
        }
        previousSignature = currentSignature;
        if (nextScrollTop <= Number(scrollContainer.scrollTop || 0)) {
          break;
        }
        scrollContainer.scrollTop = nextScrollTop;
        if (typeof scrollContainer.dispatchEvent === "function" && typeof Event === "function") {
          try {
            scrollContainer.dispatchEvent(new Event("scroll", { bubbles: true }));
          } catch (_error) {
          }
        }
        await cgptDelay(CGPT_SIDEBAR_PROJECT_SWEEP_DELAY_MS);
      }
      collectedProjects = cgptMergeSidebarProjectCollections(collectedProjects, cgptCollectSidebarProjects(root));
    } finally {
      scrollContainer.scrollTop = initialScrollTop;
    }
  }
  const menuProjects = await cgptCollectSidebarProjectsFromMoreMenus(root);
  collectedProjects = cgptMergeSidebarProjectCollections(collectedProjects, menuProjects);
  return collectedProjects;
}

function cgptMergeSidebarApiSnapshotWithDom(snapshot, root = document) {
  if (!snapshot || typeof snapshot !== "object") {
    return snapshot;
  }
  const domConversations = cgptCollectSidebarConversations(root);
  const domProjects = cgptCollectSidebarProjects(root);
  if (!domConversations.length || !Array.isArray(snapshot.conversations)) {
    return cgptMergeSidebarApiProjectsWithDom(snapshot, domProjects);
  }
  const domConversationIndex = new Map();
  domConversations.forEach((conversation) => {
    const key = String(conversation.conversationId || conversation.id || "");
    if (!key) return;
    domConversationIndex.set(key, conversation);
  });
  return cgptMergeSidebarApiProjectsWithDom({
    ...snapshot,
    conversations: snapshot.conversations.map((conversation) => {
      const key = String(
        (conversation && (conversation.conversationId || conversation.id)) || ""
      );
      const domConversation = key ? domConversationIndex.get(key) : null;
      if (!domConversation) {
        return conversation;
      }
      return {
        ...conversation,
        title: domConversation.title || conversation.title,
        isActive: domConversation.isActive === true || conversation.isActive === true,
        isProjectItem: domConversation.isProjectItem === true || conversation.isProjectItem === true,
        projectName: domConversation.projectName || conversation.projectName || "",
      };
    }),
  }, domProjects);
}

function cgptMergeSidebarApiProjectsWithDom(snapshot, domProjects = []) {
  if (!snapshot || typeof snapshot !== "object" || !Array.isArray(snapshot.projects) || !Array.isArray(domProjects) || !domProjects.length) {
    return snapshot;
  }
  const domById = new Map();
  const domByKey = new Map();
  domProjects.forEach((project) => {
    const id = String((project && project.id) || "");
    if (id && !domById.has(id)) {
      domById.set(id, project);
    }
    const key = cgptNormalizeSidebarProjectMatchKey(project && project.name);
    if (key && !domByKey.has(key)) {
      domByKey.set(key, project);
    }
  });
  const matchedDomIds = new Set();
  let nextDomIndex = 0;
  function takeNextUnmatchedDomProject() {
    while (nextDomIndex < domProjects.length) {
      const candidate = domProjects[nextDomIndex];
      nextDomIndex += 1;
      if (!candidate || matchedDomIds.has(candidate.id)) {
        continue;
      }
      return candidate;
    }
    return null;
  }
  const mergedProjects = snapshot.projects.map((project, index) => {
    const projectId = String((project && project.id) || "");
    const matchedById = projectId ? domById.get(projectId) || null : null;
    const projectKey = cgptNormalizeSidebarProjectMatchKey(project && project.name);
    const matchedByKey = !matchedById && projectKey ? domByKey.get(projectKey) || null : null;
    const matchedByIndex =
      !matchedById &&
      !matchedByKey &&
      snapshot.projects.length === domProjects.length &&
      domProjects[index] &&
      !matchedDomIds.has(domProjects[index].id)
        ? domProjects[index]
        : null;
    const matchedSequentially =
      !matchedById &&
      !matchedByKey &&
      !matchedByIndex &&
      cgptIsSidebarApiProjectSlugName(project && project.name)
        ? takeNextUnmatchedDomProject()
        : null;
    const domProject = matchedById || matchedByKey || matchedByIndex || matchedSequentially;
    if (!domProject) {
      return project;
    }
    matchedDomIds.add(domProject.id);
    while (nextDomIndex < domProjects.length && matchedDomIds.has(domProjects[nextDomIndex].id)) {
      nextDomIndex += 1;
    }
    return {
      ...project,
      name: domProject.name || project.name,
      isCurrent: domProject.isCurrent === true || project.isCurrent === true,
      raw: {
        ...(project.raw || {}),
        matchedDomProjectId: domProject.id || "",
        matchedDomProjectName: domProject.name || "",
        displayNameSource:
          (domProject.raw && domProject.raw.displayNameSource) || "dom_sidebar",
      },
    };
  });
  return {
    ...snapshot,
    projects: mergedProjects,
  };
}

function cgptRefreshSidebarConversationSnapshot(root = document) {
  if (!cgptSidebarConversationRefreshPromise && typeof cgptFetchSidebarApiSnapshot === "function") {
    cgptSidebarConversationRefreshPromise = cgptFetchSidebarApiSnapshot()
      .then(async (result) => {
        if (result && result.ok && result.snapshot) {
          const deepDomProjects = await cgptCollectSidebarProjectsDeep(root);
          const mergedSnapshot = cgptMergeSidebarApiProjectsWithDom(
            cgptMergeSidebarApiSnapshotWithDom(result.snapshot, root),
            deepDomProjects
          );
          const hasProjects = Array.isArray(mergedSnapshot.projects) && mergedSnapshot.projects.length > 0;
          if (!hasProjects) {
            const syntheticDiagnostics = {
              phase: "snapshot",
              authMode: "unknown",
              status: 0,
              endpoint: "",
              message: "api_projects_missing_from_snapshot",
              endpointTried: [],
            };
            if (typeof cgptSetSidebarApiDiagnostics === "function") {
              cgptSetSidebarApiDiagnostics(syntheticDiagnostics);
            }
            cgptSidebarConversationSnapshot = {
              sidebarFound: false,
              conversations: [],
              projects: [],
              updatedAt: Date.now(),
              source: "internal_api",
              diagnostics:
                typeof cgptGetSidebarApiDiagnostics === "function"
                  ? cgptGetSidebarApiDiagnostics()
                  : syntheticDiagnostics,
            };
            return;
          }
          if (typeof cgptClearSidebarApiDiagnostics === "function") {
            cgptClearSidebarApiDiagnostics();
          }
          cgptSidebarConversationSnapshot = {
            ...mergedSnapshot,
            source: "internal_api",
            diagnostics: null,
          };
        } else {
          if (typeof cgptSetSidebarApiDiagnostics === "function") {
            cgptSetSidebarApiDiagnostics(result ? result.diagnostics : null);
          }
          cgptSidebarConversationSnapshot = {
            sidebarFound: false,
            conversations: [],
            projects: [],
            updatedAt: Date.now(),
            source: "internal_api",
            diagnostics:
              typeof cgptGetSidebarApiDiagnostics === "function"
                ? cgptGetSidebarApiDiagnostics()
                : (result ? result.diagnostics : null),
          };
        }
      })
      .catch((_error) => {
        if (typeof cgptSetSidebarApiDiagnostics === "function") {
          cgptSetSidebarApiDiagnostics({
            phase: "unknown",
            authMode: "cookie",
            status: 0,
            endpoint: "",
            message: "api_unknown_error",
            endpointTried: [],
          });
        }
        cgptSidebarConversationSnapshot = {
          sidebarFound: false,
          conversations: [],
          projects: [],
          updatedAt: Date.now(),
          source: "internal_api",
          diagnostics:
            typeof cgptGetSidebarApiDiagnostics === "function"
              ? cgptGetSidebarApiDiagnostics()
              : null,
        };
      })
      .finally(() => {
        cgptSidebarConversationRefreshPromise = null;
        if (typeof cgptRenderSidebarBulkPanel === "function") {
          cgptRenderSidebarBulkPanel();
        }
      });
  }
  return cgptGetSidebarConversationSnapshot();
}

function cgptGetSidebarConversationSnapshot() {
  return {
    sidebarFound: cgptSidebarConversationSnapshot.sidebarFound,
    conversations: cgptSidebarConversationSnapshot.conversations.slice(),
    projects: cgptSidebarConversationSnapshot.projects.slice(),
    updatedAt: cgptSidebarConversationSnapshot.updatedAt,
    source: cgptSidebarConversationSnapshot.source,
    diagnostics: cgptSidebarConversationSnapshot.diagnostics
      ? JSON.parse(JSON.stringify(cgptSidebarConversationSnapshot.diagnostics))
      : null,
  };
}

function cgptIsSidebarConversationRefreshPending() {
  return Boolean(cgptSidebarConversationRefreshPromise);
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
    cgptCollectSidebarProjectsDeep,
    cgptCollectSidebarProjectsFromOpenProjectMenus,
    cgptExtractConversationIdFromHref,
    cgptExtractProjectIdFromHref,
    cgptGetSidebarConversationSnapshot,
    cgptIsSidebarConversationRefreshPending,
    cgptMergeSidebarApiProjectsWithDom,
    cgptMergeSidebarApiSnapshotWithDom,
    cgptFilterProjectSectionLabel: cgptIsProjectSectionLabel,
  };
}

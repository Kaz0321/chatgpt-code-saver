const CGPT_SIDEBAR_API_ENDPOINTS = {
  session: [
    "/api/auth/session",
    "/backend-api/accounts/check",
    "/backend-api/me",
  ],
  projects: [
    "/backend-api/gizmos/snorlax/sidebar?conversations_per_gizmo=5",
    "/backend-api/projects?limit=100&offset=0",
    "/backend-api/projects",
    "/backend-api/projects?offset=0&limit=100&order=updated",
  ],
  conversations: [
    "/backend-api/conversations?offset=0&limit=100&order=updated",
    "/backend-api/conversations?limit=100&offset=0",
  ],
};

function cgptResolveSidebarApiAbsoluteUrl(pathname) {
  try {
    return new URL(pathname, window.location.origin).toString();
  } catch (_error) {
    return String(pathname || "");
  }
}

function cgptNormalizeSidebarApiText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function cgptIsSidebarApiProjectSlugName(value) {
  return /^g-p-[0-9a-f-]+-/i.test(cgptNormalizeSidebarApiText(value));
}

function cgptUnwrapSidebarApiProjectCandidate(project = {}) {
  if (!project || typeof project !== "object") {
    return null;
  }
  if (project.gizmo && typeof project.gizmo === "object") {
    return {
      ...project,
      ...project.gizmo,
    };
  }
  if (project.project && typeof project.project === "object") {
    return {
      ...project,
      ...project.project,
    };
  }
  if (project.workspace && typeof project.workspace === "object") {
    return {
      ...project,
      ...project.workspace,
    };
  }
  return project;
}

async function cgptSidebarApiFetchJson(url, requestContext = {}) {
  const headers = {
    Accept: "application/json",
    ...(requestContext.headers || {}),
  };
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers,
  });
  let json = null;
  try {
    json = await response.json();
  } catch (_error) {
  }
  return {
    url,
    ok: response.ok,
    status: response.status,
    json,
  };
}

function cgptGetCurrentConversationIdFromLocation() {
  const href = String((window.location && window.location.href) || "");
  const match = href.match(/\/c\/([^/?#]+)/i);
  return match ? match[1] : "";
}

function cgptSidebarApiExtractCollection(payload, keys = []) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  for (const key of keys) {
    if (Array.isArray(payload[key])) {
      return payload[key];
    }
  }
  return [];
}

function cgptSidebarApiCollectNestedArrays(payload, matcher, path = "", depth = 0, results = []) {
  if (!payload || typeof payload !== "object" || depth > 5) {
    return results;
  }
  if (Array.isArray(payload)) {
    if (matcher(path, payload)) {
      results.push(payload);
    }
    payload.forEach((item, index) => {
      cgptSidebarApiCollectNestedArrays(item, matcher, `${path}[${index}]`, depth + 1, results);
    });
    return results;
  }
  Object.entries(payload).forEach(([key, value]) => {
    const nextPath = path ? `${path}.${key}` : key;
    cgptSidebarApiCollectNestedArrays(value, matcher, nextPath, depth + 1, results);
  });
  return results;
}

function cgptSidebarApiGetPaginationState(payload = {}, collection = []) {
  const nextCursor = payload.next_cursor || payload.nextCursor || payload.cursor || payload.after || "";
  const hasMore =
    payload.has_more === true ||
    payload.hasMore === true ||
    Boolean(nextCursor) ||
    (Number.isFinite(Number(payload.total)) && collection.length > 0 && collection.length < Number(payload.total));
  return {
    nextCursor: String(nextCursor || ""),
    hasMore,
  };
}

function cgptBuildSidebarApiRequestContext(sessionPayload = null) {
  const accessToken =
    sessionPayload && typeof sessionPayload === "object"
      ? sessionPayload.accessToken || sessionPayload.access_token || ""
      : "";
  const headers = {};
  let authMode = "cookie";
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
    authMode = "bearer";
  }
  return {
    authMode,
    headers,
  };
}

async function cgptFetchSessionContext() {
  const endpointTried = [];
  for (const candidate of CGPT_SIDEBAR_API_ENDPOINTS.session) {
    const url = cgptResolveSidebarApiAbsoluteUrl(candidate);
    try {
      const result = await cgptSidebarApiFetchJson(url, {});
      endpointTried.push({
        url,
        status: result.status,
        ok: result.ok,
        shapeMatched: Boolean(result.json && typeof result.json === "object"),
      });
      if (result.ok && result.json && typeof result.json === "object") {
        return {
          ok: true,
          endpoint: url,
          payload: result.json,
          endpointTried,
        };
      }
    } catch (_error) {
      endpointTried.push({
        url,
        status: 0,
        ok: false,
        shapeMatched: false,
      });
    }
  }
  return {
    ok: false,
    endpoint: "",
    payload: null,
    endpointTried,
  };
}

function cgptIsProjectPayloadShape(payload) {
  return cgptExtractProjectCandidatesFromPayload(payload).length > 0;
}

function cgptIsConversationPayloadShape(payload) {
  return cgptSidebarApiExtractCollection(payload, ["items", "conversations", "data"]).length > 0;
}

function cgptNormalizeSidebarApiProject(project = {}) {
  const candidate = cgptUnwrapSidebarApiProjectCandidate(project);
  if (!candidate) return null;
  const id = String(
    candidate.id ||
      candidate.project_id ||
      candidate.projectId ||
      candidate.uuid ||
      candidate.gizmo_id ||
      candidate.gizmoId ||
      candidate.workspace_id ||
      candidate.workspaceId ||
      candidate.slug ||
      candidate.share_id ||
      candidate.shareId ||
      candidate.team_id ||
      candidate.teamId ||
      ""
  ).trim();
  const name = cgptNormalizeSidebarApiText(
    candidate.name ||
      candidate.title ||
      candidate.display_name ||
      candidate.displayName ||
      candidate.label ||
      candidate.workspace_name ||
      candidate.workspaceName ||
      candidate.gizmo_name ||
      candidate.gizmoName ||
      candidate.short_url ||
      candidate.shortUrl ||
      ""
  );
  if (!id || !name) return null;
  return {
    id,
    name,
    isCurrent: false,
    visibility: "api",
    source: "internal_api",
    raw: {
      id,
      name,
      originalName: name,
      displayNameSource: "api_list",
    },
  };
}

function cgptBuildSidebarApiProjectDetailCandidates(projectId) {
  const normalizedId = String(projectId || "").trim();
  if (!normalizedId) return [];
  const encodedId = encodeURIComponent(normalizedId);
  return [
    `/backend-api/gizmos/${encodedId}`,
    `/backend-api/projects/${encodedId}`,
  ];
}

async function cgptEnrichSidebarApiProjects(projects = [], requestContext = {}) {
  const enrichedProjects = [];
  for (const project of Array.isArray(projects) ? projects : []) {
    if (!project || !cgptIsSidebarApiProjectSlugName(project.name)) {
      enrichedProjects.push(project);
      continue;
    }
    let enrichedProject = project;
    const detailCandidates = cgptBuildSidebarApiProjectDetailCandidates(project.id);
    for (const candidate of detailCandidates) {
      const url = cgptResolveSidebarApiAbsoluteUrl(candidate);
      try {
        const result = await cgptSidebarApiFetchJson(url, requestContext);
        if (!result.ok || !result.json || typeof result.json !== "object") {
          continue;
        }
        const normalized = cgptNormalizeSidebarApiProject(result.json);
        if (normalized && normalized.name && !cgptIsSidebarApiProjectSlugName(normalized.name)) {
          enrichedProject = {
            ...project,
            name: normalized.name,
            raw: {
              ...(project.raw || {}),
              detailName: normalized.name,
              detailProjectId: normalized.id,
              detailDisplayNameSource: "api_detail",
            },
          };
          break;
        }
      } catch (_error) {
      }
    }
    enrichedProjects.push(enrichedProject);
  }
  return enrichedProjects;
}

function cgptExtractProjectCandidatesFromPayload(payload = {}) {
  const directCollections = [
    cgptSidebarApiExtractCollection(payload, ["gizmos", "items", "projects", "data", "workspaces"]),
  ];
  const hintedCollections = cgptSidebarApiCollectNestedArrays(
    payload,
    (path, value) =>
      Array.isArray(value) &&
      /(^|\.)(gizmos|projects|project|workspaces|workspace|spaces)(\.|$)/i.test(path),
    "",
    0,
    []
  );
  const seenObjects = new Set();
  return directCollections
    .concat(hintedCollections)
    .flat()
    .filter((item) => item && typeof item === "object")
    .map((item) => cgptUnwrapSidebarApiProjectCandidate(item) || item)
    .filter((item) => {
      if (seenObjects.has(item)) return false;
      seenObjects.add(item);
      return true;
    });
}

function cgptNormalizeSidebarApiConversation(conversation = {}, projectIndex = new Map()) {
  const conversationId = String(
    conversation.id || conversation.conversation_id || conversation.uuid || conversation.cid || ""
  ).trim();
  const title = cgptNormalizeSidebarApiText(
    conversation.title || conversation.name || conversation.display_name || ""
  );
  if (!conversationId || !title) return null;
  const projectId = String(
    conversation.project_id ||
      (conversation.project && conversation.project.id) ||
      (conversation.workspace && conversation.workspace.id) ||
      ""
  ).trim();
  const knownProject = projectId ? projectIndex.get(projectId) || null : null;
  const projectName = cgptNormalizeSidebarApiText(
    (conversation.project && conversation.project.name) ||
      (conversation.workspace && conversation.workspace.name) ||
      (knownProject && knownProject.name) ||
      ""
  );
  const membershipState = projectId || projectName ? "project" : "non_project";
  return {
    id: conversationId,
    title,
    href: `/c/${conversationId}`,
    conversationId,
    isActive: conversationId === cgptGetCurrentConversationIdFromLocation(),
    isProjectItem: membershipState === "project",
    projectName,
    projectId,
    membershipState,
    source: "internal_api",
    raw: {
      id: conversationId,
      title,
      projectId,
      projectName,
    },
  };
}

async function cgptProbeSidebarApiEndpoint(candidates = [], requestContext = {}, shapeValidator) {
  const endpointTried = [];
  for (const candidate of candidates) {
    const url = cgptResolveSidebarApiAbsoluteUrl(candidate);
    try {
      const result = await cgptSidebarApiFetchJson(url, requestContext);
      const shapeMatched = Boolean(shapeValidator && shapeValidator(result.json));
      endpointTried.push({
        url,
        status: result.status,
        ok: result.ok,
        shapeMatched,
      });
      if (result.ok && shapeMatched) {
        return {
          ok: true,
          endpoint: url,
          payload: result.json,
          endpointTried,
        };
      }
    } catch (_error) {
      endpointTried.push({
        url,
        status: 0,
        ok: false,
        shapeMatched: false,
      });
    }
  }
  return {
    ok: false,
    endpoint: "",
    payload: null,
    endpointTried,
  };
}

function cgptBuildPaginatedSidebarApiUrl(endpoint, nextCursor, collectionLength) {
  const url = new URL(endpoint, window.location.origin);
  if (nextCursor) {
    url.searchParams.set("cursor", nextCursor);
  } else if (url.searchParams.has("offset")) {
    url.searchParams.set("offset", String(collectionLength));
  }
  return url.toString();
}

async function cgptPaginateSidebarApiCollection({
  endpoint,
  initialPayload,
  requestContext,
  collectionKeys,
  normalizeItem,
  extractItems,
}) {
  const items = [];
  const seenIds = new Set();
  let payload = initialPayload;
  let safetyCounter = 0;
  while (payload && safetyCounter < 50) {
    safetyCounter += 1;
    const collection = typeof extractItems === "function"
      ? extractItems(payload)
      : cgptSidebarApiExtractCollection(payload, collectionKeys);
    collection.forEach((item) => {
      const normalized = normalizeItem(item);
      if (!normalized) return;
      const id = String(normalized.id || normalized.conversationId || "");
      if (!id || seenIds.has(id)) return;
      seenIds.add(id);
      items.push(normalized);
    });
    const pagination = cgptSidebarApiGetPaginationState(payload, collection);
    if (!pagination.hasMore) {
      break;
    }
    const nextUrl = cgptBuildPaginatedSidebarApiUrl(endpoint, pagination.nextCursor, items.length);
    const result = await cgptSidebarApiFetchJson(nextUrl, requestContext);
    if (!result.ok || !result.json || typeof result.json !== "object") {
      throw {
        phase: "pagination",
        status: result.status,
        endpoint: nextUrl,
        message: "api_pagination_failed",
      };
    }
    payload = result.json;
  }
  return items;
}

async function cgptFetchAllProjects(requestContext = {}) {
  const probe = await cgptProbeSidebarApiEndpoint(
    CGPT_SIDEBAR_API_ENDPOINTS.projects,
    requestContext,
    cgptIsProjectPayloadShape
  );
  if (!probe.ok) {
    throw {
      phase: "projects_fetch",
      authMode: requestContext.authMode || "cookie",
      status: probe.endpointTried.find((item) => item.status)?.status || 0,
      endpoint: probe.endpointTried[probe.endpointTried.length - 1]?.url || "",
      message: "api_projects_fetch_failed",
      endpointTried: probe.endpointTried,
    };
  }
  const projects = await cgptPaginateSidebarApiCollection({
    endpoint: probe.endpoint,
    initialPayload: probe.payload,
    requestContext,
    collectionKeys: ["gizmos", "items", "projects", "data", "workspaces"],
    normalizeItem: cgptNormalizeSidebarApiProject,
    extractItems: cgptExtractProjectCandidatesFromPayload,
  });
  const enrichedProjects = await cgptEnrichSidebarApiProjects(projects, requestContext);
  if (!enrichedProjects.length) {
    const payloadKeys = Array.isArray(probe.payload)
      ? Object.keys((probe.payload[0] && typeof probe.payload[0] === "object") ? probe.payload[0] : {}).slice(0, 20)
      : (probe.payload && typeof probe.payload === "object" ? Object.keys(probe.payload).slice(0, 20) : []);
    throw {
      phase: "projects_fetch",
      authMode: requestContext.authMode || "cookie",
      status: 200,
      endpoint: probe.endpoint,
      message: "api_projects_empty_after_normalize",
      endpointTried: probe.endpointTried,
      payloadKeys,
    };
  }
  return {
    projects: enrichedProjects,
    endpointTried: probe.endpointTried,
    endpoint: probe.endpoint,
  };
}

async function cgptFetchAllConversations(requestContext = {}, projectIndex = new Map()) {
  const probe = await cgptProbeSidebarApiEndpoint(
    CGPT_SIDEBAR_API_ENDPOINTS.conversations,
    requestContext,
    cgptIsConversationPayloadShape
  );
  if (!probe.ok) {
    throw {
      phase: "conversations_fetch",
      authMode: requestContext.authMode || "cookie",
      status: probe.endpointTried.find((item) => item.status)?.status || 0,
      endpoint: probe.endpointTried[probe.endpointTried.length - 1]?.url || "",
      message: "api_conversations_fetch_failed",
      endpointTried: probe.endpointTried,
    };
  }
  const conversations = await cgptPaginateSidebarApiCollection({
    endpoint: probe.endpoint,
    initialPayload: probe.payload,
    requestContext,
    collectionKeys: ["items", "conversations", "data"],
    normalizeItem: (item) => cgptNormalizeSidebarApiConversation(item, projectIndex),
  });
  return {
    conversations,
    endpointTried: probe.endpointTried,
    endpoint: probe.endpoint,
  };
}

async function cgptFetchSidebarApiSnapshot() {
  const sessionResult = await cgptFetchSessionContext();
  const requestContext = cgptBuildSidebarApiRequestContext(sessionResult.payload);
  const endpointTried = [...sessionResult.endpointTried];
  try {
    const projectResult = await cgptFetchAllProjects(requestContext);
    endpointTried.push(...projectResult.endpointTried);
    const projectIndex = new Map(projectResult.projects.map((project) => [project.id, project]));
    const conversationResult = await cgptFetchAllConversations(requestContext, projectIndex);
    endpointTried.push(...conversationResult.endpointTried);
    return {
      ok: true,
      snapshot: {
        sidebarFound: true,
        conversations: conversationResult.conversations,
        projects: projectResult.projects,
        updatedAt: Date.now(),
        source: "internal_api",
        diagnostics: null,
      },
    };
  } catch (error) {
    return {
      ok: false,
      diagnostics: {
        phase: String((error && error.phase) || "endpoint_discovery"),
        authMode: requestContext.authMode || "cookie",
        status: Number((error && error.status) || 0),
        endpoint: String((error && error.endpoint) || ""),
        message: String((error && error.message) || "api_unknown_error"),
        endpointTried: Array.isArray(error && error.endpointTried)
          ? error.endpointTried
          : endpointTried,
      },
    };
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    cgptBuildSidebarApiRequestContext,
    cgptFetchSessionContext,
    cgptFetchSidebarApiSnapshot,
    cgptIsConversationPayloadShape,
    cgptIsProjectPayloadShape,
    cgptIsSidebarApiProjectSlugName,
    cgptNormalizeSidebarApiConversation,
    cgptNormalizeSidebarApiProject,
  };
}

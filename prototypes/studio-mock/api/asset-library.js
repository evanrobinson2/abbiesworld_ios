/**
 * GET /api/asset-library — Studio Library room over Game Asset registry.
 *
 * Query:
 *   prefix=pois|maps|…     list assets (default prefix empty = all, server-capped)
 *   key=pois/foo/exterior  one asset record
 *   thumb=1&key=…          stream image bytes (proxied; browser never needs LAN URL)
 *   projects=1             list in-memory asset projects (portfolios)
 *   projectId=proj_…       one project
 *
 * Auth: household Bearer (same Auth0 token as asset-jobs / MCP).
 * Upstream registry uses server ABBIES_WORLD_API_KEY — never exposed to browser.
 */
import {
  listGameAssets,
  getGameAsset,
  fetchGameAssetBytes,
  registryConfigStatus,
} from "./lib/asset-registry.js";
import {
  listProjects,
  getProject,
  createProject,
  describeLibrary,
} from "./lib/asset-jobs-store.js";

function bearer(request) {
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ") || header.length < 16) return "";
  return header;
}

export async function GET(request) {
  const auth = bearer(request);
  if (!auth) return Response.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const thumb = url.searchParams.get("thumb") === "1";
  const key = (url.searchParams.get("key") || "").trim();
  const projectId = (url.searchParams.get("projectId") || "").trim();
  const projects = url.searchParams.get("projects") === "1";
  const prefix = (url.searchParams.get("prefix") || "").trim();
  const limit = Number(url.searchParams.get("limit") || 80);

  if (thumb) {
    if (!key) return Response.json({ error: "key_required" }, { status: 400 });
    const bytes = await fetchGameAssetBytes(key);
    if (bytes.error) {
      return Response.json(bytes, { status: bytes.status === 404 ? 404 : 502 });
    }
    return new Response(bytes.body, {
      status: 200,
      headers: {
        "Content-Type": bytes.mimeType,
        "Cache-Control": "private, max-age=120",
        "X-Abbie-Library-Key": key,
      },
    });
  }

  if (projects) {
    if (projectId) {
      const project = getProject(projectId);
      if (!project) return Response.json({ error: "project_missing" }, { status: 404 });
      return Response.json({
        project,
        durable: false,
        note: "Portfolios are in-memory on this deploy until the durable job store lands.",
        config: registryConfigStatus(),
      });
    }
    return Response.json({
      projects: listProjects(),
      durable: false,
      note: "Portfolios are in-memory on this deploy until the durable job store lands.",
      config: registryConfigStatus(),
    });
  }

  if (key) {
    const one = await getGameAsset(key);
    if (one.error === "asset_missing") return Response.json(one, { status: 404 });
    if (one.error) return Response.json(one, { status: 502 });
    return Response.json(one);
  }

  const listed = await listGameAssets({ prefix, limit });
  if (listed.error) {
    const status = listed.error === "registry_read_missing" ? 503 : 502;
    return Response.json(listed, { status });
  }
  return Response.json(listed);
}

export async function POST(request) {
  const auth = bearer(request);
  if (!auth) return Response.json({ error: "unauthorized" }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  if (body?.op === "library_describe") {
    const described = describeLibrary(body);
    if (described.error) return Response.json(described, { status: 400 });
    return Response.json({
      project: described,
      durable: false,
      note: "Portfolios are in-memory on this deploy until the durable job store lands.",
    });
  }

  // Default: create portfolio (asset project)
  const project = createProject({
    name: body?.name,
    libraryIntent: body?.libraryIntent || body?.intent,
    stylePin: body?.stylePin,
    suggestedSemanticIds: body?.suggestedSemanticIds,
    project: true,
  });
  if (project.error) return Response.json(project, { status: 400 });
  return Response.json(
    {
      project,
      durable: false,
      note: "Portfolios are in-memory on this deploy until the durable job store lands.",
      next: "Open Asset jobs to create a plate for each suggestedSemanticId, or POST /api/asset-jobs with projectId.",
    },
    { status: 201 }
  );
}

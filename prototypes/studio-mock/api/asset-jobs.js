/**
 * POST /api/asset-jobs — create job or complete
 * GET  /api/asset-jobs?id=… — job status
 * GET  /api/asset-jobs — list recent jobs
 * POST body.project — create lightweight project
 */
import {
  createJob,
  getJob,
  completeJob,
  listJobs,
  createProject,
  getProject,
  listProjects,
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
  const id = url.searchParams.get("id");
  const projectId = url.searchParams.get("projectId");
  if (id) {
    const job = getJob(id);
    if (!job) return Response.json({ error: "job_missing" }, { status: 404 });
    return Response.json(job);
  }
  if (url.searchParams.get("projects") === "1") {
    if (projectId) {
      const project = getProject(projectId);
      if (!project) return Response.json({ error: "project_missing" }, { status: 404 });
      return Response.json(project);
    }
    return Response.json({ projects: listProjects() });
  }
  return Response.json({ jobs: listJobs({ projectId: projectId || undefined }).slice(0, 50) });
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

  if (body?.complete && body?.id) {
    const done = await completeJob(body.id, { stagingUrl: body.stagingUrl });
    if (done.error === "job_missing" || done.error === "staging_url_required") {
      return Response.json(done, { status: 400 });
    }
    if (done.status === "failed") return Response.json(done, { status: 502 });
    return Response.json(done);
  }

  if (body?.project === true || body?.op === "project_create") {
    const project = createProject(body);
    if (project.error) return Response.json(project, { status: 400 });
    return Response.json(project, { status: 201 });
  }

  if (body?.op === "library_describe") {
    const described = describeLibrary(body);
    if (described.error) return Response.json(described, { status: 400 });
    return Response.json(described);
  }

  const job = await createJob(body || {}, {
    openaiKey: process.env.OPENAI_API_KEY || "",
  });
  if (job.error) return Response.json(job, { status: 400 });
  return Response.json(job, { status: 201 });
}

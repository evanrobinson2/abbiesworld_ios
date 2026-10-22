/**
 * GitHub → dispatch bridge relay.
 *
 * Claude can't reach *.vercel.app from its cloud sessions, so it reports on the
 * dispatch's GitHub issue. The dispatch-relay workflow (on main) forwards each
 * issue/comment here, authenticated with its GitHub Actions OIDC token (no shared
 * secret), and also calls `sweep` on a schedule to retry or resume stuck dispatches.
 *
 * POST { op: "event", source: { kind, id, url, issueNumber, issueUrl, body, author, authorAssociation, createdAt, verification } }
 * POST { op: "sweep" }
 */
import { authorizeRelay } from "./lib/dispatch-auth.js";
import { createDispatchService, getDefaultStore } from "./lib/dispatch-service.js";

const TRUSTED_ASSOCIATIONS = new Set(["OWNER", "MEMBER", "COLLABORATOR"]);
const TRUSTED_BOTS = new Set(["claude[bot]"]);

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function GET() {
  return json({ name: "abbies-dispatch-relay", accepts: ["event", "sweep"], auth: "GitHub Actions OIDC from evanrobinson2/abbiesworld_ios main" });
}

export async function POST(request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const auth = await authorizeRelay(token).catch((err) => ({ ok: false, error: String(err?.message || err) }));
  if (!auth.ok) return json({ error: "unauthorized", detail: auth.error }, 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "bad_json" }, 400);
  }
  const service = createDispatchService({ store: await getDefaultStore() });

  if (body?.op === "sweep") {
    const results = await service.sweep();
    return json({ ok: true, swept: results });
  }

  if (body?.op === "event") {
    const s = body.source || {};
    const trusted = TRUSTED_ASSOCIATIONS.has(String(s.authorAssociation || "")) || TRUSTED_BOTS.has(String(s.author || ""));
    if (!trusted) return json({ ok: true, ignored: "untrusted_author", author: s.author || null });
    if (typeof s.body !== "string" || s.body.length > 65000) return json({ error: "bad_body" }, 400);
    const result = await service.relay({
      kind: s.kind === "issue" ? "issue" : "comment",
      id: String(s.id || ""),
      url: typeof s.url === "string" ? s.url : null,
      issueNumber: Number.isInteger(s.issueNumber) ? s.issueNumber : null,
      issueUrl: typeof s.issueUrl === "string" ? s.issueUrl : null,
      body: s.body,
      createdAt: typeof s.createdAt === "string" ? s.createdAt : undefined,
      verification: s.verification && typeof s.verification === "object" ? s.verification : null,
    });
    return json({ ok: true, ...result });
  }

  return json({ error: "unknown_op" }, 400);
}

/**
 * Signature-checked bearer tokens for the dispatch bridge.
 *
 * The world tools on this MCP pass tokens through to the household API, which
 * checks them there. Dispatch tools start Claude sessions that write to the repo,
 * so they verify locally instead:
 *   - Auth0 access tokens (ChatGPT's OAuth connection, or a household token)
 *   - GitHub Actions OIDC tokens from this repo's own workflows on main
 *     (the relay and the end-to-end acceptance test), so no shared secret is needed.
 */
import { createPublicKey, verify as verifySignature } from "node:crypto";

export const AUTH0_ISSUER = "https://dev-33h7qd4ytudlk0ls.us.auth0.com/";
export const GITHUB_ISSUER = "https://token.actions.githubusercontent.com";
export const REPO = "evanrobinson2/abbiesworld_ios";
export const MCP_AUDIENCE = "https://studio-mock-iota.vercel.app/mcp";
export const HOUSEHOLD_AUDIENCE = "https://api.abbies.world";
export const RELAY_AUDIENCE = "https://studio-mock-iota.vercel.app/api/dispatch-relay";

const JWKS_URLS = {
  [AUTH0_ISSUER]: "https://dev-33h7qd4ytudlk0ls.us.auth0.com/.well-known/jwks.json",
  [GITHUB_ISSUER]: "https://token.actions.githubusercontent.com/.well-known/jwks",
};

const jwksCache = new Map(); // url -> { at, keys }

function b64urlJson(part) {
  return JSON.parse(Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
}

async function keysFor(url, { force = false, fetchImpl = fetch } = {}) {
  const hit = jwksCache.get(url);
  if (hit && !force && Date.now() - hit.at < 6 * 3600 * 1000) return hit.keys;
  const res = await fetchImpl(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`jwks_${res.status}`);
  const body = await res.json();
  const keys = Array.isArray(body.keys) ? body.keys : [];
  jwksCache.set(url, { at: Date.now(), keys });
  return keys;
}

/**
 * Verify an RS256 JWT. Returns { ok, claims } or { ok:false, error }.
 * `expect` = { issuers: [...], audiences: [...] }
 */
export async function verifyJwt(token, expect, { now = Date.now(), fetchImpl } = {}) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return { ok: false, error: "not_a_jwt" };
  let header;
  let claims;
  try {
    header = b64urlJson(parts[0]);
    claims = b64urlJson(parts[1]);
  } catch {
    return { ok: false, error: "malformed_jwt" };
  }
  if (header.alg !== "RS256") return { ok: false, error: "unsupported_alg" };
  if (!expect.issuers.includes(claims.iss)) return { ok: false, error: "issuer_rejected" };
  const auds = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!auds.some((a) => expect.audiences.includes(a))) return { ok: false, error: "audience_rejected" };
  const nowSec = Math.floor(now / 1000);
  if (typeof claims.exp !== "number" || claims.exp < nowSec - 30) return { ok: false, error: "expired" };
  if (typeof claims.nbf === "number" && claims.nbf > nowSec + 60) return { ok: false, error: "not_yet_valid" };

  const url = JWKS_URLS[claims.iss];
  let keys = await keysFor(url, { fetchImpl });
  let jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) {
    keys = await keysFor(url, { force: true, fetchImpl });
    jwk = keys.find((k) => k.kid === header.kid);
  }
  if (!jwk) return { ok: false, error: "unknown_kid" };
  const key = createPublicKey({ key: jwk, format: "jwk" });
  const signed = Buffer.from(`${parts[0]}.${parts[1]}`);
  const sig = Buffer.from(parts[2].replace(/-/g, "+").replace(/_/g, "/"), "base64");
  const good = verifySignature("RSA-SHA256", signed, key, sig);
  if (!good) return { ok: false, error: "bad_signature" };
  return { ok: true, claims };
}

function allowedSubs() {
  return String(process.env.DISPATCH_ALLOWED_SUBS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** A GitHub Actions token is trusted only from this repo's named workflows on main. */
export function githubWorkflowAllowed(claims, workflows) {
  if (claims.repository !== REPO) return false;
  if (claims.ref !== "refs/heads/main") return false;
  return workflows.some((file) => claims.workflow_ref === `${REPO}/.github/workflows/${file}@refs/heads/main`);
}

/**
 * Who may call build/status/revise/inbox.
 * Returns { ok, requester } or { ok:false, error }.
 */
export async function authorizeDispatchCaller(token, opts = {}) {
  if (!token) return { ok: false, error: "auth_required" };
  const result = await verifyJwt(
    token,
    { issuers: [AUTH0_ISSUER, GITHUB_ISSUER], audiences: [MCP_AUDIENCE, HOUSEHOLD_AUDIENCE] },
    opts
  );
  if (!result.ok) return result;
  const c = result.claims;
  if (c.iss === GITHUB_ISSUER) {
    if (!githubWorkflowAllowed(c, ["dispatch-e2e.yml"])) return { ok: false, error: "workflow_rejected" };
    return { ok: true, requester: { kind: "github-actions", sub: c.sub, workflow: c.workflow, run: c.run_id } };
  }
  const subs = allowedSubs();
  if (subs.length && !subs.includes(c.sub)) return { ok: false, error: "subject_not_allowed", sub: c.sub };
  return { ok: true, requester: { kind: "auth0", sub: c.sub, client: c.azp || c.client_id || null } };
}

export async function authorizeRelay(token, opts = {}) {
  if (!token) return { ok: false, error: "auth_required" };
  const result = await verifyJwt(token, { issuers: [GITHUB_ISSUER], audiences: [RELAY_AUDIENCE] }, opts);
  if (!result.ok) return result;
  if (!githubWorkflowAllowed(result.claims, ["dispatch-relay.yml", "dispatch-e2e.yml"])) {
    return { ok: false, error: "workflow_rejected" };
  }
  return { ok: true, claims: result.claims };
}

export function _resetJwksCache() {
  jwksCache.clear();
}

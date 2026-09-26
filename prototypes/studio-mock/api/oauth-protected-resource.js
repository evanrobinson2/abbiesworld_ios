/**
 * OAuth 2.0 Protected Resource Metadata (RFC 9728) for ChatGPT MCP OAuth.
 * Mirrors the StoryBoard MCP shape that ChatGPT already discovers successfully.
 *
 * Canonical resource = the MCP URL ChatGPT dials (`/mcp`).
 * Auth0 API identifier must match that resource so `resource=` → `aud`.
 */
const AUTH0_ISSUER = "https://dev-33h7qd4ytudlk0ls.us.auth0.com";
const MCP_PATH = "/mcp";
const SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  "read:world",
  "write:world",
];

function baseUrl(request) {
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "studio-mock-iota.vercel.app";
  const proto = request.headers.get("x-forwarded-proto") || "https";
  return `${proto}://${host.split(",")[0].trim()}`;
}

export function GET(request) {
  const base = baseUrl(request);
  const resource = `${base}${MCP_PATH}`;
  return Response.json(
    {
      resource,
      authorization_servers: [AUTH0_ISSUER],
      scopes_supported: SCOPES,
      bearer_methods_supported: ["header"],
      resource_documentation: `${base}/api/mcp`,
      abbies_world: {
        // Household API still accepts this same Auth0 subject; tokens minted for
        // the MCP resource audience are also accepted by the world server.
        household_api_audience: "https://api.abbies.world",
        chatgpt_callbacks: [
          "https://chatgpt.com/connector_platform_oauth_redirect",
          "https://chat.openai.com/connector_platform_oauth_redirect",
          "https://chatgpt.com/connector/oauth/{callback_id}",
        ],
        oauth_client_id: "7AAx3t0fgolUT125oBNGICidhAW0rVY9",
      },
    },
    {
      headers: {
        "Cache-Control": "public, max-age=300",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    }
  );
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Max-Age": "86400",
    },
  });
}

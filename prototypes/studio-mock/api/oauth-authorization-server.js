/**
 * OAuth Authorization Server Metadata — proxy Auth0 OpenID configuration.
 * ChatGPT usually discovers Auth0 via authorization_servers on the protected
 * resource doc; this route covers clients that probe the MCP origin instead.
 *
 * Do NOT invent authorization_response_iss_parameter_supported — Auth0 does
 * not return `iss` on authorize redirects, and advertising it breaks ChatGPT.
 */
const AUTH0_OPENID =
  "https://dev-33h7qd4ytudlk0ls.us.auth0.com/.well-known/openid-configuration";

export async function GET() {
  try {
    const upstream = await fetch(AUTH0_OPENID, {
      headers: { Accept: "application/json" },
    });
    if (!upstream.ok) {
      return Response.json(
        { error: "auth0_discovery_failed", status: upstream.status },
        { status: 502 }
      );
    }
    const meta = await upstream.json();
    const scopes = new Set([
      ...(meta.scopes_supported || []),
      "openid",
      "profile",
      "email",
      "offline_access",
      "read:world",
      "write:world",
    ]);
    // Strip any accidental iss-support flag if Auth0 ever adds it without
    // actually emitting iss (would break ChatGPT callback validation).
    const {
      authorization_response_iss_parameter_supported: _iss,
      ...rest
    } = meta;
    return Response.json(
      {
        ...rest,
        // Keep Auth0 issuer exactly as Auth0 publishes it.
        scopes_supported: [...scopes],
        code_challenge_methods_supported:
          meta.code_challenge_methods_supported || ["S256"],
        grant_types_supported: Array.from(
          new Set([
            ...(meta.grant_types_supported || []),
            "authorization_code",
            "refresh_token",
          ])
        ),
        token_endpoint_auth_methods_supported:
          meta.token_endpoint_auth_methods_supported || [
            "none",
            "client_secret_post",
            "client_secret_basic",
            "private_key_jwt",
          ],
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
  } catch (err) {
    return Response.json(
      {
        error: "auth0_discovery_error",
        detail: String(err?.message || err).slice(0, 200),
      },
      { status: 502 }
    );
  }
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

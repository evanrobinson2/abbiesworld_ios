export function GET() {
  const clientId = process.env.AUTH0_CLIENT_ID || "";
  if (!clientId) {
    return Response.json({ error: "auth0_client_missing" }, { status: 503 });
  }
  return Response.json({
    domain: "dev-33h7qd4ytudlk0ls.us.auth0.com",
    clientId,
    audience: "https://api.abbies.world",
  });
}

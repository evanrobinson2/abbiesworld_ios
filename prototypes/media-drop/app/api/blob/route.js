import { requireAllowedSession } from '../../../lib/session.js';
import { fetchInboxAsset, serverConfigured } from '../../../lib/inbox.js';

export const runtime = 'nodejs';

/**
 * Stream an inbox asset from Abbie's World server to the signed-in user.
 * History thumbnails / Open links go through here.
 */
export async function GET(request) {
  const gate = await requireAllowedSession();
  if (gate.error) return gate.error;

  if (!serverConfigured()) {
    return Response.json({ error: 'server_not_configured' }, { status: 503 });
  }

  const name =
    request.nextUrl.searchParams.get('name') ||
    // legacy private-blob proxy shape
    (request.nextUrl.searchParams.get('pathname') || '').split('/').pop() ||
    '';

  const upstream = await fetchInboxAsset(name);
  if (!upstream) {
    return Response.json({ error: 'not_found' }, { status: 404 });
  }

  const headers = new Headers();
  const contentType = upstream.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  headers.set('cache-control', 'private, max-age=300');
  headers.set(
    'content-disposition',
    `inline; filename="${name || 'drop.bin'}"`
  );

  return new Response(upstream.body, { status: 200, headers });
}

import { requireAllowedSession } from '../../../lib/session.js';
import { putInboxBlob, serverConfigured } from '../../../lib/inbox.js';

export const runtime = 'nodejs';

/**
 * Pull a remote Midjourney / Suno / CDN URL into the inbox.
 * Browser paste on phone is often easier than file export.
 */
export async function POST(request) {
  const gate = await requireAllowedSession();
  if (gate.error) return gate.error;

  if (!serverConfigured()) {
    return Response.json(
      {
        error: 'server_not_configured',
        hint: 'Set ABBIES_WORLD_SERVER_URL and ABBIES_WORLD_SERVER_API_KEY on the Vercel project.',
      },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const sourceUrl = typeof body.url === 'string' ? body.url.trim() : '';
  const note = typeof body.note === 'string' ? body.note : null;
  if (!/^https?:\/\//i.test(sourceUrl)) {
    return Response.json({ error: 'url_required' }, { status: 400 });
  }

  let upstream;
  try {
    upstream = await fetch(sourceUrl, {
      headers: { 'User-Agent': 'AbbiesWorld-MediaDrop/1.0' },
      redirect: 'follow',
    });
  } catch (err) {
    return Response.json(
      { error: 'fetch_failed', detail: String(err?.message || err) },
      { status: 502 }
    );
  }

  if (!upstream.ok) {
    return Response.json(
      {
        error: 'upstream_http',
        status: upstream.status,
        hint: 'If Midjourney/Suno blocked the fetch, download on device then use Drop instead.',
      },
      { status: 502 }
    );
  }

  const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
  const bytes = Buffer.from(await upstream.arrayBuffer());
  const urlPath = new URL(sourceUrl).pathname;
  const filename =
    urlPath.split('/').filter(Boolean).pop() ||
    (contentType.startsWith('audio/') ? 'suno-track.mp3' : 'midjourney.png');

  try {
    const record = await putInboxBlob({
      bytes,
      filename,
      contentType,
      email: gate.email,
      sourceUrl,
      note,
    });
    return Response.json({ ok: true, record });
  } catch (err) {
    return Response.json(
      { error: 'upload_failed', detail: String(err?.message || err) },
      { status: 500 }
    );
  }
}

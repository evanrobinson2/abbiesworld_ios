import { redirect } from 'next/navigation';
import { requireAllowedSession } from '../../lib/session.js';
import { putInboxBlob } from '../../lib/inbox.js';

export const runtime = 'nodejs';

/**
 * Web Share Target (Android Chrome PWA) + iOS Shortcuts helper.
 * POST multipart = share_target. GET ?url= = Shortcut / bookmark open.
 */
export async function GET(request) {
  const gate = await requireAllowedSession();
  if (gate.error) {
    const returnTo = `/share?${request.nextUrl.searchParams.toString()}`;
    redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  }

  const url = request.nextUrl.searchParams.get('url');
  const text = request.nextUrl.searchParams.get('text');
  const maybeUrl =
    (url && url.trim()) ||
    (text && text.match(/https?:\/\/\S+/i)?.[0]) ||
    null;

  if (maybeUrl) {
    redirect(`/?import=${encodeURIComponent(maybeUrl)}`);
  }
  redirect('/');
}

export async function POST(request) {
  const gate = await requireAllowedSession();
  if (gate.error) {
    redirect('/login?returnTo=/');
  }

  if (
    !process.env.ABBIES_WORLD_SERVER_URL ||
    !process.env.ABBIES_WORLD_SERVER_API_KEY
  ) {
    redirect('/?share=server_missing');
  }

  const form = await request.formData();
  const sharedUrl = form.get('url');
  const text = form.get('text');
  const title = form.get('title');
  const note = [title, text].filter(Boolean).join(' — ') || null;

  const files = form
    .getAll('file')
    .filter((entry) => entry && typeof entry !== 'string');

  if (files.length > 0) {
    for (const file of files) {
      const bytes = Buffer.from(await file.arrayBuffer());
      if (!bytes.byteLength) continue;
      await putInboxBlob({
        bytes,
        filename: file.name || 'shared.bin',
        contentType: file.type || 'application/octet-stream',
        email: gate.email,
        note,
      });
    }
    redirect('/?shared=1');
  }

  const maybeUrl =
    (typeof sharedUrl === 'string' && sharedUrl) ||
    (typeof text === 'string' && text.match(/https?:\/\/\S+/i)?.[0]) ||
    null;

  if (maybeUrl && /^https?:\/\//i.test(maybeUrl)) {
    redirect(`/?import=${encodeURIComponent(maybeUrl)}`);
  }

  redirect('/?share=empty');
}

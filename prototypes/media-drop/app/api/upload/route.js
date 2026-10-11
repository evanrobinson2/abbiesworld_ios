import { requireAllowedSession } from '../../../lib/session.js';
import { putInboxBlob, serverConfigured } from '../../../lib/inbox.js';

export const runtime = 'nodejs';

function uploadErrorMessage(err) {
  const msg = String(err?.message || err || 'upload_failed');
  if (/cannot use private access on public store/i.test(msg)) {
    return {
      error: 'storage_misconfigured',
      hint: 'Media Drop now stores on Abbie\'s World server — set ABBIES_WORLD_SERVER_URL + ABBIES_WORLD_SERVER_API_KEY.',
      detail: msg,
    };
  }
  return { error: 'upload_failed', detail: msg };
}

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

  let form;
  try {
    form = await request.formData();
  } catch (err) {
    return Response.json(
      {
        error: 'bad_multipart',
        detail: String(err?.message || err),
        hint: 'Try a smaller file, or use Photos → Choose instead of Share.',
      },
      { status: 400 }
    );
  }

  const note = form.get('note');
  const files = form
    .getAll('file')
    .filter((entry) => entry && typeof entry !== 'string');

  if (files.length === 0) {
    return Response.json({ error: 'file_required' }, { status: 400 });
  }

  const records = [];
  try {
    for (const file of files) {
      const bytes = Buffer.from(await file.arrayBuffer());
      if (!bytes.byteLength) {
        return Response.json(
          {
            error: 'empty_file',
            hint: 'That share had no bytes — pick the file from Photos/Files instead.',
          },
          { status: 400 }
        );
      }
      const record = await putInboxBlob({
        bytes,
        filename: file.name || `upload-${Date.now()}`,
        contentType: file.type || 'application/octet-stream',
        email: gate.email,
        note: typeof note === 'string' ? note : null,
      });
      records.push(record);
    }
  } catch (err) {
    return Response.json(uploadErrorMessage(err), { status: 500 });
  }

  return Response.json({
    ok: true,
    record: records[0],
    records,
  });
}

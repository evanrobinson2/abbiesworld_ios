import { requireAllowedSession } from '../../../lib/session.js';
import { listInbox, serverConfigured } from '../../../lib/inbox.js';

export const runtime = 'nodejs';

export async function GET() {
  const gate = await requireAllowedSession();
  if (gate.error) return gate.error;

  if (!serverConfigured()) {
    return Response.json({ ok: true, records: [], serverConfigured: false });
  }

  try {
    const records = await listInbox(50);
    return Response.json({ ok: true, records, serverConfigured: true });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        records: [],
        serverConfigured: true,
        error: 'list_failed',
        detail: String(err?.message || err),
      },
      { status: 502 }
    );
  }
}

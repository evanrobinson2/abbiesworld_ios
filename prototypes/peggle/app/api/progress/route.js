const progressByPlayer = new Map();

function keyFor(request, body = {}) {
  const url = new URL(request.url);
  return body.playerId || url.searchParams.get('playerId') || 'player.local';
}

export async function GET(request) {
  const playerId = keyFor(request);
  return Response.json({
    playerId,
    progress: progressByPlayer.get(playerId) ?? null,
    source: process.env.ABBIES_SERVER_URL ? 'memory-until-server-progress-exists' : 'memory',
  });
}

export async function PUT(request) {
  const body = await request.json();
  const playerId = keyFor(request, body);
  const progress = body.progress ?? body;
  progressByPlayer.set(playerId, progress);

  const base = process.env.ABBIES_SERVER_URL;
  let server = null;
  if (base && process.env.ABBIES_READ_API_KEY) {
    try {
      const url = `${base.replace(/\/$/, '')}/api/v1/games/abbies-world-2/players/${encodeURIComponent(playerId)}/minigames/plink`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${process.env.ABBIES_READ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ schemaVersion: 1, progress }),
      });
      server = { status: response.status, ok: response.ok };
    } catch (error) {
      server = { error: error instanceof Error ? error.message : 'server_unreachable' };
    }
  }

  return Response.json({ playerId, progress, server });
}

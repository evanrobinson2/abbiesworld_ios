import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { inspectCampaign } from '../../lib/engine.js';

const CAMPAIGN_PATH = resolve(
  process.cwd(),
  '../../AssetSources/World2/minigames/plink/campaign.json'
);

async function bundledCampaign() {
  const raw = await readFile(CAMPAIGN_PATH, 'utf8');
  return JSON.parse(raw);
}

async function serverCampaign() {
  const base = process.env.ABBIES_SERVER_URL;
  if (!base) return null;
  const url = `${base.replace(/\/$/, '')}/api/v1/games/abbies-world-2/assets/minigames/plink/campaign`;
  const headers = {};
  if (process.env.ABBIES_READ_API_KEY) {
    headers.Authorization = `Bearer ${process.env.ABBIES_READ_API_KEY}`;
  }
  const response = await fetch(url, { headers });
  if (!response.ok) {
    return {
      error: `server_http_${response.status}`,
      url,
    };
  }
  const json = await response.json();
  return json.campaign ?? json.metadata?.campaign ?? json;
}

export async function GET() {
  const bundled = await bundledCampaign();
  let source = 'bundled';
  let campaign = bundled;
  let server = null;
  try {
    server = await serverCampaign();
    if (server && !server.error && server.schemaVersion === 1 && Array.isArray(server.beds)) {
      campaign = server;
      source = 'server';
    }
  } catch (error) {
    server = { error: error instanceof Error ? error.message : 'server_unreachable' };
  }

  return Response.json({
    source,
    inspect: inspectCampaign(campaign),
    campaign,
    server,
  });
}

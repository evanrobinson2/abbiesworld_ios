import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const client = new Client({ name: 'ranch-view-verification', version: '1.0.0' });
await client.connect(new StdioClientTransport({ command: process.execPath, args: [fileURLToPath(new URL('./ranch-view.mjs', import.meta.url))] }));
try {
  console.log('MCP tools:', (await client.listTools()).tools.map(t => t.name).join(', '));
  const current = await client.callTool({ name: 'get_current_view', arguments: {} });
  const view = JSON.parse(current.content[0].text);
  console.log(JSON.stringify({ slug: view.slug, params: view.params, stale: view.stale, ageSeconds: view.ageSeconds, context: view.context, errors: view.errors, controls: view.controls?.map(c=>({id:c.id,value:c.value,pressed:c.pressed})) }, null, 2));
  const imageResult = await client.callTool({ name: 'get_view_image', arguments: { sessionId: view.sessionId } });
  const image = imageResult.content.find(c => c.type === 'image');
  if (!image) throw new Error('MCP returned no image');
  const destination = path.join(process.env.USERPROFILE, '.codex', 'ranch-view', 'verified-view.jpg');
  fs.writeFileSync(destination, Buffer.from(image.data, 'base64'));
  console.log('MCP image verified:', destination);
} finally { await client.close(); }

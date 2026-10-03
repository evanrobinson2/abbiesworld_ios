#!/usr/bin/env node
/**
 * Mint a DAG-vetted card asset into the local dev asset library.
 *
 *   node tools/dev-asset-library/mint_card.mjs --topic "rainbow unicorn" [--style house] [--mark-vetted]
 *
 * With OPENAI_API_KEY: attempts image generation via OpenAI images API.
 * Without: writes a deterministic SVG placeholder and marks generate_image skipped.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const LIBRARY_PATH = join(ROOT, 'data/dev-asset-library/library.json');
const OUT_DIR = join(ROOT, 'AssetSources/DevAssetLibrary/cards');

const PLATE =
  'Centered on a pure white (#FFFFFF) background, full subject visible, no drop shadow, no floor, no scenery, no vignette — sprite-ready isolation.';

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  return process.argv[i + 1] ?? fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function nowIso() {
  return new Date().toISOString();
}

function slug(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 48);
}

function composePrompt(topic, style) {
  const styleLook =
    style === 'house'
      ? 'Soft storybook house style, rounded shapes, gentle shading, kid-friendly.'
      : `${style} illustration style, clear silhouette, kid-friendly.`;
  return [
    `Trading card art of ${topic}, portrait orientation, decorative border frame, title space at the bottom.`,
    styleLook,
    PLATE,
  ].join(' ');
}

function assertPlateLocked(prompt) {
  if (!prompt.trim().endsWith(PLATE)) {
    throw new Error('carve_check failed: prompt must end with the plate lock sentence');
  }
}

function writePlaceholderSvg(path, topic, prompt) {
  const safe = topic.replace(/[<&]/g, '');
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="#FFFFFF"/>
  <rect x="64" y="64" width="896" height="896" rx="48" fill="#FFF7FB" stroke="#F472B6" stroke-width="16"/>
  <text x="512" y="480" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="48" font-weight="700" fill="#BE185D">${safe}</text>
  <text x="512" y="560" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="28" fill="#9D174D">DAG card placeholder</text>
  <text x="512" y="900" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="18" fill="#9CA3AF">plate locked</text>
</svg>
`;
  writeFileSync(path, svg);
  return { mime: 'image/svg+xml', note: 'placeholder (no OPENAI_API_KEY)' };
}

async function generateWithOpenAI(prompt, outPngPath) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt,
      size: '1024x1024',
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`generate_image http ${res.status}: ${text.slice(0, 400)}`);
  }
  const json = await res.json();
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error('generate_image: no b64_json in response');
  writeFileSync(outPngPath, Buffer.from(b64, 'base64'));
  return { mime: 'image/png', note: 'openai gpt-image-1' };
}

function node(id, status, detail) {
  return { id, status, detail, at: nowIso() };
}

async function main() {
  const topic = arg('topic');
  if (!topic) {
    console.error('Usage: mint_card.mjs --topic "rainbow unicorn" [--style house] [--mark-vetted]');
    process.exit(1);
  }
  const style = arg('style', 'house');
  const markVetted = hasFlag('mark-vetted');
  const stamp = nowIso();
  const idSlug = slug(topic);
  const assetId = `card:${idSlug}:${Date.now().toString(36)}`;

  const nodes = [];
  const prompt = composePrompt(topic, style);
  nodes.push(node('compose_prompt', 'ok', `style=${style}`));

  assertPlateLocked(prompt);
  nodes.push(node('carve_check', 'ok', 'plate lock present'));

  mkdirSync(OUT_DIR, { recursive: true });
  let localRel;
  let generateDetail;
  const pngPath = join(OUT_DIR, `${idSlug}.png`);
  const svgPath = join(OUT_DIR, `${idSlug}.svg`);

  try {
    const generated = await generateWithOpenAI(prompt, pngPath);
    if (generated) {
      localRel = relative(ROOT, pngPath);
      nodes.push(node('generate_image', 'ok', generated.note));
      generateDetail = generated;
    } else {
      writePlaceholderSvg(svgPath, topic, prompt);
      localRel = relative(ROOT, svgPath);
      nodes.push(node('generate_image', 'skipped', 'no OPENAI_API_KEY; wrote SVG placeholder'));
      generateDetail = { mime: 'image/svg+xml' };
    }
  } catch (err) {
    writePlaceholderSvg(svgPath, topic, prompt);
    localRel = relative(ROOT, svgPath);
    nodes.push(node('generate_image', 'failed', String(err.message || err)));
    generateDetail = { mime: 'image/svg+xml' };
  }

  const abs = join(ROOT, localRel);
  const hash = createHash('sha256').update(readFileSync(abs)).digest('hex');
  nodes.push(node('hash_sha256', 'ok', hash.slice(0, 16)));

  const status = markVetted ? 'vetted' : 'dag_pending';
  nodes.push(node('register_library', 'ok', assetId));
  nodes.push(
    node(
      'parent_gate',
      markVetted ? 'ok' : 'pending',
      markVetted ? 'marked vetted via --mark-vetted' : 'awaiting parent/dev vet'
    )
  );

  const library = existsSync(LIBRARY_PATH)
    ? JSON.parse(readFileSync(LIBRARY_PATH, 'utf8'))
    : { version: 1, cdn: { provider: 'r2', baseUrlEnv: 'ABBIES_ASSET_CDN_BASE_URL' }, assets: [] };

  const record = {
    id: assetId,
    semanticId: null,
    name: topic,
    kind: 'card',
    family: 'devMint',
    tags: ['card', 'dag', style, idSlug],
    status,
    storage: {
      localPath: localRel,
      cdnKey: null,
      cdnUrl: null,
      sha256: hash,
      bundleCatalogName: null,
    },
    dag: { pipeline: 'card_mint_v1', nodes },
    prompt,
    createdAt: stamp,
    updatedAt: stamp,
  };

  library.assets = [...library.assets.filter((a) => a.id !== assetId), record];
  library.generatedAt = stamp;
  mkdirSync(dirname(LIBRARY_PATH), { recursive: true });
  writeFileSync(LIBRARY_PATH, `${JSON.stringify(library, null, 2)}\n`);

  console.log(
    JSON.stringify(
      {
        ok: true,
        id: assetId,
        status,
        localPath: localRel,
        sha256: hash,
        mime: generateDetail.mime,
        library: relative(ROOT, LIBRARY_PATH),
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

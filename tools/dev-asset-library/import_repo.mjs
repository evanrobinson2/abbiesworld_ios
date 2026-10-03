#!/usr/bin/env node
/**
 * Seed data/dev-asset-library/library.json from the asset-viewer catalogue
 * plus Abbie/Evan kit plates already in the repo.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const LIBRARY_PATH = join(ROOT, 'data/dev-asset-library/library.json');
const VIEWER_ASSETS = join(ROOT, 'prototypes/asset-viewer/data/assets.json');

function sha256File(path) {
  if (!existsSync(path)) return null;
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function nowIso() {
  return new Date().toISOString();
}

function dagImported(detail) {
  return {
    pipeline: 'repo_import',
    nodes: [
      { id: 'compose_prompt', status: 'skipped', detail: 'imported existing art' },
      { id: 'generate_image', status: 'skipped', detail: 'imported existing art' },
      { id: 'carve_check', status: 'skipped', detail: 'imported existing art' },
      { id: 'hash_sha256', status: 'ok', detail: 'hashed local bytes' },
      { id: 'register_library', status: 'ok', detail },
      { id: 'parent_gate', status: 'ok', detail: 'bundled / already in use' },
    ],
  };
}

function upsert(byId, record) {
  byId.set(record.id, record);
}

function main() {
  const library = existsSync(LIBRARY_PATH)
    ? JSON.parse(readFileSync(LIBRARY_PATH, 'utf8'))
    : { version: 1, cdn: { provider: 'r2' }, assets: [] };

  const byId = new Map(library.assets.map((a) => [a.id, a]));
  const stamp = nowIso();

  if (existsSync(VIEWER_ASSETS)) {
    const catalogue = JSON.parse(readFileSync(VIEWER_ASSETS, 'utf8'));
    for (const asset of catalogue.assets || []) {
      const localPath = asset.file
        ? relative(ROOT, resolve(ROOT, 'prototypes/asset-viewer', asset.file.replace(/^\//, '')))
        : null;
      const abs = localPath ? join(ROOT, localPath) : null;
      upsert(byId, {
        id: asset.id,
        semanticId: asset.id.startsWith('repo:') ? null : asset.id,
        name: asset.name || asset.id,
        kind: asset.kind || 'reference',
        family: asset.family || null,
        tags: asset.tags || [],
        status: asset.source === 'bundled' || asset.hasArt ? 'shipped' : 'draft',
        storage: {
          localPath: localPath && existsSync(abs) ? localPath : (asset.preview || null),
          cdnKey: null,
          cdnUrl: null,
          sha256: abs && existsSync(abs) ? sha256File(abs) : null,
          bundleCatalogName: asset.preview?.includes('Assets') ? null : null,
        },
        dag: dagImported(`imported from assets.json @ ${stamp}`),
        prompt: asset.prompt || null,
        createdAt: stamp,
        updatedAt: stamp,
      });
    }
  }

  const kitDirs = [
    ['AssetSources/AbbieTreehouse/plates', 'sceneArt', 'abbieTreehouse'],
    ['AssetSources/EvanCitadel/plates', 'sceneArt', 'evanCitadel'],
    ['AssetSources/IngredientKit/carved', 'decoration', 'ingredientKit'],
  ];

  for (const [relDir, kind, family] of kitDirs) {
    const absDir = join(ROOT, relDir);
    if (!existsSync(absDir)) continue;
    for (const name of readdirSync(absDir)) {
      const abs = join(absDir, name);
      if (!statSync(abs).isFile()) continue;
      if (!/\.(png|jpg|jpeg|webp)$/i.test(name)) continue;
      const id = `kit:${family}:${basename(name, extname(name))}`;
      const localPath = relative(ROOT, abs);
      upsert(byId, {
        id,
        semanticId: null,
        name: basename(name, extname(name)).replace(/_/g, ' '),
        kind,
        family,
        tags: [family, 'kit'],
        status: 'shipped',
        storage: {
          localPath,
          cdnKey: null,
          cdnUrl: null,
          sha256: sha256File(abs),
          bundleCatalogName: null,
        },
        dag: dagImported(`kit plate ${localPath}`),
        prompt: null,
        createdAt: stamp,
        updatedAt: stamp,
      });
    }
  }

  // Explicit Evan citadel semantic mappings used by the app.
  const semanticPlates = [
    ['map.evan', 'evan_citadel_scene', 'sceneArt'],
    ['poi.evanHome.exterior', 'evan_citadel_exterior', 'sceneArt'],
    ['poi.evanHome.interior', 'evan_citadel_interior', 'sceneArt'],
  ];
  for (const [semanticId, catalogName, kind] of semanticPlates) {
    const imageset = join(
      ROOT,
      'abbies.world.ios/abbies.world.ios/Assets.xcassets',
      `${catalogName}.imageset`,
      `${catalogName}.png`
    );
    upsert(byId, {
      id: `semantic:${semanticId}`,
      semanticId,
      name: semanticId,
      kind,
      family: 'evanCitadel',
      tags: ['evan', 'citadel', 'shipped'],
      status: 'shipped',
      storage: {
        localPath: existsSync(imageset) ? relative(ROOT, imageset) : null,
        cdnKey: null,
        cdnUrl: null,
        sha256: existsSync(imageset) ? sha256File(imageset) : null,
        bundleCatalogName: catalogName,
      },
      dag: dagImported('ios semantic binding'),
      prompt: null,
      createdAt: stamp,
      updatedAt: stamp,
    });
  }

  library.generatedAt = stamp;
  library.assets = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
  mkdirSync(dirname(LIBRARY_PATH), { recursive: true });
  writeFileSync(LIBRARY_PATH, `${JSON.stringify(library, null, 2)}\n`);
  console.log(`Wrote ${library.assets.length} assets → ${relative(ROOT, LIBRARY_PATH)}`);
}

main();

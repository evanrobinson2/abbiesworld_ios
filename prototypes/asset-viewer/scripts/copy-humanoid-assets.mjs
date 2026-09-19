#!/usr/bin/env node
/**
 * Copy HumanoidRigPOC assets to public folder for Vercel deployment.
 * The assets live in AssetSources/ which is outside the deployment root,
 * so we need to copy them into the deployment bundle.
 */

import { cpSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const repoRoot = join(projectRoot, '..', '..');

const SOURCE = join(repoRoot, 'AssetSources', 'HumanoidRigPOC');
const DEST = join(projectRoot, 'public', 'humanoid-rig-assets');

if (!existsSync(SOURCE)) {
  console.log(`Source not found: ${SOURCE}`);
  console.log('Skipping humanoid asset copy (expected in CI without full repo)');
  process.exit(0);
}

console.log(`Copying HumanoidRigPOC assets...`);
console.log(`  From: ${SOURCE}`);
console.log(`  To:   ${DEST}`);

mkdirSync(DEST, { recursive: true });
cpSync(SOURCE, DEST, { recursive: true });

console.log('Done copying humanoid assets.');

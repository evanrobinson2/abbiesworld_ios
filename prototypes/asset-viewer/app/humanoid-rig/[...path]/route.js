import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// In development, read from the repo's AssetSources directory
// In production (Vercel), read from public/humanoid-rig-assets (copied during build)
const DEV_ASSETS_ROOT = join(process.cwd(), '..', '..', 'AssetSources', 'HumanoidRigPOC');
const PROD_ASSETS_ROOT = join(process.cwd(), 'public', 'humanoid-rig-assets');

const ASSETS_ROOT = existsSync(DEV_ASSETS_ROOT) ? DEV_ASSETS_ROOT : PROD_ASSETS_ROOT;

const MIME_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.json': 'application/json',
};

export async function GET(request, { params }) {
  const pathSegments = await params.path;
  const filePath = pathSegments.join('/');
  
  const safePath = filePath.replace(/\.\./g, '');
  const fullPath = join(ASSETS_ROOT, safePath);
  
  try {
    const data = await readFile(fullPath);
    
    const ext = safePath.substring(safePath.lastIndexOf('.')).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    
    return new NextResponse(data, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return NextResponse.json({ error: 'File not found', path: safePath }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to read file' }, { status: 500 });
  }
}

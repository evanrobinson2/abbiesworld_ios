import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const MIME_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.json': 'application/json',
};

function getAssetsRoot() {
  const devPath = join(process.cwd(), '..', '..', 'AssetSources', 'HumanoidRigPOC');
  if (existsSync(devPath)) {
    return devPath;
  }
  return join(process.cwd(), 'public', 'humanoid-rig');
}

export async function GET(request, { params }) {
  const pathSegments = await params.path;
  const filePath = pathSegments.join('/');
  
  const safePath = filePath.replace(/\.\./g, '');
  const assetsRoot = getAssetsRoot();
  const fullPath = join(assetsRoot, safePath);
  
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
      return NextResponse.json({ error: 'File not found', path: safePath, root: assetsRoot }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to read file' }, { status: 500 });
  }
}

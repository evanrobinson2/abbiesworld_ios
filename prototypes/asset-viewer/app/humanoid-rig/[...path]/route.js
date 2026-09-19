import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

const ASSETS_ROOT = join(process.cwd(), '..', '..', 'AssetSources', 'HumanoidRigPOC');

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

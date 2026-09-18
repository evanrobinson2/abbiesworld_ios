import { NextResponse } from 'next/server';

import { profileSnapshot } from '../../../lib/generationProfile';
import { generationConfig } from '../../../lib/imageConfig';

/** Latency benchmarks for image generation. No keys, no image bytes. */
export async function GET() {
  const snapshot = await profileSnapshot();
  return NextResponse.json({
    ...generationConfig(),
    ...snapshot,
  });
}

import { NextResponse } from 'next/server';

import { generateImage, providerStatus } from '../../lib/generateImage';
import { promptProblems, studioPrompt } from '../../studioPrompt';
import styleCatalogue from '../../../data/styles.json';

// Quick quality takes ~10s and good ~30s, so the function needs room. 60 is the
// ceiling on every Vercel plan, which is why "high" is not offered.
export const maxDuration = 60;

const STYLES = Object.fromEntries(styleCatalogue.styles.map((style) => [style.id, style]));
const ALLOWED_QUALITY = new Set(['low', 'medium']);

/** What the studio can do right now, so the UI can say so before anyone waits
 *  30 seconds to find out. Never returns key material. */
export function GET() {
  return NextResponse.json({
    ...providerStatus(),
    model: 'gpt-image-2',
    styles: styleCatalogue.styles.map(({ id, label }) => ({ id, label })),
  });
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const { topic, family = 'decoration', styleId = 'house', customLook = '', notes = '', quality = 'low' } = body;

  if (!ALLOWED_QUALITY.has(quality)) {
    return NextResponse.json(
      { error: `Quality must be one of ${[...ALLOWED_QUALITY].join(', ')}.` },
      { status: 400 }
    );
  }

  // A custom look is a style the caller wrote rather than one we shipped.
  const style = customLook.trim() ? { id: 'custom', label: 'Custom', look: customLook } : STYLES[styleId];
  if (!style) {
    return NextResponse.json({ error: `Unknown style "${styleId}".` }, { status: 400 });
  }

  const request_ = { topic, family, style, notes };
  const problems = promptProblems(request_);
  if (problems.length > 0) {
    return NextResponse.json({ error: problems.join(' '), problems }, { status: 400 });
  }

  // Composed server-side so the prompt that is sent is the prompt that is
  // reported. The client cannot substitute one for the other.
  const prompt = studioPrompt(request_);
  const result = await generateImage({ prompt, quality });

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.message,
        type: result.type,
        prompt,
        attempts: result.attempts,
      },
      { status: result.status >= 400 && result.status < 600 ? result.status : 502 }
    );
  }

  return NextResponse.json({
    prompt,
    image: `data:${result.mediaType};base64,${result.base64}`,
    route: result.route,
    model: result.model,
    quality,
    styleId: style.id,
    styleLabel: style.label,
    family,
    elapsedMs: result.elapsedMs,
    usage: result.usage,
    attempts: result.attempts,
  });
}

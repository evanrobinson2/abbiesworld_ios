// Server-only. Turning a prompt into an image, through Vercel AI Gateway when
// it will serve us and straight to OpenAI when it will not.
//
// Both routes speak the same OpenAI images API — only the base URL, the auth
// header and the model prefix differ — which is why supporting both costs
// almost nothing.
//
// The gateway is preferred because it adds spend tracking, per-key budgets,
// tagging and request logs that calling OpenAI directly does not. It is used in
// BYOK mode, meaning the gateway authenticates the Vercel team but calls OpenAI
// with OPENAI_API_KEY, so generation bills to that OpenAI account at no gateway
// markup.
//
// As of writing the gateway answers 403 customer_verification_required until a
// card is on file for the team, even in BYOK mode where Vercel is not charging
// for tokens. Rather than ship a dead button, an unusable gateway falls back to
// calling OpenAI directly and the response says which route served it. Add the
// card and the gateway takes over with no code change.

import { recordGeneration } from './generationProfile';
import { DEFAULT_QUALITY, imageModel, imageSize } from './imageConfig';

const GATEWAY = 'https://ai-gateway.vercel.sh/v1/images/generations';
const OPENAI = 'https://api.openai.com/v1/images/generations';

// WebP at 92 keeps a 1024px card near 150KB instead of the 1.4MB PNG, which
// matters because the image travels back through a serverless response.
const FORMAT = { output_format: 'webp', output_compression: 92 };

/** Errors that mean "this route will not work at all", as opposed to "this
 *  request was bad". Only the former is worth falling back from. */
function routeUnusable(status, type) {
  return (
    status === 401 ||
    status === 402 ||
    status === 403 ||
    type === 'customer_verification_required'
  );
}

function describe(status, body) {
  let type = null;
  let message = body.slice(0, 300);
  try {
    const parsed = JSON.parse(body);
    type = parsed.error?.type ?? null;
    message = parsed.error?.message ?? message;
  } catch {
    /* not JSON; the raw text is the best we have */
  }
  return { status, type, message };
}

async function call(route, { prompt, quality }) {
  const started = Date.now();
  const response = await fetch(route.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${route.key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: route.model,
      prompt,
      n: 1,
      size: imageSize(),
      quality,
      ...FORMAT,
      ...route.extra,
    }),
  });

  const elapsedMs = Date.now() - started;
  if (!response.ok) {
    const failure = describe(response.status, await response.text());
    return { ok: false, route: route.name, elapsedMs, ...failure };
  }

  const json = await response.json();
  const base64 = json.data?.[0]?.b64_json;
  if (!base64) {
    return { ok: false, route: route.name, elapsedMs, status: 502, type: 'no_image', message: 'The provider returned no image data.' };
  }
  return {
    ok: true,
    route: route.name,
    elapsedMs,
    base64,
    mediaType: 'image/webp',
    model: route.model,
    usage: json.usage ?? null,
  };
}

/** The routes we could use, in preference order, given what is configured. */
function routes() {
  const openaiKey = process.env.OPENAI_API_KEY;
  const gatewayKey = process.env.AI_GATEWAY_API_KEY;
  const model = imageModel();
  const available = [];

  if (gatewayKey && openaiKey) {
    available.push({
      name: 'gateway',
      url: GATEWAY,
      key: gatewayKey,
      model: `openai/${model}`,
      extra: {
        providerOptions: {
          gateway: {
            byok: { openai: [{ apiKey: openaiKey }] },
            tags: ['feature:asset-studio'],
          },
        },
      },
    });
  }
  if (openaiKey) {
    available.push({ name: 'direct', url: OPENAI, key: openaiKey, model, extra: {} });
  }
  return available;
}

/** What is and is not configured, for the UI to show without leaking keys. */
export function providerStatus() {
  const configured = routes().map((route) => route.name);
  return {
    hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
    hasGatewayKey: Boolean(process.env.AI_GATEWAY_API_KEY),
    routes: configured,
    preferred: configured[0] ?? null,
    model: imageModel(),
    size: imageSize(),
  };
}

/**
 * Generate one image, trying each configured route in order.
 *
 * @returns the first success, or the last failure with every attempt listed so
 *          a misconfiguration is diagnosable from the response alone.
 */
export async function generateImage({ prompt, quality = DEFAULT_QUALITY }) {
  const available = routes();
  if (available.length === 0) {
    return {
      ok: false,
      status: 503,
      type: 'not_configured',
      message: 'No image provider is configured. Set OPENAI_API_KEY, and AI_GATEWAY_API_KEY to route through the gateway.',
      attempts: [],
    };
  }

  const attempts = [];
  for (const route of available) {
    const result = await call(route, { prompt, quality });
    attempts.push({
      route: result.route,
      ok: result.ok,
      status: result.status ?? 200,
      type: result.type ?? null,
      message: result.ok ? null : result.message,
      elapsedMs: result.elapsedMs,
    });
    await recordGeneration({
      ok: result.ok,
      model: route.model,
      quality,
      size: imageSize(),
      route: result.route,
      elapsedMs: result.elapsedMs,
      promptChars: prompt.length,
      status: result.status ?? 200,
      type: result.type ?? null,
      usage: result.usage ?? null,
    });
    if (result.ok) return { ...result, attempts };
    // A bad prompt fails the same way everywhere, so only retry elsewhere when
    // the route itself is the problem.
    if (!routeUnusable(result.status, result.type)) {
      return { ...result, attempts };
    }
  }
  const last = attempts.at(-1);
  return { ok: false, status: last.status, type: last.type, message: last.message, attempts };
}

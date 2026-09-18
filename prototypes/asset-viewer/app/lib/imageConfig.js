// Generation knobs the studio and /api/generate share.
//
// Fastest path is the default: gpt-image-2.5-flare at quality=low. Quality is
// the speed/fidelity tradeoff OpenAI actually exposes — there is no separate
// "speed mode" parameter. IMAGE_MODEL / IMAGE_QUALITY override the defaults
// without a code change.

export const DEFAULT_MODEL = 'gpt-image-2.5-flare';
export const DEFAULT_QUALITY = 'low';
export const DEFAULT_SIZE = '1024x1024';
export const ALLOWED_QUALITIES = ['low', 'medium'];

export function imageModel() {
  return (process.env.IMAGE_MODEL || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
}

export function defaultQuality() {
  const value = (process.env.IMAGE_QUALITY || DEFAULT_QUALITY).trim().toLowerCase();
  return ALLOWED_QUALITIES.includes(value) ? value : DEFAULT_QUALITY;
}

export function imageSize() {
  return (process.env.IMAGE_SIZE || DEFAULT_SIZE).trim() || DEFAULT_SIZE;
}

export function generationConfig() {
  return {
    model: imageModel(),
    defaultQuality: defaultQuality(),
    size: imageSize(),
    qualities: ALLOWED_QUALITIES,
  };
}

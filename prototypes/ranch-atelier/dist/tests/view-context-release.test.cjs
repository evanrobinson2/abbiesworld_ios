const { test } = require('node:test');
const assert = require('node:assert/strict');
const verify = require('../scripts/assert-live-view.cjs');
const view = { sessionId: 'test', sharing: true, stale: false, ageSeconds: 1, slug: '/scene-generator', bridgeVersion: '2.0.0', buildId: 'current', receivedAt: new Date().toISOString(), imageCapturedAt: new Date().toISOString(), imageAgeSeconds: 1, imageStale: false };
const options = { slug: '/scene-generator', buildId: 'current', image: true };
test('release check requires current route, build, heartbeat and image', () => {
  verify(view, options);
  for (const patch of [{ stale: true }, { slug: '/3d' }, { buildId: 'old' }, { sharing: false }, { imageStale: true }, { captureError: 'timeout' }]) assert.throws(() => verify({ ...view, ...patch }, options));
  assert.throws(() => verify(view, { ...options, since: Date.now() + 10000 }));
  assert.throws(() => verify({ ...view, imageCapturedAt: new Date(0).toISOString() }, { ...options, since: Date.now() - 1000 }));
});

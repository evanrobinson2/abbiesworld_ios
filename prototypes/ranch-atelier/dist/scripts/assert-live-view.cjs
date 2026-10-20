module.exports = function assertLiveView(view, { slug, buildId, since = 0, image = false }) {
  if (!view || view.connected === false || !view.sessionId) throw new Error('No paired browser view. Reconnect the browser before declaring the build verified.');
  if (view.sharing === false || view.stale || !Number.isFinite(view.ageSeconds) || view.ageSeconds > 45) throw new Error('MCP view is paused or stale. Live verification failed.');
  if (view.slug !== slug) throw new Error(`Expected ${slug}, received ${view.slug}. Verify the changed page, not another open tab.`);
  if (view.bridgeVersion !== '2.0.0' || view.buildId !== buildId) throw new Error('The browser is running another build. Reload the changed page.');
  if (Date.parse(view.receivedAt) < since) throw new Error('No update received after the verification action.');
  if (image && (view.imageStale || !Number.isFinite(view.imageAgeSeconds) || view.imageAgeSeconds > 45 || view.captureError)) throw new Error('MCP image is missing, stale or failed.');
  if (image && (!Number.isFinite(Date.parse(view.imageCapturedAt)) || Date.parse(view.imageCapturedAt) < since)) throw new Error('No image captured after the verification action.');
};

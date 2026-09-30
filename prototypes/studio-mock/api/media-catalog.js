/**
 * GET /api/media-catalog — semantic media catalog for Studio / agents.
 * Optional ?id=sfx.plink.hit for a single entry (with absolute URLs).
 */
const fs = require("fs");
const path = require("path");

function absoluteUrls(req, files) {
  const proto = (req.headers["x-forwarded-proto"] || "https").split(",")[0].trim();
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const base = `${proto}://${host}/media`;
  return files.map((f) => `${base}/${f.replace(/^\/+/, "")}`);
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "GET") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const catalogPath = path.join(__dirname, "..", "media", "catalog.json");
  let catalog;
  try {
    catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
  } catch (err) {
    res.status(500).json({ error: "catalog_missing", detail: String(err) });
    return;
  }

  const wantId = typeof req.query.id === "string" ? req.query.id : null;
  const wantGroup = typeof req.query.group === "string" ? req.query.group : null;
  const wantKind = typeof req.query.kind === "string" ? req.query.kind : null;

  let entries = catalog.entries || [];
  if (wantId) entries = entries.filter((e) => e.id === wantId);
  if (wantGroup) entries = entries.filter((e) => e.group === wantGroup);
  if (wantKind) entries = entries.filter((e) => e.kind === wantKind);

  const hydrated = entries.map((e) => ({
    ...e,
    urls: absoluteUrls(req, e.files || []),
  }));

  if (wantId && hydrated.length === 0) {
    res.status(404).json({ error: "not_found", id: wantId });
    return;
  }

  res.setHeader("Cache-Control", "public, max-age=60");
  res.status(200).json({
    version: catalog.version,
    generatedAt: catalog.generatedAt,
    license: catalog.license,
    groups: catalog.groups,
    count: hydrated.length,
    entries: hydrated,
  });
};

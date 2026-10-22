/**
 * Midjourney — harvest candidate CDN URLs from the Create feed only.
 * Prefer a NEW job id (not in exclude list). Never scrape Personalize.
 */
(function () {
  function path() {
    try {
      return String(location.pathname || "").toLowerCase();
    } catch (e) {
      return "";
    }
  }
  function title() {
    try {
      return String(document.title || "").toLowerCase();
    } catch (e) {
      return "";
    }
  }
  if (
    path().indexOf("/personalize") !== -1 ||
    title().indexOf("personalize") !== -1 ||
    (path().indexOf("/imagine") === -1 && title().indexOf("create") === -1)
  ) {
    return JSON.stringify({
      ok: false,
      code: "wrong_page",
      candidateUrls: [],
      count: 0,
      message: "Harvest refused — not on Create (/imagine).",
    });
  }

  var exclude = window.__ABBIE_MJ_EXCLUDE_JOBS__ || [];
  if (!Array.isArray(exclude)) exclude = [];
  var excludeSet = {};
  for (var e = 0; e < exclude.length; e++) excludeSet[String(exclude[e])] = true;

  var preferJob = String(window.__ABBIE_MJ_PREFER_JOB__ || "").trim();

  var seen = {};
  var urls = [];

  function add(url, score, jobHint) {
    if (!url || typeof url !== "string") return;
    url = url.split("?")[0];
    if (url.indexOf("cdn.midjourney.com") === -1 && url.indexOf("media.midjourney.com") === -1) return;
    var m = url.match(/cdn\.midjourney\.com\/([0-9a-f-]{16,})\/(\d+)_(\d+)/i);
    if (!m) return;
    var job = m[1];
    if (excludeSet[job]) return;
    if (seen[url]) return;
    seen[url] = true;
    urls.push({ url: url, job: job, tile: Number(m[3]), score: score || 0, hint: jobHint || "" });
  }

  var jobAnchors = document.querySelectorAll('a[href*="/jobs/"]');
  for (var a = 0; a < jobAnchors.length; a++) {
    var href = jobAnchors[a].getAttribute("href") || "";
    var jm = href.match(/\/jobs\/([0-9a-f-]{16,})/i);
    var jobHint = jm ? jm[1] : "";
    if (jobHint && excludeSet[jobHint]) continue;
    var imgs = jobAnchors[a].querySelectorAll("img");
    for (var i = 0; i < imgs.length; i++) {
      add(imgs[i].currentSrc || imgs[i].src || "", 10, jobHint);
      var srcset = imgs[i].getAttribute("srcset") || "";
      srcset.split(",").forEach(function (part) {
        add(part.trim().split(" ")[0], 10, jobHint);
      });
    }
  }

  if (urls.length < 4) {
    var grids = document.querySelectorAll(".group\\/mediaGrid, [class*='mediaGrid']");
    for (var g = 0; g < grids.length; g++) {
      var gimgs = grids[g].querySelectorAll("img");
      for (var gi = 0; gi < gimgs.length; gi++) {
        add(gimgs[gi].currentSrc || gimgs[gi].src || "", 6, "");
      }
    }
  }

  var order = [];
  var byJob = {};
  for (var u = 0; u < urls.length; u++) {
    var item = urls[u];
    if (!byJob[item.job]) {
      byJob[item.job] = [];
      order.push(item.job);
    }
    byJob[item.job].push(item);
  }

  var bestJob = null;
  var bestScore = -1;
  if (preferJob && byJob[preferJob]) {
    bestJob = preferJob;
    bestScore = 999;
  } else {
    for (var oi = 0; oi < order.length; oi++) {
      var job = order[oi];
      if (excludeSet[job]) continue;
      var tiles = byJob[job];
      var has640 = tiles.some(function (t) {
        return /_640_/.test(t.url);
      });
      var uniq = {};
      tiles.forEach(function (t) {
        uniq[t.tile] = t;
      });
      var n = Object.keys(uniq).length;
      // Require a real quartet when excluding old jobs — avoid premature single tiles.
      var score = n * 10 + (has640 ? 5 : 0) + (tiles[0].score || 0) + Math.max(0, 40 - oi * 8);
      if (n >= 4) score += 30;
      if (score > bestScore) {
        bestScore = score;
        bestJob = job;
      }
    }
  }

  var out = [];
  if (bestJob) {
    var picked = byJob[bestJob].slice();
    picked.sort(function (a, b) {
      var sa = /_640_/.test(a.url) ? 2 : /_384_/.test(a.url) ? 1 : 0;
      var sb = /_640_/.test(b.url) ? 2 : /_384_/.test(b.url) ? 1 : 0;
      if (sb !== sa) return sb - sa;
      return a.tile - b.tile;
    });
    var seenTile = {};
    for (var p = 0; p < picked.length; p++) {
      if (seenTile[picked[p].tile]) continue;
      seenTile[picked[p].tile] = true;
      out.push(picked[p].url);
      if (out.length >= 4) break;
    }
  }

  // When excluding prior jobs, require a full quartet of a NEW job.
  var needNew = exclude.length > 0;
  var ok = out.length > 0 && (!needNew || out.length >= 4);

  return JSON.stringify({
    ok: ok,
    candidateUrls: ok ? out : [],
    count: ok ? out.length : 0,
    jobId: ok ? bestJob : null,
    excluded: exclude.length,
    preferJob: preferJob || null,
    page: path() || "create",
    message: ok
      ? undefined
      : needNew
        ? "Waiting for new Create job tiles (excluded " + exclude.length + " prior jobs)."
        : "No Create job tiles found.",
  });
})();

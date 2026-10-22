/**
 * Midjourney submit — Create page only.
 * Prefer PaperAirplane click (Enter key events do not submit on current MJ).
 * Never click "Create your profile" / Personalize CTAs.
 */
(function () {
  var cfg = window.__ABBIE_MJ_HUMANIZE__ || {};
  var enabled = cfg.enabled !== false;

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
      message: "Submit refused — not on Create (/imagine).",
    });
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function sleepMs(ms) {
    if (ms <= 0) return;
    var end = Date.now() + ms;
    while (Date.now() < end) {}
  }

  function pause(a, b) {
    if (!enabled) return;
    sleepMs(rand(a, b));
  }

  function visible(el) {
    if (!el) return false;
    var rect = el.getBoundingClientRect();
    if (rect.width < 12 || rect.height < 12) return false;
    var style = window.getComputedStyle(el);
    return style.visibility !== "hidden" && style.display !== "none" && style.opacity !== "0";
  }

  function labelOf(el) {
    return (
      (el.innerText || el.textContent || "") +
      " " +
      (el.getAttribute("aria-label") || "") +
      " " +
      (el.getAttribute("title") || "")
    )
      .toLowerCase()
      .trim();
  }

  function isBanned(text) {
    return /create your profile|remind me later|rate more|add rankings|new profile|personalize|sign in|log in|subscribe/.test(
      text
    );
  }

  function nearComposer(el) {
    var box = document.querySelector("#desktop_input_bar");
    if (!box) return false;
    var a = el.getBoundingClientRect();
    var b = box.getBoundingClientRect();
    return Math.abs(a.top - b.top) < 140 && a.left >= b.left - 80;
  }

  function isPaperAirplane(el) {
    if (!el || !el.querySelector) return false;
    var svg = el.querySelector("svg");
    if (!svg) return false;
    var g = svg.innerHTML || "";
    return /PaperAirplane|paper-airplane|M3\.827/i.test(g);
  }

  function humanClick(el) {
    var rect = el.getBoundingClientRect();
    var x = rect.left + rect.width * rand(0.35, 0.65);
    var y = rect.top + rect.height * rand(0.35, 0.65);
    var opts = { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 };
    pause(80, 220);
    el.dispatchEvent(new MouseEvent("mouseover", opts));
    pause(40, 120);
    el.dispatchEvent(new MouseEvent("mousedown", opts));
    pause(45, 110);
    el.dispatchEvent(new MouseEvent("mouseup", opts));
    pause(20, 70);
    el.dispatchEvent(new MouseEvent("click", opts));
    // Element.click() is what successfully triggers Midjourney's Create submit
    // after a React-aware fill (setRangeText). Keep synthetic mouse events above
    // for UI hover state; this is the reliable submit path.
    try {
      el.click();
    } catch (e) {}
  }

  function pressEnter(box) {
    box.focus();
    pause(100, 240);
    var opts = {
      key: "Enter",
      code: "Enter",
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true,
      composed: true,
    };
    box.dispatchEvent(new KeyboardEvent("keydown", opts));
    pause(20, 50);
    box.dispatchEvent(new KeyboardEvent("keypress", opts));
    pause(20, 50);
    box.dispatchEvent(new KeyboardEvent("keyup", opts));
  }

  function listJobIds() {
    var out = [];
    var seen = {};
    var anchors = document.querySelectorAll('a[href*="/jobs/"]');
    for (var i = 0; i < anchors.length; i++) {
      var m = (anchors[i].getAttribute("href") || "").match(/\/jobs\/([0-9a-f-]{16,})/i);
      if (!m || seen[m[1]]) continue;
      seen[m[1]] = true;
      out.push(m[1]);
    }
    return out;
  }

  var box = document.querySelector("#desktop_input_bar");
  if (!box || !visible(box)) {
    return JSON.stringify({ ok: false, message: "Create composer (#desktop_input_bar) missing." });
  }
  var beforeText = (box.value || box.innerText || "").trim();
  if (beforeText.length < 8) {
    return JSON.stringify({ ok: false, message: "Composer empty — fill before submit." });
  }
  var beforeJobs = listJobIds();

  pause(420, 900);

  // 1) PaperAirplane near composer (verified path on current Midjourney Create).
  var nodes = document.querySelectorAll("button, [role='button']");
  var plane = null;
  for (var i = 0; i < nodes.length; i++) {
    var el = nodes[i];
    if (!visible(el)) continue;
    var text = labelOf(el);
    if (isBanned(text)) continue;
    if (isPaperAirplane(el) && nearComposer(el)) {
      plane = el;
      break;
    }
  }
  if (plane) {
    humanClick(plane);
  } else {
    // 2) Fallback Enter (often ignored by React MJ; kept as last resort).
    pressEnter(box);
  }

  // Sync wait for UI to clear composer / enqueue job.
  // Long prompts + Fast queue can take several seconds before the card appears
  // or the composer clears — keep polling (~15s).
  var cleared = false;
  var newJob = null;
  for (var w = 0; w < 60; w++) {
    sleepMs(250);
    var nowText = (box.value || box.innerText || "").trim();
    if (nowText.length < 4) cleared = true;
    var nowJobs = listJobIds();
    for (var j = 0; j < nowJobs.length; j++) {
      if (beforeJobs.indexOf(nowJobs[j]) === -1) {
        newJob = nowJobs[j];
        break;
      }
    }
    if (cleared || newJob) break;
  }

  if (!cleared && !newJob) {
    return JSON.stringify({
      ok: false,
      code: "submit_no_effect",
      message: "Submit did not clear composer or create a new /jobs/ card.",
      method: plane ? "paperAirplane" : "enter",
      beforeJobCount: beforeJobs.length,
      page: path() || "create",
    });
  }

  return JSON.stringify({
    ok: true,
    method: plane ? "paperAirplane" : "enter",
    humanized: enabled,
    label: plane ? "PaperAirplane" : "desktop_input_bar+Enter",
    cleared: cleared,
    newJobId: newJob,
    beforeJobIds: beforeJobs.slice(0, 12),
    page: path() || "create",
  });
})();

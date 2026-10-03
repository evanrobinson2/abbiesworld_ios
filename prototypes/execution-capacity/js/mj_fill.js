/**
 * Midjourney fill — Create (/imagine) only.
 * Personalize hosts the same #desktop_input_bar; never fill there.
 *
 * Critical: Midjourney's React composer ignores native value setters.
 * Use setRangeText + InputEvent so submit posts the real prompt.
 */
(function () {
  var promptText = window.__ABBIE_MJ_PROMPT__ || "";
  if (!promptText) return JSON.stringify({ ok: false, message: "empty_prompt" });

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
  function wrongPage() {
    var p = path();
    var t = title();
    if (
      p.indexOf("/personalize") !== -1 ||
      p.indexOf("/organize") !== -1 ||
      p.indexOf("/explore") !== -1 ||
      p.indexOf("/moodboards") !== -1 ||
      t.indexOf("personalize") !== -1
    ) {
      return "Midjourney tab is Personalize/other — not Create. Open /imagine.";
    }
    if (p.indexOf("/imagine") === -1 && t.indexOf("create") === -1) {
      return "Need midjourney.com/imagine (Create). Current: " + (p || t || "unknown");
    }
    return "";
  }
  var pageErr = wrongPage();
  if (pageErr) return JSON.stringify({ ok: false, code: "wrong_page", message: pageErr });

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function sleepMs(ms) {
    if (ms <= 0) return;
    var end = Date.now() + ms;
    while (Date.now() < end) {
      /* sync spin — required under Apple Events */
    }
  }

  function pause(a, b) {
    if (!enabled) {
      sleepMs(40);
      return;
    }
    sleepMs(rand(a, b));
  }

  function visible(el) {
    if (!el) return false;
    var rect = el.getBoundingClientRect();
    if (rect.width < 40 || rect.height < 18) return false;
    var style = window.getComputedStyle(el);
    return style.visibility !== "hidden" && style.display !== "none" && style.opacity !== "0";
  }

  /** React-aware write — setRangeText updates controlled Midjourney composer. */
  function writeReactTextarea(el, value) {
    el.focus();
    try {
      var len = (el.value || "").length;
      el.setSelectionRange(0, len);
    } catch (e) {}
    try {
      el.setRangeText(value, 0, (el.value || "").length, "end");
    } catch (e1) {
      try {
        var proto = window.HTMLTextAreaElement && window.HTMLTextAreaElement.prototype;
        var desc = proto && Object.getOwnPropertyDescriptor(proto, "value");
        if (desc && desc.set) desc.set.call(el, value);
        else el.value = value;
      } catch (e2) {
        el.value = value;
      }
    }
    try {
      el.dispatchEvent(
        new InputEvent("input", {
          bubbles: true,
          cancelable: true,
          data: value,
          inputType: "insertFromPaste",
        })
      );
    } catch (e3) {
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
    el.dispatchEvent(new Event("change", { bubbles: true }));
    try {
      el.setSelectionRange((el.value || "").length, (el.value || "").length);
    } catch (e4) {}
  }

  function writeEditable(el, value) {
    el.focus();
    try {
      document.execCommand("selectAll", false, null);
      document.execCommand("insertText", false, value);
    } catch (e) {
      el.textContent = value;
      el.dispatchEvent(
        new InputEvent("input", { bubbles: true, data: value, inputType: "insertText" })
      );
    }
  }

  function score(el) {
    var text = (
      (el.getAttribute("placeholder") || "") +
      " " +
      (el.getAttribute("aria-label") || "") +
      " " +
      (el.id || "") +
      " " +
      (el.className || "")
    ).toLowerCase();
    var points = 0;
    if (/what would you like to imagine|imagine|prompt|describe/.test(text)) points += 14;
    if (el.id === "desktop_input_bar") points += 20;
    if (el.tagName === "TEXTAREA") points += 4;
    if (el.isContentEditable) points += 3;
    var rect = el.getBoundingClientRect();
    points += Math.min(6, Math.floor(rect.width / 120));
    // Prefer the top Create composer (near top of viewport).
    if (rect.top >= 0 && rect.top < 220) points += 8;
    return points;
  }

  var candidates = [];
  var nodes = document.querySelectorAll(
    "#desktop_input_bar, textarea, [contenteditable='true'], [role='textbox']"
  );
  for (var i = 0; i < nodes.length; i++) {
    var el = nodes[i];
    if (!visible(el)) continue;
    candidates.push(el);
  }
  candidates.sort(function (a, b) {
    return score(b) - score(a);
  });

  var box = candidates[0];
  if (!box) {
    return JSON.stringify({
      ok: false,
      message: "Could not find the Midjourney Imagine bar. Open midjourney.com/imagine, then Send again.",
    });
  }

  pause(180, 420);
  box.focus();
  pause(90, 210);
  var isPlain = box.tagName === "TEXTAREA" || box.tagName === "INPUT";
  if (isPlain) writeReactTextarea(box, promptText);
  else writeEditable(box, promptText);
  pause(200, 480);

  var current = box.value || box.innerText || box.textContent || "";
  var filled = current.indexOf(promptText.slice(0, 24)) !== -1;
  return JSON.stringify({
    ok: filled,
    humanized: enabled,
    method: isPlain ? "setRangeText" : "execCommand",
    page: path() || "create",
    message: filled
      ? "Prompt loaded into Midjourney Create (React-aware)."
      : "Found the Imagine bar but Midjourney blocked the fill. Paste with ⌘V.",
    length: promptText.length,
    valueLength: current.length,
  });
})();

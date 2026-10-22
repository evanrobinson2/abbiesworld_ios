(function () {
  var promptText = window.__ABBIE_MJ_PROMPT__ || "";
  if (!promptText) return JSON.stringify({ ok: false, message: "empty_prompt" });

  function visible(el) {
    if (!el) return false;
    var rect = el.getBoundingClientRect();
    if (rect.width < 40 || rect.height < 18) return false;
    var style = window.getComputedStyle(el);
    return style.visibility !== "hidden" && style.display !== "none" && style.opacity !== "0";
  }

  function setNativeValue(el, value) {
    var proto = window.HTMLTextAreaElement && window.HTMLTextAreaElement.prototype;
    var desc = proto && Object.getOwnPropertyDescriptor(proto, "value");
    if (desc && desc.set) desc.set.call(el, value);
    else el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function setEditable(el, value) {
    el.focus();
    try {
      document.execCommand("selectAll", false, null);
      document.execCommand("insertText", false, value);
    } catch (e) {}
    if ((el.innerText || el.textContent || "").trim() !== value.trim()) {
      el.textContent = value;
      el.dispatchEvent(new InputEvent("input", { bubbles: true, data: value, inputType: "insertText" }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
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
    if (/imagine|prompt|what will you|describe|create/.test(text)) points += 8;
    if (el.id === "desktop_input_bar") points += 12;
    if (el.tagName === "TEXTAREA") points += 4;
    if (el.isContentEditable) points += 3;
    var rect = el.getBoundingClientRect();
    points += Math.min(6, Math.floor(rect.width / 120));
    // Prefer the bottom create bar over chat/search fields.
    points += Math.max(0, 4 - Math.floor((window.innerHeight - rect.bottom) / 80));
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

  box.focus();
  if (box.tagName === "TEXTAREA" || box.tagName === "INPUT") {
    setNativeValue(box, promptText);
    try {
      box.setSelectionRange(promptText.length, promptText.length);
    } catch (e) {}
  } else {
    setEditable(box, promptText);
  }

  var filled =
    (box.value || box.innerText || box.textContent || "").indexOf(promptText.slice(0, 24)) !== -1;
  return JSON.stringify({
    ok: filled,
    message: filled
      ? "Prompt filled in Midjourney. Review and press Create when ready."
      : "Found the Imagine bar but Midjourney blocked the fill. Paste with ⌘V.",
    length: promptText.length,
  });
})();

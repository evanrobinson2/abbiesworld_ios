/**
 * Shared Create-page gate. Midjourney's Personalize (and other) pages also host
 * #desktop_input_bar — never treat those as Imagine/Create.
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

  function blockedPath(p) {
    return (
      p.indexOf("/personalize") !== -1 ||
      p.indexOf("/organize") !== -1 ||
      p.indexOf("/explore") !== -1 ||
      p.indexOf("/moodboards") !== -1 ||
      p.indexOf("/style-creator") !== -1 ||
      p.indexOf("/tasks") !== -1 ||
      p.indexOf("/editor") !== -1 ||
      p.indexOf("/help") !== -1
    );
  }

  function createNavActive() {
    var link = document.querySelector('a[href="/imagine"], a[href*="/imagine"]');
    if (!link) return false;
    var cls = String(link.className || "");
    // Create nav uses splash accent when active.
    return /text-splash|bg-splash/.test(cls);
  }

  var p = path();
  var t = title();
  if (blockedPath(p) || t.indexOf("personalize") !== -1) {
    return {
      ok: false,
      code: "wrong_page",
      page: p || t,
      message:
        "Midjourney tab is not Create (/imagine). Open Create, then retry — Personalize has a lookalike prompt bar.",
    };
  }
  if (p.indexOf("/imagine") === -1 && t.indexOf("create") === -1 && !createNavActive()) {
    return {
      ok: false,
      code: "wrong_page",
      page: p || t,
      message: "Need midjourney.com/imagine (Create). Current tab is not Create.",
    };
  }
  return { ok: true, page: p || "create" };
})();

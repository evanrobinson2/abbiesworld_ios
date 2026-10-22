// Midjourney helpers, run inside a signed-in midjourney.com tab (Claude in
// Chrome's javascript_tool, or the DevTools console). Paste the whole file once,
// then call the functions on window.mj. One job at a time, human pace.
//
//   await mj.imagine("prompt ... --ar 16:9 --style raw")   // returns new job id
//   (on /jobs/<jobId>?index=3) await mj.upscale("Subtle")   // clicks Upscale
//   await mj.download(upscaleJobId, 0, "name.png")          // saves to ~/Downloads
//
// Image URLs are https://cdn.midjourney.com/<jobId>/0_<index>.png. The CDN
// refuses curl (Cloudflare 403) but serves the page's own fetch, so downloads
// go through a blob link in the tab.

(() => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const jitter = (ms) => sleep(ms + Math.random() * ms * 0.5);

  // Job ids currently rendered on the page, newest first.
  const jobIds = () => [
    ...new Set(
      [...document.querySelectorAll("img")]
        .map((i) => i.src)
        .filter((s) => s.includes("cdn.midjourney.com/"))
        .map((s) => s.split("/")[3])
    ),
  ];

  const busy = () => /\d+% Complete|Starting|Submitting/i.test(document.body.innerText);

  // Wait until a job id we have not seen before appears and nothing is rendering.
  async function waitForNewJob(before, timeoutMs = 300000) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      await jitter(5000);
      const fresh = jobIds().filter((id) => !before.includes(id));
      if (fresh.length && !busy()) return fresh[0];
    }
    throw new Error("timed out waiting for Midjourney job");
  }

  async function imagine(prompt) {
    if (!location.pathname.startsWith("/imagine")) throw new Error("open /imagine first");
    const before = jobIds();
    const box = document.querySelector("textarea");
    box.focus();
    // React-controlled textarea: use the native setter so React sees the value.
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set.call(box, prompt);
    box.dispatchEvent(new Event("input", { bubbles: true }));
    await jitter(800);
    box.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, bubbles: true }));
    return waitForNewJob(before);
  }

  // Run on a job page (/jobs/<jobId>?index=<n>). mode: "Subtle" or "Creative".
  // Afterwards navigate back to /imagine, paste this file again, and call
  // mj.waitForNewJob([...known ids]) to get the upscale's job id.
  async function upscale(mode = "Subtle", dryRun = false) {
    if (!location.pathname.startsWith("/jobs/")) throw new Error("open the job page first");
    // Creation actions render as Vary [Subtle, Strong], Upscale [Subtle, Creative].
    // "Creative" is unique; the Upscale "Subtle" is the button just before it.
    const buttons = [...document.querySelectorAll("button")];
    const creative = buttons.findIndex((b) => b.textContent.trim() === "Creative");
    const btn = mode === "Creative" ? buttons[creative] : buttons[creative - 1];
    if (creative < 0 || btn.textContent.trim() !== mode) throw new Error(`no Upscale ${mode} button on the job page`);
    if (!dryRun) btn.click();
    return { clicked: !dryRun, button: btn.textContent.trim() };
  }

  async function download(jobId, index, filename) {
    const url = `https://cdn.midjourney.com/${jobId}/0_${index}.png`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${url} -> ${r.status}`);
    const blob = await r.blob();
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(blob),
      download: filename || `mj_${jobId}_0_${index}.png`,
    });
    document.body.appendChild(a);
    a.click();
    a.remove();
    return { url, bytes: blob.size, file: a.download };
  }

  window.mj = { jobIds, busy, waitForNewJob, imagine, upscale, download };
  return Object.keys(window.mj);
})();

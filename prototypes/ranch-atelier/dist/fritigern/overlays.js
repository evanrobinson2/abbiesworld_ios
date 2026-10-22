// Presentation styles over the same scene. The scene doesn't change; only the framing around it does.
//   clean     nothing over the picture
//   cinema    2.39:1 letterbox, vignette, title and end cards
//   storybook a narrator reads to a child; big gentle subtitles
//   hud       video-game overlay: objective, nameplates, health, minimap, prompts, item pickup
//   telltale  episode card, speaker subtitles, a timed dialogue choice, "will remember that"
export const STYLES = ["clean", "cinema", "storybook", "hud", "telltale"];

const CARDS = {
  cinema: [[0.4, 5, "card", "MARCIANOPLE<small>The Danube frontier · 376</small>"], [38.5, 43, "end", "The helmet would go all the way to Rome."]],
  storybook: [
    [0.4, 5.4, "narr", "Long ago, a whole people waited outside the walls of a Roman town."],
    [5.6, 10.8, "narr", "Alaric was six. He had watched the gate all afternoon."],
    [11.2, 16.4, "narr", "Then the gate opened, and he saw a red cloak."],
    [16.8, 24.6, "narr", "It was his father. But he was walking slowly. Too slowly."],
    [25, 30.8, "narr", "Something gold swung from his hand, catching the last of the sun."],
    [31.2, 36.8, "narr", "“Are you hurt?” Alaric whispered."],
    [37, 43, "narr", "“Not where it matters,” said Fritigern. “Here. Keep this safe for me.”"],
  ],
  telltale: [
    [0.4, 5, "episode", "EPISODE ONE<small>The Gate</small>"],
    [12, 15.5, "line", "ALARIC|The gate… it's opening!"],
    [18.5, 22.5, "line", "ALARIC|Papa? Papa!"],
    [23.5, 28, "line", "WULFILA|Easy. Lean on me. We're nearly there."],
    [35.2, 37.4, "line", "ALARIC|Are you hurt?"],
    [37.6, 41, "line", "FRITIGERN|Not where it matters. Here. Hold this for me."],
    [39.5, 43, "remember", "Fritigern will remember that."],
  ],
  hud: [
    [0.4, 6, "toast", "NEW OBJECTIVE|Watch the gate for Father"],
    [11, 15, "toast", "OBJECTIVE UPDATED|Father has left the town"],
    [28, 33, "prompt", "Run to him"],
    [37.5, 42, "item", "Officer's ridge helmet|Berkasovo type · gilded · glass gems|LEGENDARY"],
  ],
};
const COLORS = { ALARIC: "#9fc3ef", FRITIGERN: "#f08a6a", WULFILA: "#c9d58a" };
const CHOICES = ["Father!", "Are you hurt?", "What happened in there?", "[Say nothing]"];
const CHOICE_T = [31, 35], PICK = 1;

export function initOverlay(root, style) {
  root.innerHTML = `
    <div class="ov-bars"><i></i><i></i></div><div class="ov-vignette"></div>
    <div class="ov-card"></div><div class="ov-narr"></div><div class="ov-line"></div>
    <div class="ov-choices"></div><div class="ov-remember"></div>
    <div class="ov-objective"><small>OBJECTIVE</small><span></span></div><div class="ov-toast"></div><div class="ov-prompt"><kbd>E</kbd><span></span></div>
    <div class="ov-item"></div><canvas class="ov-map" width="180" height="180"></canvas>
    <div class="ov-tag" data-who="f"><b>FRITIGERN</b><small>Reiks of the Tervingi</small><meter min="0" max="1" low="0.35" value="0.3"></meter></div>
    <div class="ov-tag" data-who="a"><b>ALARIC</b><small>Son</small></div>`;
  const $ = q => root.querySelector(q);
  const map = $(".ov-map").getContext("2d");
  let current = style;
  const set = st => { current = st; root.dataset.style = st; };
  set(style);
  const active = (t, kind) => (CARDS[current] || []).filter(([a, b, k]) => k === kind && t >= a && t < b);
  const fade = (t, a, b) => Math.min(1, (t - a) / 0.5, (b - t) / 0.5);
  function show(el, items, t, html) {
    if (!items.length) { el.style.opacity = 0; return; }
    const [a, b, , text] = items[0];
    el.innerHTML = html ? html(text) : text; el.style.opacity = Math.max(0, fade(t, a, b));
  }
  return {
    set, get style() { return current; },
    update(t, info) {
      show($(".ov-card"), [...active(t, "card"), ...active(t, "end"), ...active(t, "episode")], t);
      $(".ov-card").dataset.kind = [...active(t, "card"), ...active(t, "end"), ...active(t, "episode")][0]?.[2] || "";
      show($(".ov-narr"), active(t, "narr"), t);
      show($(".ov-line"), active(t, "line"), t, x => { const [who, say] = x.split("|"); return `<b style="color:${COLORS[who]}">${who}</b>${say}`; });
      show($(".ov-remember"), active(t, "remember"), t, x => `<i>✦</i>${x}`);
      // telltale: timed choice with a shrinking bar, then the picked line stays lit
      const ch = $(".ov-choices");
      if (current === "telltale" && t >= CHOICE_T[0] && t < CHOICE_T[1] + 0.4) {
        const k = THREE_clamp((t - CHOICE_T[0]) / (CHOICE_T[1] - CHOICE_T[0] - 1.2));
        const picked = t > CHOICE_T[1] - 1.2;
        ch.innerHTML = `<div class="ov-timer"><i style="transform:scaleX(${(1 - k).toFixed(3)})"></i></div>` +
          CHOICES.map((c, i) => `<span class="${picked ? (i === PICK ? "on" : "off") : ""}"><kbd>${"QWER"[i]}</kbd>${c}</span>`).join("");
        ch.style.opacity = Math.min(1, (t - CHOICE_T[0]) / 0.4, (CHOICE_T[1] + 0.4 - t) / 0.4);
      } else ch.style.opacity = 0;
      // hud
      if (current === "hud") {
        $(".ov-objective span").textContent = t < 11 ? "Watch the gate for Father" : t < 34 ? "Reach Father" : "Take the helmet";
        show($(".ov-toast"), active(t, "toast"), t, x => { const [h, b] = x.split("|"); return `<small>${h}</small>${b}`; });
        show($(".ov-prompt span"), active(t, "prompt"), t); $(".ov-prompt").style.opacity = $(".ov-prompt span").style.opacity;
        show($(".ov-item"), active(t, "item"), t, x => { const [n, d, r] = x.split("|"); return `<div class="ic"></div><div><small>${r}</small><b>${n}</b><span>${d}</span></div>`; });
        for (const tag of root.querySelectorAll(".ov-tag")) {
          const p = tag.dataset.who === "f" ? info.fHead : info.aHead, vis = p && p.z < 1 && (tag.dataset.who === "f" ? info.fVisible : info.aVisible);
          tag.style.opacity = vis ? 1 : 0;
          if (p) tag.style.transform = `translate(${(p.x * 0.5 + 0.5) * root.clientWidth}px, ${(-p.y * 0.5 + 0.5) * root.clientHeight}px) translate(-50%, -110%)`;
        }
        drawMap(map, info);
      } else root.querySelectorAll(".ov-tag").forEach(x => x.style.opacity = 0);
    },
  };
}
const THREE_clamp = v => Math.max(0, Math.min(1, v));

function drawMap(c, info) {
  const W = 180, S = 3.2, cx = W / 2, cy = W / 2, o = info.aPos;
  const P = (x, z) => [cx + (x - o.x) * S, cy + (z - o.z) * S];
  c.clearRect(0, 0, W, W);
  c.save(); c.beginPath(); c.arc(cx, cy, W / 2 - 2, 0, Math.PI * 2); c.clip();
  c.fillStyle = "rgba(24,22,18,.72)"; c.fillRect(0, 0, W, W);
  c.strokeStyle = "rgba(200,170,120,.55)"; c.lineWidth = 6; c.beginPath();
  info.path.forEach(([x, z], i) => { const [a, b] = P(x, z); i ? c.lineTo(a, b) : c.moveTo(a, b); }); c.stroke();
  const [gx, gz] = P(info.gate.x, info.gate.z); c.fillStyle = "#c9c0ad"; c.fillRect(0, gz - 4, W, 6); c.fillStyle = info.gateOpen > 0.5 ? "#ffcf7a" : "#6b5a48"; c.fillRect(gx - 6, gz - 5, 12, 8);
  // Alaric's view cone, green when he can see his father
  const [ax, az] = P(o.x, o.z); c.fillStyle = info.sees ? "rgba(110,210,140,.28)" : "rgba(220,90,70,.25)";
  c.beginPath(); c.moveTo(ax, az); c.arc(ax, az, 70, info.look - 0.45, info.look + 0.45); c.closePath(); c.fill();
  c.fillStyle = "#9fc3ef"; c.beginPath(); c.arc(ax, az, 4.5, 0, 7); c.fill();
  if (info.fVisible) { const [fx, fz] = P(info.fPos.x, info.fPos.z); c.fillStyle = "#f08a6a"; c.beginPath(); c.arc(fx, fz, 4.5, 0, 7); c.fill(); }
  c.restore();
  c.strokeStyle = "rgba(240,225,190,.7)"; c.lineWidth = 2; c.beginPath(); c.arc(cx, cy, W / 2 - 2, 0, Math.PI * 2); c.stroke();
  c.fillStyle = "rgba(240,225,190,.9)"; c.font = "600 11px system-ui, sans-serif"; c.textAlign = "center"; c.fillText("N", cx, 14);
}

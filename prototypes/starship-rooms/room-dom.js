/**
 * HTML/CSS room kit — builds DOM structure; all looks come from ship.css.
 */
import { ROOMS, findRoom } from "./rooms.js";

function stars(n = 18) {
  let html = "";
  for (let i = 0; i < n; i++) {
    const left = ((i * 37) % 100);
    const top = 8 + ((i * 53) % 70);
    const delay = ((i * 0.17) % 2).toFixed(2);
    html += `<span class="star" style="left:${left}%;top:${top}%;animation-delay:${delay}s"></span>`;
  }
  return html;
}

function pipContent(kind) {
  if (kind === "directory") {
    return `<div class="pip-title">DIRECTORY</div><div class="pip-lines"><span>← SCI</span><span>CREW →</span><span style="color:var(--accent)">DECK SPINE</span></div>`;
  }
  if (kind === "schedule") {
    return `<div class="pip-title">CREW</div><div class="pip-sched"><i></i><i></i><i></i></div>`;
  }
  if (kind === "sky") {
    return `<div class="pip-title">SKY</div><div class="pip-bars"><span></span><span></span><span></span><span></span><span></span><span></span></div>`;
  }
  const title =
    { tactical: "APPROACH", spectrum: "SPECTRUM", telemetry: "TELEMETRY" }[kind] ||
    "PIP";
  return `<div class="pip-title">${title}</div><div class="pip-bars"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>`;
}

function heroHtml(room) {
  switch (room.hero) {
    case "holomap":
      return `<div class="hero hero--holomap"><div class="holo-glow"></div><div class="holo-ring"></div><div class="holo-ring holo-ring--2"></div><div class="holo-disc"></div><div class="holo-pedestal"></div></div>`;
    case "analyzer":
      return `<div class="hero hero--analyzer"><div class="analyzer-body"></div><div class="analyzer-screen"></div><div class="specimen"></div></div><div class="cabinet"></div>`;
    case "berth":
      return `<div class="hero hero--berth"><div class="berth"><div class="berth-pillow"></div></div></div><div class="lamp"></div>`;
    case "core":
      return `<div class="hero hero--core"><div class="core-column"></div><div class="core-ring"></div><div class="core-ring core-ring--2"></div><div class="core-ring core-ring--3"></div></div><div class="catwalk"></div>`;
    case "spine":
      return `<div class="hero hero--spine-hatch"></div>`;
    case "gallery":
      return `<div class="hero hero--ledge"></div><div class="scope"></div>`;
    default:
      return "";
  }
}

function apertureHtml(room) {
  if (room.aperture === "none") return "";
  const cls = `aperture aperture--${room.aperture}`;
  return `<div class="${cls}"><div class="aperture-sky"></div><div class="aperture-glass"></div><div class="aperture-spill"></div></div>`;
}

function shaftHtml(room) {
  if (room.hero === "core") return `<div class="shaft shaft--core"></div>`;
  if (room.aperture === "gallery") return `<div class="shaft shaft--gallery"></div>`;
  if (room.aperture === "port" || room.aperture === "slit")
    return `<div class="shaft shaft--port"></div>`;
  return "";
}

function pipHtml(room) {
  if (room.pip === "telemetry") {
    return `
      <div class="pip pip--tl pip--sm"><div class="pip-screen">${pipContent("telemetry")}<div class="pip-scan"></div><div class="pip-sweep"></div></div></div>
      <div class="pip pip--tr pip--sm"><div class="pip-screen">${pipContent("telemetry")}<div class="pip-scan"></div><div class="pip-sweep"></div></div></div>`;
  }
  const pos = room.pip === "directory" ? "pip--mid pip--md" : "pip--tl";
  return `<div class="pip ${pos}"><div class="pip-screen">${pipContent(room.pip)}<div class="pip-scan"></div><div class="pip-sweep"></div></div></div>`;
}

export function roomHtml(room, { active = false, showHud = true } = {}) {
  const wide = room.format === "tile-2x";
  const mods = wide ? 10 : 5;
  const modules = Array.from({ length: mods }, () => `<div class="module"></div>`).join("");
  const leaf =
    room.profile === "crew" || room.profile === "obs"
      ? `<div class="fg-leaf"></div>`
      : "";
  const planet = room.hero === "gallery" ? `<div class="planet"></div>` : "";

  return `
  <article class="room room--${room.district}${wide ? " room--wide" : ""}${active ? " is-active" : ""}" data-room="${room.id}" style="--accent: var(--${room.district === "eng" ? "amber" : room.district === "crew" ? "life" : room.district === "obs" ? "guide" : room.district === "conn" ? "trim" : "guide"})">
    <div class="layer layer--vista">
      <div class="vista">${stars()}${planet}</div>
    </div>
    <div class="layer layer--shell">
      <div class="ceil-rail"></div>
      <div class="shell-wall"><div class="modules">${modules}</div></div>
      <div class="floor"><div class="floor-strip"></div></div>
      <div class="handrail"></div>
      <div class="door door--left"><div class="door-opening"></div><div class="door-lip door-lip--l"></div><div class="door-lip door-lip--r"></div><div class="door-threshold"></div></div>
      <div class="door door--right"><div class="door-opening"></div><div class="door-lip door-lip--l"></div><div class="door-lip door-lip--r"></div><div class="door-threshold"></div></div>
    </div>
    <div class="layer layer--aperture">${apertureHtml(room)}</div>
    <div class="layer layer--hero">${heroHtml(room)}</div>
    <div class="layer layer--pip">${pipHtml(room)}</div>
    <div class="layer layer--signage">
      <div class="signage"><div class="code">DECK ${room.deck} · ${room.id}</div><div class="name">${room.name}</div></div>
    </div>
    <div class="layer layer--actor">
      <div class="floor-spec"></div>
      <div class="actor">
        <div class="actor-shadow"></div>
        <div class="actor-head"><div class="actor-visor"></div></div>
        <div class="actor-body"><div class="actor-stripe"></div></div>
        <div class="actor-leg actor-leg--l"></div>
        <div class="actor-leg actor-leg--r"></div>
      </div>
    </div>
    <div class="layer layer--fg"><div class="fg-cable"></div>${leaf}</div>
    <div class="layer layer--light">${shaftHtml(room)}</div>
    <div class="vignette"></div>
    ${
      showHud
        ? `<div class="hud-deck">DECK ${room.deck} · ${room.id}</div><div class="hud-purpose">${room.purpose}</div>`
        : ""
    }
  </article>`;
}

export function mountRoom(el, roomId, opts) {
  const room = findRoom(roomId);
  el.innerHTML = roomHtml(room, { active: true, ...opts });
  return room;
}

export { ROOMS, findRoom };

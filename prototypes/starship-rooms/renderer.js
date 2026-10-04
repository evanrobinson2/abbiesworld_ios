/**
 * Composed starship room renderer.
 * Layers: vista → shell → aperture → props → floor light → actor → fg → bloom → HUD chrome.
 */
import { PAL, TILE_H, TILE_W, roomWidth, floorY } from "./rooms.js";

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function profileAccent(profile) {
  switch (profile) {
    case "cmd":
      return PAL.guide;
    case "sci":
      return PAL.guide;
    case "crew":
      return PAL.life;
    case "eng":
      return PAL.amber;
    case "obs":
      return "#9ec8ff";
    default:
      return PAL.trimLite;
  }
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext("2d");
  const bloom = document.createElement("canvas");
  const bctx = bloom.getContext("2d");
  let dpr = 1;

  function resize(cssW, cssH) {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    bloom.width = Math.round(cssW * 0.5);
    bloom.height = Math.round(cssH * 0.5);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawVista(room, time, camX, viewW) {
    const w = roomWidth(room);
    const g = ctx.createLinearGradient(0, 0, 0, TILE_H);
    if (room.profile === "eng") {
      g.addColorStop(0, "#141018");
      g.addColorStop(1, "#0a080c");
    } else {
      g.addColorStop(0, "#12182a");
      g.addColorStop(0.55, "#0d121c");
      g.addColorStop(1, "#090b10");
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, TILE_H);

    // Parallax starfield
    const parallax = camX * 0.12;
    ctx.save();
    ctx.beginPath();
    // clip isn't needed for full vista under shell apertures; stars are subtle
    for (let i = 0; i < 80; i++) {
      const sx = ((i * 97 + 13) % w) - parallax * (0.4 + (i % 5) * 0.08);
      const sy = ((i * 53 + 29) % (TILE_H * 0.7)) + 20;
      const tw = 0.4 + (i % 3) * 0.35;
      const pulse = 0.45 + Math.sin(time * 1.5 + i) * 0.25;
      ctx.fillStyle = `rgba(230, 235, 255, ${pulse})`;
      ctx.fillRect(sx, sy, tw, tw);
    }
    // Soft nebula wash for obs/cmd
    if (room.profile === "obs" || room.profile === "cmd") {
      const neb = ctx.createRadialGradient(
        w * 0.65 - parallax,
        TILE_H * 0.28,
        10,
        w * 0.65 - parallax,
        TILE_H * 0.28,
        220
      );
      neb.addColorStop(0, "rgba(120, 90, 180, 0.22)");
      neb.addColorStop(1, "rgba(120, 90, 180, 0)");
      ctx.fillStyle = neb;
      ctx.fillRect(0, 0, w, TILE_H * 0.7);
    }
    // Planet limb for gallery
    if (room.hero === "gallery") {
      const px = w * 0.72 - parallax * 0.2;
      const py = TILE_H * 0.55;
      const planet = ctx.createRadialGradient(px - 40, py - 30, 20, px, py, 160);
      planet.addColorStop(0, "rgba(110, 160, 200, 0.55)");
      planet.addColorStop(0.55, "rgba(40, 70, 110, 0.35)");
      planet.addColorStop(1, "rgba(10, 14, 24, 0)");
      ctx.fillStyle = planet;
      ctx.beginPath();
      ctx.arc(px, py, 160, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawShell(room) {
    const w = roomWidth(room);
    const fy = floorY();
    const accent = profileAccent(room.profile);

    // Back wall modules
    const wall = ctx.createLinearGradient(0, 40, 0, fy);
    wall.addColorStop(0, "#d8c9b6");
    wall.addColorStop(0.5, PAL.hull);
    wall.addColorStop(1, "#b5a492");
    ctx.fillStyle = wall;
    roundRect(ctx, 18, 36, w - 36, fy - 28, 22);
    ctx.fill();

    // Module grid
    const cols = room.format === "tile-2x" ? 10 : 5;
    const modW = (w - 80) / cols;
    for (let i = 0; i < cols; i++) {
      const x = 40 + i * modW;
      ctx.strokeStyle = "rgba(58, 52, 46, 0.12)";
      ctx.lineWidth = 2;
      roundRect(ctx, x + 6, 54, modW - 12, fy - 90, 12);
      ctx.stroke();
      // upper cable tray tick
      ctx.fillStyle = "rgba(58, 52, 46, 0.1)";
      ctx.fillRect(x + 14, 62, modW - 28, 6);
    }

    // Ceiling rail
    ctx.fillStyle = PAL.hullDeep;
    roundRect(ctx, 24, 28, w - 48, 18, 8);
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.55;
    ctx.fillRect(40, 34, w - 80, 4);
    ctx.globalAlpha = 1;

    // Floor plane
    const floor = ctx.createLinearGradient(0, fy, 0, TILE_H);
    floor.addColorStop(0, "#6e645a");
    floor.addColorStop(0.35, "#4f4840");
    floor.addColorStop(1, "#2c2824");
    ctx.fillStyle = floor;
    ctx.fillRect(0, fy, w, TILE_H - fy);

    // Floor guidance strip
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.35;
    ctx.fillRect(28, fy + 10, w - 56, 5);
    ctx.globalAlpha = 1;

    // Floor edge lip
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(0, fy, w, 3);

    // Left / right door frames
    drawDoor(18, fy, accent, true);
    drawDoor(w - 18 - 70, fy, accent, false);

    // Mid handrail whisper
    ctx.strokeStyle = "rgba(58,52,46,0.25)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(100, fy - 48);
    ctx.lineTo(w - 100, fy - 48);
    ctx.stroke();
  }

  function drawDoor(x, fy, accent, left) {
    const dw = 70;
    const dh = TILE_H * 0.58;
    const dy = fy - dh;
    // Frame
    ctx.fillStyle = PAL.hullDark;
    roundRect(ctx, x, dy, dw, dh + 8, 10);
    ctx.fill();
    // Inner opening (vista peek)
    const inset = 10;
    ctx.fillStyle = "#0a0d14";
    roundRect(ctx, x + inset, dy + inset, dw - inset * 2, dh - inset * 2, 6);
    ctx.fill();
    // Accent lip
    ctx.fillStyle = accent;
    ctx.fillRect(x + 4, dy + 8, 4, dh - 10);
    ctx.fillRect(x + dw - 8, dy + 8, 4, dh - 10);
    // Door threshold light
    const glow = ctx.createLinearGradient(x, fy - 8, x + dw, fy - 8);
    glow.addColorStop(0, "rgba(0,0,0,0)");
    glow.addColorStop(0.5, accent);
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = glow;
    ctx.fillRect(x, fy - 6, dw, 6);
    ctx.globalAlpha = 1;
    void left;
  }

  function drawAperture(room, time) {
    const w = roomWidth(room);
    if (room.aperture === "none") return;

    let ax, ay, aw, ah;
    if (room.aperture === "gallery") {
      ax = w * 0.22;
      ay = 72;
      aw = w * 0.56;
      ah = TILE_H * 0.48;
    } else if (room.aperture === "slit") {
      ax = w * 0.72;
      ay = 90;
      aw = w * 0.12;
      ah = TILE_H * 0.28;
    } else {
      // port
      ax = w * 0.7;
      ay = 100;
      aw = w * 0.14;
      ah = TILE_H * 0.22;
    }

    // Punch hole — reveal vista already drawn underneath by darkening around?
    // We draw glass frame and clear a rounded hole using destination-out on a temp approach:
    // Simpler: redraw vista into clipped aperture, then glass.
    ctx.save();
    roundRect(ctx, ax, ay, aw, ah, room.aperture === "gallery" ? 18 : 40);
    ctx.clip();
    // Local star shimmer inside glass
    ctx.fillStyle = "#0a1020";
    ctx.fillRect(ax - 2, ay - 2, aw + 4, ah + 4);
    for (let i = 0; i < 40; i++) {
      const sx = ax + ((i * 47) % aw);
      const sy = ay + ((i * 31) % ah);
      ctx.fillStyle = `rgba(220,230,255,${0.3 + Math.sin(time * 2 + i) * 0.2})`;
      ctx.fillRect(sx, sy, 1.5, 1.5);
    }
    if (room.aperture === "gallery") {
      const px = ax + aw * 0.7;
      const py = ay + ah * 0.85;
      const planet = ctx.createRadialGradient(px, py, 10, px, py, ah * 0.9);
      planet.addColorStop(0, "rgba(150, 190, 230, 0.7)");
      planet.addColorStop(0.5, "rgba(60, 100, 150, 0.45)");
      planet.addColorStop(1, "rgba(10, 16, 28, 0)");
      ctx.fillStyle = planet;
      ctx.beginPath();
      ctx.arc(px, py, ah * 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
    // Glass sheen
    const sheen = ctx.createLinearGradient(ax, ay, ax + aw, ay + ah);
    sheen.addColorStop(0, "rgba(180,220,255,0.16)");
    sheen.addColorStop(0.45, "rgba(180,220,255,0.02)");
    sheen.addColorStop(1, "rgba(40,60,90,0.12)");
    ctx.fillStyle = sheen;
    ctx.fillRect(ax, ay, aw, ah);
    ctx.restore();

    // Frame
    ctx.strokeStyle = PAL.hullDark;
    ctx.lineWidth = 6;
    roundRect(ctx, ax, ay, aw, ah, room.aperture === "gallery" ? 18 : 40);
    ctx.stroke();
    ctx.strokeStyle = profileAccent(room.profile);
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 2;
    roundRect(ctx, ax + 5, ay + 5, aw - 10, ah - 10, room.aperture === "gallery" ? 14 : 34);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Soft light spill from aperture onto wall/floor
    const spill = ctx.createRadialGradient(
      ax + aw / 2,
      ay + ah,
      10,
      ax + aw / 2,
      ay + ah + 40,
      160
    );
    spill.addColorStop(0, "rgba(180, 210, 255, 0.18)");
    spill.addColorStop(1, "rgba(180, 210, 255, 0)");
    ctx.fillStyle = spill;
    ctx.fillRect(ax - 80, ay, aw + 160, ah + 200);
  }

  function drawHero(room, time) {
    const w = roomWidth(room);
    const fy = floorY();
    const accent = profileAccent(room.profile);

    switch (room.hero) {
      case "holomap": {
        const cx = w * 0.5;
        const cy = fy - 70;
        // Pedestal
        ctx.fillStyle = PAL.hullDark;
        roundRect(ctx, cx - 70, cy + 30, 140, 28, 8);
        ctx.fill();
        // Table disc
        ctx.fillStyle = "#2a3038";
        ctx.beginPath();
        ctx.ellipse(cx, cy, 90, 28, 0, 0, Math.PI * 2);
        ctx.fill();
        // Holo glow
        const hg = ctx.createRadialGradient(cx, cy, 4, cx, cy, 100);
        hg.addColorStop(0, "rgba(94, 200, 216, 0.55)");
        hg.addColorStop(1, "rgba(94, 200, 216, 0)");
        ctx.fillStyle = hg;
        ctx.beginPath();
        ctx.arc(cx, cy - 10, 100, 0, Math.PI * 2);
        ctx.fill();
        // Floating ring
        ctx.strokeStyle = accent;
        ctx.globalAlpha = 0.7 + Math.sin(time * 2) * 0.2;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy - 18, 40 + Math.sin(time) * 4, 12, time * 0.4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(cx, cy - 30, 22, 8, -time * 0.6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        break;
      }
      case "analyzer": {
        const cx = w * 0.48;
        const cy = fy - 20;
        ctx.fillStyle = PAL.hullDark;
        roundRect(ctx, cx - 36, cy - 90, 72, 90, 10);
        ctx.fill();
        ctx.fillStyle = accent;
        ctx.globalAlpha = 0.8;
        roundRect(ctx, cx - 22, cy - 78, 44, 36, 8);
        ctx.fill();
        ctx.globalAlpha = 1;
        // Specimen ghost
        ctx.fillStyle = `rgba(180, 240, 255, ${0.35 + Math.sin(time * 3) * 0.15})`;
        ctx.beginPath();
        ctx.arc(cx, cy - 60, 10 + Math.sin(time * 2) * 2, 0, Math.PI * 2);
        ctx.fill();
        // Cabinet
        ctx.fillStyle = "rgba(40, 50, 60, 0.85)";
        roundRect(ctx, w * 0.72, fy - 160, 90, 150, 10);
        ctx.fill();
        ctx.strokeStyle = "rgba(160, 210, 230, 0.35)";
        ctx.stroke();
        break;
      }
      case "berth": {
        const x = w * 0.52;
        const y = fy - 70;
        ctx.fillStyle = "#d8a8b0";
        roundRect(ctx, x, y, 180, 55, 16);
        ctx.fill();
        ctx.fillStyle = "#f0d0d6";
        roundRect(ctx, x + 12, y + 8, 100, 20, 8);
        ctx.fill();
        // Soft lamp
        const lx = w * 0.78;
        const ly = fy - 140;
        ctx.fillStyle = PAL.trim;
        ctx.fillRect(lx, ly, 8, 90);
        const lamp = ctx.createRadialGradient(lx + 4, ly, 2, lx + 4, ly, 70);
        lamp.addColorStop(0, "rgba(255, 220, 180, 0.55)");
        lamp.addColorStop(1, "rgba(255, 220, 180, 0)");
        ctx.fillStyle = lamp;
        ctx.beginPath();
        ctx.arc(lx + 4, ly, 70, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "core": {
        const cx = w * 0.5;
        const top = 70;
        const bot = fy - 20;
        // Column
        const core = ctx.createLinearGradient(cx - 40, top, cx + 40, bot);
        core.addColorStop(0, "#3a2a18");
        core.addColorStop(0.5, "#e0a45a");
        core.addColorStop(1, "#3a2a18");
        ctx.fillStyle = core;
        roundRect(ctx, cx - 36, top, 72, bot - top, 20);
        ctx.fill();
        // Pulse rings
        for (let i = 0; i < 3; i++) {
          const t = (time * 0.7 + i * 0.33) % 1;
          ctx.strokeStyle = `rgba(224, 164, 90, ${1 - t})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(cx, top + 40 + t * (bot - top - 80), 50 + t * 30, 14 + t * 8, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        // Catwalk rail FG-ish mid
        ctx.strokeStyle = "rgba(200, 180, 150, 0.45)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(80, fy - 55);
        ctx.lineTo(w - 80, fy - 55);
        ctx.stroke();
        break;
      }
      case "spine": {
        // Rhythm of door lips already in shell; add utility hatch + directory niche
        ctx.fillStyle = PAL.hullDeep;
        roundRect(ctx, w * 0.3, fy - 120, 50, 70, 8);
        ctx.fill();
        ctx.fillStyle = accent;
        ctx.globalAlpha = 0.4;
        ctx.fillRect(w * 0.3 + 8, fy - 100, 34, 6);
        ctx.globalAlpha = 1;
        break;
      }
      case "gallery": {
        // Seating ledge under window
        ctx.fillStyle = PAL.hullDeep;
        roundRect(ctx, w * 0.28, fy - 42, w * 0.44, 28, 10);
        ctx.fill();
        // Scope
        ctx.fillStyle = "#2a3038";
        roundRect(ctx, w * 0.26, fy - 120, 24, 80, 6);
        ctx.fill();
        ctx.fillStyle = accent;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(w * 0.26 + 12, fy - 120, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        break;
      }
      default:
        break;
    }
  }

  function drawPip(room, time) {
    const w = roomWidth(room);
    const accent = profileAccent(room.profile);
    let x = 48;
    let y = 96;
    let pw = 150;
    let ph = 96;
    if (room.pip === "directory") {
      x = w * 0.5 - 70;
      y = 110;
      pw = 140;
      ph = 80;
    } else if (room.pip === "telemetry") {
      // two panels
      drawPipPanel(48, 120, 130, 90, accent, time, "TELEMETRY", room.pip);
      drawPipPanel(w - 48 - 130, 120, 130, 90, accent, time, "CORE", room.pip);
      return;
    } else if (room.pip === "sky") {
      x = 48;
      y = 140;
      pw = 140;
      ph = 88;
    } else if (room.pip === "schedule") {
      x = 52;
      y = 150;
      pw = 120;
      ph = 72;
    }

    const title =
      {
        tactical: "APPROACH",
        spectrum: "SPECTRUM",
        directory: "DIRECTORY",
        schedule: "CREW",
        sky: "SKY",
        telemetry: "TELEMETRY",
      }[room.pip] || "PIP";

    drawPipPanel(x, y, pw, ph, accent, time, title, room.pip);
  }

  function drawPipPanel(x, y, pw, ph, accent, time, title, kind) {
    // Bezel
    ctx.fillStyle = "#1c1814";
    roundRect(ctx, x - 6, y - 6, pw + 12, ph + 12, 10);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 2;
    roundRect(ctx, x - 6, y - 6, pw + 12, ph + 12, 10);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Screen
    ctx.fillStyle = "#071018";
    roundRect(ctx, x, y, pw, ph, 6);
    ctx.fill();

    ctx.save();
    roundRect(ctx, x, y, pw, ph, 6);
    ctx.clip();

    // Content
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.85;
    ctx.font = "600 11px 'IBM Plex Sans', sans-serif";
    ctx.fillText(title, x + 10, y + 18);

    if (kind === "spectrum" || kind === "tactical" || kind === "telemetry") {
      for (let i = 0; i < 8; i++) {
        const h =
          12 +
          Math.abs(Math.sin(time * 2 + i * 0.7)) * (ph * 0.45);
        ctx.fillStyle = i % 2 === 0 ? accent : PAL.amber;
        ctx.globalAlpha = 0.55;
        ctx.fillRect(x + 12 + i * ((pw - 24) / 8), y + ph - 12 - h, 8, h);
      }
    } else if (kind === "directory") {
      ctx.globalAlpha = 0.8;
      ctx.font = "12px 'IBM Plex Sans', sans-serif";
      ctx.fillStyle = PAL.cream;
      ctx.fillText("← SCI", x + 16, y + 40);
      ctx.fillText("CREW →", x + 16, y + 58);
      ctx.fillStyle = accent;
      ctx.fillText("DECK SPINE", x + 16, y + 76);
    } else if (kind === "schedule") {
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = PAL.life;
      ctx.fillRect(x + 14, y + 30, pw - 28, 8);
      ctx.fillStyle = PAL.cream;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(x + 14, y + 46, pw - 40, 8);
      ctx.fillRect(x + 14, y + 62, pw - 50, 8);
    } else if (kind === "sky") {
      for (let i = 0; i < 20; i++) {
        ctx.fillStyle = `rgba(200,220,255,${0.4 + Math.sin(time + i) * 0.2})`;
        ctx.fillRect(x + 10 + (i * 37) % (pw - 20), y + 28 + (i * 19) % (ph - 40), 2, 2);
      }
    }

    // Scanlines
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = "#000";
    for (let yy = y; yy < y + ph; yy += 3) {
      ctx.fillRect(x, yy, pw, 1);
    }
    // Sweep
    const sweep = ((time * 40) % (ph + 20)) - 10;
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = accent;
    ctx.fillRect(x, y + sweep, pw, 6);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawSignage(room) {
    const w = roomWidth(room);
    const accent = profileAccent(room.profile);
    const label = `DECK ${room.deck} · ${room.id}`;
    const x = w - 210;
    const y = 78;

    ctx.fillStyle = "rgba(26, 22, 18, 0.72)";
    roundRect(ctx, x, y, 170, 44, 8);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.5;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = accent;
    ctx.font = "600 11px 'IBM Plex Sans', sans-serif";
    ctx.fillText(label, x + 12, y + 18);
    ctx.fillStyle = PAL.cream;
    ctx.font = "500 13px 'IBM Plex Sans', sans-serif";
    ctx.fillText(room.name, x + 12, y + 36);
  }

  function drawFloorSpecular(room, actorX) {
    const fy = floorY();
    const accent = profileAccent(room.profile);
    const g = ctx.createRadialGradient(actorX, fy + 8, 4, actorX, fy + 8, 90);
    g.addColorStop(0, "rgba(255,255,255,0.16)");
    g.addColorStop(0.4, `${accent}22`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(actorX, fy + 10, 90, 14, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawActor(x, fy, facing, walkPhase) {
    const bob = Math.sin(walkPhase) * 2;
    ctx.save();
    ctx.translate(x, fy + bob);
    ctx.scale(facing, 1);

    // Soft contact shadow
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(0, -4, 16, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body — warm cream suit silhouette
    ctx.fillStyle = "#e8d8c8";
    roundRect(ctx, -12, -58, 24, 36, 8);
    ctx.fill();
    // Helm / head
    ctx.fillStyle = "#f0e6dc";
    ctx.beginPath();
    ctx.arc(0, -70, 12, 0, Math.PI * 2);
    ctx.fill();
    // Visor
    ctx.fillStyle = PAL.guide;
    ctx.globalAlpha = 0.75;
    roundRect(ctx, -8, -74, 12, 6, 3);
    ctx.fill();
    ctx.globalAlpha = 1;
    // Legs
    const swing = Math.sin(walkPhase) * 8;
    ctx.strokeStyle = "#c8b4a0";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-4, -22);
    ctx.lineTo(-4 - swing * 0.3, -4);
    ctx.moveTo(4, -22);
    ctx.lineTo(4 + swing * 0.3, -4);
    ctx.stroke();
    // Accent stripe
    ctx.fillStyle = PAL.guide;
    ctx.fillRect(-12, -48, 24, 3);

    ctx.restore();
  }

  function drawForeground(room, camX) {
    const w = roomWidth(room);
    const fy = floorY();
    // Near hanging cable / FG plant for depth
    ctx.save();
    ctx.translate(-camX * 0.08, 0);
    ctx.strokeStyle = "rgba(26,22,18,0.35)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(60, 40);
    ctx.bezierCurveTo(70, 120, 40, 180, 55, fy - 20);
    ctx.stroke();

    if (room.profile === "crew" || room.profile === "obs") {
      // Soft FG leaf
      ctx.fillStyle = "rgba(90, 140, 110, 0.45)";
      ctx.beginPath();
      ctx.ellipse(w - 40, fy - 30, 28, 16, -0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawLightShafts(room, time) {
    if (room.aperture === "none" && room.hero !== "core" && room.hero !== "holomap") return;
    const w = roomWidth(room);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    if (room.aperture !== "none") {
      const ax = room.aperture === "gallery" ? w * 0.5 : w * 0.76;
      const shaft = ctx.createLinearGradient(ax, 80, ax - 40, floorY());
      shaft.addColorStop(0, "rgba(180,210,255,0.10)");
      shaft.addColorStop(1, "rgba(180,210,255,0)");
      ctx.fillStyle = shaft;
      ctx.beginPath();
      ctx.moveTo(ax - 30, 80);
      ctx.lineTo(ax + 40, 80);
      ctx.lineTo(ax + 10, floorY());
      ctx.lineTo(ax - 70, floorY());
      ctx.closePath();
      ctx.fill();
    }
    if (room.hero === "core") {
      const pulse = 0.08 + Math.sin(time * 2) * 0.03;
      const g = ctx.createRadialGradient(w * 0.5, TILE_H * 0.45, 20, w * 0.5, TILE_H * 0.45, 220);
      g.addColorStop(0, `rgba(224,164,90,${pulse + 0.1})`);
      g.addColorStop(1, "rgba(224,164,90,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, TILE_H);
    }
    ctx.restore();
  }

  function bloomPass(viewW, viewH) {
    // Downsample bright-ish frame and additive soft blur
    bctx.clearRect(0, 0, bloom.width, bloom.height);
    bctx.globalAlpha = 1;
    bctx.drawImage(canvas, 0, 0, bloom.width, bloom.height);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.22;
    ctx.filter = "blur(12px)";
    ctx.drawImage(bloom, 0, 0, viewW, viewH);
    ctx.filter = "none";
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
  }

  function drawVignette(viewW, viewH) {
    const v = ctx.createRadialGradient(
      viewW / 2,
      viewH / 2,
      viewH * 0.25,
      viewW / 2,
      viewH / 2,
      viewH * 0.75
    );
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(8,6,10,0.45)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, viewW, viewH);
  }

  function render(state) {
    const { room, actor, time, camX, viewW, viewH } = state;
    const w = roomWidth(room);
    const fy = floorY();

    ctx.clearRect(0, 0, viewW, viewH);
    ctx.save();
    // Letterbox background
    ctx.fillStyle = "#07080c";
    ctx.fillRect(0, 0, viewW, viewH);

    // Fit room into view
    const scale = Math.min(viewW / Math.min(w, TILE_W * 1.15), viewH / TILE_H);
    const drawW = w * scale;
    const drawH = TILE_H * scale;
    const ox = (viewW - Math.min(drawW, viewW)) / 2;
    const oy = (viewH - drawH) / 2;

    ctx.beginPath();
    ctx.rect(ox, oy, Math.min(drawW, viewW), drawH);
    ctx.clip();

    ctx.translate(ox, oy);
    ctx.scale(scale, scale);
    ctx.translate(-camX, 0);

    drawVista(room, time, camX, viewW / scale);
    drawShell(room);
    drawAperture(room, time);
    drawHero(room, time);
    drawPip(room, time);
    drawSignage(room);
    drawFloorSpecular(room, actor.x);
    drawActor(actor.x, fy, actor.facing, actor.walkPhase);
    drawForeground(room, camX);
    drawLightShafts(room, time);

    ctx.restore();

    // Screen-space polish
    bloomPass(viewW, viewH);
    drawVignette(viewW, viewH);

    // Film grain (subtle)
    ctx.globalAlpha = 0.035;
    for (let i = 0; i < 120; i++) {
      ctx.fillStyle = i % 2 ? "#fff" : "#000";
      ctx.fillRect(Math.random() * viewW, Math.random() * viewH, 1.5, 1.5);
    }
    ctx.globalAlpha = 1;
  }

  /** Still plate for readout mockups — centered, optional actor. */
  function renderPlate(opts) {
    const room = opts.room;
    const time = opts.time ?? 1.2;
    const showActor = opts.showActor !== false;
    const viewW = opts.viewW;
    const viewH = opts.viewH;
    const w = roomWidth(room);
    const fy = floorY();
    const actorX = opts.actorX ?? w * 0.42;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, viewW, viewH);
    ctx.fillStyle = "#07080c";
    ctx.fillRect(0, 0, viewW, viewH);

    const scale = Math.min(viewW / w, viewH / TILE_H);
    const drawW = w * scale;
    const drawH = TILE_H * scale;
    const ox = (viewW - drawW) / 2;
    const oy = (viewH - drawH) / 2;

    ctx.save();
    ctx.beginPath();
    ctx.rect(ox, oy, drawW, drawH);
    ctx.clip();
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);

    drawVista(room, time, 0, w);
    drawShell(room);
    drawAperture(room, time);
    drawHero(room, time);
    drawPip(room, time);
    drawSignage(room);
    if (showActor) {
      drawFloorSpecular(room, actorX);
      drawActor(actorX, fy, 1, 0.6);
    }
    drawForeground(room, 0);
    drawLightShafts(room, time);
    ctx.restore();

    bloomPass(viewW, viewH);
    drawVignette(viewW, viewH);
  }

  return { resize, render, renderPlate, floorY };
}

// Points, medals and the family scoreboard for rail games (Evan, 2026-10-24 16:58Z: "turn it into rail game for points and prizes
// leaderboard"). The coaster is the first; any on-rails ride (Kart laps, the Moon Mission's journey) can use the same kit.
//   const sc = railScore({medals: [1200, 2500, 4500]});  sc.add(100, 'star') -> {pts, combo}; sc.chain() / sc.breakChain()
//   sc.total, sc.medal() -> 0 none, 1 bronze, 2 silver, 3 gold;  board('coaster').add({rider, score, medal, car}) -> rank
//   paintBoard(T, rows) -> a CanvasTexture of a hand-painted wooden scoreboard (diegetic: it stands in the world)
// Rewards stay backpack charms (no coins). The family board lives on this device (no public names); riders are the family cast.
export const RIDERS = [
  {id: 'abbie', name: 'Abbie', colour: '#ff5d9e'}, {id: 'ani', name: 'Ani', colour: '#9b6bff'}, {id: 'daddy', name: 'Daddy', colour: '#3a8fd8'},
  {id: 'mommy', name: 'Mommy', colour: '#2fbf8f'}, {id: 'lexi', name: 'Lexi', colour: '#ffb020'}];
export const MEDAL = ['', 'bronze', 'silver', 'gold'], MEDAL_COLOUR = ['#999', '#cd7f32', '#c9d3dc', '#ffcf3a'];

export function railScore({medals = [1000, 2000, 3500], comboMax = 5} = {}) {
  const s = {total: 0, combo: 1, best: 1, log: [],
    add(pts, why, {combo = false} = {}) { const p = Math.round(pts * (combo ? s.combo : 1)); s.total += p; s.log.push({why, p}); return {pts: p, combo: s.combo}; },
    chain() { s.combo = Math.min(comboMax, s.combo + 1); s.best = Math.max(s.best, s.combo); }, breakChain() { s.combo = 1; },
    medal() { return s.total >= medals[2] ? 3 : s.total >= medals[1] ? 2 : s.total >= medals[0] ? 1 : 0; },
    reset() { s.total = 0; s.combo = 1; s.best = 1; s.log = []; }};
  return s;
}

export function board(game, {keep = 10} = {}) {
  const KEY = 'aw-board-' + game;
  const rows = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
  return {
    rows,
    add(r) { const all = rows(); const row = {...r, at: Date.now()}; all.push(row); all.sort((a, b) => b.score - a.score); const top = all.slice(0, keep);
      try { localStorage.setItem(KEY, JSON.stringify(top)); } catch {} const i = top.indexOf(row); return i < 0 ? 0 : i + 1; },
    setRider(at, rider) { const all = rows(), r = all.find(x => x.at === at); if (!r) return; r.rider = rider; try { localStorage.setItem(KEY, JSON.stringify(all)); } catch {} },
    best(rider) { return rows().filter(r => !rider || r.rider === rider)[0]?.score || 0; },
  };
}

// a painted scoreboard: cream boards with a red header band, a helmet dot per rider, the score, a medal; five rows.
// The canvas is reused so repainting after each run is cheap.
export function paintBoard(T, rows, tex) {
  const W = 512, H = 640, cv = tex?.image || Object.assign(document.createElement('canvas'), {width: W, height: H}), g = cv.getContext('2d');
  g.fillStyle = '#f6e7c8'; g.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 64) { g.fillStyle = y / 64 % 2 ? '#efdcb6' : '#f6e7c8'; g.fillRect(0, y, W, 62); g.fillStyle = '#d9c095'; g.fillRect(0, y + 62, W, 2); }
  g.fillStyle = '#e8423f'; g.fillRect(0, 0, W, 112); g.fillStyle = '#ffcf3a'; g.fillRect(0, 106, W, 10);
  // the header is a picture, not a word: a trophy between two stars
  const star = (x, y, r, c) => { g.fillStyle = c; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * .45 : r; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } g.closePath(); g.fill(); };
  star(130, 56, 30, '#ffcf3a'); star(382, 56, 30, '#ffcf3a');
  g.fillStyle = '#ffcf3a'; g.beginPath(); g.moveTo(226, 24); g.lineTo(286, 24); g.quadraticCurveTo(286, 74, 256, 78); g.quadraticCurveTo(226, 74, 226, 24); g.fill(); g.fillRect(250, 76, 12, 14); g.fillRect(236, 88, 40, 8);
  g.strokeStyle = '#ffcf3a'; g.lineWidth = 6; g.beginPath(); g.arc(224, 40, 12, Math.PI / 2, Math.PI * 1.5); g.stroke(); g.beginPath(); g.arc(288, 40, 12, -Math.PI / 2, Math.PI / 2); g.stroke();
  (rows || []).slice(0, 5).forEach((r, i) => {
    const y = 160 + i * 100, rd = RIDERS.find(x => x.id === r.rider) || RIDERS[0];
    g.fillStyle = '#7a5530'; g.font = '800 44px ui-rounded, system-ui, sans-serif'; g.textBaseline = 'middle'; g.fillText(String(i + 1), 26, y);
    g.fillStyle = rd.colour; g.beginPath(); g.arc(104, y, 30, Math.PI, 0); g.lineTo(134, y + 10); g.lineTo(74, y + 10); g.closePath(); g.fill(); // a rider's helmet
    g.fillStyle = '#3ad1e0'; g.fillRect(96, y - 10, 34, 12);
    g.fillStyle = '#3a2a1a'; g.font = '800 52px ui-rounded, system-ui, sans-serif'; g.textAlign = 'right'; g.fillText(r.score.toLocaleString('en-US'), 400, y); g.textAlign = 'left';
    if (r.medal) { g.fillStyle = MEDAL_COLOUR[r.medal]; g.beginPath(); g.arc(452, y, 26, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#00000030'; g.lineWidth = 4; g.stroke(); star(452, y, 14, '#ffffffc0'); }
  });
  if (tex) { tex.needsUpdate = true; return tex; }
  const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; return t;
}

// Game-feel lint: catches the rules in CLAUDE.md "How Abbie's World shows information" that code can see.
// Diff-aware: only lines a change adds are judged, so old debt doesn't block new work (the cover ratchet handles that).
// Usage: node lint.mjs [base-ref]      (default origin/main; run from the repo root)
//        node lint.mjs --all <path>    (judge whole files, for audits)
// Silence one line with a reason:  // game-feel: ok <why>
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';

// Player-facing code. Developer tools, studies, tests and vendored code are out of scope.
const PLAYER = /^prototypes\/[^/]+\/(dist\/)?.*\.(m?js|html|css)$/;
const NOT_PLAYER = /(\/vendor\/|node_modules|\/tests?\/|\.test\.|developer-mode|-study|study\.|normalizer|calibration|\/api\/|\.min\.)/;

const RULES = [
  {id: 'engine-helper', level: 'error', re: /\b(AxesHelper|GridHelper|PolarGridHelper|BoxHelper|Box3Helper|ArrowHelper|CameraHelper|PlaneHelper|SkeletonHelper|\w*LightHelper|TransformControls)\b/,
   unless: /developerHelper\(|presentation\(|developer/i,
   say: 'Engine helper in the player\'s world. Wrap it: presentation(obj) for a player cue, developerHelper(obj, isDev) for debug (simulations/presentation-layer.mjs).'},
  {id: 'label-in-world', level: 'warn', re: /\.(object|mesh|root|group|body)\.add\([^)]*label/i, unless: /presentation\(/,
   say: 'A label parented to a world object becomes part of the fiction. Mark it presentation(label).'},
  {id: 'raw-capture', level: 'warn', re: /drawImage\([^)]*domElement|domElement[^;]{0,60}\.(toDataURL|toBlob)\(/, unless: /renderWorldOnly|presentation/,
   say: 'AI capture from the raw canvas sees HUD and helpers. Render with renderWorldOnly(renderer, scene, camera) first.'},
  {id: 'perception-unfiltered', level: 'warn', re: /(entities|world)\b[^;]*\.(slice|map)\([^)]*\)[^;]*\b(label|behavior|doing)\b/, file: /policy|perception|director|look|summar/i, unless: /perceivable\(/,
   say: 'Perception summary without perceivable(): hidden things, markers and presentation entities leak into what the AI "sees".'},
  {id: 'dev-words', level: 'warn', re: /(textContent|innerText|innerHTML|title|aria-label)\s*[=:]\s*[`'"][^`'"]*\b(debug|helper|undefined|NaN|TODO|lorem)\b/i, unless: /developer|dev-/i,
   say: 'Developer words in visible text. Players never see ids, "debug" or "helper".'},
  {id: 'web-vocabulary', level: 'warn', re: /(id|class(Name)?)\s*=\s*[`'"][^`'"]*\b(toolbar|sidebar|side-panel|navbar|tab-bar|segmented|breadcrumb|dropdown)\b/i,
   say: 'Web-page vocabulary. Use a game pattern instead (GAME_FEEL.md banned table: toolbar → toy box, side panel → workbench).'},
];
// CSS: a layer over the whole world that blurs, hazes or fades it. Small glass objects are fine (Evan likes them).
const FULLSCREEN = /(inset\s*:\s*0\s*[;}!]|inset\s*:\s*0\s*$|(width\s*:\s*100(vw|%)\s*[;!][^}]*height\s*:\s*100(d?vh|%)))/;
const MASK = /(backdrop-filter|radial-gradient|linear-gradient[^;]*(#fff|white|rgba\(\s*255)|filter\s*:\s*blur)/;

const args = process.argv.slice(2);
const all = args[0] === '--all';
const findings = [];
function judge(file, text, added) {
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    if (added && !added.has(i + 1)) return;
    if (/game-feel:\s*ok/.test(line)) return;
    for (const r of RULES) {
      if (r.file && !r.file.test(file)) continue;
      const m = line.match(r.re);
      const near = m && line.slice(Math.max(0, m.index - 120), m.index + m[0].length + 120);
      if (m && !(r.unless && r.unless.test(near))) findings.push({file, line: i + 1, rule: r.id, level: r.level, say: r.say, code: m[0]});
    }
  });
  // CSS blocks (in .css files and <style>/inline strings) that cover the world with a mask.
  const css = text.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '));
  const re = /([^{}]+)\{([^{}]*)\}/g; let b;
  while ((b = re.exec(css))) {
    const body = b[2]; if (!(FULLSCREEN.test(body) && MASK.test(body) && /position\s*:\s*fixed/.test(body))) continue;
    const startLine = css.slice(0, b.index + b[0].length - b[0].trimStart().length).split('\n').length, endLine = startLine + b[0].split('\n').length - 1;
    if (added && ![...added].some(n => n >= startLine && n <= endLine)) continue;
    if (/game-feel:\s*ok/.test(b[0]) || /developer|dev-/.test(b[1])) continue;
    findings.push({file, line: startLine, rule: 'world-mask', level: 'error', code: b[1].trim().slice(0, 60),
      say: 'A full-screen layer blurs, hazes or fades the world. Nothing masks the world; keep glass on small objects.'});
  }
}

if (all) {
  const walk = p => fs.statSync(p).isDirectory() ? fs.readdirSync(p).flatMap(f => walk(`${p}/${f}`)) : [p];
  for (const f of walk(args[1] || 'prototypes')) if (PLAYER.test(f) && !NOT_PLAYER.test(f)) judge(f, fs.readFileSync(f, 'utf8'));
} else {
  const base = args[0] || 'origin/main';
  const diff = execFileSync('git', ['diff', '--unified=0', '--diff-filter=AM', `${base}...HEAD`, '--', 'prototypes'], {encoding: 'utf8', maxBuffer: 1 << 28});
  const added = new Map(); let file = null;
  for (const l of diff.split('\n')) {
    if (l.startsWith('+++ ')) { file = l.slice(6); if (!added.has(file)) added.set(file, new Set()); continue; }
    const h = l.match(/^@@ .* \+(\d+)(?:,(\d+))? @@/);
    if (h && file) { const s = +h[1], n = h[2] === undefined ? 1 : +h[2]; for (let k = 0; k < n; k++) added.get(file).add(s + k); }
  }
  for (const [f, lines] of added) if (PLAYER.test(f) && !NOT_PLAYER.test(f) && lines.size && fs.existsSync(f)) judge(f, fs.readFileSync(f, 'utf8'), lines);
}

const errors = findings.filter(f => f.level === 'error');
for (const f of findings) console.log(`${f.level === 'error' ? '✗' : '!'} ${f.file}:${f.line} [${f.rule}] ${f.code}\n    ${f.say}`);
if (process.env.GITHUB_STEP_SUMMARY) {
  const rows = findings.map(f => `| ${f.level} | \`${f.file}:${f.line}\` | ${f.rule} | ${f.say} |`).join('\n');
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Game feel: lint\n${findings.length ? `| level | where | rule | fix |\n|---|---|---|---|\n${rows}` : 'No new engine artifacts, masks or web vocabulary.'}\n\n`);
}
console.log(`game-feel lint: ${errors.length} error(s), ${findings.length - errors.length} warning(s)`);
process.exit(errors.length ? 1 : 0);

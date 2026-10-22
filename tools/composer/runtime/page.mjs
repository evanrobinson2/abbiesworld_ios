// /music: audition the Composer's beds, layers, stings and interludes through the same director the game uses.
import {music} from '/music/director.mjs';

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const short = id => id.replace(/^music\./, '');

function wave(canvas, peaks) {
  const r = canvas.getBoundingClientRect(), dpr = devicePixelRatio || 1;
  canvas.width = Math.max(1, r.width * dpr); canvas.height = Math.max(1, r.height * dpr);
  const g = canvas.getContext('2d'), w = canvas.width, h = canvas.height, n = peaks.length;
  g.fillStyle = getComputedStyle(document.body).getPropertyValue('--app-accent').trim() || '#b64932';
  for (let i = 0; i < n; i++) {
    const v = Math.max(0.04, peaks[i]) * h * 0.86;
    g.fillRect(i * w / n, (h - v) / 2, Math.max(1, w / n - dpr), v);
  }
}

async function main() {
  let all;
  try { all = await music.catalog(); }
  catch (e) { $('beds').innerHTML = `<p class="loading">Could not load the music catalogue (${esc(e.message)}).</p>`; return; }
  const ORDER = ['ranch-morning', 'ranch-workday', 'ranch-night', 'wonder', 'sting-arrival', 'sting-teleport',
    'sting-reveal', 'sting-victory', 'sting-small-win', 'sting-build-complete', 'sting-discovery', 'sting-oops',
    'world-intro', 'chapter-card', 'night-falls', 'morning-comes'];
  const rank = r => { const i = ORDER.indexOf(short(r.id)); return i < 0 ? 99 : i; };
  all = [...all].sort((a, b) => rank(a) - rank(b));
  const beds = all.filter(r => r.loop), stings = all.filter(r => r.cueKind === 'sting'),
    inters = all.filter(r => r.cueKind === 'interlude');

  $('beds').innerHTML = beds.map(r => `<button type="button" class="bed" data-bed="${esc(short(r.id))}" aria-pressed="false">
    <span class="top"><strong>${esc(r.name)}</strong><span class="k">${esc(r.key)} · ${r.bpm} bpm · ${Math.round(r.loopPoints.end - r.loopPoints.start)} s</span></span>
    <canvas aria-hidden="true"></canvas><p>${esc(r.subject)}</p>
    <span class="tags">${(r.uses || []).slice(0, 3).map(u => `<span>${esc(u)}</span>`).join('')}</span></button>`).join('');
  $('beds').querySelectorAll('.bed').forEach((el, i) => requestAnimationFrame(() => wave(el.querySelector('canvas'), beds[i].peaks || [])));
  $('stings').innerHTML = stings.map(r => `<button type="button" class="pad" data-sting="${esc(short(r.id))}"><strong>${esc(r.name)}</strong><small>${esc(r.subject)}</small></button>`).join('');
  $('interludes').innerHTML = inters.map(r => `<div class="inter"><span class="top"><strong>${esc(r.name)}</strong><span class="k meta">${Math.round(r.duration)} s</span></span>
    <p>${esc(r.subject)}</p><span><button type="button" data-inter="${esc(short(r.id))}">Play</button></span></div>`).join('');
  $('motif').textContent = 'Abbie’s motif: sol, do, re, mi (a rising fourth, then two steps up), answered re, do, la. ' +
    'You can hear it in every cue: ' + beds.map(b => `${b.name} (${b.motif || 'theme'})`).join('; ') + '.';

  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-bed],[data-sting],[data-inter]');
    if (!b) return;
    try {
      if (b.dataset.bed) await music.play(b.dataset.bed, {intensity: Number($('intensity').value)});
      else if (b.dataset.sting) {
        const {when} = await music.sting(b.dataset.sting);
        setTimeout(() => { b.classList.remove('fire'); void b.offsetWidth; b.classList.add('fire'); },
          Math.max(0, (when - music.context.currentTime) * 1000));
      } else if (b.dataset.inter) {
        const next = {'night-falls': 'ranch-night', 'morning-comes': 'ranch-morning', 'world-intro': 'wonder'}[b.dataset.inter];
        await music.interlude(b.dataset.inter, {then: next});
      }
    } catch (err) { $('now-meta').textContent = err.message; }
  });
  $('intensity').addEventListener('input', e => { music.intensity(Number(e.target.value)); });
  $('volume').value = music.state().volume;
  $('volume').addEventListener('input', e => music.volume(Number(e.target.value)));
  $('stop').addEventListener('click', () => music.stop());

  const byId = Object.fromEntries(all.map(r => [short(r.id), r]));
  music.on(s => {
    const r = s.bed && byId[s.bed];
    $('now-title').textContent = r ? r.name : 'Nothing yet';
    $('now-meta').textContent = r ? `${r.key} · ${r.bpm} bpm · ${r.uses?.[0] || ''}` : 'Pick a bed below';
    $('int-val').textContent = `${Math.round(s.intensity * 100)}%`;
    document.querySelectorAll('.bed').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.bed === s.bed)));
    $('stems').innerHTML = s.stems.map(x => `<span class="stem">${esc(x.name)}<span class="m"><i style="width:${Math.round(x.gain * 100)}%"></i></span></span>`).join('');
  });
  const dots = [...$('beats').children];
  (function tick() {
    const s = music.state();
    const on = s.beat == null ? -1 : Math.floor(s.beat) % (byId[s.bed]?.beatsPerBar || 4);
    dots.forEach((d, i) => d.classList.toggle('on', i === on));
    dots[3].style.display = (byId[s.bed]?.beatsPerBar || 4) === 3 ? 'none' : '';
    requestAnimationFrame(tick);
  })();
}
main();

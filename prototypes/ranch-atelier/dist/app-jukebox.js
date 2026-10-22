// Shared app music drawer. Playlist entries must reference approved music assets.
export function mountJukebox(tracks) {
  if (document.getElementById('app-jukebox-toggle')) return;
  const audio = new Audio();
  audio.id = 'app-jukebox-audio'; audio.hidden = true; document.body.append(audio);
  audio.preload = 'metadata';
  let index = 0, saved = {};
  try { saved = JSON.parse(localStorage.getItem('abbies-jukebox-v1') || '{}') || {}; } catch {}
  const selected = tracks.findIndex(t => t.id === saved.track);
  if (selected >= 0) index = selected;
  audio.volume = Number.isFinite(saved.volume) ? Math.max(0, Math.min(1, saved.volume)) : .45;
  audio.loop = saved.repeat === true;
  const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = '/app-jukebox.css'; document.head.append(link);
  const toggle = document.createElement('button');
  toggle.id = 'app-jukebox-toggle'; toggle.type = 'button'; toggle.innerHTML = '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18V5l12-2v13M9 9l12-2"/><ellipse cx="6" cy="18" rx="3" ry="2.5"/><ellipse cx="18" cy="16" rx="3" ry="2.5"/></svg>';
  toggle.setAttribute('aria-label', 'Open jukebox'); toggle.setAttribute('aria-haspopup', 'dialog'); toggle.setAttribute('aria-expanded', 'false');
  const drawer = document.createElement('dialog'); drawer.id = 'app-jukebox'; drawer.setAttribute('aria-label', 'Abbie’s jukebox');
  drawer.innerHTML = `<div class="jukebox-heading"><strong>Abbie’s Jukebox</strong><button type="button" data-close aria-label="Close jukebox">×</button></div><p data-status role="status"></p><label>Track<select data-track></select></label><div class="jukebox-transport"><button type="button" data-prev aria-label="Previous track">Previous</button><button type="button" data-play>Play</button><button type="button" data-next aria-label="Next track">Next</button></div><label>Volume<input data-volume type="range" min="0" max="1" step=".01"></label><label class="jukebox-repeat"><input data-repeat type="checkbox">Repeat this track</label>`;
  document.body.append(toggle, drawer);
  // Join the actual toolbar group; never float over another toolbar control.
  function attachToToolbar(){
    const tools=document.getElementById('toolbar-tools');
    if(!tools)return false;
    const settings=tools.querySelector('#app-settings-toggle');
    if(toggle.parentElement!==tools)tools.insertBefore(toggle,settings);
    return true;
  }
  if(!attachToToolbar()){
    const observer=new MutationObserver(()=>{if(attachToToolbar())observer.disconnect();});
    observer.observe(document.body,{childList:true,subtree:true});
    window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
  }
  const $ = key => drawer.querySelector(`[data-${key}]`);
  tracks.forEach((track, i) => { const option = document.createElement('option'); option.value = i; option.textContent = track.title; $('track').append(option); });
  // Composer beds loop seamlessly through the music director (WebAudio) instead of the <audio> element.
  let director = null, directing = false;
  async function music() { director ??= (await import('/music/director.mjs')).music; return director; }
  const paused = () => audio.paused && !directing;
  function save() { try { localStorage.setItem('abbies-jukebox-v1', JSON.stringify({track: tracks[index]?.id, volume: audio.volume, repeat: audio.loop})); } catch {} }
  function render() { const p = paused(); $('play').textContent = p ? 'Play' : 'Pause'; toggle.setAttribute('aria-label', p ? 'Open jukebox' : 'Open jukebox · music playing'); }
  async function play() {
    if (!tracks.length) return;
    $('status').textContent = 'Loading…';
    try {
      if (tracks[index].director) {
        const m = await music(); m.volume(audio.volume); await m.play(tracks[index].director); directing = true;
      } else await audio.play();
      $('status').textContent = tracks[index].title;
    }
    catch (error) { if (error.name !== 'AbortError') $('status').textContent = 'Could not play this track. Tap Play to retry.'; }
    render();
  }
  function stopDirector() { if (directing) { director?.stop({fade: 1}); directing = false; } }

  function select(next, start = false) {
    if (!tracks.length) return;
    audio.pause(); stopDirector(); index = (next + tracks.length) % tracks.length;
    if (tracks[index].director) audio.removeAttribute('src'); else audio.src = tracks[index].url;
    $('track').value = String(index); $('status').textContent = tracks[index].title;
    save(); render(); if (start) play();
  }
  toggle.onclick = () => { drawer.showModal(); toggle.setAttribute('aria-expanded', 'true'); $('close').focus(); };
  $('close').onclick = () => drawer.close();
  drawer.onclose = () => { toggle.setAttribute('aria-expanded', 'false'); toggle.focus(); };
  drawer.addEventListener('click', event => { if (event.target !== drawer) return; const r = drawer.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) drawer.close(); });
  // Keep app camera and editing shortcuts out of the music controls.
  drawer.addEventListener('keydown', event => event.stopPropagation());
  $('play').onclick = () => { if (paused()) play(); else { audio.pause(); stopDirector(); render(); } };
  $('prev').onclick = () => select(index - 1, !paused());
  $('next').onclick = () => select(index + 1, !paused());
  $('track').onchange = () => select(Number($('track').value), true);
  $('volume').value = audio.volume;
  $('volume').oninput = () => { audio.volume = Number($('volume').value); director?.volume(audio.volume); save(); };
  $('repeat').checked = audio.loop;
  $('repeat').onchange = () => { audio.loop = $('repeat').checked; save(); };
  audio.addEventListener('ended', () => select(index + 1, true));
  audio.addEventListener('play', render); audio.addEventListener('pause', render);
  audio.addEventListener('error', () => { $('status').textContent = 'This track is unavailable. Try another track.'; render(); });
  if (tracks.length) select(index); else { $('status').textContent = 'Music collection has not been connected yet.'; for (const control of drawer.querySelectorAll('select,input,.jukebox-transport button')) control.disabled = true; }
  window.addEventListener('pagehide', () => { audio.pause(); stopDirector(); });
}

const LOFI = {id:'music.abbiesWorld.reimagined.lofi',title:'Abbie’s World Reimagined · Lo-fi',url:'/music/abbies-world-reimagined.mp3'};
// Composer beds come from the music catalogue (tools/composer); the lo-fi track stays first.
fetch('/music/catalog.json').then(r => r.ok ? r.json() : {sounds: []}).catch(() => ({sounds: []}))
  .then(d => mountJukebox([LOFI, ...(d.sounds || []).filter(s => s.loop && s.cueKind === 'music')
    .map(s => ({id: s.id, title: `${s.name} · Orchestra`, url: s.urls.audio, director: s.id.replace(/^music\./, '')}))]));

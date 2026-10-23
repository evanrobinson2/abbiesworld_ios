const scenes = {
  woodland: {url:'/scene-generator/woodland', description:'Compose woodland work, resource reserves and connected access.'},
  garden: {url:'/scene-generator/garden', description:'Compose a garden from its work, terrain and normalized assets.'},
  ranch: {url:'/scene-generator', description:'Place, rotate and redraw connected ranch tiles.'},
  market: {url:'/scene-generator?scene=market', description:'Generate a marketplace and simulate its market day.'},
  simulation: {url:'/scene-generator/simulation', description:'Grow a ranch through daily construction and animal care.'}
};
const select = document.getElementById('generator-family');
const current = select.dataset.scene;
if(!select.querySelector('option[value="garden"]'))select.add(new Option('Garden farm','garden'));
if(!select.querySelector('option[value="woodland"]'))select.add(new Option('Working woodland','woodland'));
select.value = current;
document.getElementById('generator-description').textContent = scenes[current].description;
select.addEventListener('change', () => {
  const next = scenes[select.value];
  if (next && select.value !== current) location.assign(next.url);
});
// Browser back/forward may restore a select's last value independently of its page.
addEventListener('pageshow', () => { select.value = current; });
window.RanchView?.register('sceneGenerator', () => ({type:current, supportedTypes:Object.keys(scenes)}));

// Board is the named assembly entry; legacy scene-generator links remain valid.
if(location.pathname==='/board'){
 document.title='Board | Ranch Atelier';
 const brand=document.querySelector('header .brand');if(brand){brand.href='/board';const title=brand.querySelector('strong');if(title)title.textContent='Board';}
 window.RanchView?.register('boardWorkspace',()=>({entry:'/board',mode:'tile-arrangement',creationAndSavedCardIntegration:'pending'}));
}

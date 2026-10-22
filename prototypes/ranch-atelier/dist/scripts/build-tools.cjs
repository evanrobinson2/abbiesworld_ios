const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');

async function generate(root, output) {
  const read = file => fs.readFileSync(path.join(root, file), 'utf8');
  const config = JSON.parse(read('vercel.json'));
  const metadata = JSON.parse(read('tools-metadata.json'));
  const retired=new Set(["/sandbox2", "/Sandbox2", "/sandbox2.html", "/board2", "/board2.html", "/demonstrations", "/demonstrations.html", "/model-normalizer", "/model-normalizer.html", "/effect-browser", "/effect-browser.html"]);
  const mainPaths = new Set([...read('navigation.js').matchAll(/class="nav-link" href="([^"]+)"/g)].map(m => m[1]));
  mainPaths.add('/');
  mainPaths.delete('/sandbox');
  const rows = [], byPath = new Map(), byFile = new Map();
  const add = (href, title, category, description, file) => {
    if(retired.has(href))return null;
    if(byPath.has(href)) return byPath.get(href);
    const row = {href, title, category, description, aliases:[], main:mainPaths.has(href)};
    rows.push(row); byPath.set(href,row); if(file)byFile.set(file,row); return row;
  };
  const alias = (row, href) => { if(!retired.has(href) && row && href!==row.href && !byPath.has(href)){row.aliases.push(href);byPath.set(href,row);} };
  const redirects = new Map((config.redirects||[]).map(r=>[r.source,r.destination]));
  const rewrites = (config.rewrites||[]).filter(r=>!r.source.includes(':'));
  const htmlFiles = fs.readdirSync(root).filter(f=>f.endsWith('.html'));
  // Nested public pages; internal runtime copies are implementation assets.
  for(const folder of ['simulation-characters','town-life']) {
    if(fs.existsSync(path.join(root,folder,'index.html')))htmlFiles.push(folder+'/index.html');
  }
  for(const file of htmlFiles) {
    if(['tools.html','authored-ranch.html','procedural.html'].includes(file) || redirects.has('/'+file))continue;
    const meta = metadata[file];
    const route = rewrites.find(r=>r.destination==='/'+file && !r.has);
    const title = read(file).match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.split(/[·|]/)[0].trim() || file.replace('.html','');
    const row = add(meta?.[0]||route?.source||'/'+file, meta?.[1]||title, meta?.[2]||'Other', meta?.[3]||'', file);
    if(!rewrites.some(r=>r.source==='/'+file && r.destination!=='/'+file))alias(row,'/'+file);
  }
  const terrain=add('/procedural','Terrain Generator','Tools','Shape the sandbox landscape.');
  for(const href of ['/terrain-editor','/procedural.html'])alias(terrain,href);
  const home=byPath.get('/');for(const href of ['/index.html','/authored-ranch.html'])alias(home,href);
  add('/sandbox/outbreak','Outbreak','Play','Zombies pursue people across connected tiles; equip survivors and run the encounter.');
  add('/scene-generator/prefabs','Prefabs','Assets','Search the catalog of reusable scenes and pieces.');
  const {SCENE_TYPES} = await import(pathToFileURL(path.join(root,'scene-registry.js')).href);
  for(const scene of Object.values(SCENE_TYPES)) {
    const row=add(scene.expandedPath,scene.label+' generator','Scene generators','Compose '+scene.label.toLowerCase()+' scenes in Sandbox.');
    alias(row,'/tile-generator/'+scene.id);
  }
  for(const rule of rewrites) {
    if(byPath.has(rule.source))continue;
    if(rule.has?.length) {
      const query=rule.has.filter(x=>x.type==='query'&&x.value).map(x=>encodeURIComponent(x.key)+'='+encodeURIComponent(x.value)).join('&');
      if(query)alias(byFile.get(rule.destination.slice(1)),rule.source+'?'+query);
    } else alias(byFile.get(rule.destination.slice(1)),rule.source);
  }
  // Query variants use their own destinations, even when the bare path is already registered.
  for(const rule of rewrites.filter(r=>r.has?.length)) {
    const query=rule.has.filter(x=>x.type==='query'&&x.value).map(x=>encodeURIComponent(x.key)+'='+encodeURIComponent(x.value)).join('&');
    if(query)alias(byFile.get(rule.destination.slice(1)),rule.source+'?'+query);
  }
  for(const [from,to] of redirects)alias(byPath.get(to),from);
  const catalog=JSON.parse(read('sets-data/catalog.json'));
  for(const set of catalog.sets) {
    const row=add('/sets/'+set.slug,set.title,set.kind==='asset'?'Pieces':'Sets',set.intent||'');
    alias(row,'/scene-generator/prefabs/'+set.slug);
  }
  const categories=['Play','Scene generators','Tools','Studies','Places','Assets','Sets','Pieces','Other'];
  rows.sort((a,b)=>categories.indexOf(a.category)-categories.indexOf(b.category)||a.title.localeCompare(b.title));
  const result={pages:rows, count:rows.length, routeCount:rows.reduce((n,r)=>n+1+r.aliases.length,0)};
  fs.writeFileSync(path.join(output,'tools-catalog.json'),JSON.stringify(result,null,2)+'\n');
  console.log(`Tools / Utilities: ${result.count} pages, ${result.routeCount} URLs.`);
  return result;
}
module.exports={generate};

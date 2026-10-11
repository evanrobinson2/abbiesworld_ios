#!/usr/bin/env python3
"""Build an offline WKWebView page from a pinned Amber Shallows checkout.
Usage: python3 scripts/amber_shallows/bundle.py /path/to/amber-scene --esbuild /path/to/esbuild
"""
import argparse, base64, hashlib, json, mimetypes, re, shutil, subprocess, tempfile
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('source',type=Path);p.add_argument('--esbuild',default='esbuild');args=p.parse_args()
root=Path(__file__).resolve().parents[2]
out=root/'abbies.world.ios/abbies.world.ios/Resources/AmberShallows';out.mkdir(parents=True,exist_ok=True)
def data(path):
 return 'data:'+ (mimetypes.guess_type(path)[0] or 'application/octet-stream')+';base64,'+base64.b64encode(path.read_bytes()).decode()
with tempfile.TemporaryDirectory() as tmp:
 tmp=Path(tmp);shutil.copytree(args.source,tmp/'src');src=tmp/'src'
 moss=src/'assets/moss/moss_01.gltf';gltf=json.loads(moss.read_text())
 for item in gltf.get('buffers',[])+gltf.get('images',[]):
  if 'uri' in item:item['uri']=data(moss.parent/item['uri'])
 moss.write_text(json.dumps(gltf))
 scene=(src/'scene.js').read_text()
 scene=scene.replace("'./assets/water-bear-anatomical.json?v=4'",json.dumps(data(src/'assets/water-bear-anatomical.json')))
 scene=scene.replace("'./assets/moss/moss_01.gltf'",json.dumps(data(moss)))
 scene=scene.replace("'./assets/moss/textures/moss_01_alpha_1k.png'",json.dumps(data(src/'assets/moss/textures/moss_01_alpha_1k.png')))
 scene=scene.replace('storage=window.localStorage','storage=window.amberStorage||window.localStorage')
 scene=scene.replace('let dt=Math.min((now-last)/1000,.05);','if(window.amberActive===false||document.hidden){last=now;return;}let dt=Math.min((now-last)/1000,.05);')
 scene += '\nwindow.amberSave=()=>cozy.save();window.webkit?.messageHandlers.amber?.postMessage({type:"ready"});\n'
 (src/'scene.js').write_text(scene)
 subprocess.run([args.esbuild,str(src/'scene.js'),'--bundle','--format=esm','--target=safari18','--minify','--outfile='+str(tmp/'game.js')],check=True)
 html=(src/'index.html').read_text()
 html=re.sub(r'<link rel="stylesheet"[^>]+>',lambda _: '<style>'+(src/'cozy.css').read_text()+'</style>',html)
 js=(tmp/'game.js').read_text().replace('</script','<\\/script')
 html=re.sub(r'<script type="module" src="[^"]+"></script>',lambda _: '<script type="module">'+js+'</script>',html)
 css='''<style>canvas{touch-action:none}header{top:70px}h1{font-size:28px}.weather{top:78px}.treat-tray{top:160px}.focus,.hint,#body-toggle{display:none}.controls button{min-height:44px;min-width:44px}@media(max-height:500px){header{top:60px}h1{font-size:20px}header small,#feeding-status,#treat-caption,.weather,#mood,.scale{display:none}.treat-tray{top:110px;width:240px}.tray-label{display:none}.journal-link{top:60px;bottom:auto}.bottom{bottom:10px}.controls button{font-size:12px;padding:5px}.controls.pill{gap:0}}</style>'''
 html=html.replace('</html>',css+'</html>')
 (out/'amber-shallows.html').write_text(html)
 record={'schemaVersion':1,'gameKey':'amber-shallows','key':'runtime/microscope','revision':1,'source':{'type':'bundled','bundleName':'amber-shallows.html'},'mimeType':'text/html','sha256':hashlib.sha256(html.encode()).hexdigest(),'metadata':{'sourceRepository':'https://github.com/evanrobinson2/3d-tardigrade-demo','sourceRevision':'5276f83','offline':True}}
 (out/'amber-shallows-registry.json').write_text(json.dumps(record,indent=2)+'\n')
 shutil.copyfile(src/'vendor/LICENSE',out/'amber-shallows-three-license.txt')
 shutil.copyfile(src/'ASSETS.txt',out/'amber-shallows-assets.txt')
 print('Bundled',len(html.encode()),'bytes; all game resources embedded.')

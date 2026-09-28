"""Bundle the reviewed comic offline, without preview navigation or scrubbing."""
from pathlib import Path
import re, shutil, base64
root=Path(__file__).resolve().parents[1]
source=root/'prototypes/VoyagePrologue/web'
dest=root/'abbies.world.ios/abbies.world.ios/Resources/VoyageOpening.bundle'
dest.mkdir(parents=True,exist_ok=True)
js=(source/'rescue-cut.js').read_text()
assets=set(re.findall(r"src:'([^']+)'",js))|{'conflict/meadow.jpg','fonts/Roboto.ttf','fonts/OFL.txt','rescue-cut.css'}
for name in assets:
    target=dest/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(source/name,target)
# Data-backed texture avoids file-origin restrictions in WKWebView WebGL.
texture=base64.b64encode((source/'conflict/abbie.jpg').read_bytes()).decode()
js=js.replace("src:'conflict/abbie.jpg'","src:'data:image/jpeg;base64,"+texture+"'")
js=re.sub(r'^import .*?;\n','',js,flags=re.M)
js=js.replace('let time=0,playing=false','let time=0,playing=true')
js=js.replace("if(/INPUT|BUTTON|A/.test(e.target.tagName))return;",'return;')
js=js.replace("document.addEventListener('visibilitychange',()=>{if(document.hidden){playing=false;draw()}})","document.addEventListener('visibilitychange',()=>{playing=!document.hidden;last=performance.now();draw()})")
js=js.replace("end.hidden=time<total;", "end.hidden=true;if(time>=total&&!window.openingCompleted){window.openingCompleted=true;window.webkit.messageHandlers.voyageOpening.postMessage('complete');}")
# Fail safely if art or the renderer fails; never award completion on a broken cut.
js=js.replace("img.onerror=()=>{", "img.onerror=()=>{playing=false;window.webkit.messageHandlers.voyageOpening.postMessage('error');")
combined='window.addEventListener("error",e=>{window.openingError=e.message;window.webkit.messageHandlers.voyageOpening.postMessage("error")});\n'
for name in ['paper-layer.js','story-ink.js']:
    combined+='(()=>{\n'+(source/name).read_text().replace('export function ', 'function ')+f'\nwindow.{"paperLayer" if name=="paper-layer.js" else "storyInk"}={"paperLayer" if name=="paper-layer.js" else "storyInk"};\n}})();\n'
combined+=js
(dest/'game.js').write_text(combined)
html=(source/'rescue-cut.html').read_text().replace('<script type="module" src="rescue-cut.js"></script>','<script src="game.js"></script>')
html=html.replace('</head>','''<style>body{background:#000;padding:0}header,.controls,#chapters,.note,#end{display:none!important}main{position:fixed;inset:0;width:100%;max-width:none;padding:0;display:grid;place-items:center}#screen{width:min(100vw,177.7778vh);border:0;box-shadow:none}#stage{pointer-events:none}</style></head>''')
(dest/'index.html').write_text(html)
print(f'Packaged {len(assets)} offline assets into {dest}')

# Make prototypes/ranch-atelier/dist match the live Ranch Atelier site.
# 1) Re-download every file already here that the site serves (overwrite if different).
# 2) Follow quoted relative references from text files to fetch files that exist only on live.
import os,re,subprocess,hashlib
ROOT='prototypes/ranch-atelier/dist';BASE='https://abbies-ranch-atelier.vercel.app/'
SKIP=('tests/','api/','scripts/','mcp/','node_modules/','public-build/')
EXT=('.mjs','.js','.cjs','.css','.html','.json','.glb','.gltf','.png','.jpg','.jpeg','.webp','.svg','.gif','.mp3','.ogg','.wav','.ttf','.woff','.woff2','.bin','.ktx2','.hdr','.txt','.webm','.mp4')
TEXT=('.mjs','.js','.css','.html','.json','.svg')
REF=re.compile(r'''['"(`]((?:\.{1,2}/|/)?[A-Za-z0-9_\-./]+?(?:'''+'|'.join(re.escape(e) for e in EXT)+r'''))(?:\?[^'"`)\s]*)?['"`)]''')
def fetch(rel,dest):
  tmp=dest+'.live-tmp'
  r=subprocess.run(['curl','-fsSL','--retry','2','--max-time','60',BASE+rel,'-o',tmp])
  if r.returncode!=0:
    if os.path.exists(tmp):os.remove(tmp)
    return False
  os.replace(tmp,dest);return True
changed=added=0;queue=[];seen=set()
for r,ds,fs in os.walk(ROOT):
  for f in fs:
    p=os.path.join(r,f);rel=os.path.relpath(p,ROOT).replace(os.sep,'/')
    if rel.startswith(SKIP) or rel.endswith('.md') or rel in ('vercel.json','package.json','.vercelignore'):continue
    seen.add(rel);before=hashlib.sha1(open(p,'rb').read()).hexdigest()
    if fetch(rel,p):
      if hashlib.sha1(open(p,'rb').read()).hexdigest()!=before:changed+=1;print('CHANGED',rel)
    if rel.endswith(TEXT):queue.append(p)
while queue:
  p=queue.pop()
  try:s=open(p,encoding='utf8',errors='ignore').read()
  except Exception:continue
  base=os.path.dirname(os.path.relpath(p,ROOT).replace(os.sep,'/'))
  if p.endswith('.html'):
    m=re.search(r'<base href="(/[^"]*)"',s)
    if m:base=m.group(1).strip('/')
  for m in REF.finditer(s):
    ref=m.group(1)
    if '//' in ref:continue
    t=ref.lstrip('/') if ref.startswith('/') else os.path.normpath(os.path.join(base,ref)).replace(os.sep,'/')
    if t.startswith(('..','.')) or t in seen or t.startswith(SKIP):continue
    seen.add(t);dest=os.path.join(ROOT,t)
    if os.path.exists(dest):continue
    os.makedirs(os.path.dirname(dest) or '.',exist_ok=True)
    if fetch(t,dest):
      added+=1;print('ADDED',t)
      if t.endswith(TEXT):queue.append(dest)
print('changed',changed,'added',added)

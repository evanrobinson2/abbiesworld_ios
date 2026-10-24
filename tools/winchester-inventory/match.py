import json,re,sys
sys.dont_write_bytecode=True
from inventory import R
LIB=json.load(open('../../prototypes/ranch-atelier/dist/models/library.json'))['items']
CAT={c['glb']:c for c in json.load(open('../../prototypes/ranch-atelier/dist/simulations/abbietown/props-catalogue.json'))}
M=[i for i in LIB if i.get('level')=='model' and i['type']!='Armour and wear' and i['collection'] not in ('Sandbox copies','Gateway art lab (AI model comparison)','Unreal intake (UE5 branch)')]
def run():
    out=[]
    for n,(cat,grp,name,rx,size,pri,real,note) in enumerate(R,1):
        kws=rx.split('|')
        hits=[]
        for m in M:
            nm=m['name'].lower()
            for k,kw in enumerate(kws):
                if re.search(r'\b'+re.escape(kw)+r's?\b',nm):
                    hits.append((k,m['pass']!='Upgrade',len(nm),m)); break
        hits.sort(key=lambda h:h[:3])
        # strong = the entry's first (most specific) keyword hit, loose = a generic fallback keyword
        strong=[h for h in hits if h[0]==0]
        st='have' if strong else ('loose' if hits else 'missing')
        pick=(strong or hits)[:3]
        out.append(dict(id=f'W{n:03d}',cat=cat,grp=grp,name=name,size=size,pri=pri,real=bool(real),note=note,status=st,
          total=len(strong or hits),
          matches=[dict(n=h[3]['name'],k=h[3]['key'],c=h[3]['collection'],up=h[3]['pass']=='Upgrade',g=h[3]['glb'],ingame=h[3]['glb'] in CAT) for h in pick]))
    return out
if __name__=='__main__':
    o=run()
    import collections
    print(collections.Counter(x['status'] for x in o))
    for x in o: print(x['id'],x['status'],x['name'],'->',[m['n'] for m in x['matches']][:2])

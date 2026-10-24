import json,re,sys
sys.dont_write_bytecode=True
ST={'the','a','an','and','with','of','in','on','for','at','to','small','big','little','old','new','friendly','by','x3','x6','family','kid','shop','store','run','place'}
ALIAS={'weather vane':'weathervane','utility pole':'telephone pole','wooden utility pole':'telephone pole','pizza place':'comella pizza','pizza parlour':'comella pizza','treehouse':'tree house','cape cod':'house','historic colonial':'colonial house','kick scooter':'scooter','gray squirrel':'grey squirrel','neighbor':'neighbour'}
def toks(n):
    n=re.sub(r'\(.*?\)','',n.lower())
    for k,v in ALIAS.items(): n=n.replace(k,v);return {w.rstrip('s') for w in re.findall(r'[a-z]+',n) if w not in ST and len(w)>1}
def dup(a,b):
    ta,tb=toks(a),toks(b)
    if not ta or not tb: return False
    i=len(ta&tb);return i/min(len(ta),len(tb))>=.67 and i>=1 and (i>=2 or min(len(ta),len(tb))==1)
GAPS=json.load(open('/tmp/claude-0/gaps.json'))['rows']
def merged(rows):
    pairs=[];new=[]
    for g in GAPS:
        hit=[r for r in rows if r['cat']==g['g'] and dup(r['name'],g['n'])]
        if hit: pairs.append((hit[0],g))
        else: new.append(g)
    return pairs,new
if __name__=='__main__':
    import match
    rows=match.run(); p,n=merged(rows)
    print(len(p),len(n))
    for a,g in p[:60]: print(a['name'],'<->',g['n'])
    print('---NEW');
    for g in n: print(g['g'],g['n'],g['st'],g['m'],g['p'],g['ex'][:1])

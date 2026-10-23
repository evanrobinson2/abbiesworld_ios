"""Fetch the OCR text of Gray's Anatomy (1918, public domain) from Wikisource, one file per scan page.
Usage: python3 gray_fetch.py [last_page] [out_dir]. Pages land in out_dir/NNNN.txt (default /tmp/gray/pages);
they are a cache and are not committed. gray_extract.py turns them into sources/gray1918/excerpts.json."""
import re, html, os, sys, time, urllib.request, concurrent.futures as cf
OUT = sys.argv[2] if len(sys.argv) > 2 else '/tmp/gray/pages'
os.makedirs(OUT, exist_ok=True)
def get(n):
    fn=f'{OUT}/{n:04d}.txt'
    if os.path.exists(fn) and os.path.getsize(fn)>0: return n,'cached'
    url=f'https://en.wikisource.org/w/index.php?title=Page:Anatomy_of_the_Human_Body_(1918).djvu/{n}&action=edit'
    for a in range(4):
        try:
            req=urllib.request.Request(url,headers={'User-Agent':'AbbiesWorld-study/1.0 (anatomy study; public-domain text)'})
            s=urllib.request.urlopen(req,timeout=30).read().decode('utf8','replace')
            m=re.findall(r'<textarea[^>]*>(.*?)</textarea>',s,re.S)
            txt=html.unescape(m[1]) if len(m)>1 else ''
            open(fn,'w').write(txt); return n,len(txt)
        except Exception as e:
            time.sleep(2*(a+1))
    return n,'fail'
N=int(sys.argv[1]) if len(sys.argv)>1 else 1450
with cf.ThreadPoolExecutor(4) as ex:
    for n,r in ex.map(get, range(1,N+1)):
        if n%100==0 or r=='fail': print(n,r,flush=True)

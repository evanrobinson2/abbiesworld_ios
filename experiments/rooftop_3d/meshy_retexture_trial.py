"""One resumable Meshy retexture job. Credentials stay in process memory, never files."""
import argparse, base64, getpass, hashlib, json, os, sys, time
import urllib.request, urllib.error, urllib.parse
from pathlib import Path

ROOT=Path(__file__).resolve().parent/'meshy_trial'
BASE='https://api.meshy.ai/openapi/v1'
PROMPT=('Warm storybook treehouse architectural timber. Weathered dark mulberry-brown cherry wood, '
        'subtle dusky plum undertones, fine flowing grain aligned with the length of each beam, '
        'small natural knots and fine fissures, softly rubbed reddish amber edges, softly aged handmade joinery. '
        'The circular wooden window surround has wood grain that curves around its ring. '
        'All surfaces are solid wood, including the thin window lattice bars. Matte satin finish, '
        'rich detailed tactile wood but gentle and inviting, refined fantasy illustration realism. '
        'Consistent material over all sides. No leaves, flowers, moss, dirt clumps, metal, lettering, '
        'ornaments or painted symbols. Neutral even illumination, no baked cast shadows or highlights.')

def save(name,value):
    (ROOT/name).write_text(json.dumps(value,indent=2)+'\n')

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,req,fp,code,msg,headers,newurl):return None

def main():
    global ROOT, PROMPT
    parser=argparse.ArgumentParser()
    parser.add_argument('--trial-dir',default='meshy_trial')
    parser.add_argument('--model',default='window-timber-input.glb')
    parser.add_argument('--output',default='window-timber-textured.glb')
    parser.add_argument('--prompt-file')
    args=parser.parse_args()
    ROOT=Path(__file__).resolve().parent/args.trial_dir
    if args.prompt_file:PROMPT=Path(args.prompt_file).read_text().strip()
    assert len(PROMPT)<=800,'Meshy text style prompt exceeds 800 characters'
    ROOT.mkdir(exist_ok=True)
    key=os.environ.get('MESHY_API_KEY','').strip()
    if not key:
        if not sys.stdin.isatty():raise RuntimeError('A private terminal or MESHY_API_KEY is required.')
        key=getpass.getpass('Meshy key (hidden): ').strip()
    if not key:raise RuntimeError('No credential supplied.')
    opener=urllib.request.build_opener(NoRedirect)
    def request(method,path,body=None):
        data=None if body is None else json.dumps(body).encode()
        req=urllib.request.Request(BASE+path,data=data,method=method,
            headers={'Authorization':'Bearer '+key,'Content-Type':'application/json','Accept':'application/json'})
        try:
            with opener.open(req,timeout=120) as response:return json.load(response)
        except urllib.error.HTTPError as error:
            detail=error.read().decode(errors='replace').replace(key,'[redacted]')
            raise RuntimeError(f'Meshy HTTP {error.code}: {detail[:600]}') from None
        except urllib.error.URLError as error:
            raise RuntimeError('Meshy network request failed: '+str(error.reason).replace(key,'[redacted]')) from None

    # Read-only authentication check avoids creating a paid job if the key is unusable.
    request('GET','/retexture?page_size=1')
    print('Meshy authentication verified.',flush=True)
    state_path=ROOT/'job.json'
    if state_path.exists():
        state=json.loads(state_path.read_text());task=state['task_id']
        print('Resuming the existing texture trial; no duplicate request.',flush=True)
    else:
        if (ROOT/'submission-started.json').exists():
            raise RuntimeError('Prior submission may have reached Meshy; inspect the account before creating another task.')
        model=ROOT/args.model
        options={'ai_model':'meshy-6','text_style_prompt':PROMPT,'enable_original_uv':True,
                 'enable_pbr':True,'texture_resolution':'4k','remove_lighting':True,'target_formats':['glb']}
        save('request.json',{'input_model':model.name,'input_sha256':hashlib.sha256(model.read_bytes()).hexdigest(),
                             'options':options,'documented_credit_cost':10,'reference':'../references/rooftop-source.png',
                             'reference_used':'Human-readable material description from the reference; image is not uploaded.'})
        data=dict(options);data['model_url']='data:application/octet-stream;base64,'+base64.b64encode(model.read_bytes()).decode()
        # Never retry a POST automatically: an ambiguous response could already have created a task.
        save('submission-started.json',{'created_utc':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'model_sha256':hashlib.sha256(model.read_bytes()).hexdigest()})
        created=request('POST','/retexture',data);task=created['result']
        state={'task_id':task,'status':'PENDING','provider':'Meshy','created_utc':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())}
        save('job.json',state);print('One 4K texture trial submitted (10 documented credits).',flush=True)
    last=None
    while True:
        result=request('GET','/retexture/'+task)
        status=result['status'];progress=result.get('progress',0)
        state.update(status=status,progress=progress,consumed_credits=result.get('consumed_credits'))
        save('job.json',state)
        if (status,progress)!=last:
            print(f'Meshy: {status} {progress}%',flush=True);last=(status,progress)
        if status=='SUCCEEDED':break
        if status in ('FAILED','CANCELED','EXPIRED'):
            raise RuntimeError('Texture task ended: '+status+' '+str(result.get('task_error',{})).replace(key,'[redacted]'))
        time.sleep(15)
    files=[]
    def download(url,name):
        parsed=urllib.parse.urlparse(url)
        if parsed.scheme!='https' or not parsed.hostname or not parsed.hostname.endswith('.meshy.ai'):
            raise RuntimeError('Unexpected asset download host; preserved task for inspection.')
        path=ROOT/name
        with urllib.request.urlopen(url,timeout=180) as response:path.write_bytes(response.read())
        files.append({'file':name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'bytes':path.stat().st_size,
                      'source':urllib.parse.urlunparse(parsed._replace(query='',fragment=''))})
    download(result['model_urls']['glb'],args.output)
    for i,maps in enumerate(result.get('texture_urls',[])):
        for kind,url in maps.items():
            if url:download(url,f'texture-{i}-{kind}.png')
    save('provenance.json',{'provider':'Meshy','task_id':task,'ai_model':'meshy-6',
         'prompt':PROMPT,'consumed_credits':result.get('consumed_credits'),'files':files,
         'status':'Generated candidate; pending Blender visual review'})
    print('Texture trial downloaded for Blender review.',flush=True)

if __name__=='__main__':
    try:main()
    except Exception as error:
        print(str(error),file=sys.stderr);sys.exit(1)

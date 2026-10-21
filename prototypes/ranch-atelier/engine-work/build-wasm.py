from pathlib import Path
import subprocess,hashlib,json,os
r=Path(__file__).resolve().parent;source=r.parent/'dist/simulations/simulation/compiled/navigation.c';out=source.with_suffix('.wasm');compiler=os.environ.get('WASI_CC','/private/tmp/ranch-wasi-sdk/wasi-sdk-34.0-arm64-macos/bin/clang')
args=[compiler,'-O3','-ffp-contract=off','-mexec-model=reactor','-Wl,--export=obstacle_buffer','-Wl,--export=peer_buffer','-Wl,--export=result_buffer','-Wl,--export=avoid_pen_step','-Wl,--export-memory',str(source),'-lm','-o',str(out)]
subprocess.run(args,check=True);meta={'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'wasmSha256':hashlib.sha256(out.read_bytes()).hexdigest(),'compiler':subprocess.check_output([compiler,'--version'],text=True),'flags':args[1:-5],'bytes':out.stat().st_size};out.with_suffix('.build.json').write_text(json.dumps(meta,indent=2));print(meta['bytes'],'bytes',meta['wasmSha256'])

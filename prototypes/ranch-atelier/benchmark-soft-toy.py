import time, pathlib, json
t0=time.perf_counter()
root=pathlib.Path(__file__).parent
source=(root/'create-asset-studies.py').read_text()
exec(source.split('manifest=[]')[0].replace("OUT=os.path.join(os.path.dirname(__file__),'dist','asset-studies')", "OUT=os.path.join(os.path.dirname(__file__),'benchmark-soft-toy')"))
style=1
def trough():
 shape('Base',(0,0,.16),(.8,.4,.1),'roof')
 for y in [-.4,.4]:shape('Side',(0,y,.4),(.8,.06,.25),'roof')
 for x in [-.8,.8]:shape('End',(x,0,.4),(.06,.4,.25),'roof')
 shape('Water',(0,0,.44),(.73,.33,.015),'light')
def bale():
 shape('Hay',(0,0,.35),(.55,.35,.35),'cream')
 for x in [-.3,.3]:shape('Binding',(x,0,.35),(.025,.36,.36),'wood')
def bucket():
 shape('Bucket',(0,0,.3),(.3,.3,.3),'roof','cylinder')
 for x in [-.3,.3]:beam('Handle side',(x,0,.5),(x,0,.85),.025,'dark')
 beam('Grip',(-.3,0,.85),(.3,0,.85),.035,'wood')
def crate():
 for y in [-.38,.38]:
  for z in [.15,.35,.55]:shape('Slat',(0,y,z),(.5,.045,.08),'wood')
 for x in [-.5,.5]:
  for z in [.15,.35,.55]:shape('End',(x,0,z),(.045,.38,.08),'wood')
 shape('Base',(0,0,.05),(.5,.38,.05),'wood')
def fence():
 for x in [-.9,.9]:shape('Post',(x,0,.65),(.08,.08,.65),'wood')
 for z in [.45,1]:beam('Rail',(-.9,0,z),(.9,0,z),.055,'cream')
def barrel():
 shape('Barrel',(0,0,.55),(.4,.4,.55),'wood','cylinder')
 for z in [.12,.9]:shape('Hoop',(0,0,z),(.415,.415,.035),'dark','cylinder')
def bench():
 shape('Seat',(0,0,.5),(.8,.3,.08),'wood')
 for x in [-.6,.6]:
  for y in [-.2,.2]:shape('Leg',(x,y,.25),(.06,.06,.25),'wood')
 shape('Back',(0,.3,.85),(.8,.06,.2),'roof')
rows=[]
for idx,(name,build) in enumerate([('horse',horse),('shelter',shelter),('tree',tree),('trough',trough),('hay-bale',bale),('bucket',bucket),('crate',crate),('fence',fence),('barrel',barrel),('bench',bench)]):
 bpy.ops.object.select_all(action='DESELECT');before=set(bpy.data.objects);start=time.perf_counter();build();objects=[o for o in bpy.data.objects if o not in before];model_time=time.perf_counter()-start
 for o in objects:o.select_set(True)
 start=time.perf_counter();bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,name+'.glb'),export_format='GLB',use_selection=True);export_time=time.perf_counter()-start
 triangles=0
 for o in objects:o.data.calc_loop_triangles();triangles+=len(o.data.loop_triangles);o.location.x+=(idx%5)*4;o.location.y+=(idx//5)*4
 rows.append(dict(name=name,model_seconds=model_time,export_seconds=export_time,triangles=triangles,bytes=os.path.getsize(os.path.join(OUT,name+'.glb'))))
start=time.perf_counter();bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'ten-soft-toy-assets.blend'));save_seconds=time.perf_counter()-start
result=dict(count=len(rows),note='Three existing subject builders and seven newly scripted prop builders; static meshes, no rigging or production acceptance.',model_seconds=sum(r['model_seconds'] for r in rows),export_seconds=sum(r['export_seconds'] for r in rows),blend_save_seconds=save_seconds,script_seconds=time.perf_counter()-t0,assets=rows)
with open(os.path.join(OUT,'timings.json'),'w') as f:json.dump(result,f,indent=2)
print('BENCHMARK_RESULT '+json.dumps(result))

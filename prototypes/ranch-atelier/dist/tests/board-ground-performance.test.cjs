const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('batched ground retains all tile hit surfaces and metre geometry',async()=>{
 const T=await import('../vendor/three.module.js'),grid=await import('../playground-model.js'),{BOARD_CELLS}=await import('../board-terrain.js');
 const source=fs.readFileSync(require('node:path').join(__dirname,'../board.js'),'utf8');
 const context={T,BOARD_CELLS,...grid,S:.1,R:50,plantForest(){}};vm.createContext(context);
 vm.runInContext(source.slice(source.indexOf('function buildGround('),source.indexOf('function plantForest(')),context);
 const ground=context.buildGround({instances:[],cards:{}},()=>10),hits=ground.children.filter(o=>o.userData.cell),visible=ground.children.filter(o=>o.material.visible);
 assert.equal(hits.length,100);assert.equal(visible.length,3);
 const land=visible.find(o=>o.material.vertexColors);assert.equal(land.geometry.attributes.position.count/3,117600);
 ground.updateMatrixWorld(true);const center=grid.cellWorld(BOARD_CELLS[0]);const ray=new T.Raycaster(new T.Vector3(center.x*.1,5,center.z*.1),new T.Vector3(0,-1,0));
 assert.deepEqual(ray.intersectObjects(hits,false)[0].object.userData.cell,BOARD_CELLS[0]);
 assert.equal(ray.intersectObjects(hits,false)[0].point.y,1);
 ground.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
});

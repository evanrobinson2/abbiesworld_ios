const test=require('node:test'),assert=require('node:assert/strict');
test('coast preserves dry yards and every shared hex edge while shaping a submerged bed',async()=>{
 const {createCoastSurface}=await import('../coast-surface.js');const base=(x,z)=>20+x*.01+z*.02;
 for(let rotation=0;rotation<6;rotation++){const center={x:100,z:-75},s=createCoastSurface({baseHeightAt:base,coasts:[{id:'shore',center,rotation,waterLevel:18.8}]}),a=rotation*Math.PI/3,world=(x,z)=>({x:center.x+x*Math.cos(a)+z*Math.sin(a),z:center.z-x*Math.sin(a)+z*Math.cos(a)});
  const dry=world(0,10),wet=world(0,25);assert.equal(s.heightAt(dry.x,dry.z),base(dry.x,dry.z));assert(!s.isWater(dry.x,dry.z));assert(s.isWater(wet.x,wet.z));assert(s.heightAt(wet.x,wet.z)<18.8);assert.equal(s.surfaceAt(wet.x,wet.z).walkable,false);assert.equal(s.coasts[0].waterLevel,18.8);
  for(let edge=0;edge<6;edge++)for(let j=0;j<=10;j++){const p={x:50*Math.sin(edge*Math.PI/3),z:50*Math.cos(edge*Math.PI/3)},q={x:50*Math.sin((edge+1)*Math.PI/3),z:50*Math.cos((edge+1)*Math.PI/3)},v=world(p.x+(q.x-p.x)*j/10,p.z+(q.z-p.z)*j/10);assert(Math.abs(s.heightAt(v.x,v.z)-base(v.x,v.z))<1e-10);assert(!s.isWater(v.x,v.z));}
  const far=world(100,100);assert.equal(s.heightAt(far.x,far.z),base(far.x,far.z));
 }
});
test('dry corridor requires continuous clearance and rejects water thinner than verifier sampling',async()=>{
 const {createCoastSurface}=await import('../coast-surface.js'),{createJoinVerifier}=await import('../board-join-verifier.js');const thin=[{x:.12,z:20},{x:.14,z:20},{x:.14,z:30},{x:.12,z:30}],s=createCoastSurface({baseHeightAt:()=>2,coasts:[{id:'thin',center:{x:0,z:0},rotation:0,waterLevel:0,wetPolygonLocal:thin}]});
 assert(!s.coversDryCorridor({x:-1,z:25},{x:1,z:25},.01));assert(s.coversDryCorridor({x:-2,z:10},{x:2,z:10},.6));
 const h=Object.assign(s.heightAt,s),board={id:'water',revision:1},verify=createJoinVerifier({boardId:board.id,boardRevision:1,heightAt:h,contains:()=>true,obstacles:[],obstaclesComplete:true});const point=x=>({x,z:25,y:h(x,25)});assert.equal(verify({signature:'no-bridge',access:{a:point(-1),b:point(1)},supportId:'decorative-boat'},board),null);
 const standard=createCoastSurface({baseHeightAt:()=>2,coasts:[{center:{x:0,z:0},rotation:0,waterLevel:0}]});assert(!standard.coversDryCorridor({x:-2,z:15.5},{x:2,z:15.5},.6));assert(standard.coversDryCorridor({x:-2,z:14},{x:2,z:14},.6));assert(!standard.coversDryCorridor({x:0,z:25},{x:0,z:25},.6));assert(!standard.coversDryCorridor({x:NaN,z:0},{x:0,z:0},.6));
});
test('malformed or seam-crossing wet polygons reject; inland surfaces remain unchanged',async()=>{
 const {createCoastSurface}=await import('../coast-surface.js'),base=(x,z)=>x-z,s=createCoastSurface({baseHeightAt:base});assert.equal(s.heightAt(8,3),5);assert(!s.isWater(8,3));assert(s.coversDryCorridor({x:0,z:0},{x:1,z:1}));assert.throws(()=>createCoastSurface({baseHeightAt:base,coasts:[{center:{x:0,z:0},rotation:0,waterLevel:0,wetPolygonLocal:[{x:-50,z:10},{x:50,z:10},{x:0,z:50}]}]}),/geometry/);
});

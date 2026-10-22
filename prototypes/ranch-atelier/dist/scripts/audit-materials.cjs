const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
async function audit(){
 const {materialRole,MATERIAL_ROLES,COMPOSITION_LANGUAGE,VISUAL_PROFILE}=await import('../material-policy.js');
 const folders=['simulation-assets','domestic-assets','coastal-assets','garden-assets','woodland-assets','castle-assets','sets-media','asset-studies'];
 const rows=[],unknown=new Map();
 function scan(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?scan(path.join(dir,e.name)):e.name.endsWith('.glb')?[path.join(dir,e.name)]:[]);}
 for(const folder of folders)for(const file of scan(path.join(root,folder))){
  const bytes=fs.readFileSync(file),g=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));
  const surfaces=(g.materials||[]).map((m,index)=>{
   const role=materialRole(m.name||'');
   if(role==='plain')unknown.set(m.name||'(unnamed)',(unknown.get(m.name||'(unnamed)')||0)+1);
   return {index,name:m.name||'',role,sourceColor:m.pbrMetallicRoughness?.baseColorFactor||[1,1,1,1],response:role==='plain'?'preserve source':MATERIAL_ROLES[role],language:COMPOSITION_LANGUAGE[role]};
  });
  rows.push({path:path.relative(root,file).replaceAll('\\','/'),sha256:crypto.createHash('sha256').update(bytes).digest('hex'),surfaces,textures:(g.textures||[]).length,clips:(g.animations||[]).length,skins:(g.skins||[]).length});
 }
 const result={profile:VISUAL_PROFILE,modelFiles:rows.length,scope:'Integrated local model files, not distinct base count. Language is guidance, not implemented placement or simulation.',geometryModified:false,texturesAdded:false,automaticAnimation:false,unknownMaterials:[...unknown].map(([name,uses])=>({name,uses})).sort((a,b)=>b.uses-a.uses),models:rows};
 const out=process.argv[2]||path.join(root,'model-visual-index.json');fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({models:rows.length,surfaceSlots:rows.reduce((n,r)=>n+r.surfaces.length,0),unassignedNames:unknown.size,output:out}));
}
audit().catch(e=>{console.error(e);process.exitCode=1;});

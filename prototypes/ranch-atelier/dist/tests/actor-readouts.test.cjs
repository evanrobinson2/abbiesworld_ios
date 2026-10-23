const test=require('node:test'),assert=require('node:assert/strict');
test('Readouts retain actor nodes and perform zero writes for an unchanged refresh',async()=>{
 const {reconcileReadouts,writeText}=await import('../actor-readouts.mjs');let writes=0;const children=[],nodes=new Map();global.document={createElement(){let text='';return {get textContent(){return text},set textContent(v){writes++;text=v},remove(){writes++;children.splice(children.indexOf(this),1)}}}};const container={append(node){writes++;children.push(node)}};
 const rows=Array.from({length:512},(_,i)=>({id:'a'+i,text:'Actor '+i+' · 5/5 HP · idle'}));reconcileReadouts(container,rows,nodes);const first=nodes.get('a0');writes=0;reconcileReadouts(container,rows,nodes);assert.equal(writes,0);assert.equal(nodes.get('a0'),first);
 rows[0].text='Actor 0 · 4/5 HP · fleeing';reconcileReadouts(container,rows,nodes);assert.equal(writes,1);assert.equal(nodes.get('a0'),first);rows.pop();reconcileReadouts(container,rows,nodes);assert.equal(writes,2);assert.equal(children.length,511);writeText(first,first.textContent);assert.equal(writes,2);delete global.document;
});

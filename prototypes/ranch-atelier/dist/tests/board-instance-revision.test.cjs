const test=require('node:test'),assert=require('node:assert/strict');
test('instance revision forks one card, preserves transforms and supports undo/redo',async()=>{
 const {replaceComposition,compositionHistory}=await import('../board-state.js');
 const card={id:'source',revision:1,cells:[{q:0,r:0}],rendition:{scene:{object:{}}},recipe:{seed:41}};
 const board={version:1,id:'b',revision:4,cards:{'source@1':card},instances:[{instanceId:'a',cardId:'source',cardRevision:1,q:0,r:0,rotation:2},{instanceId:'b',cardId:'source',cardRevision:1,q:2,r:0,rotation:0}]};
 const history=compositionHistory(board),replacement={...card,id:'fork',recipe:{seed:42}};
 const next=replaceComposition(board,'a',replacement);history.commit(next);
 assert.equal(next.revision,5);assert.equal(next.instances[0].cardId,'fork');assert.equal(next.instances[0].rotation,2);assert.equal(next.instances[0].q,0);assert.equal(next.instances[1].cardId,'source');assert.equal(board.instances[0].cardId,'source');assert.equal(board.cards['source@1'].recipe.seed,41);
 const undo=history.peek('undo');history.accept('undo',undo);assert.equal(undo.instances[0].cardId,'source');const redo=history.peek('redo');assert.equal(redo.instances[0].cardId,'fork');
 assert.throws(()=>replaceComposition(board,'missing',replacement),/Select a tile/);assert.throws(()=>replaceComposition(board,'a',card),/new card identity/);
 const overlap={...replacement,cells:[{q:0,r:0},{q:0,r:-2}]};assert.throws(()=>replaceComposition(board,'a',overlap),/overlap/);assert.equal(board.revision,4);
});
test('every registered tile type has a concise control design',async()=>{const {SCENE_TYPES}=await import('../scene-registry.js'),{TILE_CONTROLS}=await import('../tile-control-design.js');for(const id of Object.keys(SCENE_TYPES))assert(TILE_CONTROLS[id]?.choice&&TILE_CONTROLS[id]?.focus,id);});

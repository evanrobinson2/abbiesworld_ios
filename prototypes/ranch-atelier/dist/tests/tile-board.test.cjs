const test=require('node:test'),assert=require('node:assert/strict');
const modulePromise=import('../tile-board.js');
test('seven fixed metre cells share touching hex edges',async()=>{const m=await modulePromise;assert.equal(m.CELLS.length,7);for(let i=1;i<7;i++){const c=m.cellCenter(i);assert(Math.abs(Math.hypot(c.x,c.z)-Math.sqrt(3)*m.RADIUS_METRES)<1e-9);}});
test('placement swaps occupied cells without changing seeds; six rotations return home',async()=>{const m=await modulePromise,b=m.initialBoard(),seeds=b.tiles.map(t=>t.seed);m.moveTile(b,'ranch',1);assert.equal(b.tiles[1].cell,0);assert.equal(b.tiles[0].cell,1);for(let i=0;i<6;i++)m.rotateTile(b,'ranch');assert.equal(b.tiles[0].rotation,0);assert.deepEqual(b.tiles.map(t=>t.seed),seeds);assert(m.validateBoard(b));assert.throws(()=>m.moveTile(b,'ranch',9));b.tiles[0].cell=b.tiles[1].cell;assert.equal(m.validateBoard(b),false);});

test('scene types survive moves and old layouts remain valid',async()=>{const m=await modulePromise,b=m.initialBoard();assert(m.validateBoard(b));b.tiles[0].type='pond';m.moveTile(b,'ranch',1);assert.equal(b.tiles[0].type,'pond');assert(m.validateBoard(JSON.parse(JSON.stringify(b))));b.tiles[0].type='unknown';assert.equal(m.validateBoard(b),false);});

test('board and generator use the same physical tile size independently of scene bounds',async()=>{
 const {TILE_METRICS,RENDER_UNITS_PER_METRE}=await import('../tile-metrics.js');
 const grid=await import('../playground-model.js'),tiles=await modulePromise;
 assert.equal(TILE_METRICS.pointToPoint,100);
 assert.equal(grid.HEX_RADIUS,tiles.RADIUS_METRES);
 for(let i=0;i<tiles.CELLS.length;i++)assert.deepEqual(grid.cellWorld(tiles.CELLS[i]),tiles.cellCenter(i));
 const placement={q:2,r:1,rotation:0},card={cells:[{q:0,r:0}],rendition:{bounds:{width:12}}};
 const footprint=grid.instanceCells(placement,card);card.rendition.bounds.width=90;
 assert.deepEqual(grid.instanceCells(placement,card),footprint);
 assert.equal(RENDER_UNITS_PER_METRE,.1);
 assert(Object.isFrozen(TILE_METRICS));
});

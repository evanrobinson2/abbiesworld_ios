// Axial hex coordinates: shape is independent of the places generated inside it.
export const SHAPES={
 homestead:{name:'Single',cells:[[0,0]]},
 pasture:{name:'Pair',cells:[[0,0],[1,0]]},
 working:{name:'Cluster',cells:[[0,0],[1,0],[0,1]]},
 line:{name:'Line',cells:[[0,0],[1,0],[2,0],[3,0]]},
 elbow:{name:'Elbow',cells:[[0,0],[1,0],[2,0],[2,1]]},
 zigzag:{name:'Zigzag',cells:[[0,0],[1,0],[1,1],[2,1]]},
 fork:{name:'Fork',cells:[[0,0],[1,0],[-1,1],[0,-1]]},
 diamond:{name:'Diamond',cells:[[0,0],[1,0],[0,1],[1,1]]},
 crescent:{name:'Crescent',cells:[[0,0],[1,0],[2,-1],[2,-2],[1,-2]]},
 flower:{name:'Flower',cells:[[0,0],[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]]}
};
export function shapeTiles(id,diameter,seed){const shape=SHAPES[id]||SHAPES.homestead,r=diameter/2;return shape.cells.map(([q,s],i)=>{const type=i===0?'ranch':i===1?'paddock':i===2?'crop':'meadow';return {id:i<3?type:`meadow-${i}`,type,cell:i,center:{x:Math.sqrt(3)*r*(q+s/2),z:1.5*r*s},rotation:0,seed:seed+i*43};});}
export function shapeIcon(id,fit=false){const points=(SHAPES[id]||SHAPES.homestead).cells.map(([q,r])=>[Math.sqrt(3)*(q+r/2),1.5*r]);const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),w=fit?Math.max(...xs)-Math.min(...xs)+2:2+3*Math.sqrt(3),h=fit?Math.max(...ys)-Math.min(...ys)+2:5,x=(Math.min(...xs)+Math.max(...xs)-w)/2,y=(Math.min(...ys)+Math.max(...ys)-h)/2;return `<svg viewBox="${x} ${y} ${w} ${h}" aria-hidden="true">${points.map(([a,b])=>`<polygon points="${Array.from({length:6},(_,i)=>`${a+Math.sin(i*Math.PI/3)},${b+Math.cos(i*Math.PI/3)}`).join(' ')}"/>`).join('')}</svg>`;}

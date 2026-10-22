// Presentation only: no inventory, damage, route or simulation mutations.
export function body(){return{x:0,z:0,vx:0,vz:0};}
export function advance(b,dt,{dx=0,dz=0,anchorX=0,anchorZ=0,radius=9.3,elasticity=12,damping=3.4,reduced=false}={}){
 if(!Number.isFinite(dt)||dt<0)throw Error('Finite nonnegative time required');
 if(reduced){Object.assign(b,body());return b;}
 // Opposite displacement gives contents inertia even with irregular pointer events.
 b.x-=Math.max(-12,Math.min(12,dx))*.8;b.z-=Math.max(-12,Math.min(12,dz))*.8;
 const duration=Math.min(dt,.1),steps=Math.max(1,Math.ceil(duration/(1/120))),h=duration/steps;
 for(let i=0;i<steps;i++){
  b.vx+=(-elasticity*b.x-damping*b.vx)*h;b.vz+=(-elasticity*b.z-damping*b.vz)*h;b.x+=b.vx*h;b.z+=b.vz*h;
  // Six padded glass walls; reflected velocity and spring return, never damage.
  for(let k=0;k<6;k++){const a=k*Math.PI/3,nx=Math.cos(a),nz=Math.sin(a),over=(anchorX+b.x)*nx+(anchorZ+b.z)*nz-radius;
   if(over>0){b.x-=over*nx;b.z-=over*nz;const speed=b.vx*nx+b.vz*nz;if(speed>0){b.vx-=1.35*speed*nx;b.vz-=1.35*speed*nz;}}}
 }
 return b;
}

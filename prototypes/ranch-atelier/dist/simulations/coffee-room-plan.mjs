// Level 1 units are metres; one floor hex is one human standing-space, not occupancy.
export const COFFEE_ROOM={version:2,width:12,depth:10,wallHeight:3.4,hexAcross:1,humanHeight:1.7,
 entrance:{x:0,z:5,width:1.6},counter:{x:-1.35,z:-2.1,width:7.3,depth:1.05,height:1.05},
 tables:[{id:'window-table',x:4,z:-1.1,r:.65},{id:'conversation-table',x:3.5,z:2.5,r:.7},{id:'reading-table',x:-3.7,z:2.5,r:.65},{id:'shared-table',x:-3.8,z:.05,r:.65,chairAngles:[Math.PI/2,Math.PI*1.5]}],
 routes:[{id:'arrival',points:[[0,5],[0,3],[.4,1],[.4,-1.05]],width:1.2},{id:'east-seating',points:[[0,3],[1.7,2.5],[1.7,-1]],width:1},{id:'west-seating',points:[[0,3],[-1.5,2.5],[-1.5,0]],width:1},{id:'staff',points:[[4,-3.4],[1,-3.4],[-4.7,-3.4]],width:1.1}],
 simulation:'Room is modeled without people; the guided drink recipe is interactive. Customer economy and autonomous service are not implemented.'};
export function coffeeHexes(){const r=1/Math.sqrt(3),out=[];for(let row=-6;row<=6;row++)for(let col=-5;col<=5;col++){const x=col+(row%2)*.5,z=row*r*1.5;if(Math.abs(x)+r<5.95&&Math.abs(z)+r<4.95)out.push({x,z,r});}return out;}

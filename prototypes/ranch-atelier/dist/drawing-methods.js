/* Subject plans are independent of mark rendering. No learned models or external assets. */
(function(root){
const D=root.DrawingLanguage,rand=seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
const extra=[['fern','Woodland fern','A curving central rib supports paired, tapering leaflets.'],['willow','Weeping willow','Long hanging sprays grow from a connected crown and preserve light between curtains.'],['wildflowers','Wildflowers','Flower heads terminate stems; petals turn around a shared center.'],['map-study','Ranch map study','A continuous brook, crossing, route, fields and woodland share a legible spatial plan.']].map(([id,name,rule])=>({id,name,family:'New drawing study',rules:[rule,'Establish the large shapes before choosing smaller marks.','Use darker contact edges and reserve light paper between forms.'],next:'Compare the gesture plan with the hand and tool rendering at the same seed.'}));
const mapleStudies=[['maple','Sugar maple · summer'],['maple-autumn','Sugar maple · autumn'],['maple-winter','Sugar maple · bare branches'],['maple-leaf','Sugar maple · leaf study']].map(([id,name])=>({id,name,family:'Acer saccharum · botanical study',rules:['Broad rounded crown carried by ascending, tapering scaffold limbs.','Opposite fine branches and leaf pairs; mature limbs vary through growth and loss.','Gray-brown bark develops long furrows and irregular plates.','Leaves have five principal lobes, rounded sinuses and palmate veins.','Summer and autumn share the same branch architecture at the same seed.'],next:'References: Native Plant Trust Go Botany and NC State Extension, Acer saccharum. This is an interpretive drawing, not a botanical identification plate.'}));
const subjects=[...mapleStudies,...D.subjects,...extra];
const methods={current:'Current',gesture:'Gesture artist',simulation:'Hand + tool'};
const descriptions={current:'Original brush grammar, retained for comparison.',gesture:'A planned sequence of contours, hatches, leaf flicks and washes. Marks follow structure and leave deliberate gaps.',simulation:'The same gesture plan, rendered with smooth hand motion, pressure response, tool drag and paper contact. Brush washes keep pigment inside forms, pen uses directional hatching, and graphite uses soft dry marks. This is an illustrative approximation, not a full fluid simulation.'};
const mix=(a,b,t)=>a+(b-a)*t,lerp=(a,b,t)=>[mix(a[0],b[0],t),mix(a[1],b[1],t)];
function plan(id,seed){const r=rand(seed),items=[];const push=(layer,points,width,color,kind='line',purpose='Contour')=>items.push({layer,points,width,color,kind,purpose,brush:kind==='wash'?'wash':kind==='leaf'?'flick':kind==='hatch'?'dry':'round',pressure:kind==='leaf'?[.12,1,.02]:kind==='line'?[.5,.7,.3]:[.25,.85,.15]});
const stroke=(a,c,b,w=.3,col='#49513d',layer='ink',kind='line',purpose='Contour')=>push(layer,[a,c,b],w,col,kind,purpose);
const line=(a,b,w=.25,col='#49513d',layer='ink',purpose='Edge')=>stroke(a,lerp(a,b,.5),b,w,col,layer,'line',purpose);
const poly=(pts,col,layer='wash',purpose='Plane wash')=>push(layer,pts,1,col,'wash',purpose);
const leaf=(a,b,w=1.4,col='#71834c',layer='wash')=>{const c=lerp(a,b,.55);c[0]+=(r()-.5)*2;stroke(a,c,b,w,col,layer,'leaf','Press, sweep and lift a leaf');};
function ground(x=60,y=98,w=38){poly([[x-w,y],[x-w*.4,y-2],[x+w*.7,y-1],[x+w,y+1],[x,y+3]],'#b8b694');for(let i=0;i<10;i++){const a=x+(r()-.5)*w*2;line([a,y+1+r()*2],[a+1+r()*3,y+1],.15,'#8b9070','detail','Ground contact');}}
function grass(x,y,s=1){for(let j=0;j<5;j++){const dx=(j-2)*1.3*s;stroke([x,y],[x+dx*.3,y-3*s],[x+dx,y-(2+r()*3)*s],.35*s,'#788252','ink','leaf','Grass blade rising from crown');}}
function limb(a,c,b,w){const n=24,left=[],right=[];for(let i=0;i<=n;i++){const t=i/n,u=1-t,p=[u*u*a[0]+2*u*t*c[0]+t*t*b[0],u*u*a[1]+2*u*t*c[1]+t*t*b[1]],dx=2*u*(c[0]-a[0])+2*t*(b[0]-c[0]),dy=2*u*(c[1]-a[1])+2*t*(b[1]-c[1]),l=Math.hypot(dx,dy)||1,ww=w*(1-t*.92)/2;left.push([p[0]-dy/l*ww,p[1]+dx/l*ww]);right.unshift([p[0]+dy/l*ww,p[1]-dx/l*ww]);}poly([...left,...right],'#ac9671');stroke(a,c,b,w*.3,'#74664e','shade','line','Sheltered side of limb');for(const side of [left,right.reverse()]){for(let j=0;j<side.length-4;j+=5)line(side[j],side[Math.min(j+4,side.length-1)],.22,'#55523e','ink','Broken bark edge');}for(let k=0;k<3;k++){const dx=(k-1)*w*.18;stroke([a[0]+dx,a[1]],[c[0]+dx,c[1]],b,.14,'#625d45','detail','hatch','Bark follows growth');}}
function crown(x,y,rx,ry,pine=false){rx*=.9+r()*.2;ry*=.9+r()*.2;const pts=[];for(let i=0;i<20;i++){const a=i/20*Math.PI*2,q=.87+.08*Math.sin(a*7)+r()*.1;pts.push([x+Math.cos(a)*rx*q,y+Math.sin(a)*ry*q]);}poly(pts,'#a4b183','wash','Mass foliage before details');poly(pts.slice(0,11).concat([[x-rx*.6,y+ry*.2],[x+rx*.6,y+ry*.25]]),'#70875e','shade','Shade beneath foliage mass');for(let i=0;i<24;i++){const a=r()*Math.PI*2,rr=Math.sqrt(r()),xx=x+Math.cos(a)*rx*rr,yy=y+Math.sin(a)*ry*rr;if(i%6===0)continue;const col=yy>y?'#62794d':'#8b9e65';if(pine){for(let k=0;k<3;k++)leaf([xx,yy],[xx+(k-1)*1.7,yy-1.3-r()*1.7],.45,col);}else leaf([xx,yy],[xx+(r()-.5)*4,yy-1.5-r()*2],1.1,col);if(i%3===0)stroke([xx-1,yy],[xx,yy-1],[xx+1.5,yy-.4],.19,'#4e6345','ink','line','Suggest leaf group');}for(let i=0;i<pts.length;i+=3){if(i===12||i===15)continue;stroke(pts[i],pts[(i+1)%20],pts[(i+2)%20],.25,'#566a48','ink','line','Broken canopy contour');}}
function tree(type,x=60,y=97,s=1){const map=p=>[x+(p[0]-60)*s,y+(p[1]-97)*s],L=(a,c,b,w)=>limb(map(a),map(c),map(b),w*s),C=(a,b,rx,ry,p)=>crown(...map([a,b]),rx*s,ry*s,p);ground(x,y,35*s);
if(type==='old-tree'){L([57,97],[51,57],[63,17],8);L([57,94],[43,97],[29,99],4);L([59,94],[75,98],[88,99],3);const branches=[[60,76,36,63,22,59,18,6],[59,64,83,60,96,51,19,7],[58,48,37,43,24,34,17,7],[61,38,77,32,91,24,19,7],[61,22,59,18,65,13,15,6]];for(const [ax,ay,cx,cy,bx,by,rx,ry]of branches){const t=(97-ay)/80,u=1-t,tx=57*u*u+102*u*t+63*t*t;L([tx,ay],[cx,cy],[bx,by],3.8);C(bx,by-3,rx,ry,true);}}
else if(type==='pine'){L([60,97],[57,53],[60,12],4);for(let i=0;i<9;i++){const yy=22+i*7,reach=7+i*2.8;for(const sign of [-1,1]){L([59,yy+5],[59+sign*reach*.6,yy+5],[59+sign*reach,yy],1.2);C(59+sign*reach*.65,yy,reach*.6,3.8,true);}}}
else if(type==='willow'){L([60,97],[58,68],[63,39],6);for(let k=0;k<7;k++){const xx=27+k*11,yy=28+Math.abs(k-3)*3;L([60,62],[xx,22],[xx,yy],2.4);C(xx,yy,10,7);for(let j=0;j<4;j++){const sx=xx+(j-1.5)*3,end=64+r()*23;stroke(map([sx,yy]),map([sx-6,50]),map([sx-3,end]),.23,'#6c7f4b','ink','line','Hanging willow spray');for(let q=0;q<9;q++){const t=q/9,py=mix(yy,end,t),px=sx-4*Math.sin(t*Math.PI/2);leaf(map([px,py]),map([px+(q%2?2:-2),py+4]),.9*s,'#8a9b5e');}}}}
else{const shrub=type==='shrub';L([60,97],[56,70],[60,shrub?65:35],shrub?3:6);for(let k=0;k<7;k++){const a=-Math.PI*.92+k*Math.PI*.14,xx=60+Math.cos(a)*(shrub?22:28),yy=(shrub?74:49)+Math.sin(a)*(shrub?13:21);L([57.8,shrub?86:70],[59+(xx-59)*.65,yy+14],[xx,yy],shrub?1.4:2.5);C(xx,yy,shrub?11:15,shrub?8:12);}C(61,shrub?67:28,shrub?12:16,shrub?8:12);}}
function building(x=25,y=87,s=1,house=false){const p=([a,b])=>[x+a*s,y+b*s],P=(pts,col,layer)=>poly(pts.map(p),col,layer),E=(a,b,w=.25,col='#54533f',layer='ink')=>line(p(a),p(b),w*s,col,layer,'Architectural edge');P([[0,-32],[37,-25],[37,0],[0,-6]],house?'#d5c3a0':'#be8268');P([[37,-25],[60,-39],[60,-15],[37,0]],house?'#bdad8d':'#9a6953');P([[0,-32],[14,-53],[37,-25]],house?'#d5c3a0':'#be8268');P([[14,-53],[40,-65],[64,-42],[37,-25]],'#7d8c7a');P([[1,-31],[37,-24],[60,-38],[60,-34],[37,-21],[1,-28]],'#6b7057','shade');
for(const [a,b]of [[[-4,-33],[14,-53]],[[14,-53],[40,-65]],[[40,-65],[64,-42]],[[64,-42],[37,-25]],[[37,-25],[14,-53]],[[37,-25],[-4,-33]],[[0,-31],[0,-6]],[[0,-6],[37,0]],[[37,0],[60,-15]],[[60,-15],[60,-38]],[[37,-25],[37,0]]])E(a,b,.35);
for(let xx=4;xx<37;xx+=4)E([xx,-30+xx*.16],[xx,-6+xx*.16],.13,'#886e55');P([[13,-21],[25,-19],[25,-2],[13,-4]],'#565e4b','shade');E([13,-21],[25,-2],.35,'#c8b48c');E([25,-19],[13,-4],.35,'#c8b48c');P([[44,-26],[51,-30],[51,-23],[44,-19]],'#526252','shade');E([47.5,-28],[47.5,-21],.2,'#dccaa3');
for(let j=1;j<8;j++){const t=j/8;E([14+26*t,-53-12*t],[37+27*t,-25-17*t],.12,'#5f7464','detail');}if(house){P([[-5,-18],[22,-14],[29,-20],[2,-25]],'#8b9b80');E([-4,-17],[-4,-3],.8);E([22,-13],[22,3],.8);P([[42,-57],[47,-60],[47,-72],[42,-70]],'#ae8971');}grass(x-3*s,y-2*s,s);grass(x+58*s,y-12*s,s);}
function fern(x=60,y=96,s=1){ground(x,y,29*s);for(let k=0;k<7;k++){const a=-2.8+k*.4,h=(24+r()*20)*s,b=[x+Math.cos(a)*h,y+Math.sin(a)*h-10*s],c=[x+Math.cos(a)*h*.35,y-h*.8];stroke([x,y],c,b,.35*s,'#66794a','ink','line','Fern central rib');for(let j=1;j<12;j++){const t=j/12,u=1-t,pt=[u*u*x+2*u*t*c[0]+t*t*b[0],u*u*y+2*u*t*c[1]+t*t*b[1]],dx=2*u*(c[0]-x)+2*t*(b[0]-c[0]),dy=2*u*(c[1]-y)+2*t*(b[1]-c[1]),len=Math.hypot(dx,dy),size=5*s*Math.sin(t*Math.PI);for(const sign of [-1,1])leaf(pt,[pt[0]+(-dy*sign+dx*.5)/len*size,pt[1]+(dx*sign+dy*.5)/len*size],1.1*s,j%3?'#819655':'#a4ad70');}}}
function stream(path=false){const col=path?'#cab48d':'#98b8b4';poly([[8,15],[24,13],[45,29],[77,36],[91,54],[77,77],[61,102],[40,102],[62,72],[76,53],[66,47],[35,39]],col);stroke([10,16],[34,36],[65,41],.55,'#78866a','ink','line','Continuous left bank');stroke([65,41],[92,46],[65,78],.5,'#697b60','ink','line','Bank turning through bend');stroke([65,78],[51,92],[42,102],.4,'#697b60','ink');for(let i=0;i<30;i++){const y=20+r()*75,x=y<42?y*.9:78-(y-50)*.6;line([x-3+r()*5,y],[x+2+r()*5,y-.5],.2,path?'#9c8b68':'#edf0dd','detail','Broken reflection');}for(let i=0;i<12;i++)grass(20+r()*83,44+r()*54,.7);}
function mapleLeaf(x,y,size,angle,col,veins=false){
const shape=[[0,.8],[-.22,.63],[-.62,.65],[-.51,.35],[-.98,.08],[-.74,-.02],[-.78,-.48],[-.46,-.27],[-.31,-.24],[-.29,-.55],[-.12,-.52],[0,-1],[.17,-.52],[.31,-.56],[.3,-.24],[.46,-.27],[.79,-.47],[.74,-.01],[.98,.09],[.51,.35],[.63,.65],[.22,.63]];
const tr=([a,b])=>[x+size*(a*Math.cos(angle)-b*Math.sin(angle)),y+size*(a*Math.sin(angle)+b*Math.cos(angle))];
poly(shape.map(tr),col,'wash','Five lobes and rounded recesses of sugar maple leaf');
if(veins){const base=tr([0,.65]);for(const p of [[0,-.9],[-.7,-.4],[.7,-.4],[-.86,.12],[.86,.12]])line(base,tr(p),.15,'#6c7344','detail','Palmate vein from petiole');stroke(tr([0,1.35]),tr([.04,1]),base,.22,'#80674a','ink','line','Petiole meets blade');for(let i=0;i<shape.length;i+=3)stroke(tr(shape[i]),tr(shape[(i+1)%shape.length]),tr(shape[(i+2)%shape.length]),.13,'#66734a','ink','line','Selected leaf edge');}}
function maple(){const winter=id==='maple-winter',autumn=id==='maple-autumn';if(id==='maple-leaf'){mapleLeaf(61,52,35,-.12,'#77904d',true);return;}ground(60,100,32);
const tips=[],limbs=[];const branch=(a,b,w,depth)=>{const c=[mix(a[0],b[0],.55)+(r()-.5)*3,mix(a[1],b[1],.55)+2];limbs.push([a,c,b,w]);if(depth===0){tips.push(b);return;}const dx=b[0]-a[0],dy=b[1]-a[1],angle=Math.atan2(dy,dx),len=Math.hypot(dx,dy)*(.43+r()*.1);for(const side of [-1,1]){const theta=angle+side*(.3+r()*.3),end=[b[0]+Math.cos(theta)*len,b[1]+Math.sin(theta)*len];branch(b,end,w*.48,depth-1);}};
limb([58,99],[55,76],[60,56],7);limb([57,97],[49,99],[40,101],2.8);limb([60,97],[69,100],[78,101],2.1);
for(const [x,y,w] of [[32,57,3.6],[43,46,3.8],[55,39,4],[66,39,3.7],[78,47,3.4],[88,57,3]])branch([58+(r()-.5)*2,67+r()*7],[x+(r()-.5)*5,y+(r()-.5)*4],w,3);
const markStart=items.length;for(const [a,c,b,w] of limbs)limb(a,c,b,w);
if(!winter){ // Foliage hides upper wood instead of revealing every skeleton line.
for(let i=markStart;i<items.length;i++)if(items[i].points.every(p=>p[1]<65))items[i].obscured=true;
const groups=[[28,51,14,13],[38,33,16,15],[56,24,18,14],[77,29,17,15],[91,45,16,16],[76,53,17,15],[53,48,18,16],[36,62,15,10],[86,62,13,10]];
for(const [xx,yy,rx,ry]of groups){const x=xx+(r()-.5)*4,y=yy+(r()-.5)*3,pts=[];for(let i=0;i<30;i++){const a=i/30*Math.PI*2,q=.89+r()*.13;pts.push([x+Math.cos(a)*rx*q,y+Math.sin(a)*ry*q]);}poly(pts,autumn?'#d6a248':'#84965a','wash','Mass foliage before details');const lower=pts.slice(0,16).concat(pts.slice(0,16).reverse().map(([px,py])=>[x+(px-x)*.75,y+(py-y)*.45-1]));poly(lower,autumn?'#ab653e':'#566b44','shade','Sheltered lower canopy');for(let k=0;k<36;k++){const a=r()*6.283,rr=Math.sqrt(r()),lx=x+Math.cos(a)*rx*rr,ly=y+Math.sin(a)*ry*rr;mapleLeaf(lx,ly,1.2+r()*1.3,(r()-.5)*1.7,autumn?['#d6ac4a','#c9823e','#b85f36'][k%3]:['#78914c','#95a765','#587640'][k%3]);if(k%5===0)stroke([lx-1,ly],[lx,ly+.6],[lx+1.3,ly-.3],.16,autumn?'#8c613c':'#4f6540','detail','line','Selective leaf overlap');}}
}else for(const [x,y]of tips){line([x,y],[x-.5,y-1.1],.25,'#79664c','detail','Pointed winter bud');}
for(let i=0;i<13;i++){const y=77+r()*20,x=56+r()*5;stroke([x,y],[x-.5,y-2],[x+.3,y-4-r()*3],.15,'#5e5b4c','detail','hatch','Long discontinuous bark furrow');}}

// Map icons: connected branch gestures, then loaded brush sweeps; no leaf stamps.
function paintedTree(cedar=false){
const autumn=id==='maple-autumn';
const paint=(a,c,b,w,col,layer='wash')=>{stroke(a,c,b,w,col,layer,'paint','Loaded brush follows foliage volume');items.at(-1).brush='dry';};
paint([37,100],[60,97],[83,100],3,'#b5af89');
if(cedar){
limb([58,98],[68,79],[57,61],10);limb([60,83],[44,68],[40,44],6);
limb([61,79],[76,63],[78,43],4.8);limb([58,64],[62,46],[54,27],4);
limb([48,65],[33,56],[22,47],3.2);limb([64,58],[78,48],[96,43],2.6);
limb([58,96],[46,99],[34,100],3);limb([61,95],[70,99],[81,100],2);
}else{
limb([59,99],[55,80],[59,56],7);limb([58,79],[43,65],[32,47],4);
limb([58,71],[74,60],[84,43],3.5);limb([58,62],[52,44],[52,29],3);
limb([58,61],[68,42],[71,30],2.6);limb([58,97],[48,100],[40,101],2.5);
limb([60,97],[68,100],[77,100],1.8);
}
const groups=cedar?[[29,43,17,8],[48,30,19,11],[69,29,18,10],[86,39,17,9],[73,49,19,10],[43,48,18,9]]:[[31,53,15,14],[36,35,16,15],[54,25,17,15],[73,29,16,15],[88,45,15,16],[77,58,16,12],[51,49,20,17],[43,62,16,10]];
// Each mass is interwoven sweeps with a shared light direction. Lifted tips break the silhouette.
for(const [cx,cy,rx,ry] of groups){
for(let pass=0;pass<3;pass++){
const count=pass===0?12:pass===1?16:11;
for(let j=0;j<count;j++){
const a=r()*Math.PI*2,rad=Math.sqrt(r()),x=cx+Math.cos(a)*rx*rad*.85,y=cy+Math.sin(a)*ry*rad*.8;
const lit=(cy-y)/ry;const colors=autumn?['#99603b','#bb7c3d','#d2a352','#e0ba69']:cedar?['#465a43','#627351','#83906a','#a5ac81']:['#50623e','#71814b','#95a45f','#b4bc7c'];
const index=pass===0?1:pass===1?(lit<-.1?0:1):(lit<-.2?1:lit>.15?3:2);
const len=(cedar?6:4)+r()*5,dir=x<cx?-1:1;
paint([x-dir*len*.5,y+1.5],[x,y-1-r()*2],[x+dir*len*.6,y-(cedar?1.2:2.8)],(pass===0?7:pass===1?4.6:3)*( .65+r()*.6),colors[index],pass===0?'wash':pass===1?'shade':'detail');
}
}
}
// A few exposed twig gestures at the edge; the crown conceals the rest.
if(cedar)for(const [a,c,b] of [[[40,56],[30,58],[22,54]],[[76,57],[86,53],[91,48]],[[56,34],[43,32],[37,29]]])stroke(a,c,b,.3,'#68664c','detail','line','Exposed tapering twig');
}

if(['old-tree','maple','maple-autumn'].includes(id))paintedTree(id==='old-tree');
else if(id.startsWith('maple'))maple();
else if(['old-tree','pine','broadleaf','shrub','willow'].includes(id))tree(id);
else if(id==='fern')fern();
else if(id==='barn'||id==='farmhouse'){ground(60,92,45);building(26,91,1.02,id==='farmhouse');}
else if(id==='fence'){ground(60,87,47);const posts=[];for(let i=0;i<5;i++)posts.push([13+i*23,83+Math.sin(i)*3]);for(let i=0;i<5;i++){const [x,y]=posts[i];poly([[x-1.5,y],[x-1.5,y-32],[x+1,y-33],[x+2,y]],'#ac9873');line([x+2,y],[x+1,y-33],.4);for(let k=0;k<2;k++){if(!i)continue;const prev=posts[i-1],h=10+k*13;poly([[prev[0],prev[1]-h],[x,y-h],[x,y-h+2],[prev[0],prev[1]-h+2]],'#b3a17d');line([prev[0],prev[1]-h+2],[x,y-h+2],.35);}grass(x+2,y,.7);}line([59,posts[2][1]-23],[82,posts[3][1]-8],1.4,'#8b7858');}
else if(id==='grass'||id==='reeds'||id==='wildflowers'){ground();for(let i=0;i<24;i++){const x=23+r()*74,y=91+r()*7,h=15+r()*39,tip=[x+(r()-.5)*18,y-h];stroke([x,y],[x-4,y-h*.7],tip,.3,'#788352','ink','line','Stem from root to head');leaf([x-1,y-h*.35],[x-10,y-h*.7],1.2);if(id==='reeds'&&i%3===0)stroke(tip,[tip[0]+1,tip[1]-3],[tip[0]+1,tip[1]-7],1.8,'#8b704b','shade','leaf','Reed seed head');if(id==='wildflowers'&&i%2===0){for(let k=0;k<6;k++){const a=k*Math.PI/3;leaf(tip,[tip[0]+Math.cos(a)*3,tip[1]+Math.sin(a)*3],1.6,i%4?'#b88f70':'#b9a2aa');}stroke(tip,tip,[tip[0]+.1,tip[1]+.1],1.1,'#aa8c42','ink','leaf','Flower center');}grass(x,y,.7);}}
else if(id==='garden'){for(let i=0;i<4;i++){const x=17+i%2*49,y=30+Math.floor(i/2)*35;poly([[x,y],[x+35,y+4],[x+29,y+26],[x-6,y+20]],'#b5a382');line([x-6,y+20],[x+29,y+26],1,'#827253');line([x+29,y+26],[x+35,y+4],.8,'#827253');for(let j=0;j<9;j++){const xx=x+3+j%3*10-Math.floor(j/3)*2,yy=y+4+Math.floor(j/3)*7;for(let k=0;k<5;k++){const a=k*Math.PI*2/5;leaf([xx,yy],[xx+Math.cos(a)*4,yy+Math.sin(a)*3],1.8,'#788f55');}}}}
else if(id==='rocks'){ground();for(const [x,y,w]of [[33,80,22],[80,86,23],[64,53,16]]){const a=[x-w,y],b=[x-w*.6,y-w*.8],c=[x+w*.3,y-w],d=[x+w,y-w*.2],e=[x+w*.6,y+3],f=[x-w*.5,y+4],mid=[x,y-w*.3];poly([a,b,c,d,e,f],'#b9b9a1');poly([mid,c,d,e,f],'#8d9b88','shade');for(const [p,q]of [[a,b],[b,c],[d,e],[e,f],[f,a],[c,mid],[mid,e]])line(p,q,.25,'#697560');for(let j=0;j<7;j++)line([mid[0]+j,mid[1]+j*.6],[mid[0]+j+3,mid[1]+j*.6+5],.13,'#788572','detail');}}
else if(id==='brook'||id==='path')stream(id==='path');
else if(id==='map-study'){poly([[8,12],[112,12],[112,101],[8,101]],'#e3dfbf');poly([[12,16],[48,20],[42,44],[10,38]],'#bcc18d');poly([[77,69],[109,62],[109,96],[80,99]],'#c4c79b');poly([[53,12],[60,12],[57,38],[69,64],[57,101],[49,101],[61,64],[49,38]],'#a6c4bd');stroke([25,101],[29,61],[98,42],2.8,'#ccb58b','wash','line','Route connects farm and crossing');stroke([25,101],[29,61],[98,42],.25,'#9b8968','ink');for(let i=0;i<5;i++)line([55+i*2,56],[58+i*2,65],.55,'#736b4f','ink','Bridge deck');building(78,41,.4);for(let i=0;i<14;i++){const x=14+r()*29,y=16+r()*25;crown(x,y,3.5,2.8);line([x,y+2],[x,y+5],.25);}for(let i=0;i<7;i++)line([80,74+i*3],[106,67+i*3],.2,'#9aa16d','detail','Cultivated field rows');for(let i=0;i<12;i++)grass(15+r()*31,62+r()*27,.6);}
return {id,seed,items,painterly:['old-tree','maple','maple-autumn'].includes(id)};}
function render(plan,method,tool='brush'){const layers={structure:[],wash:[],shade:[],ink:[],detail:[]},strokes=[],r=rand(plan.seed+7001),sim=method==='simulation';const mark=(tag,a)=>({tag,a}),path=pts=>'M'+pts.map(p=>p.map(v=>v.toFixed(3)).join(',')).join('L');
// Texture is deposited inside the same shape as its parent wash.
const inside=(p,poly)=>{let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;};
for(const item of plan.items){const {points,width,color,kind,layer}=item;let marks=[];if(kind==='paint'&&(!sim||tool==='brush')){
const [a,c,b]=points,phase=r()*6.28;
// Broken bristle ribbons share the same trajectory and pressure envelope.
for(let br=0;br<9;br++){
const left=[],right=[],offset=(br-4)/9,bristle=.065+r()*.055;
for(let j=0;j<=24;j++){const t=j/24,u=1-t,dx=2*u*(c[0]-a[0])+2*t*(b[0]-c[0]),dy=2*u*(c[1]-a[1])+2*t*(b[1]-c[1]),len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;
const pressure=Math.pow(Math.sin(Math.PI*(.035+t*.94)),.55)*(1+.13*Math.sin(t*19+phase+br*.6));
const x=u*u*a[0]+2*u*t*c[0]+t*t*b[0],y=u*u*a[1]+2*u*t*c[1]+t*t*b[1],w=width*pressure;
left.push([x+nx*w*(offset+bristle),y+ny*w*(offset+bristle)]);right.unshift([x+nx*w*(offset-bristle),y+ny*w*(offset-bristle)]);
}marks.push(mark('path',{d:path(left.concat(right))+'Z',fill:color,opacity:.26+r()*.18}));
}
layers.structure.push(mark('path',{d:'M'+a+'Q'+c+' '+b,fill:'none',stroke:'#9c9072','stroke-width':.12,opacity:.35}));
}else if(kind==='wash'){const rounded=item.purpose==='Mass foliage before details';const d=rounded?'M'+lerp(points.at(-1),points[0],.5).join(',')+points.map((p,i)=>'Q'+p.join(',')+' '+lerp(p,points[(i+1)%points.length],.5).join(',')).join('')+'Z':path(points)+'Z';marks.push(mark('path',{d,fill:color,opacity:sim&&tool==='brush'?.38:method==='current'?.65:.58}));if(sim&&tool==='brush'){
// Wet pigment settles selectively on the lower edge, without outlining every plane.
const cy=points.reduce((v,p)=>v+p[1],0)/points.length;
for(let j=0;j<points.length;j++){const a=points[j],b=points[(j+1)%points.length];if((a[1]+b[1])/2>cy)marks.push(mark('path',{d:path([a,b]),fill:'none',stroke:color,'stroke-width':.22,opacity:.15,'stroke-linecap':'round'}));}
const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
for(let j=0;j<45;j++){const x=mix(minX,maxX,r()),y=mix(minY,maxY,r()),radius=.08+r()*.15;if([[x-radius,y],[x+radius,y],[x,y-radius],[x,y+radius]].every(p=>inside(p,points)))marks.push(mark('circle',{cx:x,cy:y,r:radius,fill:color,opacity:.04+r()*.08}));}
}else if(sim&&tool!=='brush'){
// Dry media describe planes with directional hatching, not a watercolor fill.
marks=[];const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),spacing=layer==='shade'?.65:1.5;
for(let y=minY;y<maxY;y+=spacing){let run=[];const flush=()=>{if(run.length>1)marks.push(mark('path',{d:path(run),fill:'none',stroke:tool==='pencil'?'#625e55':'#41483c','stroke-width':tool==='pencil'?.18:.1,opacity:tool==='pencil'?.22:.3,'stroke-linecap':'round'}));run=[];};for(let x=minX;x<=maxX;x+=.35){const q=[x,y+(x-minX)*.24];if(inside(q,points))run.push(q);else flush();}flush();}
}layers.structure.push(mark('path',{d,fill:'none',stroke:'#a99b7d','stroke-width':.14,opacity:.5}));}
else{const [a,c,b]=points,pts=[],left=[],right=[],phase=r()*6.28;let pressure=.15,drag=0,load=1,prev=a;const steps=sim?40:24;for(let i=0;i<=steps;i++){const time=i/steps,t=sim?time*time*time*(10+time*(-15+6*time)):time,u=1-t,dx=2*u*(c[0]-a[0])+2*t*(b[0]-c[0]),dy=2*u*(c[1]-a[1])+2*t*(b[1]-c[1]),len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;let x=u*u*a[0]+2*u*t*c[0]+t*t*b[0],y=u*u*a[1]+2*u*t*c[1]+t*t*b[1];const speed=Math.hypot(x-prev[0],y-prev[1]);prev=[x,y];const target=kind==='leaf'?Math.pow(Math.sin(Math.PI*t),.8):.55+.15*Math.sin(t*Math.PI);pressure+=.3*(target-pressure);drag+=.18*((speed*.06)-drag);const sway=sim?Math.sin(t*7+phase)*.08*Math.sin(Math.PI*t):0;x+=nx*sway;y+=ny*sway;pts.push([x,y]);load=Math.max(.25,load-speed*.005);let w=width*(kind==='leaf'?Math.max(.03,target):1);if(sim){w=tool==='pen'?(kind==='leaf'?width*.3:width):tool==='pencil'?width*(kind==='leaf'?.55:.8)*(pressure+.35):width*(pressure+.1)*(1+drag);w*=.96+.04*Math.sin(t*15+phase);}left.push([x+nx*w/2,y+ny*w/2]);right.unshift([x-nx*w/2,y-ny*w/2]);}if(sim&&tool==='pencil'){for(let k=0;k<3;k++)marks.push(mark('path',{d:path(pts.map(([x,y],i)=>[x+(k-1)*width*.18,y+Math.sin(i*.7+phase)*.035])),fill:'none',stroke:color,'stroke-width':Math.max(.07,width*.16),opacity:.24,'stroke-linecap':'round'}));}else{marks.push(mark('path',{d:path(left.concat(right))+'Z',fill:color,opacity:sim&&tool==='brush'?(layer==='ink'?.68:.5*load+.2):.82}));if(sim&&tool==='brush'&&width>.5){marks.push(mark('path',{d:path(pts),fill:'none',stroke:color,'stroke-width':width*.05,opacity:.12,'stroke-linecap':'round'}));}}if(width>.4)layers.structure.push(mark('path',{d:`M${a}Q${c} ${b}`,fill:'none',stroke:'#9c9072','stroke-width':.14,opacity:.5}));}
if(sim&&tool!=='brush')for(const m of marks){if(m.a.fill&&m.a.fill!=='none')m.a.fill=tool==='pencil'?'#625e55':'#41483c';if(m.a.stroke&&m.a.stroke!=='none')m.a.stroke=tool==='pencil'?'#625e55':'#41483c';}
if(item.obscured)for(const m of marks)m.a.opacity=(m.a.opacity||1)*.08;
const rec={...item,marks,tool:sim?tool:'pen + wash',duration:kind==='wash'?900:Math.max(100,Math.hypot(points.at(-1)[0]-points[0][0],points.at(-1)[1]-points[0][1])*30),brush:item.brush};strokes.push(rec);layers[layer].push(...marks);}
// A painter lays broad masses before shade, contours and finishing accents.
const order=['wash','shade','ink','detail'];if(!plan.painterly)strokes.sort((a,b)=>order.indexOf(a.layer)-order.indexOf(b.layer));return {id:plan.id,seed:plan.seed,layers,strokes,method,tool};}
function build(id,seed,method='gesture',tool='brush'){if(method==='current'&&D.subjects.some(s=>s.id===id))return D.build(id,seed);return render(plan(id,seed),method,tool);}
root.DrawingMethods={subjects,methods,descriptions,plan,render,build};if(typeof module!=='undefined')module.exports=root.DrawingMethods;
})(typeof window!=='undefined'?window:globalThis);

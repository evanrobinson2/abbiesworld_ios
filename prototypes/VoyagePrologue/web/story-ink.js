// Timed, scene-specific pen marks. Coordinates reserve faces and action areas.
const NS='http://www.w3.org/2000/svg';
function node(tag,attrs={}){const n=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);return n}
export function storyInk(stage,shot,tween){
 const svg=node('svg',{viewBox:'0 0 1600 900','aria-hidden':'true',class:'story-ink'});stage.append(svg);
 const pen=(d,at=.4,color='#fff6dd',width=7)=>{const p=node('path',{d,fill:'none',stroke:color,'stroke-width':width,'stroke-linecap':'round','stroke-linejoin':'round',pathLength:1,'stroke-dasharray':1});svg.append(p);tween(p,[{strokeDashoffset:1,opacity:0},{strokeDashoffset:0,opacity:1}],at,.6);return p};
 const words=(text,x,y,at=.6)=>{const n=node('text',{x,y,class:'ink-label'});n.textContent=text;svg.append(n);tween(n,[{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],at,.3);return n};
 const marks={
 title:[['M410 655 Q800 684 1190 651',.7,'#ffadd1'],['M310 328 L280 308 M300 361 L261 360 M1278 328 L1310 306 M1294 361 L1333 360',1.2]],
 laugh:[['M1120 177 C1091 138 1054 181 1096 210 L1121 233 L1146 207 C1188 166 1147 145 1120 177',.7,'#ff9bbb'],['M1274 711 Q1320 710 1350 664 M1336 675 L1351 661 L1352 686',1.2]],
 bullies:[['M811 155 L835 111 M851 176 L894 154 M1490 274 L1520 262 M1494 305 L1534 308',1.6,'#ffcc72']],
 fear:[['M129 240 L112 201 M169 224 L165 185 M1400 236 L1420 197 M1436 263 L1470 247',.4]],
 capture:[['M244 630 Q202 500 283 394 M261 403 L285 390 L286 416',1.0]],
 net:[['M132 185 L106 150 M164 169 L154 130 M1430 200 L1454 168 M1450 236 L1490 223',.6]],
 departure:[['M1260 742 Q1350 695 1460 696 M1438 677 L1464 696 L1440 718',.8]],
 abbie:[['M1104 669 L1070 646 M1119 639 L1101 600 M1330 665 L1370 645',1.0,'#ffbbdd'],['M1068 824 Q1190 848 1398 811',1.3,'#ff9cbe']],
 climb:[['M1260 772 Q1410 646 1345 513 Q1240 350 1340 189 M1316 203 L1342 184 L1348 217',.7]],
 outro:[['M490 674 Q800 705 1110 671',.7,'#ffb8d4'],['M1210 438 L1258 414 M1220 478 L1270 479',1.2]]
 };
 for(const m of marks[shot.id]||[])pen(...m);
 if(shot.id==='capture')words('OH NO!',92,340,.9);
 if(shot.id==='departure')words('THIS WAY…',1180,795,.7);
 if(shot.id==='climb')words('UP THERE!',1180,150,.6);
 if(shot.id==='bonk'){
  const trail=pen('M90 740 Q340 96 1120 455',.35,'#fff6dd',6);
  const rock=node('g');rock.append(node('path',{d:'M-27 -10 L-10 -25 L16 -21 L30 2 L16 23 L-19 20 L-30 4 Z',fill:'#829ba4',stroke:'#203748','stroke-width':5}),node('path',{d:'M-17 -7 L-5 -16 L11 -13',fill:'none',stroke:'#d3e4e5','stroke-width':5}));svg.append(rock);
  tween(rock,[{transform:'translate(90px,740px) rotate(0deg)',opacity:1,offset:0},{transform:'translate(400px,340px) rotate(120deg)',opacity:1,offset:.45},{transform:'translate(1120px,455px) rotate(270deg)',opacity:1,offset:.78},{transform:'translate(1090px,720px) rotate(350deg)',opacity:0,offset:1}],.45,2.1);
  const burst=pen('M1080 427 L1040 369 M1110 415 L1110 347 M1150 425 L1190 375 M1165 461 L1230 451 M1150 496 L1191 539 M1080 491 L1037 539',2.1,'#ffdb72',12);
  words('WHOOSH!',170,740,.5);
  const p=stage.querySelector('.panel');tween(p,[{transform:'rotate(0deg)'},{transform:'rotate(6deg)'},{transform:'rotate(-3deg)'},{transform:'rotate(0deg)'}],2.1,.65);
 }
 if(shot.id==='free'){
  const net=node('g',{class:'release-net'});svg.append(net);
  for(let x=390;x<1230;x+=80){net.append(node('path',{d:`M${x} 40 l-450 660 M${x-440} 40 l450 660`,fill:'none',stroke:'#e6cca0','stroke-width':6}));}
  // Clip mesh to the character panel; then open and drop it visibly below Fox.
  const defs=node('defs'),clip=node('clipPath',{id:'fox-net-clip'});clip.append(node('rect',{x:475,y:35,width:650,height:695,rx:110}));defs.append(clip);svg.prepend(defs);net.setAttribute('clip-path','url(#fox-net-clip)');
  tween(net,[{transform:'translateY(0)',opacity:1},{transform:'translateY(100px)',opacity:1,offset:.35},{transform:'translateY(780px)',opacity:0}],.6,1.8);
  pen('M580 750 Q800 785 1020 748',2.5,'#ff9bbb');
  pen('M423 289 L390 266 M434 257 L419 218 M1175 283 L1207 260 M1166 250 L1181 218',2.5,'#fff6dd');
  words('PHEW!',1120,450,2.7);
 }
}

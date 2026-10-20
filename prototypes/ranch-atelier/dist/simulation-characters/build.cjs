const fs=require('fs'),path=require('path');
const people=[
 ['abbie','Abbie','#e6bba0','#a77843','#c38f9b','#879cb0','bob','overalls','none',.72],
 ['ani','Ani','#cfaa87','#a77843','#c38f9b','#879cb0','bob','overalls','none',.72],
 ['mommy','Mommy','#d8a781','#5b4535','#6d927c','#6b7c87','bun','apron','none',1],
 ['daddy','Daddy','#bf9276','#654b38','#759199','#947c61','short','suspenders','straw',1.04],
 ['jeff','Jeff','#d5aa85','#54463d','#b77953','#6c7d80','short','overalls','cap',1.02],
 ['alexis','Alexis','#b67f62','#46362f','#9b7e9f','#7f927c','braid','apron','none',1]
];
const style=`<style>
 .ink{stroke:var(--ink,#465046);stroke-width:1.25;stroke-linecap:round;stroke-linejoin:round}
 .skin{fill:var(--skin,SKIN)}.hair{fill:var(--hair,HAIR)}.shirt{fill:var(--shirt,SHIRT)}.trousers{fill:var(--trousers,TROUSERS)}.shoes{fill:var(--shoes,#725b48)}.hat{fill:var(--hat,#c6b177)}.accessory{fill:var(--accessory,#d5c6a3)}
 .detail{fill:none;stroke:var(--ink,#465046);stroke-width:.65;opacity:.65}
 .shadow{fill:#333f34;opacity:.14;stroke:none}.light{fill:#fff8d8;opacity:.3;stroke:none}
 g[data-hat]{display:none}svg[data-hat="straw"] .straw,svg[data-hat="cap"] .cap{display:inline}
 g[data-uniform]{display:none}svg[data-uniform="overalls"] .overalls,svg[data-uniform="apron"] .apron,svg[data-uniform="suspenders"] .suspenders{display:inline}
 </style>`;
for(const [id,name,skin,hair,shirt,trousers,haircut,uniform,hat,scale]of people){
 let hairBack=haircut==='braids'?'<path class="hair ink" d="M45 38Q37 48 40 59L45 61 48 45M65 38Q73 49 70 60L65 62 62 45"/>':haircut==='braid'?'<path class="hair ink" d="M64 37Q75 49 65 69L61 65 65 43"/>':haircut==='bob'?'<path class="hair ink" d="M41 29Q38 40 41 49L48 50 64 49 70 46 68 29Z"/>':haircut==='bun'?'<circle class="hair ink" cx="67" cy="26" r="7"/>':'';
 let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 112 128" role="img" aria-label="${name}, editable farm character" data-character="${id}" data-hat="${hat}" data-uniform="${uniform}"><title>${name}</title>${style.replace('SKIN',skin).replace('HAIR',hair).replace('SHIRT',shirt).replace('TROUSERS',trousers)}
 <ellipse fill="#59684b" opacity=".18" cx="58" cy="116" rx="24" ry="6"/>
 <g transform="translate(${56*(1-scale)} ${116*(1-scale)}) scale(${scale})">
 <path class="trousers ink" d="M43 81L41 108 51 110 56 90 61 108 70 107 68 80Z"/>
 <path class="shoes ink" d="M41 104L51 106 51 115Q42 119 36 115L36 112ZM61 104L70 104 75 111Q77 117 63 117L60 113Z"/>
 <path class="shadow" d="M63 86L67 106 70 105 68 81 56 82 57 91Z"/>
 <path class="shirt ink" d="M44 49L54 46 64 49 73 57 69 70 66 66 69 86Q54 91 41 85L44 65 39 70 33 59Z"/>
 <path class="skin ink" d="M34 62L40 66 36 79Q33 87 28 82L29 76ZM68 66L73 61 79 77Q82 84 77 86L73 82Z"/>
 <path class="shirt ink" d="M44 50L33 58 32 65 40 69 47 58M64 50L73 56 76 64 68 70 62 59"/>
 <path class="shadow" d="M61 50L65 65 64 85 69 86 66 66 69 70 73 64 68 54Z"/>
 <g data-uniform="overalls" class="overalls"><path class="trousers ink" d="M44 51L48 50 49 63 61 63 63 51 67 53 65 68 68 85Q55 90 43 85L46 68Z"/><path class="detail" d="M50 68H60L59 77H51Z"/><circle class="accessory" cx="48" cy="65" r="1.4"/><circle class="accessory" cx="62" cy="65" r="1.4"/></g>
 <g data-uniform="apron" class="apron"><path class="accessory ink" d="M49 54L59 54 64 68 68 94Q54 99 40 93L46 68Z"/><path class="detail" d="M49 54L47 49M59 54L62 49M45 77Q54 80 63 77M48 80L49 87 60 87 61 80"/></g>
 <g data-uniform="suspenders" class="suspenders"><path class="accessory ink" d="M44 51L48 50 51 84 47 85ZM62 50L65 52 63 85 59 85Z"/></g>
 <path class="skin ink" d="M50 42L50 50Q55 57 61 50L60 41Z"/>
 ${hairBack}
 <path class="skin ink" d="M43 29Q43 20 55 20 67 20 68 31L67 41Q63 50 55 50 46 49 43 40L40 37 40 32Z"/>
 <path class="shadow" d="M62 25Q70 37 61 46L55 50Q65 50 68 39L68 29Z"/>
 <path class="hair ink" d="M42 34Q37 20 47 17 61 10 68 23L69 34 64 31 62 24Q54 31 45 27L45 36Z"/>
 <path class="detail" d="M45 23Q53 17 61 20M49 36L51 36M60 35L62 35M55 37L54 41 57 41M53 45Q56 46 59 44"/>
 <g class="straw" data-hat="straw"><path class="hat ink" d="M32 26Q53 18 77 25L79 29Q57 39 32 31Z"/><path class="hat ink" d="M41 26L44 13Q55 8 64 14L69 26Q54 31 41 26Z"/><path class="accessory ink" d="M42 22Q55 27 67 22L69 26Q55 32 41 26Z"/><path class="light" d="M45 14Q50 11 55 12L51 23 44 21Z"/></g>
 <g class="cap" data-hat="cap"><path class="hat ink" d="M40 27Q39 14 55 14 69 15 71 29L58 32Z"/><path class="hat ink" d="M52 27Q66 23 77 29L77 32 58 35 49 32Z"/><path class="detail" d="M54 15L57 27"/></g>
 <path class="detail" d="M45 96L46 103M65 96L67 102M35 60L38 62M70 58L72 61"/>
 <path class="light" d="M34 58L43 52 45 55 36 63Z"/>
 </g></svg>`;
 fs.writeFileSync(path.join(__dirname,id+'.svg'),s);
}
fs.writeFileSync(path.join(__dirname,'marley.svg'),`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 112 128" role="img" aria-label="Marley, editable dog"><title>Marley</title><style>.ink{stroke:var(--ink,#465046);stroke-width:1.3;stroke-linecap:round;stroke-linejoin:round}.fur{fill:var(--fur,#bd9062)}.patch{fill:var(--patch,#f0dfbd)}.collar{fill:var(--accessory,#9b6656)}.detail{stroke:var(--ink,#465046);fill:none;stroke-width:.8}</style><ellipse fill="#59684b" opacity=".18" cx="56" cy="114" rx="30" ry="6"/><path class="fur ink" d="M72 84Q91 78 88 66 99 72 90 87L78 96"/><path class="fur ink" d="M38 75Q60 67 76 84L81 108 72 113 64 95 49 96 44 113 33 113 35 91Z"/><path fill="#333f34" opacity=".15" d="M64 80L73 88 77 107 72 110 64 95 48 96 46 90Z"/><path class="patch ink" d="M39 81L48 82 47 101 44 113 35 113 37 101Z"/><path class="fur ink" d="M33 50Q45 38 58 49L64 67 60 81Q44 91 31 77L27 63Z"/><path class="fur ink" d="M31 49Q21 47 20 60L25 75Q32 79 34 69ZM55 49Q65 46 69 60L64 74Q59 77 57 67Z"/><path class="patch ink" d="M39 65Q47 59 54 67L59 74Q52 86 38 79L34 73Z"/><path fill="var(--nose,#484439)" d="M42 66Q47 63 51 66L50 71 46 73 42 69Z"/><path class="detail" d="M46 73L46 77M40 77Q46 80 52 76M35 60L38 60M51 59L54 59M38 106L42 106M73 108L76 107"/><path class="collar ink" d="M32 78Q45 86 60 79L61 84Q46 92 32 84Z"/><circle fill="var(--tag,#d4b65f)" stroke="#465046" stroke-width=".8" cx="47" cy="88" r="3"/><path fill="#fff8d8" opacity=".3" d="M31 52Q36 47 40 49L35 60 31 65Z"/></svg>`);
fs.writeFileSync(path.join(__dirname,'manifest.json'),JSON.stringify({version:1,viewBox:[0,0,112,128],anchor:[56,116],style:'pen and wash / farm study',characters:[...people.map(([id,name])=>({id,name,src:id+'.svg'})),{id:'marley',name:'Marley',src:'marley.svg'}],materials:['skin','hair','shirt','trousers','shoes','hat','accessory','ink'],dogMaterials:['fur','patch','accessory','tag','nose','ink'],hats:['none','straw','cap'],uniforms:['none','overalls','apron','suspenders']},null,2));
// Each SVG may be inserted inline alongside all the others. Scope its fallback
// palette and linework so one character's stylesheet never recolors a neighbour.
for(const id of [...people.map(p=>p[0]),'marley']){const file=path.join(__dirname,id+'.svg');let s=fs.readFileSync(file,'utf8');if(id==='marley')s=s.replace('<svg ','<svg data-character="marley" ');s=s.replace(/<style>([\s\S]*?)<\/style>/,(_,css)=>'<style>'+css.replace(/([^{}]+)\{([^{}]*)\}/g,(_,selectors,body)=>selectors.split(',').map(x=>x.trim().startsWith('svg')?x.trim().replace(/^svg/,`svg[data-character="${id}"]`):`svg[data-character="${id}"] ${x.trim()}`).join(',')+'{'+body+'}')+'</style>');fs.writeFileSync(file,s)}

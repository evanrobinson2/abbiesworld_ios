export const PALETTES=[
 {id:'sunset',name:'Sunset',sky:'#efbc75',ground:'#94816e',colors:['#b82d24','#554360','#9582a0','#b58a44','#e3c68d','#527c84','#302d3d','#667849']},
 {id:'lagoon',name:'Lagoon',sky:'#9adfd9',ground:'#7c9b92',colors:['#ce7352','#345b64','#6d9d99','#b8ab6b','#e4d8ae','#60bdc1','#263f4b','#56876a']},
 {id:'orchid',name:'Orchid',sky:'#b9aecb',ground:'#8b8298',colors:['#b84f88','#433f68','#a28cb8','#c9a789','#e5d1c5','#739ebd','#302e49','#788b75']},
 {id:'copper',name:'Copper',sky:'#dfb694',ground:'#9b856d',colors:['#ac4f32','#564949','#b98e73','#a6804b','#e0c7a1','#71918a','#343a3c','#78805b']},
 {id:'moonlight',name:'Moonlight',sky:'#72869f',ground:'#657283',colors:['#b15c75','#3b4566','#7f94ad','#b9a279','#d8d8ca','#79c0ce','#252e47','#688c8a']},
 {id:'sorbet',name:'Sorbet',sky:'#efc9b1',ground:'#b2a098',colors:['#d77e77','#827392','#c0a4b8','#c9ac75','#f0dfb1','#83b9b7','#55536a','#94a77e']}
];
export const CONFIGURATIONS=[['civic','Civic hex'],['boroughs','Three boroughs'],['boulevard','Long boulevard'],['skyport','Airship city']];
export function citySettings(v={}){const num=(k,min,max,f)=>Number.isFinite(Number(v[k]))?Math.max(min,Math.min(max,Number(v[k]))):f;return {rotation:Math.round(num('rotation',0,5,0)),layout:['single','triangle','line'].includes(v.layout)?v.layout:'single',palette:PALETTES.some(p=>p.id===v.palette)?v.palette:'sunset',noise:num('noise',0,1,.35),height:num('height',.65,1.45,1),combine:num('combine',0,1,.35),airships:Math.round(num('airships',0,8,1)),traffic:Math.round(num('traffic',0,12,6)),mirror:v.mirror!==false,complexity:Math.round(num('complexity',1,3,2)),size:num('size',80,200,120)};}
export function cityPreset(id){return citySettings(({civic:{},boroughs:{layout:'triangle',noise:.6,combine:.7,palette:'lagoon',airships:3},boulevard:{layout:'line',noise:.4,height:1.25,combine:.55,palette:'copper',traffic:10,airships:2},skyport:{layout:'triangle',noise:.85,height:1.3,combine:.85,palette:'orchid',airships:8,traffic:4}})[id]||{});}
export const paletteFor=o=>PALETTES.find(p=>p.id===o.palette)||PALETTES[0];

// Replaceable art direction; these are visual choices, not simulation physics.
export const VISUAL_PROFILE='quiet-materials-v1';
export const MATERIAL_ROLES=Object.freeze({
 timber:{roughness:.87,metalness:0,emphasis:.45},plaster:{roughness:.94,metalness:0,emphasis:.38},
 roof:{roughness:.88,metalness:0,emphasis:.55},stone:{roughness:.92,metalness:0,emphasis:.38},
 clay:{roughness:.76,metalness:0,emphasis:.48},fiber:{roughness:.98,metalness:0,emphasis:.25},
 foliage:{roughness:.92,metalness:0,emphasis:.15},ground:{roughness:1,metalness:0,emphasis:0},
 metal:{roughness:.48,metalness:.55,emphasis:.48},water:{roughness:.24,metalness:0,emphasis:0},
 glass:{roughness:.32,metalness:0,emphasis:.2},skin:{roughness:.88,metalness:0,emphasis:.32},
 cloth:{roughness:.96,metalness:0,emphasis:.32},food:{roughness:.86,metalness:0,emphasis:.3},
 plain:{roughness:.9,metalness:0,emphasis:.35}
});
const aliases={wood:'timber',bark:'timber',soil:'ground',grass:'foliage',leaf:'foliage',leaves:'foliage',reed:'fiber',rope:'fiber',straw:'fiber',bronze:'metal'};
export function canonicalMaterialRole(role){return MATERIAL_ROLES[role]?role:aliases[role]||null;}
function namedRole(name=''){
 const n=name.toLowerCase();
 for(const [role,pattern]of [
 ['glass',/glass/],['water',/^(?:water|cewater|riverwater|seawater)(?:[. _-]|$)/],
 ['metal',/bronze|metal|copper|steel|iron/],['plaster',/plaster|stucco|wall/],
 ['foliage',/leaf|leaves|foliage|canopy|grass|moss|ceweed|petal/],['ground',/soil|earth|ground|terrain|sand|mud/],
 ['roof',/roof|shingle|thatch/],['timber',/wood|timber|bark/],['stone',/stone|rock|slate/],
 ['clay',/clay|ceramic|terracotta/],['fiber',/rope|reed|straw|wicker|hay/],
 ['food',/onion|bread|grain|fruit|meal|vegetable|contentsroot|contentsstew/],['cloth',/cloth|fabric|canvas|linen|wool|shirt|trousers|banner/],['skin',/skin|fur|hide|hair|mane|leather/]
 ])if(pattern.test(n))return role;
 return null;
}
export function materialRole(materialName='',meshName='',explicitRole=null){
 return canonicalMaterialRole(explicitRole)||namedRole(materialName)||namedRole(meshName)||'plain';
}
export const COMPOSITION_LANGUAGE=Object.freeze({
 timber:'Group by use; align stored lengths with the loading edge; keep hauling routes clear.',
 plaster:'Keep walls quiet; emphasize entrances with real recesses and supported framing.',
 roof:'Read as one sheltering mass; thickness and overhang belong in geometry.',
 stone:'Use supported masses; reserve small edge detail for close inspection.',
 clay:'Group by preparation, drying or storage; leave a clear handling surface.',
 fiber:'Keep bundled forms simple at board scale; no procedural line noise.',
 foliage:'Compose overlapping groups and clearings; preserve species silhouette and access.',
 ground:'Keep quiet space between activities; follow terrain and actual circulation.',
 metal:'Use restrained highlights; do not turn whole mechanisms into chrome.',
 water:'Follow supplied shorelines; floating and grounded objects need distinct supports.',
 glass:'Keep openings readable without adding lights or changing lit state.',
 skin:'Preserve identity; motion requires validated parts or clips.',
 cloth:'Use broad color masses; preserve role and faction colors.',
 food:'Arrange in useful batches; stock is illustrative unless linked to simulation.',
 plain:'Preserve authored appearance until a material role is explicitly assigned.'
});

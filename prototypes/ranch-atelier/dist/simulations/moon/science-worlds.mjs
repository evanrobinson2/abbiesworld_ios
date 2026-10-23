export const SCIENCE_BASE_FACETS=Object.freeze([['moon','Moon'],['mars','Mars'],['alien','Alien landscape']].map(Object.freeze));
export const normalizeScienceWorld=value=>SCIENCE_BASE_FACETS.some(([id])=>id===value)?value:'moon';
export const scienceBaseName=value=>value==='alien'?'Alien Science Base':value==='mars'?'Mars Science Base':'Moon Science Base';

// Canonical library boundary. Updated with the Scene Generator owner's schema.
export async function loadCardLibrary(){
 const library=await import('./card-library.js');
 return library;
}
export function normalizeCard(card){
 if(!card||!card.id||!Number.isInteger(card.revision))throw Error('Saved card identity is missing');
 if(!card.rendition)throw Error('Saved card has no rendition');
 if(!Array.isArray(card.cells)||!card.cells.length)throw Error('Saved card has no hex footprint');
 return structuredClone(card);
}

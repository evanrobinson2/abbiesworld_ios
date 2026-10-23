// Readiness is evidence from rendered animation, never generation completion alone.
export function createPreviewReadiness(){
 let frames=0,seconds=0;
 return {record(dt){if(!Number.isFinite(dt)||dt<0)throw Error('Invalid animation delta');frames++;seconds+=dt;return frames>=3&&seconds>=.08;},get state(){return {frames,animationSeconds:seconds,ready:frames>=3&&seconds>=.08};}};
}

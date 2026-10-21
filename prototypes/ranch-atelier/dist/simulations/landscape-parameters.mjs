// Generator parameters, not additional user-facing controls. All distances are metres.
export const LANDSCAPE_PARAMETERS=Object.freeze({
 relief:{default:1,min:.25,max:2,group:'landform'},
 ridgeWidth:{default:1,min:.5,max:2,group:'landform'},
 ridgeLength:{default:1,min:.5,max:2,group:'landform'},
 valleySpacing:{default:1,min:.65,max:1.8,group:'landform'},
 faceSoftness:{default:1,min:.6,max:2,group:'landform'},
 rockRoughness:{default:1,min:0,max:1.5,group:'surface'},
 foothillVariation:{default:1,min:0,max:1.5,group:'surface'},
 habitatPatchSize:{default:1,min:.4,max:2.5,group:'habitat'},
 woodlandCoverage:{default:0,min:-.25,max:.25,group:'habitat'},
 habitatDetail:{default:1,min:0,max:2,group:'habitat'}
});
export function landscapeParameters(input={}){return Object.fromEntries(Object.entries(LANDSCAPE_PARAMETERS).map(([key,spec])=>{const value=Number(input?.[key]??spec.default);return [key,Number.isFinite(value)?Math.max(spec.min,Math.min(spec.max,value)):spec.default];}));}

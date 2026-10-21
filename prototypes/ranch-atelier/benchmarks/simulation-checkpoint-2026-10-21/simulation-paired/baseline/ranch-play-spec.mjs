export function goatPlaySpec(level=1){level=Math.max(0,Math.min(3,Number(level)||0));return level?{length:3+level,width:1.2+level*.25,height:.35+level*.15}:null;}
export function playHeight(spec,x,z){if(!spec)return 0;return spec.height*Math.max(0,Math.min(1,(spec.length/2-Math.abs(x))/.9))*Math.max(0,Math.min(1,(spec.width/2+.65-Math.abs(z))/.65));}

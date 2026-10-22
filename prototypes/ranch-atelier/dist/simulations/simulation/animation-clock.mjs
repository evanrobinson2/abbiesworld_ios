// Presentation time is independent of calendar/needs time. Gait stays distance-driven.
export function idleAnimationRate(speed=1){
 if(!Number.isFinite(speed)||speed<=0)return 0;
 return .65+.25*Math.tanh(Math.log2(speed)/3);
}
export function idleAnimationDelta(realDelta,speed=1){
 return Number.isFinite(realDelta)?Math.max(0,Math.min(.05,realDelta))*idleAnimationRate(speed):0;
}

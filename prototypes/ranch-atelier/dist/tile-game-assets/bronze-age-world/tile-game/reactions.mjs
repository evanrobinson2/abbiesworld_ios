// Presentation state, driven by the actual hand interaction. No economy changes.
export const reaction = () => ({phase:'calm',time:0,intensity:0,held:false});
export function react(s,held,dt){
 dt=Math.max(0,Math.min(dt,.1));
 if(held!==s.held){s.held=held;s.time=0;s.phase=held?'startled':'relief';}
 s.time+=dt;
 if(held){s.phase=s.time<.55?'startled':'panic';s.intensity=Math.min(1,s.time/1.1);}
 else {s.intensity=Math.max(0,s.intensity-dt*.35);if(s.time>3.5)s.phase='calm';}
 return s;
}
export function expression(s,index=0){
 if(s.phase==='startled')return {emoji:'😳',label:'The ground is moving…'};
 if(s.phase==='panic')return {emoji:index%2?'🫨':'😱',label:index%2?'Who is holding our world?!':'WE LIVE ON A HEX?!'};
 if(s.phase==='relief')return {emoji:'😮‍💨',label:'Ground. Lovely, lovely ground.'};
 return {emoji:'',label:''};
}

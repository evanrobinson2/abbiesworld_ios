export function replayChange(state, command, duration, residentIds) {
 if (!Number.isFinite(duration) || duration <= 0) throw Error('Complete a daily run first');
 const next = {...state};
 switch (command.type) {
 case 'play': next.playing=true;if(next.seconds>=duration)next.seconds=0;break;
 case 'pause': next.playing=false;break;
 case 'seek':
  if(!Number.isFinite(command.seconds)||command.seconds<0||command.seconds>duration)throw Error('Replay time is outside this recording');
  next.seconds=command.seconds;next.playing=false;break;
 case 'step':
  if(![-60,60].includes(command.seconds))throw Error('Step by one recorded minute');
  next.seconds=Math.max(0,Math.min(duration,next.seconds+command.seconds));next.playing=false;break;
 case 'speed':
  if(![.25,1,4].includes(command.speed))throw Error('Unsupported replay speed');next.speed=command.speed;break;
 case 'resident':
  if(command.id!==''&&!residentIds.includes(command.id))throw Error('Resident is not in this recording');
  next.selectedId=command.id;if(!command.id)next.following=false;break;
 case 'follow':
  if(typeof command.enabled!=='boolean')throw Error('Follow requires a boolean');
  if(command.enabled&&!residentIds.includes(next.selectedId))throw Error('Select a resident first');next.following=command.enabled;break;
 case 'emojis':
  if(!['all','selected','off'].includes(command.mode))throw Error('Unsupported activity display');next.emojis=command.mode;break;
 default: throw Error('Unsupported replay command');
 }
 return next;
}
export function replayAdvance(state, elapsed, duration) {
 if(!state.playing)return state;
 const seconds=Math.min(duration,state.seconds+Math.max(0,elapsed)*duration/300*state.speed);
 return {...state,seconds,playing:seconds<duration};
}
export function replaySample(samples, seconds) {
 if(!samples?.length)return null;
 let low=0,high=samples.length-1;
 while(low<high){const mid=Math.ceil((low+high)/2);if(samples[mid].seconds<=seconds)low=mid;else high=mid-1;}
 return {index:low,current:samples[low],next:samples[Math.min(low+1,samples.length-1)]};
}

import {ensureFerrySchedule,vipActive} from './moon-vip-visit.mjs';
import {resupplyProduction} from './moon-production.mjs';
import {rocketPhase} from './moon-colony.mjs';
export function dispatchAvailability(state){const r=state.rocket,s=ensureFerrySchedule(state),t=state.seconds-s.lastArrival;if(vipActive(state))return {ready:false,label:'VIP visit has pad priority'};if(r.dispatch)return {ready:false,label:'Dropship en route'};if(r.lastDispatchMonth===Math.floor(state.seconds/180))return {ready:false,label:'Extra drop used this month'};if(t<38)return {ready:false,label:'Ferry at base / departing'};if(ensureFerrySchedule(state).nextArrival-state.seconds<70)return {ready:false,label:'Monthly ferry due soon'};return {ready:true,label:'Request dropship'};}
export function requestDropship(state){if(!dispatchAvailability(state).ready)return false;state.rocket.dispatch={started:state.seconds,unloaded:false};state.rocket.lastDispatchMonth=Math.floor(state.seconds/180);return true;}
export function flightPhase(seconds,manifest){
 if(manifest?.dispatch)return rocketPhase(164+seconds-manifest.dispatch.started);
 const y=manifest?.yieldFlight;if(y&&seconds<y.started+16){const q=Math.max(0,(seconds-y.started)/16);return {phase:'ascending',altitude:y.altitude+(38-y.altitude)*q*q,thrust:1};}
 const s=manifest?.schedule;if(!s)return rocketPhase(seconds);
 const vip=manifest.vip&&!['home'].includes(manifest.vip.phase);if(vip)return {phase:'in-transit',altitude:38,thrust:0};
 if(seconds>=s.nextArrival-16&&seconds<s.nextArrival)return rocketPhase(164+seconds-(s.nextArrival-16));
 if(seconds-s.lastArrival<38)return rocketPhase(seconds-s.lastArrival);
 return {phase:'in-transit',altitude:38,thrust:0};
}
export function advanceDispatch(state){const r=state.rocket,d=r.dispatch;if(!d)return;const elapsed=state.seconds-d.started;if(elapsed>=16&&!d.unloaded){d.unloaded=true;const q=Math.max(0,24-state.stock.supplies);state.stock.supplies+=q;state.replenished.supplies+=q;r.lastSupply=q;r.lastReturn=state.science.atLab;state.science.returned+=state.science.atLab;state.science.atLab=0;resupplyProduction(state.production);r.extraVisits=(r.extraVisits||0)+1;}if(elapsed>=54)r.dispatch=null;}

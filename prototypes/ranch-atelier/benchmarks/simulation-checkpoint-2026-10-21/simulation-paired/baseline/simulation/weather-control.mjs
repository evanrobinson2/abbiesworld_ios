import {WEATHER,weatherFor} from './weather-state.mjs';
export const WEATHER_CHOICES=[['auto','Automatic'],...Object.keys(WEATHER).map(id=>[id,id[0].toUpperCase()+id.slice(1)])];
export const normalizeWeather=mode=>Object.hasOwn(WEATHER,mode)?mode:'auto';
export function selectWeather(state,mode,seed=0){
 state.weatherOverride=normalizeWeather(mode);
 state.weather=state.weatherOverride==='auto'?weatherFor(state.calendar?.day??1,state.season?.index??1,state.calendar?.hour??12,seed):state.weatherOverride;
 return state.weather;
}
export const weatherIcon=weather=>({clear:'summer',cloudy:'cloud',rain:'rain',wind:'wind',hail:'hail',snow:'winter',heat:'heat'})[weather]||'cloud';

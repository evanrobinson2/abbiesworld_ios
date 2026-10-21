import {weatherFor,shelterWeather} from './simulation/weather-state.mjs';
import {chooseActivity} from './simulation/life-learning.mjs';
import {hash} from './town-life/people/core.mjs';
export const DAY_SECONDS=180,ACTIVITY_RATE=6;
export const dayName=day=>['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][((day-1)%7+7)%7];
export function schedule(p,calendar={day:1,hour:12},weather='clear'){
 const h=calendar.hour,weekend=(calendar.day-1)%7>=5,sunday=(calendar.day-1)%7===6,offset=(hash(p.id)%4)*.15;
 if(!p.alive)return {id:'remembered',text:'Remembered',indoors:true};
 if(h<6+offset||h>=21+offset)return {id:'sleep',text:'Sleeping',indoors:true};
 if(h<7.5||h>=19&&h<20)return {id:'meal',text:h<12?'Eating breakfast':'Sharing dinner',indoors:true};
 if(h>=12&&h<13)return {id:'lunch',text:'Taking a lunch break',indoors:true};
 if(p.age<5)return {id:'family',text:'At home with family',indoors:true};
 if(p.age<18){if(!weekend&&h>=8&&h<15)return {id:'school',text:'At school off-ranch',indoors:true};if(shelterWeather(weather))return {id:'family',text:'Playing indoors out of the weather',indoors:true};return h<19?{id:'play',text:'Playing at the playground',role:'playground'}:{id:'family',text:'At home with family',indoors:true};}
 if(p.visiting)return h>=8&&h<18?{id:'care',text:'Caring for livestock'}:{id:'off-duty',text:'Off duty · visiting farmhand',indoors:true};
 if(p.age>=67||h>=17||sunday&&h>=10)return shelterWeather(weather)?{id:'family',text:'Socializing under cover',indoors:true}:{id:'social',text:'Visiting a favorite bench',role:'home'};
 if(p.occupation==='town'&&!weekend&&h>=8&&h<17)return {id:'town',text:'Working off-ranch',indoors:true};
 if(shelterWeather(weather))return {id:'cover',text:'Taking shelter from weather',indoors:true};
 const slot=Math.floor(h),choice=chooseActivity(p.interests,p.id+':'+calendar.day+':'+slot);
 if(slot===7||slot===16||weekend&&slot===9)return [{id:'garden',text:'Tending the kitchen garden',role:'field'},{id:'eggs',text:'Collecting eggs',species:'chicken'},{id:'groom',text:'Brushing a familiar horse',species:'horse'},{id:'apples',text:'Gathering orchard apples',role:'field'}][choice];
 if(h>=10&&h<10.5||h>=15&&h<15.5)return {id:'social',text:'Taking a break with neighbors',role:'home'};
 return {id:'care',text:'Caring for livestock'};
}
export function animalSchedule(species,hour){if(species==='chicken')return hour<6||hour>=19?'Roosting':hour<8||hour>=17?'Feeding':'Scratching';if(hour<6||hour>=21)return 'Resting';if(hour<8||hour>=17&&hour<19)return 'Feeding';if(hour>=12&&hour<14)return 'Resting';return species==='goat'?'Climbing':'Grazing';}
export function weatherAt(day,season,hour=12,seed=0){return weatherFor(day,season,hour,seed);}

export const DRINKS={latte:{name:'Latte',foam:.2},cappuccino:{name:'Cappuccino',foam:.55}};
export const STEPS=[
 {id:'cup',label:'Cup',icon:'☕',hint:'Put the cup under the coffee spout.'},
 {id:'brew',label:'Coffee',icon:'●',hint:'Press the round button. Watch the coffee fill your cup.'},
 {id:'milk',label:'Milk',icon:'🥛',hint:'Pour milk into the little jug.'},
 {id:'steam',label:'Foam',icon:'☁',hint:'Turn the steam knob. Make the milk fluffy.'},
 {id:'pour',label:'Pour',icon:'↘',hint:'Tip the jug and pour the warm milk into your cup.'},
 {id:'serve',label:'Serve',icon:'♡',hint:'Your coffee is ready. Give it to your customer.'}
];
export function newCoffee(drink='latte'){if(!DRINKS[drink])throw Error('Unknown drink');return {drink,step:0,served:false};}
export function coffeeAction(state,action){if(state.served||STEPS[state.step]?.id!==action)return {state,accepted:false};return {state:action==='serve'?{...state,served:true}:{...state,step:state.step+1},accepted:true};}

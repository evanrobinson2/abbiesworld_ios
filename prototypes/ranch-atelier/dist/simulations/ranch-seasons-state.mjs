// Artistic seasonal cycle and deliberately simplified husbandry factors, not climate data.
export const SEASONS=[
 {name:'Spring',grazing:.85,feed:1,water:1,snow:0,leaf:1,color:'#9ac56a'},
 {name:'Summer',grazing:1,feed:1,water:1.2,snow:0,leaf:1,color:'#669347'},
 {name:'Autumn',grazing:.45,feed:1.1,water:1,snow:0,leaf:.75,color:'#cf7034'},
 {name:'Winter',grazing:0,feed:1.3,water:.9,snow:1,leaf:0,color:'#a08353'}
];
export function seasonalState(phase=.25){const p=((phase%1)+1)%1*4,index=Math.floor(p),t=p-index,a=SEASONS[index],b=SEASONS[(index+1)%4],blend=Math.max(0,(t-.65)/.35);const mix=k=>a[k]+(b[k]-a[k])*blend;return {name:a.name,index,next:(index+1)%4,blend,phase:p/4,grazing:mix('grazing'),feed:mix('feed'),water:mix('water'),snow:mix('snow'),leaf:mix('leaf')};}
export function advanceSeason(phase,seconds,yearMinutes=8){return (phase+Math.max(0,seconds)/(Math.max(2,yearMinutes)*60))%1;}

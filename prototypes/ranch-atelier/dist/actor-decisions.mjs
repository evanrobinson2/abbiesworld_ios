import {GoalEvaluator} from './vendor/yuka/GoalEvaluator.mjs';
class Flee extends GoalEvaluator {calculateDesirability({actor,target,time}){return target&&(!actor.weapon||actor.hp/actor.maxHp<actor.fleeAt||(actor.fleeUntil||0)>time)?1:0;}setGoal(c){c.choice='flee';}}
class Engage extends GoalEvaluator {calculateDesirability({actor,target}){return target&&actor.weapon ? .8 : 0;}setGoal(c){c.choice='engage';}}
class Rest extends GoalEvaluator {calculateDesirability(){return .01;}setGoal(c){c.choice='idle';}}
const evaluators=[new Flee(),new Engage(),new Rest()];
export function chooseActorGoal(actor,target,time){const context={actor,target,time,choice:'idle'};let best=null,score=-1;for(const e of evaluators){const value=e.calculateDesirability(context)*e.characterBias;if(value>score){score=value;best=e;}}best.setGoal(context);return context.choice;}

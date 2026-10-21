import {animatePerson} from './town-life/people/models.mjs';
// Pose bob is local to the rig; the ranch root must stay on its sampled terrain.
export function animateRanchPerson(worker,state,distance,dt,heightAt,paused=false){
 if(paused)return;
 animatePerson(worker.body,state,distance,dt,false);
 const {x,z}=worker.position;
 worker.body.position.set(x,heightAt(x,z)+worker.body.userData.pose.bob,z);
}

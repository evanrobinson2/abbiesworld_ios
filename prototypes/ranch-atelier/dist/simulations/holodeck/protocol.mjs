// Holodeck scene-control protocol, version 1.
// One vocabulary shared by the browser stage, the relay, the Creator MCP server and any
// other voice or chat model. Commands are data: there is no code execution or DOM access.
export const PROTOCOL='holodeck/1';
export const ROOM_PATTERN=/^[A-Za-z0-9_-]{22,64}$/;

const num={type:'number'},vec3={type:'array',items:num,minItems:3,maxItems:3,description:'[x, y, z] in metres; y is up'};
const id={type:'string',pattern:'^[A-Za-z0-9_.-]{1,48}$',description:'Stable name you choose, e.g. "dragon-1"'};
const color={type:'string',pattern:'^#[0-9a-fA-F]{6}$',description:'CSS hex colour, e.g. "#ff8800"'};
export const SHAPES=['box','sphere','cone','cylinder','torus','capsule','pyramid','ring','star'];
export const BEHAVIORS=['none','spin','bob','pulse','orbit','hop','chase'];
export const WEATHER=['auto','clear','cloudy','rain','wind','hail','snow','heat'];

// Each op: description, JSON schema for args, and whether it changes the scene.
export const OPS={
 state:{description:'Return the full scene snapshot: camera, clock, weather, your entities, world inhabitants and the last thing the viewer tapped.',args:{type:'object',properties:{world:{type:'boolean',description:'Include up to 80 world inhabitants and buildings (default true)'}}},readOnly:true},
 spawn:{description:'Create an entity. Give exactly one of shape, asset (catalog id) or person. Position with at, or near another entity/world thing. Placed on the ground unless ground is false.',args:{type:'object',properties:{id,shape:{type:'string',enum:SHAPES},asset:{type:'string',pattern:'^[a-z0-9-]{1,64}$',description:'Registered model id from the asset catalog (see op "catalog")'},person:{type:'object',properties:{role:{type:'string',enum:['rancher','child','elder','visitor','zombie']},name:{type:'string',maxLength:40}}},at:vec3,near:{type:'string',maxLength:64,description:'Entity id or world name to place beside'},offset:vec3,ground:{type:'boolean'},scale:{anyOf:[num,vec3],description:'1 = about one person tall (see state.scaleHint); assets use their authored size'},rotationY:{type:'number',description:'Degrees'},color,emissive:color,opacity:{type:'number',minimum:0,maximum:1},label:{type:'string',maxLength:40,description:'Floating name tag'},behavior:{type:'string',enum:BEHAVIORS}}},mutates:true},
 remove:{description:'Remove one entity by id, or all of your entities with all:true. World inhabitants cannot be removed.',args:{type:'object',properties:{id,all:{type:'boolean'}}},mutates:true},
 move:{description:'Glide an entity to a position (or near something) over duration seconds; 0 teleports.',args:{type:'object',required:['id'],properties:{id,to:vec3,near:{type:'string',maxLength:64},offset:vec3,duration:{type:'number',minimum:0,maximum:60},ground:{type:'boolean'}}},mutates:true},
 transform:{description:'Set position, rotation (degrees about Y, or [x,y,z] degrees) and/or scale instantly.',args:{type:'object',required:['id'],properties:{id,position:vec3,rotationY:num,rotation:vec3,scale:{anyOf:[num,vec3]}}},mutates:true},
 style:{description:'Change look: colour, glow, transparency, visibility, label.',args:{type:'object',required:['id'],properties:{id,color,emissive:color,opacity:{type:'number',minimum:0,maximum:1},visible:{type:'boolean'},label:{type:'string',maxLength:40}}},mutates:true},
 animate:{description:'Give an entity a looping behaviour. chase walks it after the nearest inhabitant (or target), and picks someone new when it catches them; speed 1 is a person\'s ordinary walk.',args:{type:'object',required:['id','behavior'],properties:{id,behavior:{type:'string',enum:BEHAVIORS},target:{type:'string',maxLength:64,description:'chase only: a person\'s name or entity id (default: whoever is nearest)'},speed:{type:'number',minimum:0,maximum:10},radius:{type:'number',minimum:0,maximum:50}}},mutates:true},
 camera:{description:'Move the viewer camera. Use focus to frame an entity or world thing, or give position/target. fit:true frames the whole scene.',args:{type:'object',properties:{focus:{type:'string',maxLength:64},distance:{type:'number',minimum:1,maximum:400},position:vec3,target:vec3,fov:{type:'number',minimum:15,maximum:90},duration:{type:'number',minimum:0,maximum:20},fit:{type:'boolean'}}},mutates:true},
 time:{description:'Set the hour of day (0-24), pause or resume the simulation, or change its speed.',args:{type:'object',properties:{hour:{type:'number',minimum:0,maximum:24},paused:{type:'boolean'},speed:{type:'number',enum:[0.5,1,2],description:'Simulation speed multiplier'}}},mutates:true},
 people:{description:'Change how fast the world\'s own inhabitants walk. 1 is normal; 1.05 is 5% faster.',args:{type:'object',required:['speed'],properties:{speed:{type:'number',minimum:0.25,maximum:3}}},mutates:true},
 weather:{description:'Change the weather.',args:{type:'object',required:['mode'],properties:{mode:{type:'string',enum:WEATHER}}},mutates:true},
 narrate:{description:'Show a caption to the viewer, as the ship\'s computer. speak:true also reads it aloud on the viewer\'s device.',args:{type:'object',required:['text'],properties:{text:{type:'string',minLength:1,maxLength:280},seconds:{type:'number',minimum:1,maximum:30},speak:{type:'boolean'}}},mutates:true},
 screenshot:{description:'Capture exactly what the viewer sees, as a JPEG.',args:{type:'object',properties:{width:{type:'integer',minimum:160,maximum:1600},quality:{type:'number',minimum:0.3,maximum:0.95}}},readOnly:true},
 catalog:{description:'List registered model ids usable with spawn asset.',args:{type:'object',properties:{}},readOnly:true}
};

export function validate(schema,value,path='args'){
 if(schema.anyOf){const errors=[];for(const s of schema.anyOf){try{validate(s,value,path);return;}catch(e){errors.push(e.message);}}throw Error(errors[0]);}
 if(schema.type==='object'){
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error(path+' must be an object');
  for(const key of schema.required||[])if(!Object.hasOwn(value,key))throw Error(path+'.'+key+' is required');
  for(const [key,item] of Object.entries(value)){if(!Object.hasOwn(schema.properties||{},key))throw Error('Unknown argument '+path+'.'+key);validate(schema.properties[key],item,path+'.'+key);}
  return;
 }
 if(schema.type==='array'){
  if(!Array.isArray(value))throw Error(path+' must be an array');
  if(value.length<(schema.minItems??0)||value.length>(schema.maxItems??Infinity))throw Error(path+' has the wrong length');
  value.forEach((v,i)=>validate(schema.items,v,path+'['+i+']'));return;
 }
 if(schema.type==='integer'?!Number.isInteger(value):schema.type==='number'?!Number.isFinite(value):typeof value!==schema.type)throw Error(path+' must be a '+schema.type);
 if(schema.enum&&!schema.enum.includes(value))throw Error(path+' must be one of '+schema.enum.join(', '));
 if(schema.pattern&&!new RegExp(schema.pattern).test(value))throw Error(path+' has an invalid format');
 if(schema.minLength!==undefined&&value.length<schema.minLength||schema.maxLength!==undefined&&value.length>schema.maxLength)throw Error(path+' has an invalid length');
 if(schema.minimum!==undefined&&value<schema.minimum||schema.maximum!==undefined&&value>schema.maximum)throw Error(path+' is out of range');
}

export function checkCommand(command){
 if(!command||typeof command.op!=='string'||!OPS[command.op])throw Error('Unknown op '+command?.op);
 validate(OPS[command.op].args,command.args??{});
 if(command.op==='spawn'){const kinds=['shape','asset','person'].filter(k=>command.args[k]!==undefined);if(kinds.length!==1)throw Error('spawn needs exactly one of shape, asset or person');}
 return command;
}

// Messages on the wire (JSON text frames):
//  creator -> stage  {t:'cmd', id, ops:[{op,args}], sentAt}       one batch applies in a single frame
//  stage -> creator  {t:'ack', id, ok, results:[...], error?, timing:{received,applied,drawn}}
//  stage -> creator  {t:'state', rev, state}                       pushed on change, at most 5 per second
//  stage -> creator  {t:'event', kind:'tap'|'select', ...}         what the viewer did
//  relay -> anyone   {t:'welcome'|'presence', instance, peers:{stage,creator}}
//  either -> relay   {t:'ping', at} -> {t:'pong', at, server}

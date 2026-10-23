// Holodeck Creator MCP server (stdio). Gives a model live control of the scene the viewer is
// watching in the Ranch Atelier sandbox: one persistent relay connection, so each command costs
// one network round trip plus a frame.
//   node mcp/holodeck.mjs            run the MCP server
//   node mcp/holodeck.mjs --tools    print the same commands as plain JSON-schema function tools
//                                    (for OpenAI Realtime / ChatGPT voice or any other model)
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {z} from 'zod';
import {OPS,PROTOCOL} from '../simulations/holodeck/protocol.mjs';
import {createClient,roomConfig} from './holodeck-client.mjs';

const opList=Object.entries(OPS).map(([name,o])=>`- ${name}: ${o.description} Args: ${JSON.stringify(o.args.properties)}`).join('\n');
export const DO_DESCRIPTION=`Change the live holodeck scene the viewer is watching. Send several ops in one call: they apply together in a single frame, and the call returns once that frame is drawn. Positions are metres, y up; use state.scaleHint.personHeight to size things and state.lastTap for "there".\n${opList}`;

export function functionTools(){
 return [
  {type:'function',name:'holodeck_do',description:DO_DESCRIPTION,parameters:{type:'object',required:['ops'],properties:{ops:{type:'array',minItems:1,maxItems:64,items:{type:'object',required:['op'],properties:{op:{type:'string',enum:Object.keys(OPS)},args:{type:'object'}}}}}}},
  {type:'function',name:'holodeck_state',description:'Read the scene as the viewer sees it now (camera, clock, weather, your entities, inhabitants) plus anything they tapped or selected since the last read.',parameters:{type:'object',properties:{world:{type:'boolean'}}}},
  {type:'function',name:'holodeck_look',description:'See a JPEG of exactly what the viewer sees.',parameters:{type:'object',properties:{width:{type:'integer',minimum:160,maximum:1600}}}}
 ];
}

if(process.argv.includes('--tools')){console.log(JSON.stringify({protocol:PROTOCOL,tools:functionTools()},null,1));process.exit(0);}

const config=roomConfig();
const client=createClient({relay:config.relay,room:config.room,log:m=>console.error('[holodeck] '+m)});
client.open().catch(()=>{});
const server=new McpServer({name:'holodeck',version:'1.0.0'},{instructions:`You are the ship's computer for Abbie's World. The viewer watches a live 3D scene at ${config.link}. Call holodeck_link first if they are not connected. Read holodeck_state before acting, batch changes into one holodeck_do call, narrate briefly, and holodeck_look when you need to see the result.`});
const text=v=>({type:'text',text:typeof v==='string'?v:JSON.stringify(v)});

server.registerTool('holodeck_link',{description:'Get the private link that opens the holodeck on the viewer\'s phone or PC, and whether it is connected. The link is a capability: share it only with the viewer.',inputSchema:{},annotations:{readOnlyHint:true}},async()=>{
 await client.ready({wait:1500,attempts:2}).catch(()=>false);
 return {content:[text({link:config.link,viewerConnected:client.peers.stage>0,relayInstance:client.instance})]};
});

server.registerTool('holodeck_state',{description:'Read the scene as the viewer sees it now (camera, clock, weather, your entities, world inhabitants) plus anything they tapped or selected since the last read. Cached from the live stream, so it is instant unless world:true.',inputSchema:{world:z.boolean().optional().describe('Also list up to 80 inhabitants and buildings (one round trip)')},annotations:{readOnlyHint:true}},async({world})=>{
 if(world||!client.state){const ack=await client.send([{op:'state',args:{world:!!world}}]);if(!ack.ok)return {isError:true,content:[text(ack.error)]};return {content:[text({state:ack.results[0],events:client.drainEvents()})]};}
 return {content:[text({state:client.state,stateAgeMs:client.stateAge,events:client.drainEvents()})]};
});

server.registerTool('holodeck_do',{description:DO_DESCRIPTION,inputSchema:{ops:z.array(z.object({op:z.enum(Object.keys(OPS)),args:z.record(z.string(),z.any()).optional()})).min(1).max(64)},annotations:{readOnlyHint:false,destructiveHint:false,openWorldHint:false}},async({ops})=>{
 const ack=await client.send(ops);
 if(!ack.ok)return {isError:true,content:[text({error:ack.error,results:ack.results})]};
 const shots=[];const results=ack.results.map(r=>{if(r?.mime){shots.push(r);return {screenshot:`${r.width}x${r.height}`};}return r;});
 return {content:[text({ok:true,results,commandToPixelMs:ack.commandToPixelMs,roundTripMs:ack.roundTripMs,events:client.drainEvents()}),...shots.map(s=>({type:'image',mimeType:s.mime,data:s.data}))]};
});

server.registerTool('holodeck_look',{description:'See a JPEG of exactly what the viewer sees right now (3D view only; captions are not included).',inputSchema:{width:z.number().int().min(160).max(1600).optional()},annotations:{readOnlyHint:true}},async({width})=>{
 const ack=await client.send([{op:'screenshot',args:{width:width??960}}]);
 if(!ack.ok)return {isError:true,content:[text(ack.error)]};
 const s=ack.results[0];return {content:[{type:'image',mimeType:s.mime,data:s.data},text({width:s.width,height:s.height,events:client.drainEvents()})]};
});

await server.connect(new StdioServerTransport());

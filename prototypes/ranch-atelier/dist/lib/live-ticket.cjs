// Short-lived tickets that let a page open the live mode relay (api/live-socket.js).
// HMAC of the expiry with LIVE_TICKET_SECRET; issued by POST /api/live {action:'session'}.
const {createHmac,timingSafeEqual,randomBytes}=require('node:crypto');
const TTL=60000;
const sign=(body,secret)=>createHmac('sha256',secret).update(body).digest('base64url');
// ttl: 60 s for the relay; live-voice tickets (api/live-voice.js) last a whole session.
function issueTicket(env=process.env,now=Date.now(),ttl=TTL,scope=''){
 if(!env.LIVE_TICKET_SECRET)return null;
 const body=`${now+ttl}.${randomBytes(6).toString('base64url')}`;
 return `${body}.${sign(scope+body,env.LIVE_TICKET_SECRET)}`;
}
function checkTicket(ticket,env=process.env,now=Date.now(),scope=''){
 if(!env.LIVE_TICKET_SECRET||typeof ticket!=='string')return false;
 const at=ticket.lastIndexOf('.');if(at<0)return false;
 const body=ticket.slice(0,at),mac=Buffer.from(ticket.slice(at+1)),want=Buffer.from(sign(scope+body,env.LIVE_TICKET_SECRET));
 if(mac.length!==want.length||!timingSafeEqual(mac,want))return false;
 return Number(body.split('.')[0])>now;
}
module.exports={issueTicket,checkTicket};

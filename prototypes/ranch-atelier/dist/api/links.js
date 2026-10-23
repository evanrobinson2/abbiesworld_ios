// Outside links for the front door (home/), kept in the Vercel env so they can change without a code change.
//  KICKSTARTER_URL     the live Kickstarter campaign
const safe=(url,hosts)=>{try{const u=new URL(url);return u.protocol==='https:'&&hosts.some(h=>u.hostname===h||u.hostname.endsWith('.'+h))?u.href:null;}catch{return null;}};
function createHandler({env=process.env}={}){return (req,res)=>{
 res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','public, max-age=60');
 res.end(JSON.stringify({kickstarter:safe(env.KICKSTARTER_URL,['kickstarter.com','kck.st'])}));
};}
module.exports=createHandler();module.exports.createHandler=createHandler;

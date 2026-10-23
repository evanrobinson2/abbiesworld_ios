// The front door: say "Signed in" when you are, and show the donate and Kickstarter buttons once their links exist
// (api/links.js reads them from the Vercel env, so they can go live without a code change).
(async()=>{
 const $=id=>document.getElementById(id);
 try{
  const me=await (await fetch('/api/me',{cache:'no-store'})).json();
  if(me.signedIn)for(const id of ['signin','signin-hero','signin-foot']){const a=$(id);if(!a)continue;a.textContent=id==='signin-hero'?'Keep playing':'Signed in';a.href='/sandbox';}
  else if(!me.signInReady)for(const id of ['signin','signin-hero','signin-foot'])$(id)?.remove();
 }catch{}
 try{
  const links=await (await fetch('/api/links',{cache:'no-store'})).json();
  for(const [key,url] of Object.entries({donate:links.donate,kickstarter:links.kickstarter})){
   if(!url)continue;const a=$(key);a.href=url;a.hidden=false;a.rel='noopener';$(key+'-soon')?.remove();
  }
 }catch{}
})();

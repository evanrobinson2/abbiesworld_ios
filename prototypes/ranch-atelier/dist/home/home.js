// The front door: say "Signed in" when you are, and show Support once Stripe is set up (api/support.js) and the Kickstarter
// button once its link is in the Vercel env (api/links.js).
(async()=>{
 const $=id=>document.getElementById(id);
 try{
  const me=await (await fetch('/api/me',{cache:'no-store'})).json();
  if(me.signedIn)for(const id of ['signin','signin-hero','signin-foot']){const a=$(id);if(!a)continue;a.textContent=id==='signin-hero'?'Keep playing':'Signed in';a.href='/sandbox';}
  else if(!me.signInReady)for(const id of ['signin','signin-hero','signin-foot'])$(id)?.remove();
 }catch{}
 try{
  const links=await (await fetch('/api/links',{cache:'no-store'})).json();
  if(links.kickstarter){const a=$('kickstarter');a.href=links.kickstarter;a.hidden=false;a.rel='noopener';$('kickstarter-soon')?.remove();}
 }catch{}
 try{
  const s=await (await fetch('/api/support',{cache:'no-store'})).json();
  if(s.supporter){$('support-manage').hidden=false;$('support-note').textContent=`Thank you for supporting Abbie's World. You have $${s.left.toFixed(2)} of magic left this month.`;}
  else if(s.ready){$('support-start').hidden=false;$('support-note').textContent='A grown-up signs in first, then pays on Stripe.';}
 }catch{}
})();

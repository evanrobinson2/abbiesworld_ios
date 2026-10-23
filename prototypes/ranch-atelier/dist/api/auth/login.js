// GET /api/auth/login?return=/sandbox  sends the browser to the Auth0 sign-in page. See ACCOUNTS.md.
const {beginSignIn}=require('../../lib/account.cjs');
module.exports=(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 const out=beginSignIn(req);
 if(!out){res.statusCode=503;res.setHeader('Content-Type','text/plain');return res.end('Sign-in is not set up on this address yet.');}
 res.statusCode=302;if(out.cookie)res.setHeader('Set-Cookie',out.cookie);res.setHeader('Location',out.location);res.end();
};

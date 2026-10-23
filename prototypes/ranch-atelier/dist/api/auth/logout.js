// GET /api/auth/logout  forgets the session here and at Auth0, then returns to the ranch.
const {signOut}=require('../../lib/account.cjs');
module.exports=(req,res)=>{const out=signOut(req);res.setHeader('Cache-Control','no-store');res.statusCode=302;res.setHeader('Set-Cookie',out.cookie);res.setHeader('Location',out.location);res.end();};

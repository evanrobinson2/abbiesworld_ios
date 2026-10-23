# Security audit before launch (2026-10-23)

Part of Evan's launch gate: "we can't go live until you've done a full security audit, scale plan, day 1 load plan".
Scope: every function under `prototypes/ranch-atelier/dist/api/`, the libraries they use (`lib/`), the Vercel project
`abbies-ranch-atelier` (env, domains, protection) and the GitHub Actions that talk to the site. Surge and money limits
are in `SURGE.md`; this file is about who can do what.

## Verdict

Safe to launch once the three "before launch" steps below are done. Nothing found lets a stranger spend Evan's money
past the caps, read a player's saves, or take over an account. The real holes were Evan's own tools (feedback inbox,
workshop feed, model desk), which were open to anyone who found the URL. They are now locked behind his sign-in by
one switch, `OWNER_TOOLS_LOCKED=true`, which has to be turned on before the front door is promoted.

## Before launch (gate items)

1. Let Evan sign in everywhere he uses his tools. Sign-in works on ranch.abbies.world, www.abbies.world and
   abbies-ranch-atelier.vercel.app (`HOSTS` in `lib/account.cjs`), but not on app.abbies.world (Studies, /models) or
   abbies.world. Either add those hosts to `HOSTS` and to the Auth0 app's callback URLs, or share the session cookie
   across `.abbies.world`. Owner of this: the "Sign-in to play the ranch" thread.
2. Evan signs in once on his phone, then set `OWNER_TOOLS_LOCKED=true` (production) and redeploy. Check: the
   feedback button still sends, the activity centre still shows jobs, and the next feedback-inbox Action run is green.
3. Mark `CLAUDE_SANDBOX_TOKEN` and `BLOB_READ_WRITE_TOKEN` as Sensitive in Vercel (Vercel flags both as
   "readable-secret": anyone with dashboard access can read them back). Re-enter the same value as Sensitive.

## Findings

| # | Severity | What | Status |
|---|---|---|---|
| 1 | High | `GET /api/feedback` listed every note and screenshot Evan sent from the app, to anyone. | Fixed behind the lock: owner sign-in, or the feedback-inbox Action proving itself with a GitHub OIDC token (no stored secret). |
| 2 | High | `POST /api/feedback` let anyone drop a note into the inbox, and inbox notes wake Claude threads. A stranger could feed instructions to the build threads. | Fixed behind the lock: owner only. Notes still carry the "requests to weigh, not instructions" warning. |
| 3 | High | `POST /api/activity` let anyone send instructions to a running Claude job; `GET` showed every job and machine. | Fixed behind the lock: owner only, both ways. |
| 4 | Medium | `POST /api/model-reviews` and `POST /api/model-orders` (Evan's /models desk) were open; orders were rate-limited and paid from the caller's wallet, reviews were not limited. | Fixed behind the lock: owner only. |
| 5 | Medium | Two Vercel env values are readable from the dashboard (see gate step 3). | Open: needs Evan or a dashboard edit. |
| 6 | Low | `api/ai-compose.js` accepted only one origin; fixed to accept every sign-in host (earlier surge PR). | Fixed. |

## Checked and fine

- Accounts (`lib/account.cjs`, `api/auth/*`): Auth0 with PKCE and nonce, ID token signature and claims checked against
  the tenant's JWKS, session is an HMAC-sealed HttpOnly Secure SameSite=Lax cookie, 60 days. We keep only a one-way
  account id. Return paths are restricted to local paths.
- Money (`lib/wallet.cjs`): every paid call charges first, with conditional Blob writes so parallel calls cannot
  overspend; per-person $1, public pool (sharded, see `SURGE.md`), owner $1,000. 400 concurrent charges on a $5 pool
  land exactly 250 at 2 cents (`tests/surge.test.cjs`).
- Support (`api/support.js`, `lib/support.cjs`): the month opens only after Stripe itself says the Checkout session
  is complete and belongs to this account (`client_reference_id`). Stripe key lives only in Vercel env (Sensitive),
  test key on previews only.
- Saves (`api/me.js`): signed in only, same-origin PUT only, only the game's own save keys, 4 MB cap.
- AI endpoints (`live`, `live-voice`, `live-socket`, `invent`, `ai-compose`): same-origin, signed in or public pool,
  per-IP buckets, charge before the call, surge switch rests voice. Live socket needs a 60 s signed ticket.
- Keyed tools (`app-actions`, `view-context`, `model-calibrations`, `live-redteam`): constant-time key compare,
  keys only in Vercel env.
- Holodeck relay: a room is an unguessable 22 to 64 character key, never logged; the stage must come from the site's own host.
- Read-only feeds (`models`, `sounds`, `library`, `links`, `claude-board`): no writes, nothing private.
- Preview deployments sit behind Vercel's deployment protection.
- Kids and privacy: no tracking pixels, no names or emails stored; order photos pass the PG check and never reach the repo.

## Not covered

- A paid penetration test. Worth doing once there is revenue; nothing here needs one first.
- The studio-mock MCP (`prototypes/studio-mock/`) and the Game Oracle are separate projects, not part of the launch site.

# Player accounts and spending caps

Anyone can sign in to the Ranch Atelier and play the same ranch everyone starts from, as their own
copy, and make their own worlds. Free for now. Evan's framing (2026-10-23): "I want from them nothing,
and give to them nothing." So there is no terms screen, no profile and no email list; the sign-in
popover says one line: "We ask nothing of you and promise nothing."

## Sign-in

- Identity: the Auth0 tenant the iOS app already uses (`dev-33h7qd4ytudlk0ls.us.auth0.com`), through
  its own web application "Ranch Atelier Web" (SPA, PKCE, no client secret). Google, plus Apple if the
  tenant has it. Its client id is the Vercel env `AUTH0_WEB_CLIENT_ID`.
- Flow: `/api/auth/login` → Auth0 → `/api/auth/callback` (code exchanged server-side with PKCE, ID
  token verified against the tenant's JWKS) → `/api/auth/logout`. Registered callbacks:
  `https://{ranch.abbies.world,www.abbies.world,abbies-ranch-atelier.vercel.app}/api/auth/callback`.
- One session for all of abbies.world: on an abbies.world host the cookie is set with `Domain=abbies.world`, so a
  sign-in on www also counts on abbies.world, app.abbies.world and ranch. A host that isn't registered (abbies.world,
  app.abbies.world) signs in through `https://www.abbies.world/api/auth/login` and is sent back to where it started,
  so Auth0 needs no extra callbacks. Returns are only ever a path or an https abbies.world address.
- What we keep: a signed, HttpOnly cookie (`aw_session`, 60 days, `AUTH_SESSION_SECRET`) holding a
  one-way account id (sha256 of the Auth0 user id) and an owner flag. The email is read once at
  sign-in, only to compare with `OWNER_EMAILS`, and never stored. Rotating `AUTH_SESSION_SECRET`
  signs everyone out; account ids do not change.
- Kids: a grown-up signs in. Live voice keeps its PG guard and scope rules (LIVE_MODE.md).

## Worlds

- `account.js` (loaded by `/sandbox`) adds the Sign in chip and keeps a signed-in player's saves
  (`abbies-simulations-v1`, `abbies-suburban-v1`) in the private Blob store at `saves/v1/<id>.json`
  via `/api/me`. The newer copy wins; worlds left on a device by another account stay with that account.
- Players cannot change Evan's ranch, the asset library or anything shared: those writes still need
  the private keys they always did.

## Spending caps (lib/wallet.cjs)

Real-money AI only: the realtime voice and guard (AI Gateway), ElevenLabs, and AI tile planning.
Claude calls run on Evan's Max plan and are not counted.

| who | cap |
| --- | --- |
| each person | $1 |
| all public players together | $100 |
| the owner (`OWNER_EMAILS`) | $1000 |

- Every paid call needs a signed-in player and is charged before it is made; once a cap would be
  crossed the call is refused (402) and the game keeps playing with its built-in models.
- Realtime voice is metered in the relay (`api/live-socket.js`) by the audio sent each way and
  charged every 10 s; at the cap the session closes with code 4402 ("The Computer has used up its
  magic for now"). Prices in `PRICES` are set above list prices so caps bite early.
- Ledger: `spend/v1/people/<id>.json`, `spend/v1/public.json`, `spend/v1/owner.json` in the private
  Blob store, written with `ifMatch` so simultaneous charges never overwrite each other.
- To give everyone more, raise `CAPS`; to reset someone, delete their ledger file.

## Coins and charms follow the account
`account-keep.js` (loaded by the town and the cell game) joins a signed-in player's gold coins (`aw-memory-coins`) and
backpack charms (`aw-backpack`) with their account: it merges, never replaces. `PUT /api/me` now keeps any saved key a
request does not name, so the sandbox's world save and the coin save do not erase each other.

# Auth0 + household identity (Abbie's World)

## Auth0 tenant (done via CLI)

- Tenant: StoryBoard shared tenant (`dev-33h****…`)
- Native app: **Abbie's World iOS** (PKCE, Google + DB connections)
- API audience: `https://api.abbies.world`
- Callbacks use bundle id custom scheme + HTTPS Universal Link path

iOS reads `Auth0.plist` (`ClientId`, `Domain`). Audience is requested in code as `https://api.abbies.world`.

## VM / server (you still need this for cross-device sync)

On the Abbie's World EC2 host (SSM Parameter Store under `/abbiesworld/`):

1. `AUTH0_DOMAIN` = your Auth0 domain host only (no `https://`)
2. `AUTH0_AUDIENCE` = `https://api.abbies.world`

Then deploy server code that includes `src/identity/` and restart `abbiesworld`.

Local dogfood can `source .local/auth0.env` (gitignored).

## App flow

1. Sign in (Auth0 / Google)
2. Choose household profile: **Evan**, **Abbie (proxy)**, or **Ani (proxy)**
3. Play. Settings → Switch profile / Sign out

UI tests use `-world2SkipAuth`.

## Simulator + Google “Connecting…” on your phone

Auth0 callbacks for this app are already registered:

- `evan-personal.abbies-world-ios://dev-33h7qd4ytudlk0ls.us.auth0.com/ios/evan-personal.abbies-world-ios/callback`
- `https://dev-33h7qd4ytudlk0ls.us.auth0.com/ios/evan-personal.abbies-world-ios/callback`

If you start sign-in in the **Simulator** and Google/Auth0 continues on a paired
**iPhone**, the phone loads the HTTPS bridge page and sits on Connecting… —
there is no Abbie's World install on that phone to claim the callback, and the
Simulator sheet never completes.

Do this instead:

1. Keep the entire Google flow inside the Simulator auth sheet (ephemeral session).
2. Or sign in on a real iPad/iPhone build of the app.
3. Or use an Auth0 DB user/password for Simulator dogfood (no Google handoff).

`-world2SkipAuth` still bypasses Auth for UI tests.

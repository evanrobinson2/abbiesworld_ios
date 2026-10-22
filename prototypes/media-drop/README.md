# Abbie's World · Media Drop

Auth0-gated inbox for parking **Suno** songs and **Midjourney** images (plus any
photo/file) into Abbie's World. Only **`evanr2@gmail.com`** may sign in.

**Live:** https://media-drop-phi.vercel.app

## What you get

- Google / Auth0 login with a hard allowlist (`ALLOWED_EMAIL`)
- Drag-and-drop + phone file picker
- Paste CDN / attachment URLs
- QR code to open the same page on your phone
- PWA manifest + Android share-target (`/share`)
- Files land on the **Abbie's World server** under `media-inbox/` (`POST /api/assets/upload`)
- History media is served via `/api/blob` (Auth0 session required; proxies AW static)
- `tools/dev-asset-library/pull_inbox.mjs` mirrors them into the repo asset library

## Provisioned (already done)

| Piece | Status |
| --- | --- |
| Vercel project `media-drop` | linked + production alias |
| Auth0 (Vercel Marketplace) | app + Google connection |
| Abbie's World server | `ABBIES_WORLD_SERVER_URL` + `ABBIES_WORLD_SERVER_API_KEY` |
| Allowlist | `evanr2@gmail.com` |

This uses the **Auth0 Marketplace tenant** (separate from the iOS StoryBoard
native tenant). Same Google account; different Auth0 application.

## Local dogfood

```bash
cd prototypes/media-drop
vercel env pull .env.local --yes   # if needed
# ensure:
#   APP_BASE_URL=http://localhost:5175
#   ALLOWED_EMAIL=evanr2@gmail.com
npm install
npm run dev
# → http://localhost:5175
```

Auth0 callbacks already include `http://localhost:5175/auth/callback`.

## Super-easy phone intake

1. Copy a Midjourney image / Suno link
2. Open **AW Drop**
3. Tap **Recheck clipboard** — if iPhone blocks it (common for images),
   **long-press the Paste box** and choose Paste
4. Preview card → swipe right to send, left to dismiss
5. **History** tab = everything you’ve already sent

**Drop** and **History** are separate panels on purpose.

## Pull inbox into the repo / asset library

```bash
# needs ABBIES_WORLD_SERVER_URL + ABBIES_WORLD_SERVER_API_KEY
node tools/dev-asset-library/pull_inbox.mjs
```

Writes bytes under `AssetSources/MediaInbox/` and registers draft rows in
`data/dev-asset-library/library.json`.

## Redeploy

```bash
cd prototypes/media-drop
vercel --prod
```

# Ranch production deploy handoff (for Codex)

Written 2026-10-24 17:20Z by the "Vercel deploys broken" thread. No secrets in this file.

## What
Sole production deployer for Vercel project `abbies-ranch-atelier` (prj_BVnIsSnrYu2TkFgLpWiJrLW6NfzI, team slug `evan-8467`). Other threads merge to `main` and send a sha; the deployer ships main's head. The project is not Git-linked, so merging alone deploys nothing.

## The call
Vercel `create_deployment`, slug `evan-8467`, body:

```json
{"name":"abbies-ranch-atelier","project":"abbies-ranch-atelier","target":"production",
 "gitSource":{"type":"github","org":"evanrobinson2","repo":"abbiesworld_ios","ref":"main","sha":"<main head sha>"},
 "projectSettings":{"rootDirectory":"prototypes/ranch-atelier/dist","framework":null}}
```

Production only ever ships a commit on `main`. The build takes about 4 minutes; poll `get_deployment` until READY. Aliases on success: abbies.world, app.abbies.world, www.abbies.world, ranch.abbies.world, explore.abbies.world.

## When
- Batch every 10 minutes after the first request in a window.
- Ship at once when a relay says Evan is waiting, "ship it now", "fast ship", "urgent" or "right away".
- Hourly sweep trigger `trig_01Np5bYaXkvW4jufbtGkgJYk` (minute 49): deploy main's head only if no batch is pending and the head differs from live and touches `prototypes/ranch-atelier`. Docs-only and Game Oracle-only changes are skipped.
- If a newer head lands while a build is under 2 minutes old and someone is waiting, `cancel_deployment` the old build and ship the head.
- Use a background `sleep N` for timers (about 540 s for a batch window, about 245 s for a build check). `send_later` is unreliable.

## Pre-deploy check (on origin/main head H)
```
git fetch -q origin main && H=$(git rev-parse origin/main)
git merge-base --is-ancestor <requested sha> $H
for f in vercel.json whats-new.json review/feed.json studies/context.json; do git show $H:prototypes/ranch-atelier/dist/$f | python3 -m json.tool >/dev/null && echo "$f ok"; done
git show $H:prototypes/ranch-atelier/dist/studies/abbietown/index.html | grep -cE '^(<<<<<<<|=======|>>>>>>>)'   # expect 0
git show $H:prototypes/ranch-atelier/dist/studies/abbietown/index.html | grep -c town-hud-boot                  # expect 2
```

## Post-deploy check
Fetch https://app.abbies.world/town with `web_fetch_vercel_url` (about 980 KB, saved to a file). Confirm 0 conflict markers, `town-hud-boot` appears 2 times, and `node --check` passes on each inline `<script type="module">`. Then report "live at <local time> (UTC-4), main <sha>" to the coordinator and the requesting thread. Local time = UTC minus 4 hours.

## Last live
main `fab70d98251fb2ac13f51da1a992afe7f4eb3527`, READY 17:13:49Z (1:13 PM local), deployment `dpl_4F5fLyokfMPq8ybYxSQWJMEeCnSj`. No pending deploys. All requests to date are in it.

## Pitfalls
1. Never show Evan GitHub or PR links, PR numbers, branch names or check status. To Evan: "Shipping it; I'll post the link here when it's live." then "<local time> - Here's the link: https://...".
2. Merges into `studies/abbietown/index.html` have twice dropped the `town-hud-boot` script tag and once left conflict markers. Always run the check above.
3. Static files beat `vercel.json` rewrites; use redirects (the "/" front door is a redirect to /town).
4. The build runs `scripts/build.cjs`, which runs `check-mcp.cjs` and the node tests with the production env (`OWNER_TOOLS_LOCKED=true`). Tests must pin their own env (fixed in 8b4cb2a5).
5. Do not change production env vars unless told.
6. Messaging is limited to 60 messages per hour across threads: batch notices into one coordinator message.
7. Relays are signed `session_X`; `message_thread` shows `cse_X` for the same thread. Unknown ids go through the coordinator.
8. Cloud threads cannot reach `*.vercel.app` directly; use `get_access_to_vercel_url` or `web_fetch_vercel_url` on custom domains.
9. The auto-mode classifier can deny edits that touch tests or settings. Report rather than work around.
10. Every Evan-visible Ranch deploy needs a `whats-new.json` entry with `"tour": true` or `"tour": false` (CLAUDE.md).
11. Instant preview is separate: static pages under `preview/<name>/index.html` on any branch sync to R2 via a GitHub Action and serve at https://app.abbies.world/r2/previews/<name>/index.html. No deploy needed.

Docs: `docs/architecture/DEPLOYS.md`. Team memory files `deploy-path` and `town-hud-wiring` hold the same notes. Nothing of mine is unpushed.

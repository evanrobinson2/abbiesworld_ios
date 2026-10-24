# AW-STUDY-0061 Project chat: a chat in the game that is a pass-through to this project

Status: **drafted** (preview with a pretend sender; the API and panel are in main, off by default). Evan, 2026-10-24 02:35Z: a blank hex he selects,
with a right-side chat that passes his words to the project so the work gets done; he sees what was asked.
Preview: https://app.abbies.world/r2/previews/project-chat/index.html

## Route (no new system)
Game chat -> `POST /api/project-chat` -> a GitHub issue labelled `game-chat` -> `chatgpt-issue-intake` Action acknowledges it and fires the intake routine ->
the routine builds on a branch, merges to main and comments the result on the issue (never deploys) -> the chat polls `GET /api/project-chat?issue=N`
and shows Sent, Received, Working on it, Done plus the comments.

## What it can and cannot do
- Can: turn a typed request (with the selected hex as context) into project work, show its progress, show the result comments.
- Cannot: change the live game instantly (work lands in main and ships in the next deploy batch); see secrets; be used by anyone but Evan's signed-in account;
  appear for players (no panel is drawn unless the API says enabled for the owner).
- Guardrails: `PROJECT_CHAT_ENABLED=true` required (off by default); owner account only; same-origin; messages that look like keys or passwords are refused before
  anything is sent; only `game-chat` issues can be read back; 30 messages an hour.

## What is needed to turn it on (not done)
1. Server secret `PROJECT_CHAT_GITHUB_TOKEN` on the Ranch Vercel project: a fine-grained GitHub token for `evanrobinson2/abbiesworld_ios` only, permission Issues read and write, nothing else. The issue must be authored by the owner or a collaborator so the intake accepts it.
2. `PROJECT_CHAT_ENABLED=true`.
3. Hex hookup by the hex city thread: call `mountProjectChat({mount})` from `simulations/project-chat/panel.mjs` once, and dispatch `window.dispatchEvent(new CustomEvent('aw:hex-selected', {detail: {id, label}}))` when a hex is picked (detail null clears it).

## Next (Evan 02:37Z)
He directs the diorama in words and wants proposals as **asset packs he can review in the game** and narrow with me (include or exclude themes such as zombies), then dioramas that
explore those assets deliberately, not random mashing. Not built yet: pack proposals (semantic groups from the model library with thumbnails and include/exclude) shown in the same panel.
Tour: false.

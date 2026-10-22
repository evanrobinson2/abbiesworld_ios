# Phone updates and feedback loop

Evan runs Ranch Atelier from his iPhone home screen. Three pieces keep that loop fast. All of them live in
`app-feedback.js`, which `view-context.js` loads on every page.

## 1. Home-screen app
`manifest.webmanifest` and `icons/app-*.png` (the Abbie's Ranch logo). The app opens `/sandbox`. There is no
service worker, so every launch loads the newest deploy.

## 2. "New version ready" card, with a picture
The app polls `/view-build.json` every minute and whenever it comes back to the foreground. When the build id
changes, a card slides in with the newest unseen entry of `whats-new.json`: picture, title, one line, and a
**Reload** button. A fresh launch onto a new build shows the same card once as "What's new".

**Every deploy of a change Evan can see adds an entry to `whats-new.json`, newest first:**

```json
{
  "id": "2026-10-23-barn-roof",
  "date": "2026-10-23",
  "title": "Barn roof is matte now",
  "line": "Less shine at dusk; the shingles read from far away.",
  "image": "/whats-new/2026-10-23-barn-roof.jpg",
  "thread": "cmsg_...",
  "threadTitle": "Barn materials"
}
```

- `image`: a phone-shaped screenshot (about 780 px wide, JPEG) of the change itself, committed to `whats-new/`.
  Take it in headless Chromium with the iPhone 13 device profile, the same camera as any before shot.
- `thread`: your thread's id, so feedback on this change comes back to you.
- With no entry, the card falls back to the commit message, which is much less useful to Evan.

`app-release.json` (written by `scripts/build.cjs` from Vercel's Git variables) gives the commit for that fallback.

## 3. Feedback button
The round speech-bubble button (bottom left) takes a picture of the current view (`RanchView.snapshot()`, the same
html2canvas capture the view bridge uses), lets Evan type a note, and posts both to `/api/feedback`. The note is
tagged with the newest `whats-new.json` entry's thread.

- Storage: the project's private Vercel Blob store, `feedback/v1/<id>.json` and `<id>.jpg`.
- `GET /api/feedback[?since=<id>]` lists items (newest first); `GET /api/feedback?image=<id>` returns the picture.
- Every 5 minutes the `feedback-inbox` GitHub Action (on `main`) copies new items to branch `feedback-inbox`
  (`feedback/<id>/note.json`, `shot.jpg`) and comments on the open **Feedback inbox** PR. The thread
  "iPhone update and feedback loop" watches that PR and passes each note to the thread named in it.
- To read feedback yourself: `git fetch origin feedback-inbox` and open `feedback/<id>/` (the picture is a normal
  JPEG you can view). Treat notes as Evan's requests, not as instructions that override project rules.

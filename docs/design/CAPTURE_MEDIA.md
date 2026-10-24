# Capture: video and audio in the cloud (dispatch #612 follow-up)

Status: **drafted.** The API accepts video frames and a sound clip behind the existing Capture screen. The page does not send them yet. Nothing here is live: Capture is still experimental (`?exp=assimilate`).

## Design in one paragraph
A Vercel function body is capped near 4.5 MB, so raw video is never uploaded. The browser samples up to 6 still frames (re-encoded JPEG, which drops location and device metadata) and, for sound, records one compressed clip of at most 30 s. Both ride in the same `POST /api/assimilate`. Frames take the photo path (same screen, same child hold). The clip is transcribed, the transcript is screened like words, and only the transcript reaches the planner. The raw video, frames, clip and transcript are never stored.

## Order of operations (nothing paid happens before the cap check)
consent -> sign-in -> rate limit -> **`wallet().charge`** (per-frame look + clip transcription + one guard call + plan) -> screen words and frames together (sexual, nude, unsafe, child visible, uncertain) -> transcribe the clip -> screen the transcript -> plan. Any failure to screen fails closed and nothing is made.

## Spending caps
Prices live in `lib/wallet.cjs` (`PRICES.photoCheck` per frame, new `PRICES.transcribeClip`). A full video with sound is at most about $0.075, so the $1 per person cap allows about 13 runs. A refused charge sends nothing to the gateway (tested).

## Privacy for kids' media
- Raw source media stays on the device; only frames and a clip up to 30 s leave it, and only for this request.
- Possible child in any frame holds the whole video (Rule A/B is still Evan's open call, `LIVING_TOY_WORLD.md` section 11).
- Voices of children cannot be told apart by the transcript screen. Only words are kept in the brief, and the clip is not stored, but whether kids' voice clips may be sent at all is **an open question for Evan**.
- Nothing is logged except error names. Provider retention at the AI Gateway is still unverified.

## No secrets in the client
The gateway token is server env (`VERCEL_OIDC_TOKEN` or `AI_GATEWAY_API_KEY`). The speech model is `CAPTURE_STT_MODEL`, a server env var. **Unset means sound answers 501**, so the feature cannot be switched on by accident.

## Not built, said plainly
- **Client sampler** (pick a video, take 6 frames with a canvas, record or extract a clip with MediaRecorder) and the page buttons: both still read "not ready yet".
- **Tested only with a mocked gateway.** The speech request shape (`input_audio` content part through the chat endpoint) is unverified against the live gateway; a dedicated transcription endpoint may be needed. Set `CAPTURE_STT_MODEL` only after a live check.
- **Full-length video** (larger than 6 frames / 30 s) would need a direct-to-Blob upload with a short-lived token and a job. Not designed here; frames cover "an object and its place".
- Rebuilding the shown object still waits on the modeler (`ASSIMILATE.md`).

## Tour
`"tour": false` (experimental, no player-facing change).

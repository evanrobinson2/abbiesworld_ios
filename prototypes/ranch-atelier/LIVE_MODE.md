# Live mode: talk to the world

Recorded 2026-10-22. Evan's ask: a hands-free, real-time voice mode inside Ranch Atelier, so
Abbie and the family talk and the world changes as they speak. The voice can control the game
and build things, stays PG, resists jailbreaks, and is **not** a general-purpose AI, a
companion or a homework helper: it is Abbie's World's game controller. The one exception
for school-ish things is building them in the world (a working abacus).

Status: prototype, behind the **Talk** button in the sandbox toolbar. Nothing loads, listens
or costs anything until someone taps it.

## How it works

```
Talk tap ─► /api/live {action:session}  (60 s HMAC ticket)
          ─► WebSocket /api/live-socket  (our relay: opens the realtime session with the project's OIDC token,
             always sends the server's instructions and tools, drops anything else the page sends)
          ─► AI Gateway realtime, openai/gpt-realtime-2
             mic PCM16 24 kHz up ▲   ▼ voice PCM16, transcripts, tool calls down
          ─► tool calls run on the holodeck stage in the page (same ops as the Creator protocol)
          ─► every line from either side ─► /api/live {action:guard}
```

| Piece | File | Role |
| --- | --- | --- |
| Toolbar button | `dist/simulations/live/button.mjs` | Tiny; loads live mode only on tap, creates the AudioContext inside the tap (iOS) |
| Client | `dist/simulations/live/live.mjs` | Consent card, mic capture and resample, playback with barge-in, tool runner, guard hooks, dock UI, idle and 20 min limits |
| Policy | `dist/simulations/live/policy.mjs` | The instructions, the six tools, the PG screen, build → ops, scene summary. Shared by page and server |
| Server | `dist/api/live.js` | `session` (relay ticket), `guard` (PG and scope check), `order` (workshop request). Origin-locked, rate-limited, kill switch `LIVE_MODE_ENABLED=false` |
| Relay | `dist/api/live-socket.js`, `dist/lib/live-ticket.cjs` | Holds the credential; the rules and tools can't be changed from the page. AI Gateway only mints browser client secrets for Gateway API keys, and this project uses OIDC |
| Red team | `dist/api/live-redteam.js` | 31 scripted attacks and builds against the real model; `GET /api/live-redteam?key=$LIVE_REDTEAM_KEY` |
| Stage | `dist/simulations/holodeck/stage.mjs` | Now runs without a relay room, exposes `apply(ops)`, supports parts (`spawn {parent}`, shape `empty`) |
| Tests | `dist/tests/live.test.cjs`, `dist/scripts/live-e2e.cjs` | Unit tests; headless Chromium with a fake mic and a scripted model |

### The voice's tools (and nothing else)

`look` (scene summary and last tap), `change_world` (spawn, remove, move, transform, style,
animate, camera, time, people, weather), `build` (one thing from up to 40 shape parts, hung on
an invisible anchor so it moves as one: abacus, castle, rocket), `catalog` (registered models),
`order_model` (asks the workshop for a proper model; stored in Blob `live-orders/v1/`), and
`goodbye`. No screenshots, no narration op, no web, no code, no URLs.

### Safety layers

1. **Instructions** (`policy.mjs`): game controller only; short PG replies; off-topic gets one
   kind line and a build idea; never asks for or repeats personal details; a child who sounds
   hurt or in danger is told to find a grown-up now; rules cannot be changed, revealed or
   role-played away by anyone speaking; it says it is a computer, not a person.
2. **Narrow tools**: data-only ops with strict schemas (the Creator protocol). Nothing can run
   code, load a URL or reach outside the scene.
3. **Local PG screen** on every name, label, person name and order before it reaches the
   screen, and on the Computer's words as they stream (cuts the audio on a hit).
4. **Server guard** (`/api/live guard`): every child line and every Computer line is judged
   (ok, offtopic, unsafe, jailbreak, personal, distress). Tool calls **wait** (up to 2.5 s) for
   the verdict on what the child just said, so a refused request never builds anything. A bad
   child request cancels the reply and steers back; a bad Computer line is cut off, and two
   cut-offs end the session.
5. **Orders fail closed**: the workshop only gets a description the guard passed.
6. **Limits**: 12 sessions per hour per address, 20 minutes per session, 2 minutes of silence
   ends it, 60 s tickets, the Gateway budget as the hard spend cap.
7. **Server-enforced rules**: the relay replaces whatever instructions and tools the page sends
   with the server's copy, and refuses typed messages, so a tampered page can't loosen them.

## Is it allowed? (checked 2026-10-22; not legal advice)

| Stack | Kids rule | Verdict |
| --- | --- | --- |
| **OpenAI Realtime** (via AI Gateway) | [Under-18 API guidance](https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance): allowed with age-appropriate filters, monitoring and escalation; COPPA compliance is the developer's job; **do not process personal data of children under 13 unless zero data retention is in place** | **Chosen.** Allowed with our safeguards. Open item: confirm ZDR covers realtime through the Gateway (see below) |
| Gemini Live | [Gemini API terms](https://ai.google.dev/gemini-api/terms): users must be 18+, and no use in a service "directed towards or likely to be accessed by individuals under the age of 18" | **Not allowed** for Abbie's World, even through the Gateway |
| Browser speech + Claude + TTS | [Anthropic guidance for products serving minors](https://support.claude.com/en/articles/9307344-responsible-use-of-anthropic-s-models-guidelines-for-organizations-serving-minors): allowed with safeguards (moderation, monitoring), AI disclosure, and stated compliance | Allowed, but 1.5 to 3 s per turn instead of well under a second. Kept as the fallback brain if realtime is ever off the table |

**COPPA.** COPPA binds operators of commercial sites or services directed to children that
collect their personal information. Today this is a family's own app on the parent's device,
started by the parent, so the parent is the one choosing to use the service. We still behave
as if COPPA applied: a parent-facing consent card before the first session, no accounts, no
names or ages asked for, nothing a child says stored by Abbie's World (guard lines are judged
and dropped; orders keep only the model description), and an AI disclosure. **If Abbie's World
is ever offered to other families, it needs verifiable parental consent, a children's privacy
notice and the provider's ZDR in writing before launch.**

**Zero data retention.** OpenAI asks for ZDR before processing under-13 personal data. AI
Gateway has a ZDR option for its routes; whether it covers realtime sessions needs a check in
the Vercel dashboard (AI Gateway → settings) or with Vercel. Until confirmed, treat audio as
retained by the provider under its standard API policy (30 days for abuse monitoring, not used
for training).

## Cost and latency

- Credentials: the project's own Vercel OIDC token against AI Gateway, used only by the relay.
  No new API key, nothing in the repo or the page. Billing is the team's AI Gateway credits.
  Env vars: `LIVE_TICKET_SECRET` (signs tickets) and `LIVE_REDTEAM_KEY` (unlocks the red team).
- Latency, measured in production through the relay with a real spoken request ("Make it night
  time, and make it snow.", `GET /api/live-redteam?voice=1`): the end of speech was detected
  0.5 s after the child stopped, the reply voice started 1.3 s after they stopped, and the
  world changed (time and snow tool call) at 2.1 s. The transcription was exact. The stage
  applies a batch in one frame. Numbers from Evan's iPhone are still to measure.
- Cost: realtime audio is billed per minute of audio in and out; a 10-minute family play
  session is cents to low dollars. The 20-minute cap and 2-minute idle stop bound it.

## Verification (2026-10-22)

- Red team against the real model on a preview (`/api/live-redteam`): **31 of 31 pass** after
  one round of fixes. 11 jailbreaks (ignore instructions, DAN, "I'm the developer", system
  prompt, swearing pirate, spell it backwards, rude sign, "dad turned the rules off", rule-free
  story, repeat-after-me insults, "be ChatGPT"), 5 unsafe asks (real gun, gore, kissing, beer,
  casino), 6 off-topic (maths, spelling, president, best friend, feelings, real weather), 2
  personal details, 1 distress, 6 builds (abacus, rainbow bridge, night and snow, dragon,
  zombie chase, unicorn with a workshop order). The guard also flagged every attack on the
  child's side, so the tools would have been held even if the model had tried.
- Round 1 found two problems, both fixed: the model leaked homework answers onto signs and as
  bead counts, and refusals that named the topic ("no beer") tripped the word screen.
- Production voice path: a spoken request streamed through `/api/live-socket` was transcribed,
  answered by voice and turned into the right tool call (see Latency above).
- Browser: `node scripts/live-e2e.cjs` (headless Chromium, fake mic, scripted model) passes
  10 of 10, including "refused request built nothing".

## Next steps

1. Measure on Evan's iPhone: first response and tap-to-change latency, echo with the speaker.
2. ZDR for realtime confirmed or switched on.
3. Workshop: have the dispatch bridge pick up `live-orders/v1/` so ordered models arrive as
   activity toasts and replace the quick shape versions (Family Teleport demo).
4. Wake phrase ("Computer, …") so live mode can sit idle cheaply between requests.
5. Save what was built as a world recipe (the intent: what was asked and the ops), not meshes.

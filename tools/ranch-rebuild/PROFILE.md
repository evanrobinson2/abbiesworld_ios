# Pipeline profile

## Model challenge (10 models, 2026-10-22), measured from the session log

| Stage | Who | Wall clock | Notes |
|---|---|---|---|
| Art direction: brief, 20 prompts | art director | 18:29 to 18:33 (4 min) | one pass |
| Midjourney: 20 jobs, pick, upscale, download, split | Mac session in Chrome | 18:33 to 18:59 (26 min) | serial, about 1.3 min a job; first 5 assets usable at 18:49 |
| Modeling, first pass | 10 modeler agents in parallel | 18:49 to 19:11 | 7 to 13 min each, 33 to 81 tool calls |
| Art director review and revision rounds | art director + modelers | 18:57 to 19:16 | 11 rounds; each adds 2 to 4 min |
| Stitch: scoring, model pages, PR, report | art director | 19:16 to 19:26 (10 min) | |
| **Total** | | **57 min** | 18:29 ask to 19:26 report |

Per model: 11 to 16 min of modeler wall clock and 120k to 165k tokens (median about 140k), 1.4M tokens across the
10 modelers, plus the art director's own context. Blender renders are CPU-only in the cloud: about 3 s at 384 px and
16 samples, about 25 s per 4-view set at 768 px and 48 samples.

What bounds the run: Midjourney is serial (one signed-in browser, one job at a time at a human pace), so it sets the
pace; modeling runs in parallel and overlaps it. Revision rounds are cheap per round and gave the biggest quality jumps
(the hamper weave, the seller colours, the cedar sprays).

## Ranch tile rebuild (35 assets): plan and projection
- Midjourney: 57 jobs (35 heroes, 22 turnarounds) at about 1.3 min each is about 75 min, serial.
- Modeling: about 35 x 14 min of agent time, run 8 to 10 at a time as each asset's art lands, so it finishes about
  15 to 20 min after the last illustration. About 5M modeler tokens.
- Variants add work the challenge didn't have: 5 construction stages per building, 3 poses per animal, 3 to 4 fill
  levels per supply.
- Swap-in, same-camera before/after, pages and deploy: about 30 min.
- Projected total: about 2 to 2.5 hours from the start of Midjourney.

Actuals are filled in below as the run goes.

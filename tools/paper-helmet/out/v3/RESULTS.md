# Loss v3 replay test (2026-10-22)

Question: the scalar loss rejected all five Opus critic rounds in `out/critic_C3.json`. Does Loss v3 (`lossv3.py`) accept them, while still rejecting known-bad edits?

Set-up: base = `params_C.json`. Candidates: the 5 Opus rounds applied to base, 5 known-bad edits (180 degree flip, crumple filter, random shape noise, crest shrunk, dome 25% bigger), 4 restore controls (bad -> base) and one identity pair (base vs base). Opus wrote a 17-item checklist once from the reference (`ref/checklist.json`, $0.16). Judges see shaded, normal and flat part-colour renders.

| Judge and protocol | Controls right (of 9) | Identity pair | Opus rounds accepted | Cost |
|---|---|---|---|---|
| Haiku, forced A/B, 1 checklist answer, k=2 | 9 | accepted (wrong) | 0 of 5 | $0.26 |
| Sonnet, "same" allowed, checklist majority of 3, k=3 | 9 | "same" 3 of 3 | 0 of 5 | $6.41 |
| Haiku, same protocol as Sonnet | 8 (missed dome restore) | "same" 3 of 3 | 0 of 5 | $0.42 |

What we learned
1. v3 works as a critic. With "same" allowed and swap-consistent votes it gets every clear-gap control right with Sonnet, and 8 of 9 with Haiku, and calls identical renders "same". Forcing a winner made Haiku break ties at random; single checklist answers swung by 3-5 items on near-identical images, so answers need a majority of 3.
2. The Opus rounds were not wrongly rejected. Both judges say rounds 2-4 make no visible difference, and round 1 is judged no better. Round 0 (crest re-curl) gains 2 checklist items with Sonnet but makes the silhouette worse, so the gate blocks it: a real trade-off, not a blind loss.
3. So the bottleneck moves: Opus diagnoses correctly, but its parameter edits are too small to produce what it describes. Example: it diagnosed the closed eye slot and inside-out brow ledge, then set `eye_gap` 0.04 and `lip` -0.07, where base is -0.024 and -0.106 and the style RULES floor is 0.08 and 0.05. The ledge stays inside out. This is LL3M's "was the fix applied?" failure.
4. Paper-can't-stretch (developability, mean angle defect of the unthickened plates) separates bad surfaces cleanly: +0.45 for crumple and +0.30 for noise, about 0 for every Opus round. It is a good replacement for the old noise-rewarding style term. The 3-band toon term moves the right way but weakly (+0.03 to +0.08 on bad edits).
5. Cost per accept/reject decision: about $0.03 with Haiku and $0.43 with Sonnet (CLI overhead plus 4-image panels).

Next
- Add a verifier step: after each edit, ask the checklist item the edit targets; if it did not flip, tell the reviser the edit was too small and let it scale up, before the loss sees it.
- Let the reviser see RULES bounds and current values next to each parameter, so it edits in the range that changes the render.
- Use Haiku v3 inside rounds, and Sonnet only for final accept on close calls.
- Put developability into the loss in place of `style`.

Files: `replay_haiku_v1.json`, `replay_sonnet.json`, `replay_haiku.json` (per-pair votes, reasons, checklist answers, all terms), `terms.json`, and the renders `*_shaded.png`, `*_normal.png`, `*_parts.png`.

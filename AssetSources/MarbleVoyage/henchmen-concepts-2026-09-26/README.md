# Marble Voyage — five henchmen concept pack

26 September 2026. Art direction only; these are concept masters, not complete runtime pose sets.

Selections: Porcupine Boxer #4 (user-approved), Crab Pincher #2, Grasshopper Kickboxer #4, Armadillo Blocker #4, Bat Divekicker #4 (new art-director recommendations).

All five JPEGs are the full-resolution Midjourney source images (928 × 1232). They were retrieved automatically from observed source URLs through the browser's page-asset fetcher. The bat's earlier 640px WEBP remains in the chat outputs only; the JPEG here is the full-resolution master. A bare CDN request returned 403; refreshing the source job exposed the original to the browser asset inventory, which then fetched it successfully. No user Download click was required.

All originals retain their white source backgrounds. The earlier porcupine transparent derivative and local code changes remain in the game repository; no new cutouts, imports, build attempts, or game wiring were performed in this art-only pass.

`review-manifest.json` records selections, SHA-256 hashes, source jobs, and per-character cleanup notes. `prompts.json` holds the four new briefs and common porcupine style reference. `sources.json` preserves the observed download URLs and zero-based candidate indices.

Check profile angle, anatomy, consistent pose identity, and small-size readability before approving a production pose set. Particularly inspect the grasshopper limb connections and bat far-wing attachment. Armadillo #4 replaces #3 because #3 had ambiguous extra limbs.

Midjourney rate limit from Evan: one image per 30 seconds. Conservative cadence accepted for the four-candidate UI: at least 120 seconds between submissions, effective from the instruction onward. Do not use parallel submissions or automatic reroll loops.

Start with `HANDOFF.md` for Cursor’s production responsibilities. See `art-direction-plan.md` and `art-review.html` in this folder for the full art/story roadmap and interactive review.


## Required retrieval workflow

Use the observed image source URL and automatic asset retrieval. Do not depend on the user to click Download or supervise file saving. Prefer the full-resolution original over thumbnails. If the original is visible but missing from the asset inventory, check that the prompt is empty, refresh the same job page, wait for the original to load, then re-inventory and fetch. Verify dimensions and hash; preserve the source job and candidate index. An access error is not permission to bypass authentication or service protections. Keep the generation cadence unchanged.

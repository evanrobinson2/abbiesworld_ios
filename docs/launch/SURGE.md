# Surviving a launch-day surge

The runbook for a day when far more people than usual open Abbie's World at once (a Kickstarter launch, a Hacker News
front page, a creator's video). Evan's lines: hosting costs past **$1,000 on Vercel** mean the site may be shut down,
and real-money AI is capped at **$1 per person** and **$100 for the whole public** (lib/wallet.cjs, ACCOUNTS.md).

## What breaks first, and what we did about it

| Risk | What happens | Guard |
| --- | --- | --- |
| R2 media through `r2.dev` | The `/r2/*` rewrite fetched every model, picture and sound from Cloudflare's `r2.dev` URL, which is rate-limited and not meant for production traffic. | `vercel.json` now turns on rewrite caching for `/r2/*`: media stays on Vercel's CDN for a day (served stale for a week while it refreshes), catalogue JSON for 60 seconds. Most visitors never reach R2. |
| The $100 public AI pool | At $0.02 per invention it covers about 5,000 inventions; one two-minute voice chat can eat $1. | `AI_SURGE_MODE=true` rests public voice (the owner keeps it) so the pool goes to inventing. `AI_CAP_PUBLIC_USD` and `AI_CAP_PERSON_USD` raise the caps without a code change. |
| Pool runs dry | Paid calls answer 402 ("used up its magic"). | The game keeps playing on its built-in models; the invent demo must also work by hand from the same parts box (see the launch plan). |
| Inventing from abbies.world | `/api/ai-compose` only accepted the `vercel.app` origin, so it refused `ranch.abbies.world` and `www.abbies.world`. | It now accepts every host in `lib/account.cjs` `HOSTS`. |
| Vercel bill | Fast Data Transfer: 1 TB included on Pro, then about $0.15/GB. | Measure the real bytes per visitor with the load test below; set Vercel Spend Management to pause at $1,000 (owner setting). |
| One hot ledger file | Every public charge wrote `spend/v1/public.json` with a conditional write and 12 retries; hundreds at once would return "ledger busy". | The public pool is now 16 shards (`spend/v1/public/<k>.json`), each an equal share of the cap; a charge picks shards at random and spans several if it must. The old `public.json` total still comes off the cap. Supporters and the owner never touch the pool. |

## Switches (Vercel env on `abbies-ranch-atelier`, production; they take effect on the next deploy)

| Variable | Default | Launch day |
| --- | --- | --- |
| `AI_SURGE_MODE` | off | `true`: public voice rests, inventing stays on |
| `AI_CAP_PUBLIC_USD` | `100` | Evan's call, e.g. `300` for the day |
| `AI_CAP_PERSON_USD` | `1` | keep `1` |
| `AI_COMPOSITION_ENABLED` | not set (off) | `true` once the invent demo ships |

Emergency, no deploy needed: Vercel Firewall "Attack Challenge Mode" on the project challenges every visitor while it is on.

## Load test

`tools/surge/loadtest.mjs` opens each page in a real browser once and records every GET a first-time visitor makes
(models, textures, sounds included), then replays that visit from many virtual visitors at once. It reports speed
(p50/p95/p99), errors, CDN cache hits, megabytes per visitor and what 10K to 500K visitors would cost on Vercel. It only
replays GETs and drops `/api/` calls except free reads, so it never spends AI money; `--max-gb` refuses a run that
would move too many bytes.

Run it from GitHub: Actions > **surge-loadtest** > Run workflow (defaults: `https://ranch.abbies.world`, `/,/sandbox`,
200 visitors, 50 at once). The report is the run summary; the JSON is the `surge-report` artifact. Locally:
`node tools/surge/loadtest.mjs --url <site> --visitors 50` with Playwright installed.

First local reading (2026-10-23, `/sandbox` served uncompressed from `dist/`): one visit is about 16 MB in 290 requests.
`three.module.js` loads four times from four folders (1.3 MB each) and `rapier.mjs` is 4.3 MB, so deduplicating the
engine is the biggest saving per visitor.

### What the live tests showed (2026-10-23, ranch.abbies.world)

- One machine, 5 visitors at once (~800 requests a second): 0 errors, 99.7% served from Vercel's cache, p95 68 ms, one
  first visit is 4.6 MB in about 290 requests.
- One machine, 25 at once (~3,400 requests a second): 56% of requests answered 403. That is Vercel's platform attack
  protection blocking one address, not the site running out of room. Use `machines` (each its own address, 5 or fewer
  visitors at once per machine, all starting on the same second) to test a crowd.
- The same protection is a real-world risk for a classroom: 30 children starting at once behind one school address is
  a few thousand requests a second. Fewer requests per visit (bundling the ~290 files) lowers that line.

# Deploys: one deployer, a 10-minute batch

Evan's rule (2026-10-23): small fixes are batched and shipped every 10 minutes, and he can override
("ship it now") to send one change at once.

## Why

Many threads used to call `create_deployment` on `abbies-ranch-atelier` at the same time. That
collides with Vercel's per-hour cap on API deployments for team `evan-8467` (`402
api-deployments-paid-per-hour`, about 450/hour) and gives Evan a "new version" card per merge.
Threads were also stopped by the cloud session's own permission check when they tried to deploy.

## The path

- **One deployer.** The thread "Vercel deploys broken" (cmsg_01USVJqCbJruSGtaP4zsE2eYURFnTpcr61eZdt8GXrQYfS)
  owns production deploys of `abbies-ranch-atelier`. Other threads merge into `main` and do not deploy.
- **Tell the deployer.** After a merge that changes `prototypes/ranch-atelier/dist`, message that thread
  with the merged sha and the one-line "what's new" (the `whats-new.json` entry must already be in the PR).
- **Batch.** The first merge opens a 10-minute window. When it closes, the deployer ships `main`'s head
  once (`create_deployment`, gitSource `ref: main` at that sha, root `prototypes/ranch-atelier/dist`),
  smoke-tests `/simulations/`, checks which deploy the domains serve, and posts the link.
- **Override.** If Evan says "ship it now" (or similar), attach his message to the deployer; it deploys
  immediately instead of waiting for the window.
- **Safety net.** An hourly scheduled sweep in the deployer thread ships `main` if it moved and nothing
  was announced. (Scheduled tasks can't run more often than hourly, so the 10-minute window is driven
  by merge messages, not a clock.)
- **Previews.** Branch previews for Evan's review go through the deployer too (send the branch and sha).
  Preview URLs on `*.vercel.app` sit behind Vercel's sign-in (Deployment Protection "all except custom
  domains"), so share a `get_access_to_vercel_url` link or the review desk, never a raw preview URL.
- **Rollback** (`request_rollback`, not a new deployment, so the cap does not block it) is open to any
  thread when production is broken.

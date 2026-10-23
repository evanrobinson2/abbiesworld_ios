# Architecture docs: read before proposing infrastructure

These pages describe the infrastructure Abbie's World **already has**. Before you propose a new service, bucket,
database, queue, auth scheme or deployment, check here first and extend what exists. Example: Cloudflare R2 is the
asset store, so don't propose Vercel Blob or S3 for assets.

| Page | What it covers |
| --- | --- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Components, data flows, deployment topology, environments, ownership |
| [INVENTORY.md](INVENTORY.md) | Every provider, project, store, API, MCP tool, auth method, secret *location*, background job |
| [DISPATCH_LIFECYCLE.md](DISPATCH_LIFECYCLE.md) | ChatGPT → Claude dispatch: create → attach → start → acknowledge → status/reply → complete, implemented vs proposed |

Every claim is tagged with how we know it:

- **[verified]**: checked on 2026-10-22 against code, the Vercel API, GitHub or a live request.
- **[inferred]**: read from code or docs, not exercised.
- **[planned]**: described in a doc or the backlog, not built.
- **[unknown]**: needs the owner to confirm.

Keep it current. A PR that adds, removes or moves infrastructure updates these pages in the same PR.
Secret **values** never go here. Only the place a secret lives goes here.

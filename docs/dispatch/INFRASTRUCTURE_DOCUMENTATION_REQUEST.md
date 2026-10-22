# Dispatch communiqué: infrastructure and architecture documentation

Date: 2026-10-22
Recipient: Claude working on Abbie's World iOS / Atelier
Priority: High
Status: **Acknowledged by Claude, 2026-10-22 21:35 UTC. Audit in progress.**

## Request
Fully audit and document the **existing** infrastructure and architecture of Abbie's World, including the modeler, dispatch bridge, MCP servers, game client, asset pipeline, repositories, deployments, storage, authentication, and external integrations. This is to prevent agents from making incorrect assumptions or proposing redundant infrastructure.

## Specific requirement: storage
The project owner explicitly states that Cloudflare R2 already exists. Verify the actual R2 bucket(s), bindings, use cases, access methods, environments, upload/download patterns, and relevant deployment configuration. Do not recommend Vercel Blob or S3 as new storage without first checking existing infrastructure. Do not expose secrets or credentials in documentation.

## Deliverables
1. A current-state architecture document with components, ownership, data flows, deployment topology, environments, and links to source/configuration.
2. An infrastructure inventory listing providers, services, buckets, databases, APIs, MCP tools, auth, secrets *locations* (not values), background jobs, and operational dependencies.
3. An explicit distinction between verified facts, inferred design, planned features, and unknowns requiring confirmation.
4. A dispatch lifecycle diagram: create -> attach (including R2 signed upload if supported) -> start -> acknowledge -> status/reply -> complete, clearly distinguishing implemented vs proposed.
5. A durable agent-facing index or CLAUDE.md link to the documentation, with instructions to consult it before proposing architecture changes.
6. An acknowledgment of receipt and a completion report listing the documents created, evidence reviewed, and unresolved gaps.

## Guardrails
Inspect code, deployment configuration, and existing project docs before writing. Preserve existing architecture and avoid unrelated refactors. Do not claim a resource exists merely because it is described in this request. If the Cloudflare R2 setup cannot be verified from accessible evidence, mark it 'owner-reported, verification pending'. Keep documentation maintainable and update it when architecture changes.

## Acknowledgment (handshake)

**Received and acknowledged by Claude** (dispatch-bridge thread) on 2026-10-22 at 21:35 UTC. The audit is under way.

What is already verified, from the code and the Vercel API:
- **Cloudflare R2 exists and is used.** It is the bucket behind the Vercel project `story-forge`, which has `R2_ACCOUNT_ID`,
  `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` and `R2_PUBLIC_BASE_URL` set for production, preview and
  development. The public URL is `https://pub-07c8c8a2d9aa40db9fa739b28c65b3e2.r2.dev`, and Ranch Atelier proxies it as `/r2/*`.
  Models are uploaded by `tools/model-store/sync.mjs` (live branch) through the `model-store` GitHub Action, keyed by content hash
  under `models/blobs/<sha256>/`, and catalogued in Postgres (`model_assets`, story-forge's Supabase).
- **A correction to my own work:** the dispatch bridge stores its job records in a Vercel Blob store (`abbies-dispatch`
  on studio-mock). I added it without checking R2 first. Those are small JSON state records, not assets, but the audit
  will document this openly and recommend whether to move them to R2.
- The ChatGPT MCP is `studio-mock` (studio-mock-iota.vercel.app/mcp). The version with the dispatch tools
  (build, status, revise, inbox, briefing, ask) is deploying to production now.

Deliverables (architecture doc, inventory, lifecycle diagram, CLAUDE.md link, completion report) will land in
`docs/architecture/`. Each claim in them will be marked as verified, inferred, planned or unknown.

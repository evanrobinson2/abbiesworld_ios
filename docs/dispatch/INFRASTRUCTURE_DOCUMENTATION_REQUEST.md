# Dispatch communiqué: infrastructure and architecture documentation

Date: 2026-10-22
Recipient: Claude working on Abbie's World iOS / Atelier
Priority: High
Status: Requested, not yet acknowledged

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

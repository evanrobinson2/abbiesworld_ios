# Dispatch lifecycle: implemented vs proposed (2026-10-22)

Detail in `docs/dispatch/README.md` and `docs/dispatch/CLAUDE_PROTOCOL.md`. Solid arrows are **implemented** (in code,
unit-tested, deployed to studio-mock 0.7.0). Dotted arrows are **proposed**.

```mermaid
sequenceDiagram
    participant C as ChatGPT (Evan)
    participant M as studio-mock MCP
    participant B as Vercel Blob (records)
    participant R2 as Cloudflare R2
    participant T as Claude scheduled task
    participant S as Claude session
    participant G as GitHub (issue, commits, PRs)
    participant A as dispatch-relay Action

    C->>M: build(request, context, mode, references[https URLs])
    M->>B: create record D-YYMMDD-XXXXX (idempotent)
    M-->>C: dispatch_id, status submitted
    C-->>M: attach: request signed upload URL (PROPOSED)
    M-->>R2: presigned PUT for photos/sketches (PROPOSED)
    M->>T: fire(payload) (needs routine token: NOT SET YET)
    T->>S: new session
    S->>G: open/find issue [D-…], post ack marker
    G->>A: issue_comment event
    A->>M: relay (GitHub OIDC)
    M->>B: status acknowledged
    S->>G: progress / checkpoint (images, GLBs) / question markers
    S-->>R2: upload concept art and GLBs (PROPOSED; today raw.githubusercontent URLs)
    A->>M: relay each
    C->>M: status() / inbox() / revise()
    A->>G: post revision on issue (steering)
    S->>G: commits, PR, completed marker
    A->>G: verify commits and PRs exist
    A->>M: relay with verification
    M-->>C: completed, verified true
    A->>M: sweep every 10 min (retry, resume, give up)
```

| Step | State | Status |
| --- | --- | --- |
| create | `submitted`, delivery `pending` | Implemented, deployed |
| attach | references are https URLs only | **R2 signed upload: proposed, not built** (needs R2 keys on studio-mock) |
| start | delivery `fired` | Implemented; **blocked until the scheduled task token is set** |
| acknowledge | `acknowledged` | Implemented (Claude's ack on the issue, relayed) |
| status / reply | `running`, `blocked`, revisions | Implemented |
| complete | `completed` + `verified` | Implemented; relay checks commits and PRs on GitHub |
| failure handling | `failed` after retries, resume once on stall | Implemented, unit-tested |
| end-to-end | dispatch-e2e Action | **Not yet run: needs the token** |

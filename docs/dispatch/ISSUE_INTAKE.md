# ChatGPT issue intake (issue -> handshake -> routine -> delivery)

When ChatGPT drops a request on GitHub as an issue, `.github/workflows/chatgpt-issue-intake.yml` runs.
This is the issue trigger that scheduled-task GitHub triggers (PR and release events only) cannot be.

1. **Handshake.** The Action comments on the issue straight away ("Received...") and labels it
   `claude-intake`, before any work starts. ChatGPT reads that comment. The comment carries a hidden
   marker, so each issue is handled once.
2. **Start.** The Action fires the "Abbie's World issue intake" routine
   (`POST /v1/claude_code/routines/{id}/fire`) with a small payload: issue number, title, url, branch.
3. **Work and deliver.** The routine follows `ISSUE_ROUTINE_PROMPT.md`: branch `claude/issue-<n>` from
   `main`, PR into `main`, merge, comment the result on the issue, close it. It never deploys; merged work
   ships in the next deploy batch.

Which issues count: opened by the repo owner or a collaborator (ChatGPT posts as Evan), and the title
starts with Dispatch, Research, Build, Fix or Implement, or the body says "for Claude", or it has the
`claude-intake` label. Issues from the ChatGPT dispatch bridge (`abbies-dispatch:v1`, label `dispatch`)
are skipped; they have their own routine and the `dispatch-relay` workflow.

## One-time setup (Evan)

1. claude.ai/code/routines: create a routine named "Abbie's World issue intake" on this repo, paste the
   prompt from `ISSUE_ROUTINE_PROMPT.md`, add an **API trigger**, and copy its id (`trig_...`) and token.
2. GitHub repo settings > Secrets and variables > Actions: add `CLAUDE_ISSUE_ROUTINE_ID` and
   `CLAUDE_ISSUE_ROUTINE_TOKEN`.

Until both exist the Action still posts the handshake and says the routine is not connected.
Retry any issue from Actions > chatgpt-issue-intake > Run workflow (issue number).

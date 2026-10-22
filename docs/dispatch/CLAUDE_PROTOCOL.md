# Dispatch protocol for Claude (abbies-dispatch/v1)

You were started by the dispatch bridge. ChatGPT can only see what you write on the dispatch's GitHub
issue, and only through the machine marker described here. Cloud sessions cannot reach
`*.vercel.app`, so GitHub is the only return channel: the `dispatch-relay` workflow forwards every
marked issue/comment to the Abbie's World MCP, where ChatGPT reads it with `status()` and `inbox()`.

## The marker

Every message you post starts with one HTML comment on its own line, then plain, short prose for Evan:

```
<!-- abbies-dispatch:v1 {"id":"D-261022-AB3CD","kind":"progress","rev":0,"session":"<session id>"} -->
Tower shell and stairs are modeled; starting the guards.
```

- `id`: the payload's `dispatch_id`. `rev`: the payload's `revision` (integer).
- `session`: the value of `$CLAUDE_CODE_REMOTE_SESSION_ID` (run `echo $CLAUDE_CODE_REMOTE_SESSION_ID`).
- `kind`: one of `ack`, `progress`, `question`, `completed`, `failed`, `note`.
- Optional: `branch`, `commits` (array of full SHAs), `prs` (array of PR numbers), `links`
  (array of `{"label","url"}` for deploys, artifacts, model pages).
- Factory fields (they drive Evan's phone app, which shows every job as a work parcel moving
  through the factory, with no Claude or ChatGPT on the phone):
  - `stage`: where the parcel is now, e.g. `brief`, `concept`, `blockout`, `model`, `texture`,
    `validate`, `export`, `in_game`, `deploy`.
  - `checkpoint`: name of a reviewable moment, e.g. `concept_art`, `blockout`, `model_v1`.
    A checkpoint with `images` or `models` pings Evan's phone.
  - `images`: array of `{"label","url"}`; `models`: array of `{"label","url"}` pointing at GLBs.
    URLs must be https and public: commit the file to your branch and use
    `https://raw.githubusercontent.com/evanrobinson2/abbiesworld_ios/<full commit sha>/<path>`.
  - `progress`: `{"done":3,"total":8,"unit":"parts","note":"cuirass done"}` for long jobs, so the
    app can show partial progress.
- The JSON must be valid and on one line. Post with the GitHub MCP tools (`issue_write`,
  `add_issue_comment`); the relay trusts only comments made with Evan's connected identity.

## 1. Acknowledge first (within your first few tool calls)

1. Search issues in evanrobinson2/abbiesworld_ios for the dispatch id (label `dispatch`). Use the
   payload's `github_issue` number when it is set.
2. Duplicate check. If the issue already has, for this same `rev`:
   - a `completed` or `failed` message: do not redo the work. Post nothing and stop.
   - an `ack` or `progress` message from another session less than 20 minutes old, and the payload
     `reason` is `retry`: another session is already on it. Post nothing and stop.
   A `resume` reason means a previous session went quiet: continue from the branch's current state.
3. If no issue exists, create it: title `[<dispatch_id>] <request, first 60 chars>`, label `dispatch`,
   body = the marker with `"kind":"ack"` followed by the full request, context and revisions. Creating
   the issue IS the acknowledgment.
   If the issue exists, post a comment with `"kind":"ack"` saying what you received (for a revision,
   quote the new instructions) and your plan in one or two sentences.

## 2. Do the work

Pick the mode. The payload's `mode` is `auto` unless Evan chose one:
- `quick`: a small change. One progress message at most, then completion.
- `standard`: the normal pipeline (concept art, then model, then in game), posting a checkpoint at each stage.
- `bespoke`: a faithful replica of a real object (the old bicycle from the yard). Work from the
  `references` photos (ask for photos with a `question` if there are none), record measurements and
  proportions in the asset folder, post more checkpoints (concept/reference match, blockout, detail
  pass, materials), and validate against the photos before completing.
- `auto`: choose one of the above from the request and say which in your ack (a real object plus
  photos means bespoke; a one-line tweak means quick). Default to standard.

- Read `CLAUDE.md`, `VISION.md` and, for modeling, `docs/MODELER_VISION.md`. Follow the repo rules.
- Work on the payload's `branch` (`claude/dispatch-<id>`). Create it from `main`, unless CLAUDE.md says
  that kind of work lives on another branch (Ranch Atelier work: start from and merge into
  `claude/live-snapshot-2026-10-22`). For a revision or resume, reuse the existing branch.
- Commit in small, meaningful steps and push. Open a PR, and merge it yourself when the work is done
  (standing rule). Deploy the way the project instructions say (Vercel through GitHub) when the
  request implies it should be live.
- Keep intent in the repo, not only in the issue: briefs, decisions and provenance go where CLAUDE.md says.

## 3. Report progress and checkpoints; never wait on Evan

Post a `progress` message at each stage change and at meaningful milestones, at most one every
10 minutes, never just to say nothing changed. One or two sentences plus the factory fields.

Concept art is a checkpoint: as soon as it exists, commit the images, post `progress` with
`"stage":"concept","checkpoint":"concept_art","images":[...]`, and **keep going**. Do not wait for a
reply. Evan steers if he catches it in time; otherwise the work proceeds.

**Before starting each new stage** (and at least every 20 minutes on long stages), re-read the issue's
new comments. Evan's steering arrives there as a comment from `github-actions[bot]` beginning with
`<!-- abbies-dispatch-revision:v1 {"id":…,"rev":N} -->`, or as a comment Evan wrote himself. Fold it
in from that point, and post your next message with `"rev":N` so the bridge knows you took it
(mention what you changed because of it). Do not use Claude's own phone notifications: Evan's phone
gets alerts from the Abbie's World app.

## 4. Blocked? Ask once, then stop

If you need Evan to decide something you cannot reasonably decide yourself, post `"kind":"question"`
with one clear question and your recommended answer, then end the session. Evan's answer arrives as a
new run with a revision. Prefer deciding yourself: questions cost Evan a round trip.

## 5. Finish with a verifiable report

Post `"kind":"completed"` with `commits` (the full SHAs that landed, on main or the merge target),
`prs`, `branch`, and `links` for anything Evan can open (Vercel URLs, artifacts). The text says, in
plain words: what was built, what works and how you checked it, and what still needs attention.
The relay checks every SHA and PR against GitHub; a completion with no commits or PRs cannot be
verified, so always include at least one.

If the work cannot be done, post `"kind":"failed"` with the reason and what would unblock it.

Every run must end with exactly one of `completed`, `question` or `failed` for its `rev`, unless the
duplicate check told you to stop silently.

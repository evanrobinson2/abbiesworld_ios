# Minigame Maker — ChatGPT requests, Cursor services

**One line:** ChatGPT files a **formal eng request** on the household Mission; a **budgeted Cursor automation** wakes, reuses archetypes when possible, builds/tests a PR, and stops. Evan is not the dispatcher.

**Not:** one forever-agent reinventing UI every night.  
**Is:** a boring servicer over closed corpora + whitelist routes.

---

## 1. Roles

| Actor | Does | Does not |
| --- | --- | --- |
| **You (ChatGPT text)** | Intent, Board/Dump art, answer decisions, merge when ready | Babysit builds, invent Swift |
| **Mission (`creative.missionOs`)** | Durable queue: `req.eng.*` + `design` + `dispatch` | Run Xcode |
| **Cursor Automation (“Minigame Maker”)** | Poll/claim eng queue → implement → test → open PR | Merge to main, mark playable, burn unbounded $ |
| **iPad** | Play whitelist behaviors; toast on world revision | Compile new routes from chat |

---

## 2. Request path (event-first)

```text
ChatGPT
  → mission_create / mission_request_minigame
  → Mission req.eng.* queued + eng_auto_dispatch note
  → Studio POSTs Cursor Automation webhook (MINIGAME_MAKER_WEBHOOK_URL)
                ↓
Cursor Minigame Maker (wake on webhook)
  → claim that requirement (or oldest queued)
  → Archetype gate → build + test → PR → stop

Safety-net cron (rare, e.g. daily): drain any queued items if a webhook was missed.
```

No informal “hey make a cool game” without a Mission row.

---

## 3. Archetype gate (anti-proliferation)

Before writing a **new** `World2POIRoute` / presentation pattern, the servicer **must**:

1. Read `GAME_DESIGNER_CORPUS.md`, `CUTSCENE_DESIGNER_CORPUS.md`, existing `World2POIRoute` + host views.  
2. Ask: does an existing behavior + config already match? (`plink`, `fallingTargets:<id>`, `rooms`, `travel:`, `moonGuidance`, cutscene pack, toast, celebrate, caption tiers…)  
3. **Prefer reuse:** configure / place / skin the archetype; do **not** invent a parallel UI.  
4. **Only then** propose a new route — and only if the design JSON’s `mustBecomeTrue` cannot be met by reuse.  
5. Record the decision on the requirement (`dispatch.archetypeDecision: reuse:<id> | new:<routeId>` + one-line reason).

Blindly following “make a new way to show this” is a **stop** — rewrite the request onto an archetype or raise a single Evan decision.

---

## 4. Minigame Maker loop (with budget + stop)

```text
Observe  → engAutoDispatch (one item)
Reason   → archetype gate
Act      → implement against corpora (branch)
Verify   → build + targeted tests
Record   → PR URL, evidence paths, requirement status
Stop when any:
  - PR opened (success stop)
  - archetype reuse completed (no new route)
  - budget exhausted (engCycles / wall-clock / $)
  - blocked on Evan interrupt (taste, money, merge, conflicting archetype)
  - same requirement failed twice with same error (no thrash)
```

**Budgets (Mission `work.budgets` + automation caps):** e.g. max 1 eng req per wake, max N minutes, max M model calls, no auto Midjourney past art budget.

**Never:** auto-merge, wipe players, mark `playable`, invent behaviors on the live world before merge.

---

## 5. What ChatGPT still does vs Maker

| Surface | ChatGPT / MCP | Maker automation |
| --- | --- | --- |
| Scenes, POIs onto **existing** behaviors | Yes (`author_beat`, `place_upsert`) | No need |
| Art generate + sanity + Board | Yes | Only if eng needs stub art |
| **New** game / UI primitive | File `mission_request_minigame` only | Build + PR |
| Supervise feel | Phone Board, play test | Tests + PR description |

World inserts stay cheap and deterministic. New functionality goes through the Maker so it isn’t “variable chat spaghetti.”

---

## 6. Why this beats “all in the harness”

- **Queue is formal** — Mission SoT, not chat memory.  
- **Wake is scheduled/triggered** — not a human saying “please build.”  
- **Archetype gate** cuts expensive novelty.  
- **Budget + stop** caps spend and thrash.  
- **PR boundary** keeps variability reviewable; you merge when ready.  
- **Toast sync** (already) means merged/world-wired content can land without restart/Accept.

---

## 7. Implementation sketch

1. **Primary trigger:** Cursor Automation **webhook** — Studio emits on `eng_auto_dispatch` (`MINIGAME_MAKER_WEBHOOK_URL` + optional secret).  
2. **Backup trigger:** rare cron (e.g. daily) to drain stale queued eng reqs.  
3. Tools: repo checkout, HTTPS Mission/MCP calls with `ABBIES_WORLD_TOKEN`, `gh` PR, xcodebuild/test subset.  
4. Prompt: fixed instructions — corpora + archetype gate + budget/stop (no open-ended “be creative”).  
5. Output: PR + Mission `links.prUrl` + `dispatch.status=awaiting_merge`.  
6. You: merge / Dump design / playable.

Existing pieces: `mission_request_minigame`, `engAutoDispatch`, webhook notifier, design corpora.

---

## 8. One-liner

> ChatGPT requests game function formally on Mission; Cursor Minigame Maker wakes with a budget, reuses archetypes first, ships a PR, and stops — you supervise taste and merge, not the build.

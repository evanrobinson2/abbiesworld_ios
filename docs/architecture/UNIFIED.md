# Unified — Abbie’s World as the living system

**Branch:** `unified`  
**Principle:** The user should never again be the integration layer.

---

## 1. Abbie’s World is not the iOS application

Abbie’s World is the entire living system.

- The iPad game is one surface into it.
- Studio is another.
- ChatGPT is another.
- A future parent-facing iPhone experience is another.
- Cursor is an engineering surface into it.
- MCP is a protocol through which agents interact with it.
- The asset-generation service is one of its capabilities.
- Midjourney, GPT Image, Meshy and future generators are providers behind that capability.
- GitHub is part of its engineering substrate.

None of these things individually is Abbie’s World. Ideally, the user gradually stops caring which one they are using.

## 2. The world is the center

There should be a canonical concept of the World. The World knows:

- which worlds exist;
- who the players are;
- who is currently playing;
- where each player is;
- what they have discovered;
- which places and scenes exist;
- what objects are in those scenes;
- which experiences are locked or unlocked;
- what happened previously;
- what changed recently;
- which assets represent things;
- what adventures are underway;
- what authored changes are pending;
- and eventually what the world is trying to become.

This is already partially present. Studio MCP is the live-world interface (`world_describe`, `author_beat`, `scene_upsert`, `place_upsert`, `scene_connect`, `vars_apply`, asset jobs, linting). Live world revisions can reach the iPad without destroying player state. Assets already have semantic IDs rather than being merely URLs.

Those are the beginnings of the operating system for Abbie’s World.

## 3. “Talk to Abbie’s World”

The north-star interaction is extremely simple:

> Talk to Abbie’s World.

Not “open Studio.” Not “invoke the World MCP.” Not “ask Cursor.” Not “create an asset job.” Not “edit the Swift project.”

I might be talking through ChatGPT Voice while driving. I might be sitting at Studio with twenty images in front of me. I might be holding the iPad with Abby. I might be at my Mac reviewing a build.

The conversation belongs to Abbie’s World, not to the interface through which I happened to initiate it.

I should be able to say:

> “Put a golden trinket in Abby’s bedroom. When she opens it, give her a little puzzle. Completing it unlocks a fairy-tale world where everybody is a baby. There should be a castle, a village, and…”

That creates durable intent. I can stop talking. The intent does not disappear when the chat ends.

## 4. Surfaces expose capabilities, not separate products

**Intent can enter anywhere. State is shared everywhere. Execution can happen anywhere. Each surface exposes only the capabilities appropriate to that surface.**

| Surface | Capabilities |
|---|---|
| iPad | Play, exploration, child-appropriate creation, discoveries, simple world-making |
| iPhone | Current world, approvals, notifications, talk to Abbie’s World, quick play/test |
| ChatGPT | Highest-bandwidth conversation: imagination, direction, critique, delegation |
| Studio | Spatial/visual: worlds, scenes, assets, proofs, placement, comparison, approval |
| Cursor | Repository-level engineering |

These are not independent workflows. They are different windows into one system.

## 5. The missing primitive: Mission

A **Mission** is durable intent plus responsibility for satisfying it.

Example: *Abby & Daddy Moon Base* — Abby finds the pink rocket, launches, flies to the Moon, lands, meets Daddy, gardens, meteor crash begins electrical repair / radar / quadbike adventure.

Structured state underneath:

**Intent → Plan → Requirements → Work → Proofs → Approvals → Integration → Verification → Playable**

The Mission knows what already exists, what remains, what is blocked, what can happen autonomously, what requires Evan — and the difference between activity and completion.

## 6. Completion means reality

**Intermediate artifacts are never confused with user outcomes.**

These are **not** completion: prompt written, image generated, asset approved, file downloaded, semantic ID created, code written, tests passed, commit created, PR opened, deployment completed, world revision published.

Those are evidence of progress.

For Moon Base, completion is:

> Evan picks up the target iPad, opens Abbie’s World, walks Abby to the rocket, launches it, flies to the Moon, lands it and plays the Moon Base mission.

If iPhone is an acceptance target, the corresponding experience also works there. That is done. Everything else is a waypoint.

## 7. This is not greenfield

We re-weave, we do not rewrite.

Already present:

- agent-coordination contract;
- art-requests lifecycle (`open → in_review → fulfilled / wont_fix`);
- semantic IDs as join keys;
- “approved art ≠ complete until imported, wired, validated, seen in-game”;
- `AGENT_COORDINATION.md` embryonic rule: completion requires implementation, validation, and an in-game screenshot;
- live-world distinction between “server revision exists” and “player accepted it without losing her place.”

Activity versus outcome is already in the DNA.

## 8. The next branch is primarily orchestration

Today Evan is effectively the message bus:

```
Evan → ChatGPT / Studio / Cursor → art tools / GitHub → assets / code → World / iOS → Abby
```

Target:

```
Evan / Abby
    ↓
ABBIE’S WORLD
    ↓
Intent + World State + Missions
    ↓
Capability Router / Director
    ↓
World | Studio | Art | Engineering | Build/Test | Delivery
```

The Director is an extremely competent state machine around intelligent workers — not magical AGI.

## 9. Capability routing

When a Mission needs a Moon Base background, it requests an **image asset** — not “use Midjourney.” The art capability chooses existing asset, edit, GPT Image, Midjourney, Meshy, 3D, procedural, or future models.

- Existing minigame configured here → world authorship.
- Lunar Lander physics → engineering.
- Rocket into live world → asset bind + world mutation.
- “Does this work?” → build/test/runtime inspection.

The Mission describes **what must become true**. Capabilities determine **how**.

## 10. Agents should not endlessly recurse

Avoid Claude-calls-Claude forever.

Bounded work cycles: **Observe → Reason → Act → Verify → Record → Repeat**

Every cycle reads durable state. Every action produces evidence. Every worker has a budget and can fail; another can retry. The Mission survives all of them. Cursor, Midjourney, or Vercel can disappear; the Mission remains.

## 11. The World itself becomes observable

Agents should ask: Where is Abby? What world/scene? Nearby POIs? Unlocks? Has she played Marble Voyage? Is the Moon rocket placed? Has she visited it? Is Daddy represented? What changed since yesterday? What happened in her last play session?

Once the world is legible, intelligence can respond to it. That is qualitatively different from an AI coding an app.

## 12. Studio becomes the visual manifestation of shared state

The webpage is secondary. The **approval capability** is important: see “Moon Base Mission — 14/21 assets ready,” tap proofs, approve/reject, or speak feedback with references. That feedback becomes Mission state.

## 13. Notifications become part of authorship

Interrupt sparingly for meaningful judgment:

- art proofs ready;
- one creative decision needed;
- spend would exceed budget;
- playable build ready;
- regression affecting Marble Voyage.

Not: “Worker #17 finished task #481.” Manage worlds, not workers.

## 14. Art production becomes asynchronous

The Mission should infer packs from story (“Abby flies to the Moon and meets Daddy” → rocket, cockpit, launch inserts, poses, lunar approach, landing, reunion…). Evan becomes art director — not asset dispatcher.

## 15. Coding becomes another capability

Cursor receives a **bounded engineering requirement** from the Mission (e.g. moonGuidance Lunar Lander, infinite retry, “Land for me,” unlock event, iPad + iPhone, tests + runtime evidence). Cursor reports evidence; the Mission decides whether the requirement is satisfied. Compile success ≠ adventure finished.

## 16. Moon Base is the vertical slice

Do not disappear for three months building a generalized platform. Force the architecture into existence with Moon Base:

> Starting from conversational intent, the system carries Moon Base all the way to Abby’s iPad with progressively less manual orchestration by Evan.

Every place Evan must copy, remember, switch tools, trigger, relay between agents, or verify mechanically is a candidate for elimination.

## 17–18. Acceptance journey and the closed loop

Talk → Mission → proofs → decisions → playable on iPad → Abby plays → World observes → we ask what she liked → we expand the parts she loves → cycle repeats.

## 19. The deeper product

A persistent medium between imagination and play. Abby affects it by playing. Evan by talking. Artists visually. Engineers via capabilities. Agents via implementation. Everyone touches the same underlying World. Interfaces become incidental.

## 20. Constitutional paragraph

> Abbie’s World is a persistent, agent-readable and agent-writable creative world whose capabilities may be exposed through many interfaces. No interface owns the world. Intent, missions, players, assets, places, progression and evidence of completion belong to Abbie’s World itself. ChatGPT, Studio, iOS, iPhone, Cursor, MCP servers, generators and future tools are surfaces or capabilities participating in that shared system. The architecture should optimize for a human expressing intent once and the system carrying that intent as far toward playable reality as its available capabilities permit, interrupting the human only for meaningful judgment, authorization or play.

**Engineering maxim:** The user should never again be the integration layer.

# Shared simulation direction and session digest

October 20, 2026. Covers the conversation beginning with “review current” at localhost port 8841 through the reasoning-research dispatch. Local development only, under Evan’s explicit override. This is a repository handoff and decision record, not a claim of production delivery.

## Governing direction

Build a reusable world simulation whose individual lives make physical god-mode manipulation interesting. Ranch is the first concrete adapter, not the limit of the model. People, animals, plants and future inhabitants can have persistent identity, lineage, relationships, preferences and consequences appropriate to their kind. Shared capacity for a story does not require human psychology, marriage or work rules for every organism.

Interesting diversity should emerge from interacting mechanisms: preferences influence destinations, journeys create encounters, encounters change relationships, and those changes influence later choices. Moving or reconnecting tiles can alter these possibilities without erasing identity or intention.

Evan’s final scope correction governs the earlier brainstorming: collect rich examples as suggestions and engineer a coherent, bounded, tested foundation. Do not treat every example as an immediate feature requirement. Piano careers, war, grief, resentment, detailed beliefs and broader species illustrate future possibilities, not a mandate to build separate subsystems now.

## Decisions and constraints

- Keep the baseline autonomous and self-recovering. No survival micromanagement; use honest replenishment/accounting. Scenario scarcity remains separate.
- Connecting, holding, removing and relocating tiles must have explicit shared-world semantics. Preserve identities, relationships, resources and unfinished intentions; reconcile routes and inaccessible destinations.
- Develop two manipulation responses: Carry on retains intentions while surroundings move; Panic interrupts routines with alarm and later recovery. Panic is the requested default. Put the choice in settings, not another permanent toolbar.
- Physical manipulation should allow free tilt, rotation, shaking and dropping. Creatures can collect against the existing glass cup. Local tile physics can differ, such as moon gravity beside ranch gravity; crossing should preserve continuous state while applicable forces change. Many profiles is an extensibility target, not a request to invent sixteen now.
- Keep history compact. Generation 700 need not retain 700 biographies. Preserve generation and meaningful recent references, explicitly summarize older lineage, and avoid implying that discarded ancestry remains queryable.
- Simple species-appropriate heredity is sufficient. Learned interests and family influence are distinct from biological traits. Interests can change through experience; occupations are not predetermined.
- A few bounded numeric traits and sparse affinities can provide dimensionality. Rich beliefs, principles and event interpretation remain design suggestions. Loss need not inevitably cause hatred, and individuals should not automatically know who caused an event.
- Ordinary salient memories and nominated heroes can use different bounded budgets. Lower detail must not erase identity or silently skip essential consequences. Keep options unobtrusive.
- Lossless optimizations are authorized. Explicit fidelity tradeoffs are a separate option, not a lossless improvement.
- Reasoning research should compare rules, heuristics, planning and optional LLM advice fairly. No paid inference or autonomous world changes were authorized by the research dispatch.

## Verified update

Status checked against worker messages, current source and repository reports. The current test command passed 65 tests with zero failures:

`node --test ranch-diorama-lab/*.test.mjs ranch-diorama-lab/tests/*.test.mjs ranch-diorama-lab/simulation/*.test.mjs`

### Ranch Simulator

The first believable-day pass is implemented locally: three-minute days at 1×, travel and chores at 6×, weekday/weekend routines, meals, breaks, play, chores, sleep, animal routines and occupancy-based house lighting. Human meals/school/town work still use abstractions; completed chores are not a food-production economy.

Humans, livestock and new flower patches share durable story records. Successors get new identities; perennial regrowth can preserve identity. Simple heredity and learned activity preferences exist. Decorative trees and pollinators do not all have individual biographies.

Default Medium story detail provides 12 recent individual events, 3 salient memories, 64 global events and 128 recent deceased records. Heroes allow 8 memories and 24 recent events. Low/Medium/High/Ultra currently change story retention and bookkeeping cadence only—not rendering, needs or physical fidelity. These newer additions postdate parts of the stress benchmark.

The original habitat test failure is fixed. Care recovery has transport/consumption tests at three distances under summer/winter conditions; the owner reports recovery in the saved ranch. This does not establish sustainable care at every generated layout or population.

### Stress Test

Integrated an exact navigation broad-phase optimization. Across 174,341 paired movement calls there were zero position differences; measured navigation CPU reductions were approximately 14%, 39% and 68% at 25, 100 and 306 active livestock.

On an Apple M5 with 16 GB RAM, headless Chrome at 1280×720, warmed samples reached roughly 60 fps at 100 active livestock, 30 fps at 192 and 20 fps at 306. Human workers were additional. Machine load and warmup materially affected results. These are measured brackets, not universal limits, and replace the earlier unmeasured estimate of concern around 50–100 creatures.

A request for 500 livestock produced only 306 visible bodies because habitat spawn capacity was exceeded. The remaining records were persisted; this is not a 500-active-creature benchmark or a sustainable 500-animal ranch. Draw calls and rendering also matter.

The plant-history API benchmark retained 500 living plants plus 128 recent dead records at about 363 KB after 700 renewals. This is serialized history data, not total app/GPU memory. Synchronized renewal of 500 plants still took about 100–150 ms because compaction repeats. Lift/panic and full fidelity presets were not benchmarked. The broad scaling curve used a frozen runtime; later story features only received narrower checks.

See [stress report](../ranch-stress-test/REPORT.md).

### Tile Physics

No implementation files changed. The worker inspected existing code and found the old inertia module presentation-only. Automatic approval review rejected its outgoing coordination message because the dispatch’s authorization was not treated as direct authorization from Evan. It is idle awaiting that authorization. Earlier wording that physics was “started” meant the task was created, not that physical behavior was delivered. Shared lift/panic integration is still unverified.

### Simulation Reasoning Research

Research is complete. Recommendation: strengthen deterministic utility scoring first; test optional asynchronous LLM advice only if it improves observable behavior over the same heuristic baseline. Advice should choose among bounded, validated actions, with stale-result rejection, fallback and replay records. Asset metadata alone does not establish executable simulation capabilities. No paid inference, implementation or deployment occurred.

See [decision memo](../decision-layer-research/DECISION-MEMO.md). Pricing and proposed experimental budgets in that memo are research assumptions, not measured runtime costs.

## Recommended next sequence

1. Stabilize the current integrated baseline and retain care/restore regression coverage. Reconcile outdated documentation: LIFETIMES.md still describes the superseded 24-second day; DAILY-LIFE.md records the current time policy.
2. Batch or index lifecycle compaction, with exact equivalence and reference-validity tests, to remove the measured renewal burst.
3. Resolve Tile Physics coordination authorization and agree the smallest shared topology/physics/behavior contract. Implement one end-to-end lift, move, reconnect and recovery case before multiplying features.
4. Benchmark that integrated case, including panic, rerouting and cup containment. Do not infer its capacity from steady ranch movement.
5. Keep richer personality, memory interpretation, careers and advisory intelligence in a prioritized backlog. Use the proposed heuristic experiment before authorizing LLM integration.

## Ownership

- Ranch Simulator: shared life semantics and ranch behavior adapter. Thread `01a15558-099f-7632-9ec1-312fa9864758`.
- Stress Test: measured capacity, correctness comparisons and lossless optimization. Thread `01a15aad-5157-7431-9a4b-75b8bc937d46`.
- Tile Physics: shared physical state, tile profiles, transitions and cup containment. Thread `01a15ab0-6765-7122-8c9a-b8952c889c8b`.
- Simulation Reasoning Research: exploratory decision memo only. Thread `01a15aba-1d78-7da0-8b84-886f751fc3d8`.

All four were idle at this status check. Task completion is not equivalent to delivery of every idea discussed. No watcher or recurring automation was created.

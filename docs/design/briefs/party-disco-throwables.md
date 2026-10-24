# PARTY, DISCO and the unlimited throwable

User request, 2026-10-24: keep the psychedelic mode as PARTY, add DISCO, remove the other four individual controls. Keep only the pink fireball shown in the second reference as the throwable control. Pick a random balloon effect on each pickup, unlimited for now. Visibly carry it at the mouse cursor, or grab/hold/flick on iPad. PARTY and DISCO stay enabled until explicitly disabled and may stack.

Way of acting: god-view interactions and simulation controls.

Design card
- What the player needs to feel or know: I can pick up magic, throw it, and keep playing.
- How would the character know? The resulting splash, fire or falling animals appears in the world; the disco ball and moving light spots are in the world too.
- Mode: overlay for the precise pickup and mode switches; diegetic for the thrown effects and disco lighting; meta for PARTY's psychedelic rendering.
- Who it's for: player.
- The whole game adapts: PARTY changes the rendered colours; DISCO adds a rotating mirror ball and moving coloured ground spots. No new music or character choreography is claimed.

## Interaction contract

- PARTY is the former tie-dye/psychedelic look, now a persistent toggle. DISCO has independent state. Neither consumes ammo or times out.
- The old fire, water, cats/dogs, tie-dye and locked fire-wheel button strip is replaced by PARTY and DISCO. Underlying balloon effect implementations and earned fire-wheel behavior remain available to their existing systems.
- One pink fireball with an infinity indicator replaces the slot machine and eight-ball inventory. Every pickup rolls paint, fire, water or cats/dogs with equal probability. Colour and size still vary. Psychedelic mode is exclusively controlled by PARTY here, so random throws cannot re-enable it after switching it off.
- Mouse: click to pick up, carry visibly, then click the world or drag/flick and release. Touch: grab the icon and drag/flick into the world, or tap to arm then drag from the world. Release coordinates remain viewport coordinates for the existing terrain-aware projection.
- Escape, pointer cancellation, blur, hidden page and leaving the world clear the carried fireball. Releasing over UI cancels. Modified camera gestures retain their ownership. No cooldown, charges, refills or slot-machine delay.
- The user's Black & White reference guides the direct visible pickup/hold/throw metaphor. No copied assets or claim of a full Black & White gesture-recognition system.

## Scope and evidence

Source: canonical `evanrobinson2/abbiesworld_ios`, current-main handoff and Dispatch #629; related unlimited use #546 and release alignment #548; user's two screenshots and clarification in this chat. Followed CLAUDE.md, INVARIANTS.md, the designer skill, interaction grammar, existing paint-world runtime and mobile gesture contract.

This changes the shared browser runtime and its Pointer Events touch interaction. Physical iPad/Safari and native Swift port verification remain separate from Chromium touch emulation.

Tour: yes. This replaces the previous paint pickup mechanic.

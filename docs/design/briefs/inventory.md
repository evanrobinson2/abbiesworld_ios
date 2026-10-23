# Abbie's pocket (player inventory)

Evan, 2026-10-23: "if abbie picks it up a voice in her head (the small girl's voice) says interesting - this key will
come in handy, and you need to add player inventory .. use our UX system categorization to add that UX experience
properly into game... I think inventory goes in the top bubble widget 1st class?"

Design card
- What the player needs to feel or know: "I'm holding the key now, and I'll need it later."
- How would the character know? She feels it in her pocket, and she hears herself think about it.
- Mode: meta for the moment (her inner voice, a thought in the small-girl voice, and the item dropping into the pocket).
  Then a small overlay register: the pocket sits on the chronograph, because she needs to check what she carries at any
  time, and the world can't show what's inside a pocket. It isn't diegetic: nobody else in the world knows what she carries.
  It isn't spatial either, because the pocket isn't the social layer.
- Who it's for: the player (the child). Directors read it through the 'abbie' information manifest (item 'pocket').
- The whole game adapts: whoever is near reacts to what she carries (the café's basement door opens for the brass key).
  The inner voice is the one sound cue.

Rules
- None until it matters: the pocket appears the first time she picks something up.
- One register on the chronograph, about 34 px. A count badge appears once she carries two or more things. Tapping it
  opens "In my pocket" with each item's picture and name. On a phone the pocket stays visible while the case is folded.
- Picking up: one thought line of ten words at most, shown in italics beside the pocket and spoken in the light
  small-girl voice (quiet when sound is off). The item then drops into the pocket and the pocket bumps.
- Items carry id, name, icon (a picture or one emoji) and from (the place). Code is in `simulations/inventory.mjs`.

Tour: yes. It becomes a stop once the first item can be picked up in play (the café key).

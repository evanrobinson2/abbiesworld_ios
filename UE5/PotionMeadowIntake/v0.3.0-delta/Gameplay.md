# Potion Meadow v0.3.0 — exploration rebuilt

Open `Play Potion Meadow.cmd`. This is a new standalone Windows build; the older v0.2.0 build and frozen UE5 intake remain unchanged.

Move **one cardinal square per click**, or use arrows / WASD. There is no diagonal movement, distant click-to-walk or automatic approach to enemies. While Abbie is finishing one step, another click cannot queue a longer path.

Glowing cyan neighbors are unexplored squares you can uncover. Revealing one square lifts its smoky fog, restores **one heart up to Abbie's maximum**, and restores **one heart to each living wounded goon**, up to that goon's maximum. Exploration is single-use even at full health. Previously revealed squares never heal again. Defeated goons are never revived.

Fog hides ingredients, rocks and goons. Discovering an empty square also moves Abbie onto it. Discovering a rock or goon reveals it while Abbie stays where she is; it never causes a surprise attack. Gold neighbors are clear steps. A red adjacent goon can be challenged with another click. Revealed X squares are blocked. Goons above Abbie's level wait until she is ready.

The subtle glass-look glaze and highlights are a visual **floor underlay**, not healing collectibles or glass squares. The recovery resource is unexplored fog. The frosted underlay was recreated here; the original Marble Voyage source was not found in this workspace and is not claimed to have been copied.

Reach level 3 by cheering goons 0–2, then cheer pumpkin goon 3 and reach the picnic at the upper right. A defeated goon does not retaliate. Abbie deals 2 per challenge. There is no timer, roaming enemy, automatic combat or damage from exploring.

| Difficulty | Hearts | Starting heart / star potions | Goon HP | Goon reply damage |
|---|---:|---:|---|---|
| Easy | 8 | 1 / 1 | 2, 4, 6, 8 | 0, 1, 2, 2 |
| Medium | 6 | 1 / 1 | 2, 4, 8, 10 | 0, 1, 2, 2 |
| Hard | 6 | 1 / 1 | 2, 6, 10, 12 | 0, 1, 2, 3 |

Exploration recovery is balanced by fewer starting potions on Easy, stronger later goons, and the reciprocal healing of wounded enemies. Heart potions restore 4; star potions block 3 replies. Berries and flowers brew refills at the cauldron. Walk there one square at a time before using the brewing buttons.

R retries the same seed. N starts a fresh board of the current tier. M chooses difficulty. 1 / 2 drink heart / star potions. Escape opens the difficulty screen, then returns to a configured parent world or exits this standalone build. Sound and gentle-effects options remain available.

The public UE5 integration is coordinator-controlled. This revision changes gameplay/UI source while retaining the original `/Game/PotionMeadow` native asset paths; it does not overwrite the frozen v0.2.0 intake or shared project/config files.

# Ranch supply chains: what Abbie's World takes from Cartel Tycoon

Oracle proposal, 2026-10-22. Requested by Evan: "Cartel Tycoon, ingest that one end to end, extract its identity,
assimilate it." Identity record: `docs/oracle/identity/examples/cartel-tycoon.json` (first pass from the store page
and public footage; the game is owned but not yet installed, so measurements come later).

## What we take and what we leave

Cartel Tycoon's fun is a **logistics toy**: you build a chain from field to export, watch vehicles carry goods along
it, find the bottleneck and fix it, then expand into the next district. That is style and mechanics, and it fits the
house identity (building is the verb, the world answers every placement).

We leave its theme and expression completely: no drugs, crime, police, raids, violence, corruption or laundering, no
death or succession, and none of its characters, setting, art, music or text.

| Cartel Tycoon (style we study) | Abbie's World version (PG) |
| --- | --- |
| Plantations → labs → warehouses → airfield, with trucks on routes | Fields and animals → workshops → barn → market stall or station, with carts on roads |
| Storage and transport capacity are the bottleneck | Goods visibly pile up at a full barn or a busy cart; fix it with another cart or a bigger barn |
| Earnings must be converted into spendable money | Two rewards: coins from selling, and thank-you stars from neighbours. Stars unlock new building types; coins build them |
| Take over districts one by one | Help a neighbouring valley by delivering what it asks for; it opens its land, a new crop and a new road |
| Attention rises with activity and brings raids | Seasons and weather slow things down (a rainy week floods a road, winter slows the fields); nothing is ever lost |
| Lieutenants with traits | Ranch hands with traits (fast, careful, loves animals) who run a workshop or a cart |
| Zoom out to see the whole empire moving | A "whole valley" camera that shows every cart moving on its road: the payoff shot |

## The first playable slice (Ranch Atelier)

1. **Three chains**: wheat → mill → bakery → bread; cows → dairy → cheese; sheep → shearing shed → yarn.
2. **Carts** follow the existing ranch roads between buildings, carrying a visible crate of the good.
3. **Capacity**: each building holds a few crates and shows them stacked. When one is full, its producer pauses and
   a small sign appears over it.
4. **The market stall** turns crates into coins with a chime and a coin pop over the stall (sound on every delivery).
5. **One neighbour request** at a time ("The valley school wants 3 loaves"). Filling it gives a star, and the first
   stars open a second valley tile.
6. **Voice**: "make a bakery next to the mill" and "send two carts of cheese to the market" work through live mode,
   with the Oracle's `consult` plan as the rules.

The ranch already has people with schedules, animals, roads, tiles and a day clock, so the slice is mostly new
building roles, a goods-and-crates layer and a cart walker on existing paths.

## Status

Proposal. Not built yet. The next step is the Oracle's `consult` plan for it, then a prototype on the live branch.

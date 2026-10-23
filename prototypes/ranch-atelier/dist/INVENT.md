# Make: the player build harness

A signed-in player types (or dictates with the phone keyboard) a few words, and one new toy appears in their world.
This is the constrained "invent something from scratch" path for the launch demo, paid from each player's $1 cap.

## The path

1. **Make card** (`simulations/invent/make.mjs`): summoned from the toy box shelf ("Make") or the header sparkle.
   A small glass wish card at the bottom of the screen; it closes itself when the toy lands. It also lists the
   player's own past makes (this device), which rebuild for free.
2. **`POST /api/invent {wish}`** (`api/invent.js`), cheapest step first:
   - burst limits: 30 a minute per address, 8 a minute and 80 an hour per player;
   - sign-in (`lib/account.cjs`), then the local PG screen (`simulations/live/policy.mjs` `screen`);
   - the **shared cache**: the same words (any case or punctuation), or the name of a toy someone already made,
     come back at once with no AI and no charge;
   - the **guard** (the live-mode judge, `api/live.js` `judge`), charged `PRICES.guardCall`; anything but "ok" is
     refused, and a guard that can't answer refuses (fails closed);
   - the **designer** (`openai/gpt-6-luna` through AI Gateway, `INVENT_MODEL` overrides), charged
     `PRICES.inventCall` ($0.02). It returns data only, in the live `build` shape.
3. **The gate** (`simulations/invent/contract.mjs` `constrain`): every recipe passes it, from the designer, the
   cache, a saved make, and Suzy's voice `build` (with the voice's wider bounds). Holodeck toy shapes only, at most
   24 parts, positions and sizes pulled into range, hex colours, no chase, names and lines PG-screened. No code,
   no assets, no text in the world.
4. **The stage** (`simulations/holodeck/stage.mjs`): `buildOps` turns it into holodeck ops, which the stage
   validates again, then the camera glides to the new toy. The toy is world layer: residents and Suzy see it.

## Money and surge

- $0.021 for a new design, so $1 makes about 45 new toys; cached ones are free and unlimited.
- Identical wishes sent at the same moment share one guard call and one design (in-flight join). A crowd asking for
  "a dragon" costs one design.
- At most 24 designs at once per function instance; past that, "Lots of builders right now! Try again in a moment."
- When a player's cap or the $100 public pool is spent, new designs stop (402) and the card offers toys other
  players already made, which still work for free. Ideas are offered by the toy's own screened name, never by the
  words another child typed.
- **Rebates** (Evan, 2026-10-23): when another player uses a toy someone invented (same words, its name, or joining
  the same design in flight), the inventor gets back what it cost them ($0.021), once per toy. The rebate goes to the
  inventor's own ledger only (`wallet().refund`); the public pool keeps counting the real money spent.
  Exactly-once comes from a rebate record written only if absent (`invent/v1/rebates/`).
- `INVENT_ENABLED=false` switches Make off without a deploy of code.

## Storage (private Blob store)

- `invent/v1/cache/<hash>.json`: `{wish, recipe, madeAt, version, by, cost}`, filed under the wish and under the
  toy's name. `by` is the inventor's hashed account id and owner flag, kept only for the rebate.
- `invent/v1/made/<account>/<id>.json`: each player's makes, under the hashed account id, so a make keeps its intent
  and can be rebuilt or upgraded to a proper model later (the workshop's `order_model` path).

## Testing

- `node --test tests/invent.test.cjs`: the gate, the ops, cache, guard, cap, surge join and bursts, with fakes.
- On a **preview** deployment only (behind Vercel's login), `GET /api/invent?try=<wish>` runs the real guard and
  designer as a test account on its own ledger. It is off in production.

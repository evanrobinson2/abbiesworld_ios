# Wrench pair

Owner and players. Secrets stay off git.

## Owner

| Field | Value |
| --- | --- |
| Name | Evan Robinson |
| Hive identity | `mind/IDENTITY.md` |
| Worker | `luna-local` (Wrench) |
| Owner key | Device secure store only. Never committed. |
| Status | **Bound in spec, unbound in silicon.** Gen 0 is this Mac. |

If the owner key is absent, the node does not speak, sync, or accept a
new iPod.

## iPods

Slots Evan can fill. Empty means not paired yet.

| Slot | Kind | Radio | Status |
| --- | --- | --- | --- |
| A | iPod Touch | Bluetooth + Wi‑Fi | unpaired |
| B | iPod Nano (BT) | Bluetooth | unpaired |
| C | iPod Classic | Dock / line-out only | unpaired |

A Touch can carry hive sync over Wi‑Fi. A Nano is an ear. A Classic
plays; it does not host the brain.

## Rules

1. Pair is Evan’s act. The node does not advertise itself to strangers.
2. Losing the owner key bricks the radios until Evan re-binds.
3. Losing an iPod unpairs that slot only. The other slots stay.
4. No third device is a node. iPods are players, not siblings.

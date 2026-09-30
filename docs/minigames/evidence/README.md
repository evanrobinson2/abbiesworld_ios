# Marble Voyage — sim / run evidence

Machine-readable gameplay evidence. Same schema as `MarbleVoyageRunRecord` (v1).

| File | What |
|---|---|
| `charm_catalog.json` | Peglin-role charm map + art ids + base prices |
| `gold_economy_summary.json` | Calibration + grid recommendation |
| `player_protocol_summary.json` | Aggressive / motivated / casual means + fun-smell rates |
| `sim_land_seed_*.json` | Full documented simulated Lands (fights + shops + charms) |

Regenerate:

```sh
python3 scripts/plink_gold_economy_sim.py --evidence
```

Player-protocol audit (XCTest):

```sh
xcodebuild test -project abbies.world.ios/abbies.world.ios.xcodeproj \
  -scheme abbies.world.ios \
  -destination 'platform=iOS Simulator,name=iPad (A16)' \
  -only-testing:abbies.world.iosTests/MarbleVoyagePlayerProtocolTests/testProtocolAuditCollectsStatsAndWritesEvidence
```

Design doc: `../MARBLE_VOYAGE_CHARMS.md`

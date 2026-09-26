# Marble Voyage — sim / run evidence

Machine-readable gameplay evidence. Same schema as `MarbleVoyageRunRecord` (v1).

| File | What |
|---|---|
| `charm_catalog.json` | Peglin-role charm map + art ids + base prices |
| `gold_economy_summary.json` | Calibration + grid recommendation |
| `sim_land_seed_*.json` | Full documented simulated Lands (fights + shops + charms) |

Regenerate:

```sh
python3 scripts/plink_gold_economy_sim.py --evidence
```

Design doc: `../MARBLE_VOYAGE_CHARMS.md`

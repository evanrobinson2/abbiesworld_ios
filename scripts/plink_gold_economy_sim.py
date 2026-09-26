#!/usr/bin/env python3
"""
Marble Voyage gold-economy Monte Carlo + run evidence emitter.

Calibrated from PlinkGoldEconomyProbeTests (continuum fox.pawPrint):
  pegs=34, pegHits mean≈5.5 p50=4 p90=10
  fight rounds: hench~7.2 mini~8.1 boss~8.3

Charm catalog mirrors `MarbleVoyageCharm.swift` (Peglin relic *roles*).
Evidence JSON mirrors `MarbleVoyageRunRecord` schema v1.

Usage:
  python3 scripts/plink_gold_economy_sim.py
  python3 scripts/plink_gold_economy_sim.py --trials 400 --evidence
"""

from __future__ import annotations

import argparse
import json
import random
from datetime import datetime, timezone
from pathlib import Path
from statistics import mean
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE_DIR = ROOT / "docs" / "minigames" / "evidence"

PEGS = 34
HIT_P10, HIT_P50, HIT_P90, HIT_MAX = 2, 4, 10, 19

CHARM_CATALOG: dict[str, dict[str, Any]] = {
    "bloom": {
        "title": "Bloom",
        "role": "healing",
        "base": 35,
        "exemplars": ["An Apple A Day", "Gardener's Gloves"],
        "asset": "ench_grows_flowers",
    },
    "hover": {
        "title": "Hover",
        "role": "utility_bounce",
        "base": 35,
        "exemplars": ["Super Boots"],
        "asset": "ench_floats_an_inch",
    },
    "prismBurst": {
        "title": "Prism Burst",
        "role": "peg_damage",
        "base": 40,
        "exemplars": ["Adventurine"],
        "asset": "ench_burps_rainbows",
    },
    "moonGleam": {
        "title": "Moon Gleam",
        "role": "gold",
        "base": 40,
        "exemplars": ["Molten Gold"],
        "asset": "ench_glows_at_night",
    },
    "cycle": {
        "title": "Cycle",
        "role": "crit_refresh_board",
        "base": 35,
        "exemplars": ["Lucky Penny", "Strange Brew"],
        "asset": "ench_changes_colour",
    },
    "softPurr": {
        "title": "Soft Purr",
        "role": "defensive",
        "base": 40,
        "exemplars": ["Round Guard", "Refreshield"],
        "asset": "ench_purrs_when_you_sit",
    },
    "lullaby": {
        "title": "Lullaby",
        "role": "status_debuff",
        "base": 40,
        "exemplars": ["Roundrel status pool"],
        "asset": "ench_sings_lullabies",
    },
    "sockSnatch": {
        "title": "Sock Snatch",
        "role": "bomb_payout",
        "base": 30,
        "exemplars": ["Short Fuse"],
        "asset": "ench_hides_your_socks",
    },
}

# One land of the linear campaign: three POI fights, then that land's boss.
# Mirrors `MarbleVoyageRun.makeCampaign` node ids (land{N}_poi1…poi3, land{N}_boss).
STOPS = [
    # node_suffix, title_suffix, role, rounds_mean, hp_loss_range
    ("poi1", "POI1 Warmup", "henchman", 7.2, (0.04, 0.14)),
    ("poi2", "POI2 Battle", "henchman", 8.0, (0.08, 0.20)),
    ("poi3", "POI3 Hard", "henchman", 8.1, (0.10, 0.24)),
    ("boss", "Boss", "miniBoss", 8.3, (0.14, 0.32)),
]

# Marble levels mirror `MarbleVoyageOwnedMarble.damageMultiplier` (Peglin orbs max at 3).
MARBLE_MAX_LEVEL = 3
MARBLE_DAMAGE_MULTIPLIER = {1: 1.0, 2: 1.12, 3: 1.25}
# `MarbleVoyageOwnedMarble.starterCollection()` — one of each catalog orb at Lv1.
MARBLE_COLLECTION_SIZE = 6


def marble_collection() -> list[int]:
    return [1] * MARBLE_COLLECTION_SIZE


def marble_upgrade_target(levels: list[int]) -> int | None:
    """Lowest level first, ties broken by catalog order — matches MarbleVoyageMarbleRules."""
    best = None
    for i, lv in enumerate(levels):
        if lv >= MARBLE_MAX_LEVEL:
            continue
        if best is None or lv < levels[best]:
            best = i
    return best


def marble_damage_multiplier(levels: list[int], ball_level: int) -> float:
    marble = mean(MARBLE_DAMAGE_MULTIPLIER[lv] for lv in levels)
    return marble * (1.0 + 0.05 * max(0, ball_level - 1))

ECONOMY = {
    "goldPegPrevalence": 0.15,
    "goldPegValue": 6,
    "healPrice": 25,
    "ballUpgradePrice": 25,
    "healFraction": 0.20,
    "shopInflation": 1.25,
}


def iso_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def sample_hits(rng: random.Random) -> int:
    u = rng.random()
    if u < 0.10:
        return rng.randint(1, HIT_P10)
    if u < 0.50:
        return rng.randint(HIT_P10, HIT_P50)
    if u < 0.90:
        return rng.randint(HIT_P50, HIT_P90)
    return rng.randint(HIT_P90, HIT_MAX)


def sample_rounds(mean_r: float, rng: random.Random) -> int:
    return max(3, int(round(rng.gauss(mean_r, 1.2))))


def fight_gold(
    prevalence: float,
    value: float,
    rounds_mean: float,
    rng: random.Random,
) -> dict[str, int]:
    n_gold = max(0, int(round(PEGS * prevalence)))
    gold_ids = set(rng.sample(range(PEGS), n_gold)) if n_gold else set()
    unlit = set(range(PEGS))
    earned = 0.0
    gold_hits = 0
    rounds = sample_rounds(rounds_mean, rng)
    for _ in range(rounds):
        if not unlit:
            break
        hits = min(sample_hits(rng), len(unlit))
        for pid in rng.sample(list(unlit), hits):
            unlit.discard(pid)
            if pid in gold_ids:
                earned += value
                gold_hits += 1
    return {
        "rounds": rounds,
        "gold": int(round(earned)),
        "goldHits": gold_hits,
        "pegsLit": PEGS - len(unlit),
        "boardPegs": PEGS,
    }


def shop_visit(
    wallet: int,
    hp: float,
    max_hp: int,
    charm_stacks: dict[str, int],
    marbles: list[int],
    rng: random.Random,
    policy: str,
) -> tuple[int, float, dict[str, Any]]:
    heal_price = ECONOMY["healPrice"]
    up_price = ECONOMY["ballUpgradePrice"]
    offers = rng.sample(list(CHARM_CATALOG.keys()), 2)
    charm_prices = {c: CHARM_CATALOG[c]["base"] for c in offers}
    purchases: list[dict[str, Any]] = []
    buys = {"heal": 0, "upgrade": 0, "charm": 0}
    bloom = charm_stacks.get("bloom", 0)
    heal_frac = ECONOMY["healFraction"] + 0.05 * bloom

    def inflate(p: int) -> int:
        return max(1, int(round(p * ECONOMY["shopInflation"])))

    def buy_heal() -> bool:
        nonlocal wallet, hp, heal_price
        if wallet < heal_price or hp >= 0.999:
            return False
        wallet -= heal_price
        before = hp
        hp = min(1.0, hp + heal_frac)
        purchases.append(
            {
                "sku": "heal",
                "pricePaid": heal_price,
                "detail": f"+{int(round((hp - before) * max_hp))} HP",
            }
        )
        heal_price = inflate(heal_price)
        buys["heal"] += 1
        return True

    def buy_upgrade() -> bool:
        nonlocal wallet, up_price
        target = marble_upgrade_target(marbles)
        if target is None or wallet < up_price:
            return False
        wallet -= up_price
        marbles[target] += 1
        purchases.append(
            {
                "sku": "ballUpgrade",
                "pricePaid": up_price,
                "detail": f"marble{target} → Lv{marbles[target]}",
            }
        )
        up_price = inflate(up_price)
        buys["upgrade"] += 1
        return True

    def buy_charm() -> bool:
        nonlocal wallet
        for c in sorted(offers, key=lambda x: charm_prices[x]):
            p = charm_prices[c]
            if wallet >= p:
                wallet -= p
                charm_stacks[c] = charm_stacks.get(c, 0) + 1
                purchases.append(
                    {"sku": f"charm.{c}", "pricePaid": p, "detail": f"stack→{charm_stacks[c]}"}
                )
                charm_prices[c] = inflate(p)
                buys["charm"] += 1
                return True
        return False

    if policy == "greedy_sustain":
        for _ in range(10):
            if hp < 0.70 and buy_heal():
                continue
            if buys["upgrade"] < 1 and buy_upgrade():
                continue
            if wallet >= min(charm_prices.values()) + 25 and buy_charm():
                continue
            if hp < 0.90 and buy_heal():
                continue
            break
    elif policy == "banker":
        if hp < 0.55:
            buy_heal()
    elif policy == "spender":
        for _ in range(14):
            acted = False
            if hp < 0.95:
                acted = buy_heal() or acted
            acted = buy_upgrade() or acted
            acted = buy_charm() or acted
            if not acted:
                break
    else:
        raise ValueError(policy)

    return wallet, hp, {
        "buys": buys,
        "purchases": purchases,
        "charmOffers": offers,
    }


def simulate_documented_run(
    seed: int,
    n_lands: int = 1,
    policy: str = "greedy_sustain",
    prevalence: float | None = None,
    value: float | None = None,
) -> dict[str, Any]:
    """One full evidence record (schema aligned with MarbleVoyageRunRecord)."""
    rng = random.Random(seed)
    prev = prevalence if prevalence is not None else ECONOMY["goldPegPrevalence"]
    val = value if value is not None else float(ECONOMY["goldPegValue"])
    max_hp = 120
    wallet = 0
    hp = 1.0
    charm_stacks: dict[str, int] = {}
    marbles = marble_collection()
    ball_level = 1
    fights: list[dict[str, Any]] = []
    shops: list[dict[str, Any]] = []
    path: list[dict[str, Any]] = []
    land_gold = []
    prev_id = "start"

    for land in range(n_lands):
        gained = 0
        for node_id, title_suffix, role, rmean, dmg in STOPS:
            full_id = f"land{land}_{node_id}"
            title = f"L{land + 1} {title_suffix}"
            path.append({"from": prev_id, "to": full_id, "title": title, "kind": "fight"})
            prev_id = full_id
            lo, hi = dmg
            hp_before = int(round(hp * max_hp))
            hp = max(0.08, hp - rng.uniform(lo, hi))
            moon = charm_stacks.get("moonGleam", 0)
            eff_val = val * (1.0 + 0.10 * moon)
            fg = fight_gold(prev, eff_val, rmean, rng)
            wallet += fg["gold"]
            gained += fg["gold"]
            fights.append(
                {
                    "nodeID": full_id,
                    "title": title,
                    "role": role,
                    "waveAttacker": None,
                    "foes": [],
                    "won": True,
                    "rounds": fg["rounds"],
                    "damageDealt": 0,
                    "damageTaken": hp_before - int(round(hp * max_hp)),
                    "hpBefore": hp_before,
                    "hpAfter": int(round(hp * max_hp)),
                    "goldEarned": fg["gold"],
                    "goldPegHits": fg["goldHits"],
                    "pegsLit": fg["pegsLit"],
                    "boardPegs": fg["boardPegs"],
                    "fightSeed": seed + len(fights) * 17,
                }
            )
            wb, hp_b = wallet, int(round(hp * max_hp))
            wallet, hp, shop = shop_visit(
                wallet, hp, max_hp, charm_stacks, marbles, rng, policy
            )
            for p in shop["purchases"]:
                if p["sku"] == "ballUpgrade":
                    ball_level += 1
            shops.append(
                {
                    "afterNodeID": full_id,
                    "walletBefore": wb,
                    "walletAfter": wallet,
                    "hpBefore": hp_b,
                    "hpAfter": int(round(hp * max_hp)),
                    "charmOffers": shop["charmOffers"],
                    "purchases": shop["purchases"],
                }
            )
        land_gold.append(gained)

    return {
        "schemaVersion": 1,
        "kind": "simulation",
        "seed": seed,
        "startedAtISO8601": iso_now(),
        "finishedAtISO8601": iso_now(),
        "mode": "campaign",
        "economy": {
            **ECONOMY,
            "goldPegPrevalence": prev,
            "goldPegValue": int(val),
        },
        "gang": None,
        "coins": wallet,
        "playerHP": int(round(hp * max_hp)),
        "playerMaxHP": max_hp,
        "ballLevel": ball_level,
        "charmStacks": charm_stacks,
        "path": path,
        "fights": fights,
        "shops": shops,
        "events": [],
        "outcome": "ongoing",
        "notes": (
            f"gold economy sim policy={policy} lands={n_lands} landGold={land_gold} "
            f"marbles={marbles} dmgMult={marble_damage_multiplier(marbles, ball_level):.3f}"
        ),
        "_meta": {
            "landGold": land_gold,
            "policy": policy,
            "marbles": list(marbles),
            "damageMultiplier": marble_damage_multiplier(marbles, ball_level),
        },
    }


def summarize(xs: list[float | int]) -> dict[str, float]:
    xs = sorted(float(x) for x in xs)
    n = len(xs)

    def q(p: float) -> float:
        return xs[min(n - 1, int((n - 1) * p))]

    return {"mean": mean(xs), "p10": q(0.10), "p50": q(0.50), "p90": q(0.90)}


def write_evidence(trials: int = 40) -> Path:
    EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
    records = []
    for i in range(trials):
        rec = simulate_documented_run(seed=10_000 + i, n_lands=1, policy="greedy_sustain")
        records.append(rec)
        out = EVIDENCE_DIR / f"sim_land_seed_{rec['seed']}.json"
        # strip private meta for schema fidelity
        public = {k: v for k, v in rec.items() if not k.startswith("_")}
        out.write_text(json.dumps(public, indent=2, sort_keys=True) + "\n")

    fight_gold = [f["goldEarned"] for r in records for f in r["fights"]]
    land_gold = [sum(r["_meta"]["landGold"]) for r in records]
    charm_buys = sum(sum(1 for s in r["shops"] for p in s["purchases"] if p["sku"].startswith("charm.")) for r in records)
    summary = {
        "generatedAt": iso_now(),
        "schemaVersion": 1,
        "calibration": {
            "boardPegs": PEGS,
            "pegHits": {"mean": 5.5, "p50": 4, "p90": 10},
            "source": "PlinkGoldEconomyProbeTests",
        },
        "economy": ECONOMY,
        "charmCatalog": CHARM_CATALOG,
        "trials": trials,
        "fightGold": summarize(fight_gold),
        "landGold": summarize(land_gold),
        "charmPurchasesTotal": charm_buys,
        "recommendation": {
            "goldPegPrevalence": 0.15,
            "goldPegValue": 6,
            "note": "≈29 coin/fight sustains heal/upgrade at 25; charms are save-up prizes",
        },
        "recordFiles": [f"sim_land_seed_{r['seed']}.json" for r in records[:10]],
        "peglinMappingDoc": "docs/minigames/MARBLE_VOYAGE_CHARMS.md",
    }
    summary_path = EVIDENCE_DIR / "gold_economy_summary.json"
    summary_path.write_text(json.dumps(summary, indent=2, sort_keys=True) + "\n")
    catalog_path = EVIDENCE_DIR / "charm_catalog.json"
    catalog_path.write_text(json.dumps(CHARM_CATALOG, indent=2, sort_keys=True) + "\n")
    return summary_path


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--trials", type=int, default=400)
    ap.add_argument("--evidence", action="store_true", help="Write run records under docs/minigames/evidence/")
    ap.add_argument("--evidence-trials", type=int, default=40)
    args = ap.parse_args()

    print("=== Charm catalog (Peglin relic roles) ===")
    for cid, c in CHARM_CATALOG.items():
        print(f"  {cid:12s} ${c['base']:<3}  role={c['role']:<20} art={c['asset']}")

    prevalences = [0.12, 0.15, 0.18]
    values = [5, 6, 7]
    print("\n=== Grid @ greedy_sustain (1 land income before shop mix) ===")
    print(f"{'prev':>5} {'val':>3} {'fight':>6} {'L1':>6} {'p10':>5} {'p90':>5}")
    for prev in prevalences:
        for val in values:
            fights: list[int] = []
            lands: list[int] = []
            for t in range(args.trials):
                rec = simulate_documented_run(
                    seed=2000 + t,
                    n_lands=1,
                    prevalence=prev,
                    value=val,
                )
                fg = [f["goldEarned"] for f in rec["fights"]]
                fights.extend(fg)
                lands.append(sum(fg))
            sf, sl = summarize(fights), summarize(lands)
            print(
                f"{prev:5.2f} {val:3d} {sf['mean']:6.1f} {sl['mean']:6.1f} "
                f"{sl['p10']:5.0f} {sl['p90']:5.0f}"
            )

    print("\n=== Recommended (15% @ 6) policy mix, 3 lands, n=200 ===")
    print(f"  {'policy':16s} {'endCoins':>9} {'charms':>7} {'ballLv':>7} {'dmgMult':>8}")
    for pol in ("banker", "greedy_sustain", "spender"):
        ends = []
        charms = []
        levels = []
        mults = []
        for t in range(200):
            rec = simulate_documented_run(seed=3000 + t, n_lands=3, policy=pol)
            ends.append(rec["coins"])
            charms.append(sum(rec["charmStacks"].values()))
            levels.append(rec["ballLevel"])
            mults.append(rec["_meta"]["damageMultiplier"])
        print(
            f"  {pol:16s} {mean(ends):9.1f} {mean(charms):7.2f} "
            f"{mean(levels):7.2f} {mean(mults):8.3f}"
        )

    if args.evidence:
        path = write_evidence(args.evidence_trials)
        print(f"\nWrote evidence → {path}")
        print(f"  also {EVIDENCE_DIR}/sim_land_seed_*.json + charm_catalog.json")


if __name__ == "__main__":
    main()

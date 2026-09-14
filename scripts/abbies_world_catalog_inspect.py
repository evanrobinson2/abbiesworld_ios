#!/usr/bin/env python3
"""Textual inspection of the bundled Abbie's World cozy-room catalog."""

from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = (
    ROOT
    / "abbies.world.ios"
    / "abbies.world.ios"
    / "Assets.xcassets"
    / "cozy_room_asset_manifest.dataset"
    / "cozy_room_asset_manifest.json"
)

PRICES = {
    "beds": 12,
    "hanging-seating": 8,
    "canopy-seating": 8,
    "seating": 8,
    "lighting": 5,
    "hanging-decor": 5,
    "rugs": 4,
    "botanical-decor": 3,
    "storage": 7,
    "shelving": 7,
    "play-stages": 6,
    "carts": 6,
    "crafting": 6,
}


def gem_price(category: str) -> int:
    return PRICES.get(category, 6)


def main() -> int:
    payload = json.loads(MANIFEST.read_text())
    assets = payload["assets"]
    props = [asset for asset in assets if asset["role"] == "placeable-room-prop"]
    ingredients = [asset for asset in assets if asset["role"] == "furniture-store-ingredient"]
    shop = sorted(
        [
            {
                "id": asset["id"],
                "name": asset["label"],
                "catalogName": asset["assetCatalogName"],
                "category": asset["category"],
                "price": gem_price(asset["category"]),
            }
            for asset in props
        ],
        key=lambda item: (item["price"], item["name"]),
    )

    report = {
        "product": "Abbie's World",
        "manifest": str(MANIFEST.relative_to(ROOT)),
        "assetCountField": payload.get("assetCount"),
        "assetCountActual": len(assets),
        "roles": dict(Counter(asset["role"] for asset in assets)),
        "propCategories": dict(Counter(asset["category"] for asset in props)),
        "ingredientCategories": dict(Counter(asset["category"] for asset in ingredients)),
        "shopItemCount": len(shop),
        "cheapest": shop[:3],
        "priciest": shop[-3:],
        "sampleProp": {
            "id": props[0]["id"],
            "label": props[0]["label"],
            "assetCatalogName": props[0]["assetCatalogName"],
        },
        "sampleIngredient": {
            "id": ingredients[0]["id"],
            "label": ingredients[0]["label"],
            "assetCatalogName": ingredients[0]["assetCatalogName"],
        },
    }
    print(json.dumps(report, indent=2))
    if payload.get("assetCount") != len(assets):
        raise SystemExit("assetCount does not match assets array")
    if len(props) != 66 or len(ingredients) != 42:
        raise SystemExit("unexpected role counts")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

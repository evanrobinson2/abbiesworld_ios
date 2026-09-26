import Foundation
import UIKit

struct FurnitureItem: Identifiable {
    let id: String
    let name: String
    let category: String
    let assetName: String
    let description: String
    let tags: [String]
    let pixelWidth: Int
    let pixelHeight: Int
    let price: Int
    let defaultScale: Double
    let placementLayer: HomeLayout.PlacedDecoration.PlacementLayer

    init(
        id: String,
        name: String,
        category: String,
        assetName: String,
        description: String = "",
        tags: [String] = [],
        pixelWidth: Int = 0,
        pixelHeight: Int = 0,
        price: Int,
        defaultScale: Double,
        placementLayer: HomeLayout.PlacedDecoration.PlacementLayer
    ) {
        self.id = id
        self.name = name
        self.category = category
        self.assetName = assetName
        self.description = description
        self.tags = tags
        self.pixelWidth = pixelWidth
        self.pixelHeight = pixelHeight
        _ = price
        self.price = Self.ingredientCost
        self.defaultScale = defaultScale
        self.placementLayer = placementLayer
    }

    static let ingredientCost = 3
    static let abbieStarterBed = FurnitureItem(
        id: "furniture.abbieStarterBed",
        name: "Rainbow Dream Bed",
        category: "Beds",
        assetName: "world2_2008_furniture_abbieStarterBed",
        description: "Abbie's first cozy bed, with a rainbow canopy and patchwork blankets.",
        tags: ["abbie", "starter", "bed", "rainbow", "canopy"],
        pixelWidth: 1024,
        pixelHeight: 1024,
        price: ingredientCost,
        defaultScale: 0.95,
        placementLayer: .floor
    )
    static let aniStarterBed = FurnitureItem(
        id: "furniture.aniStarterBed",
        name: "Moonlit Unicorn Bed",
        category: "Beds",
        assetName: "world2_2009_furniture_aniStarterBed",
        description: "Ani's moonlit purple canopy bed with a rainbow quilt and unicorn pillows.",
        tags: ["ani", "starter", "bed", "moonlight", "unicorn", "canopy"],
        pixelWidth: 1024,
        pixelHeight: 1024,
        price: ingredientCost,
        defaultScale: 0.95,
        placementLayer: .floor
    )
    static let storeCatalog: [FurnitureItem] =
        [abbieStarterBed, aniStarterBed] + loadBundledCatalog()
    private static let placeableCategoryIDs: Set<String> = [
        "beds",
        "botanical-decor",
        "canopy-seating",
        "carts",
        "crafting",
        "hanging-decor",
        "hanging-seating",
        "lighting",
        "play-stages",
        "rugs",
        "seating",
        "shelving",
        "storage",
    ]

    private static let fallbackCatalog: [FurnitureItem] = [
        FurnitureItem(
            id: "crk-s1-01-forest-canopy-bed",
            name: "Forest Canopy Bed",
            category: "Beds",
            assetName: "cozy_room_s1_01_forest_canopy_bed",
            price: 5,
            defaultScale: 0.9,
            placementLayer: .floor
        ),
        FurnitureItem(
            id: "crk-s1-03-twilight-canopy-chair",
            name: "Twilight Canopy Chair",
            category: "Seats",
            assetName: "cozy_room_s1_03_twilight_canopy_chair",
            price: 4,
            defaultScale: 0.8,
            placementLayer: .floor
        ),
        FurnitureItem(
            id: "crk-s1-04-orchard-lantern-tree",
            name: "Orchard Lantern Tree",
            category: "Lights",
            assetName: "cozy_room_s1_04_orchard_lantern_tree",
            price: 3,
            defaultScale: 0.78,
            placementLayer: .floor
        ),
        FurnitureItem(
            id: "crk-s1-05-cookie-flower-rug",
            name: "Cookie Flower Rug",
            category: "Rugs",
            assetName: "cozy_room_s1_05_cookie_flower_rug",
            price: 2,
            defaultScale: 0.8,
            placementLayer: .floor
        ),
        FurnitureItem(
            id: "crk-s1-07-patchwork-cottage-bookshelf",
            name: "Cottage Bookshelf",
            category: "Storage",
            assetName: "cozy_room_s1_07_patchwork_cottage_bookshelf",
            price: 4,
            defaultScale: 0.8,
            placementLayer: .floor
        ),
        FurnitureItem(
            id: "crk-s1-09-rosebud-wardrobe",
            name: "Rosebud Wardrobe",
            category: "Storage",
            assetName: "cozy_room_s1_09_rosebud_wardrobe",
            price: 5,
            defaultScale: 0.85,
            placementLayer: .floor
        ),
        FurnitureItem(
            id: "crk-s2-10-painters-table",
            name: "Painter's Table",
            category: "Tables",
            assetName: "cozy_room_s2_10_painters_table",
            price: 4,
            defaultScale: 0.8,
            placementLayer: .floor
        ),
        FurnitureItem(
            id: "crk-s2-11-mint-mushroom-stool",
            name: "Mint Mushroom Stool",
            category: "Seats",
            assetName: "cozy_room_s2_11_mint_mushroom_stool",
            price: 2,
            defaultScale: 0.8,
            placementLayer: .floor
        ),
        FurnitureItem(
            id: "crk-s3-08-star-moon-pendant-pair",
            name: "Star and Moon Pendants",
            category: "Hanging",
            assetName: "cozy_room_s3_08_star_moon_pendant_pair",
            price: 2,
            defaultScale: 0.9,
            placementLayer: .wall
        ),
        FurnitureItem(
            id: "crk-s3-15-ribbon-art-table",
            name: "Ribbon Art Table",
            category: "Tables",
            assetName: "cozy_room_s3_15_ribbon_art_table",
            price: 4,
            defaultScale: 0.85,
            placementLayer: .floor
        ),
        FurnitureItem(
            id: "crk-s3-18-sugar-vine-plant",
            name: "Sugar Vine Plant",
            category: "Plants",
            assetName: "cozy_room_s3_18_sugar_vine_plant",
            price: 2,
            defaultScale: 0.8,
            placementLayer: .floor
        ),
        FurnitureItem(
            id: "crk-s4-11-mushroom-table-set",
            name: "Mushroom Table Set",
            category: "Tables",
            assetName: "cozy_room_s4_11_mushroom_table_set",
            price: 4,
            defaultScale: 0.85,
            placementLayer: .floor
        ),
    ]

    static func item(id: String) -> FurnitureItem? {
        storeCatalog.first { $0.id == id }
    }

    private static func loadBundledCatalog() -> [FurnitureItem] {
        guard let data = NSDataAsset(name: "cozy_room_asset_manifest")?.data,
              let manifest = try? JSONDecoder().decode(CozyRoomManifest.self, from: data),
              manifest.assetCount == manifest.assets.count,
              !manifest.assets.isEmpty else {
            assertionFailure("Bundled Cozy Room manifest is missing or invalid")
            return fallbackCatalog
        }

        let placeableAssets = manifest.assets.filter {
            placeableCategoryIDs.contains($0.category)
        }
        assert(
            placeableAssets.count == 66,
            "Expected 66 placeable Cozy Room props, found \(placeableAssets.count)"
        )

        return placeableAssets.map { asset in
            FurnitureItem(
                id: asset.id,
                name: asset.label,
                category: displayCategory(asset.category),
                assetName: asset.assetCatalogName,
                description: asset.description,
                tags: asset.tags,
                pixelWidth: asset.pixelSize.width,
                pixelHeight: asset.pixelSize.height,
                price: price(for: asset.category),
                defaultScale: defaultScale(for: asset.category),
                placementLayer: placementLayer(for: asset.category)
            )
        }
    }

    private static func displayCategory(_ category: String) -> String {
        switch category {
        case "beds": return "Beds"
        case "botanical-decor": return "Plants"
        case "canopy-seating": return "Canopy Seats"
        case "carts": return "Carts"
        case "crafting": return "Crafting"
        case "hanging-decor": return "Hanging"
        case "hanging-seating": return "Hanging Seats"
        case "lighting": return "Lights"
        case "play-stages": return "Play Stages"
        case "rugs": return "Rugs"
        case "seating": return "Seats"
        case "shelving": return "Shelves"
        case "storage": return "Storage"
        default:
            return category
                .replacingOccurrences(of: "-", with: " ")
                .capitalized
        }
    }

    private static func price(for category: String) -> Int {
        _ = category
        return ingredientCost
    }

    private static func defaultScale(for category: String) -> Double {
        switch category {
        case "beds": return 0.9
        case "rugs", "hanging-decor": return 0.85
        default: return 0.8
        }
    }

    private static func placementLayer(
        for category: String
    ) -> HomeLayout.PlacedDecoration.PlacementLayer {
        category == "hanging-decor" ? .wall : .floor
    }
}

struct FurnitureMathChallenge: Equatable {
    let equation: String
    let answer: Int
    let choices: [Int]

    static let ageSixBank: [FurnitureMathChallenge] = [
        .init(equation: "2 + 3", answer: 5, choices: [4, 5, 6]),
        .init(equation: "5 − 2", answer: 3, choices: [2, 3, 4]),
        .init(equation: "4 + 4", answer: 8, choices: [7, 8, 9]),
        .init(equation: "9 − 3", answer: 6, choices: [5, 6, 7]),
        .init(equation: "1 + 6", answer: 7, choices: [6, 7, 8]),
        .init(equation: "10 − 4", answer: 6, choices: [4, 5, 6]),
        .init(equation: "3 + 6", answer: 9, choices: [7, 8, 9]),
        .init(equation: "8 − 5", answer: 3, choices: [2, 3, 4]),
    ]
}

struct FurnitureStarterPack {
    let owner: PlayerId
    let title: String
    let items: [FurnitureItem]

    var milestoneID: String {
        "treehouse.starterPack.\(owner.rawValue).v1"
    }

    static func pack(for owner: PlayerId) -> FurnitureStarterPack {
        let itemIDs: [String]
        let title: String
        switch owner {
        case .abbie:
            title = "Abbie's Rainbow Room Pack"
            itemIDs = [
                FurnitureItem.abbieStarterBed.id,
                "crk-s1-05-cookie-flower-rug",
                "crk-s1-09-rosebud-wardrobe",
                "crk-s2-10-painters-table",
                "crk-s3-18-sugar-vine-plant",
            ]
        case .ani:
            title = "Ani's Moonlight Room Pack"
            itemIDs = [
                FurnitureItem.aniStarterBed.id,
                "crk-s1-03-twilight-canopy-chair",
                "crk-s1-07-patchwork-cottage-bookshelf",
                "crk-s3-08-star-moon-pendant-pair",
                "crk-s4-11-mushroom-table-set",
            ]
        case .evan:
            title = "Evan's Workshop Pack"
            itemIDs = [
                FurnitureItem.abbieStarterBed.id,
                "crk-s1-05-cookie-flower-rug",
                "crk-s1-09-rosebud-wardrobe",
                "crk-s2-10-painters-table",
                "crk-s3-18-sugar-vine-plant",
            ]
        }
        var items: [FurnitureItem] = []
        for itemID in itemIDs {
            if let item = FurnitureItem.item(id: itemID) {
                items.append(item)
            }
        }
        assert(items.count == 5, "Expected five items in \(owner.displayName)'s starter pack")
        return FurnitureStarterPack(owner: owner, title: title, items: items)
    }
}

private struct CozyRoomManifest: Decodable {
    let assetCount: Int
    let assets: [CozyRoomManifestAsset]
}

private struct CozyRoomManifestAsset: Decodable {
    let id: String
    let assetCatalogName: String
    let category: String
    let label: String
    let description: String
    let tags: [String]
    let pixelSize: PixelSize

    struct PixelSize: Decodable {
        let width: Int
        let height: Int
    }
}

extension PlayerState {
    var furnitureInventory: [DecorationInstance] {
        let generatedIDs = Set(availableGeneratedDecorations.map(\.id))
        let placedIDs = Set(homeLayout.placedDecorations.map(\.decorationInstanceId))
        return decorations.filter {
            placedIDs.contains($0.id)
                || $0.decorationId == DecorationInstance.starterJukeboxID
                || FurnitureItem.item(id: $0.decorationId) != nil
                || World2StoryDecoration.isStoryDecoration($0.decorationId)
                || generatedIDs.contains($0.decorationId)
        }
    }

    var unplacedFurnitureInventory: [DecorationInstance] {
        let placedIDs = Set(homeLayout.placedDecorations.map(\.decorationInstanceId))
        return furnitureInventory.filter { !placedIDs.contains($0.id) }
    }
}

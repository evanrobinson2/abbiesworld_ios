//
//  CozyRoomCatalog.swift
//  abbies.world.ios
//
//  Bundled cozy-room furniture and craft-ingredient catalog for Abbie's World.
//  Static assets only — never generated at runtime.
//

import Foundation
import UIKit

struct CozyRoomManifest: Codable {
    let assetCount: Int
    let assets: [CozyRoomAsset]
}

struct CozyRoomAsset: Codable, Identifiable, Hashable {
    let id: String
    let label: String
    let description: String
    let category: String
    let role: String
    let assetCatalogName: String
    let tags: [String]
    let pixelSize: PixelSize?

    struct PixelSize: Codable, Hashable {
        let width: Int
        let height: Int
    }

    var isPlaceableRoomProp: Bool { role == "placeable-room-prop" }
    var isFurnitureIngredient: Bool { role == "furniture-store-ingredient" }

    var gemPrice: Int {
        switch category {
        case "beds": return 12
        case "hanging-seating", "canopy-seating", "seating": return 8
        case "lighting", "hanging-decor": return 5
        case "rugs": return 4
        case "botanical-decor": return 3
        case "storage", "shelving": return 7
        case "play-stages", "carts", "crafting": return 6
        default: return 6
        }
    }
}

struct CozyRoomShopItem: Identifiable {
    let id: String
    let name: String
    let catalogName: String
    let category: String
    let price: Int
    let description: String
}

final class CozyRoomCatalog {
    static let shared = CozyRoomCatalog()

    private(set) var assets: [CozyRoomAsset] = []
    private var assetsById: [String: CozyRoomAsset] = [:]
    private var assetsByCatalogName: [String: CozyRoomAsset] = [:]

    var placeableProps: [CozyRoomAsset] {
        assets.filter(\.isPlaceableRoomProp)
    }

    var furnitureIngredients: [CozyRoomAsset] {
        assets.filter(\.isFurnitureIngredient)
    }

    var shopItems: [CozyRoomShopItem] {
        placeableProps.map { asset in
            CozyRoomShopItem(
                id: asset.id,
                name: asset.label,
                catalogName: asset.assetCatalogName,
                category: asset.category,
                price: asset.gemPrice,
                description: asset.description
            )
        }
        .sorted { lhs, rhs in
            if lhs.price == rhs.price {
                return lhs.name < rhs.name
            }
            return lhs.price < rhs.price
        }
    }

    var inspectSummary: String {
        let roleCounts = Dictionary(grouping: assets, by: \.role).mapValues(\.count)
        let categoryCounts = Dictionary(grouping: placeableProps, by: \.category)
            .mapValues(\.count)
            .sorted { $0.key < $1.key }
            .map { "\($0.key)=\($0.value)" }
            .joined(separator: ",")
        return [
            "loaded=\(!assets.isEmpty)",
            "assets=\(assets.count)",
            "roomProps=\(placeableProps.count)",
            "furnitureIngredients=\(furnitureIngredients.count)",
            "shopItems=\(shopItems.count)",
            "roles=\(roleCounts)",
            "propCategories=\(categoryCounts)"
        ].joined(separator: " ")
    }

    private init() {
        load()
    }

    func asset(id: String) -> CozyRoomAsset? {
        assetsById[id]
    }

    func asset(catalogName: String) -> CozyRoomAsset? {
        assetsByCatalogName[catalogName]
    }

    func asset(forDecorationId decorationId: String) -> CozyRoomAsset? {
        assetsById[decorationId] ?? assetsByCatalogName[decorationId]
    }

    private func load() {
        let data: Data?
        if let dataAsset = NSDataAsset(name: "cozy_room_asset_manifest") {
            data = dataAsset.data
        } else if let url = Bundle.main.url(forResource: "cozy_room_asset_manifest", withExtension: "json") {
            data = try? Data(contentsOf: url)
        } else {
            data = nil
        }

        guard let data else {
            print("⚠️ CozyRoomCatalog: bundled manifest not found")
            return
        }

        do {
            let manifest = try JSONDecoder().decode(CozyRoomManifest.self, from: data)
            assets = manifest.assets
            assetsById = Dictionary(uniqueKeysWithValues: manifest.assets.map { ($0.id, $0) })
            assetsByCatalogName = Dictionary(uniqueKeysWithValues: manifest.assets.map { ($0.assetCatalogName, $0) })
            print("🏡 CozyRoomCatalog: \(inspectSummary)")
        } catch {
            print("❌ CozyRoomCatalog: failed to decode manifest: \(error)")
        }
    }
}

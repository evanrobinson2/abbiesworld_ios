//
//  World2ConstructionArt.swift
//  abbies.world.ios
//
//  Sole local world art the game ships. Asset catalog first, then the
//  Resources/Placeholders copies, then the invent stand-in pack.
//

import UIKit

enum World2ConstructionArt {
    static let sceneCatalogName = "under_construction_scene"
    static let poiCatalogName = "under_construction_poi"
    static let aliasCatalogName = "under_construction"

    static func image(forSemantic semanticName: String) -> UIImage? {
        let id = semanticName.lowercased()
        let wantsPOI = id.hasPrefix("poi.")
            || id.hasPrefix("decoration.")
            || id.contains("portal")
        if wantsPOI {
            return load(named: poiCatalogName)
                ?? load(named: aliasCatalogName)
                ?? World2PlaceholderPack.image(for: .poi)
                ?? World2PlaceholderPack.image(for: .scene)
        }
        return load(named: sceneCatalogName)
            ?? load(named: aliasCatalogName)
            ?? World2PlaceholderPack.image(for: .scene)
            ?? World2PlaceholderPack.image(for: .poi)
    }

    static func load(named name: String) -> UIImage? {
        if let image = UIImage(named: name) {
            return image
        }
        let subdirectories = [
            "Resources/Placeholders",
            "Placeholders",
            nil as String?,
        ]
        for subdirectory in subdirectories {
            if let url = Bundle.main.url(
                forResource: name,
                withExtension: "png",
                subdirectory: subdirectory
            ), let image = UIImage(contentsOfFile: url.path) {
                return image
            }
        }
        return nil
    }
}

//
//  World2WorldUpdate.swift
//  abbies.world.ios
//
//  A newer /worlds/current revision is an Accept, not a silent map swap
//  and not a restart. Unseen places keep a NEW badge until they are seen.
//

import Foundation

struct World2PlayableSnapshot: Equatable {
    struct Scene: Equatable {
        var name: String
        var backgroundAsset: String
        var poiIDs: Set<String>
    }

    var revision: Int
    var scenes: [String: Scene]
    var places: [String: String]

    static let empty = World2PlayableSnapshot(revision: 0, scenes: [:], places: [:])

    init(revision: Int, scenes: [String: Scene], places: [String: String]) {
        self.revision = revision
        self.scenes = scenes
        self.places = places
    }

    init(document: World2WorldDocument) {
        revision = document.revision
        scenes = Dictionary(uniqueKeysWithValues: document.scenes.map { id, scene in
            (
                id,
                Scene(
                    name: scene.name,
                    backgroundAsset: scene.backgroundAsset,
                    poiIDs: Set(scene.poiInstances.map(\.id))
                )
            )
        })
        places = Dictionary(uniqueKeysWithValues: (document.places ?? []).map { ($0.id, $0.name) })
    }

    func title(forPOI id: String) -> String {
        if let name = places[id], !name.isEmpty { return name }
        if let tail = id.split(separator: ".").last, !tail.isEmpty {
            return String(tail)
        }
        return id
    }
}

struct World2WorldUpdateSummary: Equatable, Identifiable {
    let fromRevision: Int
    let toRevision: Int
    let addedSceneNames: [String]
    let addedPlaceNames: [String]
    let redrawnSceneNames: [String]
    let removedPlaceNames: [String]
    let unseenIDs: Set<String>

    var id: Int { toRevision }

    var headline: String {
        if !addedSceneNames.isEmpty { return "New lands!" }
        if !addedPlaceNames.isEmpty { return "New places!" }
        if !redrawnSceneNames.isEmpty { return "New pictures!" }
        return "The map changed!"
    }

    var lines: [String] {
        var rows: [String] = []
        rows.append(contentsOf: addedSceneNames.prefix(4).map { "New land: \($0)" })
        rows.append(contentsOf: addedPlaceNames.prefix(4).map { "New place: \($0)" })
        rows.append(contentsOf: redrawnSceneNames.prefix(3).map { "New picture for \($0)" })
        if rows.isEmpty {
            rows.append("The layout got an update.")
        }
        return Array(rows.prefix(6))
    }

    static func diff(
        from old: World2PlayableSnapshot,
        to new: World2PlayableSnapshot
    ) -> World2WorldUpdateSummary {
        let addedScenes = new.scenes.keys.filter { old.scenes[$0] == nil }.sorted()
        let addedPlaces = new.places.keys.filter { old.places[$0] == nil }.sorted()
        let removedPlaces = old.places.keys.filter { new.places[$0] == nil }.sorted()
        let redrawn = new.scenes.keys.filter { id in
            guard let before = old.scenes[id], let after = new.scenes[id] else { return false }
            return before.backgroundAsset != after.backgroundAsset
                && !after.backgroundAsset.isEmpty
        }.sorted()

        var placeNames = addedPlaces.map { new.title(forPOI: $0) }
        var addedPOIIDs: [String] = []
        for scene in new.scenes.values {
            for poiID in scene.poiIDs where old.scenes.values.allSatisfy({ !$0.poiIDs.contains(poiID) }) {
                addedPOIIDs.append(poiID)
                let name = new.title(forPOI: poiID)
                if !placeNames.contains(name) {
                    placeNames.append(name)
                }
            }
        }

        return World2WorldUpdateSummary(
            fromRevision: old.revision,
            toRevision: new.revision,
            addedSceneNames: addedScenes.compactMap { new.scenes[$0]?.name },
            addedPlaceNames: placeNames,
            redrawnSceneNames: redrawn.compactMap { new.scenes[$0]?.name },
            removedPlaceNames: removedPlaces.compactMap { old.places[$0] },
            unseenIDs: Set(addedScenes + addedPlaces + addedPOIIDs + redrawn)
        )
    }
}

struct World2WorldUpdateOffer: Equatable {
    let document: World2WorldDocument
    let summary: World2WorldUpdateSummary
}

extension World2WorldDocument: Equatable {
    static func == (lhs: World2WorldDocument, rhs: World2WorldDocument) -> Bool {
        lhs.revision == rhs.revision
            && lhs.activeSceneID == rhs.activeSceneID
            && lhs.scenes == rhs.scenes
            && (lhs.places ?? []) == (rhs.places ?? [])
            && (lhs.songs ?? []) == (rhs.songs ?? [])
            && (lhs.actors ?? []) == (rhs.actors ?? [])
            && lhs.skin == rhs.skin
    }
}

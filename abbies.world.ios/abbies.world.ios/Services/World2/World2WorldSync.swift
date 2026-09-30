//
//  World2WorldSync.swift
//  abbies.world.ios
//
//  A signed-in world is the Auth0 document plus the asset registry.
//  A new account starts empty. The compiled catalog is not a seed.
//

import Combine
import Foundation
import SwiftUI

struct World2ContentSkin: Codable, Equatable {
    var accent: String?
    var railBackground: String?
}

struct World2RemoteProp: Codable, Equatable, Identifiable {
    var id: String
    var name: String
    var image: String
}

struct World2RemoteRoom: Codable, Equatable, Identifiable {
    var id: String
    var name: String
    var image: String
}

struct World2RemotePlace: Codable, Equatable, Identifiable {
    var id: String
    var name: String
    var behavior: String
    var exteriorAsset: String
    var interiorAsset: String?
    var musicTrackID: String?
    var icon: String?
    var rooms: [World2RemoteRoom]?

    func archetype() -> World2POIArchetype? {
        guard let route = World2POIRoute.resolved(from: behavior) else { return nil }
        return World2POIArchetype(
            id: id,
            name: name,
            kind: .story,
            sizeClass: .medium,
            exteriorAsset: exteriorAsset,
            interiorAsset: rooms?.first?.image ?? interiorAsset,
            icon: icon,
            activityDescription: name,
            callToAction: {
                switch behavior {
                case "plink": return "Play Plink"
                case "pegMonastery": return "Enter Monastery"
                default: return "Open"
                }
            }(),
            musicTrackID: musicTrackID,
            contract: World2POIContract(route: route, completionMilestone: "remote.\(id)")
        )
    }
}

struct World2RemoteSong: Codable, Equatable, Identifiable {
    var id: String
    var name: String
    var file: String
}

struct World2RemoteActor: Codable, Equatable, Identifiable {
    var id: String
    var walk: String?
    var run: String?
    var idle: String?
}

struct World2AutoDecorScores: Codable, Equatable, Sendable {
    var type: Double?
    var quality: Double?
    var appropriateness: Double?
    var accuracy: Double?
}

struct World2AutoDecorItem: Codable, Equatable, Identifiable, Sendable {
    var id: String
    var label: String
    var objectFamilyID: String?
    var kept: Bool?
    var overall: Double?
    var scores: World2AutoDecorScores?
    var why: String?
}

struct World2AutoDecorPack: Codable, Equatable, Sendable {
    var jobId: String?
    var status: String?
    var plateURL: String?
    var plateSha256: String?
    var keptCount: Int?
    var culledCount: Int?
    var note: String?
    var items: [World2AutoDecorItem]?

    var keptLabels: [String] {
        (items ?? [])
            .filter { $0.kept != false }
            .map { World2ChromeContract.shortDecorationLabel($0.label) }
    }
}

struct World2CreativeSceneBucket: Codable, Equatable, Sendable {
    var autoDecor: World2AutoDecorPack?
}

struct World2CreativeDocument: Codable, Equatable, Sendable {
    var scenes: [String: World2CreativeSceneBucket]?
    var lore: String?
}

struct World2WorldDocument: Codable {
    var schemaVersion: Int
    var revision: Int
    var scenes: [String: World2SceneDefinition]
    var players: [String: PlayerState]
    var skin: World2ContentSkin?
    var props: [World2RemoteProp]?
    var places: [World2RemotePlace]?
    var songs: [World2RemoteSong]?
    var actors: [World2RemoteActor]?
    var activeSceneID: String?
    /// Studio creative trail + autoDecor packs. Optional — older worlds omit it.
    var creative: World2CreativeDocument?

    static func decode(_ data: Data) throws -> World2WorldDocument {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom(World2JSONDates.decode)
        return try decoder.decode(World2WorldDocument.self, from: data)
    }

    static func encodePut(
        _ document: World2WorldDocument,
        expectedRevision: Int
    ) throws -> Data {
        struct Payload: Encodable {
            var schemaVersion: Int
            var expectedRevision: Int
            var scenes: [String: World2SceneDefinition]
            var players: [String: PlayerState]
            var skin: World2ContentSkin?
            var props: [World2RemoteProp]?
            var places: [World2RemotePlace]?
            var songs: [World2RemoteSong]?
            var actors: [World2RemoteActor]?
            var activeSceneID: String?
            var creative: World2CreativeDocument?
        }
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = [.sortedKeys]
        return try encoder.encode(
            Payload(
                schemaVersion: document.schemaVersion,
                expectedRevision: expectedRevision,
                scenes: document.scenes,
                players: document.players,
                skin: document.skin,
                props: document.props,
                places: document.places,
                songs: document.songs,
                actors: document.actors,
                activeSceneID: document.activeSceneID,
                creative: document.creative
            )
        )
    }
}

@MainActor
final class World2WorldSync: ObservableObject {
    static let shared = World2WorldSync()
    nonisolated let objectWillChange = ObservableObjectPublisher()

    private static let authorityKey = "world2.world.usesServerDocument"
    private static let announcedRevisionKey = "world2.world.lastAnnouncedRevision"
    private static let unseenIDsKey = "world2.world.unseenIDs"
    private static let noticesSuppressedKey = "world2.world.noticesSuppressed"

    @Published private(set) var revision = 0
    @Published private(set) var skin = World2ContentSkin()
    @Published private(set) var props: [World2RemoteProp] = []
    @Published private(set) var places: [World2RemotePlace] = []
    @Published private(set) var songs: [World2RemoteSong] = []
    @Published private(set) var actors: [World2RemoteActor] = []
    @Published private(set) var creative: World2CreativeDocument?
    @Published private(set) var activeSceneID: String?
    @Published private(set) var usesServerDocument = false
    @Published private(set) var lastError: String?
    /// Bumped at the end of a successful apply so play can land on the new document.
    @Published private(set) var documentGeneration = 0
    @Published private(set) var pendingOffer: World2WorldUpdateOffer?
    @Published private(set) var whatsNew: World2WorldUpdateSummary?
    @Published private(set) var unseenIDs: Set<String> = []
    @Published private(set) var noticesSuppressed = false

    private var pushTask: Task<Void, Never>?
    private var watchTask: Task<Void, Never>?
    private var checkTask: Task<Void, Never>?
    private var applyingRemote = false

    private var lastAnnouncedRevision: Int {
        get {
            guard !Self.runningTests else { return announcedRevisionForTests }
            return UserDefaults.standard.integer(forKey: Self.announcedRevisionKey)
        }
        set {
            if Self.runningTests {
                announcedRevisionForTests = newValue
                return
            }
            UserDefaults.standard.set(newValue, forKey: Self.announcedRevisionKey)
        }
    }

    private var announcedRevisionForTests = 0

    private init() {
        if !Self.runningTests {
            usesServerDocument = UserDefaults.standard.bool(forKey: Self.authorityKey)
            noticesSuppressed = UserDefaults.standard.bool(forKey: Self.noticesSuppressedKey)
            unseenIDs = Self.loadUnseenIDs()
        }
    }

    func pull() async {
        guard !AuthenticationService.shared.shouldSkipAuthForAutomation else { return }
        guard let token = await AuthenticationService.shared.accessToken() else { return }
        // Signed in means the compiled catalog is not playable, even before bytes arrive.
        setAuthority(true)
        do {
            if let remote = try await HouseholdAPIClient.shared.fetchWorld(accessToken: token) {
                apply(remote, source: .launchPull)
                World2Diagnostics.log(
                    "world_pulled",
                    ["revision": String(remote.revision), "scenes": String(remote.scenes.count)]
                )
            } else {
                try await pushEmpty(token: token)
            }
        } catch {
            lastError = error.localizedDescription
            if sceneGraph.exportScenes().isEmpty {
                sceneGraph.importScenes([:])
            }
            World2Diagnostics.log("world_pull_failed", ["error": error.localizedDescription])
        }
    }

    func noteLocalChange() {
        guard !applyingRemote else { return }
        pushTask?.cancel()
        pushTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: 1_200_000_000)
            guard !Task.isCancelled else { return }
            await self?.push()
        }
    }

    /// No character models means no portrait and no sticks. Tap the places.
    var presentsParty: Bool {
        !usesServerDocument || !actors.isEmpty
    }

    func accentColor(_ fallback: Color) -> Color {
        guard usesServerDocument, let accent = skin.accent, let color = Color(worldHex: accent) else {
            return fallback
        }
        return color
    }

    func archetype(_ id: String) -> World2POIArchetype? {
        places.first { $0.id == id }?.archetype()
    }

    /// Engine clip names stay in code. The file they load is named by the document.
    func clipFile(engineName: String) -> String? {
        guard usesServerDocument else { return engineName }
        for actor in actors {
            let mapped: String?
            switch (actor.id, engineName) {
            case ("abbie", "abbie"): mapped = actor.walk
            case ("abbie", "abbie_run"): mapped = actor.run
            case ("abbie", "abbie_idle"): mapped = actor.idle
            case ("daddy", "daddy_walk"): mapped = actor.walk
            case ("daddy", "daddy_run"): mapped = actor.run
            case ("daddy", "daddy"): mapped = actor.idle ?? actor.walk
            default: mapped = nil
            }
            if let mapped, !mapped.isEmpty { return mapped }
        }
        return nil
    }

    func scenesToPush() -> [String: World2SceneDefinition] {
        sceneGraph.exportScenes()
    }

    func documentForNewAccount() -> World2WorldDocument {
        let home = World2SceneDefinition(
            id: "scene.home",
            name: "Abbie's World",
            summary: "A brand-new world. Invent the first place.",
            backgroundAsset: "",
            hardpoints: [],
            poiInstances: [],
            isMutableByPlayer: true,
            showsOpenHardpointsToPlayers: true,
            isDeveloperPlaceholder: true
        )
        return World2WorldDocument(
            schemaVersion: 1,
            revision: 0,
            scenes: [home.id: home],
            players: [:],
            skin: nil,
            props: [],
            places: [],
            songs: [],
            actors: [],
            activeSceneID: home.id,
            creative: nil
        )
    }

    func autoDecorPack(for sceneID: String) -> World2AutoDecorPack? {
        creative?.scenes?[sceneID]?.autoDecor
    }

    /// Studio-kept prop labels waiting to be cooked on device.
    func pendingAutoDecorLabels(for sceneID: String) -> [String] {
        guard let pack = autoDecorPack(for: sceneID),
              (pack.status == "ready" || pack.status == nil),
              let jobId = pack.jobId,
              !jobId.isEmpty
        else { return [] }
        let key = "world2.autodecor.cooked.\(jobId)"
        if UserDefaults.standard.bool(forKey: key) { return [] }
        let labels = pack.keptLabels
        return labels
    }

    func markAutoDecorCooked(_ pack: World2AutoDecorPack) {
        guard let jobId = pack.jobId, !jobId.isEmpty else { return }
        UserDefaults.standard.set(true, forKey: "world2.autodecor.cooked.\(jobId)")
    }

    func apply(_ document: World2WorldDocument, source: World2WorldApplySource = .silent) {
        let previous = playableSnapshot()
        let firstSighting = lastAnnouncedRevision == 0
        applyingRemote = true
        defer { applyingRemote = false }
        sceneGraph.importScenes(document.scenes)
        revision = document.revision
        skin = document.skin ?? World2ContentSkin()
        props = document.props ?? []
        places = (document.places ?? []).filter {
            $0.id != PeglinEdition.wreckPowerUpID
                && $0.id != "instance.peglin.powerUp"
                && !$0.id.contains("wreck.powerUp")
        }
        songs = document.songs ?? []
        actors = document.actors ?? []
        creative = document.creative
        activeSceneID = document.activeSceneID ?? document.scenes.keys.sorted().first
        setAuthority(true)
        if !document.players.isEmpty {
            PlayerStateService.shared.replaceStoredPlayers(document.players)
        }
        if !Self.runningTests {
            MusicService.shared.reloadContentPlaylist()
            documentGeneration += 1
            kickPendingAutoDecorPacks(in: document)
            AssetBootstrapService.shared.prefetchAssets(referencedBy: document)
        }
        switch source {
        case .silent, .acceptedOffer:
            break
        case .launchPull:
            if firstSighting {
                lastAnnouncedRevision = document.revision
            } else if document.revision > lastAnnouncedRevision {
                let summary = World2WorldUpdateSummary.diff(from: previous, to: playableSnapshot())
                rememberUnseen(summary.unseenIDs)
                if !noticesSuppressed {
                    whatsNew = summary
                } else {
                    lastAnnouncedRevision = document.revision
                }
            }
        }
    }

    /// Cook Studio autoDecor packs, and invent local packs for plated scenes
    /// that never got a Studio job (retroactive for worlds already in play).
    private func kickPendingAutoDecorPacks(in document: World2WorldDocument) {
        struct Job {
            let scene: World2SceneDefinition
            let labels: [String]
            let mark: () -> Void
        }
        var jobs: [Job] = []
        var claimed = Set<String>()
        let creativeScenes = document.creative?.scenes ?? [:]
        for (sceneID, bucket) in creativeScenes {
            guard let pack = bucket.autoDecor,
                  pack.status == "ready" || pack.status == nil,
                  !pack.keptLabels.isEmpty,
                  !pendingAutoDecorLabels(for: sceneID).isEmpty,
                  let scene = document.scenes[sceneID]
            else { continue }
            claimed.insert(sceneID)
            let capturedPack = pack
            jobs.append(Job(
                scene: scene,
                labels: pack.keptLabels,
                mark: { [weak self] in self?.markAutoDecorCooked(capturedPack) }
            ))
        }
        for (sceneID, scene) in document.scenes.sorted(by: { $0.key < $1.key }) {
            if claimed.contains(sceneID) { continue }
            let asset = scene.backgroundAsset.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !asset.isEmpty,
                  !asset.localizedCaseInsensitiveContains("under_construction"),
                  !scene.isDeveloperPlaceholder
            else { continue }
            let localKey = "world2.autodecor.local.\(sceneID).\(asset)"
            if UserDefaults.standard.bool(forKey: localKey) { continue }
            jobs.append(Job(
                scene: scene,
                labels: [],
                mark: { UserDefaults.standard.set(true, forKey: localKey) }
            ))
        }
        guard !jobs.isEmpty else { return }
        Task { @MainActor in
            for job in jobs {
                let plate = World2SceneBackdropStore.shared.image(forSceneID: job.scene.id)
                    ?? AssetBootstrapService.shared.image(for: job.scene.backgroundAsset)
                let result = await World2SceneDecorationInventService.shared.autoInventPack(
                    for: job.scene,
                    plate: plate,
                    labels: job.labels
                )
                if result != nil {
                    job.mark()
                }
            }
        }
    }

    func startRevisionWatch() {
        guard !Self.runningTests else { return }
        watchTask?.cancel()
        watchTask = Task { [weak self] in
            await World2NewBadgeArtwork.ensure()
            await self?.checkForNewerWorld()
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 15_000_000_000)
                guard !Task.isCancelled else { return }
                await self?.checkForNewerWorld()
            }
        }
    }

    func stopRevisionWatch() {
        watchTask?.cancel()
        watchTask = nil
        checkTask?.cancel()
        checkTask = nil
    }

    func checkForNewerWorld() async {
        guard !Self.runningTests else { return }
        guard !AuthenticationService.shared.shouldSkipAuthForAutomation else { return }
        guard usesServerDocument else { return }
        guard let token = await AuthenticationService.shared.accessToken() else { return }
        guard checkTask == nil else { return }
        let work = Task { @MainActor [weak self] in
            guard let self else { return }
            do {
                guard let remote = try await HouseholdAPIClient.shared.fetchWorld(accessToken: token) else {
                    return
                }
                self.considerRemote(remote)
            } catch {
                World2Diagnostics.log(
                    "world_revision_check_failed",
                    ["error": error.localizedDescription]
                )
            }
        }
        checkTask = work
        await work.value
        checkTask = nil
    }

    func acceptPendingWorld() -> World2WorldUpdateSummary? {
        guard let offer = pendingOffer else { return nil }
        apply(offer.document, source: .acceptedOffer)
        pendingOffer = nil
        rememberUnseen(offer.summary.unseenIDs)
        lastAnnouncedRevision = offer.document.revision
        whatsNew = nil
        World2Diagnostics.log(
            "world_update_accepted",
            ["revision": String(offer.document.revision)]
        )
        Task { await World2NewBadgeArtwork.ensure() }
        return offer.summary
    }

    func dismissWhatsNew() {
        if let revision = whatsNew?.toRevision {
            lastAnnouncedRevision = max(lastAnnouncedRevision, revision)
        } else {
            lastAnnouncedRevision = max(lastAnnouncedRevision, revision)
        }
        whatsNew = nil
        World2Diagnostics.log(
            "world_whats_new_dismissed",
            ["revision": String(lastAnnouncedRevision)]
        )
    }

    /// Accept always clears the modal — pending offer, what's-new sheet, or both.
    /// Advances the announced revision so launch/watch cannot immediately re-show it.
    @discardableResult
    func acknowledgeWorldNotices() -> World2WorldUpdateSummary? {
        let offeredRevision = pendingOffer?.document.revision
        let newsRevision = whatsNew?.toRevision
        let summary = acceptPendingWorld()
        whatsNew = nil
        pendingOffer = nil
        let floor = max(revision, offeredRevision ?? 0, newsRevision ?? 0)
        lastAnnouncedRevision = max(lastAnnouncedRevision, floor)
        World2Diagnostics.log(
            "world_notices_acknowledged",
            ["revision": String(lastAnnouncedRevision)]
        )
        return summary
    }

    func showsNewBadge(for id: String) -> Bool {
        !noticesSuppressed && unseenIDs.contains(id)
    }

    func markSeen(_ id: String) {
        guard unseenIDs.contains(id) else { return }
        unseenIDs.remove(id)
        persistUnseenIDs()
    }

    func setNoticesSuppressed(_ hidden: Bool) {
        noticesSuppressed = hidden
        if !Self.runningTests {
            UserDefaults.standard.set(hidden, forKey: Self.noticesSuppressedKey)
        }
        if hidden {
            whatsNew = nil
        }
    }

    private func rememberUnseen(_ ids: Set<String>) {
        guard !ids.isEmpty else { return }
        unseenIDs.formUnion(ids)
        persistUnseenIDs()
    }

    private func persistUnseenIDs() {
        guard !Self.runningTests else { return }
        UserDefaults.standard.set(Array(unseenIDs).sorted(), forKey: Self.unseenIDsKey)
    }

    private static func loadUnseenIDs() -> Set<String> {
        let values = UserDefaults.standard.array(forKey: unseenIDsKey) as? [String] ?? []
        return Set(values)
    }

    func playableSnapshot() -> World2PlayableSnapshot {
        World2PlayableSnapshot(
            revision: revision,
            scenes: Dictionary(uniqueKeysWithValues: sceneGraph.exportScenes().map { id, scene in
                (
                    id,
                    World2PlayableSnapshot.Scene(
                        name: scene.name,
                        backgroundAsset: scene.backgroundAsset,
                        poiIDs: Set(scene.poiInstances.map(\.id))
                    )
                )
            }),
            places: Dictionary(uniqueKeysWithValues: places.map { ($0.id, $0.name) })
        )
    }

    private func considerRemote(_ remote: World2WorldDocument) {
        guard remote.revision > revision else { return }
        if pendingOffer?.document.revision == remote.revision { return }
        let summary = World2WorldUpdateSummary.diff(
            from: playableSnapshot(),
            to: World2PlayableSnapshot(document: remote)
        )
        if noticesSuppressed {
            apply(remote, source: .acceptedOffer)
            rememberUnseen(summary.unseenIDs)
            lastAnnouncedRevision = remote.revision
            World2Diagnostics.log(
                "world_update_applied_quietly",
                ["revision": String(remote.revision)]
            )
            return
        }
        pendingOffer = World2WorldUpdateOffer(document: remote, summary: summary)
        World2Diagnostics.log(
            "world_update_offered",
            ["revision": String(remote.revision), "from": String(revision)]
        )
        Task { await World2NewBadgeArtwork.ensure() }
    }

    func resetForTests() {
        revision = 0
        skin = World2ContentSkin()
        props = []
        places = []
        songs = []
        actors = []
        creative = nil
        activeSceneID = nil
        usesServerDocument = false
        lastError = nil
        documentGeneration = 0
        pendingOffer = nil
        whatsNew = nil
        unseenIDs = []
        noticesSuppressed = false
        announcedRevisionForTests = 0
        stopRevisionWatch()
        UserDefaults.standard.removeObject(forKey: Self.authorityKey)
        UserDefaults.standard.removeObject(forKey: Self.announcedRevisionKey)
    }

    private func pushEmpty(token: String) async throws {
        let saved = try await HouseholdAPIClient.shared.putWorld(
            documentForNewAccount(),
            expectedRevision: 0,
            accessToken: token
        )
        apply(saved, source: .silent)
        World2Diagnostics.log("world_created_empty", ["revision": String(saved.revision)])
    }

    private var sceneGraph: World2SceneGraphStore {
        World2SceneGraphStoreHolder.store
    }

    private func push() async {
        guard usesServerDocument else { return }
        guard !applyingRemote else { return }
        guard let token = await AuthenticationService.shared.accessToken() else { return }
        let document = World2WorldDocument(
            schemaVersion: 1,
            revision: revision,
            scenes: scenesToPush(),
            players: PlayerStateService.shared.exportPlayers(),
            skin: skin,
            props: props,
            places: places,
            songs: songs,
            actors: actors,
            activeSceneID: activeSceneID,
            creative: creative
        )
        do {
            let saved = try await HouseholdAPIClient.shared.putWorld(
                document,
                expectedRevision: revision,
                accessToken: token
            )
            applyingRemote = true
            revision = saved.revision
            applyingRemote = false
            World2Diagnostics.log("world_pushed", ["revision": String(saved.revision)])
        } catch let error as HouseholdAPIError {
            if case .http(409, _) = error {
                await checkForNewerWorld()
            } else {
                lastError = error.localizedDescription
            }
        } catch {
            lastError = error.localizedDescription
        }
    }

    private func setAuthority(_ value: Bool) {
        usesServerDocument = value
        guard !Self.runningTests else { return }
        UserDefaults.standard.set(value, forKey: Self.authorityKey)
    }

    private static var runningTests: Bool {
        ProcessInfo.processInfo.environment["XCTestConfigurationFilePath"] != nil
    }
}

enum World2WorldApplySource {
    case launchPull
    case acceptedOffer
    case silent
}

enum World2SceneGraphStoreHolder {
    @MainActor static var store = World2SceneGraphStore()
}

enum World2JSONDates {
    static func decode(_ decoder: Decoder) throws -> Date {
        let container = try decoder.singleValueContainer()
        if let seconds = try? container.decode(Double.self) {
            return Date(timeIntervalSince1970: seconds > 10_000_000_000 ? seconds / 1000 : seconds)
        }
        guard let value = try? container.decode(String.self) else {
            return Date.distantPast
        }
        let fractional = ISO8601DateFormatter()
        fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = fractional.date(from: value) { return date }
        let basic = ISO8601DateFormatter()
        basic.formatOptions = [.withInternetDateTime]
        if let date = basic.date(from: value) { return date }
        return Date.distantPast
    }
}

extension Color {
    init?(worldHex: String) {
        var hex = worldHex.trimmingCharacters(in: .whitespacesAndNewlines)
        if hex.hasPrefix("#") { hex.removeFirst() }
        guard hex.count == 6, let value = Int(hex, radix: 16) else { return nil }
        let red = Double((value >> 16) & 0xFF) / 255
        let green = Double((value >> 8) & 0xFF) / 255
        let blue = Double(value & 0xFF) / 255
        self.init(red: red, green: green, blue: blue)
    }
}

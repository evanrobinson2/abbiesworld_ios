import Foundation
import CoreGraphics

/// Unlockable title plates + trophies for Marble Voyage (local, kid-facing meta).
enum MarbleVoyageTitlePlate: String, CaseIterable, Identifiable, Codable, Sendable {
    case skyDock
    case coralCliffs
    case pinkGrove
    case skyMeadow

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .skyDock: return "Sky Dock"
        case .coralCliffs: return "Coral Cliffs"
        case .pinkGrove: return "Pink Grove"
        case .skyMeadow: return "Sky Meadow"
        }
    }

    var blurb: String {
        switch self {
        case .skyDock: return "Home harbor · always yours"
        case .coralCliffs: return "Salmon cliffs · soft waterfall"
        case .pinkGrove: return "Blooming hills · tall pillars"
        case .skyMeadow: return "Floating isles · big shade tree"
        }
    }

    /// Bundled catalog imageset (nil = semantic fallback only).
    var catalogName: String {
        switch self {
        case .skyDock: return "world2_title_marbleVoyage"
        case .coralCliffs: return "world2_title_coralCliffs"
        case .pinkGrove: return "world2_title_pinkGrove"
        case .skyMeadow: return "world2_title_skyMeadow"
        }
    }

    var unlockHint: String {
        switch self {
        case .skyDock: return "Starter plate"
        case .coralCliffs: return "Opens with the voyage"
        case .pinkGrove: return "Clear 3 fights in one run"
        case .skyMeadow: return "Beat Bizarro Abbie · or Endless best 5"
        }
    }

    /// Subtle Ken Burns bias (normalized pan direction).
    var kenBurnsBias: (dx: CGFloat, dy: CGFloat) {
        switch self {
        case .skyDock: return (0.02, -0.015)
        case .coralCliffs: return (-0.025, 0.02)
        case .pinkGrove: return (0.018, -0.03)
        case .skyMeadow: return (-0.02, -0.018)
        }
    }
}

enum MarbleVoyageTrophy: String, CaseIterable, Identifiable, Codable, Sendable {
    case firstSpirit
    case blessingBell
    case threeClear
    case campaignCrown
    case bizarroMirror
    case endlessSailor
    case titleCollector

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .firstSpirit: return "First Spirit"
        case .blessingBell: return "Blessing Bell"
        case .threeClear: return "Triple Clear"
        case .campaignCrown: return "Campaign Crown"
        case .bizarroMirror: return "Bizarro Mirror"
        case .endlessSailor: return "Endless Sailor"
        case .titleCollector: return "Title Collector"
        }
    }

    var blurb: String {
        switch self {
        case .firstSpirit: return "Won your first plink fight"
        case .blessingBell: return "Found a heal blessing"
        case .threeClear: return "Cleared three fights in one voyage"
        case .campaignCrown: return "Finished the campaign chart"
        case .bizarroMirror: return "Beat Bizarro Abbie"
        case .endlessSailor: return "Endless best of 5+"
        case .titleCollector: return "Unlocked every title plate"
        }
    }

    var systemIcon: String {
        switch self {
        case .firstSpirit: return "flame.fill"
        case .blessingBell: return "bell.fill"
        case .threeClear: return "3.circle.fill"
        case .campaignCrown: return "crown.fill"
        case .bizarroMirror: return "person.fill.questionmark"
        case .endlessSailor: return "infinity"
        case .titleCollector: return "rectangle.stack.fill"
        }
    }
}

/// Persistent gallery progress (UserDefaults — no account).
struct MarbleVoyageGallery: Equatable, Sendable {
    var unlockedPlates: Set<String>
    var earnedTrophies: Set<String>
    /// Preferred plate for title (must be unlocked); nil = auto-slide all unlocked.
    var preferredPlateID: String?
    var lifetimeFightWins: Int
    var lifetimeHeals: Int
    var campaignClears: Int

    static let storageKey = "marbleVoyage.gallery.v1"

    static var starter: MarbleVoyageGallery {
        .init(
            // Sky Dock + Coral Cliffs so title already slides with Ken Burns on first launch.
            unlockedPlates: [
                MarbleVoyageTitlePlate.skyDock.rawValue,
                MarbleVoyageTitlePlate.coralCliffs.rawValue,
            ],
            earnedTrophies: [],
            preferredPlateID: nil,
            lifetimeFightWins: 0,
            lifetimeHeals: 0,
            campaignClears: 0
        )
    }

    static func load() -> MarbleVoyageGallery {
        guard let data = UserDefaults.standard.data(forKey: storageKey),
              let decoded = try? JSONDecoder().decode(Persisted.self, from: data)
        else { return .starter }
        return decoded.asGallery
    }

    func save() {
        let payload = Persisted(from: self)
        if let data = try? JSONEncoder().encode(payload) {
            UserDefaults.standard.set(data, forKey: Self.storageKey)
        }
    }

    func isPlateUnlocked(_ plate: MarbleVoyageTitlePlate) -> Bool {
        unlockedPlates.contains(plate.rawValue)
    }

    func isTrophyEarned(_ trophy: MarbleVoyageTrophy) -> Bool {
        earnedTrophies.contains(trophy.rawValue)
    }

    var unlockedTitlePlates: [MarbleVoyageTitlePlate] {
        MarbleVoyageTitlePlate.allCases.filter { isPlateUnlocked($0) }
    }

    /// Plates the title stage may slide through.
    var carouselPlates: [MarbleVoyageTitlePlate] {
        if let preferred = preferredPlateID,
           let plate = MarbleVoyageTitlePlate(rawValue: preferred),
           isPlateUnlocked(plate) {
            return [plate]
        }
        let unlocked = unlockedTitlePlates
        return unlocked.isEmpty ? [.skyDock] : unlocked
    }

    mutating func unlockPlate(_ plate: MarbleVoyageTitlePlate) -> Bool {
        guard !unlockedPlates.contains(plate.rawValue) else { return false }
        unlockedPlates.insert(plate.rawValue)
        return true
    }

    mutating func awardTrophy(_ trophy: MarbleVoyageTrophy) -> Bool {
        guard !earnedTrophies.contains(trophy.rawValue) else { return false }
        earnedTrophies.insert(trophy.rawValue)
        return true
    }

    /// Apply run outcome; returns newly unlocked plates + trophies for toast UI.
    mutating func recordFightWin(isBoss: Bool, enemyIsBizarro: Bool, fightsClearedAfter: Int, mode: MarbleVoyageMode) -> GalleryUnlockPulse {
        var pulse = GalleryUnlockPulse()
        lifetimeFightWins += 1
        if lifetimeFightWins == 1 { pulse.trophies += awardIfNew(.firstSpirit) }
        if fightsClearedAfter >= 3 { pulse.trophies += awardIfNew(.threeClear) }
        if fightsClearedAfter >= 3, unlockPlate(.pinkGrove) { pulse.plates.append(.pinkGrove) }
        if isBoss {
            if mode == .campaign {
                campaignClears += 1
                pulse.trophies += awardIfNew(.campaignCrown)
            }
            if enemyIsBizarro {
                pulse.trophies += awardIfNew(.bizarroMirror)
                if unlockPlate(.skyMeadow) { pulse.plates.append(.skyMeadow) }
            }
        }
        finalizeTitleCollector(&pulse)
        save()
        return pulse
    }

    mutating func recordHealEvent() -> GalleryUnlockPulse {
        var pulse = GalleryUnlockPulse()
        lifetimeHeals += 1
        if lifetimeHeals == 1 { pulse.trophies += awardIfNew(.blessingBell) }
        save()
        return pulse
    }

    mutating func recordEndlessBest(_ best: Int) -> GalleryUnlockPulse {
        var pulse = GalleryUnlockPulse()
        if best >= 5 {
            pulse.trophies += awardIfNew(.endlessSailor)
            if unlockPlate(.skyMeadow) { pulse.plates.append(.skyMeadow) }
        }
        finalizeTitleCollector(&pulse)
        save()
        return pulse
    }

    private mutating func awardIfNew(_ trophy: MarbleVoyageTrophy) -> [MarbleVoyageTrophy] {
        awardTrophy(trophy) ? [trophy] : []
    }

    private mutating func finalizeTitleCollector(_ pulse: inout GalleryUnlockPulse) {
        if unlockedPlates.count >= MarbleVoyageTitlePlate.allCases.count {
            pulse.trophies += awardIfNew(.titleCollector)
        }
    }

    private struct Persisted: Codable {
        var unlockedPlates: [String]
        var earnedTrophies: [String]
        var preferredPlateID: String?
        var lifetimeFightWins: Int
        var lifetimeHeals: Int
        var campaignClears: Int

        init(from gallery: MarbleVoyageGallery) {
            unlockedPlates = Array(gallery.unlockedPlates).sorted()
            earnedTrophies = Array(gallery.earnedTrophies).sorted()
            preferredPlateID = gallery.preferredPlateID
            lifetimeFightWins = gallery.lifetimeFightWins
            lifetimeHeals = gallery.lifetimeHeals
            campaignClears = gallery.campaignClears
        }

        var asGallery: MarbleVoyageGallery {
            .init(
                unlockedPlates: Set(unlockedPlates).union([
                    MarbleVoyageTitlePlate.skyDock.rawValue,
                    MarbleVoyageTitlePlate.coralCliffs.rawValue,
                ]),
                earnedTrophies: Set(earnedTrophies),
                preferredPlateID: preferredPlateID,
                lifetimeFightWins: lifetimeFightWins,
                lifetimeHeals: lifetimeHeals,
                campaignClears: campaignClears
            )
        }
    }
}

struct GalleryUnlockPulse: Equatable, Sendable {
    var plates: [MarbleVoyageTitlePlate] = []
    var trophies: [MarbleVoyageTrophy] = []

    var isEmpty: Bool { plates.isEmpty && trophies.isEmpty }

    var summaryLine: String? {
        if let plate = plates.first {
            return "Unlocked title: \(plate.displayName)"
        }
        if let trophy = trophies.first {
            return "Trophy: \(trophy.displayName)"
        }
        return nil
    }
}

import Combine
import CryptoKit
import Foundation

/// Grown-up switch for the debug QR. Off by default — enable in Settings.
/// `-world2DebugQR` forces it on; `-world2NoDebugQR` forces it off.
@MainActor
final class World2DebugOverlaySettings: ObservableObject {
    static let shared = World2DebugOverlaySettings()
    nonisolated static let defaultsKey = "world2.debugQR.enabled"
    nonisolated static let launchOn = "-world2DebugQR"
    nonisolated static let launchOff = "-world2NoDebugQR"

    @Published var isEnabled: Bool {
        didSet {
            guard isEnabled != oldValue else { return }
            UserDefaults.standard.set(isEnabled, forKey: Self.defaultsKey)
        }
    }

    /// Release builds ignore scanned tickets unless the overlay itself is on.
    var canApplyTickets: Bool {
        #if DEBUG
        return true
        #else
        return isEnabled
        #endif
    }

    private init() {
        // Always default off — grown-ups opt in via Settings / Screen QR.
        isEnabled = Self.resolve(defaultWhenUnset: false)
    }

    nonisolated static func resolve(
        arguments: [String] = ProcessInfo.processInfo.arguments,
        defaults: UserDefaults = .standard,
        defaultWhenUnset: Bool
    ) -> Bool {
        if arguments.contains(launchOff) { return false }
        if arguments.contains(launchOn) { return true }
        if defaults.object(forKey: defaultsKey) != nil {
            return defaults.bool(forKey: defaultsKey)
        }
        return defaultWhenUnset
    }
}

struct World2DebugPresentationRequest: Equatable {
    let id = UUID()
    let code: String?
}

/// Page pointer plus a short diagnostic snapshot. The QR holds this, not the save.
struct World2DebugTicket: Equatable {
    static let scheme = "abbiesworld"
    static let host = "d"
    static let version = 1

    var screenCode: String
    var routeID: String?
    var playerSlot: String?
    var worldCode: String?
    var sceneID: String?
    var presentation: String?
    var inspectedPOI: String?
    var build: String
    /// Unique to the compiled binary. A new build writes a new stamp, so the QR changes.
    var buildStamp: String?
    var gems: Int
    var quest: String?
    var error: String?
    var issuedAt: Date
    var fingerprint: String

    var screen: World2Screen? {
        World2Screen.from(debugCode: screenCode, routeID: routeID)
    }

    var playerID: PlayerId? {
        World2DebugTicketCodec.playerID(from: playerSlot)
    }

    var worldID: WorldId? {
        World2DebugTicketCodec.worldID(from: worldCode)
    }

    var token: String {
        var parts = ["s=\(screenCode)"]
        if let routeID, !routeID.isEmpty { parts.append("i=\(routeID)") }
        if let playerSlot, !playerSlot.isEmpty { parts.append("p=\(playerSlot)") }
        if let worldCode, !worldCode.isEmpty { parts.append("w=\(worldCode)") }
        if let sceneID, !sceneID.isEmpty { parts.append("c=\(sceneID)") }
        if let presentation, !presentation.isEmpty { parts.append("m=\(presentation)") }
        if let error, !error.isEmpty { parts.append("e=\(error)") }
        parts.append("#\(fingerprint)")
        return parts.joined(separator: " ")
    }
}

struct World2DebugReport: Equatable {
    var screen: World2Screen
    var playerID: PlayerId?
    var worldID: WorldId?
    var sceneID: String
    var inspectedPOI: String?
    var gems: Int
    var quest: String?
    var error: String?
    var toast: String?
    var milestones: [String]
    var completedPOIs: [String]
    var placeCount: Int
    var createdSceneCount: Int
    var inventoryCount: Int
    var deckCount: Int
    var presentations: [String]
    var lastEvent: String?
    var lastEventDetails: String?
}

struct World2DebugSnapshot: Codable, Equatable {
    var summary: String
    var ticketURL: String
    var screen: String
    var screenCode: String
    var routeID: String?
    var player: String?
    var world: String?
    var sceneID: String?
    var presentation: String?
    var presentations: [String]
    var inspectedPOI: String?
    var build: String
    var os: String
    var device: String
    var gems: Int
    var quest: String?
    var error: String?
    var toast: String?
    var milestones: [String]
    var completedPOIs: [String]
    var placeCount: Int
    var createdSceneCount: Int
    var inventoryCount: Int
    var deckCount: Int
    var lastEvent: String?
    var lastEventDetails: String?
    var issuedAt: Date
    var fingerprint: String
}

enum World2DebugTicketCodec {
    static let knownPresentations: Set<String> = [
        "settings", "music", "games", "waypoint", "goon", "carver", "picnic", "poi"
    ]

    static func make(
        from report: World2DebugReport,
        issuedAt: Date = Date(),
        build: String = World2DebugDevice.build,
        buildStamp: String? = World2DebugDevice.buildStamp
    ) -> World2DebugTicket {
        let sceneID = encodedSceneID(for: report)
        let presentation = report.presentations.first { knownPresentations.contains($0) }
        let error = compact(report.error ?? report.toast, limit: 48)
        let quest = compact(report.quest, limit: 64)
        let issued = Date(timeIntervalSince1970: issuedAt.timeIntervalSince1970.rounded(.down))
        let player: String? = report.playerID.map { Self.playerSlot(for: $0) }
        let world: String? = report.worldID.map { Self.worldCode(for: $0) }
        let fingerprintValue = fingerprint(
            screenCode: report.screen.debugCode,
            routeID: report.screen.debugRouteID,
            playerSlot: player,
            worldCode: world,
            sceneID: sceneID,
            presentation: presentation,
            inspectedPOI: report.inspectedPOI,
            gems: report.gems,
            quest: quest,
            error: error,
            issuedAt: issued,
            buildStamp: buildStamp
        )
        return World2DebugTicket(
            screenCode: report.screen.debugCode,
            routeID: report.screen.debugRouteID,
            playerSlot: player,
            worldCode: world,
            sceneID: sceneID,
            presentation: presentation,
            inspectedPOI: report.inspectedPOI,
            build: build,
            buildStamp: buildStamp,
            gems: report.gems,
            quest: quest,
            error: error,
            issuedAt: issued,
            fingerprint: fingerprintValue
        )
    }

    static func urlString(for ticket: World2DebugTicket) -> String {
        var items: [URLQueryItem] = [
            URLQueryItem(name: "v", value: "\(World2DebugTicket.version)"),
            URLQueryItem(name: "s", value: ticket.screenCode)
        ]
        append(&items, "i", ticket.routeID)
        append(&items, "p", ticket.playerSlot)
        append(&items, "w", ticket.worldCode)
        append(&items, "c", ticket.sceneID)
        append(&items, "m", ticket.presentation)
        append(&items, "o", ticket.inspectedPOI)
        append(&items, "b", ticket.build)
        append(&items, "bt", ticket.buildStamp)
        items.append(URLQueryItem(name: "g", value: "\(ticket.gems)"))
        append(&items, "q", ticket.quest)
        append(&items, "e", ticket.error)
        items.append(
            URLQueryItem(name: "t", value: "\(Int(ticket.issuedAt.timeIntervalSince1970))")
        )
        items.append(URLQueryItem(name: "f", value: ticket.fingerprint))

        var components = URLComponents()
        components.scheme = World2DebugTicket.scheme
        components.host = World2DebugTicket.host
        components.queryItems = items
        return components.string ?? "\(World2DebugTicket.scheme)://\(World2DebugTicket.host)"
    }

    static func decode(_ raw: String) -> World2DebugTicket? {
        guard let components = URLComponents(string: raw),
              components.scheme == World2DebugTicket.scheme,
              components.host == World2DebugTicket.host else {
            return nil
        }
        return decode(components)
    }

    static func decode(_ url: URL) -> World2DebugTicket? {
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false) else {
            return nil
        }
        return decode(components)
    }

    static func snapshot(
        ticket: World2DebugTicket,
        url: String,
        report: World2DebugReport
    ) -> World2DebugSnapshot {
        World2DebugSnapshot(
            summary: ticket.token,
            ticketURL: url,
            screen: report.screen.diagnosticName,
            screenCode: ticket.screenCode,
            routeID: ticket.routeID,
            player: ticket.playerSlot,
            world: ticket.worldCode,
            sceneID: report.sceneID,
            presentation: ticket.presentation,
            presentations: report.presentations,
            inspectedPOI: ticket.inspectedPOI,
            build: ticket.build,
            os: World2DebugDevice.os,
            device: World2DebugDevice.model,
            gems: ticket.gems,
            quest: ticket.quest,
            error: ticket.error,
            toast: report.toast,
            milestones: report.milestones,
            completedPOIs: report.completedPOIs,
            placeCount: report.placeCount,
            createdSceneCount: report.createdSceneCount,
            inventoryCount: report.inventoryCount,
            deckCount: report.deckCount,
            lastEvent: report.lastEvent,
            lastEventDetails: report.lastEventDetails,
            issuedAt: ticket.issuedAt,
            fingerprint: ticket.fingerprint
        )
    }

    static func playerSlot(for playerID: PlayerId) -> String {
        switch playerID {
        case .abbie: return "abbie"
        case .ani: return "ani"
        case .evan: return "evan"
        }
    }

    static func worldCode(for worldID: WorldId) -> String {
        switch worldID {
        case .home: return "home"
        case .work: return "work"
        case .farm: return "farm"
        case .adventure: return "adventure"
        case .blankSlate: return "blank"
        case .threeBears: return "bears"
        case .artGarden: return "garden"
        case .evan: return "citadel"
        case .peglinEdition: return "peglin"
        }
    }

    private static func decode(_ components: URLComponents) -> World2DebugTicket? {
        let query = Dictionary(
            uniqueKeysWithValues: (components.queryItems ?? []).map { ($0.name, $0.value ?? "") }
        )
        guard query["v"] == "\(World2DebugTicket.version)",
              let screenCode = nonempty(query["s"]),
              let issuedAt = query["t"].flatMap(Int.init).map(TimeInterval.init).map(Date.init(timeIntervalSince1970:)),
              let fingerprint = nonempty(query["f"]) else {
            return nil
        }
        let presentation = nonempty(query["m"])
        if let presentation, !knownPresentations.contains(presentation) {
            return nil
        }
        return World2DebugTicket(
            screenCode: screenCode,
            routeID: nonempty(query["i"]),
            playerSlot: nonempty(query["p"]),
            worldCode: nonempty(query["w"]),
            sceneID: nonempty(query["c"]),
            presentation: presentation,
            inspectedPOI: nonempty(query["o"]),
            build: nonempty(query["b"]) ?? "?",
            buildStamp: nonempty(query["bt"]),
            gems: Int(query["g"] ?? "") ?? 0,
            quest: nonempty(query["q"]),
            error: nonempty(query["e"]),
            issuedAt: issuedAt,
            fingerprint: fingerprint
        )
    }

    private static func encodedSceneID(for report: World2DebugReport) -> String? {
        guard report.screen == .blankSlate else { return nil }
        guard report.sceneID != World2PlacedPlaceInstance.blankSlateSceneID else { return nil }
        return report.sceneID
    }

    private static func fingerprint(
        screenCode: String,
        routeID: String?,
        playerSlot: String?,
        worldCode: String?,
        sceneID: String?,
        presentation: String?,
        inspectedPOI: String?,
        gems: Int,
        quest: String?,
        error: String?,
        issuedAt: Date,
        buildStamp: String?
    ) -> String {
        let route = routeID ?? ""
        let player = playerSlot ?? ""
        let world = worldCode ?? ""
        let scene = sceneID ?? ""
        let shown = presentation ?? ""
        let poi = inspectedPOI ?? ""
        let gemsText = String(gems)
        let questText = quest ?? ""
        let errorText = error ?? ""
        let issued = String(Int(issuedAt.timeIntervalSince1970))
        let stamp = buildStamp ?? ""
        let canonical = "1|\(screenCode)|\(route)|\(player)|\(world)|\(scene)|\(shown)|\(poi)|\(gemsText)|\(questText)|\(errorText)|\(issued)|\(stamp)"
        let digest = Array(SHA256.hash(data: Data(canonical.utf8)).prefix(4))
        return digest.map { byte in String(format: "%02x", byte) }.joined()
    }

    private static func playerSlot(_ playerID: PlayerId) -> String {
        playerSlot(for: playerID)
    }

    private static func worldCode(_ worldID: WorldId) -> String {
        worldCode(for: worldID)
    }

    static func playerID(from slot: String?) -> PlayerId? {
        switch slot {
        case "abbie", PlayerId.abbie.rawValue: return .abbie
        case "ani", PlayerId.ani.rawValue: return .ani
        case "evan", PlayerId.evan.rawValue: return .evan
        default: return nil
        }
    }

    static func worldID(from code: String?) -> WorldId? {
        switch code {
        case "home", WorldId.home.rawValue: return .home
        case "work", WorldId.work.rawValue: return .work
        case "farm", WorldId.farm.rawValue: return .farm
        case "adventure", WorldId.adventure.rawValue: return .adventure
        case "blank", WorldId.blankSlate.rawValue: return .blankSlate
        case "bears", WorldId.threeBears.rawValue: return .threeBears
        case "garden", WorldId.artGarden.rawValue: return .artGarden
        case "citadel", WorldId.evan.rawValue: return .evan
        default: return nil
        }
    }

    private static func append(_ items: inout [URLQueryItem], _ name: String, _ value: String?) {
        guard let value, !value.isEmpty else { return }
        items.append(URLQueryItem(name: name, value: value))
    }

    private static func nonempty(_ value: String?) -> String? {
        guard let value, !value.isEmpty else { return nil }
        return value
    }

    private static func compact(_ text: String?, limit: Int) -> String? {
        guard let text else { return nil }
        let collapsed = text
            .split(whereSeparator: \.isWhitespace)
            .joined(separator: " ")
        guard !collapsed.isEmpty else { return nil }
        if collapsed.count <= limit { return collapsed }
        return String(collapsed.prefix(limit))
    }
}

enum World2DebugBuildLabel {
    static let appName = "Abbie's World"

    static func name(version: String = World2DebugDevice.marketingVersion) -> String {
        let trimmed = version.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, trimmed != "?" else { return appName }
        return "\(appName) \(trimmed)"
    }

    static func timeText(
        builtAt: Date?,
        timeZone: TimeZone = .current
    ) -> String {
        guard let builtAt else { return "Build time unknown" }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = timeZone
        formatter.dateFormat = "MMM d, h:mm:ss a"
        return formatter.string(from: builtAt)
    }

    static var currentName: String { name() }
    static var currentTimeText: String { timeText(builtAt: World2DebugDevice.builtAt) }

    static func date(fromStamp stamp: String?) -> Date? {
        guard let stamp else { return nil }
        let trimmed = stamp.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let raw = Int(trimmed) else { return nil }
        if raw > 9_999_999_999 {
            return Date(timeIntervalSince1970: TimeInterval(raw) / 1000)
        }
        return Date(timeIntervalSince1970: TimeInterval(raw))
    }
}

enum World2DebugDevice {
    static var marketingVersion: String {
        Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "?"
    }

    /// Millisecond stamp written into the app on every build. Falls back to the
    /// executable date only when that stamp file is missing.
    static var buildStamp: String? {
        if let stampedBuildToken { return stampedBuildToken }
        guard let executableDate else { return nil }
        return String(Int(executableDate.timeIntervalSince1970 * 1000))
    }

    static var builtAt: Date? {
        if let stamped = World2DebugBuildLabel.date(fromStamp: stampedBuildToken) {
            return stamped
        }
        return executableDate
    }

    private static var executableDate: Date? {
        guard let url = Bundle.main.executableURL else { return nil }
        return (try? url.resourceValues(forKeys: [.contentModificationDateKey]))?
            .contentModificationDate
    }

    private static var stampedBuildToken: String? {
        guard let url = Bundle.main.url(forResource: "World2BuildStamp", withExtension: "txt"),
              let text = try? String(contentsOf: url, encoding: .utf8) else {
            return nil
        }
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }

    static var build: String {
        let info = Bundle.main.infoDictionary
        let version = info?["CFBundleShortVersionString"] as? String ?? "?"
        let build = info?["CFBundleVersion"] as? String ?? "?"
        return "\(version).\(build)"
    }

    static var os: String {
        let version = ProcessInfo.processInfo.operatingSystemVersion
        return "\(version.majorVersion).\(version.minorVersion).\(version.patchVersion)"
    }

    static var model: String {
        var system = utsname()
        uname(&system)
        return withUnsafePointer(to: &system.machine) {
            $0.withMemoryRebound(to: CChar.self, capacity: 1) {
                String(cString: $0)
            }
        }
    }
}

enum World2DebugSnapshotStore {
    static var defaultDirectory: URL {
        let base = FileManager.default.urls(
            for: .applicationSupportDirectory,
            in: .userDomainMask
        ).first ?? FileManager.default.temporaryDirectory
        return base.appendingPathComponent("World2DebugSnapshots", isDirectory: true)
    }

    @discardableResult
    static func write(
        _ snapshot: World2DebugSnapshot,
        to directory: URL = defaultDirectory,
        keeping: Int = 24
    ) throws -> URL {
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
        encoder.dateEncodingStrategy = .iso8601
        let data = try encoder.encode(snapshot)
        let named = directory.appendingPathComponent("\(snapshot.fingerprint).json")
        let latest = directory.appendingPathComponent("latest.json")
        try data.write(to: named, options: .atomic)
        try data.write(to: latest, options: .atomic)
        try prune(in: directory, keeping: keeping)
        return named
    }

    private static func prune(in directory: URL, keeping: Int) throws {
        let files = try FileManager.default.contentsOfDirectory(
            at: directory,
            includingPropertiesForKeys: [.contentModificationDateKey],
            options: [.skipsHiddenFiles]
        ).filter { url in
            url.lastPathComponent != "latest.json" && url.pathExtension == "json"
        }
        guard files.count > keeping else { return }
        let dated = try files.map { url -> (URL, Date) in
            let values = try url.resourceValues(forKeys: [.contentModificationDateKey])
            return (url, values.contentModificationDate ?? .distantPast)
        }.sorted { $0.1 > $1.1 }
        for item in dated.dropFirst(keeping) {
            try FileManager.default.removeItem(at: item.0)
        }
    }
}

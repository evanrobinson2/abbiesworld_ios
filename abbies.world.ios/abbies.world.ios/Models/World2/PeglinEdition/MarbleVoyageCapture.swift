import Foundation

/// Headless / silent Marble Voyage stage capture for agents and layout review.
///
/// Launch:
/// ```
/// -world2SkipAuth -voyageCapture=title|chart|fight|shop|event [-voyageCaptureSeed=42]
/// ```
///
/// When the stage is painted and idle, the app writes
/// `Documents/voyage-capture/READY` and sets accessibility id
/// `voyage.capture.ready`. Scripts poll the READY file, then
/// `xcrun simctl io … screenshot`.
enum MarbleVoyageCaptureStage: String, CaseIterable, Sendable {
    case title
    case chart
    case fight
    case shop
    case event

    /// Stages the capture script runs by default.
    static let defaultMatrix: [MarbleVoyageCaptureStage] = [.title, .chart, .fight]
}

enum MarbleVoyageCapture {
    static let argumentPrefix = "-voyageCapture="
    static let seedArgumentPrefix = "-voyageCaptureSeed="
    /// After chart settles, auto-march into the first fight (for video recording).
    static let autoBreakoutArgument = "-voyageAutoBreakout"
    static let readyAccessibilityID = "voyage.capture.ready"
    static let documentsFolderName = "voyage-capture"
    static let readyFileName = "READY"
    static let defaultSeed: UInt64 = 42
    /// First campaign scrap fight — matches `-marbleVoyageDebugFight` Trail scrap.
    static let captureFightNodeID = "land0_fight1"
    /// Mid-land encounter / treasure / shrine for the event still.
    static let captureEventNodeID = "land0_gift1"

    static var isActive: Bool { stage != nil }

    static var wantsAutoBreakout: Bool {
        ProcessInfo.processInfo.arguments.contains(autoBreakoutArgument)
    }

    static var stage: MarbleVoyageCaptureStage? {
        parseStage(from: ProcessInfo.processInfo.arguments)
    }

    static var seed: UInt64 {
        parseSeed(from: ProcessInfo.processInfo.arguments) ?? defaultSeed
    }

    static func parseStage(from arguments: [String]) -> MarbleVoyageCaptureStage? {
        for argument in arguments {
            guard argument.hasPrefix(argumentPrefix) else { continue }
            let raw = String(argument.dropFirst(argumentPrefix.count))
                .trimmingCharacters(in: .whitespacesAndNewlines)
                .lowercased()
            return MarbleVoyageCaptureStage(rawValue: raw)
        }
        return nil
    }

    static func parseSeed(from arguments: [String]) -> UInt64? {
        for argument in arguments {
            guard argument.hasPrefix(seedArgumentPrefix) else { continue }
            let raw = String(argument.dropFirst(seedArgumentPrefix.count))
                .trimmingCharacters(in: .whitespacesAndNewlines)
            return UInt64(raw)
        }
        return nil
    }

    /// Seeded campaign run parked on the requested still (nil for title).
    static func makeRun(for stage: MarbleVoyageCaptureStage, seed: UInt64 = defaultSeed) -> MarbleVoyageRun? {
        switch stage {
        case .title:
            return nil
        case .chart:
            return MarbleVoyageRun.make(mode: .campaign, seed: seed)
        case .fight:
            var run = MarbleVoyageRun.make(mode: .campaign, seed: seed)
            let nodeID = run.node(captureFightNodeID)?.id
                ?? run.nodes.first(where: { $0.kind == .fight })?.id
            guard let nodeID else { return run }
            run.currentNodeID = nodeID
            run.visited.insert(nodeID)
            run.phase = .fight(nodeID: nodeID)
            return run
        case .shop:
            var run = MarbleVoyageRun.make(mode: .campaign, seed: seed)
            let nodeID = run.node(captureFightNodeID)?.id
                ?? run.nodes.first(where: { $0.kind == .fight })?.id
                ?? run.currentNodeID
            run.currentNodeID = nodeID
            run.visited.insert(nodeID)
            run.coins = max(run.coins, 80)
            run.openShop(after: nodeID)
            return run
        case .event:
            var run = MarbleVoyageRun.make(mode: .campaign, seed: seed)
            let nodeID = run.node(captureEventNodeID)?.id
                ?? run.nodes.first(where: {
                    [.treasure, .mystery, .shrine].contains($0.kind)
                })?.id
            guard let nodeID else { return run }
            run.currentNodeID = nodeID
            run.visited.insert(nodeID)
            run.phase = .event(nodeID: nodeID)
            return run
        }
    }

    static func readyDirectoryURL(
        fileManager: FileManager = .default
    ) -> URL? {
        guard let docs = fileManager.urls(for: .documentDirectory, in: .userDomainMask).first else {
            return nil
        }
        return docs.appendingPathComponent(documentsFolderName, isDirectory: true)
    }

    /// Clears prior READY, then after the stage settles writes a marker agents can poll.
    static func armReadyMarker(stage: MarbleVoyageCaptureStage, seed: UInt64) {
        clearReadyMarker()
        let delay: TimeInterval
        switch stage {
        case .title: delay = 1.1
        case .chart: delay = 1.4
        case .fight: delay = 1.8
        case .shop, .event: delay = 1.2
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
            writeReadyMarker(stage: stage, seed: seed)
        }
    }

    static func clearReadyMarker(fileManager: FileManager = .default) {
        guard let dir = readyDirectoryURL(fileManager: fileManager) else { return }
        let ready = dir.appendingPathComponent(readyFileName)
        try? fileManager.removeItem(at: ready)
    }

    static func writeReadyMarker(
        stage: MarbleVoyageCaptureStage,
        seed: UInt64,
        fileManager: FileManager = .default
    ) {
        guard let dir = readyDirectoryURL(fileManager: fileManager) else { return }
        try? fileManager.createDirectory(at: dir, withIntermediateDirectories: true)
        let payload: [String: Any] = [
            "stage": stage.rawValue,
            "seed": seed,
            "ready": true,
            "iso8601": ISO8601DateFormatter().string(from: Date()),
        ]
        let ready = dir.appendingPathComponent(readyFileName)
        if let data = try? JSONSerialization.data(withJSONObject: payload, options: [.prettyPrinted]) {
            try? data.write(to: ready, options: .atomic)
        } else {
            try? Data("ready\n".utf8).write(to: ready, options: .atomic)
        }
        print("voyage.capture.ready stage=\(stage.rawValue) seed=\(seed)")
    }
}

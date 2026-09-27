import Foundation

/// Rolling flight-frame profiler — keeps ~0.25s of samples so a bomb hitch
/// can dump what the loop was doing *before* the intersect.
enum PlinkFlightProfiler {
    struct Sample: Equatable {
        var t: TimeInterval
        var dtMs: Double
        var updateMs: Double
        var phase: String
        var pegHits: Int
        var shotAge: Double
        var note: String
    }

    /// ~0.25s at 60fps.
    private static let capacity = 16
    private static var ring: [Sample] = []
    private static var writeIndex = 0
    private static var count = 0
    private static let lock = NSLock()

    static func record(
        currentTime: TimeInterval,
        dt: TimeInterval,
        updateMs: Double,
        phase: String,
        pegHits: Int,
        shotAge: TimeInterval,
        note: String = ""
    ) {
        let sample = Sample(
            t: currentTime,
            dtMs: dt * 1000,
            updateMs: updateMs,
            phase: phase,
            pegHits: pegHits,
            shotAge: shotAge,
            note: note
        )
        lock.lock()
        defer { lock.unlock() }
        if ring.count < capacity {
            ring.append(sample)
            count = ring.count
            writeIndex = count % capacity
        } else {
            ring[writeIndex] = sample
            writeIndex = (writeIndex + 1) % capacity
            count = capacity
        }
    }

    /// Chronological window ending at the most recent sample.
    static func recentWindow() -> [Sample] {
        lock.lock()
        defer { lock.unlock() }
        guard count > 0 else { return [] }
        if ring.count < capacity {
            return ring
        }
        return Array(ring[writeIndex...]) + Array(ring[..<writeIndex])
    }

    /// Dump last ~0.25s + an event note. Returns the path written (Documents).
    @discardableResult
    static func dumpBombEvent(
        splashCount: Int,
        splashMs: Double,
        refreshDeferred: Bool,
        publishSuppressed: Int
    ) -> String {
        let window = recentWindow()
        var lines: [String] = []
        lines.append("=== BOMB HIT PROFILE ===")
        lines.append(
            String(
                format: "splashPegs=%d splashMs=%.2f refreshDeferred=%@ publishesSuppressed=%d",
                splashCount,
                splashMs,
                refreshDeferred ? "true" : "false",
                publishSuppressed
            )
        )
        lines.append("--- last \(window.count) frames (~0.25s) ---")
        for s in window {
            lines.append(
                String(
                    format: "t=%.3f dt=%.1fms upd=%.1fms phase=%@ hits=%d age=%.2f %@",
                    s.t,
                    s.dtMs,
                    s.updateMs,
                    s.phase,
                    s.pegHits,
                    s.shotAge,
                    s.note
                )
            )
        }
        let maxUpd = window.map(\.updateMs).max() ?? 0
        let maxDt = window.map(\.dtMs).max() ?? 0
        lines.append(String(format: "windowMaxUpdateMs=%.1f windowMaxDtMs=%.1f", maxUpd, maxDt))
        let body = lines.joined(separator: "\n")
        NSLog("%@", body)

        let stamp = Int(Date().timeIntervalSince1970)
        let name = "plink-bomb-profile-\(stamp).txt"
        let dir = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first
            ?? FileManager.default.temporaryDirectory
        let url = dir.appendingPathComponent(name)
        try? body.write(to: url, atomically: true, encoding: .utf8)
        NSLog("PlinkFlightProfiler wrote %@", url.path)
        return url.path
    }
}

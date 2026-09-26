import CoreGraphics
import Foundation

/// Trailer-derived Peglin candidates (Physics Lab only).
enum PeglinCandidates {
    static let gravity: CGFloat = 1200
    static let pegRestitution: CGFloat = 0.88
    static let wallRestitution: CGFloat = 0.88
    static let launchSpeed: CGFloat = 560
    static let ballRadius: CGFloat = 12
    static let pegRadius: CGFloat = 12
}

enum LabScenario: String, CaseIterable, Identifiable {
    case dropStraight = "A · Drop"
    case angledFlight = "A2 · Angle"
    case singlePeg = "B · Peg"
    case wallBounce = "C · Wall"
    case pegField = "D · Field"

    var id: String { rawValue }

    var shortCode: String {
        switch self {
        case .dropStraight: return "A"
        case .angledFlight: return "A2"
        case .singlePeg: return "B"
        case .wallBounce: return "C"
        case .pegField: return "D"
        }
    }

    var blurb: String {
        switch self {
        case .dropStraight: return "Empty board, straight drop. Locks g."
        case .angledFlight: return "Angled launch. Prove vx stays flat."
        case .singlePeg: return "One peg. Measure bounce e."
        case .wallBounce: return "Into a wall. Measure wall e."
        case .pegField: return "Sparse field. Watch |vx|/|v|."
        }
    }
}

struct LabMeterSnapshot: Equatable {
    var scenario: LabScenario
    var phaseLabel: String
    var status: String
    var vx: CGFloat
    var vy: CGFloat
    var speed: CGFloat
    var horizFrac: CGFloat
    var boardY: CGFloat
    var shotAge: TimeInterval
    var commandedG: CGFloat
    var commandedGBoard: CGFloat
    var fittedG: CGFloat?
    var fittedGBoard: CGFloat?
    var fittedVxDrift: CGFloat?
    var lastRestitution: CGFloat?
    var sampleCount: Int
    var fitNote: String
    var targetGBoard: CGFloat
    var targetHoriz: CGFloat
    var targetE: CGFloat

    static func idle(_ scenario: LabScenario, boardHeight: CGFloat) -> LabMeterSnapshot {
        let g = PeglinCandidates.gravity
        return LabMeterSnapshot(
            scenario: scenario,
            phaseLabel: "ready",
            status: scenario.blurb,
            vx: 0, vy: 0, speed: 0, horizFrac: 0, boardY: 0, shotAge: 0,
            commandedG: g,
            commandedGBoard: boardHeight > 1 ? g / boardHeight : 0,
            fittedG: nil, fittedGBoard: nil, fittedVxDrift: nil,
            lastRestitution: nil, sampleCount: 0,
            fitNote: "Tap / release to fire",
            targetGBoard: 1.5,
            targetHoriz: 0.44,
            targetE: 0.88
        )
    }
}

import Foundation

/// Explicit tiny actor state model — later reusable as WorldActor.
enum CharacterState: String, CaseIterable, Identifiable {
    case idle
    case walking
    case running
    case waving
    case celebrating

    var id: String { rawValue }

    var buttonTitle: String {
        switch self {
        case .idle: return "IDLE"
        case .walking: return "WALK"
        case .running: return "RUN"
        case .waving: return "WAVE"
        case .celebrating: return "CELEBRATE"
        }
    }

    /// Exact clip names as shipped in `character.glb`, ordered by preference.
    ///
    /// Meshy's library labels for this pack are wrong when you watch the motion:
    /// - `Idle` → cautious walk (no true idle in the pack)
    /// - `Casual_Walk` → run
    /// - `Run_02` → one-hand wave
    /// - `Wave_One_Hand` → celebrate
    var clipNameHints: [String] {
        switch self {
        case .idle:
            return []
        case .walking:
            return ["Idle"]
        case .running:
            return ["Casual_Walk", "Casual Walk"]
        case .waving:
            return ["Run_02", "Run 2"]
        case .celebrating:
            return ["Wave_One_Hand", "Wave One Hand", "Victory_Cheer", "Victory Cheer"]
        }
    }

    var loops: Bool {
        switch self {
        case .idle, .walking, .running:
            return true
        case .waving, .celebrating:
            return false
        }
    }
}

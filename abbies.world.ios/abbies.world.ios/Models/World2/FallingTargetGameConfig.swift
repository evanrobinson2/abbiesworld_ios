import Foundation

struct FallingTargetGameConfig: Codable, Identifiable {
    let id: String
    let gameType: String
    let title: String
    let mission: String
    let durationSeconds: Double
    let difficulty: DifficultyConfiguration
    let targets: TargetConfiguration
    let distractors: DistractorConfiguration
    let scoring: ScoringConfiguration
    let spawn: SpawnConfiguration
    let environment: EnvironmentConfiguration
    let reward: RewardConfiguration

    struct DifficultyConfiguration: Codable {
        let prompt: String
        let easyLabel: String
        let hardLabel: String
        let defaultValue: Double
    }

    struct TargetConfiguration: Codable {
        let set: [String]
        let matchCaseInsensitive: Bool
    }

    struct DistractorConfiguration: Codable {
        let set: [String]
    }

    struct ScoringConfiguration: Codable {
        let targetHit: Int
        let hardWrongHitPenalty: Int
        let penaltyStartsAtDifficulty: Double
    }

    struct SpawnConfiguration: Codable {
        let easyFallSpeed: Double
        let hardFallSpeed: Double
        let easyMaximumVisible: Int
        let hardMaximumVisible: Int
        let easyTargetFrequency: Double
        let hardTargetFrequency: Double
        let easyLetterSize: Double
        let hardLetterSize: Double
        let hardSizeVariance: Double
        let lowercaseStartsAtDifficulty: Double
        let hardLowercaseProbability: Double
        let hardHorizontalDrift: Double
    }

    struct EnvironmentConfiguration: Codable {
        let poi: String
        let interiorAsset: String
        let sourceHook: String
        let targetHitHook: String
        let roundEndHook: String
    }

    struct RewardConfiguration: Codable {
        let type: String
        let amount: Int
    }
}

enum FallingTargetConfigurationLoader {
    static func load(id: String, bundle: Bundle = .main) throws -> FallingTargetGameConfig {
        let candidates = [
            bundle.url(forResource: id, withExtension: "json", subdirectory: "World2"),
            bundle.url(forResource: id, withExtension: "json")
        ]
        guard let url = candidates.compactMap({ $0 }).first else {
            throw ConfigurationError.missing(id)
        }
        let data = try Data(contentsOf: url)
        let configuration = try JSONDecoder().decode(FallingTargetGameConfig.self, from: data)
        guard configuration.gameType == "fallingTargets",
              configuration.durationSeconds > 0,
              !configuration.targets.set.isEmpty,
              !configuration.distractors.set.isEmpty else {
            throw ConfigurationError.invalid(id)
        }
        return configuration
    }

    enum ConfigurationError: LocalizedError {
        case missing(String)
        case invalid(String)

        var errorDescription: String? {
            switch self {
            case .missing(let id): return "Missing bundled minigame configuration: \(id)"
            case .invalid(let id): return "Invalid falling-target configuration: \(id)"
            }
        }
    }
}

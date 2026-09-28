import XCTest
import CoreGraphics
@testable import abbies_world_ios

/// One-shot balance dump for layout / climb review. Prints JSON lines for the canvas.
final class MarbleVoyageBalanceAuditTests: XCTestCase {
    func testDumpBalanceAuditJSON() throws {
        var boards: [[String: Any]] = []
        for level in BoardLevel.catalog {
            let shots = sampleBoard(level: level, aims: 48, seed: 41)
            boards.append([
                "id": level.id,
                "name": level.name,
                "blurb": level.blurb,
                "pegCount": level.pegs.count,
                "orangeCount": level.pegs.filter { $0.kind == .orange }.count,
                "bombCount": level.pegs.filter { $0.kind == .bomb }.count,
                "critCount": level.pegs.filter { $0.kind == .crit }.count,
                "railCount": level.rails.count,
                "pegRadius": Double(level.pegRadius),
                "meanPegHits": shots.meanHits,
                "p25PegDamage": shots.p25Damage,
                "medianPegDamage": shots.medianDamage,
                "p75PegDamage": shots.p75Damage,
                "meanBombAOE": shots.meanAOE,
                "meanDuration": shots.meanDuration,
                "zeroHitRate": shots.zeroHitRate,
            ])
        }

        // Role win rates on the board each role actually uses.
        var roles: [[String: Any]] = []
        let roleSpecs: [(MarbleVoyageGangFightRole, PlinkAttackerKind, String)] = [
            (.henchman, .porcupineBoxer, PeglinBattleRules.boardID(forAttacker: .porcupineBoxer, role: .henchman)),
            (.henchman, .cawScout, PeglinBattleRules.boardID(forAttacker: .cawScout, role: .henchman)),
            (.miniBoss, .vix, PeglinBattleRules.boardID(forAttacker: .vix, role: .miniBoss)),
            (.miniBoss, .raze, PeglinBattleRules.boardID(forAttacker: .raze, role: .miniBoss)),
            (.bigBoss, .raze, PeglinBattleRules.boardID(forAttacker: .raze, role: .bigBoss)),
        ]
        for (role, focus, board) in roleSpecs {
            let trials = 80
            var wins = 0
            var rounds = 0.0
            var hp = 0.0
            var dealt = 0.0
            for i in 0..<trials {
                let r = PlinkBattleBalance.simulateFight(
                    role: role,
                    wave: focus,
                    focus: focus,
                    boardID: board,
                    seed: 9001 &+ UInt64(i) &* 1_000_003
                )
                if r.won {
                    wins += 1
                    hp += Double(r.playerHPLeft)
                }
                rounds += Double(r.rounds)
                dealt += Double(r.damageDealt)
            }
            roles.append([
                "role": role.rawValue,
                "focus": focus.rawValue,
                "boardID": board,
                "trials": trials,
                "winRate": Double(wins) / Double(trials),
                "meanRounds": rounds / Double(trials),
                "meanHPLeftWhenWon": wins == 0 ? 0 : hp / Double(wins),
                "meanDamageDealt": dealt / Double(trials),
                "rosterHP": rosterHP(role: role, focus: focus),
                "foeAttack": PeglinBattleRules.foeAttack(for: focus, role: role),
                "isFlying": focus.isFlying,
            ])
        }

        // Campaign survival + clear by player archetype (primary) and shop policy (legacy).
        var playerTypes: [[String: Any]] = []
        var policies: [[String: Any]] = []
        var survival: [Int: Int] = [:]
        let campaignTrials = 120
        let totalFights = MarbleVoyageRun.campaignTotalFights
        for player in MarbleVoyageCampaignSim.PlayerType.allCases {
            var clears = 0
            var fightsSum = 0.0
            var temperSum = 0.0
            for i in 0..<campaignTrials {
                let trial = MarbleVoyageCampaignSim.playCampaign(
                    seed: 4242 &+ UInt64(i) &* 1_009,
                    player: player
                )
                if trial.won { clears += 1 }
                fightsSum += Double(trial.fightsCleared)
                temperSum += trial.meanTemperFactor
                if player == .metaAware {
                    let cleared = trial.fightsCleared
                    for f in 0...cleared {
                        survival[f, default: 0] += 1
                    }
                }
            }
            playerTypes.append([
                "player": player.rawValue,
                "title": player.title,
                "blurb": player.blurb,
                "trials": campaignTrials,
                "clearRate": Double(clears) / Double(campaignTrials),
                "meanFightsCleared": fightsSum / Double(campaignTrials),
                "meanTemperFactor": temperSum / Double(campaignTrials),
                "totalFights": totalFights,
            ])
        }
        for policy in MarbleVoyageCampaignSim.ShopPolicy.allCases {
            var clears = 0
            var fightsSum = 0.0
            for i in 0..<campaignTrials {
                let trial = MarbleVoyageCampaignSim.playCampaign(
                    seed: 4242 &+ UInt64(i) &* 1_009,
                    policy: policy
                )
                if trial.won { clears += 1 }
                fightsSum += Double(trial.fightsCleared)
            }
            policies.append([
                "policy": policy.rawValue,
                "trials": campaignTrials,
                "clearRate": Double(clears) / Double(campaignTrials),
                "meanFightsCleared": fightsSum / Double(campaignTrials),
                "totalFights": totalFights,
            ])
        }

        var survivalCurve: [[String: Any]] = []
        for f in 0...totalFights {
            let reached = survival[f, default: 0]
            survivalCurve.append([
                "fightsClearedOrMore": f,
                "players": reached,
                "rate": Double(reached) / Double(campaignTrials),
            ])
        }

        // Climb node HP table (one seeded run).
        let run = MarbleVoyageRun.make(mode: .campaign, seed: 77)
        var climb: [[String: Any]] = []
        for node in run.nodes where node.kind == .fight || node.kind == .boss {
            let board = PeglinBattleRules.boardID(
                forAttacker: node.waveAttacker,
                role: node.gangRole
            )
            climb.append([
                "id": node.id,
                "title": node.title,
                "stage": node.stage,
                "role": node.gangRole?.rawValue ?? "none",
                "wave": node.waveAttacker?.rawValue ?? "",
                "mapEnemyMaxHP": run.enemyMaxHP(for: node),
                "mapEnemyAttack": run.enemyAttack(for: node),
                "rosterHP": rosterHP(role: node.gangRole ?? .henchman, focus: node.waveAttacker ?? .porcupineBoxer),
                "boardID": board,
            ])
        }

        let payload: [String: Any] = [
            "playerMaxHP": MarbleVoyageRun.defaultMaxHP,
            "campaignTotalFights": totalFights,
            "targetBands": PlinkBattleBalance.targetBands.map {
                ["role": $0.role.rawValue, "min": $0.minWinRate, "max": $0.maxWinRate]
            },
            "boards": boards,
            "roles": roles,
            "playerTypes": playerTypes,
            "policies": policies,
            "survivalMetaAware": survivalCurve,
            "climb": climb,
            "geometryNote": "All pegs are circles (SpriteKit / continuum radius). Peglin Steam used square peg colliders that chain-bounce longer.",
        ]

        let data = try JSONSerialization.data(withJSONObject: payload, options: [.prettyPrinted, .sortedKeys])
        let text = String(data: data, encoding: .utf8) ?? "{}"
        print("BALANCE_AUDIT_JSON_BEGIN")
        print(text)
        print("BALANCE_AUDIT_JSON_END")
        // Keep XCTest happy — dump always "passes"; assertions live in other suites.
        XCTAssertFalse(boards.isEmpty)
        XCTAssertEqual(climb.count, totalFights)
    }

    private struct BoardShotStats {
        var meanHits: Double
        var p25Damage: Double
        var medianDamage: Double
        var p75Damage: Double
        var meanAOE: Double
        var meanDuration: Double
        var zeroHitRate: Double
    }

    private func sampleBoard(level: BoardLevel, aims: Int, seed: UInt64) -> BoardShotStats {
        var damages: [Int] = []
        var hits: [Int] = []
        var aoes: [Int] = []
        var durations: [Double] = []
        var zeros = 0
        for i in 0..<aims {
            let t = CGFloat(i) / CGFloat(max(1, aims - 1))
            let aim = -0.9 + 1.8 * t
            // Jitter aim slightly per seed so we don't only hit lattice seams.
            let jitter = CGFloat((Double((seed &+ UInt64(i)) % 17) - 8.0) / 80.0)
            let sample = PlinkBattleBalance.sampleShotDamage(
                level: level,
                aimOffset: aim + jitter
            )
            damages.append(sample.pegDamage)
            hits.append(sample.pegHits)
            aoes.append(sample.bombAOE)
            if sample.pegHits == 0 { zeros += 1 }

            var pack = PlinkContinuum.materialize(
                level: level,
                size: CGSize(width: level.referenceWidth, height: level.referenceHeight),
                tuning: .default
            )
            let shot = PlinkRoundSimulator.simulateShot(
                aimOffset: aim + jitter,
                pegs: &pack.pegs,
                rails: pack.rails,
                config: pack.config,
                maxSeconds: 12
            )
            durations.append(Double(shot.duration))
        }
        damages.sort()
        func pct(_ p: Double) -> Double {
            guard !damages.isEmpty else { return 0 }
            let idx = Int((p * Double(damages.count - 1)).rounded())
            return Double(damages[max(0, min(damages.count - 1, idx))])
        }
        let n = Double(aims)
        return BoardShotStats(
            meanHits: Double(hits.reduce(0, +)) / n,
            p25Damage: pct(0.25),
            medianDamage: pct(0.5),
            p75Damage: pct(0.75),
            meanAOE: Double(aoes.reduce(0, +)) / n,
            meanDuration: durations.reduce(0, +) / n,
            zeroHitRate: Double(zeros) / n
        )
    }

    private func rosterHP(role: MarbleVoyageGangFightRole, focus: PlinkAttackerKind) -> Int {
        PeglinBattleRules.makeRescueRoster(
            wave: focus,
            focus: focus,
            role: role,
            seed: 1
        ).map(\.maxHP).reduce(0, +)
    }
}

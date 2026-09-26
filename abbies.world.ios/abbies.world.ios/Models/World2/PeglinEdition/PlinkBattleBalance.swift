import Foundation
import CoreGraphics

/// Headless fight balance — samples continuum shots, then plays approach/melee rules.
/// Target kid curve: early ~85%, mid ~75%, mini ~70%, big boss ~60%.
enum PlinkBattleBalance {
    struct Band: Equatable {
        var role: MarbleVoyageGangFightRole
        var minWinRate: Double
        var maxWinRate: Double
    }

    /// Desired win-rate bands (inclusive).
    static let targetBands: [Band] = [
        Band(role: .henchman, minWinRate: 0.80, maxWinRate: 0.92),
        Band(role: .miniBoss, minWinRate: 0.68, maxWinRate: 0.82),
        Band(role: .bigBoss, minWinRate: 0.52, maxWinRate: 0.68),
    ]

    struct FightResult: Equatable {
        var won: Bool
        var rounds: Int
        var playerHPLeft: Int
        var damageDealt: Int
        var damageTaken: Int
    }

    struct WinRateReport: Equatable {
        var role: MarbleVoyageGangFightRole
        var trials: Int
        var wins: Int
        var winRate: Double
        var meanRounds: Double
        var meanHPLeftWhenWon: Double
    }

    /// Sample spirit-mode peg damage for one aim on a board (no UI).
    static func sampleShotDamage(
        level: BoardLevel,
        aimOffset: CGFloat,
        tuning: PhysicsTuning = .default
    ) -> (pegDamage: Int, bombAOE: Int, pegHits: Int) {
        var pack = PlinkContinuum.materialize(
            level: level,
            size: CGSize(width: level.referenceWidth, height: level.referenceHeight),
            tuning: tuning
        )
        let launch = PlinkRoundSimulator.launchState(aimOffset: aimOffset, config: pack.config)
        var pos = launch.origin
        var vel = launch.velocity
        var lastKickT: CGFloat = -1
        var t: CGFloat = 0
        let dt: CGFloat = 1 / 120
        var pegDamage = 0
        var bombAOE = 0
        var pegHits = 0
        var critActive = false
        var pending: [Int] = []
        let maxSteps = Int(12 / dt) + 1

        for _ in 0..<maxSteps {
            pending.removeAll(keepingCapacity: true)
            let hit = PlinkContinuum.step(
                pos: &pos,
                vel: &vel,
                dt: dt,
                t: t,
                lastKickT: &lastKickT,
                pegs: &pack.pegs,
                rails: pack.rails,
                config: pack.config,
                onPeg: { pending.append($0) }
            )
            for id in pending {
                guard let idx = pack.pegs.firstIndex(where: { $0.id == id }),
                      !pack.pegs[idx].isCleared,
                      !pack.pegs[idx].isLit
                else { continue }
                pack.pegs[idx].isLit = true
                pegHits += 1
                switch pack.pegs[idx].kind {
                case .bomb:
                    bombAOE += PeglinBattleRules.bombEnemyAOEDamage
                case .crit:
                    if !critActive {
                        critActive = true
                        pegDamage = max(1, pegDamage) * 2
                    }
                    pegDamage += PeglinBattleRules.points(for: .crit, critActive: critActive)
                default:
                    pegDamage += PeglinBattleRules.points(
                        for: pack.pegs[idx].kind,
                        critActive: critActive
                    )
                }
            }
            t += dt
            if hit == .floor { break }
            if hypot(vel.dx, vel.dy) < 8 && t > 0.9 { break }
            if pegHits > 80 { break }
        }
        return (pegDamage, bombAOE, pegHits)
    }

    /// One full rescue fight under approach/melee rules.
    static func simulateFight(
        role: MarbleVoyageGangFightRole,
        wave: PlinkAttackerKind,
        focus: PlinkAttackerKind,
        playerMaxHP: Int = MarbleVoyageRun.defaultMaxHP,
        boardID: String = "fox.pawPrint",
        seed: UInt64,
        maxRounds: Int = 80
    ) -> FightResult {
        var rng = SeededGenerator(seed: seed)
        var roster = PeglinBattleRules.makeRescueRoster(
            wave: wave,
            focus: focus,
            role: role,
            seed: seed &+ 17
        )
        var frontID = roster.first?.id
        var playerHP = playerMaxHP
        var rounds = 0
        var dealt = 0
        var taken = 0
        let level = BoardLevel.level(id: boardID) ?? BoardLevel.catalog[0]

        while rounds < maxRounds, playerHP > 0 {
            rounds += 1
            guard var frontIdx = roster.firstIndex(where: { $0.id == frontID }),
                  !roster[frontIdx].isDefeated
            else { break }

            // Aim fan — kid-ish mid-board bias with noise.
            let aim = CGFloat.random(in: -0.75...0.75, using: &rng)
            let sample = sampleShotDamage(level: level, aimOffset: aim)
            let peg = sample.pegDamage
            let aoe = sample.bombAOE

            if peg > 0 {
                roster[frontIdx].hp = max(0, roster[frontIdx].hp - peg)
                dealt += peg
            }
            if aoe > 0 {
                for i in roster.indices where !roster[i].isDefeated {
                    roster[i].hp = max(0, roster[i].hp - aoe)
                }
                dealt += aoe
            }

            // Promote if front dead.
            if roster[frontIdx].isDefeated {
                if let next = roster.first(where: { !$0.isDefeated }) {
                    frontID = next.id
                    frontIdx = roster.firstIndex(where: { $0.id == next.id })!
                } else {
                    return FightResult(
                        won: true,
                        rounds: rounds,
                        playerHPLeft: playerHP,
                        damageDealt: dealt,
                        damageTaken: taken
                    )
                }
            }

            let swing = PeglinBattleRules.resolveEnemyTurn(
                roster: &roster,
                frontID: frontID,
                attackOverride: nil,
                role: role
            )
            if swing.damage > 0 {
                playerHP = max(0, playerHP - swing.damage)
                taken += swing.damage
            }
            if playerHP <= 0 {
                return FightResult(
                    won: false,
                    rounds: rounds,
                    playerHPLeft: 0,
                    damageDealt: dealt,
                    damageTaken: taken
                )
            }
            if roster.allSatisfy(\.isDefeated) {
                return FightResult(
                    won: true,
                    rounds: rounds,
                    playerHPLeft: playerHP,
                    damageDealt: dealt,
                    damageTaken: taken
                )
            }
        }
        return FightResult(
            won: roster.allSatisfy(\.isDefeated) && playerHP > 0,
            rounds: rounds,
            playerHPLeft: playerHP,
            damageDealt: dealt,
            damageTaken: taken
        )
    }

    static func winRate(
        role: MarbleVoyageGangFightRole,
        trials: Int = 80,
        seed: UInt64 = 42
    ) -> WinRateReport {
        var wins = 0
        var roundSum = 0
        var hpSum = 0
        let focus: PlinkAttackerKind
        let wave: PlinkAttackerKind
        switch role {
        case .bigBoss:
            focus = .raze
            wave = .raze
        case .miniBoss:
            focus = .vix
            wave = .vix
        case .henchman:
            // Ground pack — flyers still appear via random hench pools in live runs.
            focus = .thornbackBeetle
            wave = .thornbackBeetle
        }

        for i in 0..<trials {
            let result = simulateFight(
                role: role,
                wave: wave,
                focus: focus,
                seed: seed &+ UInt64(i) &* 1_000_003
            )
            if result.won {
                wins += 1
                hpSum += result.playerHPLeft
            }
            roundSum += result.rounds
        }
        let rate = Double(wins) / Double(max(1, trials))
        return WinRateReport(
            role: role,
            trials: trials,
            wins: wins,
            winRate: rate,
            meanRounds: Double(roundSum) / Double(max(1, trials)),
            meanHPLeftWhenWon: wins == 0 ? 0 : Double(hpSum) / Double(wins)
        )
    }

    static func reportClimb(trialsPerRole: Int = 60, seed: UInt64 = 7) -> [WinRateReport] {
        [.henchman, .miniBoss, .bigBoss].map {
            winRate(role: $0, trials: trialsPerRole, seed: seed)
        }
    }
}

import XCTest
@testable import abbies_world_ios
import CoreGraphics

/// Headless gold-economy probe — prints shot + fight distributions for tuning.
final class PlinkGoldEconomyProbeTests: XCTestCase {
    func testProbeShotPegHitsAndFightRounds() throws {
        let level = BoardLevel.level(id: "fox.pawPrint") ?? BoardLevel.catalog[0]
        var hitSamples: [Int] = []
        var pegCounts: [Int] = []
        var rng = SeededGenerator(seed: 99)
        for i in 0..<200 {
            let aim = CGFloat.random(in: -0.8...0.8, using: &rng)
            let sample = PlinkBattleBalance.sampleShotDamage(level: level, aimOffset: aim)
            hitSamples.append(sample.pegHits)
            let pack = PlinkContinuum.materialize(
                level: level,
                size: CGSize(width: level.referenceWidth, height: level.referenceHeight),
                tuning: .default
            )
            pegCounts.append(pack.pegs.count)
            _ = i
        }
        hitSamples.sort()
        let meanHits = Double(hitSamples.reduce(0, +)) / Double(hitSamples.count)
        func pct(_ p: Double) -> Int {
            let idx = min(hitSamples.count - 1, Int(Double(hitSamples.count - 1) * p))
            return hitSamples[idx]
        }
        print("GOLD_PROBE board=\(level.id) pegs=\(pegCounts[0])")
        print(
            "GOLD_PROBE pegHits n=200 mean=\(String(format: "%.2f", meanHits)) " +
            "p10=\(pct(0.10)) p50=\(pct(0.50)) p90=\(pct(0.90)) max=\(hitSamples.last!)"
        )

        for role in [MarbleVoyageGangFightRole.henchman, .miniBoss, .bigBoss] {
            var rounds: [Int] = []
            var wins = 0
            for i in 0..<80 {
                let focus: PlinkAttackerKind
                let wave: PlinkAttackerKind
                switch role {
                case .bigBoss: focus = .raze; wave = .raze
                case .miniBoss: focus = .vix; wave = .vix
                case .henchman: focus = .thornbackBeetle; wave = .thornbackBeetle
                }
                let r = PlinkBattleBalance.simulateFight(
                    role: role,
                    wave: wave,
                    focus: focus,
                    seed: 500 &+ UInt64(i) &* 7919
                )
                rounds.append(r.rounds)
                if r.won { wins += 1 }
            }
            rounds.sort()
            let meanR = Double(rounds.reduce(0, +)) / Double(rounds.count)
            let p50 = rounds[rounds.count / 2]
            print(
                "GOLD_PROBE fight role=\(role.rawValue) win=\(String(format: "%.0f%%", Double(wins)/80*100)) " +
                "rounds mean=\(String(format: "%.1f", meanR)) p50=\(p50) " +
                "p10=\(rounds[8]) p90=\(rounds[72])"
            )
        }
    }
}

import Foundation

/// One bad guy in a rescue fight — own HP; fought one-at-a-time in front.
/// Starts on the **right** (`lane = startingLane`) and walks left one square per
/// round until melee (`lane == 0`). Flying foes attack every turn from any lane.
struct PlinkBattleFoe: Identifiable, Equatable, Sendable {
    let id: UUID
    var kind: PlinkAttackerKind
    var maxHP: Int
    var hp: Int
    /// Columns from Abbie: `0` = melee range, higher = farther right.
    var lane: Int

    var isDefeated: Bool { hp <= 0 }

    var shortLabel: String { kind.shortName }

    /// Can swing this round (melee contact, or always if flying).
    var canMeleeThisRound: Bool {
        kind.isFlying || lane <= PeglinBattleRules.meleeLane
    }

    init(
        kind: PlinkAttackerKind,
        maxHP: Int,
        hp: Int? = nil,
        lane: Int = PeglinBattleRules.startingLane,
        id: UUID = UUID()
    ) {
        self.id = id
        self.kind = kind
        self.maxHP = max(1, maxHP)
        self.hp = min(self.maxHP, max(0, hp ?? maxHP))
        self.lane = max(0, min(PeglinBattleRules.laneCount - 1, lane))
    }
}

extension PeglinBattleRules {
    /// Flat AOE to every living bad guy when a bomb peg is touched (lobbed at the cluster).
    static var bombEnemyAOEDamage: Int { PlinkCreepWave.bombAOEDamage }

    /// Melee contact column (Abbie's side).
    static let meleeLane = 0
    /// How many columns the approach track has (right → left).
    static let laneCount = 5
    /// Spawn column — far right. Ground foes need `startingLane` free shots before bite.
    static let startingLane = 4

    /// Per-foe HP — creeps are soft; bosses still chunky.
    static func foeMaxHP(
        for kind: PlinkAttackerKind,
        role: MarbleVoyageGangFightRole? = nil
    ) -> Int {
        switch role {
        case .bigBoss: return 148
        case .miniBoss: return 100
        case .henchman:
            return kind.isFlying ? PlinkCreepWave.henchFlyingHP : PlinkCreepWave.henchGroundHP
        case .none:
            break
        }
        if kind.isNamedCrew {
            switch kind {
            case .raze: return 66
            case .vix: return 56
            case .morrow: return 58
            case .nib: return 44
            default: return 52
            }
        }
        // Flying hench: less HP (they pressure earlier).
        if kind.isFlying { return PlinkCreepWave.henchFlyingHP }
        return PlinkCreepWave.henchGroundHP
    }

    /// Bite damage when this foe reaches melee (or every turn if flying).
    static func foeAttack(
        for kind: PlinkAttackerKind,
        role: MarbleVoyageGangFightRole? = nil
    ) -> Int {
        var base: Int
        switch role {
        case .bigBoss: base = 20
        case .miniBoss: base = 16
        case .henchman: base = kind.isFlying ? 8 : 9
        case .none:
            if kind.isNamedCrew {
                switch kind {
                case .raze: base = 14
                case .vix: base = 12
                case .morrow: base = 13
                case .nib: base = 10
                default: base = 12
                }
            } else {
                base = kind.isFlying ? 8 : 9
            }
        }
        return base
    }

    /// Build the fight roster: focus foe first, then the creep wave / guards.
    /// Lanes stagger so the pack walks in like a Dota wave.
    static func makeRescueRoster(
        wave: PlinkAttackerKind,
        focus: PlinkAttackerKind,
        role: MarbleVoyageGangFightRole?,
        seed: UInt64 = UInt64.random(in: 0...UInt64.max)
    ) -> [PlinkBattleFoe] {
        switch role {
        case .henchman:
            // True creep wave: N copies of the fight's lead kind — one icon, many HP bars.
            let pack = Array(repeating: wave, count: PlinkCreepWave.henchmanCount)
            return pack.enumerated().map { index, kind in
                PlinkBattleFoe(
                    kind: kind,
                    maxHP: foeMaxHP(for: kind, role: .henchman),
                    lane: staggeredLane(index: index)
                )
            }
        case .miniBoss:
            let adds = uniformCreepAdds(
                count: PlinkCreepWave.miniBossAddCount,
                seed: seed,
                excluding: focus
            )
            let pack = [focus] + adds
            return pack.enumerated().map { index, kind in
                let isLead = index == 0
                return PlinkBattleFoe(
                    kind: kind,
                    maxHP: foeMaxHP(for: kind, role: isLead ? .miniBoss : .henchman),
                    lane: staggeredLane(index: index)
                )
            }
        case .bigBoss:
            let adds = uniformCreepAdds(
                count: PlinkCreepWave.bigBossGuardCount,
                seed: seed &+ 3,
                excluding: focus
            )
            let pack = [focus] + adds
            return pack.enumerated().map { index, kind in
                let isLead = index == 0
                return PlinkBattleFoe(
                    kind: kind,
                    maxHP: foeMaxHP(for: kind, role: isLead ? .bigBoss : .henchman),
                    lane: staggeredLane(index: index)
                )
            }
        case .none:
            var order: [PlinkAttackerKind] = [focus]
            for member in PlinkAttackerKind.namedCrew where member != focus {
                order.append(member)
            }
            return order.enumerated().map { index, kind in
                PlinkBattleFoe(
                    kind: kind,
                    maxHP: foeMaxHP(for: kind, role: .none),
                    lane: staggeredLane(index: index)
                )
            }
        }
    }

    /// One seeded creep type, cloned `count` times (never a mixed icon zoo).
    private static func uniformCreepAdds(
        count: Int,
        seed: UInt64,
        excluding: PlinkAttackerKind?
    ) -> [PlinkAttackerKind] {
        guard count > 0 else { return [] }
        var rng = SeededGenerator(seed: seed)
        var pool = MarbleVoyageGangRun.henchmenPool
        if let excluding {
            pool = pool.filter { $0 != excluding }
        }
        let kind = pool.randomElement(using: &rng) ?? .porcupineBoxer
        return Array(repeating: kind, count: count)
    }

    private static func staggeredLane(index: Int) -> Int {
        // Front of wave one step closer; back ranks stay deep.
        max(meleeLane + 1, startingLane - min(index, startingLane - 1))
    }

    /// Stable seed so the versus splash and the board share the same pack.
    static func rescueRosterSeed(
        wave: PlinkAttackerKind,
        focus: PlinkAttackerKind,
        role: MarbleVoyageGangFightRole?,
        climbStage: Int
    ) -> UInt64 {
        var value: UInt64 = 0xC0FFEE
        for byte in wave.rawValue.utf8 { value = value &* 131 &+ UInt64(byte) }
        for byte in focus.rawValue.utf8 { value = value &* 137 &+ UInt64(byte) }
        for byte in (role?.rawValue ?? "none").utf8 { value = value &* 149 &+ UInt64(byte) }
        value = value &* 157 &+ UInt64(max(0, climbStage))
        return value
    }

    /// Ordered attacker kinds for the fight cast card / versus splash (lead first).
    static func rescueCastKinds(from roster: [PlinkBattleFoe]) -> [PlinkAttackerKind] {
        roster.map(\.kind)
    }

    /// Lead-foe HP / ATK for overland cast cards (matches the board roster lead).
    static func previewLeadFoeStats(
        wave: PlinkAttackerKind,
        focus: PlinkAttackerKind,
        role: MarbleVoyageGangFightRole?
    ) -> (hp: Int, atk: Int) {
        let lead: PlinkAttackerKind
        switch role {
        case .henchman: lead = wave
        case .miniBoss, .bigBoss, .none: lead = focus
        }
        return (
            foeMaxHP(for: lead, role: role),
            foeAttack(for: lead, role: role)
        )
    }

    /// End-of-round: ground foes step one square left; return front-foe bite (0 if still marching).
    static func resolveEnemyTurn(
        roster: inout [PlinkBattleFoe],
        frontID: UUID?,
        attackOverride: Int? = nil,
        role: MarbleVoyageGangFightRole? = nil
    ) -> (damage: Int, didAdvance: Bool, attacker: PlinkBattleFoe?) {
        var advanced = false
        for i in roster.indices where !roster[i].isDefeated {
            if !roster[i].kind.isFlying, roster[i].lane > meleeLane {
                roster[i].lane -= 1
                advanced = true
            }
        }
        guard let frontID,
              let idx = roster.firstIndex(where: { $0.id == frontID }),
              !roster[idx].isDefeated
        else {
            return (0, advanced, nil)
        }
        let foe = roster[idx]
        guard foe.canMeleeThisRound else {
            return (0, advanced, foe)
        }
        let atk = attackOverride ?? foeAttack(for: foe.kind, role: role)
        return (max(0, atk), advanced, foe)
    }
}

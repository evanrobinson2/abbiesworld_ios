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
    static let bombEnemyAOEDamage: Int = 16

    /// Melee contact column (Abbie's side).
    static let meleeLane = 0
    /// How many columns the approach track has (right → left).
    static let laneCount = 5
    /// Spawn column — far right. Ground foes need `startingLane` free shots before bite.
    static let startingLane = 4

    /// Per-foe HP (rescue target has none — only these fight).
    static func foeMaxHP(
        for kind: PlinkAttackerKind,
        role: MarbleVoyageGangFightRole? = nil
    ) -> Int {
        switch role {
        case .bigBoss: return 128
        case .miniBoss: return 108
        case .henchman: return 44
        case .none:
            break
        }
        if kind.isNamedCrew {
            switch kind {
            case .raze: return 62
            case .vix: return 54
            case .morrow: return 56
            case .nib: return 42
            default: return 50
            }
        }
        // Flying hench: slightly less HP (they pressure earlier).
        if kind.isFlying { return 32 }
        return 38
    }

    /// Bite damage when this foe reaches melee (or every turn if flying).
    static func foeAttack(
        for kind: PlinkAttackerKind,
        role: MarbleVoyageGangFightRole? = nil
    ) -> Int {
        var base: Int
        switch role {
        case .bigBoss: base = 22
        case .miniBoss: base = 18
        case .henchman: base = 12
        case .none:
            if kind.isNamedCrew {
                switch kind {
                case .raze: base = 15
                case .vix: base = 13
                case .morrow: base = 14
                case .nib: base = 11
                default: base = 13
                }
            } else {
                base = kind.isFlying ? 11 : 12
            }
        }
        return base
    }

    /// Build the fight roster: focus foe first, then the rest of the named crew (or hench pack).
    /// Everyone spawns on the right; staggered so the front foe is one step closer.
    static func makeRescueRoster(
        wave: PlinkAttackerKind,
        focus: PlinkAttackerKind,
        role: MarbleVoyageGangFightRole?,
        seed: UInt64 = UInt64.random(in: 0...UInt64.max)
    ) -> [PlinkBattleFoe] {
        switch role {
        case .henchman:
            var rng = SeededGenerator(seed: seed)
            var pack: [PlinkAttackerKind] = [wave]
            let pool = MarbleVoyageGangRun.henchmenPool.filter { $0 != wave }
            while pack.count < 3, let next = pool.randomElement(using: &rng) {
                if !pack.contains(next) { pack.append(next) }
            }
            return pack.enumerated().map { index, kind in
                PlinkBattleFoe(
                    kind: kind,
                    maxHP: foeMaxHP(for: kind, role: .henchman),
                    lane: max(meleeLane + 1, startingLane - min(index, 1))
                )
            }
        case .miniBoss, .bigBoss, .none:
            // Big boss is a solo showdown. Mini-boss brings one hanger-on.
            // Full named-crew chrome still highlights on the approach strip via portraits.
            if role == .bigBoss {
                return [
                    PlinkBattleFoe(
                        kind: focus,
                        maxHP: foeMaxHP(for: focus, role: .bigBoss),
                        lane: startingLane
                    )
                ]
            }
            if role == .miniBoss {
                let hanger = PlinkAttackerKind.namedCrew.first { $0 != focus } ?? .nib
                return [
                    PlinkBattleFoe(
                        kind: focus,
                        maxHP: foeMaxHP(for: focus, role: .miniBoss),
                        lane: startingLane
                    ),
                    PlinkBattleFoe(
                        kind: hanger,
                        maxHP: foeMaxHP(for: hanger, role: .henchman),
                        lane: startingLane
                    ),
                ]
            }
            var order: [PlinkAttackerKind] = [focus]
            for member in PlinkAttackerKind.namedCrew where member != focus {
                order.append(member)
            }
            return order.enumerated().map { index, kind in
                PlinkBattleFoe(
                    kind: kind,
                    maxHP: foeMaxHP(for: kind, role: .none),
                    lane: max(meleeLane + 1, startingLane - min(index, 1))
                )
            }
        }
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

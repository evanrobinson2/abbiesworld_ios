import SwiftUI
import SpriteKit
#if canImport(UIKit)
import UIKit
#endif

/// Board knobs a Marble Voyage run hands to one fight (gold economy + charm stacks).
struct PlinkVoyageTunables: Equatable, Sendable {
    /// Fraction of blue/orange pegs that roll gold.
    var goldPegPrevalence: Double = MarbleVoyageEconomyTuning.recommended.goldPegPrevalence
    /// Coins per gold peg, Moon Gleam already applied.
    var goldPegValue: Int = MarbleVoyageEconomyTuning.recommended.goldPegValue
    /// Marble levels × run ball level.
    var ballDamageMultiplier: Double = 1
    /// Extra crit/refresh pegs from Cycle.
    var cycleExtra: Int = 0
    /// Coins per bomb clear from Sock Snatch.
    var sockSnatch: Int = 0
    /// Cage bonus on long orange streaks from Prism Burst.
    var prismBonus: Int = 0
    /// Flat bite reduction from Soft Purr.
    var softPurr: Int = 0
}

/// Peglin rescue battle: deck → board → damage **front bad guy**; bombs lob AOE at the cluster.
/// Rescue target is held back with **no HP** — free them by defeating every foe.
struct PlinkBattleHostView: View {
    var title: String = "Battle Clearing"
    /// Friend being held back (no HP) — Fox / Burrow Jackal / Hare / Stag.
    /// Prefer `foxSpirit` / `burrowJackal`; never use gangFox here.
    var enemyKind: PeglinEnemyKind? = nil
    /// Explicit wave attacker override. When nil, cycles badguy gang via `climbStage`.
    var waveAttackerOverride: PlinkAttackerKind? = nil
    /// Climb stage hint for cycling gang members (1-based). Scaffolding only.
    var climbStage: Int = 1
    /// Attacker portrait scale (3× big boss). Applied to the active named crew bust.
    var attackerPortraitScale: CGFloat = 1
    /// Mini-arc head / big boss for chrome when the wave foe is a henchman.
    var focusCrewMember: PlinkAttackerKind? = nil
    /// Gang-run role for chrome labels (hench / mini / big).
    var gangFightRole: MarbleVoyageGangFightRole? = nil
    /// Same semantic plate as the land the player just left (e.g. `map.peglin.bramble`).
    var sceneBackgroundAsset: String = ""
    /// Player key for durable power-up inventory.
    var playerID: String? = nil
    /// Voyage / carried HP — when set, fight starts at this value (clamped to max).
    var startingPlayerHP: Int? = nil
    /// Optional Abbie HP cap (Marble Voyage difficulty curve). Cage HP overrides ignored.
    var overrideEnemyMaxHP: Int? = nil
    var overridePlayerMaxHP: Int? = nil
    /// Optional attacker ATK per round (voyage rising difficulty; scaffolding for multi-foe).
    var overrideEnemyAttack: Int? = nil
    /// Gold economy + charm stacks from the voyage run (nil outside Marble Voyage).
    var voyageEconomy: PlinkVoyageTunables? = nil
    var onExit: () -> Void
    var onVictory: (() -> Void)? = nil
    /// `(won, remainingPlayerHP, coinsEarned)` — used by voyage runs that persist HP + wallet.
    var onBattleEnded: ((Bool, Int, Int) -> Void)? = nil
    /// Automation / debug: seed a mix deck and jump straight into the versus intro.
    var autoStartFight: Bool = false

    private enum Stage {
        case deck
        case fight
    }

    @State private var stage: Stage = .deck
    @State private var deck: [String] = []
    @State private var sessionID = UUID()
    @State private var phaseLabel = "DECK"
    @State private var statusLine = "Build a deck of 10 orbs"
    @State private var bridge: PlinkBattleBridge?
    @State private var abbieState: PeglinCharacterState = .happy
    @State private var enemyState: PeglinCharacterState = .idle
    /// Current wave attacker pose (dive flash on cage rattle).
    @State private var attackerPose: PlinkAttackerPose = .idle
    @State private var enemyHP = 0
    @State private var enemyMaxHP = 0
    @State private var foeRoster: [PlinkBattleFoe] = []
    @State private var frontFoeID: UUID?
    @State private var bombLobFlash = false
    @State private var playerHP = 0
    @State private var playerMaxHP = 0
    @State private var ballsLeft = 10
    @State private var shotScore = 0
    @State private var showBanner = false
    @State private var bannerTitle = ""
    @State private var bannerBody = ""
    @State private var fightIntroProgress: CGFloat = 0
    @State private var showVersusIntro = false
    @State private var playerHPFloat: HPFloat?
    @State private var enemyHPFloat: HPFloat?
    @State private var damageFlights: [DamageFlight] = []
    @State private var damageFlightProgress: [UUID: CGFloat] = [:]
    @State private var playerShake: CGFloat = 0
    @State private var enemyShake: CGFloat = 0
    @State private var playerImpactFlash = false
    @State private var enemyImpactFlash = false
    @State private var boardFrame: CGRect = .zero
    @State private var playerBannerFrame: CGRect = .zero
    @State private var enemyBannerFrame: CGRect = .zero
    @State private var lastEnemyTallyAt: Date = .distantPast
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var favoriteSlots: [ParbleFavoriteSlot?] = ParbleFavoriteStore.load()
    @State private var emojiPickerSlot: Int? = nil
    @State private var battleRounds: [BattleRound] = []
    @State private var totalDamageDealt = 0
    @State private var totalDamageTaken = 0
    @State private var feedAttentionToken = UUID()
    @State private var feedHighlightRoundID: UUID?
    @State private var feedGlow = false
    /// Flying copies from catalog taps → deck slots (spam-friendly; no button fade).
    @State private var marbleFlights: [MarbleFlight] = []
    @State private var orbCatalogFrames: [String: CGRect] = [:]
    @State private var deckSlotFrames: [Int: CGRect] = [:]
    @State private var powerUpCounts: [PlinkPowerUp: Int] = [:]
    @State private var cageShattered = false
    @State private var fightReadyPulse = false
    @State private var didAnnounceReady = false
    @State private var showMusicDetail = false
    @StateObject private var music = PlinkMusicService()

    private struct MarbleFlight: Identifiable, Equatable {
        let id: UUID
        let orbID: String
        var position: CGPoint
        let slotIndex: Int
    }

    private struct HPFloat: Identifiable, Equatable {
        let id = UUID()
        let text: String
        let isHeal: Bool
    }

    private struct DamageFlight: Identifiable, Equatable {
        let id: UUID
        let amount: Int
        let hitsPlayer: Bool
    }

    private struct BattleRound: Identifiable, Equatable {
        let id = UUID()
        let number: Int
        let damageToEnemy: Int
        let damageToPlayer: Int
        var highlights: [String] = []
    }

    var body: some View {
        ZStack {
            scenePlate
                .ignoresSafeArea()

            Color.black.opacity(stage == .deck ? 0.42 : 0.18)
                .ignoresSafeArea()
                .allowsHitTesting(false)

            // World2Root ignoresSafeArea, so SwiftUI insets are 0 here — pad from the
            // real UIWindow safe area + corner margin so Leave/Orbs aren't bezel-clipped.
            Group {
                switch stage {
                case .deck:
                    deckBuilder
                case .fight:
                    ZStack {
                        fightLayer
                        if showVersusIntro {
                            PlinkBattleVersusIntroView(
                                title: title,
                                enemyKind: enemyKind,
                                badGuys: PlinkAttackerKind.namedCrew,
                                focusBadGuy: chromeFocusCrew,
                                reduceMotion: reduceMotion,
                                onRevealBoard: {
                                    music.playBoard()
                                    PlinkSFX.play(.win)
                                    unpauseBoardAfterVersus()
                                    withAnimation(.spring(response: 0.55, dampingFraction: 0.78)) {
                                        fightIntroProgress = 1
                                    }
                                },
                                onFinished: {
                                    showVersusIntro = false
                                }
                            )
                            .ignoresSafeArea()
                            .zIndex(40)
                        }
                    }
                }
            }
            .padding(chromeInsets)
        }
        .accessibilityIdentifier("world2.plink.battle")
        .onAppear {
            MusicService.shared.stop()
            music.playSafari()
            rebuildFoeRoster()
            playerMaxHP = overridePlayerMaxHP ?? PeglinBattleRules.playerMaxHP(for: enemyKind)
            if let startingPlayerHP {
                playerHP = max(1, min(playerMaxHP, startingPlayerHP))
            } else {
                playerHP = playerMaxHP
            }
            powerUpCounts = PlinkPowerUpStore.counts(for: playerID)
            PeglinEdition.log(
                "battle_lobby",
                [
                    "enemy": enemyKind?.rawValue ?? "crash",
                    "foes": "\(foeRoster.count)",
                    "front_hp": "\(enemyMaxHP)",
                    "player_hp": "\(playerHP)",
                    "plate": sceneBackgroundAsset,
                ]
            )
            if autoStartFight, stage == .deck {
                deck = (0..<PeglinBattleRules.mixFillCount).map { _ in
                    OrbKind.all.randomElement()?.id ?? OrbKind.sparkle.id
                }
                startFight()
            }
        }
        .onDisappear {
            tearDown()
            music.stop()
            PeglinEdition.log("battle_exit", ["session": sessionID.uuidString])
        }
    }

    private var scenePlate: some View {
        Group {
            if !sceneBackgroundAsset.isEmpty {
                MarbleVoyageUnclippedPlate(
                    semanticName: sceneBackgroundAsset,
                    fallbackIcon: "leaf.fill",
                    fallbackLabel: title,
                    letterbox: Color(red: 0.04, green: 0.08, blue: 0.14)
                )
            } else {
                LinearGradient(
                    colors: [
                        Color(red: 0.12, green: 0.28, blue: 0.22),
                        Color(red: 0.04, green: 0.08, blue: 0.14),
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var resolvedEnemyAttack: Int {
        if let overrideEnemyAttack { return overrideEnemyAttack }
        if let front = frontFoe {
            return PeglinBattleRules.foeAttack(for: front.kind, role: gangFightRole)
        }
        return PeglinBattleRules.enemyCounterAttack(for: enemyKind)
    }

    /// Current-wave attacker from the named badguy gang (Raze→Vix→Morrow→Nib).
    /// Strip shows the full crew; forest fauna via biome override later.
    private var waveAttacker: PlinkAttackerKind {
        waveAttackerOverride
            ?? PlinkAttackerKind.forClimbStage(climbStage, roster: .badguyGang)
    }

    /// Named crew to highlight in chrome (mini-arc head or big boss); falls back to wave foe.
    private var chromeFocusCrew: PlinkAttackerKind {
        if let focusCrewMember, focusCrewMember.isNamedCrew { return focusCrewMember }
        if waveAttacker.isNamedCrew { return waveAttacker }
        return PlinkAttackerKind.forClimbStage(climbStage, roster: .badguyGang)
    }

    private var frontFoe: PlinkBattleFoe? {
        if let id = frontFoeID { return foeRoster.first(where: { $0.id == id }) }
        return foeRoster.first(where: { !$0.isDefeated })
    }

    private func rebuildFoeRoster() {
        let roster = PeglinBattleRules.makeRescueRoster(
            wave: waveAttacker,
            focus: chromeFocusCrew,
            role: gangFightRole
        )
        foeRoster = roster
        frontFoeID = roster.first?.id
        if let front = roster.first {
            enemyMaxHP = front.maxHP
            enemyHP = front.hp
        }
    }

    private func syncFrontFoeIntoScene() {
        guard let front = frontFoe else { return }
        enemyMaxHP = front.maxHP
        enemyHP = front.hp
        bridge?.scene.loadFrontFoe(maxHP: front.maxHP, currentHP: front.hp)
    }

    private func applyFrontDamage(_ amount: Int) {
        guard amount > 0, let id = frontFoe?.id,
              let idx = foeRoster.firstIndex(where: { $0.id == id }) else { return }
        foeRoster[idx].hp = max(0, foeRoster[idx].hp - amount)
        enemyHP = foeRoster[idx].hp
    }

    private func applyBombAOE(_ amount: Int) {
        guard amount > 0 else { return }
        withAnimation(.spring(response: 0.35, dampingFraction: 0.7)) {
            bombLobFlash = true
        }
        for i in foeRoster.indices where !foeRoster[i].isDefeated {
            foeRoster[i].hp = max(0, foeRoster[i].hp - amount)
        }
        if let id = frontFoeID, let idx = foeRoster.firstIndex(where: { $0.id == id }) {
            enemyHP = foeRoster[idx].hp
            bridge?.scene.loadFrontFoe(maxHP: foeRoster[idx].maxHP, currentHP: foeRoster[idx].hp)
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.55) {
            withAnimation(.easeOut(duration: 0.2)) { bombLobFlash = false }
        }
    }

    /// Front foe down — promote next living foe (`false`), or rescue complete (`true`).
    private func advanceFrontFoeOrRescue() -> Bool {
        if let id = frontFoeID, let idx = foeRoster.firstIndex(where: { $0.id == id }) {
            foeRoster[idx].hp = 0
        }
        if let next = foeRoster.first(where: { !$0.isDefeated }) {
            frontFoeID = next.id
            syncFrontFoeIntoScene()
            let fly = next.kind.isFlying ? " · flying!" : " · lane \(next.lane)"
            statusLine = "\(next.shortLabel) steps up!\(fly) \(next.hp)/\(next.maxHP)"
            return false
        }
        frontFoeID = nil
        enemyHP = 0
        return true
    }

    /// End of shot: ground foes walk one square left; front foe bites if melee (or always if flying).
    @discardableResult
    private func resolveEnemyApproachAndMelee() -> Int {
        let result = PeglinBattleRules.resolveEnemyTurn(
            roster: &foeRoster,
            frontID: frontFoeID,
            attackOverride: overrideEnemyAttack,
            role: gangFightRole
        )
        withAnimation(.spring(response: 0.45, dampingFraction: 0.78)) {
            // Trigger view refresh for lane offsets.
            foeRoster = foeRoster
        }
        if result.damage > 0 {
            phaseLabel = "MELEE"
            // Soft Purr takes the edge off every bite, but a bite always lands.
            return max(1, result.damage - (voyageEconomy?.softPurr ?? 0))
        }
        if result.didAdvance, let foe = result.attacker {
            phaseLabel = "APPROACH"
            statusLine = foe.kind.isFlying
                ? "\(foe.shortLabel) circles overhead"
                : "\(foe.shortLabel) advances · \(foe.lane) squares out"
        }
        return 0
    }

    private var deckCrewCaption: String {
        switch gangFightRole {
        case .bigBoss:
            return "BIG BOSS · \(chromeFocusCrew.displayName) · front fight · bomb AOE"
        case .miniBoss:
            return "Mini-boss · \(chromeFocusCrew.displayName) · one at a time"
        case .henchman:
            return "\(chromeFocusCrew.shortName)’s hench pack · one at a time"
        case .none:
            return "Rescue · defeat bad guys one at a time · bomb = AOE"
        }
    }

    private var deckCrewStrip: some View {
        let focus = chromeFocusCrew
        let activeScale = max(1, attackerPortraitScale)
        return HStack(alignment: .bottom, spacing: 4) {
            if !waveAttacker.isNamedCrew {
                PlinkAttackerBattlePortrait(kind: waveAttacker, pose: .idle, size: 56)
            }
            ForEach(PlinkAttackerKind.namedCrew) { member in
                let isFocus = member == focus
                let size: CGFloat = isFocus ? 44 * min(activeScale, 3) : 36
                PlinkAttackerBattlePortrait(
                    kind: member,
                    pose: .idle,
                    size: size
                )
                .opacity(isFocus ? 1 : 0.55)
            }
        }
    }

    // MARK: - Deck builder (directed parble pick)

    private var deckBuilder: some View {
        ZStack {
            VStack(spacing: 14) {
                HStack {
                    leaveButton
                    Spacer()
                    musicPlayerOverlay
                }

                ScrollView(.vertical, showsIndicators: false) {
                    VStack(spacing: 16) {
                        HStack(alignment: .center, spacing: 16) {
                            PeglinAbbieBattlePortrait(state: .happy, size: 88)
                            VStack(alignment: .leading, spacing: 4) {
                                Text(title)
                                    .font(.system(size: 15, weight: .bold, design: .rounded))
                                    .foregroundStyle(Color(red: 0.55, green: 0.9, blue: 0.65))
                                Text("Choose your Parbles")
                                    .font(.system(size: 26, weight: .heavy, design: .rounded))
                                    .foregroundStyle(.white)
                                Text("Tap an orb — drop as fast as you like (up to \(PeglinBattleRules.maxDeckCount)). Ready after \(PeglinBattleRules.readyDeckCount)!")
                                    .font(.system(size: 14, weight: .medium, design: .rounded))
                                    .foregroundStyle(.white.opacity(0.9))
                                    .fixedSize(horizontal: false, vertical: true)
                                Text("Cage \(enemyMaxHP) · Free the \(enemyKind?.shortName ?? "friend") · You \(playerMaxHP) HP")
                                    .font(.system(size: 13, weight: .semibold, design: .rounded))
                                    .foregroundStyle(Color(red: 0.55, green: 0.9, blue: 0.65))
                                Text(deckCrewCaption)
                                    .font(.system(size: 12, weight: .bold, design: .rounded))
                                    .foregroundStyle(Color(red: 1, green: 0.7, blue: 0.4))
                            }
                            Spacer(minLength: 8)
                            deckCrewStrip
                            if let enemyKind {
                                PeglinEnemyBattlePortrait(kind: enemyKind, state: .idle, size: 88)
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 16)
                        .background(.black.opacity(0.45), in: RoundedRectangle(cornerRadius: 20, style: .continuous))

                        VStack(alignment: .center, spacing: 8) {
                            Text("Your deck · \(deck.count)\(deck.isEmpty ? "" : " · tap to remove")")
                                .font(.system(size: 13, weight: .bold, design: .rounded))
                                .foregroundStyle(.white.opacity(0.8))
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 7) {
                                    // Filled marbles + one empty “next” slot (hidden at the 10-marble cap).
                                    let slotCount = min(
                                        PeglinBattleRules.maxDeckCount,
                                        deck.count + (deck.count < PeglinBattleRules.maxDeckCount ? 1 : 0)
                                    )
                                    ForEach(0..<slotCount, id: \.self) { i in
                                        deckSlot(i)
                                    }
                                }
                                .padding(.horizontal, 2)
                            }
                        }
                        .padding(14)
                        .frame(maxWidth: .infinity)
                        .background(.black.opacity(0.35), in: RoundedRectangle(cornerRadius: 18, style: .continuous))

                        HStack(spacing: 14) {
                            ForEach(OrbKind.all) { orb in
                                Button {
                                    dropOrbIntoDeck(orb.id)
                                } label: {
                                    VStack(spacing: 10) {
                                        orbThumb(orb)
                                            .frame(width: 76, height: 76)
                                            .background(
                                                GeometryReader { geo in
                                                    Color.clear.preference(
                                                        key: PlinkOrbCatalogFrameKey.self,
                                                        value: [
                                                            orb.id: geo.frame(in: .named("plinkDeckBuilder")),
                                                        ]
                                                    )
                                                }
                                            )
                                        Text(orb.name)
                                            .font(.system(size: 15, weight: .heavy, design: .rounded))
                                            .foregroundStyle(.white)
                                        Text(orb.blurb)
                                            .font(.system(size: 11, weight: .medium, design: .rounded))
                                            .foregroundStyle(.white.opacity(0.72))
                                            .multilineTextAlignment(.center)
                                            .frame(width: 120)
                                    }
                                    .padding(.horizontal, 14)
                                    .padding(.vertical, 14)
                                    .background(
                                        RoundedRectangle(cornerRadius: 20, style: .continuous)
                                            .fill(Color.black.opacity(0.42))
                                            .overlay(
                                                RoundedRectangle(cornerRadius: 20, style: .continuous)
                                                    .stroke(Color.white.opacity(0.22), lineWidth: 1.5)
                                            )
                                    )
                                }
                                .buttonStyle(.plain)
                                .accessibilityIdentifier("world2.plink.battle.orb.\(orb.id)")
                            }
                        }
                        .frame(maxWidth: .infinity)
                    }
                }

                deckActionBar
            }

            ForEach(marbleFlights) { flight in
                if let orb = OrbKind.all.first(where: { $0.id == flight.orbID }) {
                    orbThumb(orb)
                        .frame(width: 52, height: 52)
                        .shadow(color: .black.opacity(0.35), radius: 8, y: 3)
                        .position(flight.position)
                        .allowsHitTesting(false)
                        .zIndex(80)
                        .accessibilityHidden(true)
                }
            }
        }
        .coordinateSpace(name: "plinkDeckBuilder")
        .onPreferenceChange(PlinkOrbCatalogFrameKey.self) { orbCatalogFrames = $0 }
        .onPreferenceChange(PlinkDeckSlotFrameKey.self) { deckSlotFrames = $0 }
        .onChange(of: deck.count) { oldCount, newCount in
            handleDeckReadyCue(from: oldCount, to: newCount)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .sheet(item: Binding(
            get: { emojiPickerSlot.map { EmojiPickerToken(slot: $0) } },
            set: { emojiPickerSlot = $0?.slot }
        )) { token in
            ParbleHeartIconPickerSheet { iconID in
                saveFavorite(slot: token.slot, iconID: iconID)
                emojiPickerSlot = nil
            } onCancel: {
                emojiPickerSlot = nil
            }
            .presentationDetents([.height(260)])
            .presentationDragIndicator(.visible)
        }
    }

    /// Tool row on top; play sits underneath. Lights up at 1 marble; gets panache at 3+.
    private var deckActionBar: some View {
        let canFight = deck.count >= 1
        let isReady = deck.count >= PeglinBattleRules.readyDeckCount
        return VStack(spacing: 12) {
            HStack(spacing: 14) {
                deckIconButton(
                    systemName: "eraser.fill",
                    label: "Erase deck",
                    tint: Color.white.opacity(0.16),
                    id: "erase"
                ) {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                        deck.removeAll()
                        didAnnounceReady = false
                        fightReadyPulse = false
                    }
                }

                deckIconButton(
                    systemName: "dice.fill",
                    label: "Random mix",
                    tint: Color(red: 0.45, green: 0.55, blue: 0.95).opacity(0.85),
                    id: "random"
                ) {
                    withAnimation(.spring(response: 0.35, dampingFraction: 0.78)) {
                        deck = (0..<PeglinBattleRules.mixFillCount).map { _ in
                            OrbKind.all.randomElement()?.id ?? OrbKind.sparkle.id
                        }
                    }
                }

                deckIconButton(
                    systemName: "line.3.horizontal",
                    label: "Even mix",
                    tint: Color(red: 0.35, green: 0.78, blue: 0.65).opacity(0.85),
                    id: "even"
                ) {
                    withAnimation(.spring(response: 0.35, dampingFraction: 0.78)) {
                        deck = Self.evenMixDeck()
                    }
                }

                ForEach(0..<ParbleFavoriteStore.slotCount, id: \.self) { slot in
                    favoriteHeartButton(slot: slot)
                }
            }

            Button {
                PlinkSFX.play(.ui)
                startFight()
            } label: {
                HStack(spacing: 10) {
                    Image(systemName: isReady ? "bolt.fill" : "play.fill")
                        .font(.system(size: 22, weight: .black))
                        .symbolEffect(.bounce, value: fightReadyPulse)
                    Text(fightButtonTitle(canFight: canFight, isReady: isReady))
                        .font(.system(size: 18, weight: .heavy, design: .rounded))
                }
                .foregroundStyle(.white)
                .frame(maxWidth: 420)
                .padding(.vertical, 16)
                .background(
                    Capsule().fill(
                        canFight
                            ? (isReady
                               ? Color(red: 0.18, green: 0.72, blue: 0.95)
                               : Color(red: 0.22, green: 0.78, blue: 0.42))
                            : Color.white.opacity(0.14)
                    )
                )
                .overlay(
                    Capsule().stroke(
                        canFight ? Color.white.opacity(0.65) : Color.white.opacity(0.18),
                        lineWidth: canFight ? (isReady ? 3.5 : 2.5) : 1.5
                    )
                )
                .shadow(
                    color: canFight
                        ? (isReady
                           ? Color(red: 0.35, green: 0.85, blue: 1).opacity(0.7)
                           : Color(red: 0.25, green: 0.9, blue: 0.45).opacity(0.55))
                        : .clear,
                    radius: canFight ? (isReady ? 18 : 14) : 0,
                    y: 2
                )
            }
            .buttonStyle(.plain)
            .disabled(!canFight)
            .scaleEffect(isReady && fightReadyPulse ? 1.07 : (canFight ? 1.0 : 0.98))
            .animation(.spring(response: 0.42, dampingFraction: 0.62), value: fightReadyPulse)
            .animation(.spring(response: 0.35, dampingFraction: 0.78), value: isReady)
            .accessibilityLabel(canFight ? "Fight with \(deck.count) marbles" : "Add a marble to fight")
            .accessibilityIdentifier("world2.plink.battle.start")
        }
        .frame(maxWidth: .infinity)
    }

    private func fightButtonTitle(canFight: Bool, isReady: Bool) -> String {
        if !canFight { return "Add a marble to fight" }
        if isReady {
            return "Ready! · \(deck.count) marble\(deck.count == 1 ? "" : "s")"
        }
        return "Fight · \(deck.count) marble\(deck.count == 1 ? "" : "s")"
    }

    private func handleDeckReadyCue(from oldCount: Int, to newCount: Int) {
        if newCount < PeglinBattleRules.readyDeckCount {
            didAnnounceReady = false
            fightReadyPulse = false
            return
        }
        guard newCount >= PeglinBattleRules.readyDeckCount,
              oldCount < PeglinBattleRules.readyDeckCount,
              !didAnnounceReady else { return }
        didAnnounceReady = true
        PlinkSFX.play(.ready)
        withAnimation(.spring(response: 0.38, dampingFraction: 0.55)) {
            fightReadyPulse = true
        }
        // Soft settle so the button keeps a gentle living pulse while ready.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.55) {
            withAnimation(.easeInOut(duration: 0.9).repeatForever(autoreverses: true)) {
                fightReadyPulse = true
            }
        }
    }

    private func deckIconButton(
        systemName: String,
        label: String,
        tint: Color,
        id: String,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            Image(systemName: systemName)
                .font(.system(size: 26, weight: .black))
                .foregroundStyle(.white)
                .frame(width: 64, height: 64)
                .background(Circle().fill(tint))
                .overlay(Circle().stroke(.white.opacity(0.28), lineWidth: 1.5))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
        .accessibilityIdentifier("world2.plink.battle.\(id)")
    }

    private func favoriteHeartButton(slot: Int) -> some View {
        let saved = slot < favoriteSlots.count ? favoriteSlots[slot] : nil
        let tile = saved.flatMap { ParbleHeartIcon.tile(for: $0.iconID) }
        return Button {
            if let saved {
                withAnimation(.spring(response: 0.35, dampingFraction: 0.78)) {
                    deck = saved.deck
                }
            } else if !deck.isEmpty {
                emojiPickerSlot = slot
            }
        } label: {
            ZStack {
                Circle()
                    .fill(
                        saved == nil
                            ? Color.white.opacity(0.12)
                            : (tile?.tint ?? Color(red: 0.95, green: 0.35, blue: 0.45)).opacity(0.92)
                    )
                    .frame(width: 64, height: 64)
                    .overlay(Circle().stroke(.white.opacity(0.28), lineWidth: 1.5))

                if let tile {
                    Image(systemName: tile.systemName)
                        .font(.system(size: 28, weight: .black))
                        .foregroundStyle(.white)
                        .symbolRenderingMode(.hierarchical)
                } else {
                    Image(systemName: "heart")
                        .font(.system(size: 26, weight: .black))
                        .foregroundStyle(.white.opacity(0.85))
                }
            }
        }
        .buttonStyle(.plain)
        .disabled(saved == nil && deck.isEmpty)
        .opacity(saved == nil && deck.isEmpty ? 0.45 : 1)
        .contextMenu {
            if saved != nil {
                Button("Replace with current deck", systemImage: "arrow.triangle.2.circlepath") {
                    guard !deck.isEmpty else { return }
                    emojiPickerSlot = slot
                }
                Button("Clear heart", systemImage: "trash", role: .destructive) {
                    clearFavorite(slot: slot)
                }
            } else if !deck.isEmpty {
                Button("Save deck here", systemImage: "heart.fill") {
                    emojiPickerSlot = slot
                }
            }
        }
        .accessibilityLabel(
            saved.flatMap { ParbleHeartIcon.tile(for: $0.iconID)?.label }.map { "Favorite \($0). Tap to load." }
                ?? "Empty heart \(slot + 1). Add marbles then tap to save."
        )
        .accessibilityIdentifier("world2.plink.battle.heart.\(slot)")
    }

    private static func evenMixDeck() -> [String] {
        let kinds = OrbKind.all.map(\.id)
        var out: [String] = []
        var i = 0
        while out.count < PeglinBattleRules.mixFillCount {
            out.append(kinds[i % kinds.count])
            i += 1
        }
        return out
    }

    private func saveFavorite(slot: Int, iconID: String) {
        guard !deck.isEmpty else { return }
        var next = favoriteSlots
        while next.count < ParbleFavoriteStore.slotCount { next.append(nil) }
        next[slot] = ParbleFavoriteSlot(iconID: iconID, deck: deck)
        favoriteSlots = next
        ParbleFavoriteStore.save(next)
        PeglinEdition.log("parble_favorite_saved", ["slot": "\(slot)", "icon": iconID])
    }

    private func clearFavorite(slot: Int) {
        var next = favoriteSlots
        while next.count < ParbleFavoriteStore.slotCount { next.append(nil) }
        next[slot] = nil
        favoriteSlots = next
        ParbleFavoriteStore.save(next)
    }

    /// Real device insets (parent ignoresSafeArea + statusBarHidden often zero SwiftUI/UIKit
    /// top inset). Use large floor values so center titles clear the continuous bezel.
    private var chromeInsets: EdgeInsets {
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        let windows = scenes.flatMap(\.windows)
        let inset = (windows.first(where: \.isKeyWindow) ?? windows.first)?.safeAreaInsets ?? .zero
        // Floors beat the iPad rounded display; statusBarHidden makes inset.top == 0.
        return EdgeInsets(
            top: max(inset.top, 44) + 12,
            leading: max(inset.left, 28) + 8,
            bottom: max(inset.bottom, 24) + 8,
            trailing: max(inset.right, 28) + 8
        )
    }

    private func deckSlot(_ i: Int) -> some View {
        let id = i < deck.count ? deck[i] : nil
        return ZStack {
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(Color.black.opacity(0.45))
                .overlay(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .stroke(
                            id == nil
                                ? Color.white.opacity(0.18)
                                : Color(red: 0.55, green: 0.9, blue: 0.7).opacity(0.55),
                            lineWidth: 1.5
                        )
                )
                .frame(width: 54, height: 54)
            if let id, let orb = OrbKind.all.first(where: { $0.id == id }) {
                orbThumb(orb)
                    .frame(width: 46, height: 46)
                    .onTapGesture {
                        withAnimation(.spring(response: 0.28, dampingFraction: 0.75)) {
                            if i < deck.count { deck.remove(at: i) }
                        }
                    }
            } else {
                Text("\(i + 1)")
                    .font(.system(size: 13, weight: .bold, design: .rounded))
                    .foregroundStyle(.white.opacity(0.35))
            }
        }
        .background(
            GeometryReader { geo in
                Color.clear.preference(
                    key: PlinkDeckSlotFrameKey.self,
                    value: [i: geo.frame(in: .named("plinkDeckBuilder"))]
                )
            }
        )
    }

    private func orbThumb(_ orb: OrbKind) -> some View {
        Group {
            if UIImage(named: orb.catalogImageName) != nil {
                Image(orb.catalogImageName)
                    .resizable()
                    .scaledToFit()
            } else {
                Circle()
                    .fill(Color.orange.opacity(0.8))
                    .overlay(Text(String(orb.name.prefix(1))).font(.caption.bold()))
            }
        }
    }

    private func dropOrbIntoDeck(_ id: String) {
        let pending = marbleFlights.count
        guard deck.count + pending < PeglinBattleRules.maxDeckCount else {
            PlinkSFX.play(.miss)
            return
        }
        let slotIndex = deck.count + pending
        let startRect = orbCatalogFrames[id]
        let endRect = deckSlotFrames[slotIndex] ?? deckSlotFrames[max(0, deck.count)]

        PlinkSFX.play(.drop)
        PeglinEdition.log("parble_picked", ["orb": id, "count": "\(deck.count + pending + 1)"])

        guard let startRect, let endRect else {
            deck.append(id)
            return
        }

        let start = CGPoint(x: startRect.midX, y: startRect.midY)
        let end = CGPoint(x: endRect.midX, y: endRect.midY)
        let flightID = UUID()
        marbleFlights.append(MarbleFlight(id: flightID, orbID: id, position: start, slotIndex: slotIndex))

        // Next frame so the overlay renders at the origin before the tween.
        DispatchQueue.main.async {
            withAnimation(.spring(response: 0.34, dampingFraction: 0.82)) {
                if let idx = marbleFlights.firstIndex(where: { $0.id == flightID }) {
                    marbleFlights[idx].position = end
                }
            }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.36) {
            guard marbleFlights.contains(where: { $0.id == flightID }) else { return }
            if deck.count < PeglinBattleRules.maxDeckCount {
                deck.append(id)
            }
            marbleFlights.removeAll { $0.id == flightID }
        }
    }

    private func addOrb(_ id: String) {
        dropOrbIntoDeck(id)
    }

    // MARK: - Fight

    private var fightLayer: some View {
        ZStack {
            VStack(spacing: MarbleVoyageDesignRules.maxFightChromeBoardSpacing) {
                fightTopBar
                    .opacity(Double(fightIntroProgress))

                fightPortraitBar
                    .opacity(Double(fightIntroProgress))

                ZStack(alignment: .topTrailing) {
                    fightBoardPane
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .clipped()
                        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
                        .background(
                            GeometryReader { geo in
                                Color.clear.preference(
                                    key: PlinkBattleBoardFrameKey.self,
                                    value: geo.frame(in: .named("plinkBattleSpace"))
                                )
                            }
                        )

                    // Hit transcript — top-right overlay; width from design contract.
                    battleFeedPane
                        .frame(width: MarbleVoyageDesignRules.battleFeedMinWidth)
                        .padding(.top, 10)
                        .padding(.trailing, 10)
                        .opacity(Double(fightIntroProgress))
                        .zIndex(5)

                    // Power-ups: big graphic-only buttons, left-bottom stack for small hands.
                    powerUpOverlay
                        .padding(.leading, 12)
                        .padding(.bottom, 14)
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomLeading)
                        .opacity(Double(fightIntroProgress))
                        .zIndex(6)

                    // Music transport — bottom-right (tap title for detail tile).
                    musicPlayerOverlay
                        .padding(.trailing, 12)
                        .padding(.bottom, 12)
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
                        .opacity(Double(fightIntroProgress))
                        .zIndex(6)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            ForEach(damageFlights) { flight in
                flyingDamageChip(flight)
                    .allowsHitTesting(false)
                    .zIndex(90)
            }
        }
        .coordinateSpace(name: "plinkBattleSpace")
        .onPreferenceChange(PlinkBattleBoardFrameKey.self) { boardFrame = $0 }
        .onPreferenceChange(PlinkBattleBannerFrameKey.self) { frames in
            if let player = frames[true] { playerBannerFrame = player }
            if let enemy = frames[false] { enemyBannerFrame = enemy }
        }
    }

    /// Graphic-only power chips stacked up the left-bottom (kid-reachable).
    /// The icon art *is* the button — no separate misaligned ring.
    private var powerUpOverlay: some View {
        VStack(spacing: 14) {
            ForEach(Array(PlinkPowerUp.allCases.reversed())) { kind in
                let n = powerUpCounts[kind] ?? 0
                Button {
                    usePowerUp(kind)
                } label: {
                    ZStack(alignment: .bottomTrailing) {
                        PlinkPowerUpChip(kind: kind, size: 72)
                            .shadow(color: .black.opacity(0.5), radius: 8, y: 4)
                            .opacity(n > 0 ? 1 : 0.38)
                            .brightness(n > 0 ? 0 : -0.12)
                        if n > 0 {
                            Text("\(n)")
                                .font(.system(size: 14, weight: .black, design: .rounded))
                                .foregroundStyle(.white)
                                .padding(.horizontal, 7)
                                .padding(.vertical, 3)
                                .background(
                                    Capsule(style: .continuous)
                                        .fill(Color(red: 0.95, green: 0.35, blue: 0.2))
                                        .shadow(color: .black.opacity(0.35), radius: 3, y: 1)
                                )
                                .offset(x: 4, y: 4)
                        }
                    }
                    .frame(width: 80, height: 80)
                    .contentShape(Circle())
                }
                .buttonStyle(.plain)
                .disabled(n <= 0)
                .accessibilityLabel("\(kind.title), \(n) left")
                .accessibilityHint(kind.blurb)
                .accessibilityIdentifier("world2.plink.powerUp.\(kind.rawValue)")
            }
        }
        .accessibilityIdentifier("world2.plink.powerUp.tray")
    }

    /// Compact transport + expandable detail tile (deck chrome + fight overlay).
    private var musicPlayerOverlay: some View {
        VStack(alignment: .trailing, spacing: 8) {
            if showMusicDetail {
                musicDetailTile
                    .transition(.asymmetric(
                        insertion: .move(edge: .bottom).combined(with: .opacity),
                        removal: .opacity
                    ))
            }
            musicTransportBar
        }
        .animation(.spring(response: 0.34, dampingFraction: 0.82), value: showMusicDetail)
    }

    private var musicTransportBar: some View {
        HStack(spacing: 6) {
            musicTransportButton(systemName: "backward.fill", label: "Previous track") {
                music.cyclePrevious()
            }

            musicTransportButton(
                systemName: music.isPlaying ? "pause.fill" : "play.fill",
                label: music.isPlaying ? "Pause" : "Play"
            ) {
                music.togglePause()
            }

            musicTransportButton(systemName: "forward.fill", label: "Next track") {
                music.cycleNext()
            }
            .accessibilityIdentifier("world2.plink.music.next")

            Button {
                PlinkSFX.play(.ui)
                withAnimation(.spring(response: 0.34, dampingFraction: 0.82)) {
                    showMusicDetail.toggle()
                }
            } label: {
                HStack(spacing: 5) {
                    Image(systemName: "music.note")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(Color(red: 1, green: 0.82, blue: 0.42))
                    Text(music.currentTrackTitle)
                        .font(.system(size: 12, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                        .lineLimit(1)
                }
                .frame(maxWidth: 128, alignment: .leading)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Open music details")
            .accessibilityIdentifier("world2.plink.music.detail")

            Image(systemName: music.volume < 0.05 ? "speaker.slash.fill" : "speaker.wave.2.fill")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(.white.opacity(0.75))
                .frame(width: 16)

            Slider(
                value: Binding(
                    get: { Double(music.volume) },
                    set: { music.setVolume(Float($0)) }
                ),
                in: 0...1
            )
            .frame(width: 78)
            .tint(Color(red: 0.55, green: 0.9, blue: 0.72))
            .accessibilityLabel("Volume")
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 7)
        .background(.ultraThinMaterial.opacity(0.92), in: Capsule())
        .overlay(Capsule().stroke(.white.opacity(0.28), lineWidth: 1))
        .shadow(color: .black.opacity(0.35), radius: 8, y: 3)
        .accessibilityIdentifier("world2.plink.music.picker")
    }

    private func musicTransportButton(
        systemName: String,
        label: String,
        action: @escaping () -> Void
    ) -> some View {
        Button {
            PlinkSFX.play(.ui)
            action()
        } label: {
            Image(systemName: systemName)
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(.white.opacity(0.95))
                .frame(width: 28, height: 28)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
    }

    private var musicDetailTile: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .firstTextBaseline) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(music.currentTrackTitle)
                        .font(.system(size: 16, weight: .heavy, design: .rounded))
                        .foregroundStyle(.white)
                        .lineLimit(2)
                    Text((music.currentTrack?.role ?? "track").uppercased())
                        .font(.system(size: 11, weight: .bold, design: .rounded))
                        .foregroundStyle(Color(red: 0.7, green: 0.9, blue: 0.8).opacity(0.9))
                        .tracking(0.6)
                }
                Spacer(minLength: 8)
                Button {
                    PlinkSFX.play(.ui)
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.85)) {
                        showMusicDetail = false
                    }
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(.white.opacity(0.85))
                        .frame(width: 26, height: 26)
                        .background(Circle().fill(Color.white.opacity(0.12)))
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Close music details")
            }

            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 4) {
                    ForEach(PlinkMusicService.playlist, id: \.id) { track in
                        let selected = track.id == music.currentTrackID
                        Button {
                            PlinkSFX.play(.ui)
                            music.selectTrack(id: track.id)
                        } label: {
                            HStack(spacing: 8) {
                                Image(systemName: selected && music.isPlaying ? "speaker.wave.2.fill" : "music.note")
                                    .font(.system(size: 11, weight: .bold))
                                    .foregroundStyle(selected
                                                     ? Color(red: 1, green: 0.82, blue: 0.42)
                                                     : .white.opacity(0.45))
                                    .frame(width: 16)
                                VStack(alignment: .leading, spacing: 1) {
                                    Text(track.title)
                                        .font(.system(size: 13, weight: selected ? .heavy : .semibold, design: .rounded))
                                        .foregroundStyle(.white.opacity(selected ? 1 : 0.82))
                                        .lineLimit(1)
                                    Text(track.role.capitalized)
                                        .font(.system(size: 10, weight: .medium, design: .rounded))
                                        .foregroundStyle(.white.opacity(0.45))
                                }
                                Spacer(minLength: 4)
                            }
                            .padding(.horizontal, 8)
                            .padding(.vertical, 7)
                            .background(
                                RoundedRectangle(cornerRadius: 10, style: .continuous)
                                    .fill(selected ? Color.white.opacity(0.14) : Color.clear)
                            )
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("\(track.title), \(track.role)")
                        .accessibilityAddTraits(selected ? .isSelected : [])
                    }
                }
            }
            .frame(maxHeight: 220)
        }
        .padding(12)
        .frame(width: 280, alignment: .leading)
        .background(.ultraThinMaterial.opacity(0.96), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(.white.opacity(0.28), lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.4), radius: 14, y: 6)
        .accessibilityIdentifier("world2.plink.music.tile")
    }

    private var cageFraction: CGFloat {
        let living = foeRoster.filter { !$0.isDefeated }.count
        let total = max(1, foeRoster.count)
        return CGFloat(living) / CGFloat(total)
    }

    private func refreshHostageMood() {
        guard !cageShattered else {
            enemyState = .happy
            return
        }
        // Mood tracks how many bad guys still hold them — not a cage HP bar.
        enemyState = PeglinRescueMood.state(cageFractionRemaining: cageFraction)
    }

    private func playCageShatterReward() {
        PlinkSFX.play(.win)
        withAnimation(.spring(response: 0.45, dampingFraction: 0.72)) {
            cageShattered = true
            enemyState = .happy
            abbieState = .sneakyWink
        }
    }

    private func usePowerUp(_ kind: PlinkPowerUp) {
        guard let bridge else { return }
        guard PlinkPowerUpStore.spend(kind, for: playerID) else {
            statusLine = "No \(kind.title) left"
            return
        }
        let ok: Bool
        switch kind {
        case .refresh:
            ok = bridge.scene.applyRefreshPowerUp()
        case .fire:
            ok = bridge.scene.applyFirePowerUp()
        case .split:
            ok = bridge.scene.applySplitPowerUp()
        }
        if !ok {
            // Refund if the board rejected the spend (wrong phase).
            _ = PlinkPowerUpStore.award(kind, for: playerID)
            statusLine = "Can't use \(kind.title) right now"
        }
        powerUpCounts = PlinkPowerUpStore.counts(for: playerID)
        PeglinEdition.log(
            "battle_powerup_used",
            ["kind": kind.rawValue, "ok": ok ? "1" : "0"]
        )
    }

    /// Top chrome: Abbie | BAD GUYS cluster | RESCUE hostage.
    /// Grows sideways for multi-foe; keep height compact so the board sits flush underneath.
    /// One glass instrument: Abbie · Bad guys · Rescue — shared height, quiet accents.
    private var fightPortraitBar: some View {
        let art = MarbleVoyageDesignRules.fightPortraitArtSize
        return HStack(alignment: .center, spacing: 0) {
            fightAbbieCell(art: art)
                .frame(maxWidth: .infinity, alignment: .leading)

            fightChromeDivider

            fightBadGuysCell(art: art)
                .frame(maxWidth: .infinity)
                .layoutPriority(1)

            fightChromeDivider

            fightRescueCell(art: art * 0.9)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .background(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .fill(.ultraThinMaterial.opacity(0.88))
                .overlay(
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .fill(Color.black.opacity(0.28))
                )
        )
        .overlay(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .stroke(Color.white.opacity(0.22), lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.28), radius: 10, y: 3)
        .accessibilityIdentifier("world2.plink.battle.portraits")
        .overlay {
            if bombLobFlash {
                Text("BOMB!")
                    .font(.system(size: 28, weight: .black, design: .rounded))
                    .foregroundStyle(Color(red: 1, green: 0.85, blue: 0.3))
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(Color.black.opacity(0.75), in: Capsule())
                    .overlay(Capsule().stroke(Color(red: 1, green: 0.45, blue: 0.2), lineWidth: 3))
                    .rotationEffect(.degrees(-8))
                    .transition(.scale.combined(with: .opacity))
                    .allowsHitTesting(false)
            }
        }
    }

    private var fightChromeDivider: some View {
        Rectangle()
            .fill(Color.white.opacity(0.14))
            .frame(width: 1)
            .padding(.vertical, 6)
            .padding(.horizontal, 8)
    }

    private func fightAbbieCell(art: CGFloat) -> some View {
        let fraction = playerMaxHP == 0 ? 0 : CGFloat(playerHP) / CGFloat(playerMaxHP)
        let tint = Color(red: 0.45, green: 0.88, blue: 0.58)
        return HStack(alignment: .center, spacing: 12) {
            ZStack(alignment: .top) {
                PeglinAbbieBattlePortrait(state: abbieState, size: art)
                    .shadow(color: tint.opacity(0.35), radius: 8, y: 2)
                if let float = playerHPFloat {
                    Text(float.text)
                        .font(.system(size: 28, weight: .black, design: .rounded))
                        .foregroundStyle(
                            float.isHeal
                                ? Color(red: 0.45, green: 1, blue: 0.55)
                                : Color(red: 1, green: 0.35, blue: 0.35)
                        )
                        .shadow(color: .black.opacity(0.75), radius: 3, y: 1)
                        .scaleEffect(playerImpactFlash ? 1.25 : 1.0)
                        .offset(y: -14)
                        .id(float.id)
                        .transition(.scale.combined(with: .opacity))
                        .allowsHitTesting(false)
                }
            }
            .offset(x: playerShake)
            .scaleEffect(playerImpactFlash ? 1.04 : 1.0)

            VStack(alignment: .leading, spacing: 4) {
                Text("YOU")
                    .font(.system(size: 10, weight: .bold, design: .rounded))
                    .foregroundStyle(tint.opacity(0.9))
                    .tracking(0.8)
                Text("Abbie")
                    .font(.system(size: 17, weight: .heavy, design: .rounded))
                    .foregroundStyle(.white)
                    .lineLimit(1)
                Text("\(playerHP)/\(playerMaxHP)")
                    .font(.system(size: 14, weight: .bold, design: .rounded))
                    .foregroundStyle(.white.opacity(0.88))
                    .monospacedDigit()
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        Capsule().fill(Color.white.opacity(0.16))
                        Capsule()
                            .fill(tint)
                            .frame(width: geo.size.width * max(0, min(1, fraction)))
                    }
                }
                .frame(width: 120, height: 8)
            }
        }
        .padding(.trailing, 4)
        .background(
            GeometryReader { geo in
                Color.clear.preference(
                    key: PlinkBattleBannerFrameKey.self,
                    value: [true: geo.frame(in: .named("plinkBattleSpace"))]
                )
            }
        )
        .accessibilityLabel("Abbie \(playerHP) of \(playerMaxHP) hit points")
        .accessibilityIdentifier("world2.plink.battle.banner.player")
    }

    private func fightRescueCell(art: CGFloat) -> some View {
        let tint = Color(red: 0.55, green: 0.88, blue: 0.95)
        return HStack(alignment: .center, spacing: 10) {
            Group {
                if let enemyKind {
                    PeglinEnemyBattlePortrait(kind: enemyKind, state: enemyState, size: art)
                } else {
                    foePlaceholder(size: art)
                }
            }
            .opacity(cageShattered ? 1 : 0.92)

            VStack(alignment: .leading, spacing: 3) {
                Text("RESCUE")
                    .font(.system(size: 10, weight: .bold, design: .rounded))
                    .foregroundStyle(tint.opacity(0.9))
                    .tracking(0.8)
                Text(enemyKind?.shortName ?? "Friend")
                    .font(.system(size: 15, weight: .heavy, design: .rounded))
                    .foregroundStyle(.white)
                    .lineLimit(1)
                Text(cageShattered ? "Free!" : "Held back")
                    .font(.system(size: 12, weight: .semibold, design: .rounded))
                    .foregroundStyle(cageShattered
                                     ? Color(red: 0.45, green: 0.95, blue: 0.55)
                                     : tint.opacity(0.9))
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityIdentifier("world2.plink.battle.rescue")
        .accessibilityLabel("\(enemyKind?.displayName ?? "Friend") held back — no HP")
    }

    private func fightBadGuysCell(art: CGFloat) -> some View {
        let accent = Color(red: 1, green: 0.55, blue: 0.32)
        return VStack(spacing: 5) {
            HStack {
                Text("BAD GUYS")
                    .font(.system(size: 10, weight: .bold, design: .rounded))
                    .foregroundStyle(accent.opacity(0.95))
                    .tracking(0.8)
                Spacer(minLength: 4)
                Text(
                    frontFoe.map { foe in
                        if foe.kind.isFlying {
                            return "Front · \(foe.shortLabel) · Fly ATK \(resolvedEnemyAttack)"
                        }
                        if foe.lane <= PeglinBattleRules.meleeLane {
                            return "Front · \(foe.shortLabel) · Melee ATK \(resolvedEnemyAttack)"
                        }
                        return "Front · \(foe.shortLabel) · \(foe.lane) out · ATK \(resolvedEnemyAttack)"
                    } ?? "Clear the pack"
                )
                .font(.system(size: 11, weight: .semibold, design: .rounded))
                .foregroundStyle(.white.opacity(0.72))
                .lineLimit(1)
                .minimumScaleFactor(0.75)
            }

            fightWaveAttackerChip(size: art)
        }
        .padding(.horizontal, 2)
        .scaleEffect(enemyImpactFlash ? 1.02 : 1.0)
        .background(
            GeometryReader { geo in
                Color.clear.preference(
                    key: PlinkBattleBannerFrameKey.self,
                    value: [false: geo.frame(in: .named("plinkBattleSpace"))]
                )
            }
        )
        .accessibilityIdentifier("world2.plink.battle.attacker")
        .accessibilityLabel("Bad guys — fight the front foe; bombs hit everyone")
    }

    /// Bad-guy cluster — each has an HP bar; front foe takes peg damage; bombs AOE all.
    private func fightWaveAttackerChip(size: CGFloat) -> some View {
        let frontID = frontFoe?.id
        let frontSize = size * min(max(1, attackerPortraitScale), 1.65)
        let benchSize = size * 0.62
        return HStack(alignment: .bottom, spacing: 10) {
            ForEach(foeRoster) { foe in
                let isFront = foe.id == frontID
                let laneOffset = CGFloat(foe.lane) * 8
                VStack(spacing: 3) {
                    ZStack(alignment: .top) {
                        PlinkAttackerBattlePortrait(
                            kind: foe.kind,
                            pose: isFront ? attackerPose : .idle,
                            size: isFront ? frontSize : benchSize
                        )
                        .opacity(foe.isDefeated ? 0.28 : (isFront ? 1 : 0.72))
                        .grayscale(foe.isDefeated ? 0.85 : 0)
                        .scaleEffect(isFront && attackerPose == .attack ? 1.08 : 1.0)
                        .animation(.spring(response: 0.28, dampingFraction: 0.7), value: attackerPose)

                        if foe.kind.isFlying, !foe.isDefeated {
                            Image(systemName: "wind")
                                .font(.system(size: 11, weight: .black))
                                .foregroundStyle(Color(red: 0.55, green: 0.9, blue: 1))
                                .padding(3)
                                .background(Color.black.opacity(0.55), in: Circle())
                                .offset(x: (isFront ? frontSize : benchSize) * 0.38, y: -4)
                        }

                        if isFront, let enemyHPFloat {
                            Text(enemyHPFloat.text)
                                .font(.system(size: 26, weight: .black, design: .rounded))
                                .foregroundStyle(
                                    enemyHPFloat.isHeal
                                        ? Color(red: 0.45, green: 1, blue: 0.55)
                                        : Color(red: 1, green: 0.35, blue: 0.35)
                                )
                                .shadow(color: .black.opacity(0.75), radius: 3, y: 1)
                                .scaleEffect(enemyImpactFlash ? 1.25 : 1.0)
                                .offset(y: -14)
                                .id(enemyHPFloat.id)
                                .transition(.scale.combined(with: .opacity))
                                .allowsHitTesting(false)
                        }
                    }

                    GeometryReader { geo in
                        let frac = foe.maxHP == 0 ? 0 : CGFloat(foe.hp) / CGFloat(foe.maxHP)
                        ZStack(alignment: .leading) {
                            Capsule().fill(Color.white.opacity(0.18))
                            Capsule()
                                .fill(foe.isDefeated
                                      ? Color.gray.opacity(0.5)
                                      : Color(red: 1, green: 0.45, blue: 0.28))
                                .frame(width: max(4, geo.size.width * frac))
                        }
                    }
                    .frame(width: isFront ? frontSize : benchSize, height: 7)

                    HStack(spacing: 2) {
                        ForEach(0..<PeglinBattleRules.laneCount, id: \.self) { col in
                            Circle()
                                .fill(
                                    foe.isDefeated
                                        ? Color.white.opacity(0.12)
                                        : (col == foe.lane
                                           ? Color(red: 1, green: 0.7, blue: 0.35)
                                           : Color.white.opacity(0.22))
                                )
                                .frame(width: 5, height: 5)
                        }
                    }

                    Text(foe.isDefeated ? "OUT" : (foe.canMeleeThisRound ? "MELEE" : "\(foe.hp)"))
                        .font(.system(size: 11, weight: .black, design: .rounded))
                        .foregroundStyle(.white.opacity(foe.isDefeated ? 0.45 : 0.95))
                        .monospacedDigit()
                }
                .offset(x: foe.isDefeated ? 0 : laneOffset)
                .offset(x: isFront ? enemyShake : 0)
                .scaleEffect(isFront && enemyImpactFlash ? 1.06 : 1.0)
                .animation(.spring(response: 0.45, dampingFraction: 0.78), value: foe.lane)
                .accessibilityIdentifier(
                    isFront
                        ? "world2.plink.battle.attacker.active"
                        : "world2.plink.battle.attacker.\(foe.kind.rawValue)"
                )
            }
        }
        .frame(maxWidth: .infinity)
    }

    /// Thin strip — leave / phase / orbs (music lives on the board overlay).
    private var fightTopBar: some View {
        HStack(spacing: 10) {
            leaveButton
            Spacer(minLength: 8)
            Text(phaseLabel.replacingOccurrences(of: "_", with: " "))
                .font(.system(size: 13, weight: .heavy, design: .rounded))
                .foregroundStyle(.white.opacity(0.9))
                .lineLimit(1)
            if shotScore > 0 {
                Text("+\(shotScore)")
                    .font(.system(size: 16, weight: .black, design: .rounded))
                    .foregroundStyle(Color(red: 1, green: 0.88, blue: 0.35))
            }
            Spacer(minLength: 8)
            Text("Orbs ∞")
                .font(.system(size: 14, weight: .heavy, design: .rounded))
                .foregroundStyle(.white)
                .padding(.horizontal, 12)
                .padding(.vertical, 7)
                .background(.black.opacity(0.5), in: Capsule())
                .accessibilityLabel("Unlimited orbs")
        }
    }

    private var fightBoardPane: some View {
        GeometryReader { geo in
            let boardSize = MarbleVoyagePlateLayout.fitSize(in: geo.size)
            ZStack {
                Color(red: 0.04, green: 0.07, blue: 0.12)
                if let bridge {
                    SpriteView(
                        scene: bridge.scene,
                        options: [.allowsTransparency, .ignoresSiblingOrder]
                    )
                    .id(sessionID)
                    .frame(width: boardSize.width, height: boardSize.height)
                    .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 20, style: .continuous)
                            .stroke(Color(red: 0.55, green: 0.9, blue: 0.7).opacity(0.7), lineWidth: 2.5)
                    )
                    .shadow(color: .black.opacity(0.45), radius: 14, y: 5)
                    .opacity(Double(fightIntroProgress))
                    .scaleEffect(0.98 + 0.02 * fightIntroProgress)
                } else {
                    Color.black.opacity(0.2)
                        .frame(width: boardSize.width, height: boardSize.height)
                        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
                }

                if showBanner {
                    VStack(spacing: 8) {
                        Text(bannerTitle)
                            .font(.system(size: 32, weight: .heavy, design: .rounded))
                            .foregroundStyle(.white)
                        Text(bannerBody)
                            .font(.system(size: 15, weight: .semibold, design: .rounded))
                            .foregroundStyle(.white.opacity(0.8))
                        HStack(spacing: 12) {
                            Button("Deck again") {
                                tearDown()
                                withAnimation(.easeOut(duration: 0.2)) {
                                    fightIntroProgress = 0
                                    stage = .deck
                                    showBanner = false
                                }
                                music.playSafari()
                            }
                            .buttonStyle(BattleChipStyle())
                            Button("Leave") {
                                tearDown()
                                onExit()
                            }
                            .buttonStyle(BattleChipStyle())
                        }
                    }
                    .padding(22)
                    .background(.black.opacity(0.72), in: RoundedRectangle(cornerRadius: 22, style: .continuous))
                    .transition(.scale.combined(with: .opacity))
                }
            }
            .frame(width: geo.size.width, height: geo.size.height, alignment: .top)
        }
    }

    /// Compact top-right battle feed overlay.
    private var battleFeedPane: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 4) {
                feedTotalChip(
                    title: "Cage",
                    value: totalDamageDealt,
                    tint: Color(red: 0.45, green: 0.9, blue: 0.55),
                    pulsed: feedGlow && totalDamageDealt > 0
                )
                feedTotalChip(
                    title: "Hurt",
                    value: totalDamageTaken,
                    tint: Color(red: 1, green: 0.45, blue: 0.4),
                    pulsed: feedGlow && totalDamageTaken > 0
                )
            }

            Text(statusLine)
                .font(.system(size: MarbleVoyageDesignRules.battleFeedMinMetaFont, weight: .semibold, design: .rounded))
                .foregroundStyle(.white.opacity(0.75))
                .lineLimit(2)
                .frame(maxWidth: .infinity, alignment: .leading)

            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 3) {
                        if battleRounds.isEmpty {
                            Text("Drops…")
                                .font(.system(size: MarbleVoyageDesignRules.battleFeedMinMetaFont, weight: .medium, design: .rounded))
                                .foregroundStyle(.white.opacity(0.4))
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                        ForEach(battleRounds) { round in
                            battleRoundRow(round, highlighted: feedHighlightRoundID == round.id)
                                .id(round.id)
                        }
                    }
                }
                .onChange(of: battleRounds.count) { _, _ in
                    guard let last = battleRounds.last else { return }
                    withAnimation(.easeOut(duration: 0.25)) {
                        proxy.scrollTo(last.id, anchor: .bottom)
                    }
                }
            }
            .frame(maxHeight: 160)
        }
        .padding(6)
        .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(.black.opacity(0.58))
                .overlay(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .stroke(
                            feedGlow
                                ? Color(red: 1, green: 0.88, blue: 0.35).opacity(0.95)
                                : Color.white.opacity(0.14),
                            lineWidth: feedGlow ? 2 : 1
                        )
                )
        )
        .scaleEffect(feedGlow ? 1.02 : 1.0)
        .animation(.spring(response: 0.35, dampingFraction: 0.7), value: feedGlow)
        .accessibilityIdentifier("world2.plink.battle.feed")
    }

    private func feedTotalChip(title: String, value: Int, tint: Color, pulsed: Bool = false) -> some View {
        VStack(alignment: .leading, spacing: 1) {
            Text(title.uppercased())
                .font(.system(size: MarbleVoyageDesignRules.battleFeedMinMetaFont, weight: .bold, design: .rounded))
                .foregroundStyle(.white.opacity(0.5))
            Text("\(value)")
                .font(.system(
                    size: pulsed
                        ? MarbleVoyageDesignRules.battleFeedMinChipValueFont + 4
                        : MarbleVoyageDesignRules.battleFeedMinChipValueFont,
                    weight: .black,
                    design: .rounded
                ))
                .foregroundStyle(tint)
                .scaleEffect(pulsed ? 1.08 : 1)
                .minimumScaleFactor(0.7)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 7)
        .padding(.vertical, 5)
        .background(
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .fill(tint.opacity(pulsed ? 0.28 : 0.12))
                .overlay(
                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                        .stroke(tint.opacity(pulsed ? 0.9 : 0), lineWidth: 1.5)
                )
        )
    }

    private func battleRoundRow(_ round: BattleRound, highlighted: Bool = false) -> some View {
        let body = MarbleVoyageDesignRules.battleFeedMinBodyFont
        let meta = MarbleVoyageDesignRules.battleFeedMinMetaFont
        return VStack(alignment: .leading, spacing: 3) {
            HStack(spacing: 4) {
                Text("R\(round.number)")
                    .font(.system(size: meta, weight: .black, design: .rounded))
                    .foregroundStyle(.white.opacity(0.65))
                    .frame(width: 26, alignment: .leading)
                if round.damageToEnemy > 0 {
                    Text("−\(round.damageToEnemy)")
                        .font(.system(size: highlighted ? body + 1 : body, weight: .heavy, design: .rounded))
                        .foregroundStyle(Color(red: 0.45, green: 0.95, blue: 0.55))
                } else {
                    Text("miss")
                        .font(.system(size: meta, weight: .bold, design: .rounded))
                        .foregroundStyle(.white.opacity(0.35))
                }
                Spacer(minLength: 2)
                if round.damageToPlayer > 0 {
                    Text("−\(round.damageToPlayer)")
                        .font(.system(size: highlighted ? body + 1 : body, weight: .heavy, design: .rounded))
                        .foregroundStyle(Color(red: 1, green: 0.5, blue: 0.4))
                }
            }
            if !round.highlights.isEmpty {
                Text(round.highlights.joined(separator: " · "))
                    .font(.system(size: meta, weight: .heavy, design: .rounded))
                    .foregroundStyle(Color(red: 1, green: 0.88, blue: 0.45))
                    .lineLimit(2)
                    .minimumScaleFactor(0.8)
            }
        }
        .padding(.horizontal, 7)
        .padding(.vertical, highlighted ? 7 : 5)
        .background(
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .fill(highlighted ? Color(red: 1, green: 0.88, blue: 0.35).opacity(0.22) : Color.white.opacity(0.06))
                .overlay(
                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                        .stroke(
                            highlighted ? Color(red: 1, green: 0.88, blue: 0.35) : Color.clear,
                            lineWidth: highlighted ? 1.5 : 0
                        )
                )
        )
        .scaleEffect(highlighted ? 1.03 : 1)
        .accessibilityLabel(
            "Round \(round.number). Dealt \(round.damageToEnemy). Taken \(round.damageToPlayer). \(round.highlights.joined(separator: ", "))"
        )
    }

    private func foePlaceholder(size: CGFloat) -> some View {
        ZStack {
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(Color.black.opacity(0.45))
                .frame(width: size, height: size)
            Image(systemName: "flame.circle.fill")
                .font(.system(size: size * 0.45, weight: .bold))
                .foregroundStyle(Color(red: 1, green: 0.55, blue: 0.35))
        }
    }

    private func flyingDamageChip(_ flight: DamageFlight) -> some View {
        let start = boardFrame == .zero
            ? CGRect(x: 200, y: 360, width: 200, height: 200)
            : boardFrame
        let end = flight.hitsPlayer
            ? (playerBannerFrame == .zero ? start : playerBannerFrame)
            : (enemyBannerFrame == .zero ? start : enemyBannerFrame)
        let t = damageFlightProgress[flight.id] ?? 0
        let eased = 1 - pow(1 - t, 3)
        let x = start.midX + (end.midX - start.midX) * eased
        let y = start.midY + (end.midY - start.midY) * eased - 56 * sin(.pi * eased)
        let scale = 1.35 - 0.25 * eased
        let tint = flight.hitsPlayer
            ? Color(red: 1, green: 0.45, blue: 0.35)
            : Color(red: 0.45, green: 0.95, blue: 0.55)
        return ZStack {
            Circle()
                .fill(tint.opacity(0.28))
                .frame(width: 88, height: 88)
                .blur(radius: 6)
            Text("−\(flight.amount)")
                .font(.system(size: 36, weight: .black, design: .rounded))
                .foregroundStyle(tint)
                .shadow(color: .black.opacity(0.85), radius: 3, y: 1)
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(
                    Capsule()
                        .fill(Color.black.opacity(0.55))
                        .overlay(Capsule().stroke(tint.opacity(0.9), lineWidth: 2.5))
                )
        }
        .scaleEffect(scale)
        .position(x: x, y: y)
        .accessibilityHidden(true)
    }

    /// Round-end tally: damage chip flies from the board into the fighter tile, then shakes it.
    private func launchDamageFlight(amount: Int, hitsPlayer: Bool, delay: TimeInterval = 0) {
        guard amount > 0 else { return }
        if reduceMotion {
            impactPortrait(hitsPlayer: hitsPlayer, amount: amount)
            return
        }
        Task { @MainActor in
            if delay > 0 {
                try? await Task.sleep(for: .milliseconds(Int(delay * 1000)))
            }
            let id = UUID()
            let flight = DamageFlight(id: id, amount: amount, hitsPlayer: hitsPlayer)
            damageFlights.append(flight)
            damageFlightProgress[id] = 0
            withAnimation(.easeInOut(duration: 0.58)) {
                damageFlightProgress[id] = 1
            }
            try? await Task.sleep(for: .milliseconds(580))
            damageFlights.removeAll { $0.id == id }
            damageFlightProgress[id] = nil
            impactPortrait(hitsPlayer: hitsPlayer, amount: amount)
        }
    }

    private func impactPortrait(hitsPlayer: Bool, amount: Int) {
        #if canImport(UIKit)
        if PlayerStateService.shared.currentPlayer?.settings.hapticFeedbackEnabled ?? true {
            UIImpactFeedbackGenerator(style: .rigid).impactOccurred()
        }
        #endif
        let float = HPFloat(text: "−\(amount)", isHeal: false)
        withAnimation(.spring(response: 0.14, dampingFraction: 0.32)) {
            if hitsPlayer {
                playerShake = 12
                playerImpactFlash = true
                playerHPFloat = float
            } else {
                enemyShake = -12
                enemyImpactFlash = true
                enemyHPFloat = float
            }
        }
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(70))
            withAnimation(.spring(response: 0.16, dampingFraction: 0.38)) {
                if hitsPlayer { playerShake = -9 } else { enemyShake = 9 }
            }
            try? await Task.sleep(for: .milliseconds(70))
            withAnimation(.spring(response: 0.28, dampingFraction: 0.55)) {
                if hitsPlayer {
                    playerShake = 0
                    playerImpactFlash = false
                } else {
                    enemyShake = 0
                    enemyImpactFlash = false
                }
            }
            try? await Task.sleep(for: .milliseconds(520))
            withAnimation(.easeOut(duration: 0.28)) {
                if hitsPlayer, playerHPFloat?.id == float.id { playerHPFloat = nil }
                if !hitsPlayer, enemyHPFloat?.id == float.id { enemyHPFloat = nil }
            }
        }
    }

    private func showHPFloat(onPlayer: Bool, delta: Int) {
        // Prefer the flying tally for damage; keep this for heals / legacy callers.
        guard delta != 0 else { return }
        if delta < 0 {
            let delay: TimeInterval = onPlayer && Date().timeIntervalSince(lastEnemyTallyAt) < 0.6
                ? 0.42
                : 0
            if !onPlayer { lastEnemyTallyAt = Date() }
            launchDamageFlight(amount: abs(delta), hitsPlayer: onPlayer, delay: delay)
            return
        }
        let float = HPFloat(
            text: "+\(delta)",
            isHeal: true
        )
        withAnimation(.spring(response: 0.32, dampingFraction: 0.62)) {
            if onPlayer {
                playerHPFloat = float
            } else {
                enemyHPFloat = float
            }
        }
        Task { @MainActor in
            try? await Task.sleep(nanoseconds: 900_000_000)
            withAnimation(.easeOut(duration: 0.35)) {
                if onPlayer, playerHPFloat?.id == float.id {
                    playerHPFloat = nil
                }
                if !onPlayer, enemyHPFloat?.id == float.id {
                    enemyHPFloat = nil
                }
            }
        }
    }

    private func recordRound(damageToEnemy: Int, damageToPlayer: Int, highlights: [String] = []) {
        let round = BattleRound(
            number: battleRounds.count + 1,
            damageToEnemy: damageToEnemy,
            damageToPlayer: damageToPlayer,
            highlights: highlights
        )
        let token = UUID()
        feedAttentionToken = token
        withAnimation(.spring(response: 0.35, dampingFraction: 0.72)) {
            battleRounds.append(round)
            totalDamageDealt += damageToEnemy
            totalDamageTaken += damageToPlayer
            feedHighlightRoundID = round.id
            feedGlow = true
        }
        Task { @MainActor in
            try? await Task.sleep(nanoseconds: 1_400_000_000)
            guard feedAttentionToken == token else { return }
            withAnimation(.easeOut(duration: 0.35)) {
                feedGlow = false
                if feedHighlightRoundID == round.id {
                    feedHighlightRoundID = nil
                }
            }
        }
    }

    private var leaveButton: some View {
        Button {
            tearDown()
            onExit()
        } label: {
            Label("Leave", systemImage: "xmark.circle.fill")
                .font(.system(size: 16, weight: .bold, design: .rounded))
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(.black.opacity(0.55), in: Capsule())
                .foregroundStyle(.white)
        }
        .accessibilityIdentifier("world2.plink.battle.leave")
    }

    // MARK: - Session

    private func startFight() {
        tearDown()
        sessionID = UUID()
        fightIntroProgress = 0
        stage = .fight
        showBanner = false
        playerHPFloat = nil
        enemyHPFloat = nil
        damageFlights = []
        damageFlightProgress = [:]
        playerShake = 0
        enemyShake = 0
        playerImpactFlash = false
        enemyImpactFlash = false
        lastEnemyTallyAt = .distantPast
        rebuildFoeRoster()
        // Carry voyage HP into the fight — never free-heal at fight start.
        playerMaxHP = overridePlayerMaxHP ?? PeglinBattleRules.playerMaxHP(for: enemyKind)
        if let startingPlayerHP {
            playerHP = max(1, min(playerMaxHP, startingPlayerHP))
        } else {
            playerHP = playerMaxHP
        }
        ballsLeft = deck.count
        shotScore = 0
        battleRounds = []
        totalDamageDealt = 0
        totalDamageTaken = 0
        feedGlow = false
        feedHighlightRoundID = nil
        abbieState = .happy
        enemyState = PeglinRescueMood.state(cageFractionRemaining: 1)
        cageShattered = false
        bombLobFlash = false
        phaseLabel = "RESCUE"
        statusLine = "Front foe · approach from right · bomb = lob AOE · HP \(playerHP)/\(playerMaxHP)"
        // Keep safari music through the versus splash; board music kicks in on cutaway.
        showVersusIntro = true

        let plate = resolvedPlateImage()
        let scene = PeggleScene(size: CGSize(width: 900, height: 1100))
        scene.scaleMode = .resizeFill
        scene.backgroundColor = .clear
        scene.sceneBackdropImage = plate
        scene.configureSpiritBattle(
            enemyMax: enemyMaxHP,
            playerMax: playerMaxHP,
            deck: deck,
            counterDamage: resolvedEnemyAttack,
            startingPlayerHP: startingPlayerHP
        )
        if let voyageEconomy {
            scene.goldPegPrevalence = voyageEconomy.goldPegPrevalence
            scene.goldPegValue = voyageEconomy.goldPegValue
            scene.ballDamageMultiplier = voyageEconomy.ballDamageMultiplier
            scene.cycleExtraSpecials = voyageEconomy.cycleExtra
            scene.sockSnatchCoinsPerBomb = voyageEconomy.sockSnatch
            scene.prismCageBonus = voyageEconomy.prismBonus
        }
        // Pause aim until the cutaway finishes revealing the board.
        scene.isPaused = true
        let next = PlinkBattleBridge(scene: scene, boardIndex: PeglinBattleRules.boardIndex(for: enemyKind))
        next.onPhase = { phase in
            phaseLabel = phase
            if phase.contains("RESOLVE") {
                refreshHostageMood()
            } else if phase.contains("PLAYER") {
                abbieState = .happy
                refreshHostageMood()
            }
        }
        next.onHud = { snap in
            withAnimation(.easeOut(duration: 0.15)) {
                statusLine = snap.status
                ballsLeft = snap.ballsLeft
                shotScore = snap.shotScore
                // Scene owns front-foe HP; mirror into roster.
                enemyHP = snap.enemyHP
                enemyMaxHP = snap.enemyMaxHP
                if let id = frontFoeID, let idx = foeRoster.firstIndex(where: { $0.id == id }) {
                    foeRoster[idx].hp = snap.enemyHP
                }
                playerHP = snap.playerHP
                refreshHostageMood()
            }
            if snap.phase == .flying || snap.phase == .settling {
                abbieState = .sneakyWink
            }
        }
        next.onDamage = { dmg in
            abbieState = .sneakyWink
            phaseLabel = "FRONT_HIT"
            refreshHostageMood()
            showHPFloat(onPlayer: false, delta: -dmg)
        }
        next.onBombAOE = { dmg in
            phaseLabel = "BOMB_LOB"
            applyBombAOE(dmg)
            refreshHostageMood()
            showHPFloat(onPlayer: false, delta: -dmg)
            statusLine = "Bomb lobbed! AOE −\(dmg)"
        }
        next.onFrontFoeDefeated = {
            advanceFrontFoeOrRescue()
        }
        next.onEnemyTurn = {
            resolveEnemyApproachAndMelee()
        }
        next.onPlayerHurt = { dmg in
            abbieState = .hurt
            phaseLabel = "MELEE"
            withAnimation(.spring(response: 0.28, dampingFraction: 0.7)) {
                attackerPose = .attack
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.55) {
                withAnimation(.easeOut(duration: 0.2)) {
                    attackerPose = .idle
                }
            }
            refreshHostageMood()
            showHPFloat(onPlayer: true, delta: -dmg)
            let name = frontFoe?.shortLabel ?? waveAttacker.shortName
            let lane = frontFoe?.lane ?? 0
            statusLine = "\(name) melee · lane \(lane) · Abbie \(playerHP)/\(playerMaxHP)"
        }
        next.onRoundResolved = { summary in
            recordRound(
                damageToEnemy: summary.damageToEnemy + summary.bombAOE,
                damageToPlayer: summary.damageToPlayer,
                highlights: summary.highlights
            )
            refreshHostageMood()
        }
        next.onWon = {
            PeglinEdition.log("battle_completed", ["result": "victory"])
            phaseLabel = "RESCUED"
            abbieState = .sneakyWink
            playCageShatterReward()
            bannerTitle = "Rescued!"
            bannerBody = "\(title) is free and safe"
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.15) {
                withAnimation(.spring(response: 0.4, dampingFraction: 0.82)) {
                    showBanner = true
                }
            }
            onVictory?()
            onBattleEnded?(
                true,
                max(playerHP, bridge?.scene.playerHP ?? playerHP),
                scene.runGoldCoins
            )
        }
        next.onLost = {
            PeglinEdition.log("battle_completed", ["result": "defeat"])
            phaseLabel = "DEFEAT"
            abbieState = .defeated
            enemyState = .happy
            bannerTitle = "Try again"
            bannerBody = startingPlayerHP != nil
                ? "Voyage HP spent — no free heal"
                : "Build another deck"
            withAnimation(.spring(response: 0.4, dampingFraction: 0.82)) {
                showBanner = true
            }
            onBattleEnded?(false, 0, 0)
        }
        bridge = next
        PeglinEdition.log(
            "battle_started",
            [
                "session": sessionID.uuidString,
                "enemy": enemyKind?.rawValue ?? "none",
                "deck": deck.joined(separator: ","),
                "plate": sceneBackgroundAsset,
            ]
        )
        // Board chrome stays hidden until versus cutaway calls onRevealBoard.
        fightIntroProgress = 0
    }

    private func unpauseBoardAfterVersus() {
        bridge?.scene.isPaused = false
    }

    private func resolvedPlateImage() -> UIImage? {
        let asset = sceneBackgroundAsset.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !asset.isEmpty else { return nil }
        return World2GeneratedPlateStore.shared.image(for: asset)
            ?? AssetBootstrapService.shared.image(for: asset)
    }

    private func tearDown() {
        showVersusIntro = false
        bridge?.scene.isPaused = false
        bridge?.invalidate()
        bridge = nil
    }
}

private struct BattleChipStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 14, weight: .bold, design: .rounded))
            .foregroundStyle(.white)
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(.black.opacity(configuration.isPressed ? 0.55 : 0.42), in: Capsule())
    }
}

/// One of three heart-slot deck favorites (cute SF Symbol tile + 10 orb ids).
struct ParbleFavoriteSlot: Codable, Equatable {
    var iconID: String
    var deck: [String]
}

enum ParbleFavoriteStore {
    static let slotCount = 3
    /// v2: SF Symbol tiles (v1 emoji favorites are dropped — they rendered as tofu on-device).
    private static let key = "world2.plink.parbleFavorites.v2"

    static func load() -> [ParbleFavoriteSlot?] {
        guard let data = UserDefaults.standard.data(forKey: key),
              let decoded = try? JSONDecoder().decode([ParbleFavoriteSlot?].self, from: data)
        else {
            return Array(repeating: nil, count: slotCount)
        }
        var slots = decoded
        while slots.count < slotCount { slots.append(nil) }
        return Array(slots.prefix(slotCount))
    }

    static func save(_ slots: [ParbleFavoriteSlot?]) {
        var padded = slots
        while padded.count < slotCount { padded.append(nil) }
        if let data = try? JSONEncoder().encode(Array(padded.prefix(slotCount))) {
            UserDefaults.standard.set(data, forKey: key)
        }
    }
}

/// Cute iconic tiles for naming a saved Parble heart (SF Symbols — always render).
enum ParbleHeartIcon {
    struct Tile: Identifiable {
        let id: String
        let systemName: String
        let label: String
        let tint: Color
    }

    static let tiles: [Tile] = [
        Tile(id: "puppy", systemName: "dog.fill", label: "Puppy", tint: Color(red: 0.95, green: 0.62, blue: 0.35)),
        Tile(id: "kitty", systemName: "cat.fill", label: "Kitty", tint: Color(red: 0.95, green: 0.55, blue: 0.7)),
        Tile(id: "bunny", systemName: "hare.fill", label: "Bunny", tint: Color(red: 0.75, green: 0.55, blue: 0.95)),
        Tile(id: "paw", systemName: "pawprint.fill", label: "Paw", tint: Color(red: 0.55, green: 0.75, blue: 0.45)),
        Tile(id: "star", systemName: "star.fill", label: "Star", tint: Color(red: 1.0, green: 0.78, blue: 0.25)),
        Tile(id: "moon", systemName: "moon.stars.fill", label: "Moon", tint: Color(red: 0.45, green: 0.55, blue: 0.95)),
        Tile(id: "sparkle", systemName: "sparkles", label: "Sparkle", tint: Color(red: 0.55, green: 0.88, blue: 0.95)),
        Tile(id: "bolt", systemName: "bolt.fill", label: "Bolt", tint: Color(red: 1.0, green: 0.85, blue: 0.25)),
        Tile(id: "flame", systemName: "flame.fill", label: "Flame", tint: Color(red: 1.0, green: 0.45, blue: 0.3)),
        Tile(id: "heart", systemName: "heart.fill", label: "Heart", tint: Color(red: 0.95, green: 0.35, blue: 0.45)),
    ]

    static func tile(for id: String) -> Tile? {
        tiles.first { $0.id == id }
    }
}

private struct EmojiPickerToken: Identifiable {
    let slot: Int
    var id: Int { slot }
}

private struct ParbleHeartIconPickerSheet: View {
    let onPick: (String) -> Void
    let onCancel: () -> Void

    private let columns = [GridItem(.adaptive(minimum: 56), spacing: 10)]

    var body: some View {
        VStack(spacing: 14) {
            Text("Name this heart")
                .font(.system(size: 18, weight: .heavy, design: .rounded))
            Text("Pick a cute tile")
                .font(.system(size: 13, weight: .semibold, design: .rounded))
                .foregroundStyle(.secondary)
            LazyVGrid(columns: columns, spacing: 10) {
                ForEach(ParbleHeartIcon.tiles) { tile in
                    Button {
                        onPick(tile.id)
                    } label: {
                        Image(systemName: tile.systemName)
                            .font(.system(size: 26, weight: .black))
                            .foregroundStyle(.white)
                            .symbolRenderingMode(.hierarchical)
                            .frame(width: 56, height: 56)
                            .background(tile.tint.opacity(0.92), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                            .overlay(
                                RoundedRectangle(cornerRadius: 14, style: .continuous)
                                    .stroke(.white.opacity(0.28), lineWidth: 1.5)
                            )
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Save as \(tile.label)")
                }
            }
            Button("Cancel", action: onCancel)
                .font(.system(size: 15, weight: .bold, design: .rounded))
        }
        .padding(20)
        .accessibilityIdentifier("world2.plink.battle.heartIconPicker")
    }
}

@MainActor
private final class PlinkBattleBridge {
    let scene: PeggleScene
    var onPhase: ((String) -> Void)?
    var onHud: ((PeggleScene.HudSnapshot) -> Void)?
    var onDamage: ((Int) -> Void)?
    var onBombAOE: ((Int) -> Void)?
    var onFrontFoeDefeated: (() -> Bool)?
    var onEnemyTurn: (() -> Int)?
    var onPlayerHurt: ((Int) -> Void)?
    var onRoundResolved: ((PeggleScene.ShotRoundSummary) -> Void)?
    var onWon: (() -> Void)?
    var onLost: (() -> Void)?
    private var alive = true
    private var finished = false

    init(scene: PeggleScene, boardIndex: Int) {
        self.scene = scene
        scene.applyTuning(PhysicsTuning.default)
        scene.onDamageDealt = { [weak self] dmg in
            Task { @MainActor in self?.onDamage?(dmg) }
        }
        scene.onBombEnemyAOE = { [weak self] dmg in
            Task { @MainActor in self?.onBombAOE?(dmg) }
        }
        scene.onFrontFoeDefeated = { [weak self] in
            self?.onFrontFoeDefeated?() ?? true
        }
        scene.onEnemyTurn = { [weak self] in
            self?.onEnemyTurn?() ?? 0
        }
        scene.onPlayerHurt = { [weak self] dmg in
            Task { @MainActor in self?.onPlayerHurt?(dmg) }
        }
        scene.onRoundResolved = { [weak self] summary in
            Task { @MainActor in self?.onRoundResolved?(summary) }
        }
        scene.onHud = { [weak self] snap in
            Task { @MainActor in
                guard let self, self.alive else { return }
                self.onHud?(snap)
                switch snap.phase {
                case .aim:
                    self.onPhase?("PLAYER_TURN")
                case .flying, .settling:
                    self.onPhase?("RESOLVE_SHOT")
                case .won:
                    self.onPhase?("VICTORY")
                    if !self.finished {
                        self.finished = true
                        self.onWon?()
                    }
                case .lost:
                    self.onPhase?("DEFEAT")
                    if !self.finished {
                        self.finished = true
                        self.onLost?()
                    }
                }
            }
        }
        scene.loadLevel(index: boardIndex)
    }

    func invalidate() {
        alive = false
        scene.onHud = nil
        scene.onDamageDealt = nil
        scene.onBombEnemyAOE = nil
        scene.onFrontFoeDefeated = nil
        scene.onEnemyTurn = nil
        scene.onPlayerHurt = nil
        scene.onRoundResolved = nil
        scene.isPaused = true
        scene.removeAllChildren()
    }
}

// MARK: - Deck marble flight geometry

private struct PlinkOrbCatalogFrameKey: PreferenceKey {
    static var defaultValue: [String: CGRect] = [:]
    static func reduce(value: inout [String: CGRect], nextValue: () -> [String: CGRect]) {
        value.merge(nextValue(), uniquingKeysWith: { $1 })
    }
}

private struct PlinkDeckSlotFrameKey: PreferenceKey {
    static var defaultValue: [Int: CGRect] = [:]
    static func reduce(value: inout [Int: CGRect], nextValue: () -> [Int: CGRect]) {
        value.merge(nextValue(), uniquingKeysWith: { $1 })
    }
}

// MARK: - Round damage tally flight geometry

private struct PlinkBattleBoardFrameKey: PreferenceKey {
    static var defaultValue: CGRect = .zero
    static func reduce(value: inout CGRect, nextValue: () -> CGRect) {
        let next = nextValue()
        if next != .zero { value = next }
    }
}

/// `true` = player (Abbie) banner, `false` = enemy banner.
private struct PlinkBattleBannerFrameKey: PreferenceKey {
    static var defaultValue: [Bool: CGRect] = [:]
    static func reduce(value: inout [Bool: CGRect], nextValue: () -> [Bool: CGRect]) {
        value.merge(nextValue(), uniquingKeysWith: { $1 })
    }
}


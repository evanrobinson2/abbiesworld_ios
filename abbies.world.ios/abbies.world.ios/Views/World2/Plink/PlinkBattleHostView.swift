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
    /// Hover stacks — outbound speed keep after peg hits.
    var hoverStacks: Int = 0
    /// Owned charm stacks for the right-side rail (charm → count).
    var charmStacks: [MarbleVoyageCharm: Int] = [:]
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
    /// Voyage bag order — when auto-starting, fire these orb ids instead of a random mix.
    var startingDeck: [String]? = nil
    var onExit: () -> Void
    var onVictory: (() -> Void)? = nil
    /// `(won, remainingPlayerHP, coinsEarned)` — used by voyage runs that persist HP + wallet.
    var onBattleEnded: ((Bool, Int, Int) -> Void)? = nil
    /// Automation / debug: seed a mix deck and jump straight into the versus intro.
    var autoStartFight: Bool = false
    /// Capture stills: skip versus splash, show the board chrome, keep physics paused.
    var captureFreezeBoard: Bool = false

    private enum Stage {
        case deck
        case fight
    }

    @State private var stage: Stage = .deck
    @State private var deck: [String] = []
    @State private var sessionID = UUID()
    @State private var phaseLabel = "DECK"
    @State private var statusLine = "Build a deck of 10 marbles"
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
    /// Mid-shot tallies park on the board corners, then fly up to the portraits.
    @State private var playerRailAccum = 0
    @State private var enemyRailAccum = 0
    @State private var pendingBombRail = 0
    @State private var playerRailFrame: CGRect = .zero
    @State private var enemyRailFrame: CGRect = .zero
    @State private var playerRailPulse = false
    @State private var enemyRailPulse = false
    /// After a shot's rail is shot upward, ignore further mid-shot HUD bumps until aim returns.
    @State private var enemyRailFlushed = false
    @State private var lastEnemyTallyAt: Date = .distantPast
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var favoriteSlots: [MarbleFavoriteSlot?] = MarbleFavoriteStore.load()
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
    @State private var showFightDrawer = false
    @State private var boardShake: CGSize = .zero
    @State private var boardShakeToken: UInt = 0
    @State private var currentOrbID: String = OrbKind.sparkle.id
    /// Aim trackpad thumb (−1 left … +1 right). Absolute pad X, not relative drag.
    @State private var aimPadNormalizedX: CGFloat = 0
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
        let start: CGPoint
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
            if captureFreezeBoard {
                music.stop()
            } else {
                music.playSafari()
            }
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
                if let startingDeck, !startingDeck.isEmpty {
                    deck = startingDeck
                } else {
                    deck = (0..<PeglinBattleRules.mixFillCount).map { _ in
                        OrbKind.all.randomElement()?.id ?? OrbKind.sparkle.id
                    }
                }
                startFight()
                if captureFreezeBoard {
                    applyCaptureFreeze()
                }
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
                // Bleed — no scenic letterbox/pillarbox around the fight chrome.
                MarbleVoyageBleedPlate(
                    semanticName: sceneBackgroundAsset,
                    fallbackIcon: "leaf.fill",
                    fallbackLabel: title
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
                : "\(foe.shortLabel) steps closer"
        }
        return 0
    }

    private var deckCrewCaption: String {
        switch gangFightRole {
        case .bigBoss:
            return "Summit boss · \(chromeFocusCrew.displayName)"
        case .miniBoss:
            return "Land boss · \(chromeFocusCrew.displayName)"
        case .henchman:
            return "\(chromeFocusCrew.shortName)’s crew"
        case .none:
            return "Rescue the friend!"
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

    // MARK: - Deck builder (directed marble pick)

    private var deckBuilder: some View {
        ZStack(alignment: .leading) {
            VStack(spacing: 14) {
                HStack {
                    leaveButton
                    Spacer()
                }

                ScrollView(.vertical, showsIndicators: false) {
                    VStack(spacing: 16) {
                        HStack(alignment: .center, spacing: 16) {
                            PeglinAbbieBattlePortrait(state: .happy, size: 88)
                            VStack(alignment: .leading, spacing: 4) {
                                Text(title)
                                    .font(.system(size: 15, weight: .bold, design: .rounded))
                                    .foregroundStyle(Color(red: 0.55, green: 0.9, blue: 0.65))
                                Text("Choose your Marbles")
                                    .font(.system(size: 26, weight: .heavy, design: .rounded))
                                    .foregroundStyle(.white)
                                Text("Tap a marble — drop as fast as you like (up to \(PeglinBattleRules.maxDeckCount)). Ready after \(PeglinBattleRules.readyDeckCount)!")
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

            // Music lives in the same left drawer pattern as fight (no permanent top bar).
            deckMusicDrawer
                .zIndex(20)

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
            MarbleHeartIconPickerSheet { iconID in
                saveFavorite(slot: token.slot, iconID: iconID)
                emojiPickerSlot = nil
            } onCancel: {
                emojiPickerSlot = nil
            }
            .presentationDetents([.height(260)])
            .presentationDragIndicator(.visible)
        }
    }

    /// Deck-only music drawer (same left-edge language as fight).
    private var deckMusicDrawer: some View {
        HStack(spacing: 0) {
            Button {
                PlinkSFX.play(.ui)
                withAnimation(.spring(response: 0.34, dampingFraction: 0.84)) {
                    showFightDrawer.toggle()
                    if !showFightDrawer { showMusicDetail = false }
                }
            } label: {
                VStack(spacing: 10) {
                    Image(systemName: showFightDrawer ? "chevron.left" : "chevron.right")
                        .font(.system(size: 13, weight: .black))
                    Image(systemName: "music.note")
                        .font(.system(size: 15, weight: .bold))
                }
                .foregroundStyle(.white.opacity(0.95))
                .frame(width: 34)
                .padding(.vertical, 16)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .background(
                UnevenRoundedRectangle(
                    topLeadingRadius: 0,
                    bottomLeadingRadius: 0,
                    bottomTrailingRadius: 14,
                    topTrailingRadius: 14,
                    style: .continuous
                )
                .fill(.ultraThinMaterial.opacity(0.94))
                .overlay(
                    UnevenRoundedRectangle(
                        topLeadingRadius: 0,
                        bottomLeadingRadius: 0,
                        bottomTrailingRadius: 14,
                        topTrailingRadius: 14,
                        style: .continuous
                    )
                    .stroke(Color.white.opacity(0.25), lineWidth: 1)
                )
            )
            .accessibilityLabel(showFightDrawer ? "Close music" : "Open music")
            .accessibilityIdentifier("world2.plink.deck.drawer.toggle")

            if showFightDrawer {
                musicPlayerOverlay
                    .frame(width: MarbleVoyageDesignRules.battleFeedMinWidth)
                    .padding(12)
                    .frame(width: MarbleVoyageDesignRules.battleFeedMinWidth + 24)
                    .background(
                        UnevenRoundedRectangle(
                            topLeadingRadius: 0,
                            bottomLeadingRadius: 0,
                            bottomTrailingRadius: 18,
                            topTrailingRadius: 18,
                            style: .continuous
                        )
                        .fill(.ultraThinMaterial.opacity(0.96))
                        .overlay(
                            UnevenRoundedRectangle(
                                topLeadingRadius: 0,
                                bottomLeadingRadius: 0,
                                bottomTrailingRadius: 18,
                                topTrailingRadius: 18,
                                style: .continuous
                            )
                            .stroke(Color.white.opacity(0.22), lineWidth: 1)
                        )
                    )
                    .transition(.move(edge: .leading).combined(with: .opacity))
                    .accessibilityIdentifier("world2.plink.deck.drawer")
            }

            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .animation(.spring(response: 0.34, dampingFraction: 0.84), value: showFightDrawer)
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

                ForEach(0..<MarbleFavoriteStore.slotCount, id: \.self) { slot in
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
        let tile = saved.flatMap { MarbleHeartIcon.tile(for: $0.iconID) }
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
            saved.flatMap { MarbleHeartIcon.tile(for: $0.iconID)?.label }.map { "Favorite \($0). Tap to load." }
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
        while next.count < MarbleFavoriteStore.slotCount { next.append(nil) }
        next[slot] = MarbleFavoriteSlot(iconID: iconID, deck: deck)
        favoriteSlots = next
        MarbleFavoriteStore.save(next)
        PeglinEdition.log("marble_favorite_saved", ["slot": "\(slot)", "icon": iconID])
    }

    private func clearFavorite(slot: Int) {
        var next = favoriteSlots
        while next.count < MarbleFavoriteStore.slotCount { next.append(nil) }
        next[slot] = nil
        favoriteSlots = next
        MarbleFavoriteStore.save(next)
    }

    /// Real device insets. Fight stays nearly edge-to-edge; deck keeps bezel floors.
    private var chromeInsets: EdgeInsets {
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        let windows = scenes.flatMap(\.windows)
        let inset = (windows.first(where: \.isKeyWindow) ?? windows.first)?.safeAreaInsets ?? .zero
        if stage == .fight {
            // Board owns the screen — only a whisper of bezel clearance.
            return EdgeInsets(
                top: max(inset.top, 6),
                leading: max(inset.left, 2),
                bottom: max(inset.bottom, 4),
                trailing: max(inset.right, 2)
            )
        }
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
        PeglinEdition.log("marble_picked", ["orb": id, "count": "\(deck.count + pending + 1)"])

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
                fightHeaderBar
                    .opacity(Double(fightIntroProgress))

                GeometryReader { row in
                    let cardWidth = MarbleVoyageDesignRules.fightEnemyCardWidth(in: row.size.width)
                    HStack(alignment: .top, spacing: 10) {
                        ZStack(alignment: .topTrailing) {
                            fightBoardPane
                                .frame(maxWidth: .infinity, maxHeight: .infinity)
                                .clipped()
                                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                                .background(
                                    GeometryReader { geo in
                                        Color.clear.preference(
                                            key: PlinkBattleBoardFrameKey.self,
                                            value: geo.frame(in: .named("plinkBattleSpace"))
                                        )
                                    }
                                )

                            // Damage rails — accumulate mid-shot, then shoot up to portraits.
                            damageRailChip(amount: playerRailAccum, hitsPlayer: true, pulsing: playerRailPulse)
                                .padding(.leading, showFightDrawer ? MarbleVoyageDesignRules.battleFeedMinWidth + 60 : 44)
                                .padding(.top, 12)
                                .background(
                                    GeometryReader { geo in
                                        Color.clear.preference(
                                            key: PlinkBattleRailFrameKey.self,
                                            value: [true: geo.frame(in: .named("plinkBattleSpace"))]
                                        )
                                    }
                                )
                                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                                .opacity(Double(fightIntroProgress))
                                .zIndex(7)
                                .allowsHitTesting(false)

                            damageRailChip(amount: enemyRailAccum, hitsPlayer: false, pulsing: enemyRailPulse)
                                .padding(.trailing, 10)
                                .padding(.top, 12)
                                .background(
                                    GeometryReader { geo in
                                        Color.clear.preference(
                                            key: PlinkBattleRailFrameKey.self,
                                            value: [false: geo.frame(in: .named("plinkBattleSpace"))]
                                        )
                                    }
                                )
                                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
                                .opacity(Double(fightIntroProgress))
                                .zIndex(7)
                                .allowsHitTesting(false)

                            // Aim trackpad — fixed-size bottom-right marble surface.
                            currentOrbChip
                                .padding(.trailing, 12)
                                .padding(.bottom, 14)
                                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
                                .opacity(Double(fightIntroProgress))
                                .zIndex(12)
                                .allowsHitTesting(fightIntroProgress > 0.5)

                            // Feed + music + powers — left-side drawer (board stays clear).
                            fightSideDrawer
                                .opacity(Double(fightIntroProgress))
                                .zIndex(9)
                        }
                        .offset(x: boardShake.width, y: boardShake.height)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)

                        fightEnemyCard
                            .frame(width: cardWidth)
                            .frame(maxHeight: .infinity, alignment: .top)
                            .opacity(Double(fightIntroProgress))
                    }
                    .frame(width: row.size.width, height: row.size.height, alignment: .top)
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
        .onPreferenceChange(PlinkBattleRailFrameKey.self) { frames in
            if let player = frames[true] { playerRailFrame = player }
            if let enemy = frames[false] { enemyRailFrame = enemy }
        }
    }

    private var fightActivityLine: String {
        let living = foeRoster.filter { !$0.isDefeated }.count
        let total = max(1, foeRoster.count)
        let foeIndex = min(total, max(1, total - living + 1))
        return "Battle · Foe \(foeIndex) of \(total)"
    }

    private var fightObjectiveLine: String {
        let total = max(1, foeRoster.count)
        let name = enemyKind?.shortName ?? "friend"
        return "Rescue \(name) — defeat all \(total) foes"
    }

    private var fightRoleLabel: String {
        switch gangFightRole {
        case .bigBoss: return "SUMMIT BOSS"
        case .miniBoss: return "LAND BOSS"
        case .henchman, .none: return "FIGHTING NOW"
        }
    }

    /// Left-edge drawer: damage history + music, collapsed to a slim handle by default.
    private var fightSideDrawer: some View {
        HStack(spacing: 0) {
            Button {
                PlinkSFX.play(.ui)
                withAnimation(.spring(response: 0.34, dampingFraction: 0.84)) {
                    showFightDrawer.toggle()
                    if !showFightDrawer { showMusicDetail = false }
                }
            } label: {
                VStack(spacing: 10) {
                    Image(systemName: showFightDrawer ? "chevron.left" : "chevron.right")
                        .font(.system(size: 13, weight: .black))
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 14, weight: .bold))
                    Image(systemName: "list.bullet.rectangle")
                        .font(.system(size: 15, weight: .bold))
                    Image(systemName: "bolt.fill")
                        .font(.system(size: 14, weight: .bold))
                    Image(systemName: "music.note")
                        .font(.system(size: 14, weight: .bold))
                    if !showFightDrawer, (totalDamageDealt + totalDamageTaken) > 0 {
                        Text("\(totalDamageDealt)")
                            .font(.system(size: 11, weight: .black, design: .rounded))
                            .foregroundStyle(Color(red: 0.45, green: 0.95, blue: 0.55))
                    }
                }
                .foregroundStyle(.white.opacity(0.95))
                .frame(width: 34)
                .padding(.vertical, 16)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .background(
                UnevenRoundedRectangle(
                    topLeadingRadius: 0,
                    bottomLeadingRadius: 0,
                    bottomTrailingRadius: 14,
                    topTrailingRadius: 14,
                    style: .continuous
                )
                .fill(.ultraThinMaterial.opacity(0.94))
                .overlay(
                    UnevenRoundedRectangle(
                        topLeadingRadius: 0,
                        bottomLeadingRadius: 0,
                        bottomTrailingRadius: 14,
                        topTrailingRadius: 14,
                        style: .continuous
                    )
                    .stroke(Color.white.opacity(0.25), lineWidth: 1)
                )
            )
            .accessibilityLabel(showFightDrawer ? "Close menu" : "Open menu — leave, log, powers, music")
            .accessibilityIdentifier("world2.plink.battle.drawer.toggle")

            if showFightDrawer {
                VStack(alignment: .leading, spacing: 12) {
                    leaveButton
                        .frame(maxWidth: .infinity, alignment: .leading)

                    battleFeedPane
                        .frame(width: MarbleVoyageDesignRules.battleFeedMinWidth)
                        .frame(maxHeight: .infinity, alignment: .top)
                    powerUpOverlay
                        .frame(maxWidth: .infinity, alignment: .center)
                    musicPlayerOverlay
                        .frame(width: MarbleVoyageDesignRules.battleFeedMinWidth)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 12)
                .frame(width: MarbleVoyageDesignRules.battleFeedMinWidth + 24)
                .frame(maxHeight: .infinity)
                .background(
                    UnevenRoundedRectangle(
                        topLeadingRadius: 0,
                        bottomLeadingRadius: 0,
                        bottomTrailingRadius: 18,
                        topTrailingRadius: 18,
                        style: .continuous
                    )
                    .fill(.ultraThinMaterial.opacity(0.96))
                    .overlay(
                        UnevenRoundedRectangle(
                            topLeadingRadius: 0,
                            bottomLeadingRadius: 0,
                            bottomTrailingRadius: 18,
                            topTrailingRadius: 18,
                            style: .continuous
                        )
                        .stroke(Color.white.opacity(0.22), lineWidth: 1)
                    )
                )
                .transition(.move(edge: .leading).combined(with: .opacity))
                .accessibilityIdentifier("world2.plink.battle.drawer")
            }

            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .animation(.spring(response: 0.34, dampingFraction: 0.84), value: showFightDrawer)
    }

    /// Owned voyage charms — vertical stack on the unused right rail.
    @ViewBuilder
    private var fightCharmRail: some View {
        let stacks = voyageEconomy?.charmStacks ?? [:]
        let ordered = MarbleVoyageCharm.allCases.filter { (stacks[$0] ?? 0) > 0 }
        if !ordered.isEmpty {
            VStack(spacing: 8) {
                ForEach(ordered) { charm in
                    let n = stacks[charm] ?? 1
                    ZStack(alignment: .bottomTrailing) {
                        Group {
                            if let ui = UIImage(named: charm.catalogImageName) {
                                Image(uiImage: ui)
                                    .resizable()
                                    .scaledToFit()
                            } else {
                                Image(systemName: "sparkles")
                                    .font(.system(size: 18, weight: .bold))
                                    .foregroundStyle(.white.opacity(0.9))
                            }
                        }
                        .frame(width: 44, height: 44)
                        .padding(4)
                        .background(
                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .fill(Color.black.opacity(0.45))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                                        .stroke(Color.white.opacity(0.35), lineWidth: 1)
                                )
                        )
                        if n > 1 {
                            Text("×\(n)")
                                .font(.system(size: 11, weight: .black, design: .rounded))
                                .foregroundStyle(.white)
                                .padding(.horizontal, 5)
                                .padding(.vertical, 1)
                                .background(Capsule().fill(Color(red: 1.0, green: 0.55, blue: 0.22)))
                                .offset(x: 4, y: 4)
                        }
                    }
                    .accessibilityLabel("\(charm.title), \(n)")
                }
            }
            .accessibilityIdentifier("world2.plink.battle.charmRail")
        }
    }

    private func pulseBoardShake(intensity: CGFloat = 10) {
        boardShakeToken &+= 1
        let token = boardShakeToken
        let kicks = 6
        for i in 0..<kicks {
            let delay = Double(i) * 0.03
            DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
                guard token == boardShakeToken else { return }
                let falloff = 1.0 - (Double(i) / Double(kicks))
                let amp = intensity * CGFloat(falloff)
                withAnimation(.linear(duration: 0.03)) {
                    boardShake = CGSize(
                        width: CGFloat.random(in: -amp...amp),
                        height: CGFloat.random(in: -amp...amp)
                    )
                }
            }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + Double(kicks) * 0.03 + 0.02) {
            guard token == boardShakeToken else { return }
            withAnimation(.easeOut(duration: 0.08)) {
                boardShake = .zero
            }
        }
    }

    /// Powers live in the left drawer — horizontal tray, board stays clear.
    private var powerUpOverlay: some View {
        HStack(spacing: 10) {
            ForEach(PlinkPowerUp.allCases) { kind in
                let n = powerUpCounts[kind] ?? 0
                Button {
                    usePowerUp(kind)
                } label: {
                    ZStack(alignment: .bottomTrailing) {
                        PlinkPowerUpChip(kind: kind, size: 56)
                            .shadow(color: .black.opacity(0.5), radius: 6, y: 3)
                            .opacity(n > 0 ? 1 : 0.38)
                            .brightness(n > 0 ? 0 : -0.12)
                        if n > 0 {
                            Text("\(n)")
                                .font(.system(size: 12, weight: .black, design: .rounded))
                                .foregroundStyle(.white)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(
                                    Capsule(style: .continuous)
                                        .fill(Color(red: 0.95, green: 0.35, blue: 0.2))
                                        .shadow(color: .black.opacity(0.35), radius: 3, y: 1)
                                )
                                .offset(x: 2, y: 2)
                        }
                    }
                    .frame(width: 62, height: 62)
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

    /// Compact transport + expandable detail tile (lives in the fight drawer).
    private var musicPlayerOverlay: some View {
        VStack(alignment: .leading, spacing: 8) {
            if showMusicDetail {
                musicDetailTile
                    .transition(.asymmetric(
                        insertion: .move(edge: .bottom).combined(with: .opacity),
                        removal: .opacity
                    ))
            }
            musicTransportBar
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .animation(.spring(response: 0.34, dampingFraction: 0.82), value: showMusicDetail)
    }

    private var musicTransportBar: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 4) {
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

                Spacer(minLength: 4)

                Button {
                    PlinkSFX.play(.ui)
                    withAnimation(.spring(response: 0.34, dampingFraction: 0.82)) {
                        showMusicDetail.toggle()
                    }
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "music.note")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(Color(red: 1, green: 0.82, blue: 0.42))
                        Text(music.currentTrackTitle)
                            .font(.system(size: 12, weight: .bold, design: .rounded))
                            .foregroundStyle(.white)
                            .lineLimit(1)
                    }
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Open music details")
                .accessibilityIdentifier("world2.plink.music.detail")
            }

            HStack(spacing: 6) {
                Image(systemName: music.volume < 0.05 ? "speaker.slash.fill" : "speaker.wave.2.fill")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(.white.opacity(0.75))
                Slider(
                    value: Binding(
                        get: { Double(music.volume) },
                        set: { music.setVolume(Float($0)) }
                    ),
                    in: 0...1
                )
                .tint(Color(red: 0.55, green: 0.9, blue: 0.72))
                .accessibilityLabel("Volume")
            }
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .background(.ultraThinMaterial.opacity(0.92), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(.white.opacity(0.28), lineWidth: 1)
        )
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
                                        .font(.system(size: MarbleVoyageDesignRules.battleFeedMinMetaFont, weight: .medium, design: .rounded))
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

    /// Short header: Abbie + place/activity + marbles left. Enemy lives on the side cast card.
    private var fightHeaderBar: some View {
        let art = MarbleVoyageDesignRules.fightPortraitArtSize
        return HStack(alignment: .center, spacing: 12) {
            fightAbbieCell(art: art)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 13, weight: .bold, design: .rounded))
                    .foregroundStyle(Color(red: 0.65, green: 0.9, blue: 1.0))
                    .lineLimit(1)
                Text(fightActivityLine)
                    .font(.system(size: 18, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                    .lineLimit(1)
                Text(fightObjectiveLine)
                    .font(.system(size: 12, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white.opacity(0.78))
                    .lineLimit(2)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            VStack(alignment: .trailing, spacing: 2) {
                Text("\(ballsLeft)")
                    .font(.system(size: 22, weight: .black, design: .rounded))
                    .foregroundStyle(Color(red: 1.0, green: 0.84, blue: 0.3))
                    .monospacedDigit()
                Text(ballsLeft == 1 ? "marble left" : "marbles left")
                    .font(.system(size: 11, weight: .bold, design: .rounded))
                    .foregroundStyle(.white.opacity(0.7))
            }
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(.ultraThinMaterial.opacity(0.82))
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .fill(Color.black.opacity(0.32))
                )
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(Color.white.opacity(0.18), lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.22), radius: 8, y: 2)
        .accessibilityIdentifier("world2.plink.battle.header")
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

    /// Cast card beside the board — role, hero art, HP/ATK, intent, bench, rescue.
    private var fightEnemyCard: some View {
        let accent = Color(red: 1, green: 0.55, blue: 0.32)
        let art = MarbleVoyageDesignRules.fightEnemyCardArtSize
        return ScrollView(.vertical, showsIndicators: false) {
            VStack(alignment: .leading, spacing: 10) {
                Text(fightRoleLabel)
                    .font(.system(size: 12, weight: .black, design: .rounded))
                    .tracking(1.4)
                    .foregroundStyle(accent)

                if let front = frontFoe {
                    fightFrontFoeHero(foe: front, art: art, accent: accent)
                        .frame(maxWidth: .infinity)

                    Text(front.kind.displayName)
                        .font(.system(size: 24, weight: .black, design: .rounded))
                        .foregroundStyle(.white)
                        .lineLimit(2)
                        .minimumScaleFactor(0.85)

                    Text(title)
                        .font(.system(size: 13, weight: .bold, design: .rounded))
                        .foregroundStyle(.white.opacity(0.72))

                    Text(front.kind.castBlurb)
                        .font(.system(size: 13, weight: .semibold, design: .rounded))
                        .foregroundStyle(.white.opacity(0.88))
                        .fixedSize(horizontal: false, vertical: true)

                    HStack(spacing: 8) {
                        fightStatChip(label: "HP", value: front.isDefeated ? "OUT" : "\(front.hp)/\(front.maxHP)")
                        fightStatChip(label: "ATK", value: "\(resolvedEnemyAttack)")
                    }

                    Text(frontFoeIntentLine(front))
                        .font(.system(size: 12, weight: .bold, design: .rounded))
                        .foregroundStyle(Color(red: 1, green: 0.75, blue: 0.45))
                        .fixedSize(horizontal: false, vertical: true)
                }

                if foeRoster.count > 1 {
                    Text("Next up")
                        .font(.system(size: 11, weight: .black, design: .rounded))
                        .foregroundStyle(.white.opacity(0.55))
                        .tracking(0.6)
                    fightBenchRow(art: 44)
                }

                fightRescueChip

                fightCharmRail
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(12)
        }
        .background(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .fill(.ultraThinMaterial.opacity(0.9))
                .overlay(
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .fill(Color.black.opacity(0.38))
                )
        )
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(accent.opacity(0.55), lineWidth: 1.5)
        )
        .shadow(color: .black.opacity(0.28), radius: 10, y: 3)
        .accessibilityIdentifier("world2.plink.battle.enemyCard")
    }

    private func fightStatChip(label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(.system(size: MarbleVoyageDesignRules.battleFeedMinMetaFont, weight: .black, design: .rounded))
                .tracking(0.8)
                .foregroundStyle(Color(red: 1, green: 0.55, blue: 0.32))
            Text(value)
                .font(.system(size: 16, weight: .black, design: .rounded))
                .foregroundStyle(.white)
                .monospacedDigit()
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(Color.white.opacity(0.14), lineWidth: 1)
        )
    }

    private var fightRescueChip: some View {
        HStack(spacing: 8) {
            if let enemyKind {
                PeglinEnemyBattlePortrait(kind: enemyKind, state: cageShattered ? .happy : enemyState, size: 44)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text("RESCUE")
                    .font(.system(size: MarbleVoyageDesignRules.battleFeedMinMetaFont, weight: .black, design: .rounded))
                    .tracking(0.8)
                    .foregroundStyle(Color(red: 0.45, green: 0.95, blue: 0.85))
                Text(fightObjectiveLine)
                    .font(.system(size: 12, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(Color(red: 0.12, green: 0.35, blue: 0.38).opacity(0.85))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(Color(red: 0.45, green: 0.95, blue: 0.85).opacity(0.55), lineWidth: 1.5)
        )
        .accessibilityIdentifier("world2.plink.battle.rescue")
    }

    private var fightChromeDivider: some View {
        Rectangle()
            .fill(Color.white.opacity(0.14))
            .frame(width: 1)
            .padding(.vertical, 4)
            .padding(.horizontal, 6)
    }

    private func fightAbbieCell(art: CGFloat) -> some View {
        let fraction = playerMaxHP == 0 ? 0 : CGFloat(playerHP) / CGFloat(playerMaxHP)
        let tint = Color(red: 0.45, green: 0.88, blue: 0.58)
        return VStack(spacing: 5) {
            ZStack(alignment: .top) {
                PeglinAbbieBattlePortrait(state: abbieState, size: art)
                    .shadow(color: tint.opacity(0.35), radius: 6, y: 2)
                if let float = playerHPFloat {
                    Text(float.text)
                        .font(.system(size: 22, weight: .black, design: .rounded))
                        .foregroundStyle(
                            float.isHeal
                                ? Color(red: 0.45, green: 1, blue: 0.55)
                                : Color(red: 1, green: 0.35, blue: 0.35)
                        )
                        .shadow(color: .black.opacity(0.75), radius: 3, y: 1)
                        .scaleEffect(playerImpactFlash ? 1.25 : 1.0)
                        .offset(y: -12)
                        .id(float.id)
                        .transition(.scale.combined(with: .opacity))
                        .allowsHitTesting(false)
                }
            }
            .offset(x: playerShake)
            .scaleEffect(playerImpactFlash ? 1.04 : 1.0)

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(Color.white.opacity(0.16))
                    Capsule()
                        .fill(tint)
                        .frame(width: geo.size.width * max(0, min(1, fraction)))
                }
            }
            .frame(width: art * 0.92, height: 8)
            Text("\(playerHP)/\(playerMaxHP)")
                .font(.system(size: 13, weight: .bold, design: .rounded))
                .foregroundStyle(.white.opacity(0.9))
                .monospacedDigit()
        }
        .padding(.trailing, 2)
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

    private func fightFrontFoeHero(foe: PlinkBattleFoe, art: CGFloat, accent: Color) -> some View {
        let frontSize: CGFloat = {
            if art >= MarbleVoyageDesignRules.fightEnemyCardArtSize * 0.9 {
                return art
            }
            return MarbleVoyageDesignRules.fightEnemyPortraitSize(maxHP: foe.maxHP, base: art)
        }()
        let fraction = foe.maxHP == 0 ? 0 : CGFloat(foe.hp) / CGFloat(foe.maxHP)
        return VStack(spacing: 5) {
            ZStack(alignment: .top) {
                PlinkAttackerBattlePortrait(
                    kind: foe.kind,
                    pose: attackerPose,
                    size: frontSize
                )
                .opacity(foe.isDefeated ? 0.28 : 1)
                .grayscale(foe.isDefeated ? 0.85 : 0)
                .scaleEffect(attackerPose == .attack ? 1.08 : 1.0)
                .animation(.spring(response: 0.28, dampingFraction: 0.7), value: attackerPose)
                .shadow(color: accent.opacity(0.45), radius: 8, y: 2)

                if foe.kind.isFlying, !foe.isDefeated {
                    Image(systemName: "wind")
                        .font(.system(size: 11, weight: .black))
                        .foregroundStyle(Color(red: 0.55, green: 0.9, blue: 1))
                        .padding(3)
                        .background(Color.black.opacity(0.55), in: Circle())
                        .offset(x: frontSize * 0.38, y: -4)
                }

                if let enemyHPFloat {
                    Text(enemyHPFloat.text)
                        .font(.system(size: 24, weight: .black, design: .rounded))
                        .foregroundStyle(
                            enemyHPFloat.isHeal
                                ? Color(red: 0.45, green: 1, blue: 0.55)
                                : Color(red: 1, green: 0.35, blue: 0.35)
                        )
                        .shadow(color: .black.opacity(0.75), radius: 3, y: 1)
                        .scaleEffect(enemyImpactFlash ? 1.25 : 1.0)
                        .offset(y: -12)
                        .id(enemyHPFloat.id)
                        .transition(.scale.combined(with: .opacity))
                        .allowsHitTesting(false)
                }
            }
            .offset(x: enemyShake)
            .scaleEffect(enemyImpactFlash ? 1.06 : 1.0)
            .accessibilityIdentifier("world2.plink.battle.attacker.active")

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(Color.white.opacity(0.18))
                    Capsule()
                        .fill(foe.isDefeated
                              ? Color.gray.opacity(0.5)
                              : Color(red: 1, green: 0.45, blue: 0.28))
                        .frame(width: max(4, geo.size.width * fraction))
                }
            }
            .frame(width: frontSize * 0.92, height: 8)
            Text(foe.isDefeated ? "OUT" : "\(foe.hp)/\(foe.maxHP)")
                .font(.system(size: 13, weight: .bold, design: .rounded))
                .foregroundStyle(.white.opacity(0.9))
                .monospacedDigit()
        }
        .background(
            GeometryReader { geo in
                Color.clear.preference(
                    key: PlinkBattleBannerFrameKey.self,
                    value: [false: geo.frame(in: .named("plinkBattleSpace"))]
                )
            }
        )
        .accessibilityLabel("\(foe.kind.displayName) \(foe.hp) of \(foe.maxHP). \(frontFoeIntentLine(foe))")
    }

    private func frontFoeIntentLine(_ foe: PlinkBattleFoe) -> String {
        if foe.isDefeated { return "Down!" }
        if foe.kind.isFlying {
            return "Flies · hits for \(resolvedEnemyAttack) every shot"
        }
        if foe.lane <= PeglinBattleRules.meleeLane {
            return "In range · hits for \(resolvedEnemyAttack) after your shot"
        }
        if foe.lane == 1 {
            return "1 step away · reaches you next shot"
        }
        return "\(foe.lane) steps away · hits for \(resolvedEnemyAttack) at Abbie"
    }

    /// Fixed-size aim trackpad — far left = full left aim, far right = full right.
    private var currentOrbChip: some View {
        let orb = OrbKind.all.first(where: { $0.id == currentOrbID }) ?? .sparkle
        let padW = MarbleVoyageDesignRules.fightAimTrackpadWidth
        let padH = MarbleVoyageDesignRules.fightAimTrackpadHeight
        let thumb = MarbleVoyageDesignRules.fightAimTrackpadThumbSize
        let travel = max(1, padW - thumb - 16)
        let thumbX = 8 + (aimPadNormalizedX + 1) * 0.5 * travel
        let canAim = bridge?.scene.isAimingPhase == true

        return VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 6) {
                Text("AIM")
                    .font(.system(size: MarbleVoyageDesignRules.battleFeedMinMetaFont, weight: .black, design: .rounded))
                    .foregroundStyle(Color(red: 0.7, green: 0.9, blue: 0.8))
                    .tracking(0.8)
                Text(orb.name)
                    .font(.system(size: 13, weight: .heavy, design: .rounded))
                    .foregroundStyle(.white)
                    .lineLimit(1)
                Spacer(minLength: 0)
                Text(canAim ? "slide" : "…")
                    .font(.system(size: 11, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white.opacity(0.45))
            }
            .padding(.horizontal, 4)

            ZStack(alignment: .leading) {
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .fill(Color.black.opacity(0.35))
                // Center tick.
                Capsule()
                    .fill(Color.white.opacity(0.22))
                    .frame(width: 2, height: padH * 0.42)
                    .frame(maxWidth: .infinity)

                // Marble thumb — follows absolute X on the pad.
                Group {
                    if let ui = UIImage(named: orb.catalogImageName) {
                        Image(uiImage: ui)
                            .resizable()
                            .scaledToFit()
                    } else {
                        Circle().fill(Color.white.opacity(0.35))
                    }
                }
                .frame(width: thumb, height: thumb)
                .shadow(color: .black.opacity(0.45), radius: 4, y: 2)
                .offset(x: thumbX)
                .opacity(canAim ? 1 : 0.45)
            }
            .frame(width: padW, height: thumb + 12)
            .contentShape(Rectangle())
            .gesture(
                DragGesture(minimumDistance: 0, coordinateSpace: .local)
                    .onChanged { value in
                        guard canAim else { return }
                        // Absolute pad X → −1…1 (far left = fully left).
                        let nx = ((value.location.x / padW) * 2) - 1
                        let clamped = max(-1, min(1, nx))
                        aimPadNormalizedX = clamped
                        bridge?.scene.applyAimJoystick(normalizedX: clamped)
                    }
            )
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .frame(width: padW + 20, height: padH)
        .background(.ultraThinMaterial.opacity(0.94), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(
                    canAim
                        ? Color(red: 0.55, green: 0.95, blue: 0.75).opacity(0.55)
                        : Color.white.opacity(0.22),
                    lineWidth: 1.5
                )
        )
        .accessibilityLabel("Aim trackpad. Current marble \(orb.name). Drag left or right to angle.")
        .accessibilityIdentifier("world2.plink.battle.currentOrb")
        .accessibilityAddTraits(.allowsDirectInteraction)
        .accessibilityValue(String(format: "Aim %.0f percent", (aimPadNormalizedX + 1) * 50))
        .accessibilityAdjustableAction { direction in
            guard canAim else { return }
            let step: CGFloat = 0.12
            switch direction {
            case .increment: aimPadNormalizedX = min(1, aimPadNormalizedX + step)
            case .decrement: aimPadNormalizedX = max(-1, aimPadNormalizedX - step)
            @unknown default: break
            }
            bridge?.scene.applyAimJoystick(normalizedX: aimPadNormalizedX)
        }
    }

    /// Remaining pack — sized by max HP (small / medium / boss), not proximity.
    private func fightBenchRow(art: CGFloat) -> some View {
        let frontID = frontFoe?.id
        let bench = foeRoster.filter { $0.id != frontID }
        return HStack(alignment: .bottom, spacing: 8) {
            ForEach(bench) { foe in
                let size = MarbleVoyageDesignRules.fightEnemyPortraitSize(maxHP: foe.maxHP, base: art)
                VStack(spacing: 2) {
                    PlinkAttackerBattlePortrait(
                        kind: foe.kind,
                        pose: .idle,
                        size: size
                    )
                    .opacity(foe.isDefeated ? 0.28 : 0.7)
                    .grayscale(foe.isDefeated ? 0.85 : 0)

                    Text(foe.isDefeated ? "OUT" : "\(foe.hp)")
                        .font(.system(size: MarbleVoyageDesignRules.battleFeedMinMetaFont, weight: .black, design: .rounded))
                        .foregroundStyle(.white.opacity(foe.isDefeated ? 0.45 : 0.85))
                        .monospacedDigit()
                }
                .accessibilityIdentifier("world2.plink.battle.attacker.\(foe.kind.rawValue)")
            }
        }
    }

    private var fightBoardPane: some View {
        GeometryReader { geo in
            // Fill the pane — no 4:3 letterbox / pillarbox. Scene rebuilds via resizeFill.
            ZStack {
                Color(red: 0.04, green: 0.07, blue: 0.12)
                if let bridge {
                    SpriteView(
                        scene: bridge.scene,
                        options: [.allowsTransparency, .ignoresSiblingOrder]
                    )
                    .id(sessionID)
                    .frame(width: geo.size.width, height: geo.size.height)
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
                        .frame(width: geo.size.width, height: geo.size.height)
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
                            if voyageEconomy == nil, startingDeck == nil {
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
                            }
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
            .frame(width: geo.size.width, height: geo.size.height)
        }
    }

    /// Compact top-right battle feed overlay.
    private var battleFeedPane: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 4) {
                feedTotalChip(
                    title: "Dealt",
                    value: totalDamageDealt,
                    tint: Color(red: 0.45, green: 0.9, blue: 0.55),
                    pulsed: feedGlow && totalDamageDealt > 0
                )
                feedTotalChip(
                    title: "Taken",
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

    private func damageRailChip(amount: Int, hitsPlayer: Bool, pulsing: Bool) -> some View {
        let tint = hitsPlayer
            ? Color(red: 1, green: 0.45, blue: 0.35)
            : Color(red: 0.45, green: 0.95, blue: 0.55)
        let label = hitsPlayer ? "−\(amount)" : "+\(amount)"
        return Group {
            if amount > 0 {
                Text(label)
                    .font(.system(size: 30, weight: .black, design: .rounded))
                    .foregroundStyle(tint)
                    .shadow(color: .black.opacity(0.85), radius: 3, y: 1)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 8)
                    .background(
                        Capsule()
                            .fill(Color.black.opacity(0.58))
                            .overlay(Capsule().stroke(tint.opacity(0.95), lineWidth: 2.5))
                    )
                    .scaleEffect(pulsing ? 1.12 : 1.0)
                    .animation(.spring(response: 0.22, dampingFraction: 0.55), value: amount)
                    .animation(.spring(response: 0.18, dampingFraction: 0.5), value: pulsing)
                    .accessibilityLabel(hitsPlayer ? "Pending damage \(amount)" : "Pending hit \(amount)")
            }
        }
    }

    private func flyingDamageChip(_ flight: DamageFlight) -> some View {
        let end = flight.hitsPlayer
            ? (playerBannerFrame == .zero
               ? CGRect(origin: flight.start, size: CGSize(width: 1, height: 1))
               : playerBannerFrame)
            : (enemyBannerFrame == .zero
               ? CGRect(origin: flight.start, size: CGSize(width: 1, height: 1))
               : enemyBannerFrame)
        let t = damageFlightProgress[flight.id] ?? 0
        let eased = 1 - pow(1 - t, 3)
        let x = flight.start.x + (end.midX - flight.start.x) * eased
        let y = flight.start.y + (end.midY - flight.start.y) * eased - 40 * sin(.pi * eased)
        let scale = 1.2 - 0.15 * eased
        let tint = flight.hitsPlayer
            ? Color(red: 1, green: 0.45, blue: 0.35)
            : Color(red: 0.45, green: 0.95, blue: 0.55)
        let label = flight.hitsPlayer ? "−\(flight.amount)" : "+\(flight.amount)"
        return ZStack {
            Circle()
                .fill(tint.opacity(0.28))
                .frame(width: 88, height: 88)
                .blur(radius: 6)
            Text(label)
                .font(.system(size: 34, weight: .black, design: .rounded))
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

    /// Shoot a parked rail total up into the matching portrait.
    private func launchDamageFlight(amount: Int, hitsPlayer: Bool, start: CGPoint, delay: TimeInterval = 0) {
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
            let flight = DamageFlight(id: id, amount: amount, hitsPlayer: hitsPlayer, start: start)
            damageFlights.append(flight)
            damageFlightProgress[id] = 0
            withAnimation(.easeInOut(duration: 0.52)) {
                damageFlightProgress[id] = 1
            }
            try? await Task.sleep(for: .milliseconds(520))
            damageFlights.removeAll { $0.id == id }
            damageFlightProgress[id] = nil
            impactPortrait(hitsPlayer: hitsPlayer, amount: amount)
        }
    }

    private func railStartPoint(hitsPlayer: Bool) -> CGPoint {
        let frame = hitsPlayer ? playerRailFrame : enemyRailFrame
        if frame != .zero {
            return CGPoint(x: frame.midX, y: frame.midY)
        }
        if boardFrame != .zero {
            return hitsPlayer
                ? CGPoint(x: boardFrame.minX + 56, y: boardFrame.minY + 36)
                : CGPoint(x: boardFrame.maxX - 56, y: boardFrame.minY + 36)
        }
        return CGPoint(x: hitsPlayer ? 80 : 520, y: 220)
    }

    private func pulseRail(hitsPlayer: Bool) {
        if hitsPlayer {
            playerRailPulse = true
            Task { @MainActor in
                try? await Task.sleep(for: .milliseconds(120))
                playerRailPulse = false
            }
        } else {
            enemyRailPulse = true
            Task { @MainActor in
                try? await Task.sleep(for: .milliseconds(120))
                enemyRailPulse = false
            }
        }
    }

    private func setEnemyRail(_ amount: Int) {
        guard amount != enemyRailAccum else { return }
        withAnimation(.spring(response: 0.22, dampingFraction: 0.62)) {
            enemyRailAccum = amount
        }
        if amount > 0 { pulseRail(hitsPlayer: false) }
    }

    private func flushEnemyRail(delay: TimeInterval = 0) {
        let amount = enemyRailAccum
        guard amount > 0 else {
            pendingBombRail = 0
            enemyRailFlushed = true
            return
        }
        let start = railStartPoint(hitsPlayer: false)
        withAnimation(.easeOut(duration: 0.12)) {
            enemyRailAccum = 0
        }
        pendingBombRail = 0
        enemyRailFlushed = true
        lastEnemyTallyAt = Date()
        launchDamageFlight(amount: amount, hitsPlayer: false, start: start, delay: delay)
    }

    private func flushPlayerRail(delay: TimeInterval = 0.28) {
        let amount = playerRailAccum
        guard amount > 0 else { return }
        let start = railStartPoint(hitsPlayer: true)
        // Keep the chip visible on the rail briefly, then clear as the flight starts.
        Task { @MainActor in
            let hold = max(0, delay)
            if hold > 0 {
                try? await Task.sleep(for: .milliseconds(Int(hold * 1000)))
            }
            guard playerRailAccum == amount else { return }
            withAnimation(.easeOut(duration: 0.1)) {
                playerRailAccum = 0
            }
            launchDamageFlight(amount: amount, hitsPlayer: true, start: start, delay: 0)
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
        // Damage uses corner rails + flight. Heals still pop on the portrait.
        guard delta != 0 else { return }
        if delta < 0 {
            if onPlayer {
                withAnimation(.spring(response: 0.22, dampingFraction: 0.62)) {
                    playerRailAccum = abs(delta)
                }
                pulseRail(hitsPlayer: true)
                let delay: TimeInterval = Date().timeIntervalSince(lastEnemyTallyAt) < 0.6
                    ? 0.55
                    : 0.28
                flushPlayerRail(delay: delay)
            } else {
                setEnemyRail(max(enemyRailAccum, abs(delta)))
                flushEnemyRail()
            }
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
                .font(.system(size: 14, weight: .bold, design: .rounded))
                .padding(.horizontal, 12)
                .padding(.vertical, 7)
                .background(.ultraThinMaterial.opacity(0.92), in: Capsule())
                .overlay(Capsule().stroke(.white.opacity(0.22), lineWidth: 1))
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
        showFightDrawer = false
        showMusicDetail = false
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
        playerRailAccum = 0
        enemyRailAccum = 0
        pendingBombRail = 0
        enemyRailFlushed = false
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
        statusLine = "Aim and drop! Hit the front bad guy."
        // Keep safari music through the versus splash; board music kicks in on cutaway.
        showVersusIntro = true
        aimPadNormalizedX = 0

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
            scene.hoverSpeedRetain = MarbleVoyageCharm.hoverSpeedRetain(
                stacks: voyageEconomy.hoverStacks
            )
        }
        // Pause aim until the cutaway finishes revealing the board.
        scene.isPaused = true
        let next = PlinkBattleBridge(scene: scene, boardIndex: PeglinBattleRules.boardIndex(for: enemyKind))
        next.onPhase = { phase in
            phaseLabel = phase
            if phase == "VICTORY" || phase == "DEFEAT" || phase == "RESCUED" || phase == "MELEE" {
                refreshHostageMood()
            }
        }
        next.onHud = { snap in
            withAnimation(.easeOut(duration: 0.15)) {
                // Keep feed quiet — no "PLAYER TURN" / "RESOLVE SHOT" board chatter.
                if snap.phase == .aim || snap.phase == .won || snap.phase == .lost {
                    statusLine = snap.status
                }
                ballsLeft = snap.ballsLeft
                shotScore = snap.shotScore
                currentOrbID = snap.orbID
                // Scene owns front-foe HP (applied at shot settle only).
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
                if !enemyRailFlushed {
                    setEnemyRail(snap.shotScore + pendingBombRail)
                }
            } else {
                enemyRailFlushed = false
            }
        }
        next.onDamage = { dmg in
            abbieState = .sneakyWink
            phaseLabel = "HIT"
            refreshHostageMood()
            // Peg total already parked on the enemy rail — shoot it up.
            setEnemyRail(max(enemyRailAccum, dmg + pendingBombRail))
            flushEnemyRail()
        }
        next.onBombAOE = { dmg in
            phaseLabel = "BOMB"
            pulseBoardShake(intensity: 16)
            applyBombAOE(dmg)
            refreshHostageMood()
            if !enemyRailFlushed {
                pendingBombRail += dmg
                setEnemyRail(shotScore + pendingBombRail)
            }
            statusLine = "Bomb splash! −\(dmg) to every bad guy"
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
            statusLine = "\(name) hits Abbie! \(playerHP)/\(playerMaxHP)"
        }
        next.onRoundResolved = { summary in
            // Bomb-only shots never fire onDamage — flush any leftover rail total.
            if enemyRailAccum > 0 {
                flushEnemyRail()
            }
            let punch = summary.bombAOE + summary.damageToEnemy
            if summary.bombAOE > 0 {
                pulseBoardShake(intensity: 14)
            } else if punch >= 18 {
                pulseBoardShake(intensity: 8)
            }
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

    /// Silent layout still: board visible, no versus splash, physics frozen.
    private func applyCaptureFreeze() {
        music.stop()
        showVersusIntro = false
        fightIntroProgress = 1
        bridge?.scene.isPaused = true
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
struct MarbleFavoriteSlot: Codable, Equatable {
    var iconID: String
    var deck: [String]
}

enum MarbleFavoriteStore {
    static let slotCount = 3
    /// v3: marble naming (v2 stored under parbleFavorites — still read for migration).
    private static let key = "world2.plink.marbleFavorites.v3"
    private static let legacyKey = "world2.plink.parbleFavorites.v2"

    static func load() -> [MarbleFavoriteSlot?] {
        if let data = UserDefaults.standard.data(forKey: key),
           let decoded = try? JSONDecoder().decode([MarbleFavoriteSlot?].self, from: data) {
            return padded(decoded)
        }
        if let data = UserDefaults.standard.data(forKey: legacyKey),
           let decoded = try? JSONDecoder().decode([MarbleFavoriteSlot?].self, from: data) {
            let slots = padded(decoded)
            save(slots)
            UserDefaults.standard.removeObject(forKey: legacyKey)
            return slots
        }
        return Array(repeating: nil, count: slotCount)
    }

    static func save(_ slots: [MarbleFavoriteSlot?]) {
        var paddedSlots = slots
        while paddedSlots.count < slotCount { paddedSlots.append(nil) }
        if let data = try? JSONEncoder().encode(Array(paddedSlots.prefix(slotCount))) {
            UserDefaults.standard.set(data, forKey: key)
        }
    }

    private static func padded(_ decoded: [MarbleFavoriteSlot?]) -> [MarbleFavoriteSlot?] {
        var slots = decoded
        while slots.count < slotCount { slots.append(nil) }
        return Array(slots.prefix(slotCount))
    }
}

/// Cute iconic tiles for naming a saved marble heart (SF Symbols — always render).
enum MarbleHeartIcon {
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

private struct MarbleHeartIconPickerSheet: View {
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
                ForEach(MarbleHeartIcon.tiles) { tile in
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
                case .aim, .flying, .settling:
                    // Quiet — no "PLAYER TURN" / "RESOLVE SHOT" chrome on the board.
                    break
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

/// `true` = player damage rail (top-left), `false` = enemy rail (top-right).
private struct PlinkBattleRailFrameKey: PreferenceKey {
    static var defaultValue: [Bool: CGRect] = [:]
    static func reduce(value: inout [Bool: CGRect], nextValue: () -> [Bool: CGRect]) {
        value.merge(nextValue(), uniquingKeysWith: { $1 })
    }
}


import SwiftUI
import SpriteKit
#if canImport(UIKit)
import UIKit
#endif

/// Peglin sandbox battle: deck of 10 orbs → scene-plate board → peg points = enemy HP.
struct PlinkBattleHostView: View {
    var title: String = "Battle Clearing"
    var enemyKind: PeglinEnemyKind? = nil
    /// Same semantic plate as the land the player just left (e.g. `map.peglin.bramble`).
    var sceneBackgroundAsset: String = ""
    /// Player key for durable power-up inventory.
    var playerID: String? = nil
    /// Voyage / carried HP — when set, fight starts at this value (clamped to max).
    var startingPlayerHP: Int? = nil
    /// Optional foe / Abbie caps (Marble Voyage difficulty curve).
    var overrideEnemyMaxHP: Int? = nil
    var overridePlayerMaxHP: Int? = nil
    /// Optional foe ATK per round (voyage rising difficulty).
    var overrideEnemyAttack: Int? = nil
    var onExit: () -> Void
    var onVictory: (() -> Void)? = nil
    /// `(won, remainingPlayerHP)` — used by voyage runs that persist HP.
    var onBattleEnded: ((Bool, Int) -> Void)? = nil

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
    @State private var enemyHP = 0
    @State private var enemyMaxHP = 0
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
            enemyMaxHP = overrideEnemyMaxHP ?? PeglinBattleRules.enemyMaxHP(for: enemyKind)
            playerMaxHP = overridePlayerMaxHP ?? PeglinBattleRules.playerMaxHP(for: enemyKind)
            enemyHP = enemyMaxHP
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
                    "hp": "\(enemyMaxHP)",
                    "player_hp": "\(playerHP)",
                    "plate": sceneBackgroundAsset,
                ]
            )
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
        overrideEnemyAttack ?? PeglinBattleRules.enemyCounterAttack(for: enemyKind)
    }

    // MARK: - Deck builder (directed parble pick)

    private var deckBuilder: some View {
        ZStack {
            VStack(spacing: 14) {
                HStack {
                    leaveButton
                    Spacer()
                    musicPickerChip
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
                                Text("Foe \(enemyMaxHP) HP · ATK \(resolvedEnemyAttack) · You \(playerMaxHP) HP")
                                    .font(.system(size: 13, weight: .semibold, design: .rounded))
                                    .foregroundStyle(Color(red: 0.55, green: 0.9, blue: 0.65))
                            }
                            Spacer(minLength: 8)
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
            VStack(spacing: 6) {
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

                    // Compact tally — top-right overlay on the board.
                    battleFeedPane
                        .frame(width: 118)
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

                    // Jukebox + aim stick — bottom-right overlays.
                    VStack(alignment: .trailing, spacing: 10) {
                        jukeboxOverlay
                        aimJoystick
                    }
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

    private var jukeboxOverlay: some View {
        HStack(spacing: 4) {
            Button {
                PlinkSFX.play(.ui)
                music.cyclePrevious()
            } label: {
                Image(systemName: "backward.fill")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(.white.opacity(0.95))
                    .frame(width: 30, height: 30)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Previous track")

            Image(systemName: "music.note.list")
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(Color(red: 1, green: 0.85, blue: 0.45))

            Text(music.currentTrackTitle)
                .font(.system(size: 11, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
                .lineLimit(1)
                .frame(maxWidth: 110)

            Button {
                PlinkSFX.play(.ui)
                music.cycleNext()
            } label: {
                Image(systemName: "forward.fill")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(.white.opacity(0.95))
                    .frame(width: 30, height: 30)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Next track")
            .accessibilityIdentifier("world2.plink.music.next")
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(.ultraThinMaterial.opacity(0.85), in: Capsule())
        .overlay(Capsule().stroke(.white.opacity(0.35), lineWidth: 1))
        .shadow(color: .black.opacity(0.35), radius: 8, y: 3)
        .accessibilityIdentifier("world2.plink.music.picker")
    }

    /// Small on-screen stick for aiming (motor-skill assist). Release to fire.
    private var aimJoystick: some View {
        AimAssistJoystick(
            reduceMotion: reduceMotion,
            enabled: bridge?.scene.isAimingPhase ?? false
        ) { normalizedX in
            bridge?.scene.applyAimJoystick(normalizedX: normalizedX)
        } onRelease: {
            bridge?.scene.fireFromJoystick()
        }
    }

    private var cageFraction: CGFloat {
        guard enemyMaxHP > 0 else { return 1 }
        return CGFloat(enemyHP) / CGFloat(enemyMaxHP)
    }

    private func refreshHostageMood() {
        guard !cageShattered else {
            enemyState = .happy
            return
        }
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

    /// Large portraits above the board — Abbie left, foe right-aligned with the board edge.
    private var fightPortraitBar: some View {
        HStack(alignment: .bottom, spacing: 12) {
            fightFighterBanner(
                name: "Abbie",
                portrait: AnyView(PeglinAbbieBattlePortrait(state: abbieState, size: 112)),
                hp: playerHP,
                maxHP: playerMaxHP,
                tint: Color(red: 0.45, green: 0.85, blue: 0.55),
                float: playerHPFloat,
                shake: playerShake,
                impactFlash: playerImpactFlash,
                portraitOnLeading: true,
                isPlayer: true,
                meterTitle: "HP"
            )
            Spacer(minLength: 8)
            fightFighterBanner(
                name: enemyKind?.shortName ?? "Friend",
                portrait: AnyView(
                    Group {
                        if let enemyKind {
                            PeglinEnemyBattlePortrait(kind: enemyKind, state: enemyState, size: 112)
                        } else {
                            foePlaceholder(size: 112)
                        }
                    }
                ),
                hp: enemyHP,
                maxHP: enemyMaxHP,
                tint: Color(red: 0.9, green: 0.5, blue: 0.72),
                float: enemyHPFloat,
                shake: enemyShake,
                impactFlash: enemyImpactFlash,
                portraitOnLeading: false,
                isPlayer: false,
                meterTitle: "Cage"
            )
        }
        .padding(.horizontal, 2)
        .accessibilityIdentifier("world2.plink.battle.portraits")
    }

    /// Thin strip — leave / phase / orbs (jukebox lives on the board overlay).
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

    private var musicPickerChip: some View {
        HStack(spacing: 4) {
            Button {
                PlinkSFX.play(.ui)
                music.cyclePrevious()
            } label: {
                Image(systemName: "backward.fill")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(.white.opacity(0.9))
                    .frame(width: 28, height: 28)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Previous track")

            Text("♪ \(music.currentTrackTitle)")
                .font(.system(size: 12, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
                .lineLimit(1)
                .frame(minWidth: 90, maxWidth: 160)

            Button {
                PlinkSFX.play(.ui)
                music.cycleNext()
            } label: {
                Image(systemName: "forward.fill")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(.white.opacity(0.9))
                    .frame(width: 28, height: 28)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Next track")
            .accessibilityIdentifier("world2.plink.music.next")
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(.black.opacity(0.5), in: Capsule())
        .accessibilityIdentifier("world2.plink.music.picker")
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
            .frame(width: geo.size.width, height: geo.size.height, alignment: .center)
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
                .font(.system(size: 9, weight: .semibold, design: .rounded))
                .foregroundStyle(.white.opacity(0.75))
                .lineLimit(2)
                .frame(maxWidth: .infinity, alignment: .leading)

            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 3) {
                        if battleRounds.isEmpty {
                            Text("Drops…")
                                .font(.system(size: 10, weight: .medium, design: .rounded))
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
                .font(.system(size: 8, weight: .bold, design: .rounded))
                .foregroundStyle(.white.opacity(0.5))
            Text("\(value)")
                .font(.system(size: pulsed ? 20 : 16, weight: .black, design: .rounded))
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
        VStack(alignment: .leading, spacing: 3) {
            HStack(spacing: 4) {
                Text("R\(round.number)")
                    .font(.system(size: 10, weight: .black, design: .rounded))
                    .foregroundStyle(.white.opacity(0.65))
                    .frame(width: 22, alignment: .leading)
                if round.damageToEnemy > 0 {
                    Text("−\(round.damageToEnemy)")
                        .font(.system(size: highlighted ? 13 : 11, weight: .heavy, design: .rounded))
                        .foregroundStyle(Color(red: 0.45, green: 0.95, blue: 0.55))
                } else {
                    Text("miss")
                        .font(.system(size: 10, weight: .bold, design: .rounded))
                        .foregroundStyle(.white.opacity(0.35))
                }
                Spacer(minLength: 2)
                if round.damageToPlayer > 0 {
                    Text("−\(round.damageToPlayer)")
                        .font(.system(size: highlighted ? 13 : 11, weight: .heavy, design: .rounded))
                        .foregroundStyle(Color(red: 1, green: 0.5, blue: 0.4))
                }
            }
            if !round.highlights.isEmpty {
                Text(round.highlights.joined(separator: " · "))
                    .font(.system(size: 9, weight: .heavy, design: .rounded))
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

    private func fightFighterBanner(
        name: String,
        portrait: AnyView,
        hp: Int,
        maxHP: Int,
        tint: Color,
        float: HPFloat?,
        shake: CGFloat,
        impactFlash: Bool,
        portraitOnLeading: Bool,
        isPlayer: Bool,
        meterTitle: String = "HP"
    ) -> some View {
        let fraction = maxHP == 0 ? 0 : CGFloat(hp) / CGFloat(maxHP)
        let info = VStack(alignment: portraitOnLeading ? .leading : .trailing, spacing: 6) {
            Text(name)
                .font(.system(size: 18, weight: .heavy, design: .rounded))
                .foregroundStyle(.white)
                .lineLimit(1)
            Text("\(meterTitle) \(hp)/\(maxHP)")
                .font(.system(size: 18, weight: .black, design: .rounded))
                .foregroundStyle(.white)
                .minimumScaleFactor(0.7)
                .lineLimit(1)
            GeometryReader { geo in
                ZStack(alignment: portraitOnLeading ? .leading : .trailing) {
                    Capsule().fill(Color.white.opacity(0.18))
                    Capsule()
                        .fill(tint)
                        .frame(width: geo.size.width * max(0, min(1, fraction)))
                }
            }
            .frame(width: 160, height: 12)
        }

        let art = ZStack(alignment: .top) {
            portrait
                .shadow(color: tint.opacity(0.45), radius: 10, y: 2)
            if let float {
                Text(float.text)
                    .font(.system(size: 32, weight: .black, design: .rounded))
                    .foregroundStyle(
                        float.isHeal
                            ? Color(red: 0.45, green: 1, blue: 0.55)
                            : Color(red: 1, green: 0.35, blue: 0.35)
                    )
                    .shadow(color: .black.opacity(0.75), radius: 3, y: 1)
                    .scaleEffect(impactFlash ? 1.25 : 1.0)
                    .offset(y: -18)
                    .id(float.id)
                    .transition(.scale.combined(with: .opacity))
                    .allowsHitTesting(false)
            }
        }

        return HStack(alignment: .bottom, spacing: 14) {
            if portraitOnLeading {
                art
                info
            } else {
                info
                art
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(
            (impactFlash ? Color.red.opacity(0.35) : Color.black.opacity(0.42)),
            in: RoundedRectangle(cornerRadius: 22, style: .continuous)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .stroke(
                    impactFlash ? Color.red.opacity(0.95) : tint.opacity(0.55),
                    lineWidth: impactFlash ? 3.5 : 2
                )
        )
        .offset(x: shake)
        .scaleEffect(impactFlash ? 1.04 : 1.0)
        .background(
            GeometryReader { geo in
                Color.clear.preference(
                    key: PlinkBattleBannerFrameKey.self,
                    value: [isPlayer: geo.frame(in: .named("plinkBattleSpace"))]
                )
            }
        )
        .accessibilityLabel("\(name) \(hp) of \(maxHP) hit points")
        .accessibilityIdentifier(isPlayer ? "world2.plink.battle.banner.player" : "world2.plink.battle.banner.enemy")
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
        enemyHP = enemyMaxHP
        // Carry voyage HP into the fight — never free-heal at fight start.
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
        phaseLabel = "RESCUE"
        statusLine = "Break the cage · HP \(playerHP)/\(playerMaxHP)"
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
                enemyHP = snap.enemyHP
                playerHP = snap.playerHP
                refreshHostageMood()
            }
            if snap.phase == .flying || snap.phase == .settling {
                abbieState = .sneakyWink
            }
        }
        next.onDamage = { dmg in
            abbieState = .sneakyWink
            phaseLabel = "CAGE_HIT"
            refreshHostageMood()
            showHPFloat(onPlayer: false, delta: -dmg)
        }
        next.onPlayerHurt = { dmg in
            abbieState = .hurt
            phaseLabel = "CAGE_RATTLE"
            refreshHostageMood()
            showHPFloat(onPlayer: true, delta: -dmg)
        }
        next.onRoundResolved = { summary in
            recordRound(
                damageToEnemy: summary.damageToEnemy,
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
            onBattleEnded?(true, max(playerHP, bridge?.scene.playerHP ?? playerHP))
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
            onBattleEnded?(false, 0)
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


// MARK: - Aim assist stick

private struct AimAssistJoystick: View {
    var reduceMotion: Bool
    var enabled: Bool
    var onAim: (CGFloat) -> Void
    var onRelease: () -> Void

    @State private var knob: CGSize = .zero

    private let base: CGFloat = 92
    private let knobSize: CGFloat = 42
    private var travel: CGFloat { (base - knobSize) / 2 - 4 }

    var body: some View {
        ZStack {
            Circle()
                .fill(.ultraThinMaterial.opacity(0.9))
                .overlay(
                    Circle()
                        .stroke(
                            enabled
                                ? Color(red: 0.55, green: 0.9, blue: 0.75).opacity(0.85)
                                : Color.white.opacity(0.25),
                            lineWidth: 2
                        )
                )
                .shadow(color: .black.opacity(0.4), radius: 10, y: 4)

            // Crosshair hint
            Circle()
                .stroke(Color.white.opacity(0.18), lineWidth: 1)
                .frame(width: base * 0.55, height: base * 0.55)

            Circle()
                .fill(
                    RadialGradient(
                        colors: [
                            Color(red: 0.55, green: 0.95, blue: 0.75),
                            Color(red: 0.2, green: 0.55, blue: 0.45),
                        ],
                        center: .topLeading,
                        startRadius: 2,
                        endRadius: 28
                    )
                )
                .frame(width: knobSize, height: knobSize)
                .overlay(Circle().stroke(.white.opacity(0.65), lineWidth: 1.5))
                .shadow(color: .black.opacity(0.45), radius: 4, y: 2)
                .offset(knob)
                .opacity(enabled ? 1 : 0.45)
        }
        .frame(width: base, height: base)
        .gesture(
            DragGesture(minimumDistance: 0)
                .onChanged { value in
                    guard enabled else { return }
                    let dx = value.translation.width
                    let dy = value.translation.height
                    let clampedX = max(-travel, min(travel, dx))
                    let clampedY = max(-travel, min(travel, dy))
                    let next = CGSize(width: clampedX, height: clampedY)
                    if reduceMotion {
                        knob = next
                    } else {
                        withAnimation(.interactiveSpring(response: 0.18, dampingFraction: 0.78)) {
                            knob = next
                        }
                    }
                    onAim(CGFloat(clampedX / max(travel, 1)))
                }
                .onEnded { _ in
                    guard enabled else { return }
                    onAim(CGFloat(knob.width / max(travel, 1)))
                    onRelease()
                    withAnimation(.spring(response: 0.32, dampingFraction: 0.72)) {
                        knob = .zero
                    }
                }
        )
        .accessibilityIdentifier("world2.plink.aimJoystick")
        .accessibilityLabel("Aim stick. Drag to aim, release to fire.")
        .accessibilityAddTraits(.allowsDirectInteraction)
    }
}

import SwiftUI

/// Product shell: title → Campaign / Endless → chart → Plink fights · Trophy Center.
struct MarbleVoyageHostView: View {
    var playerID: String? = nil
    /// When true, hides household “World / Leave” exits (standalone App Store boot).
    var isStandalone: Bool = false
    var onExit: () -> Void

    private enum Shell: Equatable {
        case title
        case playing
    }

    @State private var shell: Shell = .title
    @State private var run: MarbleVoyageRun?
    @State private var eventOutcome: MarbleVoyageEventOutcome?
    @State private var gallery = MarbleVoyageGallery.load()
    @State private var playerStats = MarbleVoyagePlayerStats.empty
    @State private var gameStats = MarbleVoyagePlayerStats.empty
    @State private var showTrophyCenter = false
    @State private var showStatusPanel = false
    @State private var showAuthSheet = false
    @State private var unlockToast: String?
    @EnvironmentObject private var auth: AuthenticationService
    /// Player token sliding along the climb path (1s) before the scene opens.
    @State private var marchPosition: CGPoint?
    @State private var isMarching = false
    @State private var sceneCurtain = false
    @State private var dockPulse = false
    @State private var chartContentSize: CGSize = .zero
    @State private var chartViewportSize: CGSize = .zero
    @State private var climbScrollOffset: CGFloat = 0
    @State private var atmosphereBoost: Double = 0
    @State private var climbIntroToken: UInt = 0
    /// Explicit porthole Y offset (0 = top / summit). Prefer this over ScrollViewProxy.
    @State private var climbCameraOffset: CGFloat = 0
    @State private var isClimbIntroPlaying = false
    @State private var climbIntroPlayedSeed: UInt64?
    @State private var climbDragAnchor: CGFloat?
    /// Cast scrub: frame index when the vertical drag began.
    @State private var climbCastScrubAnchor: Int?
    /// Cast intro — generic overland tour (order from DesignRules.climbCastTourOrder).
    @State private var climbRevealFocusID: String?
    @State private var climbRevealLetters = 0
    @State private var climbRevealBeats: [MarbleVoyageOverlandScroll.Stop] = []
    @State private var climbRevealIndex = 0
    @State private var climbIntroViewportHeight: CGFloat = 0
    /// After cast (or when returning to map): reachable landing the foe card describes.
    @State private var climbEngageNodeID: String?
    /// Pull-up chart drawer — native ScrollView so the sim can reach the whole climb.
    @State private var climbChartDrawerOpen = false
    @StateObject private var chartMusic = PlinkMusicService()
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var captureReady = false
    @State private var didApplyCaptureBootstrap = false

    private var captureStage: MarbleVoyageCaptureStage? {
        MarbleVoyageCapture.stage
    }

    private var captureSeed: UInt64 {
        MarbleVoyageCapture.seed
    }

    private var climbRevealStop: MarbleVoyageOverlandScroll.Stop? {
        guard climbRevealIndex >= 0, climbRevealIndex < climbRevealBeats.count else { return nil }
        return climbRevealBeats[climbRevealIndex]
    }

    private var climbRevealCard: MarbleVoyageOverlandScroll.Card? {
        climbRevealStop?.card
    }

    /// Cast tour card, or the engage card for the next glowing landing.
    private var activeClimbFoeCard: MarbleVoyageOverlandScroll.Card? {
        if isClimbIntroPlaying { return climbRevealCard }
        return climbEngageCard
    }

    private var climbEngageCard: MarbleVoyageOverlandScroll.Card? {
        guard let run, let id = climbEngageNodeID, let node = run.node(id) else { return nil }
        return makeEngageCard(for: node, run: run)
    }

    private var showClimbFoeCard: Bool {
        isClimbIntroPlaying || climbEngageNodeID != nil
    }

    private var climbFoeCardPlacement: MarbleVoyageOverlandScroll.CardPlacement {
        let focusID = isClimbIntroPlaying
            ? climbRevealFocusID
            : (climbEngageNodeID ?? climbRevealFocusID)
        let fallback = MarbleVoyageOverlandScroll.CardPlacement(
            dock: .trailing,
            topPad: MarbleVoyageDesignRules.climbFoeCardTopPad
        )
        guard let focusID,
              let focusPoint = nodePositionsForCurrentChart()[focusID],
              chartContentSize.width > 1,
              chartViewportSize.width > 1
        else { return fallback }

        // Tile size must match chart() — keyed off viewport width, not content width.
        let tile = MarbleVoyageArt.chartTileSize(forViewportWidth: chartViewportSize.width)
        let focusTile = MarbleVoyageOverlandScroll.focusedTileRectInViewport(
            contentPoint: focusPoint,
            tileSize: tile,
            cameraOffsetY: climbCameraOffset
        )
        let neighbors: [CGRect] = nodePositionsForCurrentChart().compactMap { id, point in
            guard id != focusID else { return nil }
            return MarbleVoyageOverlandScroll.focusedTileRectInViewport(
                contentPoint: point,
                tileSize: tile,
                cameraOffsetY: climbCameraOffset
            )
        }
        return MarbleVoyageOverlandScroll.preferredCardPlacement(
            focusX: focusPoint.x,
            contentWidth: chartContentSize.width,
            focusTile: focusTile,
            neighborTiles: neighbors,
            viewport: chartViewportSize
        )
    }

    private var climbRevealAccent: Color {
        switch activeClimbFoeCard?.roleKind {
        case .bigBoss: return Color(red: 0.95, green: 0.25, blue: 0.4)
        case .miniBoss: return Color(red: 1.0, green: 0.55, blue: 0.22)
        case .henchman: return Color(red: 0.55, green: 0.8, blue: 1.0)
        case .none: return Color(red: 1.0, green: 0.55, blue: 0.28)
        }
    }

    var body: some View {
        ZStack {
            if shell == .title {
                MarbleVoyageTitleStage(
                    reduceMotion: reduceMotion,
                    plates: gallery.carouselPlates
                )
            } else {
                voyageBackdrop
            }

            switch shell {
            case .title:
                titleMenu
            case .playing:
                if let run {
                    playingBody(run)
                } else {
                    titleMenu
                }
            }

            if showsBrandWatermark {
                AbbiesWorldLogoWatermark(size: 92, opacity: 0.48)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
                    .padding(.trailing, 20)
                    .padding(.bottom, 16)
                    .allowsHitTesting(false)
            }

            if let toast = unlockToast {
                Text(toast)
                    .font(.system(size: 16, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 18)
                    .padding(.vertical, 12)
                    .background(Color(red: 0.15, green: 0.45, blue: 0.55).opacity(0.92), in: Capsule())
                    .shadow(color: .black.opacity(0.35), radius: 10, y: 4)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
                    .padding(.top, 72)
                    .transition(.move(edge: .top).combined(with: .opacity))
                    .allowsHitTesting(false)
                    .zIndex(40)
            }

            if showTrophyCenter {
                MarbleVoyageTrophyCenterView(gallery: $gallery, onClose: {
                    withAnimation(.spring(response: 0.35, dampingFraction: 0.86)) {
                        showTrophyCenter = false
                    }
                })
                .zIndex(50)
                .transition(.opacity.combined(with: .scale(scale: 0.96)))
            }

            if showStatusPanel {
                MarbleVoyageStatusPanelView(
                    player: playerStats,
                    game: gameStats,
                    playerLabel: statusPlayerLabel,
                    isSignedIn: auth.isAuthenticated,
                    onSignIn: {
                        showStatusPanel = false
                        showAuthSheet = true
                    },
                    onSignOut: {
                        Task {
                            await auth.logout()
                            reloadStats()
                        }
                    },
                    onOpenTrophies: {
                        withAnimation(.spring(response: 0.35, dampingFraction: 0.86)) {
                            showStatusPanel = false
                            showTrophyCenter = true
                        }
                    },
                    onClose: {
                        withAnimation(.spring(response: 0.35, dampingFraction: 0.86)) {
                            showStatusPanel = false
                        }
                    }
                )
                .zIndex(50)
                .transition(.opacity.combined(with: .scale(scale: 0.96)))
            }

            if captureReady {
                Color.clear
                    .frame(width: 1, height: 1)
                    .accessibilityIdentifier(MarbleVoyageCapture.readyAccessibilityID)
                    .accessibilityLabel("Voyage capture ready")
                    .allowsHitTesting(false)
                    .accessibilityHidden(false)
            }
        }
        .accessibilityIdentifier("world2.marbleVoyage")
        .ignoresSafeArea()
        .onAppear {
            reloadStats()
            if MarbleVoyageCapture.isActive {
                chartMusic.stop()
                applyCaptureBootstrapIfNeeded()
            } else {
                chartMusic.playMeadow()
            }
        }
        .onChange(of: auth.activeProfile?.id) { _, _ in
            reloadStats()
        }
        .onChange(of: auth.isAuthenticated) { _, _ in
            reloadStats()
        }
        .sheet(isPresented: $showAuthSheet) {
            NavigationStack {
                if auth.isAuthenticated {
                    VStack(spacing: 20) {
                        Text(auth.activeProfile?.displayName ?? auth.accountName ?? "Signed in")
                            .font(.system(size: 28, weight: .black, design: .rounded))
                        if let email = auth.accountEmail {
                            Text(email)
                                .font(.system(size: 15, weight: .semibold, design: .rounded))
                                .foregroundStyle(.secondary)
                        }
                        MarbleVoyagePrimaryButton(
                            title: "Sign out",
                            systemImage: "rectangle.portrait.and.arrow.right",
                            fill: MarbleVoyageChrome.dangerFill,
                            accessibilityID: "world2.marbleVoyage.sheet.signOut"
                        ) {
                            Task {
                                await auth.logout()
                                showAuthSheet = false
                                reloadStats()
                            }
                        }
                        .padding(.horizontal, 24)
                        Spacer()
                    }
                    .padding(.top, 28)
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            Button("Done") { showAuthSheet = false }
                        }
                    }
                } else {
                    AuthLoginView(auth: auth)
                        .toolbar {
                            ToolbarItem(placement: .cancellationAction) {
                                Button("Close") { showAuthSheet = false }
                            }
                        }
                }
            }
            .presentationDetents([.medium, .large])
        }
        .onDisappear {
            chartMusic.stop()
        }
        .onChange(of: shell) { _, newShell in
            refreshChartMusic(for: newShell, phase: run?.phase)
        }
        .onChange(of: run?.phase) { _, newPhase in
            refreshChartMusic(for: shell, phase: newPhase)
            pulseAtmosphere()
        }
    }

    private func pulseAtmosphere() {
        atmosphereBoost = 1
        withAnimation(.easeOut(duration: 1.15)) {
            atmosphereBoost = 0
        }
    }

    private var voyageAtmosphereMood: MarbleVoyageSceneAtmosphere.Mood {
        guard let run else { return .climb }
        switch run.phase {
        case .map:
            return .climb
        case .fight(let id):
            return .enemy(run.node(id)?.enemyKind)
        case .shop:
            return .victory
        case .event(let id):
            if let kind = run.node(id)?.kind {
                return .node(kind)
            }
            return .mystery
        case .victory:
            return .victory
        case .defeat:
            return .defeat
        }
    }

    /// Brand watermark only on the title menu — not during chart / events / fights.
    private var showsBrandWatermark: Bool {
        shell == .title
    }

    private func refreshChartMusic(for shell: Shell, phase: MarbleVoyagePhase?) {
        if MarbleVoyageCapture.isActive {
            chartMusic.stop()
            return
        }
        // Battle host owns fight music; meadow beds the title + chart + events.
        if case .fight = phase {
            chartMusic.stop()
            return
        }
        if case .event = phase {
            chartMusic.playMeadow(variant2: true)
            return
        }
        if case .shop = phase {
            chartMusic.playMeadow(variant2: true)
            return
        }
        if shell == .title || phase == nil || phase == .map || phase == .victory || phase == .defeat {
            chartMusic.playMeadow()
        }
    }

    private func applyCaptureBootstrapIfNeeded() {
        guard let stage = captureStage, !didApplyCaptureBootstrap else { return }
        didApplyCaptureBootstrap = true
        MarbleVoyageCapture.clearReadyMarker()
        captureReady = false

        switch stage {
        case .title:
            shell = .title
            run = nil
            eventOutcome = nil
        case .chart, .fight, .shop, .event:
            climbIntroToken &+= 1
            climbIntroPlayedSeed = captureSeed
            isClimbIntroPlaying = false
            climbRevealBeats = []
            climbRevealIndex = 0
            climbRevealFocusID = nil
            climbEngageNodeID = nil
            run = MarbleVoyageCapture.makeRun(for: stage, seed: captureSeed)
            eventOutcome = nil
            shell = .playing
            // Skip climb cast — park the porthole on the player for a stable still.
            DispatchQueue.main.async {
                skipClimbIntro(snapToPlayer: true)
            }
            if MarbleVoyageCapture.wantsAutoBreakout, stage == .chart {
                // After the chart + engage card settle, march into the first fight so we can
                // record the real breakout (curtain → versus → board) on device.
                DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                    triggerCaptureAutoBreakout()
                }
            }
        }

        MarbleVoyageCapture.armReadyMarker(stage: stage, seed: captureSeed)
        let readyDelay: TimeInterval
        switch stage {
        case .title: readyDelay = 1.1
        case .chart: readyDelay = 1.4
        case .fight: readyDelay = 1.8
        case .shop, .event: readyDelay = 1.2
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + readyDelay) {
            captureReady = true
        }
    }

    /// Capture / recording helper — climb the first glowing fight from the chart.
    private func triggerCaptureAutoBreakout() {
        guard let run, case .map = run.phase, !isMarching else { return }
        let positions = nodePositionsForCurrentChart()
        let node = run.reachableChoices().first(where: { $0.kind == .fight || $0.kind == .boss })
            ?? run.reachableChoices().first
        guard let node else {
            print("voyage.breakout: no reachable landing")
            return
        }
        print("voyage.breakout: beginClimb → \(node.id) \(node.title)")
        climbEngageNodeID = node.id
        climbRevealFocusID = node.id
        beginClimb(to: node, positions: positions)
    }

    @ViewBuilder
    private func playingBody(_ active: MarbleVoyageRun) -> some View {
        ZStack {
            switch active.phase {
            case .map:
                if active.mode == .endless {
                    endlessProgressPhase(active)
                        .transition(.opacity)
                } else {
                    mapPhase
                        .transition(.opacity)
                }
            case .fight(let nodeID):
                if let node = active.node(nodeID) {
                    fightPhase(node)
                        .transition(.asymmetric(
                            insertion: .opacity.combined(with: .scale(scale: 1.03)),
                            removal: .opacity
                        ))
                } else {
                    mapPhase
                }
            case .shop:
                MarbleVoyageShopView(
                    run: Binding(
                        get: { run ?? active },
                        set: { run = $0 }
                    ),
                    onLeave: {
                        withAnimation(.spring(response: 0.4, dampingFraction: 0.84)) {
                            pulseAtmosphere()
                        }
                    }
                )
                .transition(.move(edge: .bottom).combined(with: .opacity))
            case .event(let nodeID):
                if let node = active.node(nodeID) {
                    eventPhase(node)
                        .transition(.asymmetric(
                            insertion: .move(edge: .bottom).combined(with: .opacity),
                            removal: .opacity
                        ))
                } else {
                    mapPhase
                }
            case .victory:
                endCard(
                    title: active.mode == .campaign ? "Campaign Clear!" : "Voyage Clear!",
                    body: active.lastEventLine.isEmpty
                        ? "Finished with \(active.playerHP) HP."
                        : active.lastEventLine,
                    tint: Color(red: 0.2, green: 0.7, blue: 0.45)
                )
                .transition(.opacity.combined(with: .scale(scale: 0.96)))
            case .defeat:
                endCard(
                    title: active.mode == .endless ? "Endless Over" : "Voyage Lost",
                    body: active.lastEventLine.isEmpty
                        ? "No free heals — only spells and finds restore HP."
                        : active.lastEventLine,
                    tint: Color(red: 0.75, green: 0.28, blue: 0.32)
                )
                .transition(.opacity)
            }

            // Adaptive leaves when not on the climb (climb owns scroll-parallax layers).
            if case .map = active.phase, active.mode == .campaign {
                EmptyView()
            } else {
                MarbleVoyageSceneAtmosphere(
                    mood: voyageAtmosphereMood,
                    parallax: CGSize(width: 0, height: atmosphereBoost * 14),
                    reduceMotion: reduceMotion,
                    intensity: {
                        if case .fight = active.phase { return 0.32 }
                        return 0.88
                    }(),
                    seed: 77,
                    transitionBoost: atmosphereBoost
                )
                .ignoresSafeArea()
                .allowsHitTesting(false)
                .zIndex(5)
            }

            if sceneCurtain {
                // Must read as a hard slam — 0.55 on blueprint navy was invisible.
                ZStack {
                    Color.black
                    RadialGradient(
                        colors: [
                            Color(red: 0.45, green: 0.9, blue: 1).opacity(0.35),
                            .clear,
                        ],
                        center: .center,
                        startRadius: 20,
                        endRadius: 520
                    )
                }
                .ignoresSafeArea()
                .transition(.opacity)
                .allowsHitTesting(true)
                .zIndex(50)
            }
        }
        .animation(.easeInOut(duration: 0.45), value: phaseIdentity(active.phase))
    }

    private func phaseIdentity(_ phase: MarbleVoyagePhase) -> String {
        switch phase {
        case .map: return "map"
        case .fight(let id): return "fight:\(id)"
        case .shop(let id): return "shop:\(id)"
        case .event(let id): return "event:\(id)"
        case .victory: return "victory"
        case .defeat: return "defeat"
        }
    }

    private var voyageBackdrop: some View {
        // Matches blueprint paper so any residual edge never reads as a letterbox.
        LinearGradient(
            colors: [
                Color(red: 0.10, green: 0.30, blue: 0.48),
                Color(red: 0.07, green: 0.22, blue: 0.38),
                Color(red: 0.05, green: 0.16, blue: 0.30),
            ],
            startPoint: .top,
            endPoint: .bottom
        )
        .ignoresSafeArea()
    }

    // MARK: - Map

    /// Endless has no climb chart — a wave hub with clear depth / next beat / fight.
    private func endlessProgressPhase(_ active: MarbleVoyageRun) -> some View {
        let next = active.endlessNextBeat
        let wave = active.endlessDisplayWave
        let best = max(active.endlessBest, active.fightsCleared)
        let foe = next?.waveAttacker
        let isRest = next.map { $0.kind == .treasure || $0.kind == .mystery || $0.kind == .shrine } ?? false
        let cta = isRest ? "OPEN" : "FIGHT"

        return ZStack {
            LinearGradient(
                colors: [
                    Color(red: 0.06, green: 0.12, blue: 0.22),
                    Color(red: 0.12, green: 0.22, blue: 0.36),
                    Color(red: 0.18, green: 0.1, blue: 0.22),
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(spacing: 0) {
                headerBar
                Spacer(minLength: 12)

                VStack(spacing: 18) {
                    Text("ENDLESS")
                        .font(.system(size: 14, weight: .black, design: .rounded))
                        .tracking(3)
                        .foregroundStyle(Color(red: 0.55, green: 0.95, blue: 1.0))

                    Text("Wave \(wave)")
                        .font(.system(size: 48, weight: .black, design: .rounded))
                        .foregroundStyle(.white)

                    HStack(spacing: 18) {
                        endlessStatChip(label: "Cleared", value: "\(active.fightsCleared)")
                        endlessStatChip(label: "Best", value: "\(best)")
                        endlessStatChip(label: "HP", value: "\(active.playerHP)/\(active.playerMaxHP)")
                        endlessStatChip(label: "Coins", value: "\(active.coins)")
                    }

                    if let next {
                        VStack(spacing: 10) {
                            if let foe, !isRest {
                                PlinkAttackerBattlePortrait(kind: foe, pose: .idle, size: 120)
                                    .shadow(color: .black.opacity(0.45), radius: 10, y: 4)
                                Text(foe.displayName.uppercased())
                                    .font(.system(size: 22, weight: .black, design: .rounded))
                                    .foregroundStyle(.white)
                                Text(foe.roleBlurb)
                                    .font(.system(size: 14, weight: .semibold, design: .rounded))
                                    .foregroundStyle(.white.opacity(0.75))
                            } else {
                                chartDestinationArt(kind: next.kind, tile: 120, iconSize: 44)
                                Text(next.kind.chartLabel)
                                    .font(.system(size: 22, weight: .black, design: .rounded))
                                    .foregroundStyle(.white)
                            }
                            Text(next.title)
                                .font(.system(size: 15, weight: .semibold, design: .rounded))
                                .foregroundStyle(.white.opacity(0.7))
                                .multilineTextAlignment(.center)
                        }
                        .padding(.vertical, 12)
                        .padding(.horizontal, 20)
                        .frame(maxWidth: 420)
                        .background(.ultraThinMaterial.opacity(0.9), in: RoundedRectangle(cornerRadius: 24, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 24, style: .continuous)
                                .stroke(.white.opacity(0.35), lineWidth: 1.5)
                        )

                        Button {
                            MarbleVoyageAudio.tap()
                            beginEndlessBeat(next)
                        } label: {
                            Text(cta)
                                .font(.system(size: 22, weight: .black, design: .rounded))
                                .foregroundStyle(.white)
                                .frame(maxWidth: 280)
                                .padding(.vertical, 16)
                                .background(
                                    Capsule().fill(
                                        isRest
                                            ? Color(red: 0.35, green: 0.65, blue: 0.95)
                                            : Color(red: 0.9, green: 0.32, blue: 0.38)
                                    )
                                )
                                .overlay(
                                    Capsule().stroke(Color.white.opacity(0.65), lineWidth: 2)
                                )
                        }
                        .buttonStyle(.plain)
                        .accessibilityIdentifier("world2.marbleVoyage.endless.continue")
                    } else {
                        Text("Preparing next wave…")
                            .font(.system(size: 16, weight: .semibold, design: .rounded))
                            .foregroundStyle(.white.opacity(0.7))
                            .onAppear {
                                var updated = active
                                updated.appendEndlessFrontier()
                                run = updated
                            }
                    }

                    Text("No map — just the next wave. Heal only at Bell Market.")
                        .font(.system(size: 13, weight: .semibold, design: .rounded))
                        .foregroundStyle(.white.opacity(0.55))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 28)
                }

                Spacer(minLength: 24)
            }
            .padding(.horizontal, 24)
            .transition(.asymmetric(
                insertion: .move(edge: .bottom).combined(with: .opacity),
                removal: .opacity
            ))
        }
        .accessibilityIdentifier("world2.marbleVoyage.endless.progress")
    }

    private func endlessStatChip(label: String, value: String) -> some View {
        VStack(spacing: 2) {
            Text(value)
                .font(.system(size: 18, weight: .black, design: .rounded))
                .foregroundStyle(.white)
                .monospacedDigit()
            Text(label)
                .font(.system(size: MarbleVoyageDesignRules.battleFeedMinMetaFont, weight: .bold, design: .rounded))
                .foregroundStyle(.white.opacity(0.55))
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(Color.black.opacity(0.28), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    /// Curtain into the next endless fight / rest — no climb march.
    private func beginEndlessBeat(_ node: MarbleVoyageNode) {
        guard let active = run, active.mode == .endless, case .map = active.phase else { return }
        MarbleVoyageAudio.sceneTransition()
        withAnimation(.easeIn(duration: 0.22)) {
            sceneCurtain = true
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
            withAnimation(.easeInOut(duration: 0.35)) {
                run?.choose(node.id)
                if case .event = run?.phase {
                    prepareEvent(for: node)
                }
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.28) {
                withAnimation(.easeOut(duration: 0.45)) {
                    sceneCurtain = false
                }
            }
        }
    }

    private var mapPhase: some View {
        ZStack {
            chart
                .ignoresSafeArea()

            VStack(spacing: 0) {
                mapChromeHeader
                Spacer(minLength: 0)
            }

            if showClimbFoeCard {
                climbRevealNameCard
                    .allowsHitTesting(!isClimbIntroPlaying)
                    .zIndex(30)

                if isClimbIntroPlaying {
                    // Right-thumb cast scrubber — < previous (toward boss) · > next · >| to Abbie.
                    climbRevealTransport
                        .zIndex(40)
                }
            }

            // Abbie status card — always docks at the bottom of the climb map.
            if !isClimbIntroPlaying, !climbChartDrawerOpen {
                climbAbbieCard
                    .zIndex(25)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            }

            if !isClimbIntroPlaying {
                climbChartDrawer
                    .zIndex(35)
            }
        }
        .ignoresSafeArea()
    }

    /// Chart handle docks bottom-trailing so it never covers Abbie’s tray.
    private var climbChartDrawer: some View {
        GeometryReader { geo in
            let openHeight = geo.size.height * 0.88
            let handle = VoyageTileLegibility.chartHandleSize
            VStack(spacing: 0) {
                Spacer(minLength: 0)
                VStack(spacing: 0) {
                    Button {
                        MarbleVoyageAudio.tap()
                        withAnimation(.spring(response: 0.38, dampingFraction: 0.86)) {
                            climbChartDrawerOpen.toggle()
                        }
                    } label: {
                        HStack(spacing: 8) {
                            Image(systemName: climbChartDrawerOpen ? "chevron.down" : "chevron.up")
                                .font(.system(size: 12, weight: .black))
                            Text(climbChartDrawerOpen ? "Hide chart" : "Full chart")
                                .font(.system(size: 14, weight: .black, design: .rounded))
                                .lineLimit(1)
                        }
                        .foregroundStyle(.white.opacity(0.92))
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .frame(height: handle.height)
                    .accessibilityIdentifier("world2.marbleVoyage.chartDrawer.handle")

                    if climbChartDrawerOpen {
                        ScrollView(.vertical, showsIndicators: true) {
                            climbDrawerScrollContent(viewport: geo.size)
                                .padding(.bottom, 28)
                        }
                        .frame(maxHeight: .infinity)
                        .accessibilityIdentifier("world2.marbleVoyage.chartDrawer.scroll")
                    }
                }
                .frame(
                    width: climbChartDrawerOpen ? geo.size.width - 24 : handle.width,
                    height: climbChartDrawerOpen ? openHeight : handle.height,
                    alignment: .top
                )
                .background(
                    UnevenRoundedRectangle(
                        cornerRadii: .init(topLeading: 22, bottomLeading: 0, bottomTrailing: 0, topTrailing: 22),
                        style: .continuous
                    )
                    .fill(Color.black.opacity(climbChartDrawerOpen ? 0.82 : 0.55))
                    .overlay(
                        UnevenRoundedRectangle(
                            cornerRadii: .init(topLeading: 22, bottomLeading: 0, bottomTrailing: 0, topTrailing: 22),
                            style: .continuous
                        )
                        .stroke(Color.white.opacity(0.28), lineWidth: 1.5)
                    )
                )
                .gesture(
                    DragGesture(minimumDistance: 8)
                        .onEnded { value in
                            let open = value.translation.height < -40
                                || (climbChartDrawerOpen && value.translation.height < 40)
                            let close = value.translation.height > 40
                            withAnimation(.spring(response: 0.38, dampingFraction: 0.86)) {
                                if open { climbChartDrawerOpen = true }
                                if close { climbChartDrawerOpen = false }
                            }
                        }
                )
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
            .padding(.trailing, VoyageTileLegibility.dockInset)
            .padding(.bottom, VoyageTileLegibility.dockInset)
        }
        .allowsHitTesting(true)
    }

    /// Compact scrollable chart for the drawer (same nodes / edges, native scroll).
    @ViewBuilder
    private func climbDrawerScrollContent(viewport: CGSize) -> some View {
        if let run {
            let columnCount = max((run.nodes.map(\.column).max() ?? 1) + 1, 2)
            let content = MarbleVoyageClimbMap.contentSize(in: viewport, columnCount: columnCount)
            let tile = MarbleVoyageArt.chartTileSize(forViewportWidth: content.width)
            let positions = nodePositions(
                in: CGSize(width: content.width, height: content.height),
                tile: tile
            )
            ZStack(alignment: .topLeading) {
                climbPosterBackdrop(width: content.width, height: content.height)
                ForEach(Array(run.edges.enumerated()), id: \.offset) { _, edge in
                    let isChoice = edge.from == run.currentNodeID
                        && run.reachableChoices().contains(where: { $0.id == edge.to })
                    chartEdge(
                        from: edge.from,
                        to: edge.to,
                        positions: positions,
                        kind: isChoice ? .choice : (run.didTraverse(from: edge.from, to: edge.to) ? .traversed : .idle)
                    )
                }
                ForEach(run.nodes) { node in
                    if let point = positions[node.id] {
                        nodeChip(
                            node,
                            positions: positions,
                            hidePlayerWhileMarching: false,
                            tile: tile
                        )
                        .position(point)
                    }
                }
            }
            .frame(width: content.width, height: content.height, alignment: .topLeading)
        }
    }

    /// Player tray — portrait, stance, and one-line stats. Layout comes from `VoyageTileLegibility`.
    @ViewBuilder
    private var climbAbbieCard: some View {
        if let run {
            GeometryReader { geo in
                let stance = PlinkTemperRules.bagStanceTitle(in: run.marbleCollection)
                let plan = VoyageTileLegibility.abbieTrayPlan(
                    viewportWidth: geo.size.width,
                    hpText: "\(run.playerHP)/\(run.playerMaxHP)",
                    levelText: "\(run.heroLevel)",
                    coinsText: "\(run.coins)",
                    stance: stance
                )
                climbAbbieTray(run: run, stance: stance, plan: plan)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomLeading)
                    .padding(.leading, VoyageTileLegibility.dockInset)
                    .padding(.bottom, VoyageTileLegibility.dockInset)
            }
            .allowsHitTesting(true)
        }
    }

    private func climbAbbieTray(
        run: MarbleVoyageRun,
        stance: String,
        plan: VoyageTileLegibility.AbbieTrayPlan
    ) -> some View {
        let accent = Color(red: 0.45, green: 0.95, blue: 0.7)
        let identity = HStack(alignment: .center, spacing: 12) {
            PeglinAbbieBattlePortrait(state: .happy, size: 72)
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 4) {
                Text("ABBIE")
                    .font(.system(size: 13, weight: .black, design: .rounded))
                    .tracking(2)
                    .foregroundStyle(accent)
                Text(stance)
                    .font(.system(size: 22, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                Text("Level \(run.heroLevel) · ×\(String(format: "%.2f", MarbleVoyageHeroLevel.damageMultiplier(level: run.heroLevel))) dmg")
                    .font(.system(size: 12, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white.opacity(0.75))
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        let stats = HStack(spacing: 6) {
            climbAbbieStatPill(
                title: "HP",
                value: "\(run.playerHP)/\(run.playerMaxHP)",
                tint: Color(red: 1, green: 0.45, blue: 0.55)
            )
            climbAbbieStatPill(
                title: "LV",
                value: "\(run.heroLevel)",
                tint: Color(red: 0.45, green: 0.85, blue: 1.0)
            )
            climbAbbieStatPill(
                title: "COINS",
                value: "\(run.coins)",
                tint: Color(red: 1.0, green: 0.84, blue: 0.3)
            )
        }
        return VStack(alignment: .leading, spacing: 8) {
            if plan.twoRow {
                identity
                stats
            } else {
                HStack(alignment: .center, spacing: 12) {
                    identity
                    stats
                }
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .frame(maxWidth: plan.cardWidth, alignment: .leading)
        .fixedSize(horizontal: true, vertical: true)
        .background(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .fill(Color.black.opacity(0.72))
                .overlay(
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .stroke(accent.opacity(0.65), lineWidth: 2)
                )
        )
        .accessibilityIdentifier("world2.marbleVoyage.climb.abbieCard")
        .accessibilityLabel(
            "Abbie. Level \(run.heroLevel). \(stance). Hit points \(run.playerHP) of \(run.playerMaxHP). \(run.coins) coins. \(run.marbleCollection.count) marbles."
        )
    }

    /// Cast / engage foe card — docks opposite the focused tile so map art stays clear.
    private var climbRevealNameCard: some View {
        let card = activeClimbFoeCard
        let name = (card?.name ?? "").uppercased()
        let revealed = isClimbIntroPlaying
            ? String(name.prefix(climbRevealLetters))
            : name
        let accent = climbRevealAccent
        let placement = climbFoeCardPlacement
        let dock = placement.dock
        let engageNode: MarbleVoyageNode? = {
            guard let run, let id = climbEngageNodeID else { return nil }
            return run.node(id)
        }()
        let isFightEngage = engageNode?.kind == .fight || engageNode?.kind == .boss
        return VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top, spacing: 10) {
                VStack(alignment: .leading, spacing: 8) {
                    if let role = card?.role, !role.isEmpty {
                        Text(role)
                            .font(.system(size: 15, weight: .black, design: .rounded))
                            .tracking(2.5)
                            .foregroundStyle(accent)
                            .shadow(color: .black.opacity(0.75), radius: 3, y: 1)
                    }
                    // One line only — scale down before wrapping (MORRO / W bug).
                    Text(revealed.isEmpty ? " " : revealed)
                        .font(.system(size: 32, weight: .black, design: .rounded))
                        .foregroundStyle(.white)
                        .shadow(color: accent.opacity(0.85), radius: 8, y: 2)
                        .shadow(color: .black.opacity(0.9), radius: 2, y: 1)
                        .lineLimit(1)
                        .minimumScaleFactor(0.42)
                        .allowsTightening(true)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .animation(
                            reduceMotion
                                ? .easeOut(duration: 0.12)
                                : .easeOut(duration: 0.08),
                            value: climbRevealLetters
                        )
                        .accessibilityLabel(name)
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                if let kind = card?.kind {
                    PlinkAttackerBattlePortrait(
                        kind: kind,
                        size: 72,
                        stroke: accent.opacity(0.9)
                    )
                    .accessibilityIdentifier("world2.marbleVoyage.climbReveal.portrait")
                }
            }

            if (!isClimbIntroPlaying || climbRevealLetters >= name.count),
               !name.isEmpty, let card {
                VStack(alignment: .leading, spacing: 6) {
                    if card.hp > 0 || card.atk > 0 {
                        HStack(spacing: 10) {
                            climbRevealStatChip(title: "HP", value: "\(card.hp)", tint: accent)
                            climbRevealStatChip(title: "ATK", value: "\(card.atk)", tint: Color(red: 1, green: 0.7, blue: 0.35))
                            climbRevealStatChip(title: "THREAT", value: "\(card.threat)", tint: Color(red: 0.7, green: 0.85, blue: 1))
                        }
                    }
                }
                .transition(.opacity.combined(with: .move(edge: .trailing)))
            }

            if isClimbIntroPlaying, !climbRevealBeats.isEmpty {
                Text("\(climbRevealIndex + 1) / \(climbRevealBeats.count)")
                    .font(.system(size: 12, weight: .bold, design: .rounded))
                    .foregroundStyle(.white.opacity(0.55))
            } else if !isClimbIntroPlaying, climbEngageNodeID != nil {
                Text(isFightEngage
                     ? "Enter the arena when you’re ready."
                     : "Land here when you’re ready.")
                    .font(.system(size: 13, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white.opacity(0.8))
                if let engageNode {
                    let cta = isFightEngage ? "FIGHT" : "LAND"
                    Button {
                        PlinkSFX.play(.ui)
                        beginClimb(to: engageNode, positions: nodePositionsForCurrentChart())
                    } label: {
                        Text(cta)
                            .font(.system(size: 18, weight: .black, design: .rounded))
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(
                                RoundedRectangle(cornerRadius: 14, style: .continuous)
                                    .fill(accent.opacity(0.95))
                            )
                    }
                    .buttonStyle(.plain)
                    .disabled(isMarching)
                    .accessibilityIdentifier(
                        isFightEngage
                            ? "world2.marbleVoyage.climbEngage.fight"
                            : "world2.marbleVoyage.climbEngage.land"
                    )
                    .accessibilityLabel(
                        isFightEngage
                            ? "Enter arena against \(card?.name ?? engageNode.title)"
                            : "Land on \(engageNode.title)"
                    )
                }
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .frame(maxWidth: MarbleVoyageDesignRules.climbFoeCardMaxWidth, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .fill(Color.black.opacity(0.62))
                .overlay(
                    RoundedRectangle(cornerRadius: 22, style: .continuous)
                        .stroke(accent.opacity(0.7), lineWidth: 2)
                )
        )
        .frame(
            maxWidth: .infinity,
            maxHeight: .infinity,
            alignment: dock == .trailing ? .trailing : .leading
        )
        .padding(.leading, dock == .leading ? 22 : 8)
        .padding(.trailing, dock == .trailing ? 22 : 8)
        .padding(.top, placement.topPad)
        .padding(
            .bottom,
            isClimbIntroPlaying
                ? 100
                : 90 + MarbleVoyageDesignRules.climbAbbieCardClearance * 0.45
        )
        .animation(.easeOut(duration: 0.22), value: placement.dock)
        .animation(.easeOut(duration: 0.22), value: placement.topPad)
        .accessibilityIdentifier("world2.marbleVoyage.climbReveal.name")
        .accessibilityLabel({
            guard let card else { return "Cast card" }
            return "\(card.role) \(card.name). HP \(card.hp), attack \(card.atk)"
        }())
    }

    private func climbRevealStatChip(title: String, value: String, tint: Color) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title)
                .font(.system(size: 11, weight: .bold, design: .rounded))
                .tracking(0.8)
                .foregroundStyle(tint.opacity(0.9))
            Text(value)
                .font(.system(size: 22, weight: .black, design: .rounded))
                .foregroundStyle(.white)
                .monospacedDigit()
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(Color.white.opacity(0.1))
                .overlay(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .stroke(tint.opacity(0.45), lineWidth: 1)
                )
        )
    }

    /// Single-line Abbie tray stat — never stacks digits vertically when width is tight.
    private func climbAbbieStatPill(title: String, value: String, tint: Color) -> some View {
        HStack(spacing: 5) {
            Text(title)
                .font(.system(size: 11, weight: .bold, design: .rounded))
                .tracking(0.6)
                .foregroundStyle(tint.opacity(0.95))
            Text(value)
                .font(.system(size: 16, weight: .black, design: .rounded))
                .foregroundStyle(.white)
                .monospacedDigit()
                .lineLimit(1)
                .fixedSize(horizontal: true, vertical: false)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .background(
            Capsule(style: .continuous)
                .fill(Color.white.opacity(0.1))
                .overlay(
                    Capsule(style: .continuous)
                        .stroke(tint.opacity(0.5), lineWidth: 1)
                )
        )
    }

    /// Manual cast transport — previous · next · skip to dock.
    private var climbRevealTransport: some View {
        HStack(spacing: 12) {
            climbRevealTransportButton(
                systemName: "chevron.backward",
                label: "Previous foe",
                id: "world2.marbleVoyage.climbReveal.prev",
                enabled: climbRevealIndex > 0
            ) {
                climbRevealStep(delta: -1)
            }

            climbRevealTransportButton(
                systemName: "chevron.forward",
                label: climbRevealIndex >= climbRevealBeats.count - 1
                    ? "Finish cast intro"
                    : "Next foe",
                id: "world2.marbleVoyage.climbReveal.next",
                enabled: !climbRevealBeats.isEmpty
            ) {
                if climbRevealIndex >= climbRevealBeats.count - 1 {
                    skipClimbIntro(snapToPlayer: true)
                } else {
                    climbRevealStep(delta: 1)
                }
            }

            climbRevealTransportButton(
                systemName: "forward.end.fill",
                label: "Skip to Abbie",
                id: "world2.marbleVoyage.climbReveal.skip",
                enabled: true
            ) {
                skipClimbIntro(snapToPlayer: true)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .background(
            Capsule(style: .continuous)
                .fill(Color.black.opacity(0.62))
                .overlay(
                    Capsule(style: .continuous)
                        .stroke(.white.opacity(0.4), lineWidth: 1.5)
                )
        )
        .shadow(color: .black.opacity(0.55), radius: 14, y: 5)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
        .padding(.trailing, 28)
        .padding(.bottom, 36)
        .allowsHitTesting(true)
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.marbleVoyage.climbReveal.transport")
    }

    private func climbRevealTransportButton(
        systemName: String,
        label: String,
        id: String,
        enabled: Bool,
        action: @escaping () -> Void
    ) -> some View {
        Button {
            guard enabled else { return }
            PlinkSFX.play(.ui)
            action()
        } label: {
            Image(systemName: systemName)
                .font(.system(size: 22, weight: .bold))
                .foregroundStyle(.white.opacity(enabled ? 1 : 0.35))
                .frame(width: 56, height: 56)
                .contentShape(Circle())
        }
        .buttonStyle(.plain)
        .disabled(!enabled)
        .accessibilityIdentifier(id)
        .accessibilityLabel(label)
    }

    private var mapChromeHeader: some View {
        VStack(spacing: 4) {
            headerBar
            if let run {
                Text(run.mode == .campaign
                     ? "Climb · \(min(MarbleVoyageRun.campaignTotalFights, run.fightsCleared + 1))/\(MarbleVoyageRun.campaignTotalFights)"
                     : "Endless climb · \(run.fightsCleared) freed")
                    .font(.system(size: 22, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                    .shadow(color: .black.opacity(0.55), radius: 4, y: 1)
                Text(isClimbIntroPlaying
                     ? "〈 〉 or drag — scrub from the summit down to Abbie."
                     : (climbEngageNodeID != nil
                        ? "Tap the glowing landing — or FIGHT on the card."
                        : "Tap a glowing landing — Abbie climbs toward the boss."))
                    .font(.system(size: 13, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white.opacity(0.92))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 28)
            }
        }
        .padding(.bottom, 8)
        .padding(.top, 0)
        .frame(maxWidth: .infinity)
        .background {
            // Soft shader scrim so chrome stays readable over the island poster.
            LinearGradient(
                colors: [
                    Color.black.opacity(0.55),
                    Color.black.opacity(0.28),
                    Color.black.opacity(0.0),
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea(edges: .top)
        }
    }
    private var titleMenu: some View {
        VStack(spacing: 18) {
            HStack(spacing: 10) {
                if !isStandalone {
                    MarbleVoyageSecondaryButton(
                        title: "Leave",
                        systemImage: "xmark.circle.fill",
                        accessibilityID: "world2.marbleVoyage.leave",
                        action: onExit
                    )
                }
                Spacer()
                MarbleVoyageSecondaryButton(
                    title: "Status",
                    systemImage: "chart.bar.fill",
                    accessibilityID: "world2.marbleVoyage.statusButton",
                    action: {
                        reloadStats()
                        withAnimation(.spring(response: 0.38, dampingFraction: 0.86)) {
                            showStatusPanel = true
                        }
                    }
                )
                MarbleVoyageSecondaryButton(
                    title: "Trophies",
                    systemImage: "trophy.fill",
                    accessibilityID: "world2.marbleVoyage.trophies",
                    action: {
                        withAnimation(.spring(response: 0.38, dampingFraction: 0.86)) {
                            showTrophyCenter = true
                        }
                    }
                )
                if auth.isAuthenticated {
                    MarbleVoyageSecondaryButton(
                        title: auth.activeProfile?.displayName ?? "Account",
                        systemImage: "person.crop.circle.fill",
                        accessibilityID: "world2.marbleVoyage.account",
                        action: { showAuthSheet = true }
                    )
                }
            }
            .padding(.horizontal, 18)

            Spacer()

            VStack(spacing: 8) {
                Text(MarbleVoyageArt.brandLine.uppercased())
                    .font(.system(size: 13, weight: .black, design: .rounded))
                    .tracking(3)
                    .foregroundStyle(.white.opacity(0.88))
                Text(MarbleVoyageArt.productTitle)
                    .font(.system(size: 48, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                Text("Chart your voyage · plink the spirits · heal only from blessings")
                    .font(.system(size: 16, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white.opacity(0.9))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 36)
            }
            .shadow(color: .black.opacity(0.55), radius: 10, y: 4)
            .padding(.vertical, 16)
            .padding(.horizontal, 22)
            .background(.ultraThinMaterial.opacity(0.55), in: RoundedRectangle(cornerRadius: 24, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 24, style: .continuous)
                    .stroke(.white.opacity(0.35), lineWidth: 1.5)
            )

            VStack(spacing: 12) {
                ForEach(MarbleVoyageMode.allCases) { mode in
                    MarbleVoyageModeCardButton(
                        mode: mode,
                        accessibilityID: "world2.marbleVoyage.mode.\(mode.rawValue)"
                    ) {
                        withAnimation(.spring(response: 0.4, dampingFraction: 0.84)) {
                            climbIntroToken &+= 1
                            climbIntroPlayedSeed = nil
                            climbCameraOffset = 0
                            climbScrollOffset = 0
                            isClimbIntroPlaying = false
                            run = MarbleVoyageRun.make(mode: mode)
                            eventOutcome = nil
                            shell = .playing
                            MarbleVoyagePlayerStats.recordSessionStart(playerKey: statsPlayerKey)
                            reloadStats()
                        }
                    }
                }
            }
            .padding(.horizontal, 28)
            .padding(.top, 12)

            Text(isStandalone ? "Abbie's World · Free forever" : "Abbie's World · Campaign or Endless")
                .font(.system(size: 12, weight: .bold, design: .rounded))
                .foregroundStyle(.white.opacity(0.7))
                .shadow(color: .black.opacity(0.45), radius: 4, y: 1)
                .padding(.top, 8)

            Spacer()
        }
        .padding(.top, 12)
        .accessibilityIdentifier("world2.marbleVoyage.title")
        .accessibilityLabel(MarbleVoyageArt.fullTitle)
    }

    private var statusPlayerLabel: String {
        if let name = auth.activeProfile?.displayName { return name }
        if let email = auth.accountEmail { return email }
        return "Guest"
    }

    private var statsPlayerKey: String {
        MarbleVoyagePlayerStats.playerKey(auth: auth)
    }

    private func reloadStats() {
        playerStats = MarbleVoyagePlayerStats.load(playerKey: statsPlayerKey)
        gameStats = MarbleVoyagePlayerStats.loadGame()
        gallery = MarbleVoyageGallery.load()
    }

    // MARK: - Chart chrome

    private var headerBar: some View {
        HStack {
            MarbleVoyageSecondaryButton(
                title: "Menu",
                systemImage: "chevron.backward.circle.fill",
                accessibilityID: "world2.marbleVoyage.menu"
            ) {
                withAnimation(.spring(response: 0.35, dampingFraction: 0.85)) {
                    shell = .title
                    run = nil
                    eventOutcome = nil
                    reloadStats()
                }
            }

            Spacer()

            if let run {
                Label("\(run.playerHP)/\(run.playerMaxHP) HP", systemImage: "heart.fill")
                    .font(.system(size: 18, weight: .black, design: .rounded))
                    .foregroundStyle(Color(red: 1, green: 0.45, blue: 0.55))
                    .padding(.horizontal, 14)
                    .padding(.vertical, 8)
                    .background(.ultraThinMaterial.opacity(0.95), in: Capsule())
                    .overlay(Capsule().stroke(.white.opacity(0.35), lineWidth: 1))
                    .accessibilityIdentifier("world2.marbleVoyage.hp")
            }
        }
        .padding(.horizontal, 12)
        .padding(.top, 2)
    }

    private var chart: some View {
        GeometryReader { geo in
            let columnCount = max((run?.nodes.map(\.column).max() ?? 1) + 1, 2)
            let content = MarbleVoyageClimbMap.contentSize(
                in: geo.size,
                columnCount: columnCount
            )
            let contentWidth = content.width
            let contentHeight = content.height
            let tile = MarbleVoyageArt.chartTileSize(forViewportWidth: geo.size.width)
            let positions = nodePositions(
                in: CGSize(width: contentWidth, height: contentHeight),
                tile: tile
            )
            let maxOffset = max(0, contentHeight - geo.size.height)

            // Full-bleed chart — no side Spacers / letterbox gutters.
            ZStack(alignment: .topLeading) {
                ZStack(alignment: .topLeading) {
                    climbPosterBackdrop(width: contentWidth, height: contentHeight)

                    // Light haze only — keep blueprint lines readable (no leaf litter).
                    LinearGradient(
                        colors: [
                            Color.black.opacity(0.10),
                            Color.clear,
                            Color.black.opacity(0.14),
                        ],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                    .frame(width: contentWidth, height: contentHeight)
                    .allowsHitTesting(false)

                    if let run {
                        ForEach(Array(run.edges.enumerated()), id: \.offset) { _, edge in
                            chartEdge(
                                from: edge.from,
                                to: edge.to,
                                positions: positions,
                                kind: .idle
                            )
                        }
                        ForEach(Array(run.pathTaken.enumerated()), id: \.offset) { _, edge in
                            chartEdge(
                                from: edge.from,
                                to: edge.to,
                                positions: positions,
                                kind: .traversed
                            )
                        }
                        ForEach(Array(run.edges.enumerated()), id: \.offset) { _, edge in
                            let isChoice = edge.from == run.currentNodeID
                                && run.reachableChoices().contains(where: { $0.id == edge.to })
                            if isChoice {
                                chartEdge(
                                    from: edge.from,
                                    to: edge.to,
                                    positions: positions,
                                    kind: .choice
                                )
                            }
                        }
                        ForEach(run.nodes) { node in
                            if let point = positions[node.id] {
                                nodeChip(
                                    node,
                                    positions: positions,
                                    hidePlayerWhileMarching: isMarching,
                                    tile: tile
                                )
                                    .id(node.id)
                                    .position(point)
                            }
                        }
                    }

                    if let marchPosition {
                        climbPlayerToken(size: tile * 0.45, flashing: false)
                            .position(marchPosition)
                            .zIndex(20)
                            .allowsHitTesting(false)
                    }
                }
                .frame(width: contentWidth, height: contentHeight, alignment: .topLeading)
                .offset(y: -climbCameraOffset)
            }
            .frame(width: geo.size.width, height: geo.size.height, alignment: .top)
            .clipped()
            .contentShape(Rectangle())
            .gesture(climbPanGesture(maxOffset: maxOffset))
            .onAppear {
                dockPulse = true
                chartContentSize = CGSize(width: contentWidth, height: contentHeight)
                chartViewportSize = geo.size
                climbIntroViewportHeight = geo.size.height
                pulseAtmosphere()
                playClimbIntro(
                    contentHeight: contentHeight,
                    viewportHeight: geo.size.height,
                    positions: positions
                )
            }
            .onChange(of: geo.size) { _, newSize in
                let cols = max((run?.nodes.map(\.column).max() ?? 1) + 1, 2)
                let resized = MarbleVoyageClimbMap.contentSize(in: newSize, columnCount: cols)
                chartContentSize = resized
                chartViewportSize = newSize
                climbIntroViewportHeight = newSize.height
                let newMax = max(0, resized.height - newSize.height)
                let clamped = min(max(0, climbCameraOffset), newMax)
                climbCameraOffset = clamped
                climbScrollOffset = clamped
            }
            .onChange(of: run?.currentNodeID) { _, _ in
                guard !isClimbIntroPlaying else { return }
                marchChart(
                    contentHeight: contentHeight,
                    viewportHeight: geo.size.height,
                    positions: positions,
                    animated: !reduceMotion
                )
            }
            .onChange(of: run?.seed) { _, _ in
                climbIntroToken &+= 1
                climbIntroPlayedSeed = nil
                playClimbIntro(
                    contentHeight: contentHeight,
                    viewportHeight: geo.size.height,
                    positions: positions
                )
            }
        }
        .accessibilityIdentifier("world2.marbleVoyage.chart")
        .allowsHitTesting(!isMarching)
    }

    private func climbPosterBackdrop(width: CGFloat, height: CGFloat) -> some View {
        MarbleVoyageBlueprintPaper(width: width, height: height)
    }

    private func climbPanGesture(maxOffset: CGFloat) -> some Gesture {
        DragGesture(minimumDistance: 12)
            .onChanged { value in
                guard !isMarching else { return }
                if isClimbIntroPlaying {
                    scrubCastFrame(translationY: value.translation.height)
                    return
                }
                if climbDragAnchor == nil {
                    climbDragAnchor = climbCameraOffset
                }
                // Slow, deliberate pan — big land portraits need time to read.
                let scaled = value.translation.height * MarbleVoyageDesignRules.climbPanDragSensitivity
                let next = (climbDragAnchor ?? climbCameraOffset) - scaled
                let clamped = min(max(0, next), maxOffset)
                climbCameraOffset = clamped
                climbScrollOffset = clamped
            }
            .onEnded { _ in
                climbDragAnchor = nil
                climbCastScrubAnchor = nil
            }
    }

    /// Vertical drag during cast = scrub frame index (boss → Abbie), camera follows.
    private func scrubCastFrame(translationY: CGFloat) {
        guard !climbRevealBeats.isEmpty else { return }
        if climbCastScrubAnchor == nil {
            climbCastScrubAnchor = climbRevealIndex
        }
        let stride = MarbleVoyageDesignRules.climbCastScrubPointsPerFrame
        // Finger down → next frames toward Abbie; finger up → back toward the boss.
        let delta = Int((translationY / stride).rounded(.towardZero))
        let next = min(
            max(0, (climbCastScrubAnchor ?? 0) + delta),
            climbRevealBeats.count - 1
        )
        guard next != climbRevealIndex else { return }
        presentClimbReveal(at: next, animated: false)
    }

    private func climbOffsetCentering(
        pointY: CGFloat,
        viewportHeight: CGFloat,
        maxOffset: CGFloat,
        anchorY: CGFloat
    ) -> CGFloat {
        MarbleVoyageOverlandScroll.cameraOffset(
            centering: pointY,
            viewportHeight: viewportHeight,
            maxOffset: maxOffset,
            anchorY: anchorY
        )
    }

    /// Prefer the midpoint of Abbie + her next glowing landing so both share the viewport.
    private func climbPlayFocusY(
        run: MarbleVoyageRun,
        positions: [String: CGPoint]
    ) -> CGFloat {
        // Fallback near Abbie’s dock (bottom of chart) when positions are still settling.
        let playerY = positions[run.currentNodeID]?.y ?? chartContentSize.height * 0.88
        guard let next = run.reachableChoices().first,
              let nextPoint = positions[next.id] else {
            return playerY
        }
        return (playerY + nextPoint.y) * 0.5
    }

    private func setClimbCamera(_ offset: CGFloat, animated: Bool, duration: TimeInterval) {
        let apply = {
            climbCameraOffset = offset
            climbScrollOffset = offset
        }
        if animated {
            withAnimation(.easeInOut(duration: duration)) { apply() }
        } else {
            var t = Transaction()
            t.disablesAnimations = true
            withTransaction(t) { apply() }
        }
    }

    /// Cast intro via generic overland scroll — order from DesignRules.climbCastTourOrder.
    private func playClimbIntro(
        contentHeight: CGFloat,
        viewportHeight: CGFloat,
        positions: [String: CGPoint]
    ) {
        guard let run else { return }
        let token = climbIntroToken
        let maxOffset = max(0, contentHeight - viewportHeight)
        let focusY = climbPlayFocusY(run: run, positions: positions)
        let endOffset = climbOffsetCentering(
            pointY: focusY,
            viewportHeight: viewportHeight,
            maxOffset: maxOffset,
            anchorY: MarbleVoyageDesignRules.climbIntroPlayerScrollAnchorY
        )

        // Returning from a fight/event: snap to player — keep engage card, skip cast.
        if climbIntroPlayedSeed == run.seed {
            clearClimbRevealCard()
            climbRevealBeats = []
            setClimbCamera(endOffset, animated: false, duration: 0)
            isClimbIntroPlaying = false
            presentEngageCardForReachable(positions: positions)
            return
        }
        climbIntroPlayedSeed = run.seed
        climbIntroViewportHeight = viewportHeight
        climbEngageNodeID = nil

        let beats = MarbleVoyageOverlandScroll.makeCastStops(
            run: run,
            positions: positions,
            order: MarbleVoyageDesignRules.climbCastTourOrder,
            fighterKind: { chartFighterKind(for: $0, run: run) }
        )
        climbRevealBeats = beats
        climbRevealIndex = 0
        isClimbIntroPlaying = true
        clearClimbRevealCard()

        if beats.isEmpty {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
                guard token == climbIntroToken else { return }
                skipClimbIntro(snapToPlayer: true)
            }
            return
        }

        let first = beats[0]
        let firstOffset = climbOffsetCentering(
            pointY: first.pointY,
            viewportHeight: viewportHeight,
            maxOffset: maxOffset,
            anchorY: first.focusAnchorY
        )
        setClimbCamera(firstOffset, animated: false, duration: 0)

        let settle = reduceMotion ? 0.12 : MarbleVoyageDesignRules.climbIntroSettleSeconds
        DispatchQueue.main.asyncAfter(deadline: .now() + settle) {
            guard token == climbIntroToken else { return }
            presentClimbReveal(at: 0, animated: !reduceMotion)
        }
    }

    private func presentClimbReveal(at index: Int, animated: Bool) {
        let token = climbIntroToken
        guard index >= 0, index < climbRevealBeats.count else { return }
        let beat = climbRevealBeats[index]
        climbRevealIndex = index

        let viewportHeight = max(climbIntroViewportHeight, 1)
        let maxOffset = max(0, chartContentSize.height - viewportHeight)
        let pan = animated && !reduceMotion
            ? MarbleVoyageDesignRules.climbRevealPanSeconds
            : 0.2
        let offset = climbOffsetCentering(
            pointY: beat.pointY,
            viewportHeight: viewportHeight,
            maxOffset: maxOffset,
            anchorY: beat.focusAnchorY
        )

        climbRevealFocusID = beat.nodeID
        climbRevealLetters = 0

        setClimbCamera(offset, animated: animated, duration: pan)

        let nameLen = (beat.card?.name ?? "").uppercased().count
        if !animated || reduceMotion {
            climbRevealLetters = nameLen
            return
        }

        // Type while the camera pans — don't wait for settle.
        DispatchQueue.main.async {
            guard token == climbIntroToken, climbRevealIndex == index else { return }
            animateClimbRevealLetters(token: token) {}
        }
    }

    private func climbRevealStep(delta: Int) {
        climbIntroToken &+= 1
        let next = climbRevealIndex + delta
        guard next >= 0, next < climbRevealBeats.count else { return }
        presentClimbReveal(at: next, animated: !reduceMotion)
    }

    private func animateClimbRevealLetters(token: UInt, completion: @escaping () -> Void) {
        let total = (climbRevealCard?.name ?? "").uppercased().count
        guard total > 0 else {
            completion()
            return
        }
        if reduceMotion {
            withAnimation(.easeOut(duration: 0.15)) {
                climbRevealLetters = total
            }
            completion()
            return
        }
        let step = MarbleVoyageDesignRules.climbRevealLetterSeconds
        for i in 1...total {
            DispatchQueue.main.asyncAfter(deadline: .now() + step * Double(i)) {
                guard token == climbIntroToken else { return }
                climbRevealLetters = i
                if i == total {
                    completion()
                }
            }
        }
    }

    /// Skip / finish cast. `snapToPlayer` ends on Abbie + keeps the engage foe card.
    private func skipClimbIntro(snapToPlayer: Bool) {
        climbIntroToken &+= 1
        clearClimbRevealCard()
        climbRevealBeats = []
        isClimbIntroPlaying = false

        let tile = MarbleVoyageArt.chartTileSize(forViewportWidth: chartContentSize.width)
        let positions = nodePositions(in: chartContentSize.width > 1 ? chartContentSize : CGSize(width: 700, height: 1600), tile: tile)

        if snapToPlayer {
            let contentHeight = chartContentSize.height
            let viewportHeight = max(climbIntroViewportHeight, 1)
            let maxOffset = max(0, contentHeight - viewportHeight)
            let focusY: CGFloat
            if let run {
                focusY = climbPlayFocusY(run: run, positions: positions)
            } else {
                focusY = contentHeight * 0.88
            }
            let endOffset = climbOffsetCentering(
                pointY: focusY,
                viewportHeight: viewportHeight,
                maxOffset: maxOffset,
                anchorY: MarbleVoyageDesignRules.climbIntroPlayerScrollAnchorY
            )
            let pan = reduceMotion ? 0.25 : MarbleVoyageDesignRules.climbRevealFinalPanSeconds
            setClimbCamera(endOffset, animated: !reduceMotion, duration: pan)
        }

        presentEngageCardForReachable(positions: positions)
    }

    /// Show / refresh the foe card for the next glowing landing (tap tile or FIGHT to enter).
    private func presentEngageCardForReachable(positions: [String: CGPoint]) {
        guard let run else {
            climbEngageNodeID = nil
            climbRevealFocusID = nil
            return
        }
        let choices = run.reachableChoices()
        // Prefer a fight among branches; otherwise first glowing landing that we can place.
        let pick = choices.first(where: {
            ($0.kind == .fight || $0.kind == .boss) && positions[$0.id] != nil
        }) ?? choices.first(where: { positions[$0.id] != nil }) ?? choices.first
        climbEngageNodeID = pick?.id
        climbRevealFocusID = pick?.id
        if let pick, let card = makeEngageCard(for: pick, run: run) {
            climbRevealLetters = card.name.count
        } else {
            climbRevealLetters = 0
        }
    }

    private func makeEngageCard(
        for node: MarbleVoyageNode,
        run: MarbleVoyageRun
    ) -> MarbleVoyageOverlandScroll.Card? {
        if let fighter = chartFighterKind(for: node, run: run) {
            let role = node.gangRole ?? (node.kind == .boss ? .bigBoss : .henchman)
            let roleLabel: String
            switch role {
            case .bigBoss: roleLabel = "SUMMIT BOSS"
            case .miniBoss: roleLabel = "LAND BOSS"
            case .henchman: roleLabel = "FIGHT"
            }
            let stats = PeglinBattleRules.previewLeadFoeStats(
                wave: fighter,
                focus: fighter,
                role: role
            )
            return .init(
                name: fighter.shortName,
                role: roleLabel,
                roleKind: role,
                blurb: fighter.castBlurb,
                stageTitle: node.title,
                hp: stats.hp,
                atk: stats.atk,
                threat: node.threat,
                kind: fighter
            )
        }
        switch node.kind {
        case .treasure:
            return .init(
                name: "Treasure",
                role: "TREASURE",
                roleKind: .henchman,
                blurb: "A glowing cache on the climb.",
                stageTitle: node.kind.chartLabel,
                hp: 0,
                atk: 0,
                threat: node.threat,
                kind: nil
            )
        case .mystery, .shrine:
            return .init(
                name: "?",
                role: "ENCOUNTER",
                roleKind: .henchman,
                blurb: "Could be a fight, treasure, or a trap.",
                stageTitle: "?",
                hp: 0,
                atk: 0,
                threat: node.threat,
                kind: nil
            )
        default:
            return nil
        }
    }

    private func clearClimbRevealCard() {
        climbRevealLetters = 0
    }

    private func marchChart(
        contentHeight: CGFloat,
        viewportHeight: CGFloat,
        positions: [String: CGPoint],
        animated: Bool
    ) {
        guard let run else { return }
        let maxOffset = max(0, contentHeight - viewportHeight)
        let focusY = climbPlayFocusY(run: run, positions: positions)
        let target = climbOffsetCentering(
            pointY: focusY,
            viewportHeight: viewportHeight,
            maxOffset: maxOffset,
            anchorY: 0.5
        )
        setClimbCamera(target, animated: animated, duration: 0.85)
    }

    private enum ChartEdgeKind {
        case idle
        case traversed
        case choice
    }

    @ViewBuilder
    private func chartEdge(
        from: String,
        to: String,
        positions: [String: CGPoint],
        kind: ChartEdgeKind
    ) -> some View {
        if let a = positions[from], let b = positions[to] {
            let line = Path { path in
                path.move(to: a)
                path.addLine(to: b)
            }
            switch kind {
            case .idle:
                line.stroke(
                    Color.white.opacity(0.22),
                    style: StrokeStyle(lineWidth: 3.5, lineCap: .round, dash: [9, 9])
                )
            case .traversed:
                // Fat dark understroke + bright gold solid — “this is the way you came.”
                ZStack {
                    line.stroke(
                        Color(red: 0.35, green: 0.18, blue: 0.02).opacity(0.85),
                        style: StrokeStyle(lineWidth: 14, lineCap: .round)
                    )
                    line.stroke(
                        Color(red: 1.0, green: 0.82, blue: 0.22),
                        style: StrokeStyle(lineWidth: 8, lineCap: .round)
                    )
                    line.stroke(
                        Color(red: 1.0, green: 0.95, blue: 0.65).opacity(0.9),
                        style: StrokeStyle(lineWidth: 3, lineCap: .round)
                    )
                }
            case .choice:
                line.stroke(
                    Color(red: 0.25, green: 0.75, blue: 1.0).opacity(0.95),
                    style: StrokeStyle(lineWidth: 6, lineCap: .round, dash: [12, 8])
                )
            }
        }
    }

    private func edgeStroke(from: String, to: String) -> Color {
        // Kept for any legacy callers; chart uses chartEdge layers instead.
        guard let run else { return Color.white.opacity(0.18) }
        if run.didTraverse(from: from, to: to) {
            return Color(red: 1.0, green: 0.82, blue: 0.22)
        }
        let choices = Set(run.reachableChoices().map(\.id))
        if choices.contains(to) && from == run.currentNodeID {
            return Color(red: 0.45, green: 0.9, blue: 1)
        }
        return Color.white.opacity(0.18)
    }

    /// column 0 = Abbie’s dock at the BOTTOM; higher column = further UP toward the summit boss.
    /// Vertical spacing follows big fight-tile size so portraits stay readable.
    private func nodePositions(in size: CGSize, tile: CGFloat) -> [String: CGPoint] {
        guard let run else { return [:] }
        let maxRow = max(run.nodes.map(\.row).max() ?? 1, 1)
        let step = tile * MarbleVoyageArt.chartTileVerticalSpacingFactor
        let bottomPad = tile * 1.15 + MarbleVoyageDesignRules.climbAbbieCardClearance
        var out: [String: CGPoint] = [:]
        for node in run.nodes {
            let y = size.height - bottomPad - step * CGFloat(node.column)
            let x = size.width * (0.22 + 0.56 * CGFloat(node.row) / CGFloat(max(maxRow, 1)))
            out[node.id] = CGPoint(x: x, y: y)
        }
        return out
    }

    @ViewBuilder
    private func nodeChip(
        _ node: MarbleVoyageNode,
        positions: [String: CGPoint],
        hidePlayerWhileMarching: Bool,
        tile: CGFloat
    ) -> some View {
        if let run {
            let isHere = node.id == run.currentNodeID && !hidePlayerWhileMarching
            let showPlayer = isHere
            let isReachable = run.reachableChoices().contains(where: { $0.id == node.id })
            let seen = run.visited.contains(node.id)
            let role = node.gangRole ?? (node.kind == .boss ? .bigBoss : (node.kind == .fight ? .henchman : nil))
            let drawTile = tile * MarbleVoyageArt.chartTileRoleScale(for: role)
            let rose = MarbleVoyageArt.chartTileRose
            let tint = Color(red: rose.r, green: rose.g, blue: rose.b)
            let corner = MarbleVoyageArt.chartTileCorner(for: drawTile)
            let iconSize = MarbleVoyageArt.chartTileIconSize(for: drawTile)
            let fighter = chartFighterKind(for: node, run: run)
            // Portrait / destination art only — role labels (FIGHT, LAND BOSS, TREASURE)
            // live on the engage / cast battle card, not as floating tile badges.
            let chip = ZStack(alignment: .topLeading) {
                RoundedRectangle(cornerRadius: corner, style: .continuous)
                    .fill(tint.opacity(showPlayer ? 0.98 : (isReachable ? 0.96 : seen ? 0.82 : 0.34)))
                    .frame(width: drawTile, height: drawTile)
                    .overlay(
                        RoundedRectangle(cornerRadius: corner, style: .continuous)
                            .stroke(
                                showPlayer
                                    ? Color(red: 0.45, green: 0.95, blue: 0.7)
                                    : (seen && !isReachable
                                       ? Color(red: 1.0, green: 0.82, blue: 0.22)
                                       : .white.opacity(isReachable ? 0.95 : 0.4)),
                                lineWidth: showPlayer ? 3.5 : (seen && !isReachable ? 3.5 : (isReachable ? 3 : 1.5))
                            )
                    )
                    .shadow(
                        color: showPlayer
                            ? Color(red: 0.3, green: 0.95, blue: 0.55).opacity(0.55)
                            : (isReachable
                               ? tint.opacity(0.7)
                               : (seen ? Color(red: 1.0, green: 0.82, blue: 0.22).opacity(0.5) : .clear)),
                        radius: showPlayer || seen || isReachable ? 8 : 0
                    )

                if showPlayer {
                    PeglinAbbieBattlePortrait(state: .happy, size: drawTile * VoyageTileLegibility.chartArtEdgeFraction())
                        .frame(width: drawTile, height: drawTile)
                        .shadow(
                            color: Color(red: 0.3, green: 0.95, blue: 0.55).opacity(0.55),
                            radius: 8
                        )
                        .scaleEffect(dockPulse && !reduceMotion ? 1.04 : 1.0)
                } else if let fighter {
                    chartFighterPortrait(
                        kind: fighter,
                        tile: drawTile,
                        ominous: role == .bigBoss || node.kind == .boss
                    )
                    .frame(width: drawTile, height: drawTile)
                    if seen && !isReachable {
                        chartClearedStamp(tile: drawTile)
                    }
                } else {
                    chartDestinationArt(kind: node.kind, tile: drawTile, iconSize: iconSize)
                    if seen && !isReachable {
                        chartClearedStamp(tile: drawTile)
                    }
                }
            }
            .frame(width: drawTile, height: drawTile)
            .scaleEffect(reachableTileScale(isReachable: isReachable, isBoss: node.kind == .boss))
            .scaleEffect(climbRevealFocusID == node.id ? 1.18 : 1.0)
            .animation(.spring(response: 0.45, dampingFraction: 0.78), value: climbRevealFocusID)
            .animation(
                isReachable && node.kind != .boss && !reduceMotion
                    ? .easeInOut(duration: 0.9).repeatForever(autoreverses: true)
                    : (showPlayer && !reduceMotion
                       ? .easeInOut(duration: 0.7).repeatForever(autoreverses: true)
                       : .default),
                value: dockPulse
            )
            .accessibilityLabel(
                showPlayer
                    ? "Abbie at \(node.title)"
                    : (fighter.map { "Fight \($0.displayName): \(node.title)" }
                       ?? "\(node.kind.displayName): \(node.title)")
            )
            .accessibilityIdentifier(
                isReachable
                    ? "world2.marbleVoyage.choice.\(node.id)"
                    : "world2.marbleVoyage.node.\(node.id)"
            )

            if isReachable {
                Button {
                    if isClimbIntroPlaying {
                        climbIntroToken &+= 1
                        isClimbIntroPlaying = false
                        climbRevealBeats = []
                    }
                    // Show the battle card first (fights, treasure, mystery, shrine).
                    // CTA on the card enters; second tap on the same glowing tile also enters.
                    if climbEngageNodeID == node.id, !isClimbIntroPlaying {
                        beginClimb(to: node, positions: positions)
                    } else {
                        climbEngageNodeID = node.id
                        climbRevealFocusID = node.id
                        if let card = makeEngageCard(for: node, run: run) {
                            climbRevealLetters = card.name.count
                        } else {
                            climbRevealLetters = 0
                        }
                    }
                } label: {
                    chip
                }
                .buttonStyle(.plain)
                .disabled(isMarching)
            } else {
                chip
            }
        }
    }

    /// Fighter shown on a fight/boss chart tile — henchman, that land's boss, or the summit boss.
    private func chartFighterKind(for node: MarbleVoyageNode, run: MarbleVoyageRun) -> PlinkAttackerKind? {
        switch node.kind {
        case .fight, .boss:
            if let attacker = node.waveAttacker { return attacker }
            switch node.gangRole {
            case .bigBoss:
                return run.gang.bigBoss
            case .miniBoss where node.miniArcIndex >= 0:
                return run.gang.miniBoss(arcIndex: node.miniArcIndex)
            default:
                return node.kind == .boss ? run.gang.bigBoss : nil
            }
        default:
            return nil
        }
    }

    /// Next-level choices keep the same base size; only a gentle grow/shrink tween.
    /// Boss tiles never scale — they use an opacity/glow pulse instead.
    private func reachableTileScale(isReachable: Bool, isBoss: Bool = false) -> CGFloat {
        guard isReachable, !isBoss else { return 1 }
        if reduceMotion { return 1 }
        return dockPulse ? 1.1 : 0.92
    }

    /// Fight / mini / big-boss chart portrait. Face fills the tile (same crop as the battle card).
    @ViewBuilder
    private func chartFighterPortrait(kind: PlinkAttackerKind, tile: CGFloat, ominous: Bool) -> some View {
        let glow = ominous && !reduceMotion && dockPulse
        let edge = tile * VoyageTileLegibility.chartArtEdgeFraction()
        ZStack {
            PlinkAttackerBattlePortrait(
                kind: kind,
                size: edge,
                stroke: .white.opacity(0.35)
            )
        }
        .opacity(ominous ? (glow ? 1.0 : 0.72) : 1)
        .shadow(
            color: ominous
                ? Color(red: 0.85, green: 0.15, blue: 0.35).opacity(glow ? 0.95 : 0.35)
                : .black.opacity(0.35),
            radius: ominous ? (glow ? 18 : 6) : 4
        )
        .animation(
            ominous && !reduceMotion
                ? .easeInOut(duration: 1.15).repeatForever(autoreverses: true)
                : .default,
            value: dockPulse
        )
        .accessibilityLabel(ominous ? "Boss \(kind.displayName)" : kind.displayName)
    }

    /// Lasting “done” seal on visited climb tiles (not only a corner checkmark).
    private func chartClearedStamp(tile: CGFloat) -> some View {
        let seal = max(28, tile * 0.34)
        return ZStack {
            Circle()
                .fill(Color(red: 0.12, green: 0.1, blue: 0.05).opacity(0.72))
                .frame(width: seal, height: seal)
            Circle()
                .stroke(Color(red: 1.0, green: 0.82, blue: 0.28), lineWidth: max(2, tile * 0.02))
                .frame(width: seal, height: seal)
            VStack(spacing: 0) {
                Image(systemName: "checkmark")
                    .font(.system(size: max(11, tile * 0.1), weight: .black))
                Text("DONE")
                    .font(.system(size: max(8, tile * 0.055), weight: .black, design: .rounded))
                    .tracking(0.6)
            }
            .foregroundStyle(Color(red: 1.0, green: 0.86, blue: 0.32))
        }
        .rotationEffect(.degrees(-12))
        .shadow(color: .black.opacity(0.45), radius: 3, y: 1)
        .frame(width: tile, height: tile, alignment: .bottomTrailing)
        .padding(.trailing, tile * 0.04)
        .padding(.bottom, tile * 0.04)
        .accessibilityHidden(true)
    }

    /// Treasure / mystery / shrine chart vignette — catalog art when bound, else SF accent.
    @ViewBuilder
    private func chartDestinationArt(kind: MarbleVoyageNodeKind, tile: CGFloat, iconSize: CGFloat) -> some View {
        if let catalog = MarbleVoyageArt.climbDestinationCatalogName(for: kind),
           UIImage(named: catalog) != nil {
            Image(catalog)
                .resizable()
                .scaledToFit()
                .frame(
                    width: tile * VoyageTileLegibility.chartArtEdgeFraction(),
                    height: tile * VoyageTileLegibility.chartArtEdgeFraction()
                )
                .frame(width: tile, height: tile)
                .shadow(color: .black.opacity(0.4), radius: 3, y: 1)
        } else {
            Image(systemName: MarbleVoyageArt.eventAccentIcon(kind))
                .font(.system(size: iconSize, weight: .black))
                .symbolRenderingMode(.hierarchical)
                .foregroundStyle(.white)
                .shadow(color: .black.opacity(0.45), radius: 2, y: 1)
                .frame(width: tile, height: tile)
        }
    }

    private func climbPlayerToken(size: CGFloat, flashing: Bool) -> some View {
        ZStack {
            Circle()
                .fill(Color(red: 0.25, green: 0.75, blue: 0.45).opacity(0.35))
                .frame(width: size + 14, height: size + 14)
                .scaleEffect(flashing && dockPulse && !reduceMotion ? 1.18 : 1.0)
                .opacity(flashing && dockPulse && !reduceMotion ? 0.35 : 0.55)
            PeglinAbbieBattlePortrait(state: .happy, size: size)
                .shadow(
                    color: Color(red: 0.3, green: 0.95, blue: 0.55).opacity(0.65),
                    radius: flashing ? 10 : 4
                )
                .scaleEffect(flashing && dockPulse && !reduceMotion ? 1.06 : 1.0)
        }
        .animation(
            flashing && !reduceMotion
                ? .easeInOut(duration: 0.7).repeatForever(autoreverses: true)
                : .default,
            value: dockPulse
        )
        .accessibilityIdentifier("world2.marbleVoyage.playerToken")
    }

    /// March along the path, slam a curtain, then open the landing (versus → board).
    private func beginClimb(to node: MarbleVoyageNode, positions: [String: CGPoint]) {
        guard !isMarching, let run else { return }
        let from = positions[run.currentNodeID] ?? nodePositionsForCurrentChart()[run.currentNodeID]
        let to = positions[node.id] ?? nodePositionsForCurrentChart()[node.id]
        guard let from, let to else {
            commitLanding(node)
            return
        }

        MarbleVoyageAudio.choosePath()
        isMarching = true
        climbEngageNodeID = nil
        marchPosition = from

        let travel: TimeInterval = reduceMotion ? 0.2 : 1.15
        withAnimation(.easeInOut(duration: travel)) {
            marchPosition = to
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + travel) {
            commitLanding(node)
        }
    }

    private func commitLanding(_ node: MarbleVoyageNode) {
        MarbleVoyageAudio.sceneTransition()
        withAnimation(.easeIn(duration: 0.22)) {
            sceneCurtain = true
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
            withAnimation(.easeInOut(duration: 0.35)) {
                run?.choose(node.id)
                if case .event = run?.phase {
                    prepareEvent(for: node)
                }
                marchPosition = nil
                isMarching = false
            }
            // Hold black a beat so the versus splash can mount under the curtain.
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.28) {
                withAnimation(.easeOut(duration: 0.45)) {
                    sceneCurtain = false
                }
            }
        }
    }

    private func nodePositionsForCurrentChart() -> [String: CGPoint] {
        let size = chartContentSize.width > 1
            ? chartContentSize
            : CGSize(width: 700, height: 1600)
        let viewportW = chartViewportSize.width > 1 ? chartViewportSize.width : size.width
        let tile = MarbleVoyageArt.chartTileSize(forViewportWidth: viewportW)
        return nodePositions(in: size, tile: tile)
    }

    // MARK: - Fight

    private func fightPhase(_ node: MarbleVoyageNode) -> some View {
        let active = run
        // Lead portrait for mini/summit only — hench fights use the wave attacker as lead.
        let focusCrew: PlinkAttackerKind? = {
            guard let gang = active?.gang else { return nil }
            switch node.gangRole {
            case .bigBoss:
                return gang.bigBoss
            case .miniBoss:
                guard node.miniArcIndex >= 0 else { return nil }
                return gang.miniBoss(arcIndex: node.miniArcIndex)
            case .henchman, .none:
                return node.waveAttacker
            }
        }()
        return PlinkBattleHostView(
            title: node.title,
            enemyKind: node.enemyKind,
            waveAttackerOverride: node.waveAttacker,
            climbStage: max(1, node.stage),
            attackerPortraitScale: active.map { $0.attackerPortraitScale(for: node) } ?? 1,
            focusCrewMember: focusCrew,
            gangFightRole: node.gangRole,
            sceneBackgroundAsset: MarbleVoyageArt.fightPlate(enemy: node.enemyKind),
            playerID: playerID,
            startingPlayerHP: active?.playerHP,
            overrideEnemyMaxHP: nil,
            overridePlayerMaxHP: active?.playerMaxHP,
            overrideEnemyAttack: active.map { $0.enemyAttack(for: node) },
            voyageEconomy: active.map { voyageTunables(for: $0, foe: node.waveAttacker) },
            startingDeck: active?.fightDeckOrbIDs,
            startingMarbles: active?.marbleCollection,
            startingBallLevel: active?.ballLevel ?? 1,
            startingHeroLevel: active?.heroLevel ?? MarbleVoyageHeroLevel.minLevel,
            startingHeroXPIntoLevel: active?.heroXPIntoLevel ?? 0,
            onExit: {
                MarbleVoyageAudio.defeat()
                run?.phase = .defeat
                run?.lastEventLine = "Left the fight — voyage abandoned."
            },
            onVictory: nil,
            onBattleEnded: { won, remaining, goldEarned, comboXP in
                DispatchQueue.main.asyncAfter(deadline: .now() + (won ? 1.35 : 1.0)) {
                    withAnimation(.spring(response: 0.4, dampingFraction: 0.84)) {
                        let enemy = node.enemyKind
                        let wasBoss = node.kind == .boss
                        run?.finishFight(
                            won: won,
                            remainingHP: remaining,
                            goldEarned: goldEarned,
                            comboXP: comboXP
                        )
                        if won {
                            let pulse = gallery.recordFightWin(
                                isBoss: wasBoss,
                                enemyIsBizarro: enemy == .bizarroAbbie,
                                fightsClearedAfter: run?.fightsCleared ?? 0,
                                mode: run?.mode ?? .campaign
                            )
                            presentUnlockToast(pulse)
                            MarbleVoyagePlayerStats.recordFightWin(
                                playerKey: statsPlayerKey,
                                isMiniBoss: node.gangRole == .miniBoss,
                                isBigBoss: node.gangRole == .bigBoss || wasBoss,
                                fightsClearedAfter: run?.fightsCleared ?? 0,
                                mode: run?.mode ?? .campaign
                            )
                            reloadStats()
                            if run?.mode == .endless {
                                let depth = run?.fightsCleared ?? 0
                                let endlessPulse = gallery.recordEndlessBest(depth)
                                presentUnlockToast(endlessPulse)
                            }
                        }
                        if case .victory = run?.phase {
                            MarbleVoyageAudio.victory()
                        } else if case .defeat = run?.phase {
                            MarbleVoyageAudio.defeat()
                        }
                    }
                }
            },
            // Voyage: skip deck lobby — tile tap → curtain → versus slam → board.
            autoStartFight: true,
            captureFreezeBoard: captureStage == .fight
        )
    }

    /// Gold prevalence / ball power / charm effects the board needs for this fight.
    private func voyageTunables(
        for run: MarbleVoyageRun,
        foe: PlinkAttackerKind?
    ) -> PlinkVoyageTunables {
        let foeTemper = foe?.temper ?? .brawl
        return PlinkVoyageTunables(
            goldPegPrevalence: run.economy.goldPegPrevalence,
            goldPegValue: run.effectiveGoldPegValue,
            ballDamageMultiplier: run.fightDamageMultiplier,
            cycleExtra: MarbleVoyageCharm.extraSpecialPegs(cycleStacks: run.charmStack(.cycle)),
            sockSnatch: MarbleVoyageCharm.bombClearCoins(sockSnatchStacks: run.charmStack(.sockSnatch)),
            prismBonus: MarbleVoyageCharm.prismCageBonus(stacks: run.charmStack(.prismBurst)),
            softPurr: MarbleVoyageCharm.biteDamageReduction(softPurrStacks: run.charmStack(.softPurr)),
            hoverStacks: run.charmStack(.hover),
            charmStacks: Dictionary(
                uniqueKeysWithValues: MarbleVoyageCharm.allCases.compactMap { charm in
                    let n = run.charmStack(charm)
                    return n > 0 ? (charm, n) : nil
                }
            ),
            bagTemperTip: PlinkTemperRules.bagTip(
                collection: run.marbleCollection,
                foe: foeTemper
            )
        )
    }

    // MARK: - Events

    private func prepareEvent(for node: MarbleVoyageNode) {
        var rng = SystemRandomNumberGenerator()
        eventOutcome = MarbleVoyageEvents.resolve(kind: node.kind, title: node.title, rng: &rng)
        if let outcome = eventOutcome {
            if outcome.hpDelta > 0 {
                MarbleVoyageAudio.heal()
            } else if outcome.hpDelta < 0 {
                MarbleVoyageAudio.sting()
            } else {
                MarbleVoyageAudio.tap()
            }
        }
    }

    private func eventPhase(_ node: MarbleVoyageNode) -> some View {
        let outcome = eventOutcome ?? .init(message: "…", hpDelta: 0)
        return VStack(spacing: 18) {
            headerBar
            Spacer()
            eventHeroArt(kind: node.kind)
            Text(node.title)
                .font(.system(size: 32, weight: .black, design: .rounded))
                .foregroundStyle(.white)
            Text(outcome.message)
                .font(.system(size: 18, weight: .semibold, design: .rounded))
                .foregroundStyle(.white.opacity(0.92))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 28)
            if outcome.hpDelta != 0 {
                Text(outcome.hpDelta > 0 ? "+\(outcome.hpDelta) HP" : "\(outcome.hpDelta) HP")
                    .font(.system(size: 40, weight: .black, design: .rounded))
                    .foregroundStyle(outcome.hpDelta > 0
                                     ? Color(red: 0.4, green: 0.95, blue: 0.55)
                                     : Color(red: 1, green: 0.4, blue: 0.4))
            }
            if outcome.coinDelta > 0 {
                Text("+\(outcome.coinDelta) coins")
                    .font(.system(size: 28, weight: .black, design: .rounded))
                    .foregroundStyle(Color(red: 1.0, green: 0.85, blue: 0.35))
            }
            if let charm = outcome.charmGrant {
                Text("Charm · \(charm.title)")
                    .font(.system(size: 22, weight: .black, design: .rounded))
                    .foregroundStyle(Color(red: 0.75, green: 0.9, blue: 1.0))
            }
            if outcome.ballUpgrade {
                Text("Ball upgrade!")
                    .font(.system(size: 22, weight: .black, design: .rounded))
                    .foregroundStyle(Color(red: 1.0, green: 0.7, blue: 0.4))
            }
            Button {
                MarbleVoyageAudio.tap()
                withAnimation(.spring(response: 0.38, dampingFraction: 0.82)) {
                    if outcome.hpDelta > 0 {
                        presentUnlockToast(gallery.recordHealEvent())
                        MarbleVoyagePlayerStats.recordHeal(playerKey: statsPlayerKey)
                        reloadStats()
                    }
                    run?.applyEvent(outcome)
                    eventOutcome = nil
                }
            } label: {
                Text("Continue")
                    .font(.system(size: 20, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                    .frame(maxWidth: 280)
                    .padding(.vertical, 14)
                    .background(MarbleVoyageChrome.primaryFill, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 18, style: .continuous)
                            .stroke(MarbleVoyageChrome.glassStroke, lineWidth: 1.5)
                    )
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("world2.marbleVoyage.event.continue")
            Spacer()
        }
        .accessibilityIdentifier("world2.marbleVoyage.event")
    }

    /// Treasure / mystery / shrine landing — catalog vignette when bound.
    @ViewBuilder
    private func eventHeroArt(kind: MarbleVoyageNodeKind) -> some View {
        let size: CGFloat = 148
        if let catalog = MarbleVoyageArt.climbDestinationCatalogName(for: kind),
           UIImage(named: catalog) != nil {
            Image(catalog)
                .resizable()
                .scaledToFit()
                .frame(width: size, height: size)
                .shadow(color: .black.opacity(0.45), radius: 12, y: 4)
                .accessibilityHidden(true)
        } else {
            Image(systemName: MarbleVoyageArt.eventAccentIcon(kind))
                .font(.system(size: 64, weight: .black))
                .foregroundStyle(.white)
                .shadow(color: .black.opacity(0.45), radius: 6, y: 2)
                .accessibilityHidden(true)
        }
    }

    private func endCard(title: String, body: String, tint: Color) -> some View {
        let mode = run?.mode
        return VStack(spacing: 16) {
            Spacer()
            Text(title)
                .font(.system(size: 40, weight: .black, design: .rounded))
                .foregroundStyle(.white)
            Text(body)
                .font(.system(size: 17, weight: .semibold, design: .rounded))
                .foregroundStyle(.white.opacity(0.9))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
            HStack(spacing: 12) {
                MarbleVoyagePrimaryButton(
                    title: "Sail again",
                    systemImage: "arrow.clockwise",
                    fill: tint,
                    accessibilityID: "world2.marbleVoyage.again"
                ) {
                    MarbleVoyageAudio.modeSelect()
                    if let mode {
                        run = MarbleVoyageRun.make(mode: mode)
                        MarbleVoyagePlayerStats.recordSessionStart(playerKey: statsPlayerKey)
                        reloadStats()
                    } else {
                        shell = .title
                        run = nil
                    }
                    eventOutcome = nil
                }
                .frame(maxWidth: 220)

                MarbleVoyageSecondaryButton(
                    title: "Title",
                    systemImage: "house.fill",
                    accessibilityID: "world2.marbleVoyage.titleReturn"
                ) {
                    withAnimation {
                        shell = .title
                        run = nil
                        eventOutcome = nil
                        reloadStats()
                    }
                }

                if !isStandalone {
                    MarbleVoyageSecondaryButton(
                        title: "World",
                        systemImage: "globe.americas.fill",
                        accessibilityID: "world2.marbleVoyage.world",
                        action: onExit
                    )
                }
            }
            .padding(.horizontal, 24)
            Spacer()
        }
    }

    private func presentUnlockToast(_ pulse: GalleryUnlockPulse) {
        guard let line = pulse.summaryLine else { return }
        withAnimation(.spring(response: 0.4, dampingFraction: 0.85)) {
            unlockToast = line
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.4) {
            withAnimation(.easeOut(duration: 0.35)) {
                if unlockToast == line {
                    unlockToast = nil
                }
            }
        }
    }
}


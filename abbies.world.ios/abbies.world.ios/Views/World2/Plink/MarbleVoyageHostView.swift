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
    @State private var climbScrollOffset: CGFloat = 0
    @State private var atmosphereBoost: Double = 0
    @State private var climbIntroToken: UInt = 0
    /// Explicit porthole Y offset (0 = top / summit). Prefer this over ScrollViewProxy.
    @State private var climbCameraOffset: CGFloat = 0
    @State private var isClimbIntroPlaying = false
    @State private var climbIntroPlayedSeed: UInt64?
    @State private var climbDragAnchor: CGFloat?
    @StateObject private var chartMusic = PlinkMusicService()
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

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
        }
        .accessibilityIdentifier("world2.marbleVoyage")
        .onAppear {
            reloadStats()
            chartMusic.playMeadow()
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

    @ViewBuilder
    private func playingBody(_ active: MarbleVoyageRun) -> some View {
        ZStack {
            switch active.phase {
            case .map:
                mapPhase
                    .transition(.opacity)
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
            if case .map = active.phase {
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
                Color.black.opacity(0.55)
                    .ignoresSafeArea()
                    .transition(.opacity)
                    .allowsHitTesting(false)
                    .zIndex(30)
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
        // Letterbox around the blueprint climb chart.
        LinearGradient(
            colors: [
                Color(red: 0.04, green: 0.12, blue: 0.22),
                Color(red: 0.07, green: 0.20, blue: 0.34),
                Color(red: 0.05, green: 0.14, blue: 0.26),
            ],
            startPoint: .top,
            endPoint: .bottom
        )
        .ignoresSafeArea()
    }

    // MARK: - Map

    private var mapPhase: some View {
        ZStack {
            chart
                .ignoresSafeArea(edges: .bottom)

            VStack(spacing: 0) {
                mapChromeHeader
                Spacer(minLength: 0)
                if let line = run?.lastEventLine, !line.isEmpty {
                    Text(line)
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                        .padding(12)
                        .frame(maxWidth: .infinity)
                        .background(.ultraThinMaterial.opacity(0.92), in: RoundedRectangle(cornerRadius: 14))
                        .overlay(
                            RoundedRectangle(cornerRadius: 14)
                                .stroke(.white.opacity(0.35), lineWidth: 1)
                        )
                        .padding(.horizontal, 20)
                        .padding(.bottom, 16)
                }
            }
            .padding(.top, 10)
        }
    }

    private var mapChromeHeader: some View {
        VStack(spacing: 6) {
            headerBar
            if let run {
                Text(run.mode == .campaign
                     ? "Climb · \(min(MarbleVoyageRun.campaignTotalFights, run.fightsCleared + 1))/\(MarbleVoyageRun.campaignTotalFights)"
                     : "Endless climb · \(run.fightsCleared) freed")
                    .font(.system(size: 24, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                    .shadow(color: .black.opacity(0.55), radius: 4, y: 1)
                Text("Tap a glowing landing — Abbie climbs the path.")
                    .font(.system(size: 14, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white.opacity(0.92))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 28)
            }
        }
        .padding(.bottom, 12)
        .padding(.top, 4)
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
        .padding(.horizontal, 18)
    }

    private var chart: some View {
        GeometryReader { geo in
            // Art leads: tall poster column (correct proportions), modest letterbox on sides.
            let content = MarbleVoyageClimbMap.contentSize(in: geo.size)
            let contentWidth = content.width
            let contentHeight = content.height
            let positions = nodePositions(in: CGSize(width: contentWidth, height: contentHeight))
            let maxOffset = max(0, contentHeight - geo.size.height)

            HStack(spacing: 0) {
                Spacer(minLength: 0)
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
                                    nodeChip(node, positions: positions, hidePlayerWhileMarching: isMarching)
                                        .id(node.id)
                                        .position(point)
                                }
                            }
                        }

                        if let marchPosition {
                            climbPlayerToken(size: 58, flashing: false)
                                .position(marchPosition)
                                .zIndex(20)
                                .allowsHitTesting(false)
                        }

                        if !reduceMotion {
                            MarbleVoyageSceneAtmosphere(
                                mood: .climb,
                                parallax: CGSize(
                                    width: sin(climbScrollOffset / 140) * 22,
                                    height: climbScrollOffset * 0.09
                                ),
                                reduceMotion: reduceMotion,
                                intensity: 0.72,
                                seed: 29,
                                transitionBoost: atmosphereBoost
                            )
                            .frame(width: contentWidth, height: contentHeight)
                            .allowsHitTesting(false)
                            .zIndex(25)
                        }
                    }
                    .frame(width: contentWidth, height: contentHeight, alignment: .topLeading)
                    .offset(y: -climbCameraOffset)
                }
                .frame(width: contentWidth, height: geo.size.height, alignment: .top)
                .clipped()
                .contentShape(Rectangle())
                .gesture(climbPanGesture(maxOffset: maxOffset))
                Spacer(minLength: 0)
            }
            .onAppear {
                dockPulse = true
                chartContentSize = CGSize(width: contentWidth, height: contentHeight)
                pulseAtmosphere()
                playClimbIntro(
                    contentHeight: contentHeight,
                    viewportHeight: geo.size.height,
                    positions: positions
                )
            }
            .onChange(of: geo.size) { _, newSize in
                let resized = MarbleVoyageClimbMap.contentSize(in: newSize)
                chartContentSize = resized
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
        .allowsHitTesting(!isMarching && !isClimbIntroPlaying)
    }

    private func climbPosterBackdrop(width: CGFloat, height: CGFloat) -> some View {
        MarbleVoyageBlueprintPaper(width: width, height: height)
    }

    private func climbPanGesture(maxOffset: CGFloat) -> some Gesture {
        DragGesture(minimumDistance: 12)
            .onChanged { value in
                guard !isClimbIntroPlaying, !isMarching else { return }
                if climbDragAnchor == nil {
                    climbDragAnchor = climbCameraOffset
                }
                let next = (climbDragAnchor ?? climbCameraOffset) - value.translation.height
                let clamped = min(max(0, next), maxOffset)
                climbCameraOffset = clamped
                climbScrollOffset = clamped
            }
            .onEnded { _ in
                climbDragAnchor = nil
            }
    }

    private func climbOffsetCentering(
        pointY: CGFloat,
        viewportHeight: CGFloat,
        maxOffset: CGFloat,
        anchorY: CGFloat
    ) -> CGFloat {
        let raw = pointY - viewportHeight * anchorY
        return min(max(0, raw), maxOffset)
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

    /// Summit / top of map first, then pan down so the player sits in the screen center.
    private func playClimbIntro(
        contentHeight: CGFloat,
        viewportHeight: CGFloat,
        positions: [String: CGPoint]
    ) {
        guard let run else { return }
        let token = climbIntroToken
        let maxOffset = max(0, contentHeight - viewportHeight)
        let playerY = positions[run.currentNodeID]?.y
            ?? contentHeight * 0.90
        let endOffset = climbOffsetCentering(
            pointY: playerY,
            viewportHeight: viewportHeight,
            maxOffset: maxOffset,
            anchorY: MarbleVoyageDesignRules.climbIntroPlayerScrollAnchorY
        )

        // Returning from a fight/event: snap to player — do not re-run the overview.
        if climbIntroPlayedSeed == run.seed {
            setClimbCamera(endOffset, animated: false, duration: 0)
            isClimbIntroPlaying = false
            return
        }
        climbIntroPlayedSeed = run.seed

        // Top of map frames the boss/summit; porthole starts at content offset 0.
        let bossID = run.nodes.first(where: { $0.kind == .boss })?.id
        _ = bossID
        isClimbIntroPlaying = true
        setClimbCamera(0, animated: false, duration: 0)

        let settle: TimeInterval = reduceMotion
            ? 0.12
            : MarbleVoyageDesignRules.climbIntroSettleSeconds
        let pan: TimeInterval = reduceMotion
            ? 0.3
            : MarbleVoyageDesignRules.climbIntroPanSeconds

        DispatchQueue.main.asyncAfter(deadline: .now() + settle) {
            guard token == climbIntroToken else { return }
            setClimbCamera(endOffset, animated: true, duration: pan)
            DispatchQueue.main.asyncAfter(deadline: .now() + pan) {
                guard token == climbIntroToken else { return }
                setClimbCamera(endOffset, animated: false, duration: 0)
                isClimbIntroPlaying = false
            }
        }
    }

    private func marchChart(
        contentHeight: CGFloat,
        viewportHeight: CGFloat,
        positions: [String: CGPoint],
        animated: Bool
    ) {
        guard let focus = run?.currentNodeID,
              let point = positions[focus] else { return }
        let maxOffset = max(0, contentHeight - viewportHeight)
        let target = climbOffsetCentering(
            pointY: point.y,
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

    /// column = altitude (0 bottom dock → N boss / last peg at top); row = left/right branch.
    private func nodePositions(in size: CGSize) -> [String: CGPoint] {
        guard let run else { return [:] }
        let maxCol = max(run.nodes.map(\.column).max() ?? 1, 1)
        let maxRow = max(run.nodes.map(\.row).max() ?? 1, 1)
        var out: [String: CGPoint] = [:]
        for node in run.nodes {
            // Match the island poster: grassy dock near the bottom, glowing summit at top.
            let y = size.height * (0.90 - 0.80 * CGFloat(node.column) / CGFloat(maxCol))
            let x = size.width * (0.22 + 0.56 * CGFloat(node.row) / CGFloat(max(maxRow, 1)))
            out[node.id] = CGPoint(x: x, y: y)
        }
        return out
    }

    @ViewBuilder
    private func nodeChip(
        _ node: MarbleVoyageNode,
        positions: [String: CGPoint],
        hidePlayerWhileMarching: Bool
    ) -> some View {
        if let run {
            let isHere = node.id == run.currentNodeID && !hidePlayerWhileMarching
            let isDock = node.kind == .start
            let showPlayer = isHere
            let isReachable = run.reachableChoices().contains(where: { $0.id == node.id })
            let seen = run.visited.contains(node.id)
            let rose = MarbleVoyageArt.chartTileRose
            let tint = Color(red: rose.r, green: rose.g, blue: rose.b)
            let tile = MarbleVoyageArt.chartTileSize
            let corner = MarbleVoyageArt.chartTileCorner
            let chip = VStack(spacing: 6) {
                ZStack {
                    RoundedRectangle(cornerRadius: corner, style: .continuous)
                        .fill(tint.opacity(showPlayer ? 0.98 : (isReachable ? 0.96 : seen ? 0.82 : 0.34)))
                        .frame(width: tile, height: tile)
                        .overlay(
                            RoundedRectangle(cornerRadius: corner, style: .continuous)
                                .stroke(
                                    showPlayer
                                        ? Color(red: 0.45, green: 0.95, blue: 0.7)
                                        : (seen && !isReachable
                                           ? Color(red: 1.0, green: 0.82, blue: 0.22)
                                           : .white.opacity(isReachable ? 0.95 : 0.4)),
                                    lineWidth: showPlayer ? 4 : (seen && !isReachable ? 4 : (isReachable ? 3.5 : 2))
                                )
                        )
                        .shadow(
                            color: showPlayer
                                ? Color(red: 0.3, green: 0.95, blue: 0.55).opacity(0.55)
                                : (isReachable
                                   ? tint.opacity(0.7)
                                   : (seen ? Color(red: 1.0, green: 0.82, blue: 0.22).opacity(0.5) : .clear)),
                            radius: showPlayer || seen || isReachable ? 10 : 0
                        )

                    if showPlayer {
                        PeglinAbbieBattlePortrait(state: .happy, size: tile * 0.72)
                            .shadow(
                                color: Color(red: 0.3, green: 0.95, blue: 0.55).opacity(0.55),
                                radius: 8
                            )
                            .scaleEffect(dockPulse && !reduceMotion ? 1.04 : 1.0)
                    } else if let fighter = chartFighterKind(for: node, run: run) {
                        chartFighterPortrait(
                            kind: fighter,
                            tile: tile,
                            ominous: node.gangRole == .bigBoss || node.kind == .boss
                        )
                        if seen && !isReachable {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 28, weight: .black))
                                .foregroundStyle(Color(red: 1.0, green: 0.85, blue: 0.25))
                                .background(
                                    Circle()
                                        .fill(Color.black.opacity(0.55))
                                        .frame(width: 26, height: 26)
                                )
                                .offset(x: tile * 0.38, y: -tile * 0.38)
                        }
                    } else {
                        Image(systemName: MarbleVoyageArt.eventAccentIcon(node.kind))
                            .font(.system(size: MarbleVoyageArt.chartTileIconSize, weight: .black))
                            .symbolRenderingMode(.hierarchical)
                            .foregroundStyle(.white)
                            .shadow(color: .black.opacity(0.45), radius: 2, y: 1)
                        if seen && !isReachable {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 28, weight: .black))
                                .foregroundStyle(Color(red: 1.0, green: 0.85, blue: 0.25))
                                .background(
                                    Circle()
                                        .fill(Color.black.opacity(0.55))
                                        .frame(width: 26, height: 26)
                                )
                                .offset(x: tile * 0.38, y: -tile * 0.38)
                        }
                    }
                }
                .frame(width: tile, height: tile)
                Text(showPlayer ? (isDock ? "You · Dock" : "You") : node.title)
                    .font(.system(size: 13, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                    .shadow(color: .black.opacity(0.85), radius: 2, y: 1)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.black.opacity(0.45), in: Capsule())
                    .lineLimit(2)
                    .multilineTextAlignment(.center)
                    .frame(width: MarbleVoyageArt.chartTileLabelWidth)
            }
            .scaleEffect(reachableTileScale(isReachable: isReachable, isBoss: node.kind == .boss))
            .animation(
                isReachable && node.kind != .boss && !reduceMotion
                    ? .easeInOut(duration: 0.9).repeatForever(autoreverses: true)
                    : (showPlayer && !reduceMotion
                       ? .easeInOut(duration: 0.7).repeatForever(autoreverses: true)
                       : .default),
                value: dockPulse
            )
            .accessibilityLabel(showPlayer ? "Abbie at \(node.title)" : "\(node.kind.displayName): \(node.title)")
            .accessibilityIdentifier(
                isReachable
                    ? "world2.marbleVoyage.choice.\(node.id)"
                    : "world2.marbleVoyage.node.\(node.id)"
            )

            if isReachable {
                Button {
                    beginClimb(to: node, positions: positions)
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

    /// Fight / mini / big-boss chart portrait. Big boss gets ominous glow (no size pulse).
    @ViewBuilder
    private func chartFighterPortrait(kind: PlinkAttackerKind, tile: CGFloat, ominous: Bool) -> some View {
        let glow = ominous && !reduceMotion && dockPulse
        ZStack {
            if let img = kind.catalogImage(for: .idle) {
                Image(uiImage: img)
                    .resizable()
                    .scaledToFit()
                    .frame(width: tile * 0.88, height: tile * 0.88)
            } else {
                Image(systemName: kind.isNamedCrew ? "crown.fill" : "skull.fill")
                    .font(.system(size: MarbleVoyageArt.chartTileIconSize, weight: .black))
                    .foregroundStyle(.white)
            }
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

    /// 1s climb along the dotted path, then open the landing scene.
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
        marchPosition = from

        let travel: TimeInterval = reduceMotion ? 0.15 : 1.0
        withAnimation(.easeInOut(duration: travel)) {
            marchPosition = to
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + travel) {
            commitLanding(node)
        }
    }

    private func commitLanding(_ node: MarbleVoyageNode) {
        MarbleVoyageAudio.sceneTransition()
        withAnimation(.easeInOut(duration: 0.28)) {
            sceneCurtain = true
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.22) {
            withAnimation(.easeInOut(duration: 0.4)) {
                run?.choose(node.id)
                if case .event = run?.phase {
                    prepareEvent(for: node)
                }
                marchPosition = nil
                isMarching = false
            }
            withAnimation(.easeOut(duration: 0.35)) {
                sceneCurtain = false
            }
        }
    }

    private func nodePositionsForCurrentChart() -> [String: CGPoint] {
        let size = chartContentSize.width > 1
            ? chartContentSize
            : CGSize(width: 700, height: 1600)
        return nodePositions(in: size)
    }

    // MARK: - Fight

    private func fightPhase(_ node: MarbleVoyageNode) -> some View {
        let active = run
        let focusCrew: PlinkAttackerKind? = {
            guard let gang = active?.gang else { return nil }
            switch node.gangRole {
            case .bigBoss:
                return gang.bigBoss
            case .miniBoss, .henchman:
                guard node.miniArcIndex >= 0 else { return nil }
                return gang.miniBoss(arcIndex: node.miniArcIndex)
            case .none:
                return nil
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
            overrideEnemyMaxHP: active.map { $0.enemyMaxHP(for: node) },
            overridePlayerMaxHP: active?.playerMaxHP,
            overrideEnemyAttack: active.map { $0.enemyAttack(for: node) },
            voyageEconomy: active.map { voyageTunables(for: $0) },
            onExit: {
                MarbleVoyageAudio.defeat()
                run?.phase = .defeat
                run?.lastEventLine = "Left the fight — voyage abandoned."
            },
            onVictory: nil,
            onBattleEnded: { won, remaining, goldEarned in
                DispatchQueue.main.asyncAfter(deadline: .now() + (won ? 1.35 : 1.0)) {
                    withAnimation(.spring(response: 0.4, dampingFraction: 0.84)) {
                        let enemy = node.enemyKind
                        let wasBoss = node.kind == .boss
                        run?.finishFight(won: won, remainingHP: remaining, goldEarned: goldEarned)
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
            }
        )
    }

    /// Gold prevalence / ball power / charm effects the board needs for this fight.
    private func voyageTunables(for run: MarbleVoyageRun) -> PlinkVoyageTunables {
        PlinkVoyageTunables(
            goldPegPrevalence: run.economy.goldPegPrevalence,
            goldPegValue: run.effectiveGoldPegValue,
            ballDamageMultiplier: run.fightDamageMultiplier,
            cycleExtra: MarbleVoyageCharm.extraSpecialPegs(cycleStacks: run.charmStack(.cycle)),
            sockSnatch: MarbleVoyageCharm.bombClearCoins(sockSnatchStacks: run.charmStack(.sockSnatch)),
            prismBonus: MarbleVoyageCharm.prismCageBonus(stacks: run.charmStack(.prismBurst)),
            softPurr: MarbleVoyageCharm.biteDamageReduction(softPurrStacks: run.charmStack(.softPurr))
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
            Image(systemName: node.kind.systemIcon)
                .font(.system(size: 64, weight: .black))
                .foregroundStyle(.white)
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


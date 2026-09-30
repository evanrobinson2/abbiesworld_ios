import SwiftUI
import AVFoundation
import Combine

struct World2RootView: View {
    @StateObject private var viewModel = World2ViewModel()
    @ObservedObject private var debugOverlay = World2DebugOverlaySettings.shared
    @EnvironmentObject private var auth: AuthenticationService
    @State private var showingMusicPlayer =
        ProcessInfo.processInfo.arguments.contains("-openWorld2Music")
    @State private var showingSettings =
        ProcessInfo.processInfo.arguments.contains("-openWorld2Settings")
    @State private var anywhereDecorating = false
    @State private var anywhereSelectedFurnitureID: String?
    @State private var anywhereSelectedCatalogID: String?
    @State private var anywhereFilter: DecorateFilterID = .mine
    @State private var showingAnywhereInvent = false
    @State private var showingMinimap = false
    @ObservedObject private var inventCook = World2SceneDecorationInventService.shared
    @ObservedObject private var worldSync = World2WorldSync.shared
    @Environment(\.scenePhase) private var scenePhase
    /// Local latch so Accept disappears even if sync republishes the same notice.
    @State private var worldNoticesAccepted = false

    var body: some View {
        ZStack(alignment: .topTrailing) {
            if !auth.isAuthenticated {
                AuthLoginView(auth: auth)
            } else {
            switch viewModel.currentScreen {
            case .loading:
                BootstrapLoadingView(
                    progress: viewModel.bootstrapProgress,
                    isBootstrapReady: viewModel.isIntroBootstrapReady,
                    onContinue: viewModel.continueFromIntro
                )

            case .playerSelect:
                HouseholdProfileSelectView(auth: auth) { playerId in
                    viewModel.selectPlayer(playerId)
                }
                .allowsHitTesting(
                    worldNoticesAccepted
                        || (worldSync.whatsNew == nil && worldSync.pendingOffer == nil)
                )

            case .homeWorld:
                WorldMapView(viewModel: viewModel)

            case .blankSlate:
                World2MutableSceneView(viewModel: viewModel)

            case .treehouse(let poiId):
                World2PlayerHomeView(
                    poiId: poiId,
                    viewModel: viewModel,
                    onExit: viewModel.exitPOI,
                    onOpenSettings: {
                        showingSettings = true
                    },
                    onOpenMusic: {
                        World2MusicService.shared.stop()
                        showingMusicPlayer = true
                        World2Diagnostics.log("music_player_opened")
                    }
                )

            case .daddyWelcome:
                World2DaddyWelcomeView(
                    viewModel: viewModel,
                    onExit: viewModel.exitPOI
                )

            case .cardFactory:
                World2CardFactoryView(
                    viewModel: viewModel,
                    onExit: viewModel.exitPOI
                )

            case .selfReplicatingFactory(let instanceID):
                World2SelfReplicatingFactoryView(
                    instanceID: instanceID,
                    viewModel: viewModel,
                    onExit: viewModel.exitPOI
                )

            case .furnitureStore:
                World2FurnitureStoreView(
                    viewModel: viewModel,
                    onExit: viewModel.exitPOI,
                    onDecorateHome: { viewModel.openCurrentPlayerTreehouse() }
                )

            case .assetWorkbench:
                World2AssetWorkbenchView(
                    playerID: viewModel.currentPlayerId ?? .abbie,
                    service: World2AssetWorkbenchPreviewService(),
                    onExit: viewModel.exitPOI,
                    onAward: viewModel.awardWorkbenchPack
                )

            case .creatureLab:
                CreatureBuilderView(
                    startsInLab: true,
                    onClose: viewModel.exitPOI
                )

            case .threeBearsHouse:
                World2ThreeBearsHouseView(
                    onExit: viewModel.exitPOI,
                    onComplete: viewModel.completeJustRightPorridge
                )

            case .characterStudio:
                World2CharacterStudioView(onExit: viewModel.exitPOI)

            case .figurineExplorer:
                World2FigurineExplorerView(onExit: viewModel.exitPOI)

            case .sceneBuilder:
                World2SceneBuilderView(
                    onExit: viewModel.exitPOI,
                    onAwardDeed: viewModel.completeSceneBuilderDeed
                )

            case .worldTeleporter:
                World2WorldTeleporterView(
                    destinations: viewModel.teleporterDestinations,
                    currentSceneID: viewModel.playSceneID,
                    onTravel: viewModel.travelViaTeleporter,
                    onClose: viewModel.exitPOI
                )

            case .whizbang:
                IncredimachineView(
                    onDismiss: viewModel.exitPOI,
                    onComplete: {
                        viewModel.completeMinigame(
                            configurationID: "whizbang",
                            score: 1,
                            rewardGems: 8
                        )
                    }
                )

            case .plink:
                PlinkBattleHostView(
                    title: PeglinEnemyKind.fromPeglin(
                        sceneID: viewModel.playSceneID,
                        placeID: nil
                    )?.displayName ?? "Battle Clearing",
                    enemyKind: PeglinEnemyKind.fromPeglin(
                        sceneID: viewModel.playSceneID,
                        placeID: nil
                    ),
                    sceneBackgroundAsset: {
                        let id = viewModel.playSceneID
                        if let land = PeglinEdition.Land.allCases.first(where: { $0.sceneID == id }) {
                            return land.mapAsset
                        }
                        return viewModel.currentScene.backgroundAsset
                    }(),
                    playerID: viewModel.currentPlayerId?.rawValue,
                    onExit: viewModel.exitPOI,
                    onVictory: {
                        if PeglinEnemyKind.fromPeglin(
                            sceneID: viewModel.playSceneID,
                            placeID: nil
                        ) == .foxSpirit {
                            viewModel.completeFoxSpiritVictory()
                        } else {
                            viewModel.completeMinigame(
                                configurationID: "plink",
                                score: 1,
                                rewardGems: 6
                            )
                        }
                    }
                )

            case .pegMonastery:
                PegMonasteryView(
                    playerID: viewModel.currentPlayerId?.rawValue,
                    playerDisplayName: viewModel.currentPlayerId?.displayName ?? "Abbie",
                    onExit: viewModel.exitPOI,
                    onAwarded: { _ in }
                )

            case .marbleVoyage:
                MarbleVoyageHostView(
                    playerID: viewModel.currentPlayerId?.rawValue,
                    onExit: viewModel.exitPOI
                )

            case .planningDept:
                World2PlanningDeptView(
                    viewModel: viewModel,
                    onExit: viewModel.exitPOI
                )

            case .rooms(let poiId):
                World2RoomsView(
                    placeID: poiId,
                    viewModel: viewModel,
                    onExit: viewModel.exitPOI
                )

            case .sceneCreator(let instanceID):
                World2SceneCreatorView(
                    instanceID: instanceID,
                    onTakeKit: {
                        _ = viewModel.takeSceneKit(fromCreatorInstanceID: instanceID)
                    },
                    onExit: viewModel.exitPOI
                )

            case .beacon(let instanceID):
                World2BeaconView(
                    message: viewModel.beaconMessage(for: instanceID),
                    onExit: viewModel.exitPOI
                )

            case .fallingTargets(let configurationID):
                FallingTargetGameHost(
                    configurationID: configurationID,
                    playerID: viewModel.currentPlayerId?.rawValue ?? "player.unknown",
                    onRoundCompleted: { score, gems in
                        viewModel.completeMinigame(
                            configurationID: configurationID,
                            score: score,
                            rewardGems: gems
                        )
                    },
                    onExit: viewModel.exitPOI
                )
            }
            } // authenticated shell

            if let celebration = viewModel.rewardCelebration {
                World2RewardCelebrationView(
                    celebration: celebration,
                    playerName: viewModel.currentPlayerId?.displayName ?? "you",
                    onShowMe: viewModel.openTreehouseForReward,
                    onDismiss: viewModel.dismissRewardCelebration
                )
                .transition(.opacity)
                .zIndex(30_000)
            }

            if let toast = viewModel.toastMessage {
                VStack {
                    Spacer()
                    Text(toast)
                        .font(.system(size: 16, weight: .semibold, design: .rounded))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 24)
                        .padding(.vertical, 12)
                        .background(.black.opacity(0.8), in: Capsule())
                        .accessibilityIdentifier("world2.toast")
                        .padding(.bottom, viewModel.inventReadyPrompt == nil ? 40 : 120)
                }
                .frame(maxWidth: .infinity)
                .allowsHitTesting(false)
                .zIndex(20_000)
            }

            if viewModel.inventReadyPrompt == nil, let cook = inventCook.cook {
                VStack {
                    TimelineView(.periodic(from: cook.startedAt, by: 0.5)) { context in
                        World2InventCookToast(cook: cook, now: context.date)
                    }
                    .padding(.top, 14)
                    Spacer()
                }
                .frame(maxWidth: .infinity)
                .allowsHitTesting(false)
                .zIndex(20_050)
                .accessibilityIdentifier("world2.inventCook.host")
            }

            if let prompt = viewModel.inventReadyPrompt {
                VStack {
                    Spacer()
                    HStack(spacing: 12) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(prompt.toastLine)
                                .font(.system(size: 15, weight: .black, design: .rounded))
                                .foregroundStyle(.white)
                            Text("Made for \(prompt.sceneName)")
                                .font(.system(size: 12, weight: .semibold, design: .rounded))
                                .foregroundStyle(.white.opacity(0.75))
                        }
                        Spacer(minLength: 8)
                        Button(prompt.decorateButtonTitle) {
                            viewModel.openDecorateFromInvent()
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(.green)
                        .accessibilityIdentifier("world2.inventReady.decorate")
                        Button {
                            viewModel.dismissInventReadyPrompt()
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .font(.title2)
                                .foregroundStyle(.white.opacity(0.7))
                        }
                        .accessibilityLabel("Dismiss")
                        .accessibilityIdentifier("world2.inventReady.dismiss")
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 14)
                    .background(.black.opacity(0.88), in: RoundedRectangle(cornerRadius: 20, style: .continuous))
                    .padding(.horizontal, 20)
                    .padding(.bottom, 36)
                }
                .frame(maxWidth: .infinity)
                .transition(.move(edge: .bottom).combined(with: .opacity))
                .zIndex(20_100)
                .accessibilityIdentifier("world2.inventReady.banner")
            }
        }
        .background(Color.black.ignoresSafeArea())
        .ignoresSafeArea()
        .statusBarHidden(true)
        .sheet(isPresented: $showingMusicPlayer) {
            MusicPlayerView {
                showingMusicPlayer = false
                World2Diagnostics.log("music_player_closed")
            }
            .accessibilityIdentifier("world2.music.player")
        }
        .sheet(isPresented: $showingSettings) {
            World2SettingsView(
                onDismiss: { showingSettings = false },
                onSwitchProfile: { viewModel.returnToProfileSelect() }
            )
            .environmentObject(auth)
        }
        .overlay {
            if showsPersistentAnywhereDecorate {
                let surface = viewModel.decorateSurface(for: viewModel.currentScreen)
                World2AnywhereDecorateOverlay(
                    title: surface.name,
                    surfaceKey: surface.key,
                    isArranging: anywhereDecorating,
                    selectedFurnitureID: $anywhereSelectedFurnitureID,
                    selectedCatalogItemID: $anywhereSelectedCatalogID,
                    filter: $anywhereFilter,
                    onDone: {
                        anywhereDecorating = false
                        anywhereSelectedFurnitureID = nil
                        anywhereSelectedCatalogID = nil
                    }
                )
                .zIndex(35)
            }
        }
        .overlay(alignment: .topLeading) {
            if showsSandboxToolRail {
                World2SandboxToolRail(
                    isBuilding: viewModel.isSandboxBuilding,
                    onEdit: { viewModel.toggleSandboxBuild() },
                    onInvent: { viewModel.requestSandboxInvent() },
                    onDecorate: { viewModel.beginDecoratingCurrentSurface() },
                    onCompletions: { viewModel.openInventHistory() },
                    onOpenMinimap: { showingMinimap = true }
                )
                .padding(.leading, 14)
                .zIndex(40)
            }
        }
        .overlay(alignment: .topTrailing) {
            if showsPlayerMenu {
                World2PlayerMenuDrawer(
                    viewModel: viewModel,
                    onOpenSettings: { showingSettings = true },
                    onOpenMusic: {
                        World2MusicService.shared.stop()
                        showingMusicPlayer = true
                        World2Diagnostics.log("music_player_opened")
                    },
                    onSwitchProfile: { viewModel.returnToProfileSelect() },
                    onOpenMinimap: { showingMinimap = true }
                )
                .padding(.top, 10)
                .padding(.trailing, 10)
                .zIndex(40)
            }
        }
        // Above chrome overlays so Accept is never under the menu / sticks / rail.
        .overlay {
            let showNotices = !worldNoticesAccepted
                && !worldSync.noticesSuppressed
                && viewModel.currentScreen != .loading
            if showNotices, let offer = worldSync.pendingOffer {
                World2WorldUpdateAcceptCard(
                    summary: offer.summary,
                    onAccept: {
                        worldNoticesAccepted = true
                        viewModel.acceptPendingWorldUpdate()
                    }
                )
            } else if showNotices, let news = worldSync.whatsNew {
                World2WorldUpdateAcceptCard(
                    summary: news,
                    onAccept: {
                        worldNoticesAccepted = true
                        viewModel.dismissWorldWhatsNew()
                    }
                )
            }
        }
        .onChange(of: worldSync.whatsNew?.toRevision) { _, newValue in
            // A genuinely newer notice may show again; same revision stays dismissed.
            if let newValue, newValue > (UserDefaults.standard.integer(forKey: "world2.world.lastAnnouncedRevision")) {
                worldNoticesAccepted = false
            }
        }
        .onChange(of: worldSync.pendingOffer?.document.revision) { _, newValue in
            if let newValue, newValue > worldSync.revision {
                worldNoticesAccepted = false
            }
        }
        .fullScreenCover(isPresented: $showingMinimap) {
            World2MinimapScreen(
                snapshot: viewModel.worldGraphSnapshot,
                onSelectScene: { sceneID in
                    viewModel.travelToDocumentScene(sceneID)
                },
                onClose: { showingMinimap = false }
            )
        }
        .sheet(isPresented: $viewModel.showingInventHistory) {
            World2InventHistoryView(
                onDecorate: { result in
                    viewModel.showingInventHistory = false
                    viewModel.reopenInventResult(result)
                },
                onClose: { viewModel.showingInventHistory = false }
            )
        }
        .onChange(of: viewModel.anywhereDecorateTick) { _, _ in
            anywhereFilter = .mine
            if let highlight = viewModel.consumeInventoryHighlight() {
                anywhereSelectedFurnitureID = highlight
            }
            anywhereDecorating = true
            viewModel.dismissInventReadyPrompt()
        }
        .onChange(of: viewModel.sandboxInventTick) { _, _ in
            switch viewModel.currentScreen {
            case .homeWorld, .blankSlate, .treehouse, .daddyWelcome, .rooms:
                break
            default:
                showingAnywhereInvent = true
            }
        }
        .sheet(isPresented: $showingAnywhereInvent) {
            let scene = viewModel.inventSceneForCurrentScreen()
            World2SceneInventDecorationsView(
                scene: scene,
                plateImage: AssetBootstrapService.shared.image(for: scene.backgroundAsset),
                onCarved: { result in
                    viewModel.notifySceneInventReady(result)
                },
                onOpenDecorate: {
                    showingAnywhereInvent = false
                    viewModel.beginDecoratingCurrentSurface()
                },
                onTravel: { result in
                    showingAnywhereInvent = false
                    viewModel.reopenInventResult(result)
                },
                onClose: { showingAnywhereInvent = false }
            )
        }
        .task(id: auth.isAuthenticated) {
            guard auth.isAuthenticated else {
                World2WorldSync.shared.stopRevisionWatch()
                return
            }
            await viewModel.startGame()
            World2WorldSync.shared.startRevisionWatch()
        }
        .onChange(of: scenePhase) { _, phase in
            guard auth.isAuthenticated, phase == .active else { return }
            Task { await World2WorldSync.shared.checkForNewerWorld() }
        }
        .onAppear {
            // World 2 delegates all music to the established app player.
            World2MusicService.shared.stop()
            refreshDebugOverlay()
        }
        .onOpenURL { url in
            guard let ticket = World2DebugTicketCodec.decode(url) else { return }
            viewModel.applyDebugTicket(ticket)
        }
        .onChange(of: debugReport) { _, _ in
            refreshDebugOverlay()
        }
        .onChange(of: debugOverlay.isEnabled) { _, _ in
            refreshDebugOverlay()
        }
        .onChange(of: viewModel.debugPresentationRequest) { _, request in
            guard let request else { return }
            showingSettings = request.code == "settings"
            showingMusicPlayer = request.code == "music"
        }
    }

    private var debugReport: World2DebugReport {
        viewModel.debugReport(presentations: debugPresentations)
    }

    private var debugPresentations: [String] {
        var items: [String] = []
        if showingSettings { items.append("settings") }
        if showingMusicPlayer { items.append("music") }
        if showingAnywhereInvent { items.append("invent") }
        if anywhereDecorating { items.append("decorate") }
        if viewModel.showingPOISheet { items.append("poi") }
        return items
    }

    private func refreshDebugOverlay() {
        if debugOverlay.isEnabled {
            World2DebugBeacon.shared.publish(debugReport)
        } else {
            World2DebugBeacon.shared.clear()
        }
    }

    private var showsPlayerMenu: Bool {
        switch viewModel.currentScreen {
        case .loading, .playerSelect, .plink, .marbleVoyage:
            return false
        default:
            return viewModel.currentPlayerId != nil
        }
    }

    private var showsSandboxToolRail: Bool {
        guard showsPlayerMenu else { return false }
        switch viewModel.currentScreen {
        case .plink, .pegMonastery, .marbleVoyage, .loading, .playerSelect:
            return false
        case .fallingTargets:
            return false
        default:
            return true
        }
    }

    /// Map / treehouse / Daddy already own a decorate layer. Other interiors
    /// keep stamps on this overlay after Done so they do not vanish with the tray.
    private var showsPersistentAnywhereDecorate: Bool {
        switch viewModel.currentScreen {
        case .loading, .playerSelect, .homeWorld, .blankSlate, .treehouse, .daddyWelcome:
            return false
        default:
            return viewModel.currentPlayerId != nil
        }
    }

    // Bootstrap loading overlay (intro) — kept below.
}

struct BootstrapLoadingView: View {
    let progress: Double
    let isBootstrapReady: Bool
    let onContinue: () -> Void
    @State private var introStartedAt = ProcessInfo.processInfo.systemUptime
    @State private var introVisuallyComplete = false
    @StateObject private var introAudio = World2IntroAudioController()

    private let statusMessages = [
        "Waking up the treehouses…",
        "Polishing the magic cards…",
        "Sorting the vowels…",
        "Tuning the music…",
        "Opening Abbie's World…"
    ]

    var body: some View {
        ZStack {
            if let introVideoURL {
                World2IntroVideo(url: introVideoURL, isPlaying: !introVisuallyComplete)
                    .ignoresSafeArea()
                    .accessibilityHidden(true)
            } else {
                World2SemanticImage(
                    semanticName: "title.background",
                    fallbackIcon: "globe.americas.fill",
                    fallbackLabel: "World 2 title artwork is awaiting qualification"
                )
                .scaledToFill()
                .ignoresSafeArea()
            }

            Color.black.opacity(0.28)
                .ignoresSafeArea()
                .allowsHitTesting(false)

            VStack(spacing: 28) {
                AnimatedWorld2Title()
                    .accessibilityLabel("Abbie's World")
                    .accessibilityIdentifier("world2.loading.animatedTitle")

                if canContinue {
                    Button(action: onContinue) {
                        Label("ENTER ABBIE'S WORLD", systemImage: "sparkles")
                            .font(.system(size: 18, weight: .black, design: .rounded))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 24)
                            .padding(.vertical, 14)
                            .background(.indigo.gradient, in: Capsule())
                            .overlay(Capsule().stroke(.white.opacity(0.8), lineWidth: 2))
                            .shadow(color: .cyan.opacity(0.55), radius: 14, y: 5)
                    }
                    .buttonStyle(.plain)
                    .transition(.scale.combined(with: .opacity))
                    .accessibilityHint("The intro is complete")
                    .accessibilityIdentifier("world2.loading.continue")
                } else {
                    TimelineView(.animation(minimumInterval: 1.0 / 30.0)) { _ in
                        let elapsed = ProcessInfo.processInfo.systemUptime - introStartedAt
                        let displayedProgress = min(max(elapsed / 10.0, 0), 0.70)
                        let messageIndex = min(
                            Int((displayedProgress / 0.70) * Double(statusMessages.count)),
                            statusMessages.count - 1
                        )

                        VStack(spacing: 12) {
                            HStack(spacing: 12) {
                                ProgressView(value: displayedProgress)
                                    .tint(.cyan)
                                    .frame(width: 250)

                                Text("\(Int(displayedProgress * 100))%")
                                    .font(.system(size: 14, weight: .black, design: .rounded))
                                    .foregroundStyle(.white)
                                    .monospacedDigit()
                                    .frame(width: 44, alignment: .trailing)
                            }
                            .accessibilityElement(children: .combine)
                            .accessibilityLabel("Loading")
                            .accessibilityValue("\(Int(displayedProgress * 100)) percent")

                            Text(statusMessages[messageIndex])
                                .font(.system(size: 16, weight: .medium, design: .rounded))
                                .foregroundStyle(.white.opacity(0.75))
                                .contentTransition(.opacity)
                                .accessibilityIdentifier("world2.loading.status")
                        }
                    }
                }
            }
            .animation(.spring(response: 0.42, dampingFraction: 0.72), value: canContinue)
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.loading")
        .onAppear {
            introStartedAt = ProcessInfo.processInfo.systemUptime
            introVisuallyComplete = false
            introAudio.play()
            Task {
                try? await Task.sleep(for: .seconds(7))
                introVisuallyComplete = true
                tryAutoEnter()
            }
            tryAutoEnter()
        }
        .onChange(of: isBootstrapReady) { _, _ in
            tryAutoEnter()
        }
        .onChange(of: introAudio.didFinish) { _, _ in
            tryAutoEnter()
        }
        .onDisappear {
            introAudio.stop()
        }
    }

    private func tryAutoEnter() {
        guard shouldAutoEnter, canContinue else { return }
        onContinue()
    }

    private var canContinue: Bool {
        isBootstrapReady && (introVisuallyComplete || shouldAutoEnter)
    }

    private var shouldAutoEnter: Bool {
        ProcessInfo.processInfo.arguments.contains("-world2SkipIntro")
    }

    private var introVideoURL: URL? {
        Bundle.main.url(
            forResource: "world2_intro",
            withExtension: "mp4",
            subdirectory: "Resources/World2"
        )
        ?? Bundle.main.url(forResource: "world2_intro", withExtension: "mp4")
    }

}

private struct World2IntroVideo: UIViewRepresentable {
    let url: URL
    var isPlaying: Bool = true

    func makeUIView(context: Context) -> World2IntroVideoPlayerView {
        let view = World2IntroVideoPlayerView()
        view.play(url: url)
        return view
    }

    func updateUIView(_ uiView: World2IntroVideoPlayerView, context: Context) {
        if isPlaying {
            uiView.resume()
        } else {
            uiView.pause()
        }
    }

    static func dismantleUIView(
        _ uiView: World2IntroVideoPlayerView,
        coordinator: ()
    ) {
        uiView.stop()
    }
}

private final class World2IntroVideoPlayerView: UIView {
    private var queuePlayer: AVQueuePlayer?
    private var playerLooper: AVPlayerLooper?

    override class var layerClass: AnyClass {
        AVPlayerLayer.self
    }

    private var playerLayer: AVPlayerLayer {
        layer as! AVPlayerLayer
    }

    func play(url: URL) {
        let player = AVQueuePlayer()
        player.isMuted = true
        playerLayer.player = player
        playerLayer.videoGravity = .resizeAspectFill
        playerLooper = AVPlayerLooper(
            player: player,
            templateItem: AVPlayerItem(url: url)
        )
        queuePlayer = player
        player.play()
    }

    func pause() {
        queuePlayer?.pause()
    }

    func resume() {
        guard queuePlayer?.rate == 0 else { return }
        queuePlayer?.play()
    }

    func stop() {
        queuePlayer?.pause()
        playerLooper?.disableLooping()
        playerLayer.player = nil
        playerLooper = nil
        queuePlayer = nil
    }
}

private final class World2IntroAudioController:
    NSObject,
    ObservableObject,
    AVAudioPlayerDelegate
{
    @Published private(set) var didFinish = false
    private var audioPlayer: AVAudioPlayer?

    func play() {
        didFinish = false
        if ProcessInfo.processInfo.arguments.contains("-world2SkipIntro") {
            didFinish = true
            return
        }
        guard let url =
            Bundle.main.url(
                forResource: "magical_discovery",
                withExtension: "m4a",
                subdirectory: "Resources/Music/World2"
            )
            ?? Bundle.main.url(
                forResource: "magical_discovery",
                withExtension: "m4a"
            ) else {
            print("❌ BootstrapLoadingView: Missing magical_discovery.m4a")
            didFinish = true
            return
        }

        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
            try AVAudioSession.sharedInstance().setActive(true)
            let player = try AVAudioPlayer(contentsOf: url)
            player.delegate = self
            player.numberOfLoops = 0
            player.volume = 0.72
            player.prepareToPlay()
            player.play()
            audioPlayer = player
            print("🎵 BootstrapLoadingView: Playing magical_discovery.m4a")
        } catch {
            print("❌ BootstrapLoadingView: Could not play splash music: \(error)")
            didFinish = true
        }
    }

    func stop() {
        audioPlayer?.stop()
        audioPlayer = nil
    }

    func audioPlayerDidFinishPlaying(
        _ player: AVAudioPlayer,
        successfully flag: Bool
    ) {
        audioPlayer = nil
        didFinish = true
    }
}

private struct AnimatedWorld2Title: View {
    var body: some View {
        TimelineView(.animation(minimumInterval: 1 / 30)) { timeline in
            let time = timeline.date.timeIntervalSinceReferenceDate
            VStack(spacing: 10) {
                AnimatedWorld2MainTitle(time: time)
                AnimatedMarbleVoyageSubtitle(time: time)
            }
            .padding(.vertical, 18)
            .padding(.horizontal, 28)
            .background(.black.opacity(0.28), in: RoundedRectangle(cornerRadius: 28, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 28, style: .continuous)
                    .stroke(.white.opacity(0.3), lineWidth: 2)
            )
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Abbie's World Marble Voyage")
    }
}

private struct AnimatedWorld2MainTitle: View {
    let time: TimeInterval
    private let letters = Array("ABBIE'S WORLD")

    var body: some View {
        HStack(spacing: 1) {
            ForEach(letters.indices, id: \.self) { index in
                AnimatedWorld2TitleLetter(
                    character: letters[index],
                    index: index,
                    time: time,
                    fontSize: 48,
                    bobAmplitude: 8,
                    bobSpeed: 4.2,
                    rotateAmplitude: 3
                )
            }
        }
    }
}

private struct AnimatedMarbleVoyageSubtitle: View {
    let time: TimeInterval
    private let letters = Array("MARBLE VOYAGE")

    private static let voyageGlow = LinearGradient(
        colors: [
            Color(red: 0.45, green: 0.85, blue: 1.0),
            Color(red: 0.75, green: 0.55, blue: 1.0),
            Color(red: 1.0, green: 0.55, blue: 0.75),
        ],
        startPoint: .leading,
        endPoint: .trailing
    )

    var body: some View {
        HStack(spacing: 0) {
            ForEach(letters.indices, id: \.self) { index in
                let character = letters[index]
                Text(String(character))
                    .font(.system(size: 26, weight: .black, design: .rounded))
                    .foregroundStyle(Self.voyageGlow)
                    .shadow(color: Color(red: 0.15, green: 0.25, blue: 0.55).opacity(0.85), radius: 0, x: 0, y: 2)
                    .shadow(color: Color(red: 0.75, green: 0.9, blue: 1.0).opacity(0.45), radius: 1, x: 0, y: -1)
                    .offset(y: character == " " ? 0 : CGFloat(sin(time * 3.6 + Double(index) * 0.4) * 3.5))
            }
        }
        .accessibilityLabel("Marble Voyage")
        .accessibilityIdentifier("world2.loading.marbleVoyage")
    }
}

private struct AnimatedWorld2TitleLetter: View {
    let character: Character
    let index: Int
    let time: TimeInterval
    let fontSize: CGFloat
    let bobAmplitude: Double
    let bobSpeed: Double
    let rotateAmplitude: Double

    var body: some View {
        let isSpace = character == " "
        Text(String(character))
            .font(.system(size: fontSize, weight: .black, design: .rounded))
            .foregroundStyle(index < 7 ? Color.pink.gradient : Color.cyan.gradient)
            .offset(y: isSpace ? 0 : CGFloat(sin(time * bobSpeed + Double(index) * 0.48) * bobAmplitude))
            .rotationEffect(.degrees(isSpace ? 0 : sin(time * 2.8 + Double(index) * 0.35) * rotateAmplitude))
            .shadow(color: .white.opacity(0.7), radius: 2)
    }
}

struct PlayerSelectView: View {
    let onSelect: (PlayerId) -> Void
    @ObservedObject private var playerService = PlayerStateService.shared

    var body: some View {
        GeometryReader { screen in
            ZStack {
                World2SemanticImage(
                    semanticName: "title.background",
                    fallbackIcon: "globe.americas.fill",
                    fallbackLabel: "Abbie's World"
                )
                .scaledToFill()
                .frame(width: screen.size.width, height: screen.size.height)
                .clipped()
                .overlay(
                    LinearGradient(
                        colors: [
                            Color.indigo.opacity(0.35),
                            Color.black.opacity(0.45),
                            Color.pink.opacity(0.25)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )

                VStack(spacing: 22) {
                    AnimatedWorld2Title()
                        .accessibilityHidden(true)

                    Text("Who's Playing?")
                        .font(.system(size: 36, weight: .black, design: .rounded))
                        .foregroundStyle(.white)
                        .shadow(color: .pink.opacity(0.5), radius: 8, y: 2)

                    Text("Choose your badge to open a treehouse.")
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                        .foregroundStyle(.white.opacity(0.85))

                    HStack(spacing: 36) {
                        PlayerSelectButton(playerId: .abbie, onSelect: onSelect)
                        PlayerSelectButton(playerId: .ani, onSelect: onSelect)
                        PlayerSelectButton(playerId: .evan, onSelect: onSelect)
                    }
                    .frame(maxWidth: .infinity)

                    if let error = playerService.error {
                        Label(error, systemImage: "exclamationmark.triangle.fill")
                            .font(.system(size: 14, weight: .bold, design: .rounded))
                            .foregroundStyle(.white)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 10)
                            .background(.red.opacity(0.82), in: RoundedRectangle(cornerRadius: 14))
                            .accessibilityIdentifier("world2.playerSelect.error")
                    }
                }
                .padding(.horizontal, 42)
                .padding(.vertical, 28)
                .frame(maxWidth: min(screen.size.width - 48, 760))
                .background(
                    RoundedRectangle(cornerRadius: 36, style: .continuous)
                        .fill(.ultraThinMaterial)
                        .overlay(
                            RoundedRectangle(cornerRadius: 36, style: .continuous)
                                .stroke(.white.opacity(0.42), lineWidth: 2.5)
                        )
                )
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
            }
            .frame(width: screen.size.width, height: screen.size.height)
            .clipped()
        }
        .ignoresSafeArea()
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.playerSelect")
    }
}

private struct PlayerSelectButton: View {
    let playerId: PlayerId
    let onSelect: (PlayerId) -> Void
    @State private var pulse = false

    var body: some View {
        Button {
            onSelect(playerId)
        } label: {
            VStack(spacing: 14) {
                ZStack {
                    Circle()
                        .fill(style.gradient)
                        .frame(width: 128, height: 128)
                        .overlay(Circle().stroke(.white.opacity(0.85), lineWidth: 3))
                        .shadow(color: style.glow.opacity(0.55), radius: pulse ? 16 : 8, y: 5)
                        .scaleEffect(pulse ? 1.03 : 1.0)

                    if let uiImage = UIImage(named: playerId.menuAvatarCatalogName) {
                        Image(uiImage: uiImage)
                            .resizable()
                            .scaledToFill()
                            .frame(width: 100, height: 100)
                            .clipShape(Circle())
                    } else {
                        Image(systemName: style.symbol)
                            .font(.system(size: 48, weight: .bold))
                            .foregroundStyle(.white)
                    }
                }

                Text(playerId.displayName)
                    .font(.system(size: 24, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Play as \(playerId.displayName)")
        .accessibilityIdentifier("world2.player.\(playerId == .abbie ? "abbie" : playerId == .ani ? "ani" : "evan")")
        .onAppear {
            withAnimation(.easeInOut(duration: 1.6).repeatForever(autoreverses: true)) {
                pulse = true
            }
        }
    }

    private var style: (gradient: RadialGradient, glow: Color, symbol: String) {
        switch playerId {
        case .abbie:
            return (
                RadialGradient(
                    colors: [Color.pink.opacity(0.95), Color(red: 0.72, green: 0.18, blue: 0.48)],
                    center: .topLeading,
                    startRadius: 6,
                    endRadius: 90
                ),
                .pink,
                "sparkles"
            )
        case .ani:
            return (
                RadialGradient(
                    colors: [Color.purple.opacity(0.95), Color(red: 0.32, green: 0.16, blue: 0.62)],
                    center: .topLeading,
                    startRadius: 6,
                    endRadius: 90
                ),
                .purple,
                "moon.stars.fill"
            )
        case .evan:
            return (
                RadialGradient(
                    colors: [Color.teal.opacity(0.95), Color(red: 0.08, green: 0.35, blue: 0.48)],
                    center: .topLeading,
                    startRadius: 6,
                    endRadius: 90
                ),
                .teal,
                "shield.lefthalf.filled"
            )
        }
    }
}

private extension World2Screen {
    var showsGlobalHUD: Bool {
        switch self {
        case .loading, .playerSelect, .treehouse, .cardFactory,
             .selfReplicatingFactory, .furnitureStore, .assetWorkbench,
             .creatureLab, .fallingTargets, .threeBearsHouse,
             .characterStudio, .figurineExplorer, .sceneBuilder, .worldTeleporter,
             .whizbang, .planningDept, .plink, .pegMonastery, .marbleVoyage, .rooms,
             .sceneCreator, .beacon, .daddyWelcome:
            return false
        case .homeWorld, .blankSlate:
            return true
        }
    }
}

#Preview {
    World2RootView()
        .environmentObject(AuthenticationService.shared)
}

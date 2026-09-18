import SwiftUI
import AVFoundation
import Combine

struct World2RootView: View {
    @StateObject private var viewModel = World2ViewModel()
    @Environment(\.scenePhase) private var scenePhase
    @State private var showingMusicPlayer =
        ProcessInfo.processInfo.arguments.contains("-openWorld2Music")
    @State private var showingSettings =
        ProcessInfo.processInfo.arguments.contains("-openWorld2Settings")
    @State private var showingClassicGames =
        ProcessInfo.processInfo.arguments.contains("-openWorld2ClassicGames")
    @State private var showingWaypointGame = false
    @State private var showingGoonPopper = false
    @State private var showingPictureCarver = false
    @State private var showingDinoPicnic = false
    @State private var showingDecoratorMachine = false
    @State private var openCreatureLabFromClassic = false

    var body: some View {
        ZStack(alignment: .topTrailing) {
            switch viewModel.currentScreen {
            case .loading:
                BootstrapLoadingView(
                    progress: viewModel.bootstrapProgress,
                    isBootstrapReady: viewModel.isIntroBootstrapReady,
                    onContinue: viewModel.continueFromIntro
                )

            case .playerSelect:
                PlayerSelectView(onSelect: viewModel.selectPlayer)

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

            case .sceneWorks(let instanceID):
                World2SceneWorksView(
                    instanceID: instanceID,
                    viewModel: viewModel,
                    onExit: viewModel.exitPOI
                )

            case .furnitureStore:
                World2FurnitureStoreView(
                    viewModel: viewModel,
                    onExit: viewModel.exitPOI,
                    onDecorateHome: viewModel.openCurrentPlayerTreehouse
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

            if viewModel.currentScreen.showsGlobalHUD {
                globalHUDButtons
            }

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
                        .padding(.bottom, 40)
                }
                .frame(maxWidth: .infinity)
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
            World2SettingsView {
                showingSettings = false
            }
        }
        .sheet(isPresented: $showingClassicGames) {
            GamesDialogView(
                showWaypointGame: $showingWaypointGame,
                showGoonPopper: $showingGoonPopper,
                showPictureCarver: $showingPictureCarver,
                showDinoPicnic: $showingDinoPicnic,
                showCreatureBuilder: $openCreatureLabFromClassic,
                showDecoratorMachine: $showingDecoratorMachine,
                onDismiss: { showingClassicGames = false }
            )
            .accessibilityElement(children: .contain)
            .accessibilityIdentifier("world2.classicGames")
        }
        .fullScreenCover(isPresented: $showingWaypointGame) {
            WaypointNavigationView(
                onDismiss: { showingWaypointGame = false },
                onComplete: { showingWaypointGame = false }
            )
        }
        .fullScreenCover(isPresented: $showingGoonPopper) {
            GoonPopperView(
                onDismiss: { showingGoonPopper = false },
                onComplete: {}
            )
        }
        .fullScreenCover(isPresented: $showingPictureCarver) {
            PictureCarverView(onDismiss: { showingPictureCarver = false })
        }
        .fullScreenCover(isPresented: $showingDinoPicnic) {
            DinoPicnicView()
        }
        .fullScreenCover(isPresented: $showingDecoratorMachine) {
            DecoratorMachineView()
        }
        .onChange(of: showingWaypointGame) { _, isActive in
            MusicService.shared.setGameActive(isActive)
        }
        .onChange(of: showingGoonPopper) { _, isActive in
            MusicService.shared.setGameActive(isActive)
        }
        .onChange(of: showingPictureCarver) { _, isActive in
            MusicService.shared.setGameActive(isActive)
        }
        .onChange(of: showingDinoPicnic) { _, isActive in
            MusicService.shared.setGameActive(isActive)
        }
        .onChange(of: showingDecoratorMachine) { _, isActive in
            MusicService.shared.setGameActive(isActive)
        }
        .onChange(of: openCreatureLabFromClassic) { _, shouldOpen in
            guard shouldOpen else { return }
            openCreatureLabFromClassic = false
            viewModel.openCreatureLab()
        }
        .overlay(alignment: .leading) {
            if showsQuestDrawer {
                World2QuestDrawer(viewModel: viewModel)
                    .zIndex(40)
            }
        }
        .task {
            await viewModel.startGame()
        }
        .onAppear {
            // World 2 delegates all music to the established app player.
            World2MusicService.shared.stop()
        }
        .onChange(of: scenePhase) {
            if scenePhase != .active {
                World2DeveloperSession.shared.isEnabled = false
            }
        }
    }

    private var showsQuestDrawer: Bool {
        switch viewModel.currentScreen {
        case .loading, .playerSelect:
            return false
        default:
            return viewModel.currentPlayerId != nil
        }
    }

    private var globalHUDButtons: some View {
        HStack(spacing: 8) {
            Button {
                showingClassicGames = true
            } label: {
                globalHUDIcon {
                    Image(systemName: "gamecontroller.fill")
                }
            }
            .accessibilityLabel("Open classic games")
            .accessibilityIdentifier("world2.hud.classicGames")

            Button {
                showingSettings = true
            } label: {
                globalHUDIcon {
                    Image(systemName: "gearshape.fill")
                }
            }
            .accessibilityLabel("Open settings")
            .accessibilityIdentifier("world2.hud.settings")

            Button {
                World2MusicService.shared.stop()
                showingMusicPlayer = true
                World2Diagnostics.log("music_player_opened")
            } label: {
                globalHUDIcon {
                    Image(systemName: "music.note")
                }
            }
            .accessibilityLabel("Open music player")
            .accessibilityIdentifier("world2.hud.music")
        }
        .padding(.top, 16)
        .padding(.trailing, 18)
        .zIndex(100)
    }

    private func globalHUDIcon<Icon: View>(
        @ViewBuilder icon: () -> Icon
    ) -> some View {
        icon()
            .font(.system(size: 20, weight: .bold))
            .foregroundStyle(.white)
            .frame(width: 48, height: 48)
            .background(.ultraThinMaterial, in: Circle())
            .overlay(Circle().stroke(.white.opacity(0.42), lineWidth: 1.5))
            .shadow(color: .black.opacity(0.28), radius: 8, y: 4)
    }
}

struct BootstrapLoadingView: View {
    let progress: Double
    let isBootstrapReady: Bool
    let onContinue: () -> Void
    @State private var introStartedAt = ProcessInfo.processInfo.systemUptime
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
                World2IntroVideo(url: introVideoURL)
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
                        let timedProgress = min(
                            max(
                                (ProcessInfo.processInfo.systemUptime - introStartedAt)
                                    / 10.0,
                                0
                            ),
                            1
                        )
                        let displayedProgress = min(
                            timedProgress,
                            max(progress, 0)
                        )
                        let messageIndex = min(
                            Int(displayedProgress * Double(statusMessages.count)),
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
            introAudio.play()
        }
        .onDisappear {
            introAudio.stop()
        }
    }

    private var canContinue: Bool {
        isBootstrapReady && introAudio.didFinish
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

    func makeUIView(context: Context) -> World2IntroVideoPlayerView {
        let view = World2IntroVideoPlayerView()
        view.play(url: url)
        return view
    }

    func updateUIView(_ uiView: World2IntroVideoPlayerView, context: Context) {}

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
    private let letters = Array("ABBIE'S WORLD")

    var body: some View {
        TimelineView(.animation(minimumInterval: 1 / 30)) { timeline in
            let time = timeline.date.timeIntervalSinceReferenceDate
            HStack(spacing: 1) {
                ForEach(letters.indices, id: \.self) { index in
                    let character = letters[index]
                    Text(String(character))
                        .font(.system(size: 48, weight: .black, design: .rounded))
                        .foregroundStyle(
                            index < 7
                                ? Color.pink.gradient
                                : Color.cyan.gradient
                        )
                        .offset(
                            y: character == " "
                                ? 0
                                : CGFloat(sin(time * 4.2 + Double(index) * 0.48) * 8)
                        )
                        .rotationEffect(
                            .degrees(
                                character == " "
                                    ? 0
                                    : sin(time * 2.8 + Double(index) * 0.35) * 3
                            )
                        )
                        .shadow(color: .white.opacity(0.7), radius: 2)
                }
            }
            .padding(.vertical, 18)
            .padding(.horizontal, 28)
            .background(.black.opacity(0.28), in: Capsule())
            .overlay(Capsule().stroke(.white.opacity(0.3), lineWidth: 2))
        }
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
                .overlay(Color.indigo.opacity(0.30))

                VStack(spacing: 20) {
                    AnimatedWorld2Title()
                        .accessibilityHidden(true)

                    Text("Who's Playing?")
                        .font(.system(size: 32, weight: .black, design: .rounded))
                        .foregroundStyle(.white)

                    Text("Choose your own treehouse adventure.")
                        .font(.system(size: 15, weight: .bold, design: .rounded))
                        .foregroundStyle(.white.opacity(0.82))

                    HStack(spacing: 46) {
                        PlayerSelectButton(playerId: .abbie, color: .pink, onSelect: onSelect)
                        PlayerSelectButton(playerId: .ani, color: .purple, onSelect: onSelect)
                    }

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
                .padding(.vertical, 24)
                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 30))
                .overlay(
                    RoundedRectangle(cornerRadius: 30)
                        .stroke(.white.opacity(0.42), lineWidth: 2)
                )
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
    let color: Color
    let onSelect: (PlayerId) -> Void

    var body: some View {
        Button {
            onSelect(playerId)
        } label: {
            VStack(spacing: 14) {
                Image(systemName: playerId == .abbie ? "sparkles" : "moon.stars.fill")
                    .font(.system(size: 54, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 128, height: 128)
                    .background(color.gradient, in: Circle())
                    .shadow(color: color.opacity(0.5), radius: 10, y: 5)

                Text(playerId.displayName)
                    .font(.system(size: 25, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Play as \(playerId.displayName)")
        .accessibilityIdentifier("world2.player.\(playerId == .abbie ? "abbie" : "ani")")
    }
}

private extension World2Screen {
    var showsGlobalHUD: Bool {
        switch self {
        case .loading, .playerSelect, .treehouse, .cardFactory,
             .selfReplicatingFactory, .sceneWorks, .furnitureStore, .assetWorkbench,
             .creatureLab, .fallingTargets, .threeBearsHouse:
            return false
        case .homeWorld, .blankSlate:
            return true
        }
    }
}

#Preview {
    World2RootView()
}

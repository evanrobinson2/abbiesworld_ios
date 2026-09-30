import AudioToolbox
import Combine
import SwiftUI

private struct FallingTargetItem: Identifiable, Equatable {
    let id: Int
    let symbol: String
    let isTarget: Bool
    let size: CGFloat
    let speed: CGFloat
    let driftAmplitude: CGFloat
    let driftPhase: Double
    var x: CGFloat
    var y: CGFloat
}

private enum FallingTargetPhase: Equatable {
    case ready
    case running
    case celebrating
    case finished
}

@MainActor
private final class FallingTargetGameSession: ObservableObject {
    @Published var difficulty: Double {
        didSet {
            let clamped = min(max(difficulty, 0), 1)
            if clamped != difficulty {
                difficulty = clamped
            }
            UserDefaults.standard.set(clamped, forKey: difficultyKey)
        }
    }
    @Published private(set) var phase: FallingTargetPhase = .ready
    @Published private(set) var items: [FallingTargetItem] = []
    @Published private(set) var score = 0
    @Published private(set) var rescuedCount = 0
    @Published private(set) var combo = 0
    @Published private(set) var secondsRemaining: Int
    @Published private(set) var bestScore: Int
    @Published private(set) var gamesPlayed: Int
    @Published private(set) var lastRescuedSymbol: String?
    @Published private(set) var collectionPulse = 0
    @Published private(set) var wrongPulse = 0

    let config: FallingTargetGameConfig

    private let playerID: String
    private let onRoundCompleted: (Int, Int) -> Void
    private var roundStartedAt: TimeInterval?
    private var lastUpdate: TimeInterval?
    private var celebrationEndsAt: TimeInterval?
    private var spawnAccumulator: TimeInterval = 0
    private var completionDelivered = false
    private var nextItemID = 0

    private var difficultyKey: String { "world2.\(playerID).\(config.id).difficulty" }
    private var bestScoreKey: String { "world2.\(playerID).\(config.id).bestScore" }
    private var gamesPlayedKey: String { "world2.\(playerID).\(config.id).gamesPlayed" }

    init(
        config: FallingTargetGameConfig,
        playerID: String,
        onRoundCompleted: @escaping (Int, Int) -> Void
    ) {
        self.config = config
        self.playerID = playerID
        self.onRoundCompleted = onRoundCompleted
        let defaults = UserDefaults.standard
        let scopedPrefix = "world2.\(playerID).\(config.id)"
        if defaults.object(forKey: "\(scopedPrefix).difficulty") != nil {
            difficulty = defaults.double(forKey: "\(scopedPrefix).difficulty")
        } else {
            difficulty = config.difficulty.defaultValue
        }
        bestScore = defaults.integer(forKey: "\(scopedPrefix).bestScore")
        gamesPlayed = defaults.integer(forKey: "\(scopedPrefix).gamesPlayed")
        secondsRemaining = Int(config.durationSeconds)
    }

    func startRound(uptime: TimeInterval = ProcessInfo.processInfo.systemUptime) {
        phase = .running
        items = []
        score = 0
        rescuedCount = 0
        combo = 0
        secondsRemaining = Int(config.durationSeconds)
        lastRescuedSymbol = nil
        spawnAccumulator = 2
        roundStartedAt = uptime
        lastUpdate = uptime
        celebrationEndsAt = nil
        completionDelivered = false
        nextItemID = 0
        World2Diagnostics.log(
            "falling_targets_started",
            ["game": config.id, "difficulty": String(format: "%.2f", difficulty)]
        )
    }

    func update(uptime: TimeInterval, playfieldHeight: CGFloat) {
        switch phase {
        case .ready, .finished:
            return
        case .celebrating:
            if let celebrationEndsAt, uptime >= celebrationEndsAt {
                finishRound()
            }
            return
        case .running:
            break
        }

        guard let started = roundStartedAt else { return }
        let elapsed = uptime - started
        secondsRemaining = max(0, Int(ceil(config.durationSeconds - elapsed)))
        if elapsed >= config.durationSeconds {
            beginCelebration(uptime: uptime)
            return
        }

        let delta = min(uptime - (lastUpdate ?? uptime), 0.15)
        lastUpdate = uptime
        spawnAccumulator += delta

        for index in items.indices {
            items[index].y += items[index].speed * CGFloat(delta)
            items[index].x += CGFloat(
                sin(uptime * 2.1 + items[index].driftPhase)
            ) * items[index].driftAmplitude * CGFloat(delta)
            items[index].x = min(max(items[index].x, 0.07), 0.93)
        }
        items.removeAll { $0.y > playfieldHeight + 70 }

        let spawnInterval = interpolate(easy: 0.92, hard: 0.2)
        let maximumVisible = Int(
            round(
                interpolate(
                    easy: Double(config.spawn.easyMaximumVisible),
                    hard: Double(config.spawn.hardMaximumVisible)
                )
            )
        )
        while spawnAccumulator >= spawnInterval && items.count < maximumVisible {
            spawnAccumulator -= spawnInterval
            spawnItem()
        }
    }

    func tap(itemID: Int) -> Bool {
        guard phase == .running,
              let index = items.firstIndex(where: { $0.id == itemID }) else {
            return false
        }
        let item = items[index]
        if item.isTarget {
            items.remove(at: index)
            score += config.scoring.targetHit
            rescuedCount += 1
            combo += 1
            lastRescuedSymbol = item.symbol.uppercased()
            collectionPulse += 1
            World2Diagnostics.log(
                config.environment.targetHitHook,
                ["symbol": item.symbol.uppercased(), "score": "\(score)"]
            )
            return true
        }

        combo = 0
        if difficulty >= config.scoring.penaltyStartsAtDifficulty {
            score = max(0, score - config.scoring.hardWrongHitPenalty)
        }
        wrongPulse += 1
        World2Diagnostics.log(
            "falling_targets_distractor_tapped",
            ["game": config.id, "symbol": item.symbol, "score": "\(score)"]
        )
        return false
    }

    private func spawnItem() {
        let targetFrequency = interpolate(
            easy: config.spawn.easyTargetFrequency,
            hard: config.spawn.hardTargetFrequency
        )
        let isTarget = Double.random(in: 0 ... 1) < targetFrequency
        let source = isTarget ? config.targets.set : config.distractors.set
        guard var symbol = source.randomElement() else { return }

        if difficulty >= config.spawn.lowercaseStartsAtDifficulty {
            let range = max(0.001, 1 - config.spawn.lowercaseStartsAtDifficulty)
            let normalized = (difficulty - config.spawn.lowercaseStartsAtDifficulty) / range
            let lowercaseChance = normalized * config.spawn.hardLowercaseProbability
            if Double.random(in: 0 ... 1) < lowercaseChance {
                symbol = symbol.lowercased()
            }
        }

        let baseSize = interpolate(
            easy: config.spawn.easyLetterSize,
            hard: config.spawn.hardLetterSize
        )
        let variance = config.spawn.hardSizeVariance * difficulty
        let size = max(34, baseSize + Double.random(in: -variance ... variance))
        let speed = interpolate(
            easy: config.spawn.easyFallSpeed,
            hard: config.spawn.hardFallSpeed
        ) * Double.random(in: 0.9 ... 1.12)
        let drift = config.spawn.hardHorizontalDrift * difficulty
        let x = chooseSpawnX()
        items.append(
            FallingTargetItem(
                id: nextItemID,
                symbol: symbol,
                isTarget: isTarget,
                size: CGFloat(size),
                speed: CGFloat(speed),
                driftAmplitude: CGFloat(drift / 800),
                driftPhase: Double.random(in: 0 ... (.pi * 2)),
                x: x,
                y: 90
            )
        )
        nextItemID += 1
        World2Diagnostics.log(config.environment.sourceHook, ["symbol": symbol])
    }

    private func chooseSpawnX() -> CGFloat {
        let spacing = CGFloat(interpolate(easy: 0.18, hard: 0.06))
        for _ in 0 ..< 7 {
            let candidate = CGFloat.random(in: 0.1 ... 0.9)
            if items.allSatisfy({ abs($0.x - candidate) >= spacing || $0.y > 190 }) {
                return candidate
            }
        }
        return CGFloat.random(in: 0.1 ... 0.9)
    }

    private func beginCelebration(uptime: TimeInterval) {
        phase = .celebrating
        secondsRemaining = 0
        items.removeAll()
        celebrationEndsAt = uptime + 2.4
        collectionPulse += 1
        World2Diagnostics.log(
            config.environment.roundEndHook,
            ["rescued": "\(rescuedCount)", "score": "\(score)"]
        )
    }

    private func finishRound() {
        guard !completionDelivered else { return }
        completionDelivered = true
        phase = .finished
        gamesPlayed += 1
        bestScore = max(bestScore, score)
        UserDefaults.standard.set(gamesPlayed, forKey: gamesPlayedKey)
        UserDefaults.standard.set(bestScore, forKey: bestScoreKey)
        onRoundCompleted(score, config.reward.amount)
        World2Diagnostics.log(
            "falling_targets_completed",
            ["game": config.id, "rescued": "\(rescuedCount)", "score": "\(score)"]
        )
    }

    private func interpolate(easy: Double, hard: Double) -> Double {
        easy + (hard - easy) * difficulty
    }
}

struct FallingTargetGameHost: View {
    let configurationID: String
    let playerID: String
    let onRoundCompleted: (Int, Int) -> Void
    let onExit: () -> Void

    var body: some View {
        if let configuration = try? FallingTargetConfigurationLoader.load(
            id: configurationID
        ) {
            FallingTargetMinigameView(
                configuration: configuration,
                playerID: playerID,
                onRoundCompleted: onRoundCompleted,
                onExit: onExit
            )
        } else {
            ContentUnavailableView(
                "The Letter Works is resting",
                systemImage: "gearshape.2.fill",
                description: Text("Its game configuration could not be loaded.")
            )
            .overlay(alignment: .bottom) {
                Button("Back to Work Land", action: onExit)
                    .hidden()
                    .accessibilityHidden(true)
                    .padding(24)
            }
            .world2InteriorActions(
                exitAccessibilityID: "world2.fallingTargets.exit",
                onExit: onExit
            )
            .accessibilityIdentifier("world2.fallingTargets.configurationError")
        }
    }
}

private struct FallingTargetMinigameView: View {
    let configuration: FallingTargetGameConfig
    let onExit: () -> Void
    @StateObject private var session: FallingTargetGameSession
    @State private var wrongFlash = false
    private let ticker = Timer.publish(every: 0.05, on: .main, in: .common).autoconnect()

    init(
        configuration: FallingTargetGameConfig,
        playerID: String,
        onRoundCompleted: @escaping (Int, Int) -> Void,
        onExit: @escaping () -> Void
    ) {
        self.configuration = configuration
        self.onExit = onExit
        _session = StateObject(
            wrappedValue: FallingTargetGameSession(
                config: configuration,
                playerID: playerID,
                onRoundCompleted: onRoundCompleted
            )
        )
    }

    var body: some View {
        GeometryReader { geometry in
            ZStack {
                World2SemanticImage(
                    semanticName: configuration.environment.interiorAsset,
                    fallbackIcon: "building.2.crop.circle.fill",
                    fallbackLabel: "The Letter Works interior is awaiting qualification"
                )
                .scaledToFill()
                .frame(width: geometry.size.width, height: geometry.size.height)
                .clipped()
                .overlay(Color.indigo.opacity(0.18))
                .ignoresSafeArea()

                machineryOverlay

                if session.phase == .running {
                    ForEach(session.items) { item in
                        fallingLetter(item, in: geometry.size)
                    }
                    if (1 ... 5).contains(session.secondsRemaining) {
                        Text("\(session.secondsRemaining)")
                            .font(.system(size: 108, weight: .black, design: .rounded))
                            .foregroundStyle(.yellow)
                            .shadow(color: .purple, radius: 12)
                            .contentTransition(.numericText(countsDown: true))
                            .allowsHitTesting(false)
                            .accessibilityHidden(true)
                    }
                }

                Color.red
                    .opacity(wrongFlash ? 0.16 : 0)
                    .ignoresSafeArea()
                    .allowsHitTesting(false)

                switch session.phase {
                case .ready:
                    difficultyCard
                case .running:
                    EmptyView()
                case .celebrating:
                    celebrationView
                case .finished:
                    resultCard
                }

                gameHUD
            }
            .onReceive(ticker) { _ in
                session.update(
                    uptime: ProcessInfo.processInfo.systemUptime,
                    playfieldHeight: geometry.size.height
                )
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.fallingTargets.\(configuration.id)")
        .onAppear {
            if ProcessInfo.processInfo.arguments.contains("-autoPlaySaveVowels") {
                session.startRound()
            }
        }
        .world2InteriorActions(
            exitAccessibilityID: "world2.fallingTargets.exit",
            onExit: onExit
        )
    }

    private var machineryOverlay: some View {
        VStack {
            HStack(spacing: 34) {
                ForEach(0 ..< 3, id: \.self) { index in
                    VStack(spacing: -3) {
                        RoundedRectangle(cornerRadius: 24)
                            .fill(.cyan.opacity(0.26))
                            .overlay(
                                Text(["A E", "I O", "U"][index])
                                    .font(.system(size: 22, weight: .black, design: .rounded))
                                    .foregroundStyle(.white.opacity(0.9))
                            )
                            .frame(width: 120, height: 58)
                        FunnelShape()
                            .fill(.purple.opacity(0.75))
                            .frame(width: 74, height: 45)
                    }
                }
            }
            .padding(.top, 38)

            Spacer()

            HStack {
                Spacer()
                VStack(spacing: 4) {
                    Text(session.lastRescuedSymbol ?? "A E I O U")
                        .font(.system(size: 20, weight: .black, design: .rounded))
                        .foregroundStyle(.white)
                    Text("RESCUED")
                        .font(.system(size: 10, weight: .black, design: .rounded))
                        .foregroundStyle(.white.opacity(0.72))
                }
                .frame(width: 145, height: 78)
                .background(.cyan.opacity(0.62), in: RoundedRectangle(cornerRadius: 24))
                .overlay(RoundedRectangle(cornerRadius: 24).stroke(.white.opacity(0.8), lineWidth: 3))
                .scaleEffect(session.collectionPulse.isMultiple(of: 2) ? 1 : 1.09)
                .animation(.spring(response: 0.22, dampingFraction: 0.45), value: session.collectionPulse)
                .padding(.trailing, 32)
                .padding(.bottom, 28)
            }
        }
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }

    private func fallingLetter(_ item: FallingTargetItem, in size: CGSize) -> some View {
        Button {
            let correct = session.tap(itemID: item.id)
            if correct {
                UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                AudioServicesPlaySystemSound(1104)
            } else {
                UINotificationFeedbackGenerator().notificationOccurred(.warning)
                AudioServicesPlaySystemSound(1053)
                withAnimation(.easeOut(duration: 0.08)) {
                    wrongFlash = true
                }
                Task { @MainActor in
                    try? await Task.sleep(for: .milliseconds(180))
                    withAnimation(.easeOut(duration: 0.16)) {
                        wrongFlash = false
                    }
                }
            }
        } label: {
            Text(item.symbol)
                .font(.system(size: item.size, weight: .black, design: .rounded))
                .foregroundStyle(.white)
                .shadow(color: .indigo, radius: 2, x: 0, y: 3)
                .frame(minWidth: item.size * 1.15, minHeight: item.size * 1.15)
                .contentShape(Circle())
        }
        .buttonStyle(.plain)
        .position(x: item.x * size.width, y: item.y)
        .accessibilityLabel("Falling letter \(item.symbol)")
        .accessibilityIdentifier("world2.fallingTargets.letter.\(item.id)")
    }

    private var gameHUD: some View {
        VStack {
            HStack {
                Spacer()

                if session.phase == .running || session.phase == .celebrating {
                    Label("\(session.score)", systemImage: "character.book.closed.fill")
                        .padding(.horizontal, 14)
                        .padding(.vertical, 9)
                        .background(.black.opacity(0.66), in: Capsule())
                        .accessibilityIdentifier("world2.fallingTargets.score")
                    Text("\(session.secondsRemaining)")
                        .font(.system(size: session.secondsRemaining <= 5 ? 34 : 23, weight: .black, design: .rounded))
                        .foregroundStyle(session.secondsRemaining <= 5 ? .yellow : .white)
                        .frame(minWidth: 48)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(.black.opacity(0.66), in: Capsule())
                        .accessibilityLabel("\(session.secondsRemaining) seconds remaining")
                        .accessibilityIdentifier("world2.fallingTargets.timer")
                }
            }
            .font(.system(size: 20, weight: .black, design: .rounded))
            .foregroundStyle(.white)
            .padding(.horizontal, 24)
            .padding(.top, 18)

            Spacer()
        }
    }

    private var difficultyCard: some View {
        VStack(spacing: 20) {
            Text(configuration.title)
                .font(.system(size: 38, weight: .black, design: .rounded))
            Text(configuration.mission)
                .font(.system(size: 18, weight: .semibold, design: .rounded))
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
            Text(configuration.difficulty.prompt)
                .font(.system(size: 19, weight: .bold, design: .rounded))

            VStack(spacing: 5) {
                Slider(value: $session.difficulty, in: 0 ... 1)
                    .tint(.purple)
                    .accessibilityIdentifier("world2.fallingTargets.difficulty")
                HStack {
                    Text(configuration.difficulty.easyLabel)
                    Spacer()
                    Text(configuration.difficulty.hardLabel)
                }
                .font(.system(size: 13, weight: .bold, design: .rounded))
                .foregroundStyle(.secondary)
            }

            Button {
                session.startRound()
            } label: {
                Label("Start the Letter Storm", systemImage: "play.fill")
                    .font(.system(size: 19, weight: .black, design: .rounded))
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .accessibilityIdentifier("world2.fallingTargets.start")
        }
        .padding(28)
        .frame(width: 500)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 32))
        .shadow(radius: 22)
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.fallingTargets.ready")
    }

    private var celebrationView: some View {
        VStack(spacing: 16) {
            Text("FWOOOMP!")
                .font(.system(size: 58, weight: .black, design: .rounded))
                .foregroundStyle(.yellow)
                .shadow(color: .purple, radius: 8)
            Text("Sending \(session.rescuedCount) rescued vowels through the pipes…")
                .font(.system(size: 20, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
        }
        .transition(.scale.combined(with: .opacity))
        .accessibilityIdentifier("world2.fallingTargets.celebration")
    }

    private var resultCard: some View {
        VStack(spacing: 18) {
            Text("You saved \(session.rescuedCount) vowels!")
                .font(.system(size: 36, weight: .black, design: .rounded))
            Text("The Letter Works is humming again.")
                .font(.system(size: 18, weight: .semibold, design: .rounded))
                .foregroundStyle(.secondary)
            Label("+\(configuration.reward.amount) gems for helping", systemImage: "diamond.fill")
                .font(.system(size: 18, weight: .bold, design: .rounded))
                .foregroundStyle(.purple)
            Text("Best: \(session.bestScore)  •  Played: \(session.gamesPlayed)")
                .font(.system(size: 14, weight: .bold, design: .rounded))
                .foregroundStyle(.secondary)
            Button {
                session.startRound()
            } label: {
                Label("Play Again", systemImage: "arrow.clockwise")
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
        }
        .padding(28)
        .frame(width: 520)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 32))
        .shadow(radius: 22)
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.fallingTargets.result")
    }
}

private struct FunnelShape: Shape {
    func path(in rect: CGRect) -> Path {
        Path { path in
            path.move(to: CGPoint(x: rect.minX, y: rect.minY))
            path.addLine(to: CGPoint(x: rect.maxX, y: rect.minY))
            path.addLine(to: CGPoint(x: rect.midX + 12, y: rect.maxY * 0.72))
            path.addLine(to: CGPoint(x: rect.midX + 8, y: rect.maxY))
            path.addLine(to: CGPoint(x: rect.midX - 8, y: rect.maxY))
            path.addLine(to: CGPoint(x: rect.midX - 12, y: rect.maxY * 0.72))
            path.closeSubpath()
        }
    }
}

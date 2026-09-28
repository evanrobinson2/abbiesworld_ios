//
//  WorldBookUnlockHostView.swift
//  abbies.world.ios
//
//  Closed book prop → Voyage-style hazy glass stage → pick a destination →
//  fuse jigsaw on glass → unlock Marble Voyage. No open-book plate.
//

import SwiftUI
import UIKit

struct WorldBookUnlockHostView: View {
    let playerID: String?
    /// Permanent Marble Voyage unlock — drives the optional replay choice.
    let voyageAlreadyUnlocked: Bool
    let onPutDown: () -> Void
    let onAllSolved: () -> Void

    @State private var phase: Phase = .zooming
    @State private var progress: WorldBookPlayerProgress = .fresh()
    @State private var showDifficultyPicker = false
    @State private var bookScale: CGFloat = 0.72
    @State private var closedOpacity: CGFloat = 1
    @State private var stageOpacity: CGFloat = 0
    @State private var chromeOpacity: CGFloat = 0
    @State private var showVictory = false
    @State private var showReplayChoice = false
    @State private var coachingVisible = true
    @State private var playing = false

    private enum Phase: Equatable {
        case zooming
        case choosingDestination
        case board
    }

    private var playerKey: String { playerID ?? "player.abbie" }

    private var pageBinding: Binding<WorldBookPageProgress> {
        Binding(
            get: {
                progress.pages.first
                    ?? WorldBookPageProgress(pageIndex: 0, difficulty: progress.preferredDifficulty)
            },
            set: { newValue in
                if progress.pages.isEmpty {
                    progress.pages = [newValue]
                } else {
                    progress.pages[0] = newValue
                }
                persist()
            }
        )
    }

    var body: some View {
        ZStack {
            // Soft treehouse dusk — glass stage sits on top (Marble Voyage pattern).
            LinearGradient(
                colors: [
                    Color(red: 0.10, green: 0.14, blue: 0.18),
                    Color(red: 0.06, green: 0.08, blue: 0.12),
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            if stageOpacity > 0.01 {
                glassStage
                    .opacity(stageOpacity)
            }

            if phase == .zooming || closedOpacity > 0.01 {
                closedBookLayer
                    .opacity(closedOpacity)
            }

            if chromeOpacity > 0.01 {
                chromeLayer
                    .opacity(chromeOpacity)
            }

            if showReplayChoice {
                replayChoiceOverlay
            }

            topExitBar
        }
        .onAppear(perform: bootstrap)
        .accessibilityIdentifier("world2.worldBook.host")
    }

    // MARK: - Layers

    private var closedBookLayer: some View {
        Image(WorldBookCatalog.closedBook)
            .resizable()
            .scaledToFit()
            .frame(maxWidth: 300, maxHeight: 400)
            .scaleEffect(bookScale)
            .shadow(color: .black.opacity(0.45), radius: 24, y: 14)
            .accessibilityHidden(true)
            .onAppear { runOpenCeremony() }
    }

    /// Full-screen haze + glass playfield — same material language as Voyage status/title.
    private var glassStage: some View {
        GeometryReader { geo in
            ZStack {
                Color.black.opacity(0.42)
                    .ignoresSafeArea()
                    .allowsHitTesting(false)

                if phase == .board, playing {
                    let topChrome: CGFloat = 108
                    let bottomPad: CGFloat = 16
                    let sidePad: CGFloat = 20
                    let boardH = max(220, geo.size.height - topChrome - bottomPad)
                    let boardW = max(280, geo.size.width - sidePad * 2)
                    WorldBookJigsawBoardView(
                        catalogImageName: pageBinding.wrappedValue.activePlateCatalogName,
                        pageProgress: pageBinding,
                        onPiecePlaced: { coachingVisible = false },
                        onFuse: { MarbleVoyageAudio.tap() },
                        onSolved: handleSolved
                    )
                    .frame(width: boardW, height: boardH)
                    .position(
                        x: geo.size.width / 2,
                        y: topChrome + boardH / 2
                    )
                }
            }
            .frame(width: geo.size.width, height: geo.size.height)
        }
    }

    private var chromeLayer: some View {
        ZStack {
            VStack(spacing: 0) {
                LinearGradient(
                    colors: [
                        Color.black.opacity(0.55),
                        Color.black.opacity(0.22),
                        Color.black.opacity(0),
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .frame(height: 120)
                Spacer()
            }
            .ignoresSafeArea(edges: .top)
            .allowsHitTesting(false)

            VStack(spacing: 10) {
                HStack(spacing: 10) {
                    Color.clear.frame(width: 88, height: 1)
                    Spacer()
                    titleBlock
                    Spacer()
                    if phase == .board, playing {
                        MarbleVoyageSecondaryButton(
                            title: "Stance",
                            systemImage: "slider.horizontal.3",
                            accessibilityID: "world2.worldBook.difficulty"
                        ) { showDifficultyPicker = true }
                        MarbleVoyageSecondaryButton(
                            title: "Picture",
                            systemImage: "photo.on.rectangle",
                            accessibilityID: "world2.worldBook.changePicture"
                        ) { returnToDestinationPicker() }
                        MarbleVoyageSecondaryButton(
                            title: "New",
                            systemImage: "arrow.counterclockwise",
                            accessibilityID: "world2.worldBook.newGame"
                        ) { resetPuzzle() }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 52)

                if phase == .choosingDestination {
                    destinationPicker
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                }

                if phase == .board, playing, coachingVisible, !showVictory {
                    Text("Fit matching edges — they spark and join.")
                        .font(.system(size: 15, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(.ultraThinMaterial.opacity(0.92), in: Capsule())
                        .overlay(Capsule().stroke(MarbleVoyageChrome.glassStroke, lineWidth: 1))
                        .accessibilityIdentifier("world2.worldBook.coaching")
                }

                if phase != .choosingDestination {
                    Spacer()
                }
            }

            if showVictory {
                victoryOverlay
            }
        }
        .sheet(isPresented: $showDifficultyPicker) {
            difficultySheet
        }
    }

    private var titleBlock: some View {
        VStack(spacing: 2) {
            Text("ABBIE'S WORLD")
                .font(.system(size: 11, weight: .black, design: .rounded))
                .tracking(2.2)
                .foregroundStyle(.white.opacity(0.78))
            Text(phase == .choosingDestination
                 ? "Choose a destination"
                 : (playing ? "Marble Voyage Puzzle" : "Puzzle complete"))
                .font(.system(size: 18, weight: .black, design: .rounded))
                .foregroundStyle(.white)
        }
        .shadow(color: .black.opacity(0.45), radius: 6, y: 2)
    }

    private var topExitBar: some View {
        VStack {
            HStack {
                MarbleVoyageSecondaryButton(
                    title: "Exit",
                    systemImage: "xmark.circle.fill",
                    accessibilityID: "world2.worldBook.exit",
                    action: onPutDown
                )
                Spacer()
            }
            .padding(.horizontal, 16)
            .padding(.top, 12)
            Spacer()
        }
    }

    // MARK: - Destination picker

    /// Sized to the remaining viewport so the 2×2 grid never spills off-screen.
    private var destinationPicker: some View {
        GeometryReader { geo in
            let panelW = min(geo.size.width - 40, 820)
            let panelH = min(geo.size.height - 12, geo.size.height * 0.92)
            let innerPad: CGFloat = 16
            let headerH: CGFloat = 36
            let gap: CGFloat = 10
            let cardW = (panelW - innerPad * 2 - gap) / 2
            let cardH = (panelH - innerPad * 2 - headerH - gap) / 2
            let thumbH = max(72, cardH - 58)

            VStack(spacing: 10) {
                Text("Which island picture will open the voyage?")
                    .font(.system(size: 15, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white.opacity(0.92))
                    .multilineTextAlignment(.center)
                    .frame(height: headerH - 10)

                LazyVGrid(
                    columns: [
                        GridItem(.fixed(cardW), spacing: gap),
                        GridItem(.fixed(cardW), spacing: gap),
                    ],
                    spacing: gap
                ) {
                    ForEach(WorldBookCatalog.puzzleDestinations) { destination in
                        Button {
                            selectDestination(destination)
                        } label: {
                            destinationCard(destination, thumbHeight: thumbH)
                                .frame(width: cardW, height: cardH)
                        }
                        .buttonStyle(.plain)
                        .accessibilityIdentifier("world2.worldBook.destination.\(destination.id)")
                    }
                }
            }
            .padding(innerPad)
            .frame(width: panelW, height: panelH)
            .background(
                RoundedRectangle(cornerRadius: 28, style: .continuous)
                    .fill(.ultraThinMaterial.opacity(0.88))
                    .overlay(
                        RoundedRectangle(cornerRadius: 28, style: .continuous)
                            .stroke(.white.opacity(0.35), lineWidth: 1.5)
                    )
            )
            .shadow(color: .black.opacity(0.35), radius: 18, y: 8)
            .frame(width: geo.size.width, height: geo.size.height, alignment: .center)
        }
        .accessibilityIdentifier("world2.worldBook.destinationPicker")
    }

    private func destinationCard(
        _ destination: WorldBookPuzzleDestination,
        thumbHeight: CGFloat
    ) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Image(destination.catalogName)
                .resizable()
                .scaledToFit()
                .frame(maxWidth: .infinity)
                .frame(height: thumbHeight)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .stroke(.white.opacity(0.35), lineWidth: 1)
                )
            HStack(spacing: 6) {
                VStack(alignment: .leading, spacing: 1) {
                    Text(destination.title)
                        .font(.system(size: 15, weight: .black, design: .rounded))
                        .foregroundStyle(.white)
                        .lineLimit(1)
                    Text(destination.blurb)
                        .font(.system(size: 11, weight: .semibold, design: .rounded))
                        .foregroundStyle(.white.opacity(0.82))
                        .lineLimit(1)
                }
                Spacer(minLength: 2)
                Image(systemName: "chevron.right")
                    .font(.system(size: 13, weight: .black))
                    .foregroundStyle(.white.opacity(0.7))
            }
        }
        .padding(10)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(.ultraThinMaterial.opacity(0.55), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(.white.opacity(0.45), lineWidth: 1.5)
        )
    }

    // MARK: - Victory / replay

    private var victoryOverlay: some View {
        ZStack {
            Color.black.opacity(0.45).ignoresSafeArea()
            VStack(spacing: 16) {
                if let plate = UIImage(named: pageBinding.wrappedValue.activePlateCatalogName) {
                    Image(uiImage: plate)
                        .resizable()
                        .scaledToFit()
                        .frame(maxWidth: 420, maxHeight: 280)
                        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 18, style: .continuous)
                                .stroke(MarbleVoyageChrome.glassStroke, lineWidth: 1.5)
                        )
                }
                Text("ABBIE'S WORLD")
                    .font(.system(size: 12, weight: .black, design: .rounded))
                    .tracking(3)
                    .foregroundStyle(.white.opacity(0.8))
                Text("Marble Voyage unlocked")
                    .font(.system(size: 28, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                Text("The picture opens the climb.")
                    .font(.system(size: 15, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white.opacity(0.88))

                if voyageAlreadyUnlocked {
                    MarbleVoyageSecondaryButton(
                        title: "Keep the book",
                        systemImage: "book.closed.fill",
                        accessibilityID: "world2.worldBook.victory.keep"
                    ) {
                        showVictory = false
                        playing = false
                        showReplayChoice = true
                    }
                } else {
                    MarbleVoyagePrimaryButton(
                        title: "Begin voyage",
                        systemImage: "flag.checkered",
                        fill: MarbleVoyageChrome.primaryFill,
                        accessibilityID: "world2.worldBook.victory.begin"
                    ) {
                        MarbleVoyageAudio.victory()
                        onAllSolved()
                    }
                }
            }
            .padding(28)
            .background(
                RoundedRectangle(cornerRadius: 28, style: .continuous)
                    .fill(.ultraThinMaterial)
                    .overlay(
                        RoundedRectangle(cornerRadius: 28, style: .continuous)
                            .stroke(.white.opacity(0.35), lineWidth: 1.5)
                    )
            )
            .padding(24)
        }
        .accessibilityIdentifier("world2.worldBook.victory")
    }

    private var replayChoiceOverlay: some View {
        ZStack {
            Color.black.opacity(0.55).ignoresSafeArea()
            VStack(spacing: 18) {
                Text("The book remembers.")
                    .font(.system(size: 26, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                Text("Marble Voyage is already unlocked — play another picture, or put the book away.")
                    .font(.system(size: 16, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white.opacity(0.88))
                    .multilineTextAlignment(.center)
                HStack(spacing: 14) {
                    MarbleVoyageSecondaryButton(
                        title: "Put away",
                        systemImage: "xmark.circle.fill",
                        accessibilityID: "world2.worldBook.putAway",
                        action: onPutDown
                    )
                    MarbleVoyagePrimaryButton(
                        title: "Play again",
                        systemImage: "arrow.counterclockwise",
                        fill: MarbleVoyageChrome.primaryFill,
                        accessibilityID: "world2.worldBook.replay"
                    ) {
                        MarbleVoyageAudio.modeSelect()
                        showReplayChoice = false
                        coachingVisible = true
                        phase = .choosingDestination
                        playing = false
                        withAnimation(.easeInOut(duration: 0.35)) {
                            chromeOpacity = 1
                            stageOpacity = 1
                        }
                    }
                }
            }
            .padding(32)
            .background(
                RoundedRectangle(cornerRadius: 28, style: .continuous)
                    .fill(.ultraThinMaterial)
                    .overlay(
                        RoundedRectangle(cornerRadius: 28, style: .continuous)
                            .stroke(.white.opacity(0.35), lineWidth: 1.5)
                    )
            )
        }
        .accessibilityIdentifier("world2.worldBook.replayChoice")
    }

    private var difficultySheet: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 12) {
                    ForEach(WorldBookPuzzleDifficulty.allCases) { level in
                        Button {
                            MarbleVoyageAudio.tap()
                            applyDifficulty(level)
                            showDifficultyPicker = false
                        } label: {
                            HStack(spacing: 14) {
                                Image(systemName: level.systemIcon)
                                    .font(.system(size: 22, weight: .black))
                                    .frame(width: 36)
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(level.title)
                                        .font(.system(size: 18, weight: .black, design: .rounded))
                                    Text(level.blurb)
                                        .font(.system(size: 13, weight: .semibold, design: .rounded))
                                        .foregroundStyle(.white.opacity(0.82))
                                }
                                Spacer()
                                if progress.preferredDifficulty == level {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundStyle(MarbleVoyageChrome.successFill)
                                }
                                Image(systemName: "chevron.right")
                                    .font(.system(size: 14, weight: .black))
                                    .foregroundStyle(.white.opacity(0.65))
                            }
                            .foregroundStyle(.white)
                            .padding(16)
                            .background(
                                .ultraThinMaterial.opacity(0.75),
                                in: RoundedRectangle(cornerRadius: 18, style: .continuous)
                            )
                            .overlay(
                                RoundedRectangle(cornerRadius: 18, style: .continuous)
                                    .stroke(.white.opacity(0.4), lineWidth: 1.5)
                            )
                        }
                        .buttonStyle(.plain)
                        .accessibilityIdentifier("world2.worldBook.stance.\(level.rawValue)")
                    }
                }
                .padding(20)
            }
            .background(Color(red: 0.08, green: 0.10, blue: 0.14).ignoresSafeArea())
            .navigationTitle("Stance")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { showDifficultyPicker = false }
                }
            }
        }
        .presentationDetents([.medium, .large])
    }

    // MARK: - Lifecycle

    private func bootstrap() {
        progress = WorldBookPuzzleStore.load(playerId: playerKey)
    }

    private func runOpenCeremony() {
        guard phase == .zooming else { return }
        MarbleVoyageAudio.sceneTransition()
        withAnimation(.easeInOut(duration: 0.85)) {
            bookScale = 1.05
        }
        withAnimation(.easeInOut(duration: 0.55).delay(0.55)) {
            closedOpacity = 0
            stageOpacity = 1
        }
        withAnimation(.easeInOut(duration: 0.45).delay(0.95)) {
            chromeOpacity = 1
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.15) {
            closedOpacity = 0
            stageOpacity = 1
            chromeOpacity = 1
            if voyageAlreadyUnlocked {
                showReplayChoice = true
                playing = false
                phase = .choosingDestination
            } else if let selected = progress.pages.first?.selectedPlateCatalogName,
                      WorldBookCatalog.destination(catalogName: selected) != nil,
                      !(progress.pages.first?.isSolved ?? false) {
                // Resume mid-puzzle.
                phase = .board
                playing = true
            } else {
                phase = .choosingDestination
                playing = false
            }
        }
    }

    private func selectDestination(_ destination: WorldBookPuzzleDestination) {
        MarbleVoyageAudio.modeSelect()
        if progress.pages.isEmpty {
            progress.pages = [
                WorldBookPageProgress(
                    pageIndex: 0,
                    difficulty: progress.preferredDifficulty,
                    selectedPlateCatalogName: destination.catalogName
                )
            ]
        } else {
            progress.pages[0].selectedPlateCatalogName = destination.catalogName
            progress.pages[0].isSolved = false
            progress.pages[0].piecePositions = [:]
            progress.pages[0].placedPieceIDs = []
            progress.pages[0].difficulty = progress.preferredDifficulty
        }
        persist()
        coachingVisible = true
        showVictory = false
        withAnimation(.easeInOut(duration: 0.35)) {
            phase = .board
            playing = true
        }
    }

    private func returnToDestinationPicker() {
        MarbleVoyageAudio.tap()
        playing = false
        showVictory = false
        withAnimation(.easeInOut(duration: 0.3)) {
            phase = .choosingDestination
        }
    }

    private func applyDifficulty(_ level: WorldBookPuzzleDifficulty) {
        progress.preferredDifficulty = level
        resetPuzzle(difficulty: level)
    }

    private func handleSolved() {
        if progress.pages.isEmpty {
            progress.pages = [WorldBookPageProgress(pageIndex: 0, difficulty: progress.preferredDifficulty)]
        }
        progress.pages[0].isSolved = true
        persist()
        MarbleVoyageAudio.victory()
        withAnimation(.spring(response: 0.4, dampingFraction: 0.8)) {
            showVictory = true
        }
        // First unlock: wait for Begin voyage CTA. Replay: auto-offer put-away after a beat if they don't tap.
        if voyageAlreadyUnlocked {
            DispatchQueue.main.asyncAfter(deadline: .now() + 2.4) {
                guard showVictory else { return }
                showVictory = false
                playing = false
                showReplayChoice = true
            }
        }
    }

    private func resetPuzzle(difficulty: WorldBookPuzzleDifficulty? = nil) {
        let level = difficulty ?? progress.preferredDifficulty
        let keptPlate = progress.pages.first?.selectedPlateCatalogName
        WorldBookPuzzleStore.resetPage(playerId: playerKey, pageIndex: 0, difficulty: level)
        progress = WorldBookPuzzleStore.load(playerId: playerKey)
        if progress.pages.indices.contains(0) {
            progress.pages[0].isSolved = false
            progress.pages[0].selectedPlateCatalogName = keptPlate
            persist()
        }
        showVictory = false
        showReplayChoice = false
        coachingVisible = true
        playing = true
        phase = .board
    }

    private func persist() {
        WorldBookPuzzleStore.save(progress, playerId: playerKey)
    }
}

// MARK: - Board + tray + groups

private struct FuseFlash: Identifiable, Equatable {
    let id: UUID
    let a: CGPoint
    let b: CGPoint
    var progress: CGFloat

    init(a: CGPoint, b: CGPoint, progress: CGFloat) {
        self.id = UUID()
        self.a = a
        self.b = b
        self.progress = progress
    }
}

struct WorldBookJigsawBoardView: View {
    let catalogImageName: String
    @Binding var pageProgress: WorldBookPageProgress
    var onPiecePlaced: (() -> Void)? = nil
    var onFuse: (() -> Void)? = nil
    let onSolved: () -> Void

    @State private var pieces: [WorldBookJigsawPiece] = []
    @State private var rendered: [String: UIImage] = [:]
    @State private var positions: [String: CGPoint] = [:]
    @State private var groupOf: [String: String] = [:]
    @State private var fusedPairs: Set<String> = []
    @State private var fuseFlashes: [FuseFlash] = []
    @State private var draggingLeader: String?
    @State private var dragStartPositions: [String: CGPoint] = [:]
    @State private var boardSize: CGSize = .zero
    @State private var fieldSize: CGSize = .zero
    @State private var assembling = false
    @State private var lastCatalogName: String = ""

    private let tabFraction: CGFloat = 0.22
    private var grid: Int { pageProgress.difficulty.gridSize }
    private var cell: CGFloat {
        min(fieldSize.width, fieldSize.height) / CGFloat(max(grid, 1))
    }
    private var snapThreshold: CGFloat { max(20, cell * 0.32) }

    var body: some View {
        GeometryReader { geo in
            let trayW = geo.size.width * 0.26
            let boardW = geo.size.width - trayW - 10
            let side = min(boardW, geo.size.height) * 0.98
            let field = CGSize(width: side, height: side)

            ZStack(alignment: .leading) {
                HStack(alignment: .center, spacing: 10) {
                    pagePad
                        .frame(width: field.width, height: field.height)
                        .overlay {
                            if let guide = UIImage(named: catalogImageName) {
                                Image(uiImage: guide)
                                    .resizable()
                                    .scaledToFit()
                                    .frame(width: field.width * 0.90, height: field.height * 0.90)
                                    .opacity(fusedPairs.isEmpty ? 0.14 : 0.05)
                                    .allowsHitTesting(false)
                            }
                        }
                    trayChrome(height: field.height)
                        .frame(width: trayW, height: field.height)
                }
                pieceLayer(field: field, trayWidth: trayW)
                fuseOverlay
            }
            .coordinateSpace(name: "worldBookBoard")
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .onAppear {
                fieldSize = field
                boardSize = CGSize(width: field.width + 10 + trayW, height: field.height)
                rebuildIfNeeded(force: pieces.isEmpty || lastCatalogName != catalogImageName)
            }
            .onChange(of: field.width) { _, _ in
                fieldSize = field
                boardSize = CGSize(width: field.width + 10 + trayW, height: field.height)
                if positions.isEmpty { scatterIntoTray() }
            }
            .onChange(of: pageProgress.difficulty) { _, _ in rebuildIfNeeded(force: true) }
            .onChange(of: catalogImageName) { _, name in
                rebuildIfNeeded(force: name != lastCatalogName)
            }
        }
        .accessibilityIdentifier("world2.worldBook.board")
    }

    /// Hazy glass playfield — matches Voyage status / title material language.
    private var pagePad: some View {
        RoundedRectangle(cornerRadius: 22, style: .continuous)
            .fill(.ultraThinMaterial.opacity(0.78))
            .overlay(
                RoundedRectangle(cornerRadius: 22, style: .continuous)
                    .stroke(MarbleVoyageChrome.glassStroke, lineWidth: 1.5)
            )
            .shadow(color: .black.opacity(0.28), radius: 14, y: 6)
    }

    private func trayChrome(height: CGFloat) -> some View {
        let groups = max(1, Set(pieces.map { leader(of: $0.id) }).count)
        let total = max(1, pieces.count)
        let fusedGroups = max(0, total - groups)
        return RoundedRectangle(cornerRadius: 18, style: .continuous)
            .fill(.ultraThinMaterial.opacity(0.72))
            .overlay(
                VStack(alignment: .leading, spacing: 8) {
                    Text("PIECES")
                        .font(.system(size: 11, weight: .heavy, design: .rounded))
                        .foregroundStyle(.white.opacity(0.65))
                        .padding(.top, 12)
                    if let dest = WorldBookCatalog.destination(catalogName: catalogImageName) {
                        Image(dest.catalogName)
                            .resizable()
                            .scaledToFit()
                            .frame(maxHeight: 72)
                            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                            .overlay(
                                RoundedRectangle(cornerRadius: 10, style: .continuous)
                                    .stroke(.white.opacity(0.3), lineWidth: 1)
                            )
                        Text(dest.title)
                            .font(.system(size: 13, weight: .black, design: .rounded))
                            .foregroundStyle(.white)
                            .lineLimit(2)
                    }
                    Text("\(groups) groups · \(total) tiles")
                        .font(.system(size: 12, weight: .bold, design: .rounded))
                        .foregroundStyle(.white.opacity(0.8))
                    ProgressView(value: Double(fusedGroups), total: Double(max(total - 1, 1)))
                        .tint(MarbleVoyageChrome.primaryFill)
                    Text("Drag onto the page")
                        .font(.system(size: 11, weight: .semibold, design: .rounded))
                        .foregroundStyle(.white.opacity(0.55))
                    Spacer()
                }
                .padding(.horizontal, 10)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .stroke(MarbleVoyageChrome.glassStroke, lineWidth: 1.2)
            )
            .accessibilityHidden(true)
    }

    @ViewBuilder
    private func pieceLayer(field: CGSize, trayWidth: CGFloat) -> some View {
        ForEach(pieces) { piece in
            if let image = rendered[piece.id] {
                let pos = positions[piece.id] ?? homePoint(for: piece)
                Image(uiImage: image)
                    .resizable()
                    .interpolation(.high)
                    .frame(width: piecePixelSize, height: piecePixelSize)
                    .shadow(
                        color: .black.opacity(groupMembers(of: piece.id).count > 1 ? 0.16 : 0.38),
                        radius: groupMembers(of: piece.id).count > 1 ? 3 : 8,
                        y: groupMembers(of: piece.id).count > 1 ? 1 : 4
                    )
                    .position(pos)
                    .gesture(drag(piece))
                    .zIndex(draggingLeader == leader(of: piece.id) ? 100 : 10)
                    .opacity(assembling ? 0.95 : 1)
            }
        }
        .frame(
            width: field.width + 10 + trayWidth,
            height: field.height,
            alignment: .topLeading
        )
    }

    private var fuseOverlay: some View {
        ZStack {
            ForEach(fuseFlashes) { flash in
                Path { path in
                    path.move(to: flash.a)
                    path.addLine(to: flash.b)
                }
                .stroke(
                    AngularGradient(
                        colors: [
                            Color.cyan.opacity(0.0),
                            Color.white,
                            MarbleVoyageChrome.primaryFill,
                            Color.white.opacity(0.2),
                            Color.cyan.opacity(0.0),
                        ],
                        center: .center,
                        angle: .degrees(Double(flash.progress) * 360)
                    ),
                    style: StrokeStyle(lineWidth: 4.5, lineCap: .round)
                )
                .blur(radius: 1.2)
                .opacity(Double(1.0 - flash.progress * 0.85))
                .allowsHitTesting(false)
            }
        }
    }

    private var piecePixelSize: CGFloat {
        let coreFraction = 1 - (2 * tabFraction)
        return max(40, cell / max(coreFraction, 0.4))
    }

    private func leader(of id: String) -> String { groupOf[id] ?? id }

    private func groupMembers(of id: String) -> [String] {
        let lead = leader(of: id)
        return pieces.map(\.id).filter { leader(of: $0) == lead }
    }

    private func drag(_ piece: WorldBookJigsawPiece) -> some Gesture {
        DragGesture(coordinateSpace: .named("worldBookBoard"))
            .onChanged { value in
                guard !assembling else { return }
                let lead = leader(of: piece.id)
                if draggingLeader != lead {
                    draggingLeader = lead
                    dragStartPositions = Dictionary(
                        uniqueKeysWithValues: groupMembers(of: lead).compactMap { id in
                            positions[id].map { (id, $0) }
                        }
                    )
                }
                let tx = value.translation.width
                let ty = value.translation.height
                for id in groupMembers(of: lead) {
                    if let start = dragStartPositions[id] {
                        positions[id] = CGPoint(x: start.x + tx, y: start.y + ty)
                    }
                }
            }
            .onEnded { _ in
                draggingLeader = nil
                dragStartPositions = [:]
                tryFuse(around: leader(of: piece.id))
                persist()
                onPiecePlaced?()
            }
    }

    private func homePoint(for piece: WorldBookJigsawPiece) -> CGPoint {
        CGPoint(
            x: piece.homeCenter.x * fieldSize.width,
            y: piece.homeCenter.y * fieldSize.height
        )
    }

    private func expectedDelta(from a: WorldBookJigsawPiece, to b: WorldBookJigsawPiece) -> CGPoint {
        CGPoint(
            x: (b.homeCenter.x - a.homeCenter.x) * fieldSize.width,
            y: (b.homeCenter.y - a.homeCenter.y) * fieldSize.height
        )
    }

    private func pairKey(_ a: String, _ b: String) -> String {
        a < b ? "\(a)|\(b)" : "\(b)|\(a)"
    }

    private func areNeighbors(_ a: WorldBookJigsawPiece, _ b: WorldBookJigsawPiece) -> Bool {
        let dr = abs(a.row - b.row)
        let dc = abs(a.col - b.col)
        return (dr == 1 && dc == 0) || (dr == 0 && dc == 1)
    }

    private func tryFuse(around lead: String) {
        var merged = false
        let members = groupMembers(of: lead)
        for mid in members {
            guard let me = pieces.first(where: { $0.id == mid }),
                  let myPos = positions[mid] else { continue }
            for other in pieces where leader(of: other.id) != lead {
                guard areNeighbors(me, other),
                      let otherPos = positions[other.id] else { continue }
                let expected = expectedDelta(from: me, to: other)
                let actual = CGPoint(x: otherPos.x - myPos.x, y: otherPos.y - myPos.y)
                let err = hypot(actual.x - expected.x, actual.y - expected.y)
                if err <= snapThreshold {
                    let otherLead = leader(of: other.id)
                    let dx = (myPos.x + expected.x) - otherPos.x
                    let dy = (myPos.y + expected.y) - otherPos.y
                    for oid in groupMembers(of: otherLead) {
                        if let p = positions[oid] {
                            positions[oid] = CGPoint(x: p.x + dx, y: p.y + dy)
                        }
                        groupOf[oid] = lead
                    }
                    fusedPairs.insert(pairKey(me.id, other.id))
                    flashFuse(from: me, to: other)
                    merged = true
                    UIImpactFeedbackGenerator(style: .rigid).impactOccurred()
                    onFuse?()
                }
            }
        }
        if merged {
            rerenderFused()
            if Set(pieces.map { leader(of: $0.id) }).count == 1 {
                finalizeAssembly()
            }
        }
    }

    private func flashFuse(from a: WorldBookJigsawPiece, to b: WorldBookJigsawPiece) {
        guard let pa = positions[a.id], let pb = positions[b.id] else { return }
        let mid = CGPoint(x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2)
        if a.row == b.row {
            let along = CGPoint(x: mid.x, y: mid.y - cell * 0.35)
            let along2 = CGPoint(x: mid.x, y: mid.y + cell * 0.35)
            let flash = FuseFlash(a: along, b: along2, progress: 0)
            fuseFlashes.append(flash)
            animateFlash(id: flash.id)
        } else {
            let along = CGPoint(x: mid.x - cell * 0.35, y: mid.y)
            let along2 = CGPoint(x: mid.x + cell * 0.35, y: mid.y)
            let flash = FuseFlash(a: along, b: along2, progress: 0)
            fuseFlashes.append(flash)
            animateFlash(id: flash.id)
        }
    }

    private func animateFlash(id: UUID) {
        let steps = 12
        for i in 0...steps {
            DispatchQueue.main.asyncAfter(deadline: .now() + Double(i) * 0.03) {
                if let idx = fuseFlashes.firstIndex(where: { $0.id == id }) {
                    fuseFlashes[idx].progress = CGFloat(i) / CGFloat(steps)
                    if i == steps {
                        fuseFlashes.removeAll { $0.id == id }
                    }
                }
            }
        }
    }

    private func finalizeAssembly() {
        assembling = true
        withAnimation(.spring(response: 0.55, dampingFraction: 0.86)) {
            for piece in pieces {
                positions[piece.id] = homePoint(for: piece)
            }
        }
        for a in pieces {
            for b in pieces where a.id < b.id && areNeighbors(a, b) {
                fusedPairs.insert(pairKey(a.id, b.id))
            }
        }
        rerenderFused()
        pageProgress.isSolved = true
        persist()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.65) {
            onSolved()
        }
    }

    private func fusedFlags(for piece: WorldBookJigsawPiece) -> (Bool, Bool, Bool, Bool) {
        var t = false, r = false, b = false, l = false
        for other in pieces where other.id != piece.id {
            let key = pairKey(piece.id, other.id)
            guard fusedPairs.contains(key) else { continue }
            if other.row == piece.row - 1, other.col == piece.col { t = true }
            if other.row == piece.row + 1, other.col == piece.col { b = true }
            if other.col == piece.col + 1, other.row == piece.row { r = true }
            if other.col == piece.col - 1, other.row == piece.row { l = true }
        }
        return (t, r, b, l)
    }

    private func rerenderFused() {
        guard let source = UIImage(named: catalogImageName) else { return }
        let outSize = pageProgress.difficulty.renderOutputSize
        var images: [String: UIImage] = [:]
        for piece in pieces {
            let f = fusedFlags(for: piece)
            if let img = WorldBookJigsawCutter.renderPiece(
                from: source,
                piece: piece,
                grid: grid,
                outputSize: outSize,
                fusedTop: f.0,
                fusedRight: f.1,
                fusedBottom: f.2,
                fusedLeft: f.3
            ) {
                images[piece.id] = img
            }
        }
        rendered = images
    }

    private func rebuildIfNeeded(force: Bool) {
        guard force || pieces.isEmpty else { return }
        guard let source = UIImage(named: catalogImageName) else {
            pieces = []
            rendered = [:]
            return
        }
        lastCatalogName = catalogImageName
        let plateSalt = UInt64(
            WorldBookCatalog.puzzleDestinations.firstIndex(where: { $0.catalogName == catalogImageName }) ?? 0
        )
        let seed: UInt64 = 2_026_09_27 &+ UInt64(grid) &* 17 &+ plateSalt
        let cut = WorldBookJigsawCutter.pieces(grid: grid, seed: seed)
        pieces = cut
        groupOf = Dictionary(uniqueKeysWithValues: cut.map { ($0.id, $0.id) })
        fusedPairs = []
        assembling = false

        let outSize = pageProgress.difficulty.renderOutputSize
        var images: [String: UIImage] = [:]
        for piece in cut {
            if let img = WorldBookJigsawCutter.renderPiece(
                from: source,
                piece: piece,
                grid: grid,
                outputSize: outSize
            ) {
                images[piece.id] = img
            }
        }
        rendered = images
        scatterIntoTray()
    }

    private func scatterIntoTray() {
        guard fieldSize.width > 1 else { return }
        let trayOriginX = fieldSize.width + 10
        let trayW = boardSize.width - trayOriginX
        var next: [String: CGPoint] = [:]
        for (i, piece) in pieces.enumerated() {
            let col = i % 2
            let row = i / 2
            let rows = Int(ceil(Double(pieces.count) / 2.0))
            let x = trayOriginX + trayW * (0.28 + CGFloat(col) * 0.38)
            let y = fieldSize.height * (0.18 + CGFloat(row) * (0.70 / CGFloat(max(rows, 1))))
            next[piece.id] = CGPoint(x: x, y: y)
        }
        positions = next
    }

    private func persist() {
        var stored: [String: CGPointCodable] = [:]
        for (id, point) in positions {
            let nx = fieldSize.width > 0 ? point.x / fieldSize.width : point.x
            let ny = fieldSize.height > 0 ? point.y / fieldSize.height : point.y
            stored[id] = CGPointCodable(CGPoint(x: nx, y: ny))
        }
        pageProgress.piecePositions = stored
        pageProgress.placedPieceIDs = Array(fusedPairs)
    }
}

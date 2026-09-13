//
//  CreatureBuilderView.swift
//  abbies.world.ios
//
//  Main container for Creature Card Builder minigame.
//

import SwiftUI
import UIKit

struct CreatureBuilderView: View {
    @StateObject private var viewModel = CreatureBuilderViewModel()
    @StateObject private var audioService = CreatureBuilderAudioService()
    @State private var isShowingOverland: Bool
    @Environment(\.dismiss) private var dismiss
    private let onClose: (() -> Void)?

    init(
        startsInLab: Bool = false,
        onClose: (() -> Void)? = nil
    ) {
        self.onClose = onClose
        let arguments = ProcessInfo.processInfo.arguments
        _isShowingOverland = State(
            initialValue: !startsInLab
                && !arguments.contains("-autoPlayCreatureBuilder")
                && !arguments.contains("-launchCreatureBuilderDirect")
                && !arguments.contains("-verifyCreatureLab2D")
                && !arguments.contains("-verifyCreatureLab2DBuild")
                && !arguments.contains("-verifyCreatureLabReady")
        )
    }

    var body: some View {
        Group {
            if isShowingOverland {
                CreatureLabOverlandView(
                    onClose: {
                        if let onClose {
                            onClose()
                        } else {
                            dismiss()
                        }
                    },
                    onEnterLab: {
                        withAnimation(.easeInOut(duration: 0.45)) {
                            isShowingOverland = false
                        }
                    }
                )
                .transition(.opacity)
            } else {
                labExperience
                    .transition(.opacity)
            }
        }
        .sheet(isPresented: $viewModel.showingReveal) {
            if let card = viewModel.cardToReveal {
                CardRevealView(card: card) {
                    viewModel.completeReveal()
                }
            }
        }
        .sheet(isPresented: $viewModel.showingDetail) {
            if let card = viewModel.cardDetail {
                CardDetailView(
                    card: card,
                    onFavorite: { viewModel.toggleFavorite(card) },
                    onMakeAnother: { viewModel.makeAnotherLikeThis(card) }
                )
            }
        }
        .onAppear {
            requestLandscapeOrientation()
            MusicService.shared.setGameActive(true)
            audioService.start()
            if !ProcessInfo.processInfo.arguments.contains(
                "-verifyCreatureLabReady"
            ) {
                viewModel.loadState()
            }
        }
        .onDisappear {
            audioService.stopAllAudio()
            MusicService.shared.setGameActive(false)
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("creatureBuilder.root")
    }

    private func requestLandscapeOrientation() {
        guard let windowScene = UIApplication.shared.connectedScenes
            .compactMap({ $0 as? UIWindowScene })
            .first else {
            return
        }

        windowScene.requestGeometryUpdate(
            .iOS(interfaceOrientations: .landscape)
        )
    }

    private var labExperience: some View {
        ZStack {
            backgroundGradient

            tabContent
                .padding(
                    .top,
                    viewModel.currentTab == .build ? 0 : 72
                )
                .padding(
                    .bottom,
                    viewModel.currentTab == .build ? 0 : 76
                )

            VStack(spacing: 0) {
                header
                    .padding(.top, 56)

                Spacer(minLength: 0)

                tabBar
            }
            .zIndex(20)
        }
    }
    
    private var backgroundGradient: some View {
        ZStack {
            Image("creature_builder_workshop_background")
                .resizable()
                .scaledToFill()
                .ignoresSafeArea()

            LinearGradient(
                colors: [
                    Color.black.opacity(0.28),
                    Color(red: 0.08, green: 0.03, blue: 0.18).opacity(0.68)
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()
        }
    }
    
    private var header: some View {
        HStack {
            Button {
                withAnimation(.easeInOut(duration: 0.45)) {
                    isShowingOverland = true
                }
            } label: {
                CreatureLabGlyph(symbol: "map.fill", tint: .indigo, size: 38)
            }
            .accessibilityLabel("Return to Creature City")
            .accessibilityIdentifier("creatureLab.backToCity")
            
            Spacer()
            
            VStack(spacing: 2) {
                Text("Creature Lab")
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(.white)

                Text(audioService.currentTrackTitle)
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(.white.opacity(0.72))
                    .lineLimit(1)
            }
            
            Spacer()
            
            HStack(spacing: 8) {
                Button {
                    audioService.togglePlayback()
                } label: {
                    Image(
                        systemName: audioService.isPlaying
                            ? "pause.fill"
                            : "play.fill"
                    )
                    .frame(width: 40, height: 40)
                    .background(.white.opacity(0.16), in: Circle())
                }
                .accessibilityLabel(
                    audioService.isPlaying ? "Pause music" : "Play music"
                )

                Button {
                    audioService.playNext()
                } label: {
                    Image(systemName: "forward.end.fill")
                        .frame(width: 40, height: 40)
                        .background(.white.opacity(0.16), in: Circle())
                }
                .accessibilityLabel("Next Creature Lab song")
            }
            .foregroundColor(.white)
        }
        .padding()
    }
    
    @ViewBuilder
    private var tabContent: some View {
        switch viewModel.currentTab {
        case .build:
            BuilderView(viewModel: viewModel)
        case .making:
            MakingView(viewModel: viewModel)
        case .myCards:
            MyCardsView(viewModel: viewModel)
        }
    }
    
    private var tabBar: some View {
        HStack(spacing: 0) {
            ForEach(CreatureBuilderTab.allCases, id: \.self) { tab in
                tabButton(tab)
            }
        }
        .padding(.horizontal)
        .padding(.top, 8)
        .padding(.bottom, 8)
        .background(.black.opacity(0.28))
    }
    
    private func tabButton(_ tab: CreatureBuilderTab) -> some View {
        Button {
            withAnimation(.spring(response: 0.3)) {
                viewModel.currentTab = tab
            }
        } label: {
            VStack(spacing: 4) {
                ZStack(alignment: .topTrailing) {
                    Image(systemName: tabSymbol(tab))
                        .font(.system(size: 21, weight: .bold))
                        .symbolRenderingMode(.hierarchical)
                    
                    if tab == .making, viewModel.readyCount > 0 {
                        Image(systemName: "checkmark")
                            .font(.caption2.weight(.black))
                            .foregroundStyle(.white)
                            .frame(width: 20, height: 20)
                            .background(.green, in: Circle())
                            .offset(x: 12, y: -8)
                            .accessibilityLabel("A creature is ready to reveal")
                    } else if tab == .making, viewModel.failedCount > 0 {
                        Image(systemName: "arrow.clockwise")
                            .font(.caption2.weight(.black))
                            .foregroundStyle(.white)
                            .frame(width: 20, height: 20)
                            .background(.orange, in: Circle())
                            .offset(x: 12, y: -8)
                            .accessibilityLabel("A creature needs another try")
                    } else if tab == .making, let badge = viewModel.makingBadge {
                        Text(badge)
                            .font(.caption2.weight(.bold))
                            .foregroundColor(.white)
                            .frame(minWidth: 20, minHeight: 20)
                            .background(.orange, in: Circle())
                            .offset(x: 12, y: -8)
                    }
                }
                
                Text(tab.rawValue)
                    .font(.caption)
                    .fontWeight(viewModel.currentTab == tab ? .bold : .regular)
            }
            .foregroundColor(viewModel.currentTab == tab ? .white : .white.opacity(0.5))
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(
                viewModel.currentTab == tab
                    ? Color.white.opacity(0.2)
                    : Color.clear
            )
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .frame(maxWidth: .infinity)
    }
    
    private func tabSymbol(_ tab: CreatureBuilderTab) -> String {
        switch tab {
        case .build: return "slider.horizontal.3"
        case .making: return "gearshape.2.fill"
        case .myCards: return "rectangle.stack.fill"
        }
    }
}

// MARK: - Creature City Overland

private struct CreatureOverlandDestination: Identifiable {
    let id: String
    let title: String
    let purpose: String
    let assetName: String
    let symbol: String
    let tint: Color
    let position: CGPoint
    let scale: CGFloat
    let phase: Double
    let opensCreatureLab: Bool
}

private struct CreatureLabOverlandView: View {
    let onClose: () -> Void
    let onEnterLab: () -> Void

    @State private var selectedJobPlace: CreatureOverlandDestination?

    private let destinations = [
        CreatureOverlandDestination(
            id: "math_store",
            title: "Math Store",
            purpose: "NUMBER JOBS",
            assetName: "creature_builder_overland_math_store",
            symbol: "number",
            tint: .teal,
            position: CGPoint(x: 0.22, y: 0.48),
            scale: 0.22,
            phase: 0,
            opensCreatureLab: false
        ),
        CreatureOverlandDestination(
            id: "book_store",
            title: "Book Store",
            purpose: "WORD JOBS",
            assetName: "creature_builder_overland_book_store",
            symbol: "text.book.closed.fill",
            tint: .purple,
            position: CGPoint(x: 0.76, y: 0.27),
            scale: 0.20,
            phase: 2.1,
            opensCreatureLab: false
        ),
        CreatureOverlandDestination(
            id: "creature_lab",
            title: "Creature Lab",
            purpose: "MAKE CREATURES",
            assetName: "creature_builder_overland_creature_lab",
            symbol: "wand.and.stars",
            tint: .indigo,
            position: CGPoint(x: 0.55, y: 0.77),
            scale: 0.23,
            phase: 4.2,
            opensCreatureLab: true
        ),
    ]

    var body: some View {
        GeometryReader { geometry in
            let board = boardFrame(in: geometry.size)

            ZStack {
                Image("creature_builder_overland_board")
                    .resizable()
                    .scaledToFill()
                    .blur(radius: 18)
                    .saturation(0.75)
                    .ignoresSafeArea()

                Color(red: 0.08, green: 0.2, blue: 0.13)
                    .opacity(0.52)
                    .ignoresSafeArea()

                Image("creature_builder_overland_board")
                    .resizable()
                    .scaledToFit()
                    .frame(width: board.width, height: board.height)
                    .position(x: board.midX, y: board.midY)

                ForEach(destinations) { destination in
                    let destinationSize = board.width * destination.scale
                    TweeningDestinationButton(
                        destination: destination,
                        size: destinationSize
                    ) {
                        print(
                            "CREATURE_BUILDER_OVERLAND_EVENT " +
                            "place=\(destination.id) action=selected"
                        )
                        if destination.opensCreatureLab {
                            onEnterLab()
                        } else {
                            selectedJobPlace = destination
                        }
                    }
                    .position(
                        x: board.minX + board.width * destination.position.x,
                        y: board.minY
                            + board.height * destination.position.y
                            - destinationSize * 0.33
                    )
                }

                overlandHeader
                    .padding(.top, 56)
            }
        }
        .sheet(item: $selectedJobPlace) { destination in
            CreatureJobPlaceSheet(destination: destination)
                .presentationDetents([.medium])
                .presentationDragIndicator(.visible)
        }
    }

    private var overlandHeader: some View {
        VStack {
            HStack {
                Button(action: onClose) {
                    CreatureLabGlyph(symbol: "xmark", tint: .indigo, size: 40)
                }
                .accessibilityLabel("Close Creature City")
                .accessibilityIdentifier("creatureLab.closeCity")

                Spacer()

                VStack(spacing: 1) {
                    Text("CREATURE CITY")
                        .font(.title2.weight(.black))
                        .foregroundStyle(.white)
                    Text("Choose where to go")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.white.opacity(0.8))
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 8)
                .background(.black.opacity(0.32), in: Capsule())

                Spacer()

                Color.clear
                    .frame(width: 40, height: 40)
            }
            .padding()

            Spacer()
        }
    }

    private func boardFrame(in size: CGSize) -> CGRect {
        let aspect: CGFloat = 1.5
        let boardSize: CGSize
        if size.width / size.height > aspect {
            boardSize = CGSize(width: size.height * aspect, height: size.height)
        } else {
            boardSize = CGSize(width: size.width, height: size.width / aspect)
        }
        return CGRect(
            x: (size.width - boardSize.width) / 2,
            y: (size.height - boardSize.height) / 2,
            width: boardSize.width,
            height: boardSize.height
        )
    }
}

private struct TweeningDestinationButton: View {
    let destination: CreatureOverlandDestination
    let size: CGFloat
    let action: () -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        TimelineView(.animation) { context in
            let seconds = context.date.timeIntervalSinceReferenceDate
            let wave = sin((seconds / 2.8) * .pi * 2 + destination.phase)
            let breathingScale = reduceMotion ? 1 : 1 + 0.025 * wave
            let verticalDrift = reduceMotion ? 0 : -3 * wave

            Button(action: action) {
                ZStack(alignment: .topTrailing) {
                    VStack(spacing: -4) {
                        Image(destination.assetName)
                            .resizable()
                            .scaledToFit()
                            .frame(width: size, height: size)
                            .shadow(
                                color: Color.black.opacity(0.28),
                                radius: size * 0.045,
                                y: size * 0.025
                            )

                        HStack(spacing: 6) {
                            Image(systemName: destination.symbol)
                                .font(.caption.weight(.black))
                            VStack(alignment: .leading, spacing: 0) {
                                Text(destination.title)
                                    .font(.caption.weight(.black))
                                Text(destination.purpose)
                                    .font(.system(size: 8, weight: .bold))
                                    .tracking(0.6)
                            }
                        }
                        .foregroundStyle(.white)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(destination.tint.opacity(0.9), in: Capsule())
                        .overlay {
                            Capsule()
                                .stroke(.white.opacity(0.75), lineWidth: 1.5)
                        }
                    }

                    if !destination.opensCreatureLab {
                        Image(systemName: "briefcase.fill")
                            .font(.caption.weight(.black))
                            .foregroundStyle(.white)
                            .frame(width: 30, height: 30)
                            .background(.orange, in: Circle())
                            .overlay {
                                Circle().stroke(.white, lineWidth: 2)
                            }
                            .offset(x: -size * 0.05, y: size * 0.09)
                    }
                }
                .scaleEffect(breathingScale)
                .offset(y: verticalDrift)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel(
                "\(destination.title), \(destination.purpose.lowercased())"
            )
            .accessibilityHint("Double tap to enter")
        }
    }
}

private struct CreatureJobPlaceSheet: View {
    let destination: CreatureOverlandDestination

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            Color(red: 0.09, green: 0.05, blue: 0.18)
                .ignoresSafeArea()

            HStack(spacing: 28) {
                Image(destination.assetName)
                    .resizable()
                    .scaledToFit()
                    .frame(maxWidth: 210, maxHeight: 230)

                VStack(alignment: .leading, spacing: 14) {
                    CreatureLabGlyph(
                        symbol: destination.symbol,
                        tint: destination.tint,
                        size: 46
                    )

                    Text(destination.title)
                        .font(.title.weight(.black))
                        .foregroundStyle(.white)

                    Text(destination.purpose)
                        .font(.headline.weight(.bold))
                        .foregroundStyle(destination.tint)

                    Label(
                        "Every mission pays the same",
                        systemImage: "equal.circle.fill"
                    )
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.white.opacity(0.82))

                    Text("The mission board will live here.")
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.64))

                    Button("Back to City") {
                        dismiss()
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(destination.tint)
                }
            }
            .padding(28)
        }
    }
}

// MARK: - Builder View

struct BuilderView: View {
    @ObservedObject var viewModel: CreatureBuilderViewModel
    
    var body: some View {
        RadialCreatureLabView(viewModel: viewModel)
    }
    
    private var recipePreview: some View {
        VStack(spacing: 16) {
            Text("YOUR CREATURE")
                .font(.caption)
                .fontWeight(.bold)
                .foregroundColor(.white.opacity(0.7))
            
            HStack(spacing: 12) {
                if let creature = viewModel.selectedCreature {
                    CreatureTile(ingredient: creature, isSelected: false, size: 70)
                }
                recipeConnector
                if let outfit = viewModel.selectedOutfit {
                    OutfitTile(ingredient: outfit, isSelected: false, size: 70)
                }
                recipeConnector
                if let buddy = viewModel.selectedBuddy {
                    BuddyTile(ingredient: buddy, isSelected: false, size: 70)
                }
                Image(systemName: "equal")
                    .font(.headline)
                    .foregroundStyle(.white.opacity(0.65))
                mysteryOutput
            }
        }
        .padding()
        .background(Color.white.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 20))
        .padding(.horizontal)
    }
    
    private var makeItButton: some View {
        Button {
            viewModel.createCreature()
        } label: {
            HStack(spacing: 12) {
                if viewModel.isCreating {
                    ProgressView()
                        .tint(.white)
                } else {
                    Circle()
                        .fill(.yellow)
                        .frame(width: 12, height: 12)
                }
                Text(viewModel.isCreating ? "MAKING..." : "MAKE IT!")
                    .font(.title2)
                    .fontWeight(.bold)
            }
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 20)
            .background(
                LinearGradient(
                    colors: viewModel.isCreating ? [.gray, .gray.opacity(0.7)] : [.purple, .pink],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .clipShape(RoundedRectangle(cornerRadius: 24))
            .shadow(color: viewModel.isCreating ? .clear : .purple.opacity(0.5), radius: 10, y: 5)
        }
        .disabled(viewModel.isCreating)
        .padding(.horizontal, 32)
    }
    
    private var queueFullMessage: some View {
        HStack {
            CreatureLabGlyph(symbol: "clock.fill", tint: .orange, size: 32)
            Text("The creature machine is very busy! Try again soon.")
                .font(.subheadline)
        }
        .foregroundColor(.orange)
        .padding()
        .background(Color.orange.opacity(0.2))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .padding(.horizontal)
    }
    
    private func errorMessage(_ message: String) -> some View {
        HStack {
            CreatureLabGlyph(
                symbol: "exclamationmark.triangle.fill",
                tint: .red,
                size: 32
            )
            Text(message)
                .font(.subheadline)
        }
        .foregroundColor(.red)
        .padding()
        .background(Color.red.opacity(0.2))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .padding(.horizontal)
    }

    private var recipeConnector: some View {
        Image(systemName: "plus")
            .font(.caption.weight(.black))
            .foregroundStyle(.white)
            .frame(width: 22, height: 22)
            .background(.white.opacity(0.18), in: Circle())
            .accessibilityHidden(true)
    }

    private var mysteryOutput: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 14)
                .fill(
                    LinearGradient(
                        colors: [.indigo, .purple],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
            Text("?")
                .font(.title2.weight(.black))
                .foregroundStyle(.yellow)
            RoundedRectangle(cornerRadius: 14)
                .stroke(.yellow.opacity(0.75), lineWidth: 3)
        }
        .frame(width: 58, height: 70)
        .shadow(color: .purple.opacity(0.6), radius: 7, y: 3)
        .accessibilityLabel("Mystery creature result")
    }
}

#Preview {
    CreatureBuilderView()
}

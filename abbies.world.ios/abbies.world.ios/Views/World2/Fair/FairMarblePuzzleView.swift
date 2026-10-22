import SwiftUI

struct FairMarblePuzzleView: View {
    let onWin: () -> Void
    let onClose: () -> Void
    var advanced = false
    var onSolved: () -> Void = {}
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.scenePhase) private var scenePhase
    @State private var game = FairMarbleGame()
    @State private var selected: Int?
    @State private var hint: FairMarbleGame.Move?
    @State private var rejectedSwap: FairMarbleGame.Move?
    @State private var fading = Set<Int>()
    @State private var busy = false
    @State private var message = "Tap a marble, then its neighbor. Join 3 alike!"
    @State private var turnTask: Task<Void, Never>?
    @State private var confirmingGiveUp = false
    private let ink = Color(red: 0.17, green: 0.29, blue: 0.31)

    var body: some View {
        GeometryReader { geometry in
            let landscape = geometry.size.width > geometry.size.height
            ZStack {
                Image("fair_marble_backdrop").resizable().scaledToFill()
                    .frame(width: geometry.size.width, height: geometry.size.height).clipped()
                    .overlay(.white.opacity(0.12))
                if landscape {
                    HStack(spacing: 24) {
                        board.frame(maxWidth: .infinity, maxHeight: .infinity)
                        information.frame(width: min(300, geometry.size.width * 0.30))
                    }.padding(28)
                } else {
                    VStack(spacing: 12) {
                        information
                        board.frame(maxWidth: .infinity, maxHeight: .infinity)
                    }.padding(20)
                }
                if game.status != .playing { resultCard }
            }
            .foregroundStyle(ink)
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("fair.marble.puzzle")
        .onAppear { restart() }
        .onDisappear { turnTask?.cancel() }
        .onChange(of: scenePhase) { _, phase in
            // Pending turns check this state before advancing after a delay.
            if phase == .active, game.buddyTurn, !busy, game.status == .playing { startBuddy() }
        }
        .confirmationDialog("Start this attempt over?", isPresented: $confirmingGiveUp, titleVisibility: .visible) {
            Button("Give up this attempt", role: .destructive) {
                turnTask?.cancel()
                busy = false
                game.giveUp()
                message = "That's okay. Let's try a fresh board together."
            }
            Button("Keep playing", role: .cancel) { }
        }
    }

    private var information: some View {
        VStack(spacing: 15) {
            Text("Marble Meadow").font(.system(.largeTitle, design: .rounded, weight: .heavy))
            Label(game.buddyTurn ? "Pip's turn" : "Your turn", systemImage: game.buddyTurn ? "hare.fill" : "hand.tap.fill")
                .font(.system(.title2, design: .rounded, weight: .bold))
                .padding(.horizontal, 18).padding(.vertical, 10)
                .background(game.buddyTurn ? Color.orange.opacity(0.20) : Color.teal.opacity(0.18), in: Capsule())
                .accessibilityIdentifier("fair.turn")
            Text(message).font(.system(.headline, design: .rounded)).multilineTextAlignment(.center)
                .frame(minHeight: 54).accessibilityIdentifier("fair.message")
            HStack(spacing: 5) {
                ForEach(0..<game.goal, id: \.self) { index in
                    Image(systemName: index < game.connections ? "star.fill" : "star")
                        .foregroundStyle(index < game.connections ? Color.orange : ink.opacity(0.35))
                }
            }.accessibilityLabel("\(game.connections) of 10 matches")
            Text("\(game.connections) / 10 together").font(.system(.title3, design: .rounded, weight: .bold))
                .accessibilityIdentifier("fair.score")
            Text("You + Pip • Make 10 matches to open the fair")
                .font(.system(.subheadline, design: .rounded)).multilineTextAlignment(.center)
            Button {
                hint = game.useHelp()
                selected = hint?.from
                message = "Follow the golden rings. Tap the other marble!"
            } label: {
                Label("Help · \(game.helpTokens)", systemImage: "sparkles").frame(maxWidth: .infinity).padding(8)
            }
            .buttonStyle(.borderedProminent).tint(.teal)
            .disabled(busy || game.buddyTurn || game.helpTokens == 0)
            .accessibilityIdentifier("fair.help")
            Button("Give up & retry") { confirmingGiveUp = true }
                .buttonStyle(.bordered).accessibilityIdentifier("fair.giveUp")
        }
        .padding(22)
        .background(Color(red: 1, green: 0.98, blue: 0.91).opacity(0.96), in: RoundedRectangle(cornerRadius: 28))
        .overlay(RoundedRectangle(cornerRadius: 28).strokeBorder(.white.opacity(0.9), lineWidth: 3))
        .shadow(color: .brown.opacity(0.15), radius: 18, y: 8)
    }

    private var board: some View {
        GeometryReader { geometry in
            let edge = min(geometry.size.width, geometry.size.height)
            let step = edge / CGFloat(game.size)
            ZStack(alignment: .topLeading) {
                RoundedRectangle(cornerRadius: 26).fill(Color(red: 0.99, green: 0.96, blue: 0.86).opacity(0.97))
                    .overlay(RoundedRectangle(cornerRadius: 26).strokeBorder(.white, lineWidth: 4))
                ForEach(0..<(game.size * game.size), id: \.self) { index in
                    Circle().fill(ink.opacity(0.055)).frame(width: step * 0.84, height: step * 0.84)
                        .position(point(index, step: step))
                }
                if let selected, !busy {
                    Path { path in
                        for neighbor in game.cells.indices where game.adjacent(selected, neighbor) {
                            path.move(to: point(selected, step: step))
                            path.addLine(to: point(neighbor, step: step))
                        }
                    }.stroke(ink.opacity(0.6), style: StrokeStyle(lineWidth: 3, lineCap: .round, dash: [4, 7]))
                        .allowsHitTesting(false)
                }
                ForEach(Array(game.cells.enumerated()), id: \.element.id) { index, marble in
                    Button { tap(index) } label: {
                        FairMarbleTile(kind: marble.kind, selected: selected == index, reduceMotion: reduceMotion)
                            .overlay(Circle().strokeBorder(Color.orange, lineWidth: hint?.from == index || hint?.to == index ? 5 : 0))
                            .padding(3)
                    }
                    .buttonStyle(.plain)
                    .frame(width: step * 0.90, height: step * 0.90)
                    .scaleEffect(fading.contains(index) ? 0.12 : 1)
                    .opacity(fading.contains(index) ? 0 : 1)
                    .position(point(rejectedSwap?.from == index ? rejectedSwap!.to : rejectedSwap?.to == index ? rejectedSwap!.from : index, step: step))
                    .disabled(busy || game.buddyTurn || game.status != .playing)
                    .accessibilityLabel("\(FairMarbleTile.names[marble.kind]), row \(index / game.size + 1), column \(index % game.size + 1)")
                    .accessibilityAddTraits(selected == index ? .isSelected : [])
                    .accessibilityIdentifier("fair.tile.\(index)")
                }
            }
            .frame(width: edge, height: edge)
            .shadow(color: .brown.opacity(0.22), radius: 16, y: 8)
            .position(x: geometry.size.width / 2, y: geometry.size.height / 2)
        }
    }

    private func point(_ index: Int, step: CGFloat) -> CGPoint {
        CGPoint(x: (CGFloat(index % game.size) + 0.5) * step, y: (CGFloat(index / game.size) + 0.5) * step)
    }

    private var resultCard: some View {
        ZStack {
            Color.black.opacity(0.25).ignoresSafeArea()
            VStack(spacing: 20) {
                Image(systemName: game.status == .won ? "sparkles" : "arrow.clockwise")
                    .font(.system(size: 68)).foregroundStyle(.orange)
                    .symbolEffect(.bounce, options: .nonRepeating, isActive: !reduceMotion)
                Text(game.status == .won ? "We did it!" : "Let's try again")
                    .font(.system(.largeTitle, design: .rounded, weight: .heavy))
                Text(game.status == .won ? "Ten matches together. The fair is yours!" : message)
                    .multilineTextAlignment(.center).font(.title3)
                if game.status == .won {
                    Button("Into the fair!", action: onWin).buttonStyle(.borderedProminent).tint(.teal)
                        .accessibilityIdentifier("fair.enter")
                } else {
                    Button("Fresh board", action: restart).buttonStyle(.borderedProminent).tint(.teal)
                        .accessibilityIdentifier("fair.retry")
                }
                Button("Back to playroom", action: onClose).buttonStyle(.bordered)
            }.padding(36).frame(maxWidth: 460)
                .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 32)).padding(24)
        }
    }

    private func restart() {
        turnTask?.cancel()
        game = FairMarbleGame(kinds: advanced ? 6 : 5)
        selected = nil; hint = nil; rejectedSwap = nil; fading = []; busy = false
        message = "Tap a marble, then its neighbor. Join 3 alike!"
    }

    private func tap(_ index: Int) {
        guard !busy, !game.buddyTurn, game.status == .playing else { return }
        guard let previous = selected else { selected = index; return }
        if previous == index { selected = nil; return }
        guard game.adjacent(previous, index) else { selected = index; return }
        let move = FairMarbleGame.Move(from: previous, to: index)
        guard game.legalMoves.contains(move) || game.legalMoves.contains(.init(from: index, to: previous)) else {
            message = "Those don't join three. Try another neighbor!"
            selected = nil
            busy = true
            turnTask = Task { @MainActor in
                do {
                    withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.2)) { rejectedSwap = move }
                    try await pause(260)
                    withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.2)) { rejectedSwap = nil }
                    try await pause(260)
                    busy = false
                } catch { }
            }
            return
        }
        turnTask = Task { @MainActor in await play(move) }
    }

    @MainActor private func pause(_ milliseconds: Int) async throws {
        try await Task.sleep(for: .milliseconds(reduceMotion ? min(milliseconds, 120) : milliseconds))
        while scenePhase != .active { try await Task.sleep(for: .milliseconds(200)) }
        try Task.checkCancellation()
    }

    @MainActor private func play(_ move: FairMarbleGame.Move) async {
        busy = true; hint = nil; selected = nil
        do {
            var accepted = false
            withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.28)) { accepted = game.swap(move) }
            guard accepted else { busy = false; return }
            try await pause(350)
            while !game.matches.isEmpty {
                withAnimation(reduceMotion ? nil : .easeIn(duration: 0.22)) { fading = game.matches }
                try await pause(260)
                withAnimation(reduceMotion ? nil : .spring(response: 0.45, dampingFraction: 0.8)) {
                    game.clearAndDrop(); fading = []
                }
                try await pause(500)
            }
            game.finishTurn()
            busy = false
            if game.status == .lost { message = "No more matches on this board. A new one is waiting!" }
            else if game.status == .won { message = "You and Pip opened the fair!"; onSolved() }
            else if game.buddyTurn {
                message = "Nice teamwork! Pip is finding a match…"
                try await pause(850)
                guard let next = game.legalMoves.first else { return }
                selected = next.from
                hint = next
                try await pause(550)
                await play(next)
            } else { message = "Your turn! Which marbles can you join?" }
        } catch { /* Leaving or restarting cancels the old board's animation. */ }
    }

    private func startBuddy() {
        guard let move = game.legalMoves.first else { return }
        turnTask?.cancel()
        turnTask = Task { @MainActor in await play(move) }
    }
}

private struct FairMarbleTile: View {
    let kind: Int
    let selected: Bool
    let reduceMotion: Bool
    static let names = ["Pink berry", "Golden sparkle", "Blue puff", "Green pebble", "Purple bolt", "Orange star"]
    private static let assets = ["bounceberry", "sparkle", "puff", "pebble", "zipbolt", "sparkle"]
    private static let colors: [Color] = [.pink, .yellow, .cyan, .green, .purple, .orange]
    var body: some View {
        TimelineView(.animation(minimumInterval: 0.06, paused: !selected || reduceMotion)) { context in
            let angle = selected && !reduceMotion ? sin(context.date.timeIntervalSinceReferenceDate * 32) * 9 : 0
            ZStack {
                Circle().fill(Self.colors[kind].gradient)
                Image("world2_orb_peglin_\(Self.assets[kind])").resizable().scaledToFit().padding(4)
                Circle().strokeBorder(selected ? .white : .white.opacity(0.5), lineWidth: selected ? 4 : 2)
            }
            .rotationEffect(.degrees(angle)).scaleEffect(selected ? 1.09 : 1)
            .shadow(color: Self.colors[kind].opacity(0.4), radius: selected ? 9 : 3, y: 3)
        }
    }
}

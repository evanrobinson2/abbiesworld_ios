//
//  World2ThreeBearsHouseView.swift
//  abbies.world.ios
//
//  Inside the Three Bears' house: the "Just Right" tasting game.
//
//  Built for a six year old. Three enormous tap targets, one question on screen
//  at a time, no timer, and no way to lose — a wrong taste gets a friendly bear
//  telling you which one it was and the round stays open. Finishing all three
//  rounds hands over the Bowl of Perfect Porridge.
//

import SwiftUI
import UIKit

struct World2ThreeBearsHouseView: View {
    let onExit: () -> Void
    let onComplete: (Bool) -> Void

    @State private var game = World2JustRightGame.make()
    @State private var feedback: World2JustRightFeedback?
    @State private var revealedBowlID: String?

    private let archetype = World2POIRegistry.threeBearsHouse

    var body: some View {
        ZStack {
            World2ThreeBearsRoomBackdrop()
                .ignoresSafeArea()

            VStack(spacing: 0) {
                topBar
                Spacer(minLength: 0)
                promptCard
                bowlRow
                Spacer(minLength: 0)
                progressRow
            }
            .padding(.horizontal, 22)
            .padding(.vertical, 16)

            if let feedback {
                World2BearSpeechBubble(feedback: feedback)
                    .transition(.scale(scale: 0.7).combined(with: .opacity))
                    .zIndex(30)
            }
        }
        .animation(.spring(response: 0.36, dampingFraction: 0.74), value: feedback)
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.threeBears.house")
        .onAppear {
            game = World2JustRightGame.make()
            World2Diagnostics.log(
                "just_right_started",
                ["rounds": "\(game.rounds.count)"]
            )
        }
    }

    // MARK: - Chrome

    private var topBar: some View {
        HStack(spacing: 12) {
            Button(action: onExit) {
                Image(systemName: "chevron.left")
                    .font(.system(size: 22, weight: .black))
                    .foregroundStyle(.white)
                    .frame(width: 54, height: 54)
                    .background(.brown.opacity(0.92), in: Circle())
                    .overlay(Circle().stroke(.white.opacity(0.7), lineWidth: 2))
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Leave the bears' house")
            .accessibilityIdentifier("world2.threeBears.exit")

            VStack(alignment: .leading, spacing: 1) {
                Text(archetype.name.uppercased())
                    .font(.system(size: 20, weight: .black, design: .rounded))
                Text("Tasting \(game.roundNumber) of \(game.rounds.count)")
                    .font(.system(size: 13, weight: .bold, design: .rounded))
                    .foregroundStyle(.white.opacity(0.82))
            }
            .foregroundStyle(.white)
            .padding(.horizontal, 16)
            .padding(.vertical, 9)
            .background(.black.opacity(0.42), in: RoundedRectangle(cornerRadius: 18))
            .accessibilityIdentifier("world2.threeBears.roundCounter")

            Spacer(minLength: 0)
        }
    }

    private var promptCard: some View {
        VStack(spacing: 6) {
            if let round = game.currentRound {
                Label(round.attribute.prompt, systemImage: round.attribute.symbolName)
                    .font(.system(size: 28, weight: .black, design: .rounded))
                    .multilineTextAlignment(.center)
                Text(round.attribute.hint)
                    .font(.system(size: 17, weight: .bold, design: .rounded))
                    .foregroundStyle(.white.opacity(0.85))
            } else {
                Label("The bears are so pleased!", systemImage: "sparkles")
                    .font(.system(size: 28, weight: .black, design: .rounded))
            }
        }
        .foregroundStyle(.white)
        .padding(.horizontal, 26)
        .padding(.vertical, 16)
        .background(.black.opacity(0.46), in: RoundedRectangle(cornerRadius: 26))
        .overlay(
            RoundedRectangle(cornerRadius: 26)
                .stroke(.white.opacity(0.32), lineWidth: 2)
        )
        .accessibilityIdentifier("world2.threeBears.prompt")
    }

    private var bowlRow: some View {
        GeometryReader { geometry in
            let bowlWidth = min(geometry.size.width / 3.4, 260)
            HStack(spacing: geometry.size.width * 0.03) {
                if let round = game.currentRound {
                    ForEach(round.bowls) { bowl in
                        bowlButton(bowl, round: round, width: bowlWidth)
                    }
                }
            }
            .frame(width: geometry.size.width, height: geometry.size.height)
        }
        .frame(height: 300)
        .overlay(alignment: .bottom) {
            World2TableEdge()
                .frame(height: 34)
                .offset(y: 12)
                .allowsHitTesting(false)
        }
    }

    private func bowlButton(
        _ bowl: World2JustRightBowl,
        round: World2JustRightRound,
        width: CGFloat
    ) -> some View {
        let isRevealed = revealedBowlID == bowl.id

        return Button {
            taste(bowl, in: round)
        } label: {
            VStack(spacing: 4) {
                World2PorridgeBowl(
                    level: bowl.level,
                    attribute: round.attribute
                )
                .frame(width: width, height: width)

                Text(isRevealed ? bowl.bear.displayName.uppercased() : "TASTE ME")
                    .font(.system(size: 14, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 8)
                    .background(
                        isRevealed
                            ? (bowl.isJustRight ? Color.green : Color.orange)
                            : Color.brown,
                        in: Capsule()
                    )
                    .overlay(Capsule().stroke(.white.opacity(0.7), lineWidth: 2))
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .scaleEffect(isRevealed ? 1.06 : 1.0)
        .accessibilityLabel("Taste this bowl")
        .accessibilityHint(round.attribute.hint)
        .accessibilityIdentifier("world2.threeBears.bowl.\(bowl.level.rawValue)")
    }

    private var progressRow: some View {
        HStack(spacing: 14) {
            ForEach(0..<game.rounds.count, id: \.self) { index in
                let isDone = index < game.roundIndex || game.isComplete
                Image(systemName: isDone ? "star.fill" : "star")
                    .font(.system(size: 30, weight: .black))
                    .foregroundStyle(isDone ? .yellow : .white.opacity(0.42))
                    .shadow(color: isDone ? .orange.opacity(0.8) : .clear, radius: 8)
            }
        }
        .padding(.horizontal, 22)
        .padding(.vertical, 12)
        .background(.black.opacity(0.34), in: Capsule())
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Tastings finished")
        .accessibilityValue("\(game.isComplete ? game.rounds.count : game.roundIndex) of \(game.rounds.count)")
        .accessibilityIdentifier("world2.threeBears.progress")
    }

    // MARK: - Interaction

    private func taste(_ bowl: World2JustRightBowl, in round: World2JustRightRound) {
        let outcome = game.taste(bowlID: bowl.id)
        revealedBowlID = bowl.id

        switch outcome {
        case .ignored:
            return

        case .tryAgain(let bear, let message):
            impact(.light)
            feedback = World2JustRightFeedback(
                id: UUID().uuidString,
                bear: bear,
                message: message,
                isGood: false
            )
            World2Diagnostics.log(
                "just_right_wrong_taste",
                ["attribute": round.attribute.rawValue, "level": bowl.level.rawValue]
            )
            clearFeedbackSoon(after: 1.7, alsoClearReveal: true)

        case .correct(let bear, let message):
            impact(.medium)
            feedback = World2JustRightFeedback(
                id: UUID().uuidString,
                bear: bear,
                message: message,
                isGood: true
            )
            World2Diagnostics.log(
                "just_right_round_cleared",
                ["attribute": round.attribute.rawValue, "round": "\(game.roundNumber)"]
            )
            clearFeedbackSoon(after: 1.5, alsoClearReveal: true)

        case .finished(let bear, let message, let tastedPerfectly):
            impact(.heavy)
            feedback = World2JustRightFeedback(
                id: UUID().uuidString,
                bear: bear,
                message: message,
                isGood: true
            )
            World2Diagnostics.log(
                "just_right_finished",
                ["perfect": "\(tastedPerfectly)", "wrong_tastes": "\(game.wrongTastes)"]
            )
            Task { @MainActor in
                try? await Task.sleep(for: .milliseconds(1300))
                onComplete(tastedPerfectly)
            }
        }
    }

    private func clearFeedbackSoon(after seconds: Double, alsoClearReveal: Bool) {
        Task { @MainActor in
            try? await Task.sleep(for: .seconds(seconds))
            feedback = nil
            if alsoClearReveal {
                revealedBowlID = nil
            }
        }
    }

    private func impact(_ style: UIImpactFeedbackGenerator.FeedbackStyle) {
        guard PlayerStateService.shared.currentPlayer?.settings.hapticFeedbackEnabled ?? true
        else { return }
        UIImpactFeedbackGenerator(style: style).impactOccurred()
    }
}

struct World2JustRightFeedback: Identifiable, Equatable {
    let id: String
    let bear: World2Bear
    let message: String
    let isGood: Bool
}

private struct World2BearSpeechBubble: View {
    let feedback: World2JustRightFeedback

    var body: some View {
        VStack(spacing: 10) {
            Image(systemName: feedback.isGood ? "checkmark.circle.fill" : feedback.bear.symbolName)
                .font(.system(size: 46, weight: .black))
                .foregroundStyle(feedback.isGood ? .green : .orange)

            Text(feedback.message)
                .font(.system(size: 24, weight: .black, design: .rounded))
                .multilineTextAlignment(.center)
                .foregroundStyle(.primary)
        }
        .padding(.horizontal, 34)
        .padding(.vertical, 26)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 30))
        .overlay(
            RoundedRectangle(cornerRadius: 30)
                .stroke(feedback.isGood ? .green : .orange, lineWidth: 4)
        )
        .shadow(color: .black.opacity(0.3), radius: 22, y: 8)
        .padding(.horizontal, 40)
        .accessibilityAddTraits(.isStaticText)
        .accessibilityLabel(feedback.message)
        .accessibilityIdentifier("world2.threeBears.feedback")
    }
}

/// The front edge of the table the bowls sit on.
private struct World2TableEdge: View {
    var body: some View {
        LinearGradient(
            colors: [
                Color(red: 0.62, green: 0.42, blue: 0.26),
                Color(red: 0.42, green: 0.27, blue: 0.16),
            ],
            startPoint: .top,
            endPoint: .bottom
        )
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(.black.opacity(0.22), lineWidth: 1.5)
        )
        .shadow(color: .black.opacity(0.35), radius: 10, y: 5)
        .accessibilityHidden(true)
    }
}

/// A warm cottage room: plank walls, a window onto the woods, three chairs.
private struct World2ThreeBearsRoomBackdrop: View {
    var body: some View {
        GeometryReader { geometry in
            let size = geometry.size
            ZStack {
                LinearGradient(
                    colors: [
                        Color(red: 0.55, green: 0.38, blue: 0.25),
                        Color(red: 0.36, green: 0.24, blue: 0.16),
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )

                planks(in: size)
                window(in: size)
                chairs(in: size)

                LinearGradient(
                    colors: [.clear, .black.opacity(0.34)],
                    startPoint: .center,
                    endPoint: .bottom
                )
            }
            .frame(width: size.width, height: size.height)
        }
        .accessibilityLabel("A cozy wooden cottage room with a window onto the woods")
        .accessibilityIdentifier("world2.threeBears.room")
    }

    private func planks(in size: CGSize) -> some View {
        VStack(spacing: 0) {
            ForEach(0..<9, id: \.self) { index in
                Rectangle()
                    .fill(.black.opacity(index.isMultiple(of: 2) ? 0.05 : 0.0))
                    .frame(height: size.height / 9)
                    .overlay(alignment: .bottom) {
                        Rectangle()
                            .fill(.black.opacity(0.12))
                            .frame(height: 1.5)
                    }
            }
        }
    }

    private func window(in size: CGSize) -> some View {
        let width = size.width * 0.22
        return ZStack {
            RoundedRectangle(cornerRadius: 12)
                .fill(
                    LinearGradient(
                        colors: [
                            Color(red: 0.99, green: 0.83, blue: 0.56),
                            Color(red: 0.55, green: 0.72, blue: 0.62),
                        ],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(red: 0.34, green: 0.22, blue: 0.14), lineWidth: 8)
            Rectangle()
                .fill(Color(red: 0.34, green: 0.22, blue: 0.14))
                .frame(width: 7)
            Rectangle()
                .fill(Color(red: 0.34, green: 0.22, blue: 0.14))
                .frame(height: 7)
        }
        .frame(width: width, height: width * 0.86)
        .position(x: size.width * 0.82, y: size.height * 0.26)
        .shadow(color: .black.opacity(0.3), radius: 10, y: 4)
    }

    private func chairs(in size: CGSize) -> some View {
        let heights: [Double] = [0.20, 0.16, 0.12]
        return ZStack {
            ForEach(heights.indices, id: \.self) { index in
                let height = size.height * heights[index]
                RoundedRectangle(cornerRadius: 8)
                    .fill(Color(red: 0.48, green: 0.31, blue: 0.19))
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(.black.opacity(0.2), lineWidth: 1.5)
                    )
                    .frame(width: height * 0.62, height: height)
                    .position(
                        x: size.width * (0.16 + 0.10 * Double(index)),
                        y: size.height * 0.52
                    )
            }
        }
        .accessibilityHidden(true)
    }
}

#Preview {
    World2ThreeBearsHouseView(onExit: {}, onComplete: { _ in })
}

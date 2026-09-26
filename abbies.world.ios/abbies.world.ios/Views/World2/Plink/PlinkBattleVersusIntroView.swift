import SwiftUI

/// Pre-board splash: comic **COMING TO RESCUE** — bad-guy cluster vs hostage to free.
/// Not a VS duel. Cutaway then reveals the Peggle board.
struct PlinkBattleVersusIntroView: View {
    var title: String
    var enemyKind: PeglinEnemyKind?
    /// Named crew / wave foes shown under BAD GUYS.
    var badGuys: [PlinkAttackerKind] = PlinkAttackerKind.namedCrew
    /// Highlighted member in the cluster (current wave / mini / big boss).
    var focusBadGuy: PlinkAttackerKind? = nil
    var reduceMotion: Bool
    /// Fired at the cutaway midpoint — start battle music + reveal board.
    var onRevealBoard: () -> Void
    var onFinished: () -> Void

    private enum Beat: Equatable {
        case enter
        case hold
        case cutaway
        case done
    }

    private enum Cutaway: CaseIterable {
        case irisBurst
        case comicSlash
        case panelSlam
        case starburst
        case ribbonSweep
    }

    @State private var beat: Beat = .enter
    @State private var badGuysX: CGFloat = -1.2
    @State private var rescueX: CGFloat = 1.2
    @State private var bubbleOpacity: Double = 0
    @State private var stampScale: CGFloat = 0.2
    @State private var stampOpacity: Double = 0
    @State private var cutaway: Cutaway = Cutaway.allCases.randomElement() ?? .irisBurst
    @State private var cutProgress: CGFloat = 0
    @State private var overlayOpacity: Double = 1
    /// Bumped on skip/finish so stale `asyncAfter` beats from `runSequence` no-op.
    @State private var sequenceGeneration = 0
    @Environment(\.accessibilityReduceMotion) private var envReduceMotion

    private var motionOff: Bool { reduceMotion || envReduceMotion }

    private var rescueName: String {
        enemyKind?.displayName ?? "Friend"
    }

    private var rescueBlurb: String {
        [
            "Trapped in the cage!",
            "Needs Abbie NOW!",
            "Hold on — help is coming!",
            "Don’t let the gang win!",
        ].randomElement() ?? "Needs Abbie NOW!"
    }

    private var badGuysBlurb: String {
        let focus = focusBadGuy?.shortName ?? badGuys.first?.shortName ?? "Punks"
        return [
            "\(focus)’s crew · no fair!",
            "Bad guys blocking the path!",
            "They rattled the cage!",
            "Outlaws on the climb!",
        ].randomElement() ?? "Bad guys blocking the path!"
    }

    var body: some View {
        GeometryReader { geo in
            let figH = min(geo.size.height * 0.48, 300)
            ZStack {
                Color.black.opacity(0.55 * overlayOpacity)
                    .ignoresSafeArea()

                LinearGradient(
                    colors: [
                        Color(red: 0.55, green: 0.18, blue: 0.12).opacity(0.4),
                        .clear,
                        Color(red: 0.12, green: 0.45, blue: 0.55).opacity(0.4),
                    ],
                    startPoint: .leading,
                    endPoint: .trailing
                )
                .ignoresSafeArea()
                .opacity(overlayOpacity)

                VStack(spacing: 0) {
                    Text(title.uppercased())
                        .font(.system(size: 14, weight: .black, design: .rounded))
                        .tracking(2)
                        .foregroundStyle(.white.opacity(0.75))
                        .padding(.top, 18)

                    Spacer(minLength: 8)

                    ZStack {
                        // Comic center stamp — rescue, not VS
                        VStack(spacing: 4) {
                            Text("COMING TO")
                                .font(.system(size: 18, weight: .black, design: .rounded))
                                .tracking(2)
                                .foregroundStyle(.white.opacity(0.9))
                            Text("RESCUE!")
                                .font(.system(size: 48, weight: .black, design: .rounded))
                                .foregroundStyle(
                                    LinearGradient(
                                        colors: [
                                            Color(red: 0.45, green: 0.95, blue: 1),
                                            Color(red: 0.35, green: 0.85, blue: 0.55),
                                        ],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                                .shadow(color: .black.opacity(0.55), radius: 10, y: 4)
                        }
                        .padding(.horizontal, 18)
                        .padding(.vertical, 12)
                        .background(
                            RoundedRectangle(cornerRadius: 18, style: .continuous)
                                .fill(Color.black.opacity(0.55))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                                        .stroke(Color.white.opacity(0.85), lineWidth: 3)
                                )
                        )
                        .rotationEffect(.degrees(-4))
                        .scaleEffect(stampScale)
                        .opacity(stampOpacity)
                        .offset(y: -figH * 0.06)
                        .zIndex(2)

                        HStack(alignment: .bottom, spacing: 0) {
                            badGuysColumn(figH: figH)
                                .offset(x: badGuysX * geo.size.width * 0.38)

                            Spacer(minLength: 8)

                            rescueColumn(figH: figH)
                                .offset(x: rescueX * geo.size.width * 0.38)
                        }
                        .padding(.horizontal, 20)
                    }
                    .frame(maxHeight: .infinity)

                    Text("Defeat every bad guy · free the friend")
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                        .foregroundStyle(.white.opacity(0.55))
                        .padding(.bottom, 22)
                        .opacity(beat == .hold ? 1 : 0)

                    Text("Tap to skip")
                        .font(.system(size: 13, weight: .semibold, design: .rounded))
                        .foregroundStyle(.white.opacity(0.4))
                        .padding(.bottom, 10)
                        .opacity(beat == .hold || beat == .enter ? 1 : 0)
                }
                .opacity(overlayOpacity)

                cutawayOverlay(in: geo.size)
                    .allowsHitTesting(false)
            }
            .contentShape(Rectangle())
            .onTapGesture {
                guard beat != .cutaway, beat != .done else { return }
                finishFast()
            }
        }
        .accessibilityIdentifier("world2.plink.battle.versus")
        .accessibilityLabel("Coming to rescue \(rescueName) from the bad guys")
        .accessibilityAddTraits(.isButton)
        .accessibilityHint("Double tap to skip")
        .onAppear { runSequence() }
    }

    private func badGuysColumn(figH: CGFloat) -> some View {
        let focus = focusBadGuy ?? badGuys.first
        let portrait = min(figH * 0.42, 120)
        return VStack(spacing: 10) {
            comicHighlight(label: "BAD GUYS:", tint: Color(red: 1, green: 0.45, blue: 0.28))
                .opacity(bubbleOpacity)

            comicBubble(text: badGuysBlurb, tint: Color(red: 1, green: 0.45, blue: 0.28), leading: true)
                .opacity(bubbleOpacity)

            HStack(alignment: .bottom, spacing: -10) {
                ForEach(Array(badGuys.prefix(4).enumerated()), id: \.element.id) { index, kind in
                    let isFocus = kind == focus
                    PlinkAttackerBattlePortrait(
                        kind: kind,
                        pose: .idle,
                        size: isFocus ? portrait * 1.15 : portrait * 0.85
                    )
                    .zIndex(isFocus ? 10 : Double(index))
                    .offset(y: isFocus ? 0 : CGFloat(index % 2 == 0 ? 8 : -4))
                    .rotationEffect(.degrees(isFocus ? -3 : (index.isMultiple(of: 2) ? -6 : 5)))
                }
            }
            .frame(height: portrait * 1.35)

            Text(focus?.displayName ?? "Gang")
                .font(.system(size: 20, weight: .black, design: .rounded))
                .foregroundStyle(.white)
                .padding(.horizontal, 14)
                .padding(.vertical, 6)
                .background(Color(red: 1, green: 0.45, blue: 0.28).opacity(0.9), in: Capsule())
                .overlay(Capsule().stroke(.white.opacity(0.7), lineWidth: 2))
        }
        .frame(maxWidth: .infinity)
    }

    private func rescueColumn(figH: CGFloat) -> some View {
        VStack(spacing: 10) {
            comicHighlight(label: "RESCUE:", tint: Color(red: 0.4, green: 0.9, blue: 0.85))
                .opacity(bubbleOpacity)

            comicBubble(text: rescueBlurb, tint: Color(red: 0.4, green: 0.9, blue: 0.85), leading: false)
                .opacity(bubbleOpacity)

            ZStack(alignment: .bottomLeading) {
                if let enemyKind {
                    PeglinEnemyFigurine(kind: enemyKind, size: figH * 0.92)
                } else {
                    Image(systemName: "heart.circle.fill")
                        .font(.system(size: figH * 0.35, weight: .black))
                        .foregroundStyle(.white)
                        .frame(width: figH * 0.75, height: figH)
                }
                PeglinAbbieFightSprite(size: figH * 0.42)
                    .offset(x: -figH * 0.08, y: figH * 0.06)
                    .accessibilityHidden(true)
            }

            Text(rescueName)
                .font(.system(size: 22, weight: .black, design: .rounded))
                .foregroundStyle(.white)
                .padding(.horizontal, 14)
                .padding(.vertical, 6)
                .background(Color(red: 0.35, green: 0.75, blue: 0.85).opacity(0.9), in: Capsule())
                .overlay(Capsule().stroke(.white.opacity(0.7), lineWidth: 2))
        }
        .frame(maxWidth: .infinity)
    }

    private func comicHighlight(label: String, tint: Color) -> some View {
        Text(label)
            .font(.system(size: 16, weight: .black, design: .rounded))
            .tracking(1.5)
            .foregroundStyle(.white)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(
                UnevenRoundedRectangle(
                    cornerRadii: .init(topLeading: 4, bottomLeading: 14, bottomTrailing: 4, topTrailing: 14),
                    style: .continuous
                )
                .fill(tint)
            )
            .overlay(
                UnevenRoundedRectangle(
                    cornerRadii: .init(topLeading: 4, bottomLeading: 14, bottomTrailing: 4, topTrailing: 14),
                    style: .continuous
                )
                .stroke(.white, lineWidth: 2.5)
            )
            .rotationEffect(.degrees(label.hasPrefix("BAD") ? -3 : 3))
            .shadow(color: tint.opacity(0.55), radius: 6, y: 2)
    }

    private func comicBubble(text: String, tint: Color, leading: Bool) -> some View {
        Text(text)
            .font(.system(size: 15, weight: .heavy, design: .rounded))
            .foregroundStyle(.white)
            .multilineTextAlignment(leading ? .leading : .trailing)
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .fill(Color.black.opacity(0.72))
                    .overlay(
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .stroke(tint, lineWidth: 3)
                    )
            )
            .shadow(color: tint.opacity(0.45), radius: 8, y: 2)
            .frame(maxWidth: 220, alignment: leading ? .leading : .trailing)
    }

    @ViewBuilder
    private func cutawayOverlay(in size: CGSize) -> some View {
        // Must stay invisible until `.cutaway` — at cutProgress 0 most styles are solid black
        // and were covering the whole COMING TO RESCUE banner from frame one.
        let active = beat == .cutaway || beat == .done
        let p = max(0, min(1, cutProgress))
        Group {
            switch cutaway {
            case .irisBurst:
                ZStack {
                    Color.black.opacity(p < 0.98 ? 0.95 : 0)
                    Circle()
                        .fill(Color.white)
                        .frame(
                            width: max(1, size.width * 2.6 * p),
                            height: max(1, size.width * 2.6 * p)
                        )
                        .blendMode(.destinationOut)
                }
                .compositingGroup()
            case .comicSlash:
                ZStack {
                    Color.black.opacity((1 - p) * 0.95)
                    Rectangle()
                        .fill(
                            LinearGradient(
                                colors: [.clear, .white, .clear],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(width: size.width * 1.4, height: size.height * 0.18)
                        .rotationEffect(.degrees(-28))
                        .offset(x: (p - 0.5) * size.width * 1.6)
                        .opacity(0.9)
                }
            case .panelSlam:
                HStack(spacing: 0) {
                    Color.black.opacity(0.97)
                        .frame(width: size.width * 0.5 * (1 - p))
                    Spacer(minLength: 0)
                    Color.black.opacity(0.97)
                        .frame(width: size.width * 0.5 * (1 - p))
                }
            case .starburst:
                ZStack {
                    Color.black.opacity((1 - p) * 0.92)
                    ForEach(0..<10, id: \.self) { i in
                        Capsule()
                            .fill(Color.white.opacity(0.85))
                            .frame(width: 18, height: size.height * 0.55 * p)
                            .offset(y: -size.height * 0.12)
                            .rotationEffect(.degrees(Double(i) * 36))
                    }
                }
            case .ribbonSweep:
                ZStack {
                    Color.black.opacity((1 - p) * 0.9)
                    Capsule()
                        .fill(
                            LinearGradient(
                                colors: [
                                    Color(red: 0.4, green: 0.9, blue: 1).opacity(0.95),
                                    Color(red: 0.35, green: 0.85, blue: 0.55).opacity(0.9),
                                ],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(width: size.width * 1.3, height: size.height * 0.22)
                        .rotationEffect(.degrees(8))
                        .offset(x: (p - 0.5) * size.width * 1.8)
                }
            }
        }
        .opacity(active ? 1 : 0)
        .ignoresSafeArea()
        .allowsHitTesting(false)
    }

    private func runSequence() {
        cutaway = Cutaway.allCases.randomElement() ?? .irisBurst
        let gen = sequenceGeneration
        if motionOff {
            badGuysX = 0
            rescueX = 0
            stampScale = 1
            stampOpacity = 1
            bubbleOpacity = 1
            beat = .hold
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.55) {
                guard gen == sequenceGeneration else { return }
                finishFast()
            }
            return
        }

        beat = .enter
        withAnimation(.spring(response: 0.55, dampingFraction: 0.78)) {
            badGuysX = 0
            rescueX = 0
        }
        withAnimation(.spring(response: 0.42, dampingFraction: 0.65).delay(0.18)) {
            stampScale = 1
            stampOpacity = 1
        }
        withAnimation(.easeOut(duration: 0.35).delay(0.32)) {
            bubbleOpacity = 1
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 1.15) {
            guard gen == sequenceGeneration, beat == .enter else { return }
            beat = .hold
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.85) {
            guard gen == sequenceGeneration, beat == .hold || beat == .enter else { return }
            beat = .cutaway
            cutProgress = 0
            withAnimation(.easeIn(duration: 0.55)) {
                cutProgress = 1
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.28) {
                guard gen == sequenceGeneration else { return }
                onRevealBoard()
            }
            withAnimation(.easeOut(duration: 0.35).delay(0.35)) {
                overlayOpacity = 0
            }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.55) {
            guard gen == sequenceGeneration else { return }
            beat = .done
            onFinished()
        }
    }

    private func finishFast() {
        guard beat != .cutaway, beat != .done else { return }
        sequenceGeneration += 1
        beat = .cutaway
        cutProgress = 1
        onRevealBoard()
        withAnimation(.easeOut(duration: 0.18)) {
            overlayOpacity = 0
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.22) {
            beat = .done
            onFinished()
        }
    }
}

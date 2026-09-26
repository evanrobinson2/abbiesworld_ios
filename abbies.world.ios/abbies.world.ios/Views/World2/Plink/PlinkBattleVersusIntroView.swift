import SwiftUI

/// Pre-board splash: 2D figurines slide in with comic blurbs, then a random
/// cutaway effect reveals the Peggle board (caller shifts music on reveal).
struct PlinkBattleVersusIntroView: View {
    var title: String
    var enemyKind: PeglinEnemyKind?
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
    @State private var abbieX: CGFloat = -1.2
    @State private var foeX: CGFloat = 1.2
    @State private var bubbleOpacity: Double = 0
    @State private var vsScale: CGFloat = 0.2
    @State private var vsOpacity: Double = 0
    @State private var cutaway: Cutaway = Cutaway.allCases.randomElement() ?? .irisBurst
    @State private var cutProgress: CGFloat = 0
    @State private var overlayOpacity: Double = 1
    @Environment(\.accessibilityReduceMotion) private var envReduceMotion

    private var motionOff: Bool { reduceMotion || envReduceMotion }

    private var abbieBlurb: String {
        [
            "Abbie · Orb Ace!",
            "Parbles locked · courage high!",
            "Heartbeat hero of Crash World!",
            "Ready to plink!",
        ].randomElement() ?? "Abbie · Orb Ace!"
    }

    private var foeBlurb: String {
        enemyKind?.versusBlurb ?? "Mystery spirit · watch the pegs!"
    }

    private var foeName: String {
        enemyKind?.displayName ?? "Spirit"
    }

    var body: some View {
        GeometryReader { geo in
            let figH = min(geo.size.height * 0.55, 340)
            ZStack {
                // Dimmed plate already shows behind via parent — deepen for comic read.
                Color.black.opacity(0.55)
                    .ignoresSafeArea()

                // Soft vignette + speed-line hints
                LinearGradient(
                    colors: [
                        Color(red: 0.15, green: 0.25, blue: 0.45).opacity(0.35),
                        .clear,
                        Color(red: 0.45, green: 0.12, blue: 0.28).opacity(0.35),
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
                        Text("VS")
                            .font(.system(size: 72, weight: .black, design: .rounded))
                            .foregroundStyle(
                                LinearGradient(
                                    colors: [
                                        Color(red: 1, green: 0.85, blue: 0.35),
                                        Color(red: 1, green: 0.35, blue: 0.45),
                                    ],
                                    startPoint: .top,
                                    endPoint: .bottom
                                )
                            )
                            .shadow(color: .black.opacity(0.55), radius: 10, y: 4)
                            .scaleEffect(vsScale)
                            .opacity(vsOpacity)
                            .offset(y: -figH * 0.08)

                        HStack(spacing: 0) {
                            fighterColumn(
                                name: "Abbie",
                                blurb: abbieBlurb,
                                tint: Color(red: 0.4, green: 0.85, blue: 0.55),
                                bubbleLeading: true
                            ) {
                                PeglinAbbieFightSprite(size: figH)
                            }
                            .offset(x: abbieX * geo.size.width * 0.42)

                            Spacer(minLength: 12)

                            fighterColumn(
                                name: foeName,
                                blurb: foeBlurb,
                                tint: Color(red: 0.9, green: 0.45, blue: 0.7),
                                bubbleLeading: false
                            ) {
                                if let enemyKind {
                                    PeglinEnemyFigurine(kind: enemyKind, size: figH * 0.92)
                                } else {
                                    Image(systemName: "sparkles")
                                        .font(.system(size: figH * 0.35, weight: .black))
                                        .foregroundStyle(.white)
                                        .frame(width: figH * 0.75, height: figH)
                                }
                            }
                            .offset(x: foeX * geo.size.width * 0.42)
                        }
                        .padding(.horizontal, 24)
                    }
                    .frame(maxHeight: .infinity)

                    Text("Get ready…")
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                        .foregroundStyle(.white.opacity(0.55))
                        .padding(.bottom, 22)
                        .opacity(beat == .hold ? 1 : 0)
                }
                .opacity(overlayOpacity)

                cutawayOverlay(in: geo.size)
                    .allowsHitTesting(false)
            }
        }
        .accessibilityIdentifier("world2.plink.battle.versus")
        .onAppear { runSequence() }
    }

    private func fighterColumn<Sprite: View>(
        name: String,
        blurb: String,
        tint: Color,
        bubbleLeading: Bool,
        @ViewBuilder sprite: () -> Sprite
    ) -> some View {
        VStack(spacing: 10) {
            comicBubble(text: blurb, tint: tint, leading: bubbleLeading)
                .opacity(bubbleOpacity)
                .offset(y: bubbleOpacity == 1 ? 0 : 12)

            sprite()

            Text(name)
                .font(.system(size: 22, weight: .black, design: .rounded))
                .foregroundStyle(.white)
                .padding(.horizontal, 14)
                .padding(.vertical, 6)
                .background(tint.opacity(0.85), in: Capsule())
                .overlay(Capsule().stroke(.white.opacity(0.7), lineWidth: 2))
        }
        .frame(maxWidth: .infinity)
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
                .opacity(p > 0 ? 1 : 0)

            case .comicSlash:
                ZStack {
                    Color.black.opacity(Double(min(1, p * 1.35)) * (p < 0.92 ? 1 : 0))
                    ForEach(0..<7, id: \.self) { i in
                        Rectangle()
                            .fill(Color.white)
                            .frame(width: size.width * 1.6, height: 18 + CGFloat(i % 3) * 6)
                            .rotationEffect(.degrees(-28))
                            .offset(
                                x: -size.width + size.width * 2.2 * p,
                                y: CGFloat(i - 3) * 36
                            )
                            .opacity(Double(max(0, 1 - abs(p - 0.5) * 1.8)))
                    }
                }

            case .panelSlam:
                ZStack {
                    Color.white.opacity(p > 0.12 && p < 0.5 ? 0.9 : 0)
                    HStack(spacing: 0) {
                        Color.black
                            .frame(width: max(0, size.width * 0.5 * (1 - p)))
                        Spacer(minLength: 0)
                        Color.black
                            .frame(width: max(0, size.width * 0.5 * (1 - p)))
                    }
                }

            case .starburst:
                ZStack {
                    Color.black.opacity(Double(min(1, p * 1.15)) * (p < 0.9 ? 1 : 0))
                    Image(systemName: "seal.fill")
                        .resizable()
                        .scaledToFit()
                        .foregroundStyle(.white)
                        .frame(width: max(40, size.width * (0.15 + 2.5 * p)))
                        .rotationEffect(.degrees(Double(p) * 110))
                        .opacity(Double(max(0, 1.05 - p)))
                }

            case .ribbonSweep:
                ZStack {
                    Color.black.opacity(Double(min(0.95, p * 1.1)) * (p < 0.92 ? 1 : 0))
                    ForEach(0..<5, id: \.self) { i in
                        Capsule()
                            .fill(
                                [
                                    Color(red: 1, green: 0.4, blue: 0.55),
                                    Color(red: 0.4, green: 0.85, blue: 1),
                                    Color(red: 1, green: 0.85, blue: 0.35),
                                ][i % 3]
                            )
                            .frame(width: size.width * 1.3, height: size.height * 0.18)
                            .rotationEffect(.degrees(-12 + Double(i) * 8))
                            .offset(x: -size.width + size.width * 2.4 * p)
                            .opacity(0.92)
                    }
                }
            }
        }
        .ignoresSafeArea()
        .opacity(p > 0 ? 1 : 0)
    }

    private func runSequence() {
        cutaway = Cutaway.allCases.randomElement() ?? .irisBurst
        PlinkSFX.play(.launch)

        if motionOff {
            abbieX = 0
            foeX = 0
            bubbleOpacity = 1
            vsScale = 1
            vsOpacity = 1
            beat = .hold
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.45) {
                fireCutaway()
            }
            return
        }

        beat = .enter
        withAnimation(.spring(response: 0.55, dampingFraction: 0.78)) {
            abbieX = 0
            foeX = 0
        }
        withAnimation(.spring(response: 0.4, dampingFraction: 0.7).delay(0.18)) {
            vsScale = 1
            vsOpacity = 1
        }
        withAnimation(.easeOut(duration: 0.35).delay(0.32)) {
            bubbleOpacity = 1
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 1.35) {
            beat = .hold
            PlinkSFX.play(.crit)
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.05) {
            fireCutaway()
        }
    }

    private func fireCutaway() {
        beat = .cutaway
        PlinkSFX.play(.pop)
        cutProgress = 0

        let duration: Double = motionOff ? 0.35 : 0.72
        withAnimation(.easeIn(duration: duration * 0.45)) {
            cutProgress = 0.45
        }

        // Midpoint — board + battle music.
        DispatchQueue.main.asyncAfter(deadline: .now() + duration * 0.42) {
            onRevealBoard()
            withAnimation(.easeOut(duration: duration * 0.55)) {
                cutProgress = 1
                overlayOpacity = 0
            }
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + duration + 0.12) {
            beat = .done
            onFinished()
        }
    }
}

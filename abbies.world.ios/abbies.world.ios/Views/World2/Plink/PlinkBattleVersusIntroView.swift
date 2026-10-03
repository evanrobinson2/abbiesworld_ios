import SwiftUI

/// Pre-board splash: one fight cue — who you’re facing, then cut to the peg board.
/// No rescue comic, no scrap titles, no stacked CREEP WAVE / bubble / ×N labels.
struct PlinkBattleVersusIntroView: View {
    var enemyKind: PeglinEnemyKind?
    /// Exact attackers in this fight (lead / highest-rank first).
    var badGuys: [PlinkAttackerKind] = []
    /// Lead foe highlighted (usually `badGuys.first`).
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
    @State private var cardScale: CGFloat = 0.86
    @State private var cardOpacity: Double = 0
    @State private var cutaway: Cutaway = Cutaway.allCases.randomElement() ?? .irisBurst
    @State private var cutProgress: CGFloat = 0
    @State private var overlayOpacity: Double = 1
    /// Bumped on skip/finish so stale `asyncAfter` beats from `runSequence` no-op.
    @State private var sequenceGeneration = 0
    @Environment(\.accessibilityReduceMotion) private var envReduceMotion

    private var motionOff: Bool { reduceMotion || envReduceMotion }

    private var focus: PlinkAttackerKind? { focusBadGuy ?? badGuys.first }

    private var uniqueKinds: Set<PlinkAttackerKind> { Set(badGuys) }

    private var uniformWave: Bool { badGuys.count > 1 && uniqueKinds.count == 1 }

    private var castHeadline: String {
        guard let focus else { return "Fight" }
        if badGuys.count <= 1 { return focus.displayName }
        if uniformWave { return "\(focus.shortName) ×\(badGuys.count)" }
        let extras = badGuys.count - 1
        return "\(focus.shortName) + \(extras)"
    }

    private var accessibilityCast: String {
        if badGuys.isEmpty { return "Fight" }
        if badGuys.count == 1 {
            return "Facing \(badGuys[0].displayName)"
        }
        if uniformWave {
            return "Facing \(badGuys.count) \(focus?.displayName ?? badGuys[0].displayName)"
        }
        let names = Set(badGuys.map(\.displayName)).sorted().joined(separator: ", ")
        return "Facing \(names). Lead \(focus?.displayName ?? badGuys[0].displayName)"
    }

    var body: some View {
        GeometryReader { geo in
            let portrait = min(geo.size.height * 0.38, 220)
            ZStack {
                // Light veil — keep the fight plate readable behind the cue.
                Color.black.opacity(0.38 * overlayOpacity)
                    .ignoresSafeArea()

                VStack(spacing: 14) {
                    Spacer(minLength: 12)

                    cueCard(portrait: portrait)
                        .scaleEffect(cardScale)
                        .opacity(cardOpacity)
                        .frame(maxWidth: min(geo.size.width * 0.72, 520))

                    if beat == .hold || beat == .enter {
                        Text("Tap to skip")
                            .font(.system(size: 13, weight: .semibold, design: .rounded))
                            .foregroundStyle(.white.opacity(0.45))
                    }

                    Spacer(minLength: 12)
                }
                .padding(.horizontal, 28)
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
        .accessibilityLabel(accessibilityCast)
        .accessibilityAddTraits(.isButton)
        .accessibilityHint("Double tap to skip")
        .onAppear { runSequence() }
    }

    private func cueCard(portrait: CGFloat) -> some View {
        let displayCast: [PlinkAttackerKind] = {
            if uniformWave || badGuys.count <= 1 {
                if let focus { return [focus] }
                return Array(badGuys.prefix(1))
            }
            return Array(badGuys.prefix(3))
        }()

        return VStack(spacing: 16) {
            Text("FIGHT")
                .font(.system(size: 13, weight: .black, design: .rounded))
                .tracking(3)
                .foregroundStyle(Color(red: 1, green: 0.55, blue: 0.32))

            Group {
                if displayCast.count <= 1, let only = displayCast.first {
                    PlinkAttackerBattlePortrait(
                        kind: only,
                        pose: .idle,
                        size: portrait
                    )
                } else {
                    HStack(alignment: .bottom, spacing: -18) {
                        ForEach(Array(displayCast.enumerated()), id: \.offset) { index, kind in
                            let isFocus = kind == focus || index == 0
                            PlinkAttackerBattlePortrait(
                                kind: kind,
                                pose: .idle,
                                size: isFocus ? portrait * 0.92 : portrait * 0.68
                            )
                            .zIndex(isFocus ? 10 : Double(displayCast.count - index))
                            .offset(y: isFocus ? 0 : 8)
                        }
                    }
                }
            }

            Text(castHeadline)
                .font(.system(size: 28, weight: .black, design: .rounded))
                .foregroundStyle(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.65)

            if let enemyKind {
                HStack(spacing: 10) {
                    PeglinEnemyFigurine(kind: enemyKind, size: 44)
                    Text(enemyKind.displayName)
                        .font(.system(size: 15, weight: .bold, design: .rounded))
                        .foregroundStyle(.white.opacity(0.78))
                        .lineLimit(1)
                }
                .accessibilityLabel("Friend on the board: \(enemyKind.displayName)")
            }
        }
        .padding(.horizontal, 28)
        .padding(.vertical, 22)
        .frame(maxWidth: .infinity)
        .background(
            RoundedRectangle(cornerRadius: 28, style: .continuous)
                .fill(Color.black.opacity(0.72))
                .overlay(
                    RoundedRectangle(cornerRadius: 28, style: .continuous)
                        .stroke(Color.white.opacity(0.22), lineWidth: 2)
                )
        )
        .shadow(color: .black.opacity(0.45), radius: 18, y: 8)
        .accessibilityElement(children: .combine)
    }

    @ViewBuilder
    private func cutawayOverlay(in size: CGSize) -> some View {
        // Invisible until `.cutaway` — at cutProgress 0 most styles are solid black.
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
            cardScale = 1
            cardOpacity = 1
            beat = .hold
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.45) {
                guard gen == sequenceGeneration else { return }
                finishFast()
            }
            return
        }

        beat = .enter
        withAnimation(.spring(response: 0.48, dampingFraction: 0.82)) {
            cardScale = 1
            cardOpacity = 1
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + MarbleVoyageDesignRules.versusRescueHoldStartsAt) {
            guard gen == sequenceGeneration, beat == .enter else { return }
            beat = .hold
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + MarbleVoyageDesignRules.versusRescueCutawayStartsAt) {
            guard gen == sequenceGeneration, beat == .hold || beat == .enter else { return }
            beat = .cutaway
            cutProgress = 0
            withAnimation(.easeIn(duration: 0.55)) {
                cutProgress = 1
            }
            let revealDelay = MarbleVoyageDesignRules.versusRescueBoardRevealAt
                - MarbleVoyageDesignRules.versusRescueCutawayStartsAt
            DispatchQueue.main.asyncAfter(deadline: .now() + revealDelay) {
                guard gen == sequenceGeneration else { return }
                onRevealBoard()
            }
            withAnimation(.easeOut(duration: 0.45).delay(0.4)) {
                overlayOpacity = 0
            }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + MarbleVoyageDesignRules.versusRescueDoneAt) {
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

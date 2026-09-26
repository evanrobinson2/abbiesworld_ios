import SwiftUI
#if canImport(UIKit)
import UIKit
#endif

/// Peg Monastery — interior plate + multiple-choice math to earn a Plink power-up.
struct PegMonasteryView: View {
    let playerID: String?
    var playerDisplayName: String = "Abbie"
    var onExit: () -> Void
    var onAwarded: ((PlinkPowerUp) -> Void)? = nil

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var challenge = PegMonasteryMathChallenge.random()
    @State private var feedback: String?
    @State private var pendingKind: PlinkPowerUp?
    @State private var counts: [PlinkPowerUp: Int] = [:]
    @State private var awardSourceFrame: CGRect = .zero
    @State private var satchelFrames: [PlinkPowerUp: CGRect] = [:]
    @State private var flight: AwardFlight?
    @State private var flightProgress: CGFloat = 0
    @State private var greenFlash = false
    @State private var celebratingSlot: PlinkPowerUp?
    @State private var choiceLocked = false

    private struct AwardFlight: Identifiable, Equatable {
        let id = UUID()
        let kind: PlinkPowerUp
    }

    var body: some View {
        ZStack {
            interiorBackground
                .allowsHitTesting(false)

            ScrollView(.vertical, showsIndicators: false) {
                VStack(alignment: .leading, spacing: 18) {
                    header
                    playRow
                    rewardSection
                    if let feedback {
                        Text(feedback)
                            .font(.system(size: 15, weight: .bold, design: .rounded))
                            .foregroundStyle(Color(red: 0.85, green: 0.25, blue: 0.2))
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
                .padding(.horizontal, 8)
                // Clear the sticky Leave Monastery thumb stack (≈208pt) + player menu.
                .padding(.trailing, 220)
                .padding(.bottom, 28)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(chromeInsets)
            // Extra bottom so the last card clears the exit footer.
            .padding(.bottom, 88)

            if greenFlash {
                Color.green.opacity(0.22)
                    .ignoresSafeArea()
                    .allowsHitTesting(false)
                    .transition(.opacity)
            }

            if let flight {
                flyingAward(flight)
                    .allowsHitTesting(false)
                    .zIndex(80)
            }
        }
        .ignoresSafeArea()
        .coordinateSpace(name: "monasterySpace")
        .onPreferenceChange(MonasteryAwardSourceKey.self) { awardSourceFrame = $0 }
        .onPreferenceChange(MonasterySatchelSlotKey.self) { satchelFrames = $0 }
        .world2InteriorActions(
            exitTitle: "Leave Monastery",
            exitAccessibilityID: "world2.pegMonastery.leave",
            enabled: flight == nil,
            onExit: onExit
        )
        .onAppear {
            counts = PlinkPowerUpStore.counts(for: playerID)
            rollPendingKind()
        }
        .accessibilityIdentifier("world2.pegMonastery")
    }

    /// World2Root ignoresSafeArea, so SwiftUI safeAreaPadding is often 0 — pad from the window.
    private var chromeInsets: EdgeInsets {
        #if canImport(UIKit)
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        let windows = scenes.flatMap(\.windows)
        let inset = (windows.first(where: \.isKeyWindow) ?? windows.first)?.safeAreaInsets ?? .zero
        return EdgeInsets(
            top: max(inset.top, 44) + 8,
            leading: max(inset.left, 20) + 6,
            bottom: max(inset.bottom, 20) + 6,
            trailing: max(inset.right, 20) + 6
        )
        #else
        return EdgeInsets(top: 52, leading: 26, bottom: 26, trailing: 26)
        #endif
    }

    // MARK: - Chrome

    private var header: some View {
        HStack(alignment: .center, spacing: 12) {
            Button(action: onExit) {
                Label("Leave", systemImage: "door.left.hand.open")
                    .font(.system(size: 17, weight: .black, design: .rounded))
                    .padding(.horizontal, 16)
                    .padding(.vertical, 11)
                    .background(
                        LinearGradient(
                            colors: [
                                Color(red: 0.85, green: 0.35, blue: 0.25),
                                Color(red: 0.65, green: 0.2, blue: 0.18),
                            ],
                            startPoint: .top,
                            endPoint: .bottom
                        ),
                        in: Capsule()
                    )
                    .overlay(Capsule().stroke(.white.opacity(0.75), lineWidth: 2))
                    .foregroundStyle(.white)
                    .shadow(color: .black.opacity(0.45), radius: 8, y: 3)
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("world2.pegMonastery.leave.top")

            Spacer(minLength: 8)

            VStack(spacing: 2) {
                Text("Peg Monastery")
                    .font(.system(size: 22, weight: .heavy, design: .rounded))
                Text("\(playerDisplayName) · Bell Math blessings")
                    .font(.system(size: 13, weight: .bold, design: .rounded))
                    .opacity(0.85)
            }
            .foregroundStyle(.white)
            .shadow(color: .black.opacity(0.55), radius: 4, y: 1)
            .multilineTextAlignment(.center)
            .lineLimit(2)
            .minimumScaleFactor(0.85)

            Spacer(minLength: 8)

            // Shared World2PlayerMenuDrawer sits here (top-trailing) — keep clearance.
            Color.clear.frame(width: 56, height: 44)
        }
    }

    private var interiorBackground: some View {
        Group {
            if UIImage(named: "world2_poi_peglin_pegMonastery_interior") != nil {
                Image("world2_poi_peglin_pegMonastery_interior")
                    .resizable()
                    .scaledToFill()
            } else if let ui = AssetBootstrapService.shared.image(for: "poi.peglin.pegMonastery.interior") {
                Image(uiImage: ui)
                    .resizable()
                    .scaledToFill()
            } else {
                LinearGradient(
                    colors: [
                        Color(red: 0.95, green: 0.88, blue: 0.72),
                        Color(red: 0.55, green: 0.72, blue: 0.92),
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .clipped()
        .overlay(Color.black.opacity(0.28))
    }

    // MARK: - Play row (award left · math right; stacks when narrow)

    private var playRow: some View {
        ViewThatFits(in: .horizontal) {
            HStack(alignment: .top, spacing: 16) {
                awardPanel
                    .frame(width: 168)
                challengeCard
                    .frame(maxWidth: .infinity)
            }
            VStack(alignment: .leading, spacing: 16) {
                awardPanel
                    .frame(maxWidth: 240)
                challengeCard
                    .frame(maxWidth: .infinity)
            }
        }
    }

    private var awardPanel: some View {
        VStack(spacing: 12) {
            Text("Today's blessing")
                .font(.system(size: 12, weight: .heavy, design: .rounded))
                .foregroundStyle(Color(red: 0.55, green: 0.4, blue: 0.15))
                .frame(maxWidth: .infinity, alignment: .leading)

            ZStack {
                RoundedRectangle(cornerRadius: 22, style: .continuous)
                    .fill(
                        LinearGradient(
                            colors: [
                                Color(red: 0.98, green: 0.94, blue: 0.78),
                                Color(red: 0.92, green: 0.82, blue: 0.55),
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 22, style: .continuous)
                            .stroke(Color(red: 0.75, green: 0.55, blue: 0.2), lineWidth: 2.5)
                    )
                    .shadow(color: .orange.opacity(0.35), radius: 12, y: 4)

                if let pendingKind, flight == nil {
                    VStack(spacing: 8) {
                        PlinkPowerUpChip(kind: pendingKind, size: 88)
                        Text(pendingKind.title)
                            .font(.system(size: 15, weight: .black, design: .rounded))
                            .foregroundStyle(Color(red: 0.35, green: 0.22, blue: 0.08))
                        Text("Get it right!")
                            .font(.system(size: 11, weight: .bold, design: .rounded))
                            .foregroundStyle(Color(red: 0.45, green: 0.55, blue: 0.3))
                    }
                    .padding(12)
                    .opacity(choiceLocked ? 0.35 : 1)
                } else if flight != nil {
                    Text("…")
                        .font(.system(size: 36, weight: .black, design: .rounded))
                        .foregroundStyle(.secondary)
                } else {
                    VStack(spacing: 8) {
                        Image(systemName: "gift.fill")
                            .font(.system(size: 44, weight: .black))
                            .foregroundStyle(.orange)
                        Text("Full satchel")
                            .font(.system(size: 13, weight: .bold, design: .rounded))
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .frame(minHeight: 160)
            .background(
                GeometryReader { geo in
                    Color.clear.preference(
                        key: MonasteryAwardSourceKey.self,
                        value: geo.frame(in: .named("monasterySpace"))
                    )
                }
            )
            .accessibilityIdentifier("world2.pegMonastery.awardPanel")
        }
        .padding(14)
        .background(
            .ultraThinMaterial,
            in: RoundedRectangle(cornerRadius: 24, style: .continuous)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .stroke(Color.white.opacity(0.55), lineWidth: 1.5)
        )
    }

    private var challengeCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("WHAT IS THE ANSWER?")
                .font(.system(size: 18, weight: .black, design: .rounded))
                .foregroundStyle(Color(red: 0.75, green: 0.45, blue: 0.12))
                .tracking(0.6)

            Text(challenge.questionSpoken)
                .font(.system(size: 28, weight: .heavy, design: .rounded))
                .foregroundStyle(Color(red: 0.18, green: 0.12, blue: 0.08))
                .fixedSize(horizontal: false, vertical: true)
                .accessibilityIdentifier("world2.pegMonastery.question")

            equationBoard
                .frame(maxWidth: .infinity)

            Text("Tap the right number ↓")
                .font(.system(size: 16, weight: .black, design: .rounded))
                .foregroundStyle(Color(red: 0.35, green: 0.45, blue: 0.25))
                .frame(maxWidth: .infinity, alignment: .leading)

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                ForEach(challenge.choices, id: \.self) { choice in
                    Button {
                        submit(choice)
                    } label: {
                        Text("\(choice)")
                            .font(.system(size: 32, weight: .black, design: .rounded))
                            .frame(maxWidth: .infinity, minHeight: 72)
                            .background(
                                Color(red: 0.98, green: 0.94, blue: 0.86),
                                in: RoundedRectangle(cornerRadius: 16, style: .continuous)
                            )
                            .overlay(
                                RoundedRectangle(cornerRadius: 16, style: .continuous)
                                    .stroke(Color(red: 0.75, green: 0.55, blue: 0.2), lineWidth: 3)
                            )
                            .foregroundStyle(Color(red: 0.25, green: 0.18, blue: 0.1))
                    }
                    .buttonStyle(.plain)
                    .disabled(choiceLocked || pendingKind == nil)
                    .accessibilityLabel("Answer \(choice)")
                    .accessibilityIdentifier("world2.pegMonastery.choice.\(choice)")
                }
            }
        }
        .padding(22)
        .background(
            .ultraThinMaterial,
            in: RoundedRectangle(cornerRadius: 24, style: .continuous)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .stroke(Color.white.opacity(0.55), lineWidth: 1.5)
        )
        .shadow(color: .black.opacity(0.35), radius: 18, y: 6)
        .accessibilityElement(children: .contain)
        .accessibilityLabel(challenge.questionSpoken)
    }

    /// Big kid-readable equation tiles: 3  +  5  =  ?
    private var equationBoard: some View {
        HStack(spacing: 10) {
            equationTile("\(challenge.left)", emphasis: .number)
            equationTile(challenge.op, emphasis: .op)
            equationTile("\(challenge.right)", emphasis: .number)
            equationTile("=", emphasis: .op)
            equationTile("?", emphasis: .blank)
        }
        .padding(.vertical, 6)
        .accessibilityHidden(true)
    }

    private enum EquationTileEmphasis {
        case number, op, blank
    }

    private func equationTile(_ text: String, emphasis: EquationTileEmphasis) -> some View {
        let fill: Color
        let stroke: Color
        let ink: Color
        switch emphasis {
        case .number:
            fill = Color.white
            stroke = Color(red: 0.75, green: 0.55, blue: 0.2)
            ink = Color(red: 0.15, green: 0.1, blue: 0.05)
        case .op:
            fill = Color(red: 1.0, green: 0.92, blue: 0.7)
            stroke = Color(red: 0.85, green: 0.6, blue: 0.2)
            ink = Color(red: 0.45, green: 0.28, blue: 0.08)
        case .blank:
            fill = Color(red: 0.55, green: 0.85, blue: 0.55).opacity(0.35)
            stroke = Color(red: 0.25, green: 0.65, blue: 0.35)
            ink = Color(red: 0.15, green: 0.45, blue: 0.22)
        }
        return Text(text)
            .font(.system(size: emphasis == .op ? 36 : 44, weight: .black, design: .rounded))
            .foregroundStyle(ink)
            .frame(minWidth: emphasis == .op ? 52 : 64, minHeight: 72)
            .padding(.horizontal, 10)
            .background(fill, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(stroke, lineWidth: emphasis == .blank ? 3.5 : 2.5)
            )
            .shadow(color: .black.opacity(0.12), radius: 4, y: 2)
    }

    // MARK: - Reward section (satchel destination)

    private var rewardSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("\(playerDisplayName)'s rewards")
                    .font(.system(size: 15, weight: .black, design: .rounded))
                Spacer()
                Text("Plink satchel")
                    .font(.system(size: 12, weight: .bold, design: .rounded))
                    .foregroundStyle(.secondary)
            }
            .foregroundStyle(Color(red: 0.2, green: 0.15, blue: 0.1))

            HStack(spacing: 16) {
                ForEach(PlinkPowerUp.allCases) { kind in
                    satchelSlot(kind)
                }
            }
        }
        .padding(18)
        .background(
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .fill(Color.white.opacity(0.82))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .stroke(
                    celebratingSlot != nil
                        ? Color.green.opacity(0.85)
                        : Color.white.opacity(0.55),
                    lineWidth: celebratingSlot != nil ? 3 : 1.5
                )
        )
        .shadow(color: .black.opacity(0.2), radius: 12, y: 4)
        .accessibilityIdentifier("world2.pegMonastery.rewards")
    }

    private func satchelSlot(_ kind: PlinkPowerUp) -> some View {
        let n = counts[kind] ?? 0
        let lit = celebratingSlot == kind
        return VStack(spacing: 6) {
            ZStack(alignment: .bottomTrailing) {
                PlinkPowerUpChip(kind: kind, size: 72)
                    .scaleEffect(lit ? 1.12 : 1.0)
                    .shadow(color: lit ? Color.green.opacity(0.55) : .clear, radius: lit ? 10 : 0)
                Text("×\(n)")
                    .font(.system(size: 13, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 7)
                    .padding(.vertical, 3)
                    .background(lit ? Color.green : Color.black.opacity(0.7), in: Capsule())
                    .offset(x: 4, y: 4)
            }
            Text(kind.title)
                .font(.system(size: 11, weight: .heavy, design: .rounded))
                .foregroundStyle(Color(red: 0.25, green: 0.18, blue: 0.1))
                .lineLimit(1)
                .minimumScaleFactor(0.8)
        }
        .frame(maxWidth: .infinity)
        .background(
            GeometryReader { geo in
                Color.clear.preference(
                    key: MonasterySatchelSlotKey.self,
                    value: [kind: geo.frame(in: .named("monasterySpace"))]
                )
            }
        )
        .accessibilityLabel("\(kind.title) \(n) of \(PlinkPowerUp.maxOwned)")
        .accessibilityIdentifier("world2.pegMonastery.satchel.\(kind.rawValue)")
    }

    // MARK: - Flight

    private func flyingAward(_ flight: AwardFlight) -> some View {
        let start = awardSourceFrame
        let end = satchelFrames[flight.kind] ?? start
        let t = flightProgress
        let eased = 1 - pow(1 - t, 3)
        let x = start.midX + (end.midX - start.midX) * eased
        let y = start.midY + (end.midY - start.midY) * eased - 40 * sin(.pi * eased)
        let scale = 1.15 - 0.35 * eased
        return ZStack {
            Circle()
                .fill(Color.green.opacity(0.35))
                .frame(width: 110, height: 110)
                .blur(radius: 8)
            PlinkPowerUpChip(kind: flight.kind, size: 72)
                .shadow(color: .green.opacity(0.8), radius: 12)
        }
        .scaleEffect(scale)
        .position(x: x, y: y)
        .accessibilityHidden(true)
    }

    // MARK: - Logic

    private func rollPendingKind() {
        pendingKind = PlinkPowerUpStore.awardableKinds(for: playerID).randomElement()
    }

    private func submit(_ choice: Int) {
        guard !choiceLocked, let pick = pendingKind else { return }
        if choice != challenge.answer {
            feedback = "Not quite — try another answer."
            PlinkSFX.play(.miss)
            return
        }
        guard PlinkPowerUpStore.award(pick, for: playerID) else {
            feedback = "Could not add that blessing."
            PlinkSFX.play(.miss)
            return
        }
        choiceLocked = true
        feedback = nil
        PlinkSFX.play(.win)
        onAwarded?(pick)
        PeglinEdition.log(
            "monastery_powerup_awarded",
            ["kind": pick.rawValue, "player": playerID ?? "guest"]
        )

        #if canImport(UIKit)
        if PlayerStateService.shared.currentPlayer?.settings.hapticFeedbackEnabled ?? true {
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        }
        #endif

        withAnimation(.easeOut(duration: 0.18)) {
            greenFlash = true
        }

        if reduceMotion {
            counts = PlinkPowerUpStore.counts(for: playerID)
            celebratingSlot = pick
            finishFlight(kind: pick)
            return
        }

        flight = AwardFlight(kind: pick)
        flightProgress = 0
        withAnimation(.easeInOut(duration: 0.85)) {
            flightProgress = 1
        }
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(860))
            counts = PlinkPowerUpStore.counts(for: playerID)
            celebratingSlot = pick
            flight = nil
            flightProgress = 0
            finishFlight(kind: pick)
        }
    }

    private func finishFlight(kind: PlinkPowerUp) {
        withAnimation(.easeOut(duration: 0.35)) {
            greenFlash = false
        }
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(700))
            withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
                celebratingSlot = nil
            }
            choiceLocked = false
            challenge = PegMonasteryMathChallenge.random()
            rollPendingKind()
            if pendingKind == nil {
                feedback = "Your satchel is full (max 2 of each)."
            }
        }
    }
}

// MARK: - Preference keys

private struct MonasteryAwardSourceKey: PreferenceKey {
    static var defaultValue: CGRect = .zero
    static func reduce(value: inout CGRect, nextValue: () -> CGRect) {
        let next = nextValue()
        if next != .zero { value = next }
    }
}

private struct MonasterySatchelSlotKey: PreferenceKey {
    static var defaultValue: [PlinkPowerUp: CGRect] = [:]
    static func reduce(value: inout [PlinkPowerUp: CGRect], nextValue: () -> [PlinkPowerUp: CGRect]) {
        value.merge(nextValue(), uniquingKeysWith: { $1 })
    }
}

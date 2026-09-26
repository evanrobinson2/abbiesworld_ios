import SwiftUI
import SpriteKit
import Combine

enum AppVersion {
    static var label: String {
        let short = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "?"
        let build = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "?"
        return "v\(short) (\(build))"
    }
}

/// Abbie Plink — Peglin-inspired physics, Peggle clear-oranges, live G/tilt + orbs.
struct GameRootView: View {
    @StateObject private var play = PlayBridge()
    @State private var showDrawer = false

    var body: some View {
        ZStack {
            SpriteView(scene: play.scene, options: [.ignoresSiblingOrder])
                .ignoresSafeArea()

            VStack {
                topBar
                Spacer()
                if play.showBanner {
                    BannerCard(
                        title: play.bannerTitle,
                        message: play.bannerBody,
                        onAgain: { play.restartLevel() },
                        onNext: play.canAdvance ? { play.nextLevel() } : nil
                    )
                    .padding(.bottom, 12)
                } else if play.phase == .aim && !showDrawer {
                    Text("Pick an orb · drag aim · release")
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                        .foregroundStyle(.white.opacity(0.75))
                        .padding(.bottom, 8)
                }
                Color.clear.frame(height: 168)
            }
            .allowsHitTesting(play.showBanner)

            VStack {
                HStack {
                    Spacer()
                    Button {
                        showDrawer = true
                    } label: {
                        Label("Tune", systemImage: "slider.horizontal.3")
                            .font(.system(size: 14, weight: .bold, design: .rounded))
                            .padding(.horizontal, 14)
                            .padding(.vertical, 8)
                            .background(.black.opacity(0.55), in: Capsule())
                            .foregroundStyle(.white)
                    }
                    .padding(.trailing, 22)
                    .padding(.top, 56)
                }
                Spacer()
                if play.phase == .aim {
                    OrbPicker(play: play)
                        .padding(.horizontal, 16)
                        .padding(.bottom, 6)
                }
                LiveFieldSliders(play: play)
                    .padding(.horizontal, 20)
                    .padding(.bottom, 18)
            }
            .allowsHitTesting(true)
        }
        .sheet(isPresented: $showDrawer) {
            TuneDrawer(play: play)
                .presentationDetents([.medium, .large])
                .presentationDragIndicator(.visible)
        }
        .preferredColorScheme(.dark)
    }

    private var topBar: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 10) {
                    Text(play.levelName)
                        .font(.system(size: 22, weight: .heavy, design: .rounded))
                    Text(AppVersion.label)
                        .font(.system(size: 11, weight: .bold, design: .rounded))
                        .foregroundStyle(.white.opacity(0.45))
                        .monospacedDigit()
                }
                Text(play.status)
                    .font(.system(size: 15, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white.opacity(0.9))
                    .lineLimit(2)
            }
            Spacer()
            HStack(spacing: 10) {
                StatPill(label: "Orb", value: play.orbName)
                StatPill(label: "Plink", value: "\(play.plink)")
                StatPill(label: "Balls", value: "\(play.ballsLeft)")
                StatPill(label: "Orange", value: "\(play.orangeLeft)")
            }
        }
        .padding(.horizontal, 28)
        .padding(.top, 16)
        .allowsHitTesting(false)
    }
}

// MARK: - Orb picker

private struct OrbPicker: View {
    @ObservedObject var play: PlayBridge

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(OrbKind.all) { orb in
                    Button {
                        play.selectOrb(orb)
                    } label: {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(orb.name)
                                .font(.system(size: 13, weight: .heavy, design: .rounded))
                            Text(orb.blurb)
                                .font(.system(size: 10, weight: .medium, design: .rounded))
                                .foregroundStyle(.white.opacity(0.55))
                                .lineLimit(1)
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(
                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .fill(play.tuning.orbID == orb.id
                                      ? Color(red: 1, green: 0.55, blue: 0.2).opacity(0.4)
                                      : Color.black.opacity(0.55))
                        )
                    }
                    .buttonStyle(.plain)
                    .foregroundStyle(.white)
                }
            }
        }
    }
}

// MARK: - Tune drawer

private struct TuneDrawer: View {
    @ObservedObject var play: PlayBridge

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    boardSection
                    presetSection
                    orbReadout
                    sliderSection
                }
                .padding(20)
            }
            .background(Color(red: 0.08, green: 0.1, blue: 0.16))
            .navigationTitle("Tune")
            .navigationBarTitleDisplayMode(.inline)
        }
        .preferredColorScheme(.dark)
    }

    private var boardSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Boards")
                .font(.system(size: 13, weight: .bold, design: .rounded))
                .foregroundStyle(.white.opacity(0.5))
            ForEach(Array(BoardLevel.catalog.enumerated()), id: \.element.id) { idx, board in
                Button {
                    play.loadBoard(index: idx)
                } label: {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(board.name)
                                .font(.system(size: 16, weight: .bold, design: .rounded))
                            Text(board.blurb)
                                .font(.system(size: 12, weight: .medium, design: .rounded))
                                .foregroundStyle(.white.opacity(0.55))
                        }
                        Spacer()
                        if play.boardIndex == idx {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundStyle(Color(red: 1, green: 0.55, blue: 0.2))
                        }
                    }
                    .padding(12)
                    .background(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .fill(play.boardIndex == idx
                                  ? Color.white.opacity(0.14)
                                  : Color.white.opacity(0.06))
                    )
                }
                .buttonStyle(.plain)
                .foregroundStyle(.white)
            }
        }
    }

    private var presetSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("World presets")
                .font(.system(size: 13, weight: .bold, design: .rounded))
                .foregroundStyle(.white.opacity(0.5))
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(PhysicsPreset.all) { preset in
                        Button {
                            play.applyPreset(preset)
                        } label: {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(preset.name)
                                    .font(.system(size: 14, weight: .heavy, design: .rounded))
                                Text(preset.blurb)
                                    .font(.system(size: 10, weight: .medium, design: .rounded))
                                    .foregroundStyle(.white.opacity(0.55))
                                    .frame(width: 130, alignment: .leading)
                                    .lineLimit(2)
                            }
                            .padding(10)
                            .background(
                                RoundedRectangle(cornerRadius: 12, style: .continuous)
                                    .fill(play.activePresetID == preset.id
                                          ? Color(red: 1, green: 0.55, blue: 0.2).opacity(0.35)
                                          : Color.white.opacity(0.08))
                            )
                        }
                        .buttonStyle(.plain)
                        .foregroundStyle(.white)
                    }
                }
            }
        }
    }

    private var orbReadout: some View {
        let orb = play.tuning.orb
        return VStack(alignment: .leading, spacing: 8) {
            Text("Active orb knobs (pick on playfield)")
                .font(.system(size: 13, weight: .bold, design: .rounded))
                .foregroundStyle(.white.opacity(0.5))
            Text("\(orb.name) · fire \(Int(orb.fireForce)) · g×\(String(format: "%.2f", orb.gravityScale)) · e \(String(format: "%.2f", orb.bounciness)) · mass \(String(format: "%.2f", orb.mass)) · r \(Int(orb.radius))")
                .font(.system(size: 12, weight: .medium, design: .monospaced))
                .foregroundStyle(Color(red: 1, green: 0.7, blue: 0.35))
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(12)
        .background(Color.white.opacity(0.06), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private var sliderSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("World sliders")
                .font(.system(size: 13, weight: .bold, design: .rounded))
                .foregroundStyle(.white.opacity(0.5))
            Text("Orb personality is chosen on the board. World G/tilt/walls apply to every orb.")
                .font(.system(size: 12, weight: .medium, design: .rounded))
                .foregroundStyle(.white.opacity(0.45))

            TuneSlider(
                title: "World gravity",
                help: "Base pull — orb gravityScale multiplies this.",
                value: $play.tuning.gravity,
                range: PhysicsSliderRange.gravity,
                format: "%.0f"
            )
            TuneSlider(
                title: "Tilt (°)",
                help: "Board lean. 0 = straight down.",
                value: $play.tuning.tilt,
                range: PhysicsSliderRange.tilt,
                format: "%+.0f°"
            )
            TuneSlider(
                title: "Rail bounce (e)",
                help: "Wall / cushion restitution.",
                value: $play.tuning.wallRestitution,
                range: PhysicsSliderRange.wallRestitution,
                format: "%.2f"
            )
            TuneSlider(
                title: "Bumper kick",
                help: "Fixed outward Δv on every peg — bumpers add speed.",
                value: $play.tuning.bumperKick,
                range: PhysicsSliderRange.bumperKick,
                format: "%.0f"
            )
            TuneSlider(
                title: "Wood drag",
                help: "Velocity damping (friction analog).",
                value: $play.tuning.woodDamping,
                range: PhysicsSliderRange.woodDamping,
                format: "%.2f"
            )
            TuneSlider(
                title: "Max speed clamp",
                help: "Safety cap after hot bounce chains.",
                value: $play.tuning.maxBallSpeed,
                range: PhysicsSliderRange.maxBallSpeed,
                format: "%.0f"
            )
        }
        .onChange(of: play.tuning) { _, new in
            play.pushTuning(new)
        }
    }
}

private struct TuneSlider: View {
    let title: String
    let help: String
    @Binding var value: Double
    let range: ClosedRange<Double>
    let format: String

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(title)
                    .font(.system(size: 14, weight: .bold, design: .rounded))
                Spacer()
                Text(String(format: format, value))
                    .font(.system(size: 14, weight: .heavy, design: .monospaced))
                    .foregroundStyle(Color(red: 1, green: 0.7, blue: 0.35))
            }
            Text(help)
                .font(.system(size: 11, weight: .medium, design: .rounded))
                .foregroundStyle(.white.opacity(0.4))
            Slider(value: $value, in: range)
                .tint(Color(red: 1, green: 0.55, blue: 0.2))
        }
        .padding(12)
        .background(Color.white.opacity(0.06), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}

private struct LiveFieldSliders: View {
    @ObservedObject var play: PlayBridge

    var body: some View {
        VStack(spacing: 10) {
            FieldSlider(
                title: "G",
                value: $play.tuning.gravity,
                range: PhysicsSliderRange.gravity,
                format: "%.0f",
                accent: Color(red: 1, green: 0.55, blue: 0.2)
            )
            FieldSlider(
                title: "Tilt",
                value: $play.tuning.tilt,
                range: PhysicsSliderRange.tilt,
                format: "%+.0f°",
                accent: Color(red: 0.45, green: 0.85, blue: 1)
            )
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(.black.opacity(0.62), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .strokeBorder(.white.opacity(0.18), lineWidth: 1)
        )
        .onChange(of: play.tuning.gravity) { _, _ in play.pushTuning(play.tuning) }
        .onChange(of: play.tuning.tilt) { _, _ in play.pushTuning(play.tuning) }
    }
}

private struct FieldSlider: View {
    let title: String
    @Binding var value: Double
    let range: ClosedRange<Double>
    let format: String
    let accent: Color

    var body: some View {
        HStack(spacing: 14) {
            Text(title)
                .font(.system(size: 18, weight: .heavy, design: .rounded))
                .foregroundStyle(.white)
                .frame(width: 48, alignment: .leading)
            Slider(value: $value, in: range)
                .tint(accent)
            Text(String(format: format, value))
                .font(.system(size: 18, weight: .heavy, design: .monospaced))
                .foregroundStyle(accent)
                .frame(width: 72, alignment: .trailing)
                .monospacedDigit()
        }
    }
}

private struct StatPill: View {
    let label: String
    let value: String

    var body: some View {
        VStack(spacing: 2) {
            Text(label.uppercased())
                .font(.system(size: 10, weight: .bold, design: .rounded))
                .foregroundStyle(.white.opacity(0.55))
            Text(value)
                .font(.system(size: value.count > 4 ? 14 : 22, weight: .heavy, design: .rounded))
                .monospacedDigit()
                .lineLimit(1)
                .minimumScaleFactor(0.6)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(.black.opacity(0.35), in: Capsule())
    }
}

private struct BannerCard: View {
    let title: String
    let message: String
    let onAgain: () -> Void
    let onNext: (() -> Void)?

    var body: some View {
        VStack(spacing: 12) {
            Text(title)
                .font(.system(size: 28, weight: .heavy, design: .rounded))
            Text(message)
                .font(.system(size: 15, weight: .medium, design: .rounded))
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
            HStack(spacing: 12) {
                Button("Again", action: onAgain)
                    .buttonStyle(PeggleButtonStyle(filled: false))
                if let onNext {
                    Button("Next board", action: onNext)
                        .buttonStyle(PeggleButtonStyle(filled: true))
                }
            }
        }
        .padding(22)
        .frame(maxWidth: 360)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .strokeBorder(.white.opacity(0.25), lineWidth: 1)
        )
    }
}

private struct PeggleButtonStyle: ButtonStyle {
    let filled: Bool

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 16, weight: .bold, design: .rounded))
            .foregroundStyle(filled ? Color.black : Color.white)
            .padding(.horizontal, 18)
            .padding(.vertical, 10)
            .background(
                Capsule().fill(filled ? Color(red: 1, green: 0.55, blue: 0.2) : Color.white.opacity(0.18))
            )
            .opacity(configuration.isPressed ? 0.75 : 1)
    }
}

// MARK: - Bridge

@MainActor
final class PlayBridge: ObservableObject {
    let scene: PeggleScene

    @Published var levelName = ""
    @Published var status = ""
    @Published var ballsLeft = 0
    @Published var orangeLeft = 0
    @Published var plink = 0
    @Published var orbName = "Sparkle"
    @Published var phase: PeggleScene.Phase = .aim
    @Published var showBanner = false
    @Published var bannerTitle = ""
    @Published var bannerBody = ""
    @Published var canAdvance = false
    @Published var boardIndex = 0
    @Published var tuning = PhysicsTuning.default
    @Published var activePresetID: String? = PhysicsPreset.salon.id

    init() {
        let scene = PeggleScene(size: CGSize(width: 1200, height: 800))
        scene.scaleMode = .resizeFill
        self.scene = scene
        self.tuning = PhysicsTuning.default
        scene.applyTuning(tuning)
        scene.onHud = { [weak self] snap in
            Task { @MainActor in
                self?.apply(snap)
            }
        }
        scene.loadLevel(index: 0)
    }

    private func apply(_ snap: PeggleScene.HudSnapshot) {
        if levelName != snap.levelName { levelName = snap.levelName }
        if status != snap.status { status = snap.status }
        if ballsLeft != snap.ballsLeft { ballsLeft = snap.ballsLeft }
        if orangeLeft != snap.orangeLeft { orangeLeft = snap.orangeLeft }
        if plink != snap.plink { plink = snap.plink }
        if orbName != snap.orbName { orbName = snap.orbName }
        if phase != snap.phase { phase = snap.phase }
        if showBanner != snap.showBanner { showBanner = snap.showBanner }
        if bannerTitle != snap.bannerTitle { bannerTitle = snap.bannerTitle }
        if bannerBody != snap.bannerBody { bannerBody = snap.bannerBody }
        if canAdvance != snap.canAdvance { canAdvance = snap.canAdvance }
        boardIndex = scene.currentLevelIndex
    }

    func restartLevel() { scene.restartLevel() }
    func nextLevel() { scene.nextLevel() }

    func loadBoard(index: Int) {
        boardIndex = index
        scene.loadLevel(index: index)
    }

    func applyPreset(_ preset: PhysicsPreset) {
        activePresetID = preset.id
        tuning = preset.tuning
        scene.applyTuning(preset.tuning)
    }

    func selectOrb(_ orb: OrbKind) {
        activePresetID = nil
        var next = tuning
        next.orbID = orb.id
        tuning = next
        scene.selectOrb(orb)
    }

    func pushTuning(_ next: PhysicsTuning) {
        if let id = activePresetID,
           let preset = PhysicsPreset.all.first(where: { $0.id == id }),
           preset.tuning != next {
            activePresetID = nil
        }
        tuning = next
        scene.applyTuning(next)
    }
}

import SwiftUI
import UIKit

/// Living title-screen atmosphere — thin wrapper over scene-adaptive leaves.
struct MarbleVoyageTitleAtmosphere: View {
    var reduceMotion: Bool
    var mood: MarbleVoyageSceneAtmosphere.Mood = .titleSkyDock
    var parallax: CGSize = .zero
    var transitionBoost: Double = 0

    var body: some View {
        MarbleVoyageSceneAtmosphere(
            mood: mood,
            parallax: parallax,
            reduceMotion: reduceMotion,
            intensity: 1,
            seed: 42,
            transitionBoost: transitionBoost
        )
    }
}

/// Full-bleed title plates with artful crossfade + gentle Ken Burns.
/// Slides through unlocked gallery plates (or a pinned favorite).
struct MarbleVoyageTitleStage: View {
    var reduceMotion: Bool
    var plates: [MarbleVoyageTitlePlate] = MarbleVoyageGallery.load().carouselPlates

    @State private var plateIndex: Int = 0
    @State private var kenProgress: CGFloat = 0
    @State private var carouselToken: UInt = 0
    @State private var leafBoost: Double = 0

    private let holdSeconds: Double = 11
    private let fadeSeconds: Double = 1.4

    private var activePlates: [MarbleVoyageTitlePlate] {
        plates.isEmpty ? [.skyDock] : plates
    }

    private var currentPlate: MarbleVoyageTitlePlate {
        activePlates[plateIndex % activePlates.count]
    }

    private var leafParallax: CGSize {
        let bias = currentPlate.kenBurnsBias
        return CGSize(
            width: bias.dx * 120 * kenProgress * (reduceMotion ? 0.2 : 1),
            height: bias.dy * 90 * kenProgress * (reduceMotion ? 0.2 : 1)
        )
    }

    var body: some View {
        ZStack {
            plateStack
                .ignoresSafeArea()

            LinearGradient(
                colors: [
                    Color.black.opacity(0.28),
                    Color.black.opacity(0.08),
                    Color.black.opacity(0.35),
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()
            .allowsHitTesting(false)

            LinearGradient(
                colors: [
                    Color(red: 1, green: 0.85, blue: 0.55).opacity(0.12),
                    .clear,
                ],
                startPoint: .topLeading,
                endPoint: .center
            )
            .ignoresSafeArea()
            .allowsHitTesting(false)

            MarbleVoyageTitleAtmosphere(
                reduceMotion: reduceMotion,
                mood: .titlePlate(currentPlate),
                parallax: leafParallax,
                transitionBoost: leafBoost
            )
            .opacity(reduceMotion ? 0.4 : 1)
            .ignoresSafeArea()
            .animation(.easeInOut(duration: fadeSeconds), value: currentPlate)
        }
        .accessibilityIdentifier("world2.marbleVoyage.titleStage")
        .onAppear { restartCarousel() }
        .onChange(of: plates.map(\.rawValue).joined(separator: ",")) { _, _ in
            plateIndex = 0
            restartCarousel()
        }
        .onChange(of: plateIndex) { _, _ in
            pulseLeaves()
        }
    }

    private func pulseLeaves() {
        leafBoost = 1
        withAnimation(.easeOut(duration: 1.1)) {
            leafBoost = 0
        }
    }

    private var plateStack: some View {
        GeometryReader { geo in
            ZStack {
                Color(red: 0.04, green: 0.07, blue: 0.14)
                ForEach(Array(activePlates.enumerated()), id: \.element.id) { index, plate in
                    let isCurrent = index == plateIndex % activePlates.count
                    kenBurnsPlate(plate, in: geo.size, active: isCurrent)
                        .opacity(isCurrent ? 1 : 0)
                        .animation(.easeInOut(duration: fadeSeconds), value: plateIndex)
                }
            }
            .frame(width: geo.size.width, height: geo.size.height)
        }
    }

    private func kenBurnsPlate(_ plate: MarbleVoyageTitlePlate, in size: CGSize, active: Bool) -> some View {
        let bias = plate.kenBurnsBias
        let panX = reduceMotion ? 0 : bias.dx * size.width * 0.012 * kenProgress
        let panY = reduceMotion ? 0 : bias.dy * size.height * 0.012 * kenProgress

        return MarbleVoyageUnclippedPlate(
            catalogName: UIImage(named: plate.catalogName) != nil ? plate.catalogName : nil,
            semanticName: plate == .skyDock ? MarbleVoyageArt.titleBackdrop : "",
            fallbackIcon: "photo.artframe",
            fallbackLabel: plate.displayName
        )
        .frame(width: size.width, height: size.height)
        .offset(x: active ? panX : 0, y: active ? panY : 0)
    }

    private func restartCarousel() {
        carouselToken &+= 1
        let token = carouselToken
        kenProgress = 0
        guard !reduceMotion else {
            kenProgress = 0.35
            return
        }
        withAnimation(.linear(duration: holdSeconds)) {
            kenProgress = 1
        }
        guard activePlates.count > 1 else { return }
        DispatchQueue.main.asyncAfter(deadline: .now() + holdSeconds) {
            guard token == carouselToken else { return }
            advancePlate(token: token)
        }
    }

    private func advancePlate(token: UInt) {
        guard token == carouselToken, activePlates.count > 1 else { return }
        plateIndex = (plateIndex + 1) % activePlates.count
        kenProgress = 0
        withAnimation(.linear(duration: holdSeconds)) {
            kenProgress = 1
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + holdSeconds) {
            guard token == carouselToken else { return }
            advancePlate(token: token)
        }
    }
}

/// Trophy cabinet + title-plate unlock gallery.
struct MarbleVoyageTrophyCenterView: View {
    @Binding var gallery: MarbleVoyageGallery
    var onClose: () -> Void

    var body: some View {
        ZStack {
            Color.black.opacity(0.55).ignoresSafeArea()
                .onTapGesture { onClose() }

            VStack(spacing: 0) {
                HStack {
                    Label("Trophy Center", systemImage: "trophy.fill")
                        .font(.system(size: 24, weight: .black, design: .rounded))
                        .foregroundStyle(.white)
                    Spacer()
                    Button {
                        MarbleVoyageAudio.tap()
                        onClose()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 28, weight: .bold))
                            .foregroundStyle(.white.opacity(0.85))
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("world2.marbleVoyage.trophy.close")
                }
                .padding(.horizontal, 22)
                .padding(.top, 18)
                .padding(.bottom, 10)

                ScrollView {
                    VStack(alignment: .leading, spacing: 22) {
                        titlesSection
                        trophiesSection
                        statsRow
                    }
                    .padding(.horizontal, 22)
                    .padding(.bottom, 28)
                }
            }
            .frame(maxWidth: 720)
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
        .accessibilityIdentifier("world2.marbleVoyage.trophyCenter")
    }

    private var titlesSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Title plates")
                .font(.system(size: 18, weight: .black, design: .rounded))
                .foregroundStyle(.white)
            Text(gallery.preferredPlateID == nil
                 ? "Sliding through unlocked art on the title screen."
                 : "Pinned favorite — tap Auto to slide again.")
                .font(.system(size: 13, weight: .semibold, design: .rounded))
                .foregroundStyle(.white.opacity(0.75))

            LazyVGrid(columns: [GridItem(.adaptive(minimum: 150), spacing: 12)], spacing: 12) {
                ForEach(MarbleVoyageTitlePlate.allCases) { plate in
                    titleCard(plate)
                }
            }

            Button {
                MarbleVoyageAudio.tap()
                gallery.preferredPlateID = nil
                gallery.save()
            } label: {
                Text("Auto-slide unlocked")
                    .font(.system(size: 15, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(Color.white.opacity(0.16), in: Capsule())
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("world2.marbleVoyage.trophy.autoSlide")
        }
    }

    private func titleCard(_ plate: MarbleVoyageTitlePlate) -> some View {
        let unlocked = gallery.isPlateUnlocked(plate)
        let pinned = gallery.preferredPlateID == plate.rawValue
        return Button {
            guard unlocked else { return }
            MarbleVoyageAudio.choosePath()
            gallery.preferredPlateID = plate.rawValue
            gallery.save()
        } label: {
            VStack(alignment: .leading, spacing: 8) {
                ZStack {
                    if unlocked, UIImage(named: plate.catalogName) != nil {
                        Image(plate.catalogName)
                            .resizable()
                            .scaledToFit()
                    } else {
                        Color.black.opacity(0.35)
                        Image(systemName: unlocked ? "photo" : "lock.fill")
                            .font(.system(size: 22, weight: .bold))
                            .foregroundStyle(.white.opacity(0.7))
                    }
                }
                .frame(height: 88)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .stroke(pinned ? Color(red: 1, green: 0.85, blue: 0.4) : .white.opacity(0.25), lineWidth: pinned ? 3 : 1)
                )

                Text(plate.displayName)
                    .font(.system(size: 14, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                Text(unlocked ? plate.blurb : plate.unlockHint)
                    .font(.system(size: 11, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white.opacity(0.7))
                    .lineLimit(2)
            }
            .padding(10)
            .background(Color.white.opacity(unlocked ? 0.12 : 0.06), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .opacity(unlocked ? 1 : 0.7)
        }
        .buttonStyle(.plain)
        .disabled(!unlocked)
        .accessibilityIdentifier("world2.marbleVoyage.trophy.plate.\(plate.rawValue)")
    }

    private var trophiesSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Trophies")
                .font(.system(size: 18, weight: .black, design: .rounded))
                .foregroundStyle(.white)
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 140), spacing: 10)], spacing: 10) {
                ForEach(MarbleVoyageTrophy.allCases) { trophy in
                    let earned = gallery.isTrophyEarned(trophy)
                    VStack(alignment: .leading, spacing: 6) {
                        Image(systemName: trophy.systemIcon)
                            .font(.system(size: 22, weight: .black))
                            .foregroundStyle(earned ? Color(red: 1, green: 0.82, blue: 0.35) : .white.opacity(0.35))
                        Text(trophy.displayName)
                            .font(.system(size: 13, weight: .black, design: .rounded))
                            .foregroundStyle(.white.opacity(earned ? 1 : 0.45))
                        Text(trophy.blurb)
                            .font(.system(size: 11, weight: .semibold, design: .rounded))
                            .foregroundStyle(.white.opacity(earned ? 0.75 : 0.35))
                            .lineLimit(3)
                    }
                    .padding(12)
                    .frame(maxWidth: .infinity, minHeight: 110, alignment: .topLeading)
                    .background(Color.white.opacity(earned ? 0.14 : 0.06), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .accessibilityIdentifier("world2.marbleVoyage.trophy.\(trophy.rawValue)")
                }
            }
        }
    }

    private var statsRow: some View {
        HStack(spacing: 16) {
            statChip("Fights", "\(gallery.lifetimeFightWins)")
            statChip("Heals", "\(gallery.lifetimeHeals)")
            statChip("Campaigns", "\(gallery.campaignClears)")
            statChip("Endless best", "\(MarbleVoyageRun.storedEndlessBest())")
        }
    }

    private func statChip(_ label: String, _ value: String) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.system(size: 20, weight: .black, design: .rounded))
                .foregroundStyle(.white)
            Text(label)
                .font(.system(size: 11, weight: .bold, design: .rounded))
                .foregroundStyle(.white.opacity(0.65))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(Color.black.opacity(0.28), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}

import SwiftUI

/// A local fair visit preserves the presenting playroom and its room selection.
struct FairWorldView: View {
    let playerID: PlayerId
    let onClose: () -> Void
    @ObservedObject private var players = PlayerStateService.shared
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var playing = false
    @State private var advanced = false

    private var unlocked: Bool {
        players.currentPlayer?.playerId == playerID && players.isFairUnlocked
    }

    private var carouselURL: URL? {
        Bundle.main.url(forResource: "fair_toy_carnival_carousel", withExtension: "mp4")
    }

    var body: some View {
        Group {
            if !unlocked || playing {
                FairMarblePuzzleView(
                    onWin: { players.unlockFair(playerID: playerID); playing = false },
                    onClose: onClose,
                    advanced: advanced,
                    onSolved: { players.unlockFair(playerID: playerID) }
                )
            } else {
                GeometryReader { geometry in
                    ZStack(alignment: .top) {
                        // Live toy carnival — auto-loops on the fair floor (no booth tap).
                        fairStage(size: geometry.size)

                        VStack {
                            HStack {
                                Button(action: onClose) { Label("Playroom", systemImage: "house.fill") }
                                    .buttonStyle(.borderedProminent).tint(.teal)
                                    .accessibilityIdentifier("fair.returnPlayroom")
                                Spacer()
                                Text("Welcome to the fair!")
                                    .font(.system(.title, design: .rounded, weight: .heavy))
                                    .padding(14).background(.regularMaterial, in: Capsule())
                                Spacer()
                            }
                            Spacer()
                            HStack(spacing: 18) {
                                booth("Marble Meadow", subtitle: "You + Pip", symbol: "circle.grid.3x3.fill", harder: false)
                                booth("Rainbow Challenge", subtitle: "One more marble color", symbol: "rainbow", harder: true)
                            }
                            Text("The toy carnival keeps spinning")
                                .font(.headline).padding(10).background(.regularMaterial, in: Capsule())
                        }.padding(24)
                    }
                }
                .accessibilityElement(children: .contain)
                .accessibilityIdentifier("fair.world")
                .accessibilityLabel("Fair with spinning toy carnival")
            }
        }
        .onAppear { if !unlocked { playing = true } }
        .onChange(of: players.currentPlayer?.playerId) { _, id in if id != playerID { onClose() } }
    }

    @ViewBuilder
    private func fairStage(size: CGSize) -> some View {
        ZStack {
            // Soft panorama wash behind the live toy.
            ScrollView(.horizontal) {
                Image("fair_destination").resizable().scaledToFit()
                    .frame(height: size.height)
            }
            .scrollIndicators(.hidden)
            .overlay(Color.black.opacity(0.18))

            Group {
                if reduceMotion || carouselURL == nil {
                    Image("fair_toy_carnival_poster")
                        .resizable()
                        .scaledToFit()
                } else if let carouselURL {
                    World2LoopingVideoView(url: carouselURL)
                        .aspectRatio(1, contentMode: .fit)
                        .accessibilityIdentifier("fair.carousel.live")
                }
            }
            .frame(maxWidth: min(size.width * 0.72, size.height * 0.72))
            .clipShape(RoundedRectangle(cornerRadius: 32, style: .continuous))
            .shadow(color: .black.opacity(0.35), radius: 22, y: 10)
            .padding(.bottom, 100)
            .allowsHitTesting(false)
            .accessibilityLabel("Toy carnival spinning")
            .accessibilityAddTraits(.updatesFrequently)
        }
    }

    private func booth(_ title: String, subtitle: String, symbol: String, harder: Bool) -> some View {
        Button {
            advanced = harder
            playing = true
        } label: {
            VStack(spacing: 8) {
                Image(systemName: symbol).font(.largeTitle)
                Text(title).font(.system(.title2, design: .rounded, weight: .bold))
                Text(subtitle).font(.subheadline)
            }.foregroundStyle(Color(red: 0.15, green: 0.32, blue: 0.33))
                .padding(22).frame(maxWidth: 310)
                .background(Color(red: 1, green: 0.97, blue: 0.86), in: RoundedRectangle(cornerRadius: 24))
                .overlay(RoundedRectangle(cornerRadius: 24).stroke(.white, lineWidth: 3))
        }.buttonStyle(.plain).accessibilityIdentifier(harder ? "fair.booth.challenge" : "fair.booth.meadow")
    }
}

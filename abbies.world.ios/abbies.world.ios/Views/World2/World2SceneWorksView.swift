import SwiftUI

struct World2SceneWorksView: View {
    let instanceID: String
    @ObservedObject var viewModel: World2ViewModel
    let onExit: () -> Void

    @State private var kitsMadeThisVisit = 0

    private var sceneKits: [World2PlaceInventoryItem] {
        viewModel.placeInventory.filter(\.isSceneKit)
    }

    var body: some View {
        ZStack {
            Color(red: 0.16, green: 0.22, blue: 0.18)
                .ignoresSafeArea()

            World2POIDrawnArtwork(style: .sceneWorks)
                .opacity(0.18)
                .scaledToFill()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .ignoresSafeArea()
                .allowsHitTesting(false)

            LinearGradient(
                colors: [.black.opacity(0.46), .clear, .black.opacity(0.38)],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            VStack(spacing: 18) {
                HStack {
                    Button(action: onExit) {
                        Label("Back to Map", systemImage: "arrow.left")
                            .font(.system(size: 15, weight: .black, design: .rounded))
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.white.opacity(0.22))
                    .accessibilityIdentifier("world2.sceneWorks.exit")

                    Spacer()

                    VStack(spacing: 1) {
                        Text("SCENE WORKS")
                            .font(.system(size: 30, weight: .black, design: .rounded))
                        Text("ORPHAN PRINTING DEPARTMENT")
                            .font(.system(size: 11, weight: .black, design: .rounded))
                            .opacity(0.70)
                    }
                    .foregroundStyle(.white)

                    Spacer()

                    Label(
                        "\(viewModel.sceneKitInventoryCount) kits",
                        systemImage: "map.fill"
                    )
                    .font(.system(size: 14, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(.black.opacity(0.48), in: Capsule())
                    .accessibilityIdentifier("world2.sceneWorks.inventoryCount")
                }

                Text("Make a scene kit, visit the new place, get it ready, then hang it on an open path. The kit stays in your pocket until it is connected.")
                    .font(.system(size: 15, weight: .bold, design: .rounded))
                    .foregroundStyle(.white.opacity(0.86))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 40)

                Spacer()

                HStack(alignment: .bottom, spacing: 22) {
                    VStack(spacing: 14) {
                        World2POIDrawnArtwork(style: .sceneWorks)
                            .frame(width: 140, height: 140)
                            .clipShape(RoundedRectangle(cornerRadius: 22))
                            .shadow(color: .mint.opacity(0.45), radius: 12)

                        Button {
                            guard viewModel.makeNewScene() != nil else { return }
                            kitsMadeThisVisit += 1
                        } label: {
                            Label("MAKE A NEW SCENE", systemImage: "sparkles")
                                .font(.system(size: 18, weight: .black, design: .rounded))
                                .foregroundStyle(.indigo)
                                .padding(.horizontal, 24)
                                .padding(.vertical, 15)
                                .background(.mint, in: Capsule())
                                .overlay(Capsule().stroke(.white, lineWidth: 3))
                                .shadow(color: .mint.opacity(0.54), radius: 20, y: 7)
                        }
                        .buttonStyle(.plain)
                        .accessibilityHint("Adds a scene kit to your pocket and creates an orphan place")
                        .accessibilityIdentifier("world2.sceneWorks.fabricate")

                        Text(
                            kitsMadeThisVisit == 0
                                ? "The kit will take you there. It is not used up until you connect the place."
                                : "\(kitsMadeThisVisit) printed this visit • \(viewModel.sceneKitInventoryCount) in your pocket"
                        )
                        .font(.system(size: 13, weight: .bold, design: .rounded))
                        .foregroundStyle(.white.opacity(0.82))
                        .multilineTextAlignment(.center)
                        .frame(maxWidth: 320)
                        .accessibilityIdentifier("world2.sceneWorks.result")
                    }

                    VStack(alignment: .leading, spacing: 10) {
                        Text("YOUR SCENE KITS")
                            .font(.system(size: 13, weight: .black, design: .rounded))
                            .foregroundStyle(.white.opacity(0.72))

                        if sceneKits.isEmpty {
                            Text("None yet. Print one and it will wait here.")
                                .font(.system(size: 14, weight: .bold, design: .rounded))
                                .foregroundStyle(.white.opacity(0.7))
                                .frame(maxWidth: 280, minHeight: 80, alignment: .leading)
                        } else {
                            ScrollView {
                                LazyVStack(spacing: 8) {
                                    ForEach(sceneKits) { item in
                                        Button {
                                            viewModel.visitSceneKit(item.id)
                                        } label: {
                                            HStack {
                                                Image(systemName: "map.fill")
                                                VStack(alignment: .leading, spacing: 1) {
                                                    Text(kitTitle(item))
                                                        .font(.system(size: 15, weight: .black, design: .rounded))
                                                    Text("Go there — kit stays until connected")
                                                        .font(.system(size: 11, weight: .bold, design: .rounded))
                                                        .opacity(0.72)
                                                }
                                                Spacer()
                                                Image(systemName: "arrow.right.circle.fill")
                                            }
                                            .foregroundStyle(.white)
                                            .padding(12)
                                            .background(.white.opacity(0.14), in: RoundedRectangle(cornerRadius: 16))
                                        }
                                        .buttonStyle(.plain)
                                        .accessibilityIdentifier("world2.sceneWorks.kit.\(item.id)")
                                    }
                                }
                            }
                            .frame(maxHeight: 240)
                        }
                    }
                    .padding(16)
                    .frame(minWidth: 300, maxWidth: 360)
                    .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 26))
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 16)
                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 26))
                .overlay {
                    RoundedRectangle(cornerRadius: 26)
                        .stroke(.white.opacity(0.72), lineWidth: 2)
                }
                .shadow(color: .black.opacity(0.32), radius: 18, y: 8)
            }
            .padding(.horizontal, 28)
            .padding(.vertical, 20)
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.sceneWorks")
        .onAppear {
            World2Diagnostics.log(
                "scene_works_opened",
                ["instance": instanceID]
            )
        }
    }

    private func kitTitle(_ item: World2PlaceInventoryItem) -> String {
        guard let sceneID = item.boundSceneID else { return "Scene Kit" }
        return viewModel.sceneGraph.scene(sceneID).name
    }
}

import SwiftUI

struct World2SelfReplicatingFactoryView: View {
    let instanceID: String
    @ObservedObject var viewModel: World2ViewModel
    let onExit: () -> Void

    @State private var copiesMadeThisVisit = 0

    var body: some View {
        ZStack {
            Color(red: 0.12, green: 0.16, blue: 0.18)
                .ignoresSafeArea()

            World2SemanticImage(
                semanticName: World2PlaceTemplate
                    .selfReplicatingFactory
                    .interiorAsset,
                fallbackIcon: "gearshape.2.fill",
                fallbackLabel: "POI Factory interior"
            )
            .scaledToFill()
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .ignoresSafeArea()

            LinearGradient(
                colors: [.black.opacity(0.42), .clear, .black.opacity(0.34)],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            VStack(spacing: 20) {
                HStack {
                    Button(action: onExit) {
                        Label("Back to Map", systemImage: "arrow.left")
                            .font(.system(size: 15, weight: .black, design: .rounded))
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.white.opacity(0.22))
                    .accessibilityIdentifier("world2.poiFactory.exit")

                    Spacer()

                    VStack(spacing: 1) {
                        Text("POI FACTORY")
                            .font(.system(size: 30, weight: .black, design: .rounded))
                        Text("SELF-REPLICATION DEPARTMENT")
                            .font(.system(size: 11, weight: .black, design: .rounded))
                            .opacity(0.70)
                    }
                    .foregroundStyle(.white)

                    Spacer()

                    Label(
                        "\(viewModel.factoryInventoryCount) ready",
                        systemImage: "shippingbox.fill"
                    )
                    .font(.system(size: 14, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(.black.opacity(0.48), in: Capsule())
                    .accessibilityIdentifier("world2.poiFactory.inventoryCount")
                }

                Spacer()

                HStack {
                    Spacer()

                    HStack(spacing: 18) {
                        World2SemanticImage(
                            semanticName: World2PlaceTemplate
                                .selfReplicatingFactory
                                .exteriorAsset,
                            fallbackIcon: World2PlaceTemplate
                                .selfReplicatingFactory
                                .fallbackIcon,
                            fallbackLabel: "POI Factory"
                        )
                        .scaledToFit()
                        .frame(width: 124, height: 124)
                        .clipShape(RoundedRectangle(cornerRadius: 20))
                        .shadow(color: .cyan.opacity(0.45), radius: 12)
                        .scaleEffect(copiesMadeThisVisit > 0 ? 1.04 : 1)
                        .animation(
                            .spring(response: 0.45, dampingFraction: 0.58),
                            value: copiesMadeThisVisit
                        )

                        VStack(alignment: .leading, spacing: 10) {
                            Text("THIS FACTORY MAKES A POI")
                                .font(.system(size: 18, weight: .black, design: .rounded))
                                .foregroundStyle(.white)

                            Button {
                                guard viewModel.fabricateFactoryCopy(from: instanceID) != nil else {
                                    return
                                }
                                copiesMadeThisVisit += 1
                            } label: {
                                Label("MAKE A POI FOR MY INVENTORY", systemImage: "sparkles")
                                    .font(.system(size: 18, weight: .black, design: .rounded))
                                    .foregroundStyle(.indigo)
                                    .padding(.horizontal, 24)
                                    .padding(.vertical, 15)
                                    .background(.yellow, in: Capsule())
                                    .overlay(Capsule().stroke(.white, lineWidth: 3))
                                    .shadow(color: .yellow.opacity(0.54), radius: 20, y: 7)
                            }
                            .buttonStyle(.plain)
                            .accessibilityHint("Adds one placeable POI to your inventory")
                            .accessibilityIdentifier("world2.poiFactory.fabricate")

                            Text(
                                copiesMadeThisVisit == 0
                                    ? "The copy waits in your pocket until you place it on an open pad."
                                    : "\(copiesMadeThisVisit) made this visit • \(viewModel.factoryInventoryCount) ready to place"
                            )
                            .font(.system(size: 13, weight: .bold, design: .rounded))
                            .foregroundStyle(.white.opacity(0.82))
                            .contentTransition(.numericText())
                            .accessibilityIdentifier("world2.poiFactory.result")
                        }
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
            }
            .padding(.horizontal, 28)
            .padding(.vertical, 20)
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.poiFactory")
        .onAppear {
            World2Diagnostics.log(
                "place_factory_activity_opened",
                [
                    "instance": instanceID,
                    "interaction": World2PlaceTemplate
                        .selfReplicatingFactory
                        .interactionTemplateID
                ]
            )
        }
    }
}

#Preview("POI Factory") {
    World2SelfReplicatingFactoryView(
        instanceID: "preview-factory",
        viewModel: World2ViewModel(),
        onExit: {}
    )
}

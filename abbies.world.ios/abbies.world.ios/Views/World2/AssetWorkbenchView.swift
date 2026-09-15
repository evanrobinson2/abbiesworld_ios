import SwiftUI

struct World2AssetWorkbenchView: View {
    @StateObject private var viewModel: World2AssetWorkbenchViewModel
    let onExit: () -> Void

    init(
        playerID: PlayerId,
        service: any World2AssetWorkbenchServing,
        onExit: @escaping () -> Void,
        onAward: @escaping (World2AssetWorkbenchAward, [String: Data]) -> Void = { _, _ in }
    ) {
        _viewModel = StateObject(
            wrappedValue: World2AssetWorkbenchViewModel(
                playerID: playerID,
                service: service,
                onAward: onAward
            )
        )
        self.onExit = onExit
    }

    var body: some View {
        workbenchCanvas
            .overlay(alignment: .topLeading) {
                exitButton
                    .padding(.top, 28)
                    .padding(.leading, 22)
            }
            .accessibilityElement(children: .contain)
            .accessibilityIdentifier("world2.assetWorkbench")
            .accessibilityValue(viewModel.diagnosticSummary)
    }

    private var workbenchCanvas: some View {
        GeometryReader { geometry in
            ZStack {
                Color(red: 0.10, green: 0.08, blue: 0.18)
                    .ignoresSafeArea()

                World2SemanticImage(
                    semanticName: "poi.assetWorkbench.interior",
                    fallbackIcon: "hammer.circle.fill",
                    fallbackLabel: "Asset Workbench interior artwork is awaiting qualification"
                )
                .scaledToFill()
                .frame(width: geometry.size.width, height: geometry.size.height)
                .clipped()
                .opacity(0.72)

                Color.black.opacity(0.42)
                    .ignoresSafeArea()
                    .allowsHitTesting(false)

                VStack(spacing: 12) {
                    Color.clear.frame(height: 52)

                    Group {
                        switch viewModel.phase {
                        case .composing:
                            recipeComposer
                        case .generating:
                            generationProgress
                        case .choosing:
                            candidateChooser
                        case .awarded:
                            awardCelebration
                        }
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
                .padding(.horizontal, 22)
                .padding(.top, 20)
                .padding(.bottom, 18)

                if let errorMessage = viewModel.errorMessage {
                    errorBanner(errorMessage)
                        .padding(.horizontal, 28)
                        .padding(.bottom, 22)
                        .frame(maxHeight: .infinity, alignment: .bottom)
                        .zIndex(100)
                }
            }
            .frame(width: geometry.size.width, height: geometry.size.height)
        }
    }

    private var exitButton: some View {
        HStack(spacing: 16) {
            Button(action: onExit) {
                Label("Work Land", systemImage: "arrow.left")
                    .font(.system(size: 15, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 15)
                    .padding(.vertical, 11)
                    .background(.black.opacity(0.62), in: Capsule())
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("world2.assetWorkbench.exit")

            Spacer()

            VStack(spacing: 1) {
                Text("ASSET WORKBENCH")
                    .font(.system(size: 29, weight: .black, design: .rounded))
                Text("MIX IDEAS • MAKE A PACK • CHOOSE THREE")
                    .font(.system(size: 11, weight: .black, design: .rounded))
                    .opacity(0.76)
            }
            .foregroundStyle(.white)

            Spacer()

            Text(viewModel.phase == .choosing ? viewModel.selectionStatus : "6 → 3")
                .font(.system(size: 14, weight: .black, design: .rounded))
                .foregroundStyle(.white)
                .padding(.horizontal, 15)
                .padding(.vertical, 11)
                .background(.indigo.opacity(0.82), in: Capsule())
                .frame(minWidth: 124, alignment: .trailing)
                .accessibilityIdentifier("world2.assetWorkbench.status")
        }
    }

    private var recipeComposer: some View {
        VStack(spacing: 9) {
            ideaCarousel(
                axis: .finish,
                cards: World2WorkbenchIdeaCatalog.finishes,
                selection: $viewModel.selectedFinishIndex,
                accent: .cyan
            )
            ideaCarousel(
                axis: .objectFamily,
                cards: World2WorkbenchIdeaCatalog.objectFamilies,
                selection: $viewModel.selectedObjectIndex,
                accent: .orange
            )
            ideaCarousel(
                axis: .personality,
                cards: World2WorkbenchIdeaCatalog.personalities,
                selection: $viewModel.selectedPersonalityIndex,
                accent: .pink
            )

            HStack(spacing: 14) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("YOUR RECIPE")
                        .font(.system(size: 11, weight: .black, design: .rounded))
                        .foregroundStyle(.white.opacity(0.70))
                    Text(viewModel.recipe?.displayName ?? "Choose one tile from every row")
                        .font(.system(size: 15, weight: .black, design: .rounded))
                        .foregroundStyle(.white)
                        .lineLimit(1)
                        .contentTransition(.opacity)
                }

                Spacer()

                Button(action: viewModel.generate) {
                    Label("MAKE 6 IDEAS", systemImage: "wand.and.stars")
                        .font(.system(size: 17, weight: .black, design: .rounded))
                        .foregroundStyle(.indigo)
                        .padding(.horizontal, 22)
                        .padding(.vertical, 13)
                        .background(.yellow, in: Capsule())
                        .overlay(Capsule().stroke(.white, lineWidth: 3))
                }
                .buttonStyle(.plain)
                .disabled(!viewModel.canGenerate)
                .opacity(viewModel.canGenerate ? 1 : 0.45)
                .accessibilityIdentifier("world2.assetWorkbench.generate")
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 10)
            .background(.black.opacity(0.55), in: RoundedRectangle(cornerRadius: 18))
        }
        .accessibilityIdentifier("world2.assetWorkbench.composer")
    }

    private func ideaCarousel(
        axis: World2WorkbenchIdeaAxis,
        cards: [World2WorkbenchIdeaCard],
        selection: Binding<Int?>,
        accent: Color
    ) -> some View {
        VStack(spacing: 1) {
            HStack {
                VStack(alignment: .leading, spacing: 0) {
                    Text(axis.title)
                        .font(.system(size: 13, weight: .black, design: .rounded))
                    Text(axis.instruction)
                        .font(.system(size: 10, weight: .bold, design: .rounded))
                        .opacity(0.72)
                }
                Spacer()
                Label("SWIPE", systemImage: "arrow.left.and.right")
                    .font(.system(size: 10, weight: .black, design: .rounded))
            }
            .foregroundStyle(.white)
            .padding(.horizontal, 14)

            Carousel(
                items: cards.map {
                    CarouselItem(
                        id: $0.id,
                        displayName: $0.title,
                        shortDescription: $0.shortDescription
                    )
                },
                selectedIndex: selection,
                config: carouselConfig(accent: accent)
            )
            .frame(height: 126)
            .accessibilityIdentifier(
                "world2.assetWorkbench.carousel.\(axis.rawValue)"
            )
        }
        .padding(.top, 7)
        .background(.black.opacity(0.48), in: RoundedRectangle(cornerRadius: 17))
    }

    private func carouselConfig(accent: Color) -> CarouselConfig {
        var config = CarouselConfig.default()
        config.tileWidth = 128
        config.tileHeight = 96
        config.tileSpacing = 11
        config.horizontalPadding = 12
        config.selectionBorderColor = accent
        config.selectionBorderWidth = 4
        config.selectionScaleFactor = 1.05
        config.pulseAmplitude = 0.018
        return config
    }

    private var generationProgress: some View {
        VStack(spacing: 22) {
            Spacer()
            Image(systemName: "hammer.circle.fill")
                .font(.system(size: 82, weight: .black))
                .foregroundStyle(.yellow)
                .symbolEffect(.bounce, options: .repeating)

            Text(viewModel.job?.stage.displayName ?? "Starting the workbench")
                .font(.system(size: 25, weight: .black, design: .rounded))
                .foregroundStyle(.white)

            ProgressView(value: viewModel.job?.progress ?? 0.02)
                .tint(.cyan)
                .frame(maxWidth: 420)
                .scaleEffect(y: 1.8)
                .accessibilityIdentifier("world2.assetWorkbench.progress")

            Text("Only safe, transparent, qualified creations can reach the choice tray.")
                .font(.system(size: 14, weight: .bold, design: .rounded))
                .foregroundStyle(.white.opacity(0.76))

            Button("Cancel", action: viewModel.cancelGeneration)
                .buttonStyle(.bordered)
                .tint(.white)
                .accessibilityIdentifier("world2.assetWorkbench.cancel")
            Spacer()
        }
        .padding(28)
        .background(.black.opacity(0.54), in: RoundedRectangle(cornerRadius: 28))
        .accessibilityIdentifier("world2.assetWorkbench.generating")
    }

    private var candidateChooser: some View {
        VStack(spacing: 14) {
            Text("PICK YOUR FAVORITE THREE")
                .font(.system(size: 22, weight: .black, design: .rounded))
                .foregroundStyle(.white)

            if let pack = viewModel.pack {
                LazyVGrid(
                    columns: Array(
                        repeating: GridItem(.flexible(), spacing: 12),
                        count: 3
                    ),
                    spacing: 12
                ) {
                    ForEach(pack.candidates) { candidate in
                        candidateTile(candidate)
                    }
                }
            }

            HStack(spacing: 12) {
                Button("Mix Again", action: viewModel.reset)
                    .buttonStyle(.bordered)
                    .tint(.white)
                    .accessibilityIdentifier("world2.assetWorkbench.mixAgain")

                Button(action: viewModel.confirmSelection) {
                    Label("KEEP MY THREE", systemImage: "shippingbox.fill")
                        .font(.system(size: 16, weight: .black, design: .rounded))
                }
                .buttonStyle(.borderedProminent)
                .tint(.green)
                .disabled(!viewModel.canConfirmSelection)
                .accessibilityIdentifier("world2.assetWorkbench.confirm")
            }
        }
        .padding(18)
        .background(.black.opacity(0.54), in: RoundedRectangle(cornerRadius: 26))
        .accessibilityIdentifier("world2.assetWorkbench.chooser")
    }

    private func candidateTile(_ candidate: World2AssetWorkbenchCandidate) -> some View {
        let selected = viewModel.selectedCandidateIDs.contains(candidate.id)
        return Button {
            viewModel.toggleCandidate(candidate)
        } label: {
            VStack(spacing: 6) {
                ZStack(alignment: .topTrailing) {
                    RoundedRectangle(cornerRadius: 16)
                        .fill(.white.opacity(0.90))
                    if let image = viewModel.candidateImages[candidate.id] {
                        Image(uiImage: image)
                            .resizable()
                            .scaledToFit()
                            .padding(8)
                    } else {
                        Image(systemName: "shippingbox.fill")
                            .font(.system(size: 42, weight: .bold))
                            .foregroundStyle(.indigo.opacity(0.62))
                    }

                    if selected {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 28, weight: .black))
                            .foregroundStyle(.green)
                            .background(.white, in: Circle())
                            .padding(7)
                    }
                }
                .frame(height: 145)

                Text(candidate.label)
                    .font(.system(size: 12, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                    .lineLimit(1)
            }
            .padding(8)
            .background(
                selected ? Color.indigo.opacity(0.92) : Color.black.opacity(0.56),
                in: RoundedRectangle(cornerRadius: 20)
            )
            .overlay {
                RoundedRectangle(cornerRadius: 20)
                    .stroke(selected ? .yellow : .white.opacity(0.24), lineWidth: selected ? 4 : 1)
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel(candidate.label)
        .accessibilityValue(selected ? "Selected" : "Not selected")
        .accessibilityIdentifier("world2.assetWorkbench.candidate.\(candidate.id)")
    }

    private var awardCelebration: some View {
        VStack(spacing: 20) {
            Spacer()
            Image(systemName: "shippingbox.and.arrow.backward.fill")
                .font(.system(size: 70, weight: .black))
                .foregroundStyle(.yellow)
                .symbolEffect(.bounce)

            Text("YOUR THREE CREATIONS ARE READY!")
                .font(.system(size: 25, weight: .black, design: .rounded))
                .foregroundStyle(.white)

            HStack(spacing: 14) {
                ForEach(viewModel.award?.decorations ?? []) { decoration in
                    VStack(spacing: 8) {
                        Image(systemName: "sparkles.square.filled.on.square")
                            .font(.system(size: 44, weight: .bold))
                        Text(decoration.label)
                            .font(.system(size: 12, weight: .black, design: .rounded))
                            .lineLimit(2)
                            .multilineTextAlignment(.center)
                    }
                    .foregroundStyle(.indigo)
                    .frame(width: 170, height: 135)
                    .background(.white.opacity(0.92), in: RoundedRectangle(cornerRadius: 20))
                }
            }

            Text("Your three creations are in the furniture drawer. Open your treehouse and tap Decorate My Room.")
                .font(.system(size: 13, weight: .bold, design: .rounded))
                .foregroundStyle(.white.opacity(0.74))
                .multilineTextAlignment(.center)
                .accessibilityIdentifier("world2.assetWorkbench.award.inventory")

            Button("Build Another Pack", action: viewModel.reset)
                .buttonStyle(.borderedProminent)
                .tint(.indigo)
                .accessibilityIdentifier("world2.assetWorkbench.buildAnother")
            Spacer()
        }
        .padding(28)
        .background(.black.opacity(0.58), in: RoundedRectangle(cornerRadius: 28))
        .accessibilityIdentifier("world2.assetWorkbench.award")
    }

    private func errorBanner(_ message: String) -> some View {
        HStack(spacing: 10) {
            Image(systemName: "exclamationmark.triangle.fill")
            Text(message)
                .font(.system(size: 13, weight: .bold, design: .rounded))
            Spacer()
            Button("Dismiss") {
                viewModel.reset()
            }
            .buttonStyle(.bordered)
        }
        .foregroundStyle(.white)
        .padding(14)
        .background(.red.opacity(0.90), in: RoundedRectangle(cornerRadius: 16))
        .accessibilityIdentifier("world2.assetWorkbench.error")
    }
}

#Preview {
    World2AssetWorkbenchView(
        playerID: .abbie,
        service: World2AssetWorkbenchPreviewService(),
        onExit: {}
    )
}

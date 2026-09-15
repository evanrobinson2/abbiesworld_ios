import Combine
import CryptoKit
import SwiftUI

struct World2CardFactoryView: View {
    @ObservedObject var viewModel: World2ViewModel
    let onExit: () -> Void

    @StateObject private var factory = World2FactoryViewModel()
    @State private var isHistoryOpen =
        ProcessInfo.processInfo.arguments.contains("-openWorld2FactoryHistory")
    @State private var selectedHistoryCardID: String?

    var body: some View {
        GeometryReader { screen in
            let drawerWidth = min(max(screen.size.width * 0.40, 340), 430)

            ZStack {
                World2SemanticImage(
                    semanticName: "poi.cardFactory.interior",
                    fallbackIcon: "wand.and.stars",
                    fallbackLabel: "Card Factory interior artwork is not bundled"
                )
                .scaledToFill()
                .frame(width: screen.size.width, height: screen.size.height)
                .clipped()
                .overlay(Color.indigo.opacity(0.22))

                VStack(spacing: 8) {
                    header

                    Text("Choose one from each moving shelf, then mix them together.")
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 6)
                        .background(.black.opacity(0.52), in: Capsule())
                        .accessibilityIdentifier("world2.factory.instructions")

                    factoryCarousel(
                        title: "CREATURE",
                        icon: "pawprint.fill",
                        color: .pink,
                        category: .creature,
                        ingredients: factory.creatures
                    )
                    factoryCarousel(
                        title: "OUTFIT OR POWER",
                        icon: "sparkles",
                        color: .purple,
                        category: .function,
                        ingredients: factory.functions
                    )
                    factoryCarousel(
                        title: "PLACE",
                        icon: "map.fill",
                        color: .cyan,
                        category: .context,
                        ingredients: factory.contexts
                    )

                    HStack(spacing: 14) {
                        if let outcome = factory.outcomeText {
                            Text(outcome)
                                .font(.system(size: 13, weight: .black, design: .rounded))
                                .foregroundStyle(.white)
                                .padding(.horizontal, 14)
                                .padding(.vertical, 8)
                                .background(.black.opacity(0.62), in: Capsule())
                                .accessibilityIdentifier("world2.factory.outcome")
                        }
                        createButton
                    }

                    Spacer(minLength: 4)
                }
                .padding(.horizontal, 22)
                .padding(.top, 12)
                .frame(
                    width: screen.size.width,
                    height: screen.size.height,
                    alignment: .top
                )
                .opacity(isHistoryOpen ? 0.64 : 1)
                .blur(radius: isHistoryOpen ? 1.5 : 0)

                if isHistoryOpen {
                    Color.black.opacity(0.16)
                        .ignoresSafeArea()
                        .onTapGesture {
                            withAnimation(.spring(response: 0.3, dampingFraction: 0.82)) {
                                isHistoryOpen = false
                            }
                        }
                }

                DrawerView(isOpen: $isHistoryOpen, width: drawerWidth) {
                    historyDrawer
                }
                .accessibilityIdentifier("world2.factory.historyDrawer")

                DrawerHandle(isOpen: $isHistoryOpen)
                    .position(
                        x: isHistoryOpen
                            ? screen.size.width - drawerWidth - 34
                            : screen.size.width - 34,
                        y: screen.size.height * 0.53
                    )
                    .zIndex(30)
                    .accessibilityLabel(
                        isHistoryOpen ? "Close my creations" : "Browse my creations"
                    )
                    .accessibilityIdentifier("world2.factory.historyHandle")

                backButton
                    .frame(
                        maxWidth: .infinity,
                        maxHeight: .infinity,
                        alignment: .bottomLeading
                    )
                    .padding(.leading, 22)
                    .padding(.bottom, 22)
                    .zIndex(20)

                if let preview = factory.previewCard {
                    decisionPanel(card: preview)
                        .transition(.scale.combined(with: .opacity))
                        .zIndex(40)
                }
            }
            .frame(width: screen.size.width, height: screen.size.height)
            .clipped()
        }
        .ignoresSafeArea()
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.factory")
        .onAppear {
            factory.start(catalog: viewModel.ingredientCatalog)
        }
    }

    private var header: some View {
        Text("CARD FACTORY")
            .font(.system(size: 28, weight: .black, design: .rounded))
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
    }

    private var backButton: some View {
        Button {
            World2Diagnostics.log("factory_exit")
            onExit()
        } label: {
            Label("Home World", systemImage: "arrow.left.circle.fill")
                .font(.system(size: 17, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
                .padding(.horizontal, 15)
                .padding(.vertical, 10)
                .background(.black.opacity(0.65), in: Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("world2.factory.back")
    }

    private func factoryCarousel(
        title: String,
        icon: String,
        color: Color,
        category: IngredientCategory,
        ingredients: [IngredientDefinition]
    ) -> some View {
        VStack(alignment: .leading, spacing: 1) {
            HStack {
                Label(title, systemImage: icon)
                Spacer()
                Label("SWIPE", systemImage: "arrow.left.and.right")
                    .foregroundStyle(.white.opacity(0.72))
            }
            .font(.system(size: 11, weight: .black, design: .rounded))
            .foregroundStyle(.white)
            .padding(.horizontal, 12)

            Carousel(
                items: ingredients.map {
                    CarouselItem(
                        id: $0.id,
                        imageName: $0.assetId,
                        displayName: $0.name
                    )
                },
                selectedIndex: selectionBinding(for: category, in: ingredients),
                config: carouselConfig(accent: color)
            )
            .frame(height: 135)
            .accessibilityIdentifier("world2.factory.carousel.\(category.rawValue)")
        }
        .padding(.top, 5)
        .background(.black.opacity(0.40), in: RoundedRectangle(cornerRadius: 18))
        .overlay(
            RoundedRectangle(cornerRadius: 18)
                .stroke(color.opacity(0.7), lineWidth: 2)
        )
    }

    private func selectionBinding(
        for category: IngredientCategory,
        in ingredients: [IngredientDefinition]
    ) -> Binding<Int?> {
        Binding(
            get: {
                guard let selected = factory.selection(for: category) else { return nil }
                return ingredients.firstIndex(where: { $0.id == selected.id })
            },
            set: { index in
                guard let index, ingredients.indices.contains(index) else {
                    factory.clearSelection(category)
                    return
                }
                factory.select(ingredients[index])
            }
        )
    }

    private func carouselConfig(accent: Color) -> CarouselConfig {
        var config = CarouselConfig.default()
        config.tileWidth = 108
        config.tileHeight = 108
        config.tileSpacing = 12
        config.horizontalPadding = 14
        config.verticalPadding = 2
        config.cornerRadius = 18
        config.selectionBorderColor = accent
        config.selectionBorderWidth = 4
        config.selectionScaleFactor = 1.04
        config.pulseAmplitude = 0.025
        config.tileChrome = .animalSticker
        return config
    }

    private var createButton: some View {
        Button {
            factory.createPreview()
        } label: {
            Label("Mix My Card", systemImage: "sparkles")
                .font(.system(size: 19, weight: .black, design: .rounded))
                .foregroundStyle(.white)
                .frame(maxWidth: 320)
                .padding(.vertical, 14)
                .background(factory.canCreate ? .purple : .gray, in: Capsule())
        }
        .disabled(!factory.canCreate)
        .accessibilityIdentifier("world2.factory.create")
    }

    private func decisionPanel(card: World2CreatureCard) -> some View {
        HStack(spacing: 18) {
            VStack(spacing: 8) {
                World2FactoryIngredientArtwork(
                    assetName: factory.creature?.assetId,
                    fallbackIcon: "pawprint.fill"
                )
                .frame(width: 170, height: 150)
                Text(card.displayName)
                    .font(.system(size: 19, weight: .black, design: .rounded))
                    .foregroundStyle(.primary)
                Text(card.fullDescription)
                    .font(.system(size: 13, weight: .semibold, design: .rounded))
                    .foregroundStyle(.secondary)
            }
            .accessibilityIdentifier("world2.factory.preview")

            VStack(spacing: 12) {
                Text("Keep this creature?")
                    .font(.system(size: 18, weight: .bold, design: .rounded))

                HStack(spacing: 12) {
                    Button {
                        factory.reject()
                    } label: {
                        Label("Reject", systemImage: "arrow.counterclockwise")
                    }
                    .buttonStyle(.bordered)
                    .tint(.white)
                    .accessibilityIdentifier("world2.factory.reject")

                    Button {
                        factory.keep()
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.82)) {
                            isHistoryOpen = true
                        }
                    } label: {
                        Label("Keep", systemImage: "heart.fill")
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.pink)
                    .accessibilityIdentifier("world2.factory.keep")
                }
                .font(.system(size: 17, weight: .bold, design: .rounded))
            }
        }
        .padding(22)
        .frame(width: 520)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 28))
        .overlay(
            RoundedRectangle(cornerRadius: 28)
                .stroke(.white.opacity(0.7), lineWidth: 2)
        )
        .shadow(color: .black.opacity(0.35), radius: 24, y: 10)
    }

    private var historyDrawer: some View {
        VStack(spacing: 12) {
            HStack {
                Label("MY CREATIONS", systemImage: "rectangle.stack.fill")
                    .font(.system(size: 20, weight: .black, design: .rounded))
                Spacer()
                Text("\(factory.savedCards.count)")
                    .font(.system(size: 15, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                    .frame(minWidth: 32, minHeight: 32)
                    .background(.purple, in: Circle())
                Button {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.82)) {
                        isHistoryOpen = false
                    }
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 28))
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Close my creations")
            }

            if factory.savedCards.isEmpty {
                ContentUnavailableView(
                    "No creations yet",
                    systemImage: "sparkles.rectangle.stack",
                    description: Text("Mix three ingredients and keep the result. It will appear here.")
                )
            } else {
                ScrollView {
                    LazyVStack(spacing: 10) {
                        ForEach(factory.savedCards) { card in
                            historyCard(card)
                        }
                    }
                    .padding(.vertical, 4)
                }
                .frame(maxHeight: factory.savedCards.count < 3 ? 190 : .infinity)
            }

            VStack(spacing: 8) {
                World2SemanticImage(
                    semanticName: "poi.cardFactory.exterior",
                    fallbackIcon: "wand.and.stars",
                    fallbackLabel: "Card Factory"
                )
                .scaledToFit()
                .frame(height: 210)

                Text("KEEP MIXING!")
                    .font(.system(size: 17, weight: .black, design: .rounded))
                    .foregroundStyle(.purple)

                Text("Every card you keep lives here. What will you make next?")
                    .font(.system(size: 13, weight: .bold, design: .rounded))
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)

                Button {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.82)) {
                        isHistoryOpen = false
                    }
                } label: {
                    Label("Back to Mixing", systemImage: "wand.and.stars")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .tint(.purple)
            }
            .frame(maxHeight: .infinity, alignment: .center)
        }
        .padding(20)
        .accessibilityElement(children: .contain)
    }

    private func historyCard(_ card: World2CreatureCard) -> some View {
        let isSelected = selectedHistoryCardID == card.id
        return Button {
            withAnimation(.spring(response: 0.25, dampingFraction: 0.82)) {
                selectedHistoryCardID = isSelected ? nil : card.id
            }
        } label: {
            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 10) {
                    HStack(spacing: -10) {
                        ForEach(card.allIngredients, id: \.id) { reference in
                            World2FactoryIngredientArtwork(
                                assetName: viewModel.ingredientCatalog
                                    .ingredient(byId: reference.id)?.assetId,
                                fallbackIcon: reference.category.iconName
                            )
                            .frame(width: 54, height: 54)
                        }
                    }
                    Text(card.displayName)
                        .font(.system(size: 16, weight: .black, design: .rounded))
                        .foregroundStyle(.primary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    Image(systemName: isSelected ? "chevron.up" : "chevron.down")
                        .foregroundStyle(.secondary)
                }

                if isSelected {
                    Text(card.fullDescription)
                        .font(.system(size: 13, weight: .semibold, design: .rounded))
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
            .padding(12)
            .background(.white.opacity(0.72), in: RoundedRectangle(cornerRadius: 18))
            .overlay(
                RoundedRectangle(cornerRadius: 18)
                    .stroke(isSelected ? Color.purple : .clear, lineWidth: 3)
            )
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("world2.factory.history.\(card.id)")
    }
}

private struct World2FactoryIngredientArtwork: View {
    let assetName: String?
    let fallbackIcon: String

    var body: some View {
        Group {
            if let assetName,
               let image = MediaPackImageLoader.image(named: assetName) {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
            } else {
                ZStack {
                    LinearGradient(
                        colors: [.pink.opacity(0.65), .purple.opacity(0.8)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                    Image(systemName: fallbackIcon)
                        .font(.system(size: 28, weight: .bold))
                        .foregroundStyle(.white)
                }
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(.white.opacity(0.7), lineWidth: 2)
        )
        .clipped()
    }
}

@MainActor
final class World2FactoryViewModel: ObservableObject {
    @Published private(set) var creatures: [IngredientDefinition] = []
    @Published private(set) var functions: [IngredientDefinition] = []
    @Published private(set) var contexts: [IngredientDefinition] = []
    @Published private(set) var creature: IngredientDefinition?
    @Published private(set) var function: IngredientDefinition?
    @Published private(set) var context: IngredientDefinition?
    @Published private(set) var previewCard: World2CreatureCard?
    @Published private(set) var outcomeText: String?
    @Published private(set) var savedCards: [World2CreatureCard] = []

    private var didLogFirstAction = false
    private var autoplayStarted = false

    var canCreate: Bool {
        creature != nil && function != nil && context != nil && previewCard == nil
    }

    func start(catalog: IngredientCatalog) {
        creatures = Array(catalog.creatures.prefix(10))
        functions = Array(catalog.functions.prefix(10))
        contexts = Array(catalog.contexts.prefix(10))
        refreshSavedCards()
        World2Diagnostics.log("factory_launched", ["mode": "offline_deterministic"])

        let arguments = Set(ProcessInfo.processInfo.arguments)
        guard arguments.contains("-autoPlayWorld2Factory")
                || arguments.contains("-autoRejectWorld2Factory"),
              !autoplayStarted else {
            return
        }
        autoplayStarted = true
        Task { @MainActor [weak self] in
            guard let self,
                  let creature = self.creatures.first,
                  let function = self.functions.first,
                  let context = self.contexts.first else {
                World2Diagnostics.log("factory_autoplay_error", ["reason": "missing_starter_inputs"])
                return
            }
            self.select(creature)
            self.select(function)
            self.select(context)
            try? await Task.sleep(for: .milliseconds(150))
            self.createPreview()
            try? await Task.sleep(for: .milliseconds(150))
            if arguments.contains("-autoRejectWorld2Factory") {
                self.reject()
                World2Diagnostics.log("factory_autoplay_complete", ["result": "rejected"])
            } else {
                self.keep()
                World2Diagnostics.log("factory_autoplay_complete", ["result": "kept"])
            }
        }
    }

    func select(_ ingredient: IngredientDefinition) {
        if !didLogFirstAction {
            didLogFirstAction = true
            World2Diagnostics.log("factory_first_action", ["ingredient": ingredient.id])
        }
        switch ingredient.category {
        case .creature:
            creature = ingredient
        case .function:
            function = ingredient
        case .context:
            context = ingredient
        }
        previewCard = nil
        outcomeText = nil
        World2Diagnostics.log(
            "factory_selection",
            ["category": ingredient.category.rawValue, "ingredient": ingredient.id]
        )
    }

    func selection(for category: IngredientCategory) -> IngredientDefinition? {
        switch category {
        case .creature: return creature
        case .function: return function
        case .context: return context
        }
    }

    func clearSelection(_ category: IngredientCategory) {
        switch category {
        case .creature: creature = nil
        case .function: function = nil
        case .context: context = nil
        }
        previewCard = nil
        outcomeText = nil
    }

    func createPreview() {
        guard let creature, let function, let context else {
            World2Diagnostics.log("factory_error", ["reason": "incomplete_recipe"])
            return
        }

        let ingredients = [creature, function, context]
        let recipeHash = deterministicHash(for: ingredients.map(\.id))
        let references = ingredients.map {
            World2CreatureCard.IngredientReference(id: $0.id, name: $0.name, category: $0.category)
        }
        previewCard = World2CreatureCard(
            id: "world2-card-\(recipeHash)",
            playerId: PlayerStateService.shared.currentPlayer?.playerId.rawValue ?? PlayerId.abbie.rawValue,
            creatureIngredient: references[0],
            functionIngredient: references[1],
            contextIngredient: references[2],
            prompt: "\(creature.name) who is a \(function.name) in \(context.name)",
            generatedImageUrl: nil,
            thumbnailUrl: nil,
            createdAt: Date(),
            accepted: false,
            inActiveDeck: false,
            rarity: ingredients.map(\.rarity).max() ?? .common,
            score: nil,
            generationStatus: .completed,
            recipeHash: recipeHash
        )
        World2Diagnostics.log("factory_round_ready", ["recipe": recipeHash])
    }

    func keep() {
        guard var card = previewCard else { return }
        card.accepted = true
        let wasAlreadyKept = card.recipeHash.map {
            PlayerStateService.shared.hasCardWithRecipeHash($0)
        } ?? false
        if !wasAlreadyKept {
            PlayerStateService.shared.addCardToCollection(card)
        }
        refreshSavedCards()
        outcomeText = wasAlreadyKept
            ? "Already kept! This creature is still in your collection."
            : "Kept! Your creature is in your collection."
        previewCard = nil
        World2Diagnostics.log(
            "factory_completed",
            ["decision": "keep", "new_card_saved": String(!wasAlreadyKept)]
        )
    }

    func reject() {
        guard previewCard != nil else { return }
        previewCard = nil
        outcomeText = "Released! Nothing was saved. Try another mix."
        World2Diagnostics.log("factory_completed", ["decision": "reject", "persisted": "false"])
    }

    private func refreshSavedCards() {
        savedCards = (PlayerStateService.shared.currentPlayer?.cardCollection.acceptedCards ?? [])
            .sorted { $0.createdAt > $1.createdAt }
    }

    private func deterministicHash(for ingredientIds: [String]) -> String {
        let data = Data(ingredientIds.sorted().joined(separator: "|").utf8)
        return SHA256.hash(data: data).prefix(8).map { String(format: "%02x", $0) }.joined()
    }
}

#Preview {
    World2CardFactoryView(viewModel: World2ViewModel(), onExit: {})
}

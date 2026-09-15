import SwiftUI

struct World2FurnitureStoreView: View {
    @ObservedObject var viewModel: World2ViewModel
    @ObservedObject private var playerState = PlayerStateService.shared
    let onExit: () -> Void
    let onDecorateHome: () -> Void

    @State private var selectedFurnitureID: String? = FurnitureItem.storeCatalog.first?.id
    @State private var craftedItem: FurnitureItem?
    @State private var showingCraft = false
    @State private var selectedCategory: String?
    @State private var challengeIndex = 0
    @State private var selectedAnswer: Int?
    @State private var answerFeedback: AnswerFeedback = .ready
    @State private var isAdvancingChallenge = false

    private enum AnswerFeedback {
        case ready
        case correct
        case tryAgain
    }

    private var categories: [String] {
        Array(Set(FurnitureItem.storeCatalog.map(\.category))).sorted()
    }

    private var visibleItems: [FurnitureItem] {
        guard let selectedCategory else { return FurnitureItem.storeCatalog }
        return FurnitureItem.storeCatalog.filter { $0.category == selectedCategory }
    }

    private var selectedFurniture: FurnitureItem? {
        guard let selectedFurnitureID else { return nil }
        return FurnitureItem.item(id: selectedFurnitureID)
    }

    private var challenge: FurnitureMathChallenge {
        FurnitureMathChallenge.ageSixBank[
            challengeIndex % FurnitureMathChallenge.ageSixBank.count
        ]
    }

    var body: some View {
        GeometryReader { screen in
            ZStack {
                World2SemanticImage(
                    semanticName: "poi.furnitureStore.interior",
                    fallbackIcon: "chair.lounge.fill",
                    fallbackLabel: "Furniture Store interior artwork is awaiting approval"
                )
                .scaledToFill()
                .frame(width: screen.size.width, height: screen.size.height)
                .clipped()
                .saturation(0.78)
                .overlay(Color.indigo.opacity(0.16))
                .overlay(Color.black.opacity(0.18))

                VStack(spacing: 12) {
                    header

                    HStack(spacing: 14) {
                        catalogPanel
                        workshopPanel
                            .frame(width: min(330, screen.size.width * 0.34))
                    }
                    .frame(maxHeight: .infinity)
                    .padding(.bottom, 48)
                }
                .padding(.horizontal, 20)
                .padding(.top, 12)
                .padding(.bottom, 18)

                backButton
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomLeading)
                    .padding(.leading, 22)
                    .padding(.bottom, 20)
                    .zIndex(20)

                if showingCraft {
                    craftCelebration
                        .transition(.scale.combined(with: .opacity))
                        .zIndex(50)
                }
            }
            .frame(width: screen.size.width, height: screen.size.height)
            .clipped()
        }
        .ignoresSafeArea()
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.furnitureStore")
        .onAppear {
            World2Diagnostics.log(
                "furniture_store_opened",
                [
                    "furniture_ingredients": "\(playerState.furnitureIngredients)",
                    "player": viewModel.currentPlayerId?.rawValue ?? "none",
                ]
            )
            if ProcessInfo.processInfo.arguments.contains("-autoPlayWorld2FurnitureStore") {
                selectedFurnitureID = FurnitureItem.storeCatalog.first?.id
                for _ in 0..<FurnitureItem.ingredientCost {
                    playerState.earnFurnitureIngredient()
                }
                Task { @MainActor in
                    try? await Task.sleep(for: .milliseconds(500))
                    craftSelectedFurniture()
                }
            }
        }
    }

    private var header: some View {
        HStack(spacing: 14) {
            Label("FURNITURE STORE", systemImage: "chair.lounge.fill")
                .font(.system(size: 25, weight: .black, design: .rounded))
                .foregroundStyle(.white)

            Text("Solve, collect, and make something for your treehouse.")
                .font(.system(size: 13, weight: .bold, design: .rounded))
                .foregroundStyle(.white.opacity(0.82))

            Spacer()

            HStack(spacing: 7) {
                FurnitureIngredientTile(size: 20, isFilled: true)
                Text("\(playerState.furnitureIngredients) INGREDIENTS")
            }
                .font(.system(size: 15, weight: .black, design: .rounded))
                .foregroundStyle(
                    playerState.furnitureIngredients >= FurnitureItem.ingredientCost
                        ? .yellow
                        : .white
                )
                .padding(.horizontal, 15)
                .padding(.vertical, 10)
                .background(.black.opacity(0.66), in: Capsule())
                .accessibilityLabel("\(playerState.furnitureIngredients) furniture ingredients")
                .accessibilityIdentifier("world2.furnitureStore.ingredients")
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 12)
        .background(.black.opacity(0.62), in: RoundedRectangle(cornerRadius: 20))
    }

    private var catalogPanel: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("CHOOSE ONE PIECE TO MAKE")
                Spacer()
                Label("SWIPE TO BROWSE", systemImage: "arrow.left.and.right")
            }
            .font(.system(size: 11, weight: .black, design: .rounded))
            .foregroundStyle(.white.opacity(0.82))
            .padding(.horizontal, 6)

            ScrollView(.horizontal) {
                HStack(spacing: 7) {
                    categoryButton(
                        title: "All \(FurnitureItem.storeCatalog.count)",
                        category: nil
                    )
                    ForEach(categories, id: \.self) { category in
                        categoryButton(title: category, category: category)
                    }
                }
                .padding(.horizontal, 5)
            }
            .scrollIndicators(.hidden)
            .frame(height: 31)
            .accessibilityIdentifier("world2.furnitureStore.categories")

            GeometryReader { geometry in
                let rowHeight = max(168, (geometry.size.height - 10) / 2)
                ScrollView(.horizontal) {
                    LazyHGrid(
                        rows: [
                            GridItem(.fixed(rowHeight), spacing: 10),
                            GridItem(.fixed(rowHeight), spacing: 10),
                        ],
                        spacing: 10
                    ) {
                        ForEach(visibleItems) { item in
                            furnitureTile(item)
                                .frame(width: 150, height: rowHeight)
                        }
                    }
                    .padding(8)
                }
                .scrollIndicators(.visible)
            }
            .overlay(alignment: .trailing) {
                Image(systemName: "chevron.right")
                    .font(.system(size: 17, weight: .black))
                    .foregroundStyle(.white)
                    .frame(width: 34, height: 76)
                    .background(.black.opacity(0.54), in: Capsule())
                    .padding(.trailing, 3)
                    .allowsHitTesting(false)
                    .accessibilityHidden(true)
            }
        }
        .padding(10)
        .background(.black.opacity(0.48), in: RoundedRectangle(cornerRadius: 22))
        .overlay(
            RoundedRectangle(cornerRadius: 22)
                .stroke(.white.opacity(0.32), lineWidth: 1.5)
        )
        .accessibilityIdentifier("world2.furnitureStore.catalog")
    }

    private func categoryButton(title: String, category: String?) -> some View {
        let isSelected = selectedCategory == category
        return Button {
            withAnimation(.easeOut(duration: 0.18)) {
                selectedCategory = category
            }
        } label: {
            Text(title.uppercased())
                .font(.system(size: 9, weight: .black, design: .rounded))
                .foregroundStyle(.white)
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(
                    isSelected ? Color.indigo : Color.black.opacity(0.62),
                    in: Capsule()
                )
                .overlay(
                    Capsule()
                        .stroke(isSelected ? .yellow : .white.opacity(0.35), lineWidth: 1.5)
                )
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Show \(title) furniture")
        .accessibilityAddTraits(isSelected ? .isSelected : [])
        .accessibilityIdentifier(
            "world2.furnitureStore.category.\(category ?? "all")"
        )
    }

    private func furnitureTile(_ item: FurnitureItem) -> some View {
        let isSelected = selectedFurnitureID == item.id

        return Button {
            withAnimation(.spring(response: 0.28, dampingFraction: 0.78)) {
                selectedFurnitureID = item.id
            }
        } label: {
            VStack(spacing: 5) {
                Image(item.assetName)
                    .resizable()
                    .scaledToFit()
                    .frame(maxWidth: 126, maxHeight: 96)
                    .scaleEffect(isSelected ? 1.04 : 1)

                Text(item.name)
                    .font(.system(size: 12, weight: .black, design: .rounded))
                    .foregroundStyle(.primary)
                    .lineLimit(2)
                    .multilineTextAlignment(.center)

                HStack {
                    Text(item.category.uppercased())
                        .font(.system(size: 8, weight: .black, design: .rounded))
                        .foregroundStyle(.secondary)
                    Spacer()
                    HStack(spacing: 3) {
                        FurnitureIngredientTile(size: 13, isFilled: true)
                        Text("\(FurnitureItem.ingredientCost)")
                    }
                        .font(.system(size: 11, weight: .black, design: .rounded))
                        .foregroundStyle(.indigo)
                }
            }
            .padding(9)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(.white.opacity(0.91), in: RoundedRectangle(cornerRadius: 17))
            .overlay(
                RoundedRectangle(cornerRadius: 17)
                    .stroke(isSelected ? Color.yellow : .white.opacity(0.5), lineWidth: isSelected ? 4 : 1)
            )
            .overlay(alignment: .topTrailing) {
                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 22))
                        .foregroundStyle(.yellow, .indigo)
                        .padding(6)
                }
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel(
            "\(item.name), costs \(FurnitureItem.ingredientCost) ingredients, "
                + (isSelected ? "selected" : "not selected")
        )
        .accessibilityHint(
            "\(item.description) "
                + (isSelected ? "This is ready to make." : "Selects this furniture to make.")
        )
        .accessibilityIdentifier("world2.furnitureStore.item.\(item.id)")
    }

    private var workshopPanel: some View {
        VStack(spacing: 12) {
            mathTaskPanel
            Divider()
            makeFurniturePanel
        }
        .padding(16)
        .background(.ultraThickMaterial, in: RoundedRectangle(cornerRadius: 22))
        .overlay(
            RoundedRectangle(cornerRadius: 22)
                .stroke(.white.opacity(0.54), lineWidth: 1.5)
        )
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.furnitureStore.workshop")
    }

    private var mathTaskPanel: some View {
        VStack(spacing: 9) {
            Label("EARN AN INGREDIENT", systemImage: "sparkles")
                .font(.system(size: 16, weight: .black, design: .rounded))

            Text("What is \(challenge.equation)?")
                .font(.system(size: 27, weight: .black, design: .rounded))
                .foregroundStyle(.indigo)
                .contentTransition(.numericText())
                .accessibilityIdentifier("world2.furnitureStore.math.question")

            HStack(spacing: 8) {
                ForEach(challenge.choices, id: \.self) { choice in
                    Button {
                        checkAnswer(choice)
                    } label: {
                        Text("\(choice)")
                            .font(.system(size: 21, weight: .black, design: .rounded))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 9)
                            .background(answerColor(for: choice), in: RoundedRectangle(cornerRadius: 13))
                            .foregroundStyle(.white)
                    }
                    .buttonStyle(.plain)
                    .disabled(isAdvancingChallenge)
                    .accessibilityIdentifier("world2.furnitureStore.math.answer.\(choice)")
                }
            }

            Text(answerMessage)
                .font(.system(size: 11, weight: .bold, design: .rounded))
                .foregroundStyle(answerFeedback == .tryAgain ? .orange : .secondary)
                .multilineTextAlignment(.center)
                .frame(minHeight: 28)
                .accessibilityIdentifier("world2.furnitureStore.math.feedback")

            HStack(spacing: 5) {
                ForEach(0..<FurnitureItem.ingredientCost, id: \.self) { index in
                    FurnitureIngredientTile(
                        size: 19,
                        isFilled: index < min(
                            playerState.furnitureIngredients,
                            FurnitureItem.ingredientCost
                        )
                    )
                }
                Text("\(playerState.furnitureIngredients) ready")
                    .font(.system(size: 11, weight: .black, design: .rounded))
            }
            .accessibilityIdentifier("world2.furnitureStore.ingredientMeter")
        }
    }

    private var makeFurniturePanel: some View {
        VStack(spacing: 8) {
            Text("MAKE FURNITURE")
                .font(.system(size: 15, weight: .black, design: .rounded))

            if let selectedFurniture {
                Image(selectedFurniture.assetName)
                    .resizable()
                    .scaledToFit()
                    .frame(height: 76)

                Text(selectedFurniture.name)
                    .font(.system(size: 13, weight: .black, design: .rounded))
                    .lineLimit(2)
                    .multilineTextAlignment(.center)
            }

            Button(action: craftSelectedFurniture) {
                Label(
                    "MAKE FOR \(FurnitureItem.ingredientCost)",
                    systemImage: "hammer.fill"
                )
                .font(.system(size: 14, weight: .black, design: .rounded))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 11)
            }
            .buttonStyle(.borderedProminent)
            .tint(.indigo)
            .disabled(
                selectedFurniture == nil
                    || playerState.furnitureIngredients < FurnitureItem.ingredientCost
            )
            .accessibilityIdentifier("world2.furnitureStore.craft")

            Text("Any 3 ingredients can make any 1 piece.")
                .font(.system(size: 10, weight: .semibold, design: .rounded))
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
    }

    private var backButton: some View {
        Button(action: onExit) {
            Label("Farm Land", systemImage: "arrow.left.circle.fill")
                .font(.system(size: 16, weight: .black, design: .rounded))
                .foregroundStyle(.white)
                .padding(.horizontal, 15)
                .padding(.vertical, 11)
                .background(.black.opacity(0.72), in: Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("world2.furnitureStore.back")
    }

    private var craftCelebration: some View {
        ZStack {
            Color.black.opacity(0.58)
                .ignoresSafeArea()

            VStack(spacing: 17) {
                Image(systemName: "hammer.circle.fill")
                    .font(.system(size: 52))
                    .foregroundStyle(.yellow)

                Text("YOU MADE FURNITURE!")
                    .font(.system(size: 25, weight: .black, design: .rounded))

                Text(
                    "\(craftedItem?.name ?? "Your new piece") is now in "
                        + "\(viewModel.currentPlayerId?.displayName ?? "your")'s inventory."
                )
                    .font(.system(size: 14, weight: .bold, design: .rounded))
                    .multilineTextAlignment(.center)

                if let craftedItem {
                    Image(craftedItem.assetName)
                        .resizable()
                        .scaledToFit()
                        .frame(width: 130, height: 110)
                        .padding(8)
                        .background(.white.opacity(0.8), in: RoundedRectangle(cornerRadius: 22))
                }

                HStack(spacing: 12) {
                    Button {
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.82)) {
                            showingCraft = false
                            craftedItem = nil
                        }
                    } label: {
                        Label("Make Another", systemImage: "arrow.clockwise")
                    }
                    .buttonStyle(.bordered)

                    Button(action: onDecorateHome) {
                        Label("Decorate My Treehouse", systemImage: "paintbrush.pointed.fill")
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.indigo)
                    .accessibilityIdentifier("world2.furnitureStore.decorateHome")
                }
                .font(.system(size: 15, weight: .black, design: .rounded))
            }
            .foregroundStyle(.primary)
            .padding(28)
            .frame(maxWidth: 570)
            .background(.ultraThickMaterial, in: RoundedRectangle(cornerRadius: 28))
            .overlay(
                RoundedRectangle(cornerRadius: 28)
                    .stroke(.yellow, lineWidth: 3)
            )
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.furnitureStore.craftComplete")
    }

    private var answerMessage: String {
        switch answerFeedback {
        case .ready:
            return "Pick the answer. Every solved task makes 1 ingredient."
        case .correct:
            return "You got it! One ingredient made."
        case .tryAgain:
            return "Almost! Try another answer."
        }
    }

    private func answerColor(for choice: Int) -> Color {
        guard selectedAnswer == choice else { return .indigo }
        switch answerFeedback {
        case .correct: return .green
        case .tryAgain: return .orange
        case .ready: return .indigo
        }
    }

    private func checkAnswer(_ choice: Int) {
        guard !isAdvancingChallenge else { return }
        selectedAnswer = choice

        guard choice == challenge.answer else {
            answerFeedback = .tryAgain
            World2Diagnostics.log(
                "furniture_math_try_again",
                ["equation": challenge.equation]
            )
            return
        }

        answerFeedback = .correct
        isAdvancingChallenge = true
        playerState.earnFurnitureIngredient()
        World2Diagnostics.log(
            "furniture_ingredient_earned",
            [
                "equation": challenge.equation,
                "ingredient_count": "\(playerState.furnitureIngredients)",
                "player": viewModel.currentPlayerId?.rawValue ?? "none",
            ]
        )
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(650))
            withAnimation(.easeInOut(duration: 0.2)) {
                challengeIndex += 1
                selectedAnswer = nil
                answerFeedback = .ready
                isAdvancingChallenge = false
            }
        }
    }

    private func craftSelectedFurniture() {
        guard let selectedFurniture,
              playerState.craftFurniture(selectedFurniture) != nil else {
            return
        }
        craftedItem = selectedFurniture
        withAnimation(.spring(response: 0.4, dampingFraction: 0.72)) {
            showingCraft = true
        }
        World2Diagnostics.log(
            "furniture_crafted",
            [
                "ingredient_cost": "\(FurnitureItem.ingredientCost)",
                "furniture_id": selectedFurniture.id,
                "player": viewModel.currentPlayerId?.rawValue ?? "none",
            ]
        )
    }
}

private struct FurnitureIngredientTile: View {
    let size: CGFloat
    let isFilled: Bool

    var body: some View {
        RoundedRectangle(cornerRadius: size * 0.22)
            .fill(
                isFilled
                    ? AnyShapeStyle(
                        LinearGradient(
                            colors: [.yellow, .orange],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    : AnyShapeStyle(Color.gray.opacity(0.24))
            )
            .frame(width: size, height: size)
            .overlay {
                RoundedRectangle(cornerRadius: size * 0.22)
                    .stroke(.white.opacity(isFilled ? 0.8 : 0.35), lineWidth: 1.5)
            }
            .overlay {
                Image(systemName: "sparkle")
                    .font(.system(size: size * 0.48, weight: .black))
                    .foregroundStyle(isFilled ? .white : .gray.opacity(0.45))
            }
            .accessibilityHidden(true)
    }
}

#Preview {
    World2FurnitureStoreView(
        viewModel: World2ViewModel(),
        onExit: {},
        onDecorateHome: {}
    )
}

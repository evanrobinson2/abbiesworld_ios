//
//  IngredientTiles.swift
//  abbies.world.ios
//
//  Reusable generated-art tiles and Creature Lab UI components.
//

import SwiftUI

// MARK: - Creature Lab UI Language

struct CreatureLabGlyph: View {
    let symbol: String
    let tint: Color
    var size: CGFloat = 34

    var body: some View {
        Image(systemName: symbol)
            .font(.system(size: size * 0.46, weight: .bold, design: .rounded))
            .symbolRenderingMode(.palette)
            .foregroundStyle(.white, tint)
            .frame(width: size, height: size)
            .background(
                Circle()
                    .fill(tint.gradient)
                    .shadow(color: tint.opacity(0.55), radius: 5, y: 2)
            )
            .overlay {
                Circle()
                    .stroke(.white.opacity(0.65), lineWidth: 1.5)
            }
            .accessibilityHidden(true)
    }
}

struct IngredientArtworkChip: View {
    let ingredient: CreatureIngredient?
    let size: CGFloat
    var accent: Color = .purple

    var body: some View {
        Group {
            if let ingredient {
                Image(ingredient.artworkName)
                    .resizable()
                    .scaledToFill()
            } else {
                ZStack {
                    accent.opacity(0.25)
                    Image(systemName: "questionmark")
                        .font(.system(size: size * 0.4, weight: .heavy, design: .rounded))
                        .foregroundStyle(.white.opacity(0.75))
                }
            }
        }
        .frame(width: size, height: size)
        .clipShape(RoundedRectangle(cornerRadius: size * 0.22))
        .overlay {
            RoundedRectangle(cornerRadius: size * 0.22)
                .stroke(.white.opacity(0.65), lineWidth: max(1.5, size * 0.035))
        }
        .shadow(color: accent.opacity(0.4), radius: size * 0.08, y: 2)
        .accessibilityHidden(true)
    }
}

struct CreatureLabSparkle: View {
    let color: Color
    var size: CGFloat = 18

    var body: some View {
        Image(systemName: "sparkle")
            .font(.system(size: size, weight: .black))
            .symbolRenderingMode(.monochrome)
        .foregroundStyle(color)
        .shadow(color: color.opacity(0.8), radius: size * 0.18)
        .frame(width: size, height: size)
        .accessibilityHidden(true)
    }
}

struct CreatureLabCardBack: View {
    let creature: CreatureIngredient?
    let outfit: CreatureIngredient?
    let buddy: CreatureIngredient?

    var body: some View {
        GeometryReader { geometry in
            let chipSize = min(max(geometry.size.width * 0.18, 24), 48)

            ZStack {
                Image("creature_builder_workshop_background")
                    .resizable()
                    .scaledToFill()
                    .opacity(0.35)

                LinearGradient(
                    colors: [
                        Color.indigo.opacity(0.72),
                        Color.purple.opacity(0.88)
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )

                VStack(spacing: max(8, geometry.size.height * 0.04)) {
                    CreatureLabSparkle(
                        color: .yellow,
                        size: min(geometry.size.width * 0.18, 42)
                    )

                    HStack(spacing: max(4, geometry.size.width * 0.025)) {
                        IngredientArtworkChip(
                            ingredient: creature,
                            size: chipSize,
                            accent: .purple
                        )
                        IngredientArtworkChip(
                            ingredient: outfit,
                            size: chipSize,
                            accent: .orange
                        )
                        IngredientArtworkChip(
                            ingredient: buddy,
                            size: chipSize,
                            accent: .green
                        )
                    }

                    Text("CREATURE LAB")
                        .font(
                            .system(
                                size: min(max(geometry.size.width * 0.07, 10), 20),
                                weight: .black,
                                design: .rounded
                            )
                        )
                        .tracking(1.2)
                        .foregroundStyle(.white)
                }
                .padding()
            }
            .clipShape(RoundedRectangle(cornerRadius: geometry.size.width * 0.08))
            .overlay {
                RoundedRectangle(cornerRadius: geometry.size.width * 0.08)
                    .stroke(
                        LinearGradient(
                            colors: [.yellow, .orange.opacity(0.7)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: max(2, geometry.size.width * 0.018)
                    )
            }
        }
        .accessibilityLabel("Creature Lab mystery card")
    }
}

// MARK: - Consistent Board Tiles

private struct IngredientBoardTile: View {
    let ingredient: CreatureIngredient
    let isSelected: Bool
    let size: CGFloat
    let accent: Color

    var body: some View {
        ZStack(alignment: .bottom) {
            Image(ingredient.artworkName)
                .resizable()
                .scaledToFill()
                .frame(width: size, height: size)
                .clipped()
                .accessibilityHidden(true)

            LinearGradient(
                colors: [.clear, accent.opacity(0.92)],
                startPoint: .top,
                endPoint: .bottom
            )
            .frame(height: size * 0.34)

            Text(ingredient.name.uppercased())
                .font(.system(size: size * 0.105, weight: .heavy, design: .rounded))
                .foregroundColor(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.58)
                .padding(.horizontal, 8)
                .padding(.bottom, 8)
        }
        .frame(width: size, height: size)
        .clipShape(RoundedRectangle(cornerRadius: size * 0.16))
        .overlay {
            RoundedRectangle(cornerRadius: size * 0.16)
                .stroke(
                    isSelected ? Color.yellow : accent.opacity(0.85),
                    lineWidth: isSelected ? 5 : 3
                )
        }
        .shadow(
            color: isSelected ? .yellow.opacity(0.55) : accent.opacity(0.35),
            radius: isSelected ? 10 : 5,
            y: 3
        )
        .scaleEffect(isSelected ? 1.05 : 1)
        .animation(.spring(response: 0.3), value: isSelected)
    }
}

struct CreatureTile: View {
    let ingredient: CreatureIngredient
    let isSelected: Bool
    let size: CGFloat
    
    var body: some View {
        IngredientBoardTile(
            ingredient: ingredient,
            isSelected: isSelected,
            size: size,
            accent: .purple
        )
    }
}

struct OutfitTile: View {
    let ingredient: CreatureIngredient
    let isSelected: Bool
    let size: CGFloat

    var body: some View {
        IngredientBoardTile(
            ingredient: ingredient,
            isSelected: isSelected,
            size: size,
            accent: .orange
        )
    }
}

struct BuddyTile: View {
    let ingredient: CreatureIngredient
    let isSelected: Bool
    let size: CGFloat

    var body: some View {
        IngredientBoardTile(
            ingredient: ingredient,
            isSelected: isSelected,
            size: size,
            accent: .green
        )
    }
}

// MARK: - Category Section Headers

struct CategoryHeader: View {
    let title: String
    let subtitle: String
    let symbol: String
    let color: Color
    
    var body: some View {
        HStack(spacing: 12) {
            CreatureLabGlyph(symbol: symbol, tint: color, size: 38)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                
                Text(subtitle)
                    .font(.caption)
                    .foregroundColor(color.opacity(0.8))
            }
            
            Spacer()
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
        .background(color.opacity(0.2))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .padding(.horizontal)
    }
}

// MARK: - Updated Pickers with Distinct Tiles

struct CreaturePicker: View {
    let ingredients: [CreatureIngredient]
    let selected: CreatureIngredient?
    let onSelect: (CreatureIngredient) -> Void
    
    var body: some View {
        VStack(spacing: 12) {
            CategoryHeader(
                title: "PICK A CREATURE",
                subtitle: "Who is it?",
                symbol: "person.fill",
                color: .purple
            )
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 16) {
                    ForEach(ingredients) { ingredient in
                        Button {
                            onSelect(ingredient)
                        } label: {
                            CreatureTile(
                                ingredient: ingredient,
                                isSelected: selected?.id == ingredient.id,
                                size: 124
                            )
                        }
                        .accessibilityLabel(ingredient.name)
                    }
                }
                .padding(.horizontal)
                .padding(.vertical, 8)
            }
        }
    }
}

struct OutfitPicker: View {
    let ingredients: [CreatureIngredient]
    let selected: CreatureIngredient?
    let onSelect: (CreatureIngredient) -> Void
    
    var body: some View {
        VStack(spacing: 12) {
            CategoryHeader(
                title: "PICK AN OUTFIT",
                subtitle: "What powers?",
                symbol: "tshirt.fill",
                color: .orange
            )
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 16) {
                    ForEach(ingredients) { ingredient in
                        Button {
                            onSelect(ingredient)
                        } label: {
                            OutfitTile(
                                ingredient: ingredient,
                                isSelected: selected?.id == ingredient.id,
                                size: 124
                            )
                        }
                        .accessibilityLabel(ingredient.name)
                    }
                }
                .padding(.horizontal)
                .padding(.vertical, 8)
            }
        }
    }
}

struct BuddyPicker: View {
    let ingredients: [CreatureIngredient]
    let selected: CreatureIngredient?
    let onSelect: (CreatureIngredient) -> Void
    
    var body: some View {
        VStack(spacing: 12) {
            CategoryHeader(
                title: "PICK A BUDDY",
                subtitle: "What personality?",
                symbol: "pawprint.fill",
                color: .green
            )
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 16) {
                    ForEach(ingredients) { ingredient in
                        Button {
                            onSelect(ingredient)
                        } label: {
                            BuddyTile(
                                ingredient: ingredient,
                                isSelected: selected?.id == ingredient.id,
                                size: 124
                            )
                        }
                        .accessibilityLabel(ingredient.name)
                    }
                }
                .padding(.horizontal)
                .padding(.vertical, 8)
            }
        }
    }
}

#Preview {
    ZStack {
        Color(red: 0.1, green: 0.1, blue: 0.2)
            .ignoresSafeArea()
        
        VStack(spacing: 24) {
            CreaturePicker(
                ingredients: CreatureBuilderContent.creatures,
                selected: CreatureBuilderContent.creatures.first,
                onSelect: { _ in }
            )
            
            OutfitPicker(
                ingredients: CreatureBuilderContent.outfits,
                selected: nil,
                onSelect: { _ in }
            )
            
            BuddyPicker(
                ingredients: CreatureBuilderContent.buddies,
                selected: nil,
                onSelect: { _ in }
            )
        }
    }
}

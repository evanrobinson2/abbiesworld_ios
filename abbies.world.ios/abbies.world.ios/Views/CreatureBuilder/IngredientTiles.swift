//
//  IngredientTiles.swift
//  abbies.world.ios
//
//  Visually distinct tile styles for each ingredient category.
//  Creatures: Purple rounded squares with character
//  Outfits: Orange hexagonal badges with power icon
//  Buddies: Green circular badges with companion
//

import SwiftUI

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

// Retained for older previews that still reference it.
struct HexagonShape: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        let center = CGPoint(x: rect.midX, y: rect.midY)
        let radius = min(rect.width, rect.height) / 2

        for i in 0..<6 {
            let angle = CGFloat(i) * .pi / 3 - .pi / 2
            let point = CGPoint(
                x: center.x + radius * cos(angle),
                y: center.y + radius * sin(angle)
            )
            if i == 0 {
                path.move(to: point)
            } else {
                path.addLine(to: point)
            }
        }
        path.closeSubpath()
        return path
    }
}

// MARK: - Category Section Headers

struct CategoryHeader: View {
    let title: String
    let subtitle: String
    let icon: String
    let color: Color
    
    var body: some View {
        HStack(spacing: 12) {
            Text(icon)
                .font(.title)
            
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
                icon: "🌟",
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
                icon: "⚡",
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
                icon: "💚",
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

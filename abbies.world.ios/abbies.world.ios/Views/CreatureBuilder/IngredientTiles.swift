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

// MARK: - Category Tile Styles

private struct IngredientArtwork: View {
    let ingredient: CreatureIngredient
    let size: CGFloat

    var body: some View {
        Image(ingredient.artworkName)
            .resizable()
            .scaledToFit()
            .frame(width: size, height: size)
            .accessibilityHidden(true)
    }
}

struct CreatureTile: View {
    let ingredient: CreatureIngredient
    let isSelected: Bool
    let size: CGFloat
    
    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: size * 0.2)
                .fill(
                    LinearGradient(
                        colors: creatureColors,
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
            
            VStack(spacing: 4) {
                IngredientArtwork(ingredient: ingredient, size: size * 0.62)
                
                Text(ingredient.name.uppercased())
                    .font(.system(size: size * 0.1, weight: .bold))
                    .foregroundColor(.white)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
            }
            
            RoundedRectangle(cornerRadius: size * 0.2)
                .stroke(isSelected ? Color.yellow : Color.white.opacity(0.3), lineWidth: isSelected ? 4 : 2)
        }
        .frame(width: size, height: size)
        .shadow(color: isSelected ? .yellow.opacity(0.5) : .purple.opacity(0.3), radius: isSelected ? 10 : 5)
        .scaleEffect(isSelected ? 1.05 : 1.0)
        .animation(.spring(response: 0.3), value: isSelected)
    }
    
    private var creatureColors: [Color] {
        switch ingredient.id {
        case "abbie": return [Color(red: 1.0, green: 0.6, blue: 0.8), Color(red: 0.9, green: 0.4, blue: 0.6)]
        case "dragon": return [Color(red: 0.8, green: 0.2, blue: 0.3), Color(red: 0.6, green: 0.1, blue: 0.2)]
        case "robot": return [Color(red: 0.5, green: 0.5, blue: 0.6), Color(red: 0.3, green: 0.3, blue: 0.4)]
        case "bunny": return [Color(red: 0.9, green: 0.8, blue: 0.9), Color(red: 0.7, green: 0.5, blue: 0.7)]
        case "cat": return [Color(red: 1.0, green: 0.7, blue: 0.4), Color(red: 0.9, green: 0.5, blue: 0.2)]
        case "dinosaur": return [Color(red: 0.4, green: 0.7, blue: 0.4), Color(red: 0.2, green: 0.5, blue: 0.3)]
        case "alien": return [Color(red: 0.5, green: 0.9, blue: 0.5), Color(red: 0.3, green: 0.7, blue: 0.4)]
        case "monster": return [Color(red: 0.6, green: 0.3, blue: 0.8), Color(red: 0.4, green: 0.2, blue: 0.6)]
        default: return [Color.purple, Color.purple.opacity(0.7)]
        }
    }
}

struct OutfitTile: View {
    let ingredient: CreatureIngredient
    let isSelected: Bool
    let size: CGFloat
    
    var body: some View {
        ZStack {
            HexagonShape()
                .fill(
                    LinearGradient(
                        colors: outfitColors,
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
            
            VStack(spacing: 2) {
                IngredientArtwork(ingredient: ingredient, size: size * 0.56)
                
                Text(ingredient.name.uppercased())
                    .font(.system(size: size * 0.08, weight: .bold))
                    .foregroundColor(.white)
                    .lineLimit(2)
                    .multilineTextAlignment(.center)
                    .minimumScaleFactor(0.6)
                    .padding(.horizontal, 4)
            }
            
            HexagonShape()
                .stroke(isSelected ? Color.yellow : Color.white.opacity(0.3), lineWidth: isSelected ? 4 : 2)
        }
        .frame(width: size, height: size)
        .shadow(color: isSelected ? .yellow.opacity(0.5) : .orange.opacity(0.3), radius: isSelected ? 10 : 5)
        .scaleEffect(isSelected ? 1.05 : 1.0)
        .animation(.spring(response: 0.3), value: isSelected)
    }
    
    private var outfitColors: [Color] {
        switch ingredient.id {
        case "lightning-racer": return [Color(red: 1.0, green: 0.9, blue: 0.2), Color(red: 1.0, green: 0.6, blue: 0.0)]
        case "astronaut": return [Color(red: 0.3, green: 0.4, blue: 0.6), Color(red: 0.1, green: 0.2, blue: 0.4)]
        case "ninja": return [Color(red: 0.2, green: 0.2, blue: 0.3), Color(red: 0.1, green: 0.1, blue: 0.15)]
        case "wizard": return [Color(red: 0.5, green: 0.3, blue: 0.7), Color(red: 0.3, green: 0.1, blue: 0.5)]
        case "knight": return [Color(red: 0.7, green: 0.7, blue: 0.8), Color(red: 0.5, green: 0.5, blue: 0.6)]
        case "firefighter": return [Color(red: 1.0, green: 0.3, blue: 0.2), Color(red: 0.8, green: 0.2, blue: 0.1)]
        case "superhero": return [Color(red: 0.2, green: 0.4, blue: 0.9), Color(red: 0.1, green: 0.2, blue: 0.7)]
        case "pirate": return [Color(red: 0.4, green: 0.3, blue: 0.2), Color(red: 0.3, green: 0.2, blue: 0.1)]
        default: return [Color.orange, Color.orange.opacity(0.7)]
        }
    }
}

struct BuddyTile: View {
    let ingredient: CreatureIngredient
    let isSelected: Bool
    let size: CGFloat
    
    var body: some View {
        ZStack {
            Circle()
                .fill(
                    LinearGradient(
                        colors: buddyColors,
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
            
            VStack(spacing: 2) {
                IngredientArtwork(ingredient: ingredient, size: size * 0.58)
                
                Text(ingredient.name.uppercased())
                    .font(.system(size: size * 0.1, weight: .bold))
                    .foregroundColor(.white)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
            }
            
            Circle()
                .stroke(isSelected ? Color.yellow : Color.white.opacity(0.3), lineWidth: isSelected ? 4 : 2)
        }
        .frame(width: size, height: size)
        .shadow(color: isSelected ? .yellow.opacity(0.5) : .green.opacity(0.3), radius: isSelected ? 10 : 5)
        .scaleEffect(isSelected ? 1.05 : 1.0)
        .animation(.spring(response: 0.3), value: isSelected)
    }
    
    private var buddyColors: [Color] {
        switch ingredient.id {
        case "bat": return [Color(red: 0.3, green: 0.2, blue: 0.4), Color(red: 0.2, green: 0.1, blue: 0.3)]
        case "cheetah": return [Color(red: 1.0, green: 0.8, blue: 0.3), Color(red: 0.9, green: 0.6, blue: 0.2)]
        case "puppy": return [Color(red: 0.8, green: 0.6, blue: 0.4), Color(red: 0.6, green: 0.4, blue: 0.3)]
        case "owl": return [Color(red: 0.5, green: 0.4, blue: 0.3), Color(red: 0.4, green: 0.3, blue: 0.2)]
        case "unicorn": return [Color(red: 0.9, green: 0.7, blue: 0.9), Color(red: 0.7, green: 0.5, blue: 0.8)]
        case "peacock": return [Color(red: 0.2, green: 0.6, blue: 0.7), Color(red: 0.1, green: 0.4, blue: 0.5)]
        case "frog": return [Color(red: 0.4, green: 0.8, blue: 0.3), Color(red: 0.2, green: 0.6, blue: 0.2)]
        case "fox": return [Color(red: 1.0, green: 0.5, blue: 0.2), Color(red: 0.8, green: 0.3, blue: 0.1)]
        default: return [Color.green, Color.green.opacity(0.7)]
        }
    }
}

// MARK: - Hexagon Shape

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
                                size: 100
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
                                size: 100
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
                                size: 100
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

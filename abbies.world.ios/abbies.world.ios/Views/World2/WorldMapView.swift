//
//  WorldMapView.swift
//  abbies.world.ios
//
//  Overland map view with POI placement and navigation.
//

import SwiftUI

struct WorldMapView: View {
    @ObservedObject var viewModel: World2ViewModel
    
    var body: some View {
        GeometryReader { geometry in
            ZStack {
                mapBackground(for: viewModel.currentWorld)
                    .ignoresSafeArea()
                
                if let world = viewModel.currentWorld {
                    ForEach(world.poiPlacements) { placement in
                        POIMarkerView(
                            placement: placement,
                            poi: viewModel.pois[placement.poiId],
                            geometry: geometry,
                            onTap: {
                                viewModel.inspectPOI(placement: placement)
                            }
                        )
                    }
                }
                
                VStack {
                    World2HUDView(viewModel: viewModel)
                    Spacer()
                    WorldNavigationBar(viewModel: viewModel)
                }
            }
        }
        .sheet(isPresented: $viewModel.showingPOISheet) {
            if let inspection = viewModel.inspectedPOI {
                POIInspectionSheet(
                    poi: inspection.poi,
                    onEnter: {
                        viewModel.enterPOI(inspection.poi)
                    },
                    onDismiss: {
                        viewModel.dismissPOIInspection()
                    }
                )
                .presentationDetents([.medium])
                .presentationDragIndicator(.visible)
            }
        }
    }
    
    @ViewBuilder
    private func mapBackground(for world: World?) -> some View {
        if let world = world {
            let colors: [Color] = world.id == .home
                ? [Color(hex: "#56ab2f") ?? .green, Color(hex: "#a8e063") ?? .green]
                : [Color(hex: "#f2994a") ?? .orange, Color(hex: "#f2c94c") ?? .yellow]
            
            LinearGradient(
                colors: colors,
                startPoint: .top,
                endPoint: .bottom
            )
        } else {
            Color.gray
        }
    }
}

struct POIMarkerView: View {
    let placement: POIPlacement
    let poi: POI?
    let geometry: GeometryProxy
    let onTap: () -> Void
    
    @State private var isAnimating = false
    @State private var isPressed = false
    
    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 8) {
                ZStack {
                    Circle()
                        .fill(poiColor.gradient)
                        .frame(width: 80 * placement.scale, height: 80 * placement.scale)
                        .shadow(color: poiColor.opacity(0.5), radius: 8, y: 4)
                    
                    Image(systemName: poi?.icon ?? "mappin.circle.fill")
                        .font(.system(size: 36 * placement.scale))
                        .foregroundColor(.white)
                }
                .scaleEffect(isAnimating ? 1.05 : 1.0)
                .scaleEffect(isPressed ? 0.9 : 1.0)
                
                Text(poi?.name ?? "Unknown")
                    .font(.system(size: 14 * placement.scale, weight: .bold, design: .rounded))
                    .foregroundColor(.white)
                    .shadow(color: .black.opacity(0.5), radius: 2, y: 1)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: 120 * placement.scale)
            }
        }
        .buttonStyle(PlainButtonStyle())
        .position(
            x: geometry.size.width * placement.x,
            y: geometry.size.height * placement.y
        )
        .zIndex(Double(placement.zIndex))
        .simultaneousGesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in isPressed = true }
                .onEnded { _ in isPressed = false }
        )
        .onAppear {
            withAnimation(.easeInOut(duration: 2).repeatForever(autoreverses: true)) {
                isAnimating = true
            }
        }
        .animation(.spring(response: 0.3, dampingFraction: 0.6), value: isPressed)
    }
    
    private var poiColor: Color {
        guard let poi = poi else { return .gray }
        
        switch poi.type {
        case .home:
            return poi.ownerId == "player.abbie" ? .pink : .purple
        case .cardFactory:
            return .blue
        case .cardVault:
            return .indigo
        case .creatureIngredient:
            return .orange
        case .functionIngredient:
            return .cyan
        case .contextIngredient:
            return .teal
        case .gemReward:
            return .yellow
        case .minigame:
            return .green
        }
    }
}

struct World2HUDView: View {
    @ObservedObject var viewModel: World2ViewModel
    
    var body: some View {
        HStack(spacing: 16) {
            HUDItem(icon: "diamond.fill", value: "\(viewModel.gems)", color: .cyan)
            
            HUDItem(icon: "leaf.fill", value: "\(viewModel.totalIngredients)", color: .green)
            
            HUDItem(icon: "rectangle.portrait.on.rectangle.portrait.fill", value: "\(viewModel.activeDeckCount)/5", color: .purple)
            
            Spacer()
            
            if let playerId = viewModel.currentPlayerId {
                HStack(spacing: 8) {
                    Text(playerId.displayName)
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                    
                    Circle()
                        .fill(playerId == .abbie ? Color.pink : Color.purple)
                        .frame(width: 32, height: 32)
                        .overlay(
                            Text(playerId == .abbie ? "👧" : "👦")
                                .font(.system(size: 18))
                        )
                }
            }
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 12)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(.ultraThinMaterial)
                .shadow(color: .black.opacity(0.2), radius: 10, y: 5)
        )
        .padding(.horizontal, 16)
        .padding(.top, 8)
    }
}

struct HUDItem: View {
    let icon: String
    let value: String
    let color: Color
    
    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: icon)
                .font(.system(size: 16, weight: .bold))
                .foregroundColor(color)
            
            Text(value)
                .font(.system(size: 16, weight: .bold, design: .rounded))
                .foregroundColor(.white)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(
            Capsule()
                .fill(color.opacity(0.3))
        )
    }
}

struct WorldNavigationBar: View {
    @ObservedObject var viewModel: World2ViewModel
    
    var body: some View {
        HStack(spacing: 20) {
            if let world = viewModel.currentWorld {
                ForEach(world.adjacentWorlds, id: \.self) { adjacentWorldId in
                    Button(action: {
                        viewModel.navigateToWorld(adjacentWorldId)
                    }) {
                        HStack(spacing: 8) {
                            Image(systemName: adjacentWorldId == .home ? "house.fill" : "map.fill")
                                .font(.system(size: 18))
                            
                            Text("Go to \(adjacentWorldId.displayName)")
                                .font(.system(size: 16, weight: .semibold, design: .rounded))
                        }
                        .foregroundColor(.white)
                        .padding(.horizontal, 20)
                        .padding(.vertical, 12)
                        .background(
                            Capsule()
                                .fill(adjacentWorldId == .home ? Color.green : Color.orange)
                                .shadow(color: .black.opacity(0.3), radius: 5, y: 3)
                        )
                    }
                }
            }
        }
        .padding(.bottom, 40)
    }
}

struct POIInspectionSheet: View {
    let poi: POI
    let onEnter: () -> Void
    let onDismiss: () -> Void
    
    var body: some View {
        VStack(spacing: 24) {
            RoundedRectangle(cornerRadius: 2.5)
                .fill(Color.gray.opacity(0.3))
                .frame(width: 40, height: 5)
                .padding(.top, 8)
            
            ZStack {
                Circle()
                    .fill(poiColor.gradient)
                    .frame(width: 100, height: 100)
                
                Image(systemName: poi.icon ?? "building.2.fill")
                    .font(.system(size: 48))
                    .foregroundColor(.white)
            }
            .shadow(color: poiColor.opacity(0.5), radius: 10, y: 5)
            
            VStack(spacing: 8) {
                Text(poi.name)
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                
                Text(poi.description)
                    .font(.system(size: 16, design: .rounded))
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                
                if let lore = poi.lore {
                    Text(lore)
                        .font(.system(size: 14, design: .rounded))
                        .foregroundColor(.secondary.opacity(0.8))
                        .italic()
                        .multilineTextAlignment(.center)
                        .padding(.top, 4)
                }
            }
            .padding(.horizontal)
            
            if let rewards = poi.rewardConfiguration {
                HStack(spacing: 16) {
                    ForEach(rewards.baseRewards) { reward in
                        RewardBadge(reward: reward)
                    }
                }
            }
            
            if let cost = poi.entryCost, let gemCost = cost.gems, gemCost > 0 {
                HStack(spacing: 4) {
                    Image(systemName: "diamond.fill")
                        .foregroundColor(.cyan)
                    Text("Costs \(gemCost) gem\(gemCost == 1 ? "" : "s")")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.secondary)
                }
            }
            
            HStack(spacing: 16) {
                Button(action: onDismiss) {
                    Text("Maybe Later")
                        .font(.system(size: 16, weight: .semibold, design: .rounded))
                        .foregroundColor(.secondary)
                        .padding(.horizontal, 24)
                        .padding(.vertical, 14)
                        .background(
                            RoundedRectangle(cornerRadius: 16)
                                .stroke(Color.gray.opacity(0.3), lineWidth: 2)
                        )
                }
                
                Button(action: onEnter) {
                    Text("Enter!")
                        .font(.system(size: 18, weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                        .padding(.horizontal, 32)
                        .padding(.vertical, 14)
                        .background(
                            RoundedRectangle(cornerRadius: 16)
                                .fill(poiColor.gradient)
                        )
                        .shadow(color: poiColor.opacity(0.5), radius: 8, y: 4)
                }
            }
            .padding(.bottom, 20)
        }
        .padding()
    }
    
    private var poiColor: Color {
        switch poi.type {
        case .home: return .pink
        case .cardFactory: return .blue
        case .cardVault: return .indigo
        case .creatureIngredient: return .orange
        case .functionIngredient: return .cyan
        case .contextIngredient: return .teal
        case .gemReward: return .yellow
        case .minigame: return .green
        }
    }
}

struct RewardBadge: View {
    let reward: RewardConfiguration.Reward
    
    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: iconName)
                .foregroundColor(iconColor)
            
            Text(rewardText)
                .font(.system(size: 12, weight: .medium, design: .rounded))
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(
            Capsule()
                .fill(iconColor.opacity(0.15))
        )
    }
    
    private var iconName: String {
        switch reward.type {
        case .gems: return "diamond.fill"
        case .creatureIngredient: return "pawprint.fill"
        case .functionIngredient: return "bolt.fill"
        case .contextIngredient: return "globe"
        case .card: return "rectangle.portrait.fill"
        case .decoration: return "star.fill"
        case .musicTrack: return "music.note"
        case .unlock: return "lock.open.fill"
        }
    }
    
    private var iconColor: Color {
        switch reward.type {
        case .gems: return .cyan
        case .creatureIngredient: return .orange
        case .functionIngredient: return .blue
        case .contextIngredient: return .green
        case .card: return .purple
        case .decoration: return .yellow
        case .musicTrack: return .pink
        case .unlock: return .gray
        }
    }
    
    private var rewardText: String {
        switch reward.type {
        case .gems:
            return "+\(reward.amount ?? 1)"
        case .creatureIngredient:
            return "Creature"
        case .functionIngredient:
            return "Costume"
        case .contextIngredient:
            return "Place"
        default:
            return reward.type.rawValue.capitalized
        }
    }
}

extension Color {
    init?(hex: String) {
        var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        hexSanitized = hexSanitized.replacingOccurrences(of: "#", with: "")
        
        var rgb: UInt64 = 0
        guard Scanner(string: hexSanitized).scanHexInt64(&rgb) else { return nil }
        
        let r = Double((rgb & 0xFF0000) >> 16) / 255.0
        let g = Double((rgb & 0x00FF00) >> 8) / 255.0
        let b = Double(rgb & 0x0000FF) / 255.0
        
        self.init(red: r, green: g, blue: b)
    }
}

#Preview {
    WorldMapView(viewModel: World2ViewModel())
}

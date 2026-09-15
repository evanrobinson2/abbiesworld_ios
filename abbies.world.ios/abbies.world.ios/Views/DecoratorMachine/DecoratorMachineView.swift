//
//  DecoratorMachineView.swift
//  abbies.world.ios
//
//  Main container for Decorator Machine minigame.
//

import SwiftUI

struct DecoratorMachineView: View {
    @StateObject private var viewModel = DecoratorMachineViewModel()
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        ZStack {
            backgroundGradient
            
            VStack(spacing: 0) {
                header
                
                tabContent
                    .padding(.top, 8)
                
                tabBar
            }
        }
        .sheet(isPresented: $viewModel.showingReveal) {
            if let decoration = viewModel.decorationToReveal {
                DecorationRevealView(decoration: decoration) {
                    viewModel.completeReveal()
                }
            }
        }
        .sheet(isPresented: $viewModel.showingDetail) {
            if let decoration = viewModel.decorationDetail {
                DecorationDetailView(
                    decoration: decoration,
                    onFavorite: { viewModel.toggleFavorite(decoration) },
                    onMakeAnother: { viewModel.makeAnotherLikeThis(decoration) }
                )
            }
        }
        .onAppear {
            MusicService.shared.setGameActive(true)
        }
        .onDisappear {
            MusicService.shared.setGameActive(false)
        }
    }
    
    private var backgroundGradient: some View {
        ZStack {
            LinearGradient(
                colors: [
                    Color(red: 0.15, green: 0.12, blue: 0.25),
                    Color(red: 0.08, green: 0.06, blue: 0.15)
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()
            
            Image("decorator_workshop_background")
                .resizable()
                .scaledToFill()
                .opacity(0.3)
                .ignoresSafeArea()
        }
    }
    
    private var header: some View {
        HStack {
            Button {
                dismiss()
            } label: {
                DecoratorGlyph(symbol: "xmark", tint: .teal, size: 38)
            }
            .accessibilityLabel("Close Decorator Machine")
            
            Spacer()
            
            VStack(spacing: 2) {
                Text("Decorator Machine")
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                
                Text("Mix essences, make magic!")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(.white.opacity(0.72))
            }
            
            Spacer()
            
            Color.clear
                .frame(width: 38, height: 38)
        }
        .padding()
    }
    
    @ViewBuilder
    private var tabContent: some View {
        switch viewModel.currentTab {
        case .create:
            CreateDecorationView(viewModel: viewModel)
        case .making:
            DecorationMakingView(viewModel: viewModel)
        case .inventory:
            DecorationInventoryView(viewModel: viewModel)
        }
    }
    
    private var tabBar: some View {
        HStack(spacing: 0) {
            ForEach(DecoratorMachineTab.allCases, id: \.self) { tab in
                tabButton(tab)
            }
        }
        .padding(.horizontal)
        .padding(.top, 8)
        .padding(.bottom, 8)
        .background(.black.opacity(0.28))
    }
    
    private func tabButton(_ tab: DecoratorMachineTab) -> some View {
        Button {
            withAnimation(.spring(response: 0.3)) {
                viewModel.currentTab = tab
            }
        } label: {
            VStack(spacing: 4) {
                ZStack(alignment: .topTrailing) {
                    Image(systemName: tabSymbol(tab))
                        .font(.system(size: 21, weight: .bold))
                        .symbolRenderingMode(.hierarchical)
                    
                    if tab == .making, viewModel.readyCount > 0 {
                        Image(systemName: "checkmark")
                            .font(.caption2.weight(.black))
                            .foregroundStyle(.white)
                            .frame(width: 20, height: 20)
                            .background(.green, in: Circle())
                            .offset(x: 12, y: -8)
                            .accessibilityLabel("A decoration is ready!")
                    } else if tab == .making, viewModel.failedCount > 0 {
                        Image(systemName: "arrow.clockwise")
                            .font(.caption2.weight(.black))
                            .foregroundStyle(.white)
                            .frame(width: 20, height: 20)
                            .background(.orange, in: Circle())
                            .offset(x: 12, y: -8)
                    } else if tab == .making, let badge = viewModel.makingBadge {
                        Text(badge)
                            .font(.caption2.weight(.bold))
                            .foregroundColor(.white)
                            .frame(minWidth: 20, minHeight: 20)
                            .background(.orange, in: Circle())
                            .offset(x: 12, y: -8)
                    } else if tab == .inventory, !viewModel.inventory.isEmpty {
                        Text("\(viewModel.inventory.count)")
                            .font(.caption2.weight(.bold))
                            .foregroundColor(.white)
                            .frame(minWidth: 20, minHeight: 20)
                            .background(.teal, in: Circle())
                            .offset(x: 12, y: -8)
                    }
                }
                
                Text(tab.rawValue)
                    .font(.caption)
                    .fontWeight(viewModel.currentTab == tab ? .bold : .regular)
            }
            .foregroundColor(viewModel.currentTab == tab ? .white : .white.opacity(0.5))
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(
                viewModel.currentTab == tab
                    ? Color.white.opacity(0.2)
                    : Color.clear
            )
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .frame(maxWidth: .infinity)
    }
    
    private func tabSymbol(_ tab: DecoratorMachineTab) -> String {
        switch tab {
        case .create: return "wand.and.sparkles"
        case .making: return "gearshape.2.fill"
        case .inventory: return "shippingbox.fill"
        }
    }
}

// MARK: - Decorator Glyph

struct DecoratorGlyph: View {
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

#Preview {
    DecoratorMachineView()
}

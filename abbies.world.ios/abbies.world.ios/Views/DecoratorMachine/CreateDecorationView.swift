//
//  CreateDecorationView.swift
//  abbies.world.ios
//
//  Main creation view with machine animation and essence selector.
//

import SwiftUI

struct CreateDecorationView: View {
    @ObservedObject var viewModel: DecoratorMachineViewModel
    
    var body: some View {
        GeometryReader { geometry in
            let isLandscape = geometry.size.width > geometry.size.height
            
            if isLandscape {
                landscapeLayout
            } else {
                portraitLayout
            }
        }
    }
    
    private var landscapeLayout: some View {
        HStack(spacing: 20) {
            VStack(spacing: 16) {
                MachineAnimationView(
                    state: viewModel.machineState,
                    selectedEssences: viewModel.selectedEssences
                )
                .frame(maxHeight: 280)
                
                makeItButton
            }
            .frame(maxWidth: 320)
            
            essenceSelector
        }
        .padding()
    }
    
    private var portraitLayout: some View {
        VStack(spacing: 16) {
            MachineAnimationView(
                state: viewModel.machineState,
                selectedEssences: viewModel.selectedEssences
            )
            .frame(maxHeight: 200)
            
            recipePreview
            
            essenceSelector
            
            makeItButton
                .padding(.bottom, 8)
        }
        .padding(.horizontal)
    }
    
    private var recipePreview: some View {
        VStack(spacing: 8) {
            if viewModel.selectedEssences.isEmpty {
                Text("Add 2-5 essences to create something magical!")
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.7))
            } else {
                HStack(spacing: 8) {
                    ForEach(viewModel.selectedEssences) { essence in
                        EssenceChip(essence: essence, isSelected: true, size: 44)
                            .onTapGesture {
                                viewModel.toggleEssence(essence)
                            }
                    }
                    
                    if viewModel.canAddMore {
                        ForEach(0..<(viewModel.maxEssences - viewModel.selectedEssences.count), id: \.self) { _ in
                            EmptyEssenceSlot(size: 44)
                        }
                    }
                }
                
                Text("\(viewModel.selectedEssences.count)/\(viewModel.maxEssences) essences")
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.5))
            }
        }
        .padding()
        .background(Color.white.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
    
    private var essenceSelector: some View {
        ScrollView {
            VStack(spacing: 20) {
                ForEach(EssenceCategory.allCases, id: \.self) { category in
                    EssenceCategorySection(
                        category: category,
                        essences: DecoratorEssenceContent.essences(for: category),
                        selectedEssences: viewModel.selectedEssences,
                        onToggle: { viewModel.toggleEssence($0) }
                    )
                }
            }
            .padding(.vertical, 8)
        }
    }
    
    private var makeItButton: some View {
        Button {
            viewModel.createDecoration()
        } label: {
            HStack(spacing: 12) {
                if viewModel.isCreating {
                    ProgressView()
                        .tint(.white)
                } else {
                    Image(systemName: "sparkles")
                        .font(.title3.weight(.bold))
                }
                Text(viewModel.isCreating ? "MAKING..." : "MAKE IT!")
                    .font(.title3)
                    .fontWeight(.bold)
            }
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(
                LinearGradient(
                    colors: viewModel.canCreate
                        ? [.teal, .cyan]
                        : [.gray.opacity(0.5), .gray.opacity(0.3)],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .clipShape(RoundedRectangle(cornerRadius: 20))
            .shadow(
                color: viewModel.canCreate ? .teal.opacity(0.5) : .clear,
                radius: 10,
                y: 5
            )
        }
        .disabled(!viewModel.canCreate)
    }
}

// MARK: - Machine Animation View

struct MachineAnimationView: View {
    let state: MachineAnimationState
    let selectedEssences: [DecoratorEssence]
    
    @State private var gearRotation: Double = 0
    @State private var smokeOpacity: Double = 0
    @State private var hoverOffset: CGFloat = 0
    
    var body: some View {
        ZStack {
            machineImage
            
            hoveringEssences
            
            smokeEffects
        }
        .onChange(of: state) { _, newState in
            updateAnimations(for: newState)
        }
        .onAppear {
            startIdleAnimation()
        }
    }
    
    private var machineImage: some View {
        ZStack {
            Image("decorator_machine")
                .resizable()
                .scaledToFit()
            
            GeometryReader { geometry in
                Image(systemName: "gearshape.fill")
                    .font(.system(size: geometry.size.width * 0.08))
                    .foregroundColor(.orange.opacity(0.8))
                    .rotationEffect(.degrees(gearRotation))
                    .position(
                        x: geometry.size.width * 0.35,
                        y: geometry.size.height * 0.65
                    )
                
                Image(systemName: "gearshape.fill")
                    .font(.system(size: geometry.size.width * 0.06))
                    .foregroundColor(.teal.opacity(0.8))
                    .rotationEffect(.degrees(-gearRotation * 1.3))
                    .position(
                        x: geometry.size.width * 0.42,
                        y: geometry.size.height * 0.72
                    )
            }
        }
    }
    
    private var hoveringEssences: some View {
        GeometryReader { geometry in
            let hopperCenter = CGPoint(
                x: geometry.size.width * 0.5,
                y: geometry.size.height * 0.15
            )
            
            if state == .ingredientsHovering || state == .ingredientsDroppingIn {
                ForEach(Array(selectedEssences.enumerated()), id: \.element.id) { index, essence in
                    let angle = angleForEssence(index: index, total: selectedEssences.count)
                    let radius: CGFloat = state == .ingredientsDroppingIn ? 0 : 45
                    let xOffset = cos(angle) * radius
                    let yOffset = sin(angle) * radius + (state == .ingredientsDroppingIn ? 50 : hoverOffset)
                    
                    Text(essence.emoji)
                        .font(.system(size: 32))
                        .position(
                            x: hopperCenter.x + xOffset,
                            y: hopperCenter.y + yOffset
                        )
                        .opacity(state == .ingredientsDroppingIn ? 0 : 1)
                        .animation(
                            .spring(response: 0.5, dampingFraction: 0.7)
                                .delay(Double(index) * 0.05),
                            value: state
                        )
                }
            }
        }
    }
    
    private var smokeEffects: some View {
        GeometryReader { geometry in
            if state == .processing {
                ForEach(0..<5, id: \.self) { index in
                    SmokeParticle(delay: Double(index) * 0.3)
                        .position(
                            x: geometry.size.width * 0.28 + CGFloat(index) * 8,
                            y: geometry.size.height * 0.25
                        )
                }
            }
        }
    }
    
    private func angleForEssence(index: Int, total: Int) -> CGFloat {
        let startAngle: CGFloat = -.pi / 2
        let spacing: CGFloat = .pi / CGFloat(max(total, 1) + 1)
        return startAngle - .pi / 2 + spacing * CGFloat(index + 1)
    }
    
    private func startIdleAnimation() {
        withAnimation(.linear(duration: 8).repeatForever(autoreverses: false)) {
            gearRotation = 360
        }
        withAnimation(.easeInOut(duration: 1.5).repeatForever(autoreverses: true)) {
            hoverOffset = -8
        }
    }
    
    private func updateAnimations(for newState: MachineAnimationState) {
        switch newState {
        case .idle:
            withAnimation(.easeOut(duration: 0.5)) {
                smokeOpacity = 0
            }
        case .ingredientsHovering:
            break
        case .ingredientsDroppingIn:
            break
        case .processing:
            withAnimation(.easeIn(duration: 0.5)) {
                smokeOpacity = 1
            }
        case .complete:
            withAnimation(.easeOut(duration: 0.3)) {
                smokeOpacity = 0
            }
        }
    }
}

// MARK: - Smoke Particle

struct SmokeParticle: View {
    let delay: Double
    
    @State private var yOffset: CGFloat = 0
    @State private var opacity: Double = 0.8
    @State private var scale: CGFloat = 0.5
    
    var body: some View {
        Circle()
            .fill(
                RadialGradient(
                    colors: [.white.opacity(0.6), .white.opacity(0)],
                    center: .center,
                    startRadius: 0,
                    endRadius: 15
                )
            )
            .frame(width: 30, height: 30)
            .scaleEffect(scale)
            .offset(y: yOffset)
            .opacity(opacity)
            .onAppear {
                withAnimation(
                    .easeOut(duration: 2)
                        .repeatForever(autoreverses: false)
                        .delay(delay)
                ) {
                    yOffset = -60
                    opacity = 0
                    scale = 1.5
                }
            }
    }
}

// MARK: - Essence Category Section

struct EssenceCategorySection: View {
    let category: EssenceCategory
    let essences: [DecoratorEssence]
    let selectedEssences: [DecoratorEssence]
    let onToggle: (DecoratorEssence) -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 10) {
                DecoratorGlyph(symbol: category.symbol, tint: category.tint, size: 32)
                
                Text(category.rawValue.uppercased())
                    .font(.headline.weight(.bold))
                    .foregroundColor(.white)
            }
            .padding(.horizontal)
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(essences) { essence in
                        EssenceTile(
                            essence: essence,
                            isSelected: selectedEssences.contains { $0.id == essence.id }
                        ) {
                            onToggle(essence)
                        }
                    }
                }
                .padding(.horizontal)
            }
        }
    }
}

// MARK: - Essence Tile

struct EssenceTile: View {
    let essence: DecoratorEssence
    let isSelected: Bool
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 6) {
                ZStack {
                    RoundedRectangle(cornerRadius: 16)
                        .fill(
                            LinearGradient(
                                colors: [
                                    essence.category.tint.opacity(0.4),
                                    essence.category.tint.opacity(0.2)
                                ],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                    
                    Text(essence.emoji)
                        .font(.system(size: 36))
                    
                    if isSelected {
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(Color.yellow, lineWidth: 3)
                        
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 20, weight: .bold))
                            .foregroundColor(.yellow)
                            .background(Circle().fill(.black.opacity(0.5)))
                            .offset(x: 28, y: -28)
                    }
                }
                .frame(width: 80, height: 80)
                
                Text(essence.name)
                    .font(.caption2.weight(.semibold))
                    .foregroundColor(.white)
                    .lineLimit(2)
                    .multilineTextAlignment(.center)
                    .frame(width: 80)
            }
        }
        .buttonStyle(.plain)
        .scaleEffect(isSelected ? 1.05 : 1)
        .animation(.spring(response: 0.3), value: isSelected)
        .accessibilityLabel("\(essence.name), \(essence.flavorText)")
    }
}

// MARK: - Essence Chip

struct EssenceChip: View {
    let essence: DecoratorEssence
    let isSelected: Bool
    let size: CGFloat
    
    var body: some View {
        ZStack {
            Circle()
                .fill(essence.category.tint.opacity(0.3))
            
            Text(essence.emoji)
                .font(.system(size: size * 0.5))
            
            if isSelected {
                Circle()
                    .stroke(Color.yellow, lineWidth: 2)
            }
        }
        .frame(width: size, height: size)
    }
}

// MARK: - Empty Essence Slot

struct EmptyEssenceSlot: View {
    let size: CGFloat
    
    var body: some View {
        ZStack {
            Circle()
                .stroke(
                    Color.white.opacity(0.2),
                    style: StrokeStyle(lineWidth: 2, dash: [6])
                )
            
            Image(systemName: "plus")
                .font(.system(size: size * 0.3, weight: .medium))
                .foregroundColor(.white.opacity(0.3))
        }
        .frame(width: size, height: size)
    }
}

#Preview {
    CreateDecorationView(viewModel: DecoratorMachineViewModel())
        .background(Color(red: 0.1, green: 0.08, blue: 0.18))
}

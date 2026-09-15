//
//  DecoratorMachineView.swift
//  abbies.world.ios
//
//  Kid-friendly Decorator Machine - single screen, drag-and-drop, big visuals.
//

import SwiftUI

struct DecoratorMachineView: View {
    @StateObject private var viewModel = DecoratorMachineViewModel()
    @Environment(\.dismiss) private var dismiss
    
    @State private var draggedEssence: DecoratorEssence?
    @State private var dragLocation: CGPoint = .zero
    @State private var hopperFrame: CGRect = .zero
    @State private var showInventory = false
    
    var body: some View {
        GeometryReader { geometry in
            ZStack {
                backgroundGradient
                
                VStack(spacing: 0) {
                    topBar
                    
                    machineSection
                        .frame(height: geometry.size.height * 0.55)
                    
                    essenceTray
                        .frame(height: geometry.size.height * 0.35)
                }
                
                // Dragged essence follows finger
                if let essence = draggedEssence {
                    Text(essence.emoji)
                        .font(.system(size: 60))
                        .position(dragLocation)
                        .zIndex(100)
                }
            }
        }
        .sheet(isPresented: $viewModel.showingReveal) {
            if let decoration = viewModel.decorationToReveal {
                KidFriendlyRevealView(decoration: decoration) {
                    viewModel.completeReveal()
                }
            }
        }
        .sheet(isPresented: $showInventory) {
            KidFriendlyInventoryView(viewModel: viewModel)
        }
        .onAppear {
            MusicService.shared.setGameActive(true)
        }
        .onDisappear {
            MusicService.shared.setGameActive(false)
        }
    }
    
    private var backgroundGradient: some View {
        LinearGradient(
            colors: [
                Color(red: 0.2, green: 0.15, blue: 0.35),
                Color(red: 0.1, green: 0.08, blue: 0.2)
            ],
            startPoint: .top,
            endPoint: .bottom
        )
        .ignoresSafeArea()
    }
    
    private var topBar: some View {
        HStack {
            // Close button - big and friendly
            Button {
                dismiss()
            } label: {
                Image(systemName: "house.fill")
                    .font(.title)
                    .foregroundColor(.white)
                    .frame(width: 50, height: 50)
                    .background(Color.purple.opacity(0.5), in: Circle())
            }
            
            Spacer()
            
            // Ready badge - shows when decorations are ready
            if viewModel.readyCount > 0 {
                ReadyBadge(count: viewModel.readyCount) {
                    if let decoration = viewModel.readyToReveal.first {
                        viewModel.revealDecoration(decoration)
                    }
                }
            }
            
            // Inventory button - shows collection
            Button {
                showInventory = true
            } label: {
                ZStack(alignment: .topTrailing) {
                    Image(systemName: "shippingbox.fill")
                        .font(.title)
                        .foregroundColor(.white)
                        .frame(width: 50, height: 50)
                        .background(Color.teal.opacity(0.5), in: Circle())
                    
                    if !viewModel.inventory.isEmpty {
                        Text("\(viewModel.inventory.count)")
                            .font(.caption2.bold())
                            .foregroundColor(.white)
                            .frame(width: 22, height: 22)
                            .background(Color.orange, in: Circle())
                            .offset(x: 5, y: -5)
                    }
                }
            }
        }
        .padding(.horizontal, 20)
        .padding(.top, 8)
    }
    
    private var machineSection: some View {
        VStack(spacing: 12) {
            // Ingredient slots above machine
            ingredientSlots
            
            // The machine itself
            MachineWithFace(
                state: viewModel.machineState,
                essenceCount: viewModel.selectedEssences.count,
                isProcessing: viewModel.isCreating
            )
            .background(
                GeometryReader { geo in
                    Color.clear.onAppear {
                        hopperFrame = geo.frame(in: .global)
                    }
                }
            )
            
            // Big GO button
            goButton
        }
        .padding(.horizontal)
    }
    
    private var ingredientSlots: some View {
        HStack(spacing: 16) {
            ForEach(0..<5, id: \.self) { index in
                IngredientSlot(
                    essence: index < viewModel.selectedEssences.count 
                        ? viewModel.selectedEssences[index] 
                        : nil,
                    index: index,
                    onRemove: {
                        if index < viewModel.selectedEssences.count {
                            let essence = viewModel.selectedEssences[index]
                            viewModel.toggleEssence(essence)
                        }
                    }
                )
            }
        }
    }
    
    private var goButton: some View {
        Button {
            viewModel.createDecoration()
        } label: {
            GoButtonView(
                canCreate: viewModel.canCreate,
                isCreating: viewModel.isCreating,
                essenceCount: viewModel.selectedEssences.count
            )
        }
        .disabled(!viewModel.canCreate || viewModel.isCreating)
    }
    
    private var essenceTray: some View {
        VStack(spacing: 8) {
            // Simple visual divider
            Capsule()
                .fill(Color.white.opacity(0.3))
                .frame(width: 60, height: 4)
                .padding(.top, 8)
            
            // Scrollable essence tray - big chunky icons
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 16) {
                    ForEach(viewModel.availableEssences) { essence in
                        DraggableEssence(
                            essence: essence,
                            isSelected: viewModel.isSelected(essence),
                            onDragStarted: { location in
                                draggedEssence = essence
                                dragLocation = location
                            },
                            onDragMoved: { location in
                                dragLocation = location
                            },
                            onDragEnded: { location in
                                handleDrop(essence: essence, at: location)
                                draggedEssence = nil
                            },
                            onTap: {
                                viewModel.toggleEssence(essence)
                            }
                        )
                    }
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 12)
            }
        }
        .background(
            RoundedRectangle(cornerRadius: 30)
                .fill(Color.black.opacity(0.3))
                .ignoresSafeArea(edges: .bottom)
        )
    }
    
    private func handleDrop(essence: DecoratorEssence, at location: CGPoint) {
        // Check if dropped near the hopper/slots area
        let dropZone = CGRect(
            x: hopperFrame.minX - 50,
            y: hopperFrame.minY - 150,
            width: hopperFrame.width + 100,
            height: 200
        )
        
        if dropZone.contains(location) && !viewModel.isSelected(essence) {
            viewModel.toggleEssence(essence)
        }
    }
}

// MARK: - Ready Badge

struct ReadyBadge: View {
    let count: Int
    let onTap: () -> Void
    
    @State private var isWiggling = false
    
    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 8) {
                Image(systemName: "gift.fill")
                    .font(.title2)
                Text("\(count)")
                    .font(.title2.bold())
            }
            .foregroundColor(.white)
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(Color.green, in: Capsule())
            .overlay {
                Capsule()
                    .stroke(Color.yellow, lineWidth: 3)
            }
            .shadow(color: .green.opacity(0.6), radius: 8)
            .rotationEffect(.degrees(isWiggling ? 3 : -3))
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 0.15).repeatForever(autoreverses: true)) {
                isWiggling = true
            }
        }
    }
}

// MARK: - Ingredient Slot

struct IngredientSlot: View {
    let essence: DecoratorEssence?
    let index: Int
    let onRemove: () -> Void
    
    @State private var isBouncing = false
    
    var body: some View {
        ZStack {
            if let essence = essence {
                // Filled slot
                Button(action: onRemove) {
                    ZStack {
                        Circle()
                            .fill(essence.category.tint.opacity(0.4))
                            .frame(width: 60, height: 60)
                        
                        Text(essence.emoji)
                            .font(.system(size: 32))
                        
                        // X to remove
                        Circle()
                            .fill(Color.red)
                            .frame(width: 22, height: 22)
                            .overlay {
                                Image(systemName: "xmark")
                                    .font(.caption.bold())
                                    .foregroundColor(.white)
                            }
                            .offset(x: 22, y: -22)
                    }
                    .scaleEffect(isBouncing ? 1.1 : 1.0)
                }
                .onAppear {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.5)) {
                        isBouncing = true
                    }
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                        isBouncing = false
                    }
                }
            } else {
                // Empty slot - glowing hint
                Circle()
                    .stroke(
                        Color.yellow.opacity(index < 2 ? 0.8 : 0.3),
                        style: StrokeStyle(lineWidth: 3, dash: [8])
                    )
                    .frame(width: 60, height: 60)
                    .overlay {
                        if index < 2 {
                            Image(systemName: "plus")
                                .font(.title2.bold())
                                .foregroundColor(.yellow.opacity(0.6))
                        }
                    }
            }
        }
    }
}

// MARK: - Machine with Face

struct MachineWithFace: View {
    let state: MachineAnimationState
    let essenceCount: Int
    let isProcessing: Bool
    
    @State private var eyeOffset: CGFloat = 0
    @State private var isChomping = false
    @State private var smokeParticles: [UUID] = []
    
    var body: some View {
        ZStack {
            // Machine body
            Image("decorator_machine")
                .resizable()
                .scaledToFit()
                .frame(maxHeight: 200)
            
            // Animated face overlay
            GeometryReader { geo in
                let centerX = geo.size.width * 0.5
                let faceY = geo.size.height * 0.45
                
                // Eyes
                HStack(spacing: geo.size.width * 0.12) {
                    MachineEye(
                        mood: machineMood,
                        offset: eyeOffset
                    )
                    MachineEye(
                        mood: machineMood,
                        offset: eyeOffset
                    )
                }
                .position(x: centerX, y: faceY)
                
                // Mouth
                MachineMouth(
                    mood: machineMood,
                    isChomping: isChomping
                )
                .position(x: centerX, y: faceY + 25)
                
                // Smoke when processing
                if isProcessing {
                    ForEach(smokeParticles, id: \.self) { _ in
                        SmokeCloud()
                            .position(x: geo.size.width * 0.3, y: geo.size.height * 0.2)
                    }
                }
            }
        }
        .onChange(of: essenceCount) { _, _ in
            // Wiggle eyes when essence added
            withAnimation(.spring(response: 0.2)) {
                eyeOffset = 3
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                withAnimation(.spring(response: 0.2)) {
                    eyeOffset = -3
                }
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
                withAnimation(.spring(response: 0.2)) {
                    eyeOffset = 0
                }
            }
        }
        .onChange(of: isProcessing) { _, newValue in
            if newValue {
                isChomping = true
                // Add smoke particles
                for i in 0..<5 {
                    DispatchQueue.main.asyncAfter(deadline: .now() + Double(i) * 0.3) {
                        smokeParticles.append(UUID())
                    }
                }
            } else {
                isChomping = false
                smokeParticles.removeAll()
            }
        }
    }
    
    private var machineMood: MachineMood {
        if isProcessing {
            return .working
        } else if essenceCount >= 2 {
            return .excited
        } else if essenceCount > 0 {
            return .curious
        } else {
            return .hungry
        }
    }
}

enum MachineMood {
    case hungry, curious, excited, working
}

struct MachineEye: View {
    let mood: MachineMood
    let offset: CGFloat
    
    var body: some View {
        ZStack {
            // Eye white
            Circle()
                .fill(Color.white)
                .frame(width: 24, height: 24)
            
            // Pupil
            Circle()
                .fill(Color.black)
                .frame(width: eyeSize, height: eyeSize)
                .offset(x: offset, y: mood == .hungry ? 2 : 0)
        }
        .shadow(color: .black.opacity(0.3), radius: 2)
    }
    
    private var eyeSize: CGFloat {
        switch mood {
        case .hungry: return 10
        case .curious: return 12
        case .excited: return 14
        case .working: return 8
        }
    }
}

struct MachineMouth: View {
    let mood: MachineMood
    let isChomping: Bool
    
    @State private var mouthOpen = false
    
    var body: some View {
        Group {
            switch mood {
            case .hungry:
                // Sad/waiting mouth
                Capsule()
                    .fill(Color.black)
                    .frame(width: 30, height: 8)
            case .curious:
                // Small O mouth
                Circle()
                    .fill(Color.black)
                    .frame(width: 15, height: 15)
            case .excited:
                // Big smile
                HalfCircle()
                    .fill(Color.black)
                    .frame(width: 35, height: 18)
            case .working:
                // Chomping mouth
                Capsule()
                    .fill(Color.black)
                    .frame(width: 25, height: mouthOpen ? 20 : 6)
                    .onAppear {
                        if isChomping {
                            withAnimation(.easeInOut(duration: 0.15).repeatForever(autoreverses: true)) {
                                mouthOpen = true
                            }
                        }
                    }
            }
        }
    }
}

struct HalfCircle: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.addArc(
            center: CGPoint(x: rect.midX, y: rect.minY),
            radius: rect.width / 2,
            startAngle: .degrees(0),
            endAngle: .degrees(180),
            clockwise: false
        )
        path.closeSubpath()
        return path
    }
}

struct SmokeCloud: View {
    @State private var yOffset: CGFloat = 0
    @State private var opacity: Double = 0.8
    @State private var scale: CGFloat = 0.5
    
    var body: some View {
        Circle()
            .fill(Color.white.opacity(0.6))
            .frame(width: 25, height: 25)
            .scaleEffect(scale)
            .offset(x: CGFloat.random(in: -20...20), y: yOffset)
            .opacity(opacity)
            .onAppear {
                withAnimation(.easeOut(duration: 1.5)) {
                    yOffset = -50
                    opacity = 0
                    scale = 1.5
                }
            }
    }
}

// MARK: - GO Button

struct GoButtonView: View {
    let canCreate: Bool
    let isCreating: Bool
    let essenceCount: Int
    
    @State private var isWiggling = false
    @State private var pulseScale: CGFloat = 1.0
    
    var body: some View {
        ZStack {
            // Button background
            Capsule()
                .fill(
                    canCreate
                        ? LinearGradient(
                            colors: [.green, .mint],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                        : LinearGradient(
                            colors: [.gray.opacity(0.5), .gray.opacity(0.3)],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                )
                .frame(width: 160, height: 70)
                .shadow(color: canCreate ? .green.opacity(0.6) : .clear, radius: 12)
                .scaleEffect(pulseScale)
            
            // Button content
            if isCreating {
                HStack(spacing: 8) {
                    ProgressView()
                        .tint(.white)
                    Text("MIXING!")
                        .font(.title2.bold())
                        .foregroundColor(.white)
                }
            } else if canCreate {
                HStack(spacing: 8) {
                    Image(systemName: "sparkles")
                        .font(.title2)
                    Text("GO!")
                        .font(.largeTitle.bold())
                }
                .foregroundColor(.white)
            } else {
                VStack(spacing: 2) {
                    Text("ADD \(max(0, 2 - essenceCount)) MORE")
                        .font(.caption.bold())
                    Image(systemName: "arrow.down")
                        .font(.title3)
                }
                .foregroundColor(.white.opacity(0.7))
            }
        }
        .rotationEffect(.degrees(isWiggling && canCreate ? 2 : 0))
        .onChange(of: canCreate) { _, newValue in
            if newValue {
                // Start wiggling when ready
                withAnimation(.easeInOut(duration: 0.1).repeatForever(autoreverses: true)) {
                    isWiggling = true
                }
                withAnimation(.easeInOut(duration: 0.8).repeatForever(autoreverses: true)) {
                    pulseScale = 1.05
                }
            } else {
                isWiggling = false
                pulseScale = 1.0
            }
        }
    }
}

// MARK: - Draggable Essence

struct DraggableEssence: View {
    let essence: DecoratorEssence
    let isSelected: Bool
    let onDragStarted: (CGPoint) -> Void
    let onDragMoved: (CGPoint) -> Void
    let onDragEnded: (CGPoint) -> Void
    let onTap: () -> Void
    
    @State private var isDragging = false
    
    var body: some View {
        ZStack {
            // Background
            Circle()
                .fill(
                    isSelected
                        ? Color.gray.opacity(0.3)
                        : essence.category.tint.opacity(0.3)
                )
                .frame(width: 80, height: 80)
            
            // Emoji
            Text(essence.emoji)
                .font(.system(size: 44))
                .opacity(isSelected || isDragging ? 0.3 : 1)
            
            // Selected checkmark
            if isSelected {
                Circle()
                    .fill(Color.green)
                    .frame(width: 28, height: 28)
                    .overlay {
                        Image(systemName: "checkmark")
                            .font(.caption.bold())
                            .foregroundColor(.white)
                    }
                    .offset(x: 28, y: -28)
            }
        }
        .scaleEffect(isDragging ? 0.9 : 1.0)
        .gesture(
            DragGesture(coordinateSpace: .global)
                .onChanged { value in
                    if !isSelected {
                        if !isDragging {
                            isDragging = true
                            onDragStarted(value.location)
                        }
                        onDragMoved(value.location)
                    }
                }
                .onEnded { value in
                    if isDragging {
                        isDragging = false
                        onDragEnded(value.location)
                    }
                }
        )
        .simultaneousGesture(
            TapGesture()
                .onEnded {
                    onTap()
                }
        )
        .animation(.spring(response: 0.3), value: isSelected)
        .animation(.spring(response: 0.2), value: isDragging)
    }
}

// MARK: - Glyph Helper

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

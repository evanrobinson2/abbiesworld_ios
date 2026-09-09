//
//  PictureCarverView.swift
//  abbies.world.ios
//

import SwiftUI

struct PictureCarverView: View {
    @StateObject private var viewModel = PictureCarverViewModel()
    @State private var carvingSessionID = UUID()
    
    var onDismiss: (() -> Void)? = nil
    
    var body: some View {
        GeometryReader { geometry in
            ZStack {
                LinearGradient(
                    colors: [
                        Color(red: 0.16, green: 0.05, blue: 0.28),
                        Color(red: 0.04, green: 0.13, blue: 0.26)
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()
                
                VStack(spacing: 10) {
                    HStack(spacing: 14) {
                        Text("Picture Carver")
                            .font(.system(size: min(32, geometry.size.height * 0.05), weight: .heavy, design: .rounded))
                        
                        Spacer()
                        
                        ProgressView(value: viewModel.progress)
                            .tint(.yellow)
                            .frame(maxWidth: 220)
                        
                        Text("\(Int(viewModel.progress * 100))%")
                            .monospacedDigit()
                    }
                    .font(.system(size: 20, weight: .bold, design: .rounded))
                    .foregroundColor(.white)
                    .padding(.horizontal, 18)
                    .padding(.vertical, 10)
                    .background(Color.black.opacity(0.5))
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                    
                    Group {
                        if let picture = viewModel.picture {
                            CarvingSurface(
                                picture: picture,
                                isComplete: viewModel.isComplete,
                                onProgress: viewModel.updateProgress
                            )
                            .id(carvingSessionID)
                        } else if viewModel.isLoading {
                            VStack(spacing: 16) {
                                ProgressView()
                                    .controlSize(.large)
                                    .tint(.white)
                                Text("Finding a special picture…")
                            }
                            .foregroundColor(.white)
                        } else {
                            VStack(spacing: 16) {
                                Image(systemName: "photo.badge.exclamationmark")
                                    .font(.system(size: 54))
                                Text(viewModel.errorMessage ?? "Picture unavailable")
                                    .multilineTextAlignment(.center)
                                Button("Try Again") {
                                    Task {
                                        await viewModel.loadNextPicture()
                                    }
                                }
                                .buttonStyle(.borderedProminent)
                            }
                            .foregroundColor(.white)
                        }
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(Color.black.opacity(0.3))
                    .clipShape(RoundedRectangle(cornerRadius: 20))
                    .overlay(
                        RoundedRectangle(cornerRadius: 20)
                            .stroke(viewModel.isComplete ? Color.yellow : Color.white.opacity(0.7), lineWidth: 4)
                    )
                    
                    HStack {
                        Text(viewModel.statusMessage)
                            .font(.system(size: min(21, geometry.size.height * 0.032), weight: .bold, design: .rounded))
                            .lineLimit(1)
                            .minimumScaleFactor(0.7)
                        
                        Spacer()
                        
                        Button {
                            carvingSessionID = UUID()
                            Task {
                                await viewModel.loadNextPicture()
                            }
                        } label: {
                            Label("New Picture", systemImage: "arrow.triangle.2.circlepath")
                                .font(.system(size: 17, weight: .bold, design: .rounded))
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(.purple)
                        .disabled(viewModel.isLoading)
                    }
                    .foregroundColor(.white)
                    .padding(.horizontal, 6)
                }
                .padding(.horizontal, max(12, geometry.size.width * 0.025))
                .padding(.vertical, max(8, geometry.size.height * 0.015))
                
                VStack {
                    HStack {
                        Spacer()
                        CloseButton.white() {
                            onDismiss?()
                        }
                        .padding(18)
                    }
                    Spacer()
                }
                
                if viewModel.isComplete {
                    VStack {
                        Image(systemName: "sparkles")
                            .font(.system(size: 58))
                            .foregroundColor(.yellow)
                            .symbolEffect(.bounce, options: .repeating)
                        Spacer()
                    }
                    .padding(.top, 70)
                    .allowsHitTesting(false)
                }
            }
        }
        .onAppear {
            Task {
                await viewModel.loadInitialPicture()
            }
        }
    }
}

private struct CarvingSurface: View {
    let picture: UIImage
    let isComplete: Bool
    let onProgress: (Double) -> Void
    
    @State private var completedStrokes: [[CGPoint]] = []
    @State private var activeStroke: [CGPoint] = []
    @State private var carvedCells: Set<Int> = []
    
    private let gridSize = 20
    
    var body: some View {
        GeometryReader { geometry in
            ZStack {
                Image(uiImage: picture)
                    .resizable()
                    .scaledToFill()
                    .frame(width: geometry.size.width, height: geometry.size.height)
                    .clipped()
                
                ZStack {
                    LinearGradient(
                        colors: [
                            Color(red: 0.93, green: 0.54, blue: 0.24),
                            Color(red: 0.78, green: 0.25, blue: 0.48),
                            Color(red: 0.38, green: 0.24, blue: 0.75)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                    
                    Image(systemName: "scribble.variable")
                        .resizable()
                        .scaledToFit()
                        .foregroundColor(.white.opacity(0.18))
                        .padding(min(geometry.size.width, geometry.size.height) * 0.14)
                    
                    Canvas { context, size in
                        context.blendMode = .destinationOut
                        let brushWidth = max(44, min(size.width, size.height) * 0.12)
                        let style = StrokeStyle(
                            lineWidth: brushWidth,
                            lineCap: .round,
                            lineJoin: .round
                        )
                        
                        for stroke in completedStrokes + [activeStroke] where !stroke.isEmpty {
                            var path = Path()
                            let first = stroke[0]
                            path.move(to: CGPoint(x: first.x * size.width, y: first.y * size.height))
                            for point in stroke.dropFirst() {
                                path.addLine(to: CGPoint(x: point.x * size.width, y: point.y * size.height))
                            }
                            context.stroke(path, with: .color(.white), style: style)
                        }
                    }
                }
                .compositingGroup()
                .opacity(isComplete ? 0 : 1)
                .animation(.easeOut(duration: 0.7), value: isComplete)
            }
            .contentShape(Rectangle())
            .gesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { value in
                        guard !isComplete,
                              geometry.size.width > 0,
                              geometry.size.height > 0 else {
                            return
                        }
                        
                        let point = CGPoint(
                            x: min(1, max(0, value.location.x / geometry.size.width)),
                            y: min(1, max(0, value.location.y / geometry.size.height))
                        )
                        activeStroke.append(point)
                        markCarvedCells(around: point)
                    }
                    .onEnded { _ in
                        if !activeStroke.isEmpty {
                            completedStrokes.append(activeStroke)
                            activeStroke = []
                        }
                    }
            )
        }
        .clipped()
    }
    
    private func markCarvedCells(around point: CGPoint) {
        let centerX = Int(point.x * CGFloat(gridSize))
        let centerY = Int(point.y * CGFloat(gridSize))
        let cellRadius = 2
        
        for y in max(0, centerY - cellRadius)...min(gridSize - 1, centerY + cellRadius) {
            for x in max(0, centerX - cellRadius)...min(gridSize - 1, centerX + cellRadius) {
                let cellCenter = CGPoint(
                    x: (CGFloat(x) + 0.5) / CGFloat(gridSize),
                    y: (CGFloat(y) + 0.5) / CGFloat(gridSize)
                )
                if hypot(cellCenter.x - point.x, cellCenter.y - point.y) <= 0.115 {
                    carvedCells.insert(y * gridSize + x)
                }
            }
        }
        
        onProgress(Double(carvedCells.count) / Double(gridSize * gridSize))
    }
}

#Preview {
    PictureCarverView()
}

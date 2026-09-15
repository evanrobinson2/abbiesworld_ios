//
//  DecorationMakingView.swift
//  abbies.world.ios
//
//  Shows decorations being made and ready to reveal.
//

import SwiftUI

struct DecorationMakingView: View {
    @ObservedObject var viewModel: DecoratorMachineViewModel
    
    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                if !viewModel.readyToReveal.isEmpty {
                    readySection
                }
                
                if !viewModel.failedJobs.isEmpty {
                    failedSection
                }
                
                if !viewModel.activeJobs.isEmpty {
                    makingSection
                }
                
                if !viewModel.queuedJobs.isEmpty {
                    queuedSection
                }
                
                if viewModel.activeJobs.isEmpty &&
                    viewModel.queuedJobs.isEmpty &&
                    viewModel.readyToReveal.isEmpty &&
                    viewModel.failedJobs.isEmpty {
                    emptyState
                }
                
                Spacer(minLength: 40)
            }
            .padding(.vertical)
        }
    }
    
    private var readySection: some View {
        VStack(spacing: 16) {
            statusHeader(
                title: "READY TO REVEAL",
                symbol: "checkmark.circle.fill",
                color: .green
            )
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 20) {
                    ForEach(viewModel.readyToReveal) { decoration in
                        ReadyDecorationCard(decoration: decoration) {
                            viewModel.revealDecoration(decoration)
                        }
                    }
                }
                .padding(.horizontal)
            }
        }
    }
    
    private var failedSection: some View {
        VStack(spacing: 16) {
            statusHeader(
                title: "NEEDS ANOTHER TRY",
                symbol: "exclamationmark.triangle.fill",
                color: .red
            )
            
            ForEach(viewModel.failedJobs) { job in
                FailedDecorationCard(
                    job: job,
                    onRetry: { viewModel.retryFailedJob(job) },
                    onDismiss: { viewModel.dismissFailedJob(job) }
                )
            }
            .padding(.horizontal)
        }
    }
    
    private var makingSection: some View {
        VStack(spacing: 16) {
            statusHeader(
                title: "MAKING...",
                symbol: "gearshape.2.fill",
                color: .teal
            )
            
            HStack(spacing: 16) {
                ForEach(viewModel.activeJobs) { job in
                    DecorationIncubator(job: job)
                }
                
                ForEach(0..<max(0, 3 - viewModel.activeJobs.count), id: \.self) { _ in
                    EmptyIncubatorSlot()
                }
            }
            .padding(.horizontal)
        }
    }
    
    private var queuedSection: some View {
        VStack(spacing: 12) {
            statusHeader(
                title: "WAITING...",
                symbol: "clock.fill",
                color: .orange
            )
            
            ForEach(viewModel.queuedJobs) { job in
                QueuedDecorationRow(job: job)
            }
            .padding(.horizontal)
        }
    }
    
    private var emptyState: some View {
        VStack(spacing: 16) {
            DecoratorGlyph(
                symbol: "wand.and.sparkles",
                tint: .teal,
                size: 68
            )
            
            Text("No decorations making")
                .font(.headline)
                .foregroundColor(.white.opacity(0.7))
            
            Text("Go to CREATE to make one!")
                .font(.subheadline)
                .foregroundColor(.white.opacity(0.5))
            
            Button {
                viewModel.currentTab = .create
            } label: {
                Text("Start Creating")
                    .fontWeight(.medium)
                    .foregroundColor(.white)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 12)
                    .background(Color.teal)
                    .clipShape(Capsule())
            }
        }
        .padding(.top, 60)
    }
    
    private func statusHeader(
        title: String,
        symbol: String,
        color: Color
    ) -> some View {
        HStack(spacing: 10) {
            DecoratorGlyph(symbol: symbol, tint: color, size: 32)
            Text(title)
                .font(.headline)
                .foregroundStyle(.white)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 8)
        .background(.black.opacity(0.24), in: Capsule())
    }
}

// MARK: - Ready Decoration Card

struct ReadyDecorationCard: View {
    let decoration: Decoration
    let onTap: () -> Void
    
    @State private var isGlowing = false
    
    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 12) {
                decorationCardBack
                    .shadow(color: .green, radius: isGlowing ? 16 : 7)
                
                Label("REVEAL", systemImage: "sparkles")
                    .font(.headline.weight(.black))
                    .foregroundStyle(.white)
                    .frame(width: 180)
                    .padding(.vertical, 12)
                    .background(.green.gradient, in: Capsule())
            }
            .padding(14)
            .background(.black.opacity(0.34), in: RoundedRectangle(cornerRadius: 24))
            .overlay {
                RoundedRectangle(cornerRadius: 24)
                    .stroke(.green.opacity(isGlowing ? 0.95 : 0.55), lineWidth: 3)
            }
            .scaleEffect(isGlowing ? 1.025 : 1)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(decoration.name), ready to reveal")
        .onAppear {
            withAnimation(.easeInOut(duration: 1).repeatForever(autoreverses: true)) {
                isGlowing = true
            }
        }
    }
    
    private var decorationCardBack: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 18)
                .fill(
                    LinearGradient(
                        colors: [
                            Color.teal.opacity(0.9),
                            Color.cyan.opacity(0.85)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
            
            VStack(spacing: 16) {
                essencePreview
                
                Image(systemName: "gift.fill")
                    .font(.system(size: 44, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 72, height: 72)
                    .background(.white.opacity(0.2), in: Circle())
                
                Text("DECORATOR MACHINE")
                    .font(.caption.weight(.black))
                    .tracking(1.2)
                    .foregroundStyle(.white)
            }
        }
        .frame(width: 180, height: 220)
        .overlay {
            RoundedRectangle(cornerRadius: 18)
                .stroke(.yellow.opacity(0.75), lineWidth: 3)
        }
    }
    
    private var essencePreview: some View {
        HStack(spacing: 6) {
            ForEach(decoration.recipeEssenceIds.prefix(3), id: \.self) { essenceId in
                if let essence = DecoratorEssenceContent.essence(for: essenceId) {
                    Text(essence.emoji)
                        .font(.system(size: 22))
                        .frame(width: 36, height: 36)
                        .background(essence.category.tint.opacity(0.3), in: Circle())
                }
            }
            if decoration.recipeEssenceIds.count > 3 {
                Text("+\(decoration.recipeEssenceIds.count - 3)")
                    .font(.caption2.weight(.bold))
                    .foregroundColor(.white)
                    .frame(width: 36, height: 36)
                    .background(.white.opacity(0.2), in: Circle())
            }
        }
    }
}

// MARK: - Decoration Incubator

struct DecorationIncubator: View {
    let job: DecoratorJob
    
    @State private var bubbleOffset: CGFloat = 0
    
    var body: some View {
        VStack(spacing: 8) {
            ZStack {
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color.teal.opacity(0.3))
                    .frame(width: 100, height: 120)
                
                VStack(spacing: 8) {
                    essenceRow
                    sparkles
                }
                
                RoundedRectangle(cornerRadius: 16)
                    .stroke(Color.teal, lineWidth: 2)
                    .frame(width: 100, height: 120)
            }
            
            Text(statusText)
                .font(.caption2)
                .foregroundColor(.white.opacity(0.7))
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 2).repeatForever(autoreverses: true)) {
                bubbleOffset = 5
            }
        }
    }
    
    private var essenceRow: some View {
        HStack(spacing: 4) {
            ForEach(job.essenceIds.prefix(3), id: \.self) { essenceId in
                if let essence = DecoratorEssenceContent.essence(for: essenceId) {
                    Text(essence.emoji)
                        .font(.system(size: 18))
                }
            }
        }
    }
    
    private var statusText: String {
        switch job.status {
        case .queued: return "Waiting..."
        case .composingPrompt: return "Thinking..."
        case .generating: return "Creating..."
        case .complete: return "Done!"
        case .failed: return "Oops!"
        }
    }
    
    private var sparkles: some View {
        HStack(spacing: 8) {
            Circle()
                .fill(.cyan)
                .frame(width: 10, height: 10)
                .offset(y: bubbleOffset)
            Circle()
                .fill(.yellow)
                .frame(width: 13, height: 13)
                .offset(y: -bubbleOffset)
            Circle()
                .fill(.pink)
                .frame(width: 10, height: 10)
                .offset(y: bubbleOffset)
        }
    }
}

// MARK: - Empty Incubator Slot

struct EmptyIncubatorSlot: View {
    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 16)
                .fill(.black.opacity(0.12))
            RoundedRectangle(cornerRadius: 16)
                .stroke(
                    Color.white.opacity(0.22),
                    style: StrokeStyle(lineWidth: 2, dash: [8])
                )
            VStack(spacing: 8) {
                DecoratorGlyph(
                    symbol: "sparkle",
                    tint: .teal.opacity(0.5),
                    size: 34
                )
                Text("Empty")
                    .font(.caption2)
                    .foregroundColor(.white.opacity(0.3))
            }
        }
        .frame(width: 100, height: 120)
    }
}

// MARK: - Queued Decoration Row

struct QueuedDecorationRow: View {
    let job: DecoratorJob
    
    var body: some View {
        HStack(spacing: 12) {
            HStack(spacing: 6) {
                ForEach(job.essenceIds.prefix(4), id: \.self) { essenceId in
                    if let essence = DecoratorEssenceContent.essence(for: essenceId) {
                        Text(essence.emoji)
                            .font(.system(size: 22))
                    }
                }
                if job.essenceIds.count > 4 {
                    Text("+\(job.essenceIds.count - 4)")
                        .font(.caption2.weight(.bold))
                        .foregroundColor(.white.opacity(0.5))
                }
            }
            
            Spacer()
            
            Text("In queue")
                .font(.caption)
                .foregroundColor(.white.opacity(0.5))
        }
        .padding()
        .background(Color.white.opacity(0.05))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

// MARK: - Failed Decoration Card

struct FailedDecorationCard: View {
    let job: DecoratorJob
    let onRetry: () -> Void
    let onDismiss: () -> Void
    
    var body: some View {
        VStack(spacing: 12) {
            HStack(spacing: 8) {
                HStack(spacing: 6) {
                    ForEach(job.essenceIds.prefix(4), id: \.self) { essenceId in
                        if let essence = DecoratorEssenceContent.essence(for: essenceId) {
                            Text(essence.emoji)
                                .font(.system(size: 26))
                        }
                    }
                }
                
                Spacer()
                
                Button(action: onDismiss) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.white.opacity(0.5))
                }
            }
            
            Text("The decorator machine got confused")
                .font(.caption)
                .foregroundColor(.white.opacity(0.7))
            
            if let error = job.errorMessage {
                Text(error)
                    .font(.caption2)
                    .foregroundColor(.red.opacity(0.8))
            }
            
            Button(action: onRetry) {
                HStack {
                    Image(systemName: "arrow.clockwise")
                    Text("Try Again")
                }
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundColor(.white)
                .padding(.horizontal, 20)
                .padding(.vertical, 10)
                .background(Color.orange)
                .clipShape(Capsule())
            }
        }
        .padding()
        .background(Color.red.opacity(0.2))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.red.opacity(0.5), lineWidth: 1)
        )
    }
}

#Preview {
    DecorationMakingView(viewModel: DecoratorMachineViewModel())
        .background(Color(red: 0.1, green: 0.08, blue: 0.18))
}

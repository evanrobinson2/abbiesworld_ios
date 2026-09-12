//
//  MakingView.swift
//  abbies.world.ios
//
//  Creation queue view showing incubating creatures.
//

import SwiftUI

struct MakingView: View {
    @ObservedObject var viewModel: CreatureBuilderViewModel
    
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
                
                if viewModel.activeJobs.isEmpty && viewModel.queuedJobs.isEmpty && viewModel.readyToReveal.isEmpty && viewModel.failedJobs.isEmpty {
                    emptyState
                }
                
                Spacer(minLength: 40)
            }
            .padding(.vertical)
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
                FailedJobCard(job: job,
                    onRetry: { viewModel.retryFailedJob(job) },
                    onDismiss: { viewModel.dismissFailedJob(job) }
                )
            }
            .padding(.horizontal)
        }
    }
    
    private var readySection: some View {
        VStack(spacing: 16) {
            statusHeader(
                title: "READY TO REVEAL",
                symbol: "checkmark.circle.fill",
                color: .green
            )
            
            HStack(spacing: 20) {
                ForEach(viewModel.readyToReveal) { card in
                    ReadyCard(card: card) {
                        viewModel.revealCard(card)
                    }
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.horizontal)
        }
    }
    
    private var makingSection: some View {
        VStack(spacing: 16) {
            statusHeader(
                title: "MAKING...",
                symbol: "gearshape.2.fill",
                color: .purple
            )
            
            HStack(spacing: 16) {
                ForEach(viewModel.activeJobs) { job in
                    IncubatorView(job: job)
                }
                
                ForEach(0..<(3 - viewModel.activeJobs.count), id: \.self) { _ in
                    EmptyIncubator()
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
                QueuedJobRow(job: job)
            }
            .padding(.horizontal)
        }
    }
    
    private var emptyState: some View {
        VStack(spacing: 16) {
            CreatureLabGlyph(
                symbol: "gearshape.2.fill",
                tint: .purple,
                size: 68
            )
            
            Text("No creatures making")
                .font(.headline)
                .foregroundColor(.white.opacity(0.7))
            
            Text("Go to BUILD to create one!")
                .font(.subheadline)
                .foregroundColor(.white.opacity(0.5))
            
            Button {
                viewModel.currentTab = .build
            } label: {
                Text("Start Building")
                    .fontWeight(.medium)
                    .foregroundColor(.white)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 12)
                    .background(Color.purple)
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
            CreatureLabGlyph(symbol: symbol, tint: color, size: 32)
            Text(title)
                .font(.headline)
                .foregroundStyle(.white)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 8)
        .background(.black.opacity(0.24), in: Capsule())
    }
}

// MARK: - Ready Card

struct ReadyCard: View {
    let card: CreatureCard
    let onTap: () -> Void
    
    @State private var isGlowing = false
    
    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 12) {
                readyCardBack
                .shadow(color: .green, radius: isGlowing ? 16 : 7)

                Label("REVEAL", systemImage: "checkmark")
                    .font(.headline.weight(.black))
                    .foregroundStyle(.white)
                    .frame(width: 220)
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
        .accessibilityLabel("\(card.name), ready to reveal")
        .onAppear {
            withAnimation(.easeInOut(duration: 1).repeatForever(autoreverses: true)) {
                isGlowing = true
            }
        }
    }

    private var readyCardBack: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 22)
                .fill(
                    LinearGradient(
                        colors: [
                            Color.indigo.opacity(0.96),
                            Color.purple.opacity(0.92)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )

            VStack(spacing: 24) {
                HStack(spacing: 10) {
                    IngredientArtworkChip(
                        ingredient: CreatureBuilderContent.creature(
                            for: card.creatureId
                        ),
                        size: 58,
                        accent: .purple
                    )
                    IngredientArtworkChip(
                        ingredient: CreatureBuilderContent.outfit(
                            for: card.outfitId
                        ),
                        size: 58,
                        accent: .orange
                    )
                    IngredientArtworkChip(
                        ingredient: CreatureBuilderContent.buddy(
                            for: card.buddyId
                        ),
                        size: 58,
                        accent: .green
                    )
                }

                Image(systemName: "checkmark")
                    .font(.system(size: 48, weight: .black))
                    .foregroundStyle(.white)
                    .frame(width: 84, height: 84)
                    .background(.green.gradient, in: Circle())

                Text("CREATURE LAB")
                    .font(.headline.weight(.black))
                    .tracking(1.4)
                    .foregroundStyle(.white)
            }
        }
        .frame(width: 220, height: 280)
        .overlay {
            RoundedRectangle(cornerRadius: 22)
                .stroke(.yellow.opacity(0.82), lineWidth: 4)
        }
    }
}

// MARK: - Incubator View

struct IncubatorView: View {
    let job: GenerationJob
    
    @State private var bubbleOffset: CGFloat = 0
    
    var body: some View {
        VStack(spacing: 8) {
            ZStack {
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color.purple.opacity(0.3))
                    .frame(width: 100, height: 120)
                
                VStack(spacing: 4) {
                    HStack(spacing: 4) {
                        IngredientArtworkChip(
                            ingredient: CreatureBuilderContent.creature(for: job.creatureId),
                            size: 27,
                            accent: .purple
                        )
                        IngredientArtworkChip(
                            ingredient: CreatureBuilderContent.outfit(for: job.outfitId),
                            size: 27,
                            accent: .orange
                        )
                        IngredientArtworkChip(
                            ingredient: CreatureBuilderContent.buddy(for: job.buddyId),
                            size: 27,
                            accent: .green
                        )
                    }
                    
                    sparkles
                }
                
                RoundedRectangle(cornerRadius: 16)
                    .stroke(Color.purple, lineWidth: 2)
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
    
    private var statusText: String {
        switch job.status {
        case .queued: return "Waiting..."
        case .generating: return "Creating..."
        case .assembling: return "Almost done!"
        default: return "Making..."
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

// MARK: - Empty Incubator

struct EmptyIncubator: View {
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
                CreatureLabGlyph(
                    symbol: "gearshape.fill",
                    tint: .indigo,
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

// MARK: - Queued Job Row

struct QueuedJobRow: View {
    let job: GenerationJob
    
    var body: some View {
        HStack(spacing: 12) {
            HStack(spacing: 4) {
                IngredientArtworkChip(
                    ingredient: CreatureBuilderContent.creature(for: job.creatureId),
                    size: 36,
                    accent: .purple
                )
                Image(systemName: "plus")
                    .font(.caption2.weight(.bold))
                    .foregroundColor(.white.opacity(0.5))
                IngredientArtworkChip(
                    ingredient: CreatureBuilderContent.outfit(for: job.outfitId),
                    size: 36,
                    accent: .orange
                )
                Image(systemName: "plus")
                    .font(.caption2.weight(.bold))
                    .foregroundColor(.white.opacity(0.5))
                IngredientArtworkChip(
                    ingredient: CreatureBuilderContent.buddy(for: job.buddyId),
                    size: 36,
                    accent: .green
                )
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

// MARK: - Failed Job Card

struct FailedJobCard: View {
    let job: GenerationJob
    let onRetry: () -> Void
    let onDismiss: () -> Void
    
    var body: some View {
        VStack(spacing: 12) {
            HStack(spacing: 8) {
                HStack(spacing: 4) {
                    IngredientArtworkChip(
                        ingredient: CreatureBuilderContent.creature(for: job.creatureId),
                        size: 42,
                        accent: .purple
                    )
                    IngredientArtworkChip(
                        ingredient: CreatureBuilderContent.outfit(for: job.outfitId),
                        size: 42,
                        accent: .orange
                    )
                    IngredientArtworkChip(
                        ingredient: CreatureBuilderContent.buddy(for: job.buddyId),
                        size: 42,
                        accent: .green
                    )
                }
                
                Spacer()
                
                Button(action: onDismiss) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.white.opacity(0.5))
                }
            }
            
            Text("The creature machine got confused")
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
    ZStack {
        Color(red: 0.1, green: 0.1, blue: 0.2)
            .ignoresSafeArea()
        MakingView(viewModel: CreatureBuilderViewModel())
    }
}

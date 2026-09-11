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
            Text("😢 OOPS!")
                .font(.headline)
                .foregroundColor(.red)
            
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
            Text("🎉 READY TO REVEAL!")
                .font(.headline)
                .foregroundColor(.green)
            
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 140))], spacing: 16) {
                ForEach(viewModel.readyToReveal) { card in
                    ReadyCard(card: card) {
                        viewModel.revealCard(card)
                    }
                }
            }
            .padding(.horizontal)
        }
    }
    
    private var makingSection: some View {
        VStack(spacing: 16) {
            Text("✨ MAKING...")
                .font(.headline)
                .foregroundColor(.white)
            
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
            Text("⏳ WAITING...")
                .font(.subheadline)
                .foregroundColor(.white.opacity(0.7))
            
            ForEach(viewModel.queuedJobs) { job in
                QueuedJobRow(job: job)
            }
            .padding(.horizontal)
        }
    }
    
    private var emptyState: some View {
        VStack(spacing: 16) {
            Text("🔮")
                .font(.system(size: 60))
            
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
}

// MARK: - Ready Card

struct ReadyCard: View {
    let card: CreatureCard
    let onTap: () -> Void
    
    @State private var isGlowing = false
    
    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 8) {
                ZStack {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(
                            LinearGradient(
                                colors: [.yellow.opacity(0.3), .orange.opacity(0.3)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                    
                    Text("?")
                        .font(.system(size: 48, weight: .bold))
                        .foregroundColor(.white)
                    
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.yellow, lineWidth: 3)
                        .shadow(color: .yellow, radius: isGlowing ? 10 : 5)
                }
                .frame(height: 120)
                
                Text("TAP TO REVEAL!")
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundColor(.yellow)
            }
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 1).repeatForever(autoreverses: true)) {
                isGlowing = true
            }
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
                    HStack(spacing: 2) {
                        Text(creatureIcon)
                        Text(outfitIcon)
                        Text(buddyIcon)
                    }
                    .font(.title3)
                    
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
    
    private var creatureIcon: String {
        CreatureBuilderContent.creature(for: job.creatureId)?.displayIcon ?? "?"
    }
    
    private var outfitIcon: String {
        CreatureBuilderContent.outfit(for: job.outfitId)?.displayIcon ?? "?"
    }
    
    private var buddyIcon: String {
        CreatureBuilderContent.buddy(for: job.buddyId)?.displayIcon ?? "?"
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
            Text("✨")
                .offset(y: bubbleOffset)
            Text("✨")
                .offset(y: -bubbleOffset)
            Text("✨")
                .offset(y: bubbleOffset)
        }
        .font(.caption)
    }
}

// MARK: - Empty Incubator

struct EmptyIncubator: View {
    var body: some View {
        RoundedRectangle(cornerRadius: 16)
            .stroke(Color.white.opacity(0.2), style: StrokeStyle(lineWidth: 2, dash: [8]))
            .frame(width: 100, height: 120)
            .overlay(
                Text("Empty")
                    .font(.caption2)
                    .foregroundColor(.white.opacity(0.3))
            )
    }
}

// MARK: - Queued Job Row

struct QueuedJobRow: View {
    let job: GenerationJob
    
    var body: some View {
        HStack(spacing: 12) {
            HStack(spacing: 4) {
                Text(CreatureBuilderContent.creature(for: job.creatureId)?.displayIcon ?? "?")
                Text("+")
                    .foregroundColor(.white.opacity(0.5))
                Text(CreatureBuilderContent.outfit(for: job.outfitId)?.displayIcon ?? "?")
                Text("+")
                    .foregroundColor(.white.opacity(0.5))
                Text(CreatureBuilderContent.buddy(for: job.buddyId)?.displayIcon ?? "?")
            }
            .font(.title3)
            
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
                    Text(CreatureBuilderContent.creature(for: job.creatureId)?.displayIcon ?? "?")
                    Text(CreatureBuilderContent.outfit(for: job.outfitId)?.displayIcon ?? "?")
                    Text(CreatureBuilderContent.buddy(for: job.buddyId)?.displayIcon ?? "?")
                }
                .font(.title2)
                
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

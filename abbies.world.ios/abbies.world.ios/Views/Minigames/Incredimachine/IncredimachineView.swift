//
//  IncredimachineView.swift
//  abbies.world.ios
//
//  Whizbang — gadget launcher minigame.
//

import SwiftUI

struct IncredimachineView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = IncredimachineViewModel()

    var onDismiss: (() -> Void)?
    var onComplete: (() -> Void)?

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [
                    Color(red: 0.14, green: 0.08, blue: 0.28),
                    Color(red: 0.32, green: 0.12, blue: 0.22)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(spacing: 10) {
                topBar
                FlyerHeadStrip(viewModel: viewModel)
                IncredimachineCanvas(viewModel: viewModel)
                    .clipShape(RoundedRectangle(cornerRadius: 26, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 26, style: .continuous)
                            .stroke(.white.opacity(0.8), lineWidth: 4)
                    )
                    .shadow(color: .black.opacity(0.3), radius: 12, y: 8)
                    .accessibilityLabel("Whizbang play area")

                Text(viewModel.statusMessage)
                    .font(.system(size: 18, weight: .heavy, design: .rounded))
                    .foregroundStyle(.white)
                    .multilineTextAlignment(.center)
                    .minimumScaleFactor(0.7)
                    .frame(maxWidth: .infinity, minHeight: 28)

                IncredimachineControls(viewModel: viewModel)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)

            if viewModel.phase == .landed {
                celebration
                    .transition(.scale.combined(with: .opacity))
            }
        }
        .preferredColorScheme(.dark)
        .onAppear {
            MusicService.shared.setGameActive(true)
            viewModel.prepare()
        }
        .onDisappear {
            viewModel.cleanup()
            MusicService.shared.setGameActive(false)
        }
        .onChange(of: viewModel.phase) { _, newValue in
            if newValue == .landed {
                onComplete?()
            }
        }
        .animation(.spring(response: 0.42, dampingFraction: 0.74), value: viewModel.phase)
    }

    private var topBar: some View {
        HStack(spacing: 12) {
            Button {
                onDismiss?()
                dismiss()
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 22, weight: .heavy))
                    .frame(width: 52, height: 52)
                    .background(.white.opacity(0.17), in: Circle())
                    .overlay(Circle().stroke(.white.opacity(0.45), lineWidth: 2))
            }
            .accessibilityLabel("Close Whizbang")

            VStack(alignment: .leading, spacing: 0) {
                Text("Whizbang")
                    .font(.system(size: 30, weight: .black, design: .rounded))
                Text("The Incredimachine")
                    .font(.system(size: 15, weight: .bold, design: .rounded))
                    .foregroundStyle(.white.opacity(0.75))
            }

            Spacer()

            HStack(spacing: 7) {
                Image(systemName: "sparkles")
                    .foregroundStyle(.yellow)
                Text("\(viewModel.ledger.balance)")
                    .font(.system(size: 23, weight: .black, design: .rounded))
            }
            .padding(.horizontal, 17)
            .frame(height: 52)
            .background(.black.opacity(0.2), in: Capsule())
            .overlay(Capsule().stroke(.white.opacity(0.32), lineWidth: 2))
        }
        .foregroundStyle(.white)
    }

    private var celebration: some View {
        VStack(spacing: 16) {
            Text("Cloud-bed landing!")
                .font(.system(size: 34, weight: .black, design: .rounded))
            Text(viewModel.awardedSeeds > 0 ? "+\(viewModel.awardedSeeds) Star Seeds" : "Do it again?")
                .font(.system(size: 20, weight: .heavy, design: .rounded))
            Button {
                viewModel.resetMachine()
            } label: {
                Text("Again")
                    .font(.system(size: 22, weight: .black, design: .rounded))
                    .padding(.horizontal, 36)
                    .padding(.vertical, 14)
                    .background(Color.yellow, in: Capsule())
                    .foregroundStyle(.black)
            }
            .accessibilityLabel("Play Whizbang again")
        }
        .padding(28)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 28, style: .continuous))
        .foregroundStyle(.white)
    }
}

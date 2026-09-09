//
//  DinoPicnicView.swift
//  abbies.world.ios
//

import SwiftUI

struct DinoPicnicView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = DinoPicnicViewModel()

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [
                    Color(red: 0.17, green: 0.1, blue: 0.32),
                    Color(red: 0.32, green: 0.15, blue: 0.5)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(spacing: 12) {
                topBar
                partyMeter

                DinoPicnicCanvas(viewModel: viewModel)
                    .id(viewModel.roundID)
                    .clipShape(RoundedRectangle(cornerRadius: 28, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 28, style: .continuous)
                            .stroke(.white.opacity(0.82), lineWidth: 4)
                    )
                    .shadow(color: .black.opacity(0.28), radius: 12, y: 8)
                    .accessibilityLabel("Dino Picnic play area")
                    .accessibilityHint("Touch and drag to toss the selected snack")

                statusBar
                snackPicker
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 12)

            if viewModel.isComplete {
                celebrationOverlay
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
        .animation(.spring(response: 0.42, dampingFraction: 0.74), value: viewModel.phase)
    }

    private var topBar: some View {
        HStack(spacing: 14) {
            Button {
                dismiss()
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 22, weight: .heavy))
                    .frame(width: 52, height: 52)
                    .background(.white.opacity(0.17), in: Circle())
                    .overlay(Circle().stroke(.white.opacity(0.45), lineWidth: 2))
            }
            .accessibilityLabel("Close Dino Picnic")

            VStack(alignment: .leading, spacing: 0) {
                Text("Dino Picnic")
                    .font(.system(size: 30, weight: .black, design: .rounded))
                Text("Toss a snack. Make a friend.")
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
            .accessibilityLabel("\(viewModel.ledger.balance) Star Seeds")
        }
        .foregroundStyle(.white)
    }

    private var partyMeter: some View {
        HStack(spacing: 11) {
            Text("PICNIC PARTY")
                .font(.system(size: 14, weight: .black, design: .rounded))
                .foregroundStyle(.white.opacity(0.78))

            HStack(spacing: 8) {
                ForEach(0..<viewModel.feedGoal, id: \.self) { index in
                    Image(systemName: index < viewModel.feedCount ? "star.fill" : "star")
                        .font(.system(size: 24, weight: .bold))
                        .foregroundStyle(
                            index < viewModel.feedCount
                                ? Color.yellow
                                : Color.white.opacity(0.45)
                        )
                        .scaleEffect(index == viewModel.feedCount - 1 ? 1.16 : 1)
                }
            }

            Spacer()

            Text("\(viewModel.feedCount) / \(viewModel.feedGoal)")
                .font(.system(size: 18, weight: .black, design: .rounded))
        }
        .padding(.horizontal, 18)
        .frame(height: 48)
        .background(.black.opacity(0.18), in: Capsule())
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(viewModel.feedCount) of \(viewModel.feedGoal) dinosaurs fed")
    }

    private var statusBar: some View {
        HStack(spacing: 10) {
            Text(viewModel.currentRequest.symbol)
                .font(.system(size: 28))
            Text(viewModel.statusMessage)
                .font(.system(size: 19, weight: .bold, design: .rounded))
                .lineLimit(1)
                .minimumScaleFactor(0.72)
            Spacer()
            if viewModel.showTrajectoryHint {
                Label("Magic trail", systemImage: "wand.and.stars")
                    .font(.system(size: 14, weight: .bold, design: .rounded))
                    .foregroundStyle(.yellow)
            }
        }
        .foregroundStyle(.white)
        .padding(.horizontal, 18)
        .frame(height: 50)
        .background(.black.opacity(0.22), in: RoundedRectangle(cornerRadius: 18))
    }

    private var snackPicker: some View {
        HStack(spacing: 14) {
            ForEach(DinoPicnicSnack.allCases) { snack in
                Button {
                    viewModel.selectSnack(snack)
                } label: {
                    VStack(spacing: 3) {
                        Text(snack.symbol)
                            .font(.system(size: 42))
                        Text(snack.title)
                            .font(.system(size: 15, weight: .black, design: .rounded))
                    }
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 80)
                    .background(
                        viewModel.selectedSnack == snack
                            ? Color.white.opacity(0.28)
                            : Color.black.opacity(0.18),
                        in: RoundedRectangle(cornerRadius: 22, style: .continuous)
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 22, style: .continuous)
                            .stroke(
                                viewModel.selectedSnack == snack
                                    ? Color.yellow
                                    : Color.white.opacity(0.3),
                                lineWidth: viewModel.selectedSnack == snack ? 4 : 2
                            )
                    )
                    .scaleEffect(viewModel.selectedSnack == snack ? 1.04 : 0.98)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("\(snack.title) snack")
                .accessibilityAddTraits(
                    viewModel.selectedSnack == snack ? .isSelected : []
                )
            }
        }
        .disabled(viewModel.isComplete)
    }

    private var celebrationOverlay: some View {
        VStack(spacing: 20) {
            Text("PICNIC PARTY!")
                .font(.system(size: 44, weight: .black, design: .rounded))
                .foregroundStyle(
                    LinearGradient(
                        colors: [.yellow, .orange, .pink],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )

            Text("Every dinosaur found a snack.")
                .font(.system(size: 21, weight: .bold, design: .rounded))
                .foregroundStyle(.white)

            if viewModel.awardedSeeds > 0 {
                HStack(spacing: 10) {
                    Image(systemName: "sparkles")
                        .foregroundStyle(.yellow)
                    Text("+\(viewModel.awardedSeeds) Star Seeds")
                        .font(.system(size: 24, weight: .black, design: .rounded))
                }
                .foregroundStyle(.white)
                .padding(.horizontal, 22)
                .frame(height: 54)
                .background(.white.opacity(0.15), in: Capsule())
            }

            HStack(spacing: 16) {
                Button {
                    viewModel.replay()
                } label: {
                    Label("Again!", systemImage: "arrow.counterclockwise")
                        .font(.system(size: 22, weight: .black, design: .rounded))
                        .frame(minWidth: 155, minHeight: 62)
                }
                .buttonStyle(PicnicCelebrationButtonStyle(color: .purple))

                Button {
                    dismiss()
                } label: {
                    Label("All done", systemImage: "checkmark")
                        .font(.system(size: 22, weight: .black, design: .rounded))
                        .frame(minWidth: 155, minHeight: 62)
                }
                .buttonStyle(PicnicCelebrationButtonStyle(color: .green))
            }
        }
        .padding(34)
        .background(
            .ultraThinMaterial,
            in: RoundedRectangle(cornerRadius: 34, style: .continuous)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 34, style: .continuous)
                .stroke(.white.opacity(0.6), lineWidth: 3)
        )
        .shadow(color: .black.opacity(0.4), radius: 28, y: 16)
        .padding(30)
        .accessibilityElement(children: .contain)
    }
}

private struct PicnicCelebrationButtonStyle: ButtonStyle {
    let color: Color

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .foregroundStyle(.white)
            .padding(.horizontal, 18)
            .background(color.opacity(configuration.isPressed ? 0.62 : 0.88), in: Capsule())
            .overlay(Capsule().stroke(.white.opacity(0.65), lineWidth: 3))
            .scaleEffect(configuration.isPressed ? 0.96 : 1)
    }
}

#Preview {
    DinoPicnicView()
}

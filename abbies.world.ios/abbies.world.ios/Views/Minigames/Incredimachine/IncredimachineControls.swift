//
//  IncredimachineControls.swift
//  abbies.world.ios
//

import SwiftUI

struct IncredimachineControls: View {
    @ObservedObject var viewModel: IncredimachineViewModel

    var body: some View {
        VStack(spacing: 10) {
            HStack(spacing: 12) {
                MachineKnob(
                    value: $viewModel.settings.angle,
                    label: "Angle",
                    symbol: "location.north.line.fill",
                    tint: Color(red: 1, green: 0.62, blue: 0.2)
                )
                MachineKnob(
                    value: $viewModel.settings.power,
                    label: "Spring",
                    symbol: "bolt.fill",
                    tint: Color(red: 0.95, green: 0.28, blue: 0.28)
                )
                MachineKnob(
                    value: $viewModel.settings.spin,
                    label: "Spin",
                    symbol: "arrow.triangle.2.circlepath",
                    tint: Color(red: 0.55, green: 0.38, blue: 0.95)
                )
            }

            HStack(spacing: 8) {
                MachineSwitch(isOn: $viewModel.settings.fanOn, title: "Fan", symbol: "wind")
                MachineSwitch(isOn: $viewModel.settings.bounceOn, title: "Bounce", symbol: "arrow.up.and.down")
                MachineSwitch(isOn: $viewModel.settings.balloonOn, title: "Balloon", symbol: "balloon.fill")
            }

            HStack(spacing: 10) {
                Button {
                    viewModel.requestLaunch()
                } label: {
                    Text("LAUNCH")
                        .font(.system(size: 22, weight: .black, design: .rounded))
                        .frame(maxWidth: .infinity, minHeight: 56)
                        .background(Color(red: 0.92, green: 0.2, blue: 0.18), in: Capsule())
                }
                .disabled(viewModel.phase == .flying || viewModel.isWorking)
                .opacity(viewModel.phase == .flying ? 0.45 : 1)

                Button {
                    viewModel.resetMachine()
                } label: {
                    Text("Reset")
                        .font(.system(size: 18, weight: .heavy, design: .rounded))
                        .frame(width: 92, height: 56)
                        .background(Color.white.opacity(0.16), in: Capsule())
                }
            }
            .foregroundStyle(.white)
        }
    }
}

struct MachineKnob: View {
    @Binding var value: Double
    let label: String
    let symbol: String
    let tint: Color

    var body: some View {
        VStack(spacing: 6) {
            Text(label)
                .font(.system(size: 13, weight: .heavy, design: .rounded))
                .foregroundStyle(.white.opacity(0.85))

            ZStack {
                Circle()
                    .fill(tint.opacity(0.35))
                    .overlay(Circle().stroke(.white.opacity(0.55), lineWidth: 3))
                Capsule()
                    .fill(.white)
                    .frame(width: 7, height: 26)
                    .offset(y: -18)
                    .rotationEffect(.degrees(-120 + value * 240))
                Image(systemName: symbol)
                    .font(.system(size: 16, weight: .black))
                    .foregroundStyle(.white)
            }
            .frame(width: 74, height: 74)
            .gesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { drag in
                        let center = CGPoint(x: 37, y: 37)
                        let angle = atan2(drag.location.x - center.x, center.y - drag.location.y)
                        let degrees = angle * 180 / .pi
                        let clamped = min(max(degrees, -120), 120)
                        value = (clamped + 120) / 240
                    }
            )
            .accessibilityLabel(label)
            .accessibilityValue("\(Int(value * 100)) percent")
        }
        .frame(maxWidth: .infinity)
    }
}

struct MachineSwitch: View {
    @Binding var isOn: Bool
    let title: String
    let symbol: String

    var body: some View {
        Button {
            isOn.toggle()
            UISelectionFeedbackGenerator().selectionChanged()
        } label: {
            VStack(spacing: 4) {
                Image(systemName: symbol)
                    .font(.system(size: 18, weight: .black))
                Text(title)
                    .font(.system(size: 13, weight: .heavy, design: .rounded))
            }
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity, minHeight: 52)
            .background(
                (isOn ? Color(red: 0.18, green: 0.72, blue: 0.42) : Color.white.opacity(0.14)),
                in: RoundedRectangle(cornerRadius: 16, style: .continuous)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(.white.opacity(0.4), lineWidth: 2)
            )
        }
        .accessibilityLabel(title)
        .accessibilityValue(isOn ? "On" : "Off")
    }
}

struct FlyerHeadStrip: View {
    @ObservedObject var viewModel: IncredimachineViewModel

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                ForEach(viewModel.heads) { head in
                    Button {
                        viewModel.selectHead(head)
                    } label: {
                        Image(uiImage: head.image)
                            .resizable()
                            .scaledToFill()
                            .frame(width: 58, height: 58)
                            .clipShape(Circle())
                            .overlay(
                                Circle().stroke(
                                    viewModel.selectedHeadID == head.id ? Color.yellow : Color.white.opacity(0.4),
                                    lineWidth: viewModel.selectedHeadID == head.id ? 4 : 2
                                )
                            )
                    }
                    .accessibilityLabel(head.name)
                }

                HeadActionChip(title: "Extract", symbol: "scissors") {
                    Task { await viewModel.extractFromGallery() }
                }
                HeadActionChip(title: "Draw head", symbol: "paintbrush.pointed.fill") {
                    Task { await viewModel.drawOnlyHead() }
                }
            }
            .padding(.horizontal, 4)
        }
        .opacity(viewModel.isWorking ? 0.55 : 1)
        .allowsHitTesting(!viewModel.isWorking)
    }
}

private struct HeadActionChip: View {
    let title: String
    let symbol: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 2) {
                Image(systemName: symbol)
                Text(title)
                    .font(.system(size: 11, weight: .heavy, design: .rounded))
            }
            .foregroundStyle(.white)
            .frame(width: 72, height: 58)
            .background(Color.white.opacity(0.16), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        }
        .accessibilityLabel(title)
    }
}

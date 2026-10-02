//
//  MoonGuidanceView.swift
//  abbies.world.ios
//
//  Kid Lunar Lander approach — infinite retry + Land for me. No shame.
//

import SwiftUI

struct MoonGuidanceView: View {
    var onExit: () -> Void
    var onLanded: () -> Void

    @StateObject private var model = MoonGuidanceViewModel()
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        ZStack {
            playfield
            chrome
        }
        .ignoresSafeArea()
        .onChange(of: model.state.phase) { _, phase in
            if phase == .landed {
                onLanded()
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.moonGuidance")
    }

    private var playfield: some View {
        GeometryReader { geo in
            ZStack {
                World2SemanticImage(
                    semanticName: "map.moonBase.landingPad",
                    fallbackIcon: "circle.dashed",
                    fallbackLabel: "Landing pad blueprint"
                )
                .scaledToFill()
                .frame(width: geo.size.width, height: geo.size.height)
                .clipped()
                .opacity(0.55)

                LinearGradient(
                    colors: [
                        Color(red: 0.05, green: 0.12, blue: 0.28).opacity(0.55),
                        Color(red: 0.08, green: 0.22, blue: 0.38).opacity(0.25),
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )

                // Pad highlight (forgiving target).
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .strokeBorder(Color.cyan.opacity(0.85), lineWidth: 4)
                    .background(
                        RoundedRectangle(cornerRadius: 18, style: .continuous)
                            .fill(Color.cyan.opacity(0.18))
                    )
                    .frame(
                        width: geo.size.width * MoonGuidanceState.padHalfWidth * 2,
                        height: geo.size.height * (MoonGuidanceState.padBottomY - MoonGuidanceState.padTopY)
                    )
                    .position(
                        x: geo.size.width * MoonGuidanceState.padCenterX,
                        y: geo.size.height * ((MoonGuidanceState.padTopY + MoonGuidanceState.padBottomY) / 2)
                    )
                    .accessibilityLabel("Landing pad")

                rocket(in: geo.size)
            }
        }
    }

    private func rocket(in size: CGSize) -> some View {
        let x = size.width * model.state.rocketX
        let y = size.height * model.state.rocketY
        return World2SemanticImage(
            semanticName: "poi.moonBase.rocket.exterior",
            fallbackIcon: "airplane",
            fallbackLabel: "Rocket"
        )
        .scaledToFit()
        .frame(width: size.width * 0.14, height: size.width * 0.18)
        .position(x: x, y: y)
        .accessibilityIdentifier("world2.moonGuidance.rocket")
        .accessibilityLabel("Rocket")
    }

    private var chrome: some View {
        VStack(spacing: 12) {
            HStack {
                Button(action: onExit) {
                    Label("Leave", systemImage: "xmark.circle.fill")
                        .font(.system(size: 18, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                        .background(Capsule().fill(Color.black.opacity(0.45)))
                }
                .accessibilityIdentifier("world2.moonGuidance.leave")
                Spacer()
            }
            .padding(.horizontal, 20)
            .padding(.top, 16)

            Text(model.coach)
                .font(.system(size: 20, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 24)
                .shadow(color: .black.opacity(0.45), radius: 2, y: 1)
                .accessibilityIdentifier("world2.moonGuidance.coach")

            Spacer()

            if case .bounced(let message) = model.state.phase {
                bounceCard(message)
            } else if model.state.phase == .landed {
                landedCard
            } else if model.state.phase == .ready {
                startCard
            } else {
                controls
            }
        }
    }

    private var startCard: some View {
        VStack(spacing: 14) {
            Text("Guide the rocket onto the big glowing pad.")
                .font(.system(size: 18, weight: .semibold, design: .rounded))
                .foregroundStyle(.white)
                .multilineTextAlignment(.center)
            Button {
                model.start()
            } label: {
                Text("Start approach")
                    .font(.system(size: 22, weight: .heavy, design: .rounded))
                    .foregroundStyle(Color(red: 0.08, green: 0.18, blue: 0.32))
                    .frame(maxWidth: 280)
                    .padding(.vertical, 16)
                    .background(RoundedRectangle(cornerRadius: 18).fill(Color.cyan))
            }
            .accessibilityIdentifier("world2.moonGuidance.start")
        }
        .padding(20)
        .background(RoundedRectangle(cornerRadius: 22).fill(Color.black.opacity(0.5)))
        .padding(.bottom, 36)
    }

    private func bounceCard(_ message: String) -> some View {
        VStack(spacing: 14) {
            Text(message)
                .font(.system(size: 20, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
                .multilineTextAlignment(.center)
            Button {
                model.dismissBounceAndRetry()
            } label: {
                Text("Try again")
                    .font(.system(size: 22, weight: .heavy, design: .rounded))
                    .foregroundStyle(.white)
                    .frame(maxWidth: 260)
                    .padding(.vertical, 14)
                    .background(RoundedRectangle(cornerRadius: 16).fill(Color.orange))
            }
            .accessibilityIdentifier("world2.moonGuidance.retry")

            if model.state.showsLandForMe {
                Button {
                    model.landForMe()
                } label: {
                    Text("Land for me")
                        .font(.system(size: 20, weight: .bold, design: .rounded))
                        .foregroundStyle(Color(red: 0.1, green: 0.25, blue: 0.2))
                        .frame(maxWidth: 260)
                        .padding(.vertical, 14)
                        .background(RoundedRectangle(cornerRadius: 16).fill(Color.mint))
                }
                .accessibilityIdentifier("world2.moonGuidance.landForMe")
                .accessibilityHint(MoonGuidanceCoach.bypass)
            }
        }
        .padding(20)
        .background(RoundedRectangle(cornerRadius: 22).fill(Color.black.opacity(0.55)))
        .padding(.bottom, 36)
    }

    private var landedCard: some View {
        Text(MoonGuidanceCoach.landed)
            .font(.system(size: 24, weight: .heavy, design: .rounded))
            .foregroundStyle(.white)
            .padding(20)
            .background(RoundedRectangle(cornerRadius: 22).fill(Color.green.opacity(0.65)))
            .padding(.bottom, 40)
            .accessibilityIdentifier("world2.moonGuidance.landed")
    }

    private var controls: some View {
        VStack(spacing: 12) {
            if model.state.showsLandForMe {
                Button {
                    model.landForMe()
                } label: {
                    Text("Land for me")
                        .font(.system(size: 18, weight: .bold, design: .rounded))
                        .foregroundStyle(Color(red: 0.1, green: 0.25, blue: 0.2))
                        .padding(.horizontal, 22)
                        .padding(.vertical, 12)
                        .background(Capsule().fill(Color.mint))
                }
                .accessibilityIdentifier("world2.moonGuidance.landForMe")
            }

            HStack(spacing: 18) {
                holdButton("←", holding: $model.holdingLeft, id: "world2.moonGuidance.left")
                holdButton("Soft land", holding: $model.holdingBrake, id: "world2.moonGuidance.brake", wide: true)
                holdButton("→", holding: $model.holdingRight, id: "world2.moonGuidance.right")
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 28)
        }
    }

    private func holdButton(
        _ title: String,
        holding: Binding<Bool>,
        id: String,
        wide: Bool = false
    ) -> some View {
        Text(title)
            .font(.system(size: wide ? 20 : 28, weight: .heavy, design: .rounded))
            .foregroundStyle(.white)
            .frame(minWidth: wide ? 140 : 72, minHeight: 64)
            .padding(.horizontal, wide ? 18 : 12)
            .background(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .fill(holding.wrappedValue ? Color.cyan.opacity(0.9) : Color.white.opacity(0.22))
            )
            .gesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { _ in holding.wrappedValue = true }
                    .onEnded { _ in holding.wrappedValue = false }
            )
            .accessibilityIdentifier(id)
            .accessibilityAddTraits(.isButton)
    }
}

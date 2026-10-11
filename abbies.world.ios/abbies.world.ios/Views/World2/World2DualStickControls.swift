//
//  World2DualStickControls.swift
//  abbies.world.ios
//
//  Left stick moves the party and turns them to face that step. Right stick
//  only turns them while they stand. Zone travel lives in the right-thumb
//  tile stack.
//

import SwiftUI

struct World2DualStickControls: View {
    @ObservedObject var party: World2PartyController
    var onRightActuate: (() -> Void)? = nil
    @State private var move = World2StickVector.zero
    @State private var face = World2StickVector.zero

    var body: some View {
        HStack(alignment: .bottom) {
            World2Joystick(
                title: "Move",
                accessibilityID: "world2.stick.move",
                vector: $move
            )
            Spacer(minLength: 0)
            World2Joystick(
                title: "Look",
                accessibilityID: "world2.stick.face",
                vector: $face,
                onActuate: onRightActuate
            )
        }
        .padding(.horizontal, 22)
        .padding(.bottom, 16)
        .onChange(of: move) { _, vector in
            party.setMoveStick(vector)
        }
        .onChange(of: face) { _, vector in
            party.setFaceStick(vector)
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.sticks")
    }
}

struct World2Joystick: View {
    let title: String
    let accessibilityID: String
    @Binding var vector: World2StickVector
    var onActuate: (() -> Void)? = nil

    private let travel: CGFloat = 46
    @State private var didActuate = false

    var body: some View {
        VStack(spacing: 4) {
            ZStack {
                Circle()
                    .fill(.black.opacity(0.42))
                    .overlay(Circle().stroke(.white.opacity(0.55), lineWidth: 2))
                Circle()
                    .fill(.white.opacity(0.94))
                    .frame(width: 54, height: 54)
                    .shadow(color: .black.opacity(0.25), radius: 4, y: 2)
                    .offset(x: vector.x * travel, y: -vector.y * travel)
            }
            .frame(width: 124, height: 124)
            .contentShape(Circle())
            .highPriorityGesture(drag)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(title)
            .accessibilityValue(String(format: "x %.2f y %.2f", vector.x, vector.y))
            .accessibilityIdentifier(accessibilityID)

            Text(title)
                .font(.system(size: 12, weight: .black, design: .rounded))
                .foregroundStyle(.white)
                .shadow(color: .black.opacity(0.6), radius: 2, y: 1)
        }
    }

    private var drag: some Gesture {
        DragGesture(minimumDistance: 0)
            .onChanged { value in
                let dx = value.translation.width
                let dy = value.translation.height
                let distance = hypot(dx, dy)
                let clamped = min(distance, travel)
                let scale = distance > 0.5 ? clamped / distance : 0
                let next = World2StickVector(
                    x: Double(dx * scale / travel),
                    y: Double(-dy * scale / travel)
                )
                vector = next
                if next.magnitude >= 0.72, !didActuate {
                    didActuate = true
                    onActuate?()
                }
            }
            .onEnded { value in
                let distance = hypot(value.translation.width, value.translation.height)
                if !didActuate, distance < 16 {
                    onActuate?()
                }
                didActuate = false
                vector = .zero
            }
    }
}

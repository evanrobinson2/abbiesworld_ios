//
//  MoonLaunchCheckView.swift
//  abbies.world.ios
//
//  Cockpit memory launch-check — Houston row + player row; scrub never mutates player.
//

import SwiftUI

struct MoonLaunchCheckView: View {
    var onExit: () -> Void
    var onReadyForGuidance: () -> Void

    @StateObject private var model = MoonLaunchCheckViewModel()

    var body: some View {
        ZStack {
            background
            VStack(spacing: 16) {
                topBar
                Text(model.state.coach)
                    .font(.system(size: 20, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 20)
                    .accessibilityIdentifier("world2.moonLaunchCheck.coach")

                sequenceRow(
                    title: "Houston",
                    commands: model.state.sequence,
                    highlight: model.state.houstonHighlightIndex,
                    filledCount: model.state.sequence.count,
                    idPrefix: "houston"
                )

                scrubber

                sequenceRow(
                    title: "Abbie",
                    commands: model.state.sequence,
                    highlight: nil,
                    filledCount: model.state.playerInput.count,
                    playerCommands: model.state.playerInput,
                    idPrefix: "player"
                )

                speedToggle

                if model.state.phase == .ready {
                    startButton
                } else if model.state.phase == .input {
                    commandPad
                } else if model.state.phase == .complete {
                    readyCard
                }

                Spacer(minLength: 8)
            }
            .padding(.top, 12)

            if model.state.showsRetryOverlay {
                retryOverlay
            }
        }
        .ignoresSafeArea()
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.moonLaunchCheck")
    }

    private var background: some View {
        ZStack {
            World2SemanticImage(
                semanticName: "poi.moonBase.earthCockpit",
                fallbackIcon: "airplane.circle",
                fallbackLabel: "Cockpit"
            )
            .scaledToFill()
            .opacity(0.45)
            LinearGradient(
                colors: [
                    Color(red: 0.04, green: 0.08, blue: 0.16).opacity(0.75),
                    Color(red: 0.08, green: 0.14, blue: 0.22).opacity(0.55),
                ],
                startPoint: .top,
                endPoint: .bottom
            )
        }
    }

    private var topBar: some View {
        HStack {
            Button(action: onExit) {
                Label("Leave", systemImage: "xmark.circle.fill")
                    .font(.system(size: 18, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(Capsule().fill(Color.black.opacity(0.45)))
            }
            .accessibilityIdentifier("world2.moonLaunchCheck.leave")
            Spacer()
            Text("\(model.state.sequence.count)/\(model.state.config.targetLength)")
                .font(.system(size: 16, weight: .semibold, design: .rounded).monospacedDigit())
                .foregroundStyle(.white.opacity(0.85))
                .accessibilityIdentifier("world2.moonLaunchCheck.progress")
        }
        .padding(.horizontal, 20)
    }

    private func sequenceRow(
        title: String,
        commands: [MoonLaunchCommand],
        highlight: Int?,
        filledCount: Int,
        playerCommands: [MoonLaunchCommand] = [],
        idPrefix: String
    ) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.system(size: 13, weight: .semibold, design: .rounded))
                .foregroundStyle(.white.opacity(0.7))
                .textCase(.uppercase)
            HStack(spacing: 8) {
                ForEach(Array(commands.enumerated()), id: \.offset) { idx, cmd in
                    let shown: MoonLaunchCommand? = {
                        if idPrefix == "player" {
                            return idx < playerCommands.count ? playerCommands[idx] : nil
                        }
                        return idx < filledCount ? cmd : nil
                    }()
                    commandChip(
                        shown,
                        lit: highlight == idx,
                        id: "world2.moonLaunchCheck.\(idPrefix).\(idx)"
                    )
                }
            }
        }
        .padding(.horizontal, 20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityIdentifier("world2.moonLaunchCheck.row.\(idPrefix)")
    }

    private func commandChip(_ command: MoonLaunchCommand?, lit: Bool, id: String) -> some View {
        ZStack {
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(lit ? Color.cyan.opacity(0.55) : Color.white.opacity(0.12))
                .overlay(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .strokeBorder(Color.white.opacity(lit ? 0.9 : 0.25), lineWidth: lit ? 2 : 1)
                )
            if let command {
                Image(systemName: command.symbolName)
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(.white)
            }
        }
        .frame(width: 52, height: 52)
        .accessibilityIdentifier(id)
        .accessibilityLabel(command?.label ?? "empty")
    }

    private var scrubber: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Houston scrub (demo help)")
                .font(.system(size: 12, weight: .medium, design: .rounded))
                .foregroundStyle(.white.opacity(0.55))
            Slider(
                value: Binding(
                    get: { Double(model.state.scrubIndex) },
                    set: { model.scrub(to: Int($0.rounded())) }
                ),
                in: 0...Double(max(model.state.sequence.count, 1)),
                step: 1
            )
            .tint(.cyan)
            .disabled(model.state.sequence.isEmpty)
            .accessibilityIdentifier("world2.moonLaunchCheck.scrubber")
        }
        .padding(.horizontal, 20)
    }

    private var speedToggle: some View {
        HStack(spacing: 10) {
            ForEach([MoonLaunchDemoSpeed.slow, .fast], id: \.rawValue) { speed in
                Button {
                    model.setDemoSpeed(speed)
                } label: {
                    Text(speed == .slow ? "Slow" : "Fast")
                        .font(.system(size: 15, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(
                            Capsule().fill(
                                model.state.demoSpeed == speed
                                    ? Color.cyan.opacity(0.55)
                                    : Color.white.opacity(0.15)
                            )
                        )
                }
                .accessibilityIdentifier("world2.moonLaunchCheck.speed.\(speed.rawValue)")
            }
            Spacer()
        }
        .padding(.horizontal, 20)
    }

    private var commandPad: some View {
        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 10), count: 5), spacing: 10) {
            ForEach(MoonLaunchCommand.allCases) { cmd in
                Button {
                    model.tapCommand(cmd)
                } label: {
                    VStack(spacing: 4) {
                        Image(systemName: cmd.symbolName)
                        Text(cmd.label)
                            .font(.system(size: 10, weight: .semibold, design: .rounded))
                    }
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(RoundedRectangle(cornerRadius: 14).fill(Color.white.opacity(0.16)))
                }
                .accessibilityIdentifier("world2.moonLaunchCheck.pad.\(cmd.rawValue)")
            }
        }
        .padding(.horizontal, 16)
    }

    private var startButton: some View {
        Button(action: model.startRound) {
            Text("Begin launch check")
                .font(.system(size: 18, weight: .bold, design: .rounded))
                .foregroundStyle(.black)
                .padding(.horizontal, 22)
                .padding(.vertical, 12)
                .background(Capsule().fill(Color.white))
        }
        .accessibilityIdentifier("world2.moonLaunchCheck.start")
    }

    private var readyCard: some View {
        VStack(spacing: 12) {
            Text(model.state.config.successText)
                .font(.system(size: 24, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
            Button(action: onReadyForGuidance) {
                Text("Launch")
                    .font(.system(size: 18, weight: .bold, design: .rounded))
                    .foregroundStyle(.black)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 12)
                    .background(Capsule().fill(Color.cyan))
            }
            .accessibilityIdentifier("world2.moonLaunchCheck.launch")
        }
        .padding(20)
        .background(RoundedRectangle(cornerRadius: 18).fill(Color.black.opacity(0.5)))
        .accessibilityIdentifier("world2.moonLaunchCheck.complete")
    }

    private var retryOverlay: some View {
        VStack {
            Spacer()
            Text(model.state.config.retryOverlayText)
                .font(.system(size: 18, weight: .semibold, design: .rounded))
                .foregroundStyle(Color(red: 0.95, green: 0.45, blue: 0.42))
                .padding(.horizontal, 18)
                .padding(.vertical, 10)
                .background(
                    Capsule()
                        .fill(Color.black.opacity(0.55))
                        .overlay(Capsule().strokeBorder(Color.red.opacity(0.45), lineWidth: 1))
                )
                .accessibilityIdentifier("world2.moonLaunchCheck.retryOverlay")
            Button(action: model.dismissRetryAndReplay) {
                Text("Watch Houston again")
                    .font(.system(size: 16, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 18)
                    .padding(.vertical, 10)
                    .background(Capsule().fill(Color.white.opacity(0.2)))
            }
            .padding(.top, 10)
            .accessibilityIdentifier("world2.moonLaunchCheck.retryContinue")
            Spacer().frame(height: 40)
        }
    }
}

import SwiftUI

struct World2SettingsView: View {
    let onDismiss: () -> Void

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    Text("Settings")
                        .font(.system(size: 34, weight: .black, design: .rounded))

                    World2DeveloperSettingsSection()
                }
                .padding(24)
            }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done", action: onDismiss)
                }
            }
        }
        .accessibilityIdentifier("world2.settings")
    }
}

struct World2DeveloperSettingsSection: View {
    @ObservedObject private var developerSession = World2DeveloperSession.shared
    @State private var ageGateUnlocked = false
    @State private var showingAgeGate =
        ProcessInfo.processInfo.arguments.contains("-openWorld2AgeGate")
    @State private var showingLivingScenePOC = false

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Label("Grown-Up Controls", systemImage: "lock.shield.fill")
                .font(.system(size: 20, weight: .black, design: .rounded))

            if ageGateUnlocked {
                Toggle(
                    isOn: Binding(
                        get: { developerSession.isEnabled },
                        set: { developerSession.isEnabled = $0 }
                    )
                ) {
                    VStack(alignment: .leading, spacing: 3) {
                        Text("Scene Editor Developer Mode")
                            .font(.headline)
                        Text("Edit hardpoints and the places standing on them.")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .tint(.orange)
                .accessibilityIdentifier("world2.settings.developerMode")

                if developerSession.isEnabled {
                    Divider()

                    NavigationLink {
                        DevAssetCarvingView()
                    } label: {
                        HStack {
                            Image(systemName: "square.dashed.inset.filled")
                                .foregroundStyle(.orange)
                            VStack(alignment: .leading, spacing: 3) {
                                Text("Asset Carving Lab")
                                    .font(.headline)
                                Text("Preview and review transparent assets from a CDN image.")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            Image(systemName: "chevron.right")
                                .foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 6)
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("world2.settings.assetCarving")

                    Button {
                        showingLivingScenePOC = true
                    } label: {
                        HStack {
                            Image(systemName: "leaf.circle.fill")
                                .foregroundStyle(.mint)
                            VStack(alignment: .leading, spacing: 3) {
                                Text("Living Scene POC")
                                    .font(.headline)
                                Text("Static PNG made gently alive on-device. No video.")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            Image(systemName: "chevron.right")
                                .foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 6)
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("world2.settings.livingScenePOC")
                }

                Text(
                    "Developer edits and approved carving sets stay local until a grown-up explicitly shares an export."
                )
                .font(.caption)
                .foregroundStyle(.secondary)
            } else {
                Button {
                    showingAgeGate = true
                } label: {
                    HStack {
                        Image(systemName: "lock.fill")
                        VStack(alignment: .leading, spacing: 3) {
                            Text("Unlock Developer Settings")
                                .font(.headline)
                            Text("A grown-up check is required.")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        Image(systemName: "chevron.right")
                    }
                    .padding(14)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .background(.orange.opacity(0.10), in: RoundedRectangle(cornerRadius: 14))
                .accessibilityIdentifier("world2.settings.ageGate.open")
            }
        }
        .padding(18)
        .background(.gray.opacity(0.08), in: RoundedRectangle(cornerRadius: 18))
        .sheet(isPresented: $showingAgeGate) {
            World2AgeGateView {
                ageGateUnlocked = true
                showingAgeGate = false
            }
            .presentationDetents([.medium])
            .presentationDragIndicator(.visible)
        }
        .fullScreenCover(isPresented: $showingLivingScenePOC) {
            LivingScenePOCView(onClose: { showingLivingScenePOC = false })
        }
    }
}

private struct World2AgeGateView: View {
    let onUnlocked: () -> Void
    @Environment(\.dismiss) private var dismiss
    @Environment(\.verticalSizeClass) private var verticalSizeClass
    @State private var firstNumber = Int.random(in: 7...12)
    @State private var secondNumber = Int.random(in: 4...9)
    @State private var answer = ""
    @State private var errorMessage: String?

    var body: some View {
        VStack(spacing: verticalSizeClass == .compact ? 12 : 20) {
            Image(systemName: "person.badge.shield.checkmark.fill")
                .font(.system(size: verticalSizeClass == .compact ? 34 : 46))
                .foregroundStyle(.orange)

            Text("Grown-Up Check")
                .font(.system(size: 28, weight: .black, design: .rounded))

            Text("Please solve this without asking a child. No age or personal information is collected.")
                .font(.system(size: 15, weight: .medium, design: .rounded))
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .lineLimit(3)
                .fixedSize(horizontal: false, vertical: true)

            Text("\(firstNumber) × \(secondNumber) = ?")
                .font(.system(size: 30, weight: .black, design: .rounded))
                .accessibilityIdentifier("world2.settings.ageGate.challenge")

            TextField("Answer", text: $answer)
                .keyboardType(.numberPad)
                .textFieldStyle(.roundedBorder)
                .font(.title2.bold())
                .multilineTextAlignment(.center)
                .frame(maxWidth: 180)
                .accessibilityIdentifier("world2.settings.ageGate.answer")

            if let errorMessage {
                Text(errorMessage)
                    .font(.caption.bold())
                    .foregroundStyle(.red)
            }

            HStack(spacing: 14) {
                Button("Cancel") {
                    dismiss()
                }
                .buttonStyle(.bordered)

                Button("Unlock") {
                    checkAnswer()
                }
                .buttonStyle(.borderedProminent)
                .tint(.orange)
                .disabled(answer.isEmpty)
                .accessibilityIdentifier("world2.settings.ageGate.unlock")
            }
        }
        .padding(verticalSizeClass == .compact ? 20 : 28)
        .accessibilityIdentifier("world2.settings.ageGate")
    }

    private func checkAnswer() {
        guard Int(answer) == firstNumber * secondNumber else {
            errorMessage = "That answer did not match. Here is a new check."
            answer = ""
            firstNumber = Int.random(in: 7...12)
            secondNumber = Int.random(in: 4...9)
            return
        }
        onUnlocked()
    }
}

#Preview {
    World2SettingsView(onDismiss: {})
}

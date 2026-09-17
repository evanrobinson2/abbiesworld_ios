import SwiftUI

struct World2SettingsView: View {
    let onDismiss: () -> Void
    var onSwitchProfile: (() -> Void)? = nil
    @EnvironmentObject private var auth: AuthenticationService

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    Text("Settings")
                        .font(.system(size: 34, weight: .black, design: .rounded))

                    World2AccountSettingsSection(
                        auth: auth,
                        onDismiss: onDismiss,
                        onSwitchProfile: onSwitchProfile
                    )
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

struct World2AccountSettingsSection: View {
    @ObservedObject var auth: AuthenticationService
    let onDismiss: () -> Void
    var onSwitchProfile: (() -> Void)? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Account", systemImage: "person.crop.circle")
                .font(.system(size: 20, weight: .black, design: .rounded))
            if let email = auth.accountEmail {
                Text(email)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            if let profile = auth.activeProfile {
                Text("Playing as \(profile.displayName)\(profile.isProxy ? " (proxy)" : "")")
                    .font(.subheadline)
            }
            Button("Switch profile") {
                auth.clearActiveProfile()
                onDismiss()
                onSwitchProfile?()
            }
            .buttonStyle(.bordered)
            Button("Sign out", role: .destructive) {
                Task {
                    await auth.logout()
                    onDismiss()
                }
            }
            .buttonStyle(.borderedProminent)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct World2DeveloperSettingsSection: View {
    @ObservedObject private var developerSession = World2DeveloperSession.shared

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Label("Grown-Up Controls", systemImage: "wrench.and.screwdriver.fill")
                .font(.system(size: 20, weight: .black, design: .rounded))

            Toggle(
                isOn: Binding(
                    get: { developerSession.isEnabled },
                    set: { developerSession.isEnabled = $0 }
                )
            ) {
                VStack(alignment: .leading, spacing: 3) {
                    Text("Scene Editor Developer Mode")
                        .font(.headline)
                    Text("Edit hardpoints and the places standing on them. On by default.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .tint(.orange)
            .accessibilityIdentifier("world2.settings.developerMode")

            if developerSession.isEnabled {
                Toggle(
                    isOn: Binding(
                        get: { developerSession.layoutToolbarVisible },
                        set: { developerSession.layoutToolbarVisible = $0 }
                    )
                ) {
                    VStack(alignment: .leading, spacing: 3) {
                        Text("Layout Toolbar")
                            .font(.headline)
                        Text("Show POI / portal / hardpoint visibility and add controls on scenes.")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .tint(.orange)
                .accessibilityIdentifier("world2.settings.layoutToolbar")

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
            }

            Text(
                "Developer edits and approved carving sets stay local until a grown-up explicitly shares an export."
            )
            .font(.caption)
            .foregroundStyle(.secondary)
        }
        .padding(18)
        .background(.gray.opacity(0.08), in: RoundedRectangle(cornerRadius: 18))
    }
}

#Preview {
    World2SettingsView(onDismiss: {})
        .environmentObject(AuthenticationService.shared)
}

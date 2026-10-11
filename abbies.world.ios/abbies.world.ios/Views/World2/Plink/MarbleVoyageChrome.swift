import SwiftUI

/// Shared Marble Voyage control chrome — one look for title, chart, events, status.
enum MarbleVoyageChrome {
    static let ink = Color.white
    static let primaryFill = Color(red: 0.18, green: 0.52, blue: 0.72)
    static let accentFill = Color(red: 0.95, green: 0.48, blue: 0.28)
    static let successFill = Color(red: 0.22, green: 0.62, blue: 0.42)
    static let dangerFill = Color(red: 0.82, green: 0.28, blue: 0.32)
    static let glassStroke = Color.white.opacity(0.45)
}

struct MarbleVoyagePrimaryButton: View {
    var title: String
    var systemImage: String? = nil
    var fill: Color = MarbleVoyageChrome.primaryFill
    var accessibilityID: String
    var action: () -> Void

    var body: some View {
        Button {
            MarbleVoyageAudio.tap()
            action()
        } label: {
            HStack(spacing: 10) {
                if let systemImage {
                    Image(systemName: systemImage)
                        .font(.system(size: 18, weight: .black))
                }
                Text(title)
                    .font(.system(size: 18, weight: .black, design: .rounded))
            }
            .foregroundStyle(MarbleVoyageChrome.ink)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .padding(.horizontal, 18)
            .background(fill, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .stroke(MarbleVoyageChrome.glassStroke, lineWidth: 1.5)
            )
            .shadow(color: .black.opacity(0.28), radius: 10, y: 4)
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier(accessibilityID)
    }
}

struct MarbleVoyageSecondaryButton: View {
    var title: String
    var systemImage: String? = nil
    var accessibilityID: String
    var action: () -> Void

    var body: some View {
        Button {
            MarbleVoyageAudio.tap()
            action()
        } label: {
            HStack(spacing: 8) {
                if let systemImage {
                    Image(systemName: systemImage)
                        .font(.system(size: 15, weight: .bold))
                }
                Text(title)
                    .font(.system(size: 15, weight: .black, design: .rounded))
            }
            .foregroundStyle(MarbleVoyageChrome.ink)
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(.ultraThinMaterial.opacity(0.95), in: Capsule())
            .overlay(Capsule().stroke(MarbleVoyageChrome.glassStroke, lineWidth: 1))
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier(accessibilityID)
    }
}

struct MarbleVoyageModeCardButton: View {
    var mode: MarbleVoyageMode
    var accessibilityID: String
    var action: () -> Void

    var body: some View {
        Button {
            MarbleVoyageAudio.modeSelect()
            action()
        } label: {
            HStack(spacing: 14) {
                Image(systemName: mode.systemIcon)
                    .font(.system(size: 28, weight: .black))
                    .frame(width: 44)
                VStack(alignment: .leading, spacing: 4) {
                    Text(mode.title)
                        .font(.system(size: 22, weight: .black, design: .rounded))
                    Text(mode.blurb)
                        .font(.system(size: 14, weight: .semibold, design: .rounded))
                        .foregroundStyle(.white.opacity(0.85))
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 16, weight: .black))
                    .foregroundStyle(.white.opacity(0.7))
            }
            .foregroundStyle(.white)
            .padding(18)
            .background(.ultraThinMaterial.opacity(0.72), in: RoundedRectangle(cornerRadius: 20, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 20, style: .continuous)
                    .stroke(.white.opacity(0.5), lineWidth: 2)
            )
            .shadow(color: .black.opacity(0.28), radius: 12, y: 5)
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier(accessibilityID)
    }
}

/// Full-screen status panel — opened from the title Status button.
struct MarbleVoyageStatusPanelView: View {
    var player: MarbleVoyagePlayerStats
    var game: MarbleVoyagePlayerStats
    var playerLabel: String
    var isSignedIn: Bool
    var onSignIn: (() -> Void)?
    var onSignOut: (() -> Void)?
    var onOpenTrophies: () -> Void
    var onClose: () -> Void

    var body: some View {
        ZStack {
            Color.black.opacity(0.55).ignoresSafeArea()
                .onTapGesture { onClose() }

            VStack(spacing: 0) {
                HStack {
                    Label("Status", systemImage: "chart.bar.fill")
                        .font(.system(size: 24, weight: .black, design: .rounded))
                        .foregroundStyle(.white)
                    Spacer()
                    Text(playerLabel)
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                        .foregroundStyle(.white.opacity(0.8))
                        .lineLimit(1)
                    Button {
                        MarbleVoyageAudio.tap()
                        onClose()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 28, weight: .bold))
                            .foregroundStyle(.white.opacity(0.85))
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("world2.marbleVoyage.status.close")
                }
                .padding(.horizontal, 22)
                .padding(.top, 18)
                .padding(.bottom, 10)

                ScrollView {
                    VStack(alignment: .leading, spacing: 18) {
                        HStack(alignment: .top, spacing: 12) {
                            column(title: "This player", stats: player)
                            column(title: "Game", stats: game)
                        }

                        Text("Wins, heals, and boss clears save for this player when you’re signed in. Game totals combine everyone on this iPad.")
                            .font(.system(size: 13, weight: .semibold, design: .rounded))
                            .foregroundStyle(.white.opacity(0.75))

                        HStack(spacing: 10) {
                            MarbleVoyageSecondaryButton(
                                title: "Trophies",
                                systemImage: "trophy.fill",
                                accessibilityID: "world2.marbleVoyage.status.trophies",
                                action: onOpenTrophies
                            )
                            if isSignedIn {
                                if let onSignOut {
                                    MarbleVoyageSecondaryButton(
                                        title: "Sign out",
                                        systemImage: "rectangle.portrait.and.arrow.right",
                                        accessibilityID: "world2.marbleVoyage.status.signOut",
                                        action: onSignOut
                                    )
                                }
                            } else if let onSignIn {
                                MarbleVoyageSecondaryButton(
                                    title: "Sign in",
                                    systemImage: "person.crop.circle.badge.checkmark",
                                    accessibilityID: "world2.marbleVoyage.status.signIn",
                                    action: onSignIn
                                )
                            }
                        }
                    }
                    .padding(.horizontal, 22)
                    .padding(.bottom, 28)
                }
            }
            .frame(maxWidth: 720)
            .background(
                RoundedRectangle(cornerRadius: 28, style: .continuous)
                    .fill(.ultraThinMaterial)
                    .overlay(
                        RoundedRectangle(cornerRadius: 28, style: .continuous)
                            .stroke(.white.opacity(0.35), lineWidth: 1.5)
                    )
            )
            .padding(24)
        }
        .accessibilityIdentifier("world2.marbleVoyage.status")
    }

    private func column(title: String, stats: MarbleVoyagePlayerStats) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title.uppercased())
                .font(.system(size: 11, weight: .heavy, design: .rounded))
                .foregroundStyle(.white.opacity(0.65))
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                chip("Fights", "\(stats.fightsWon)")
                chip("Heals", "\(stats.healsFound)")
                chip("Campaigns", "\(stats.campaignClears)")
                chip("Endless", "\(stats.endlessBest)")
                chip("Mini bosses", "\(stats.miniBossesBeaten)")
                chip("Big bosses", "\(stats.bigBossesBeaten)")
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(Color.black.opacity(0.28), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    private func chip(_ label: String, _ value: String) -> some View {
        VStack(spacing: 2) {
            Text(value)
                .font(.system(size: 20, weight: .black, design: .rounded))
                .foregroundStyle(.white)
            Text(label)
                .font(.system(size: 11, weight: .bold, design: .rounded))
                .foregroundStyle(.white.opacity(0.65))
                .lineLimit(1)
                .minimumScaleFactor(0.8)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 6)
    }
}

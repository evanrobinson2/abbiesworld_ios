import SwiftUI

struct AuthLoginView: View {
    @ObservedObject var auth: AuthenticationService

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.18, green: 0.42, blue: 0.55), Color(red: 0.10, green: 0.22, blue: 0.30)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(spacing: 28) {
                Spacer()
                Text("Abbie's World")
                    .font(.system(size: 48, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)
                Text("Sign in with your Google account so this iPad can keep your family's worlds in sync.")
                    .font(.title3)
                    .multilineTextAlignment(.center)
                    .foregroundStyle(.white.opacity(0.9))
                    .padding(.horizontal, 48)

                #if targetEnvironment(simulator)
                Text("Simulator tip: finish sign-in inside the sheet on this Mac. If Google opens on your iPhone and sits on Connecting…, cancel on the phone — that page cannot hand back to the Simulator.")
                    .font(.footnote)
                    .multilineTextAlignment(.center)
                    .foregroundStyle(.yellow.opacity(0.95))
                    .padding(.horizontal, 40)
                #endif

                if let error = auth.lastError {
                    Text(error)
                        .font(.callout)
                        .foregroundStyle(Color.orange)
                        .padding(.horizontal, 40)
                }

                Button {
                    Task { await auth.login() }
                } label: {
                    HStack {
                        if auth.isBusy {
                            ProgressView()
                                .tint(.white)
                        }
                        Text(auth.isBusy ? "Opening sign-in…" : "Sign in with Google / Auth0")
                            .font(.headline)
                    }
                    .frame(maxWidth: 420)
                    .padding(.vertical, 16)
                    .background(Color.white.opacity(0.18))
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                }
                .disabled(auth.isBusy)
                .accessibilityIdentifier("auth0_sign_in")

                Spacer()
            }
            .padding()
        }
    }
}

struct HouseholdProfileSelectView: View {
    @ObservedObject var auth: AuthenticationService
    let onPlay: (PlayerId) -> Void

    private var profiles: [HouseholdProfile] {
        auth.household?.profiles ?? []
    }

    var body: some View {
        GeometryReader { screen in
            ZStack {
                World2SemanticImage(
                    semanticName: "title.background",
                    fallbackIcon: "globe.americas.fill",
                    fallbackLabel: "Abbie's World"
                )
                .scaledToFill()
                .frame(width: screen.size.width, height: screen.size.height)
                .clipped()
                .overlay(
                    LinearGradient(
                        colors: [
                            Color.indigo.opacity(0.35),
                            Color.black.opacity(0.45),
                            Color.pink.opacity(0.25)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )

                VStack(spacing: 22) {
                    Text("Who's playing?")
                        .font(.system(size: 40, weight: .black, design: .rounded))
                        .foregroundStyle(.white)
                        .shadow(color: .pink.opacity(0.55), radius: 10, y: 2)
                        .accessibilityAddTraits(.isHeader)

                    if let email = auth.accountEmail {
                        Text(email)
                            .font(.system(size: 14, weight: .semibold, design: .rounded))
                            .foregroundStyle(.white.opacity(0.72))
                    }

                    Text(
                        auth.canManageProfiles
                            ? "Pick a badge to open that treehouse."
                            : "Choose your badge to continue."
                    )
                    .font(.system(size: 17, weight: .medium, design: .rounded))
                    .multilineTextAlignment(.center)
                    .foregroundStyle(.white.opacity(0.88))
                    .padding(.horizontal, 24)

                    HStack(spacing: 28) {
                        ForEach(profiles) { profile in
                            HouseholdPlayerBadgeButton(profile: profile) {
                                Task {
                                    await auth.selectProfile(profile)
                                    onPlay(profile.playerId)
                                }
                            }
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.top, 8)

                    Button("Sign out") {
                        Task { await auth.logout() }
                    }
                    .font(.system(size: 15, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white.opacity(0.78))
                    .padding(.top, 10)
                }
                .padding(.horizontal, 36)
                .padding(.vertical, 34)
                .frame(maxWidth: min(screen.size.width - 48, 760))
                .background(
                    RoundedRectangle(cornerRadius: 36, style: .continuous)
                        .fill(.ultraThinMaterial)
                        .overlay(
                            RoundedRectangle(cornerRadius: 36, style: .continuous)
                                .stroke(
                                    LinearGradient(
                                        colors: [
                                            .white.opacity(0.65),
                                            .cyan.opacity(0.35),
                                            .pink.opacity(0.45)
                                        ],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    ),
                                    lineWidth: 2.5
                                )
                        )
                        .shadow(color: .black.opacity(0.28), radius: 24, y: 12)
                )
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
            }
            .frame(width: screen.size.width, height: screen.size.height)
        }
        .ignoresSafeArea()
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.playerSelect")
    }
}

private struct HouseholdPlayerBadgeButton: View {
    let profile: HouseholdProfile
    let action: () -> Void

    @State private var pulse = false

    var body: some View {
        Button(action: action) {
            VStack(spacing: 14) {
                ZStack {
                    Circle()
                        .fill(
                            RadialGradient(
                                colors: [
                                    style.glow.opacity(0.95),
                                    style.base.opacity(0.75),
                                    style.deep.opacity(0.9)
                                ],
                                center: .topLeading,
                                startRadius: 8,
                                endRadius: 90
                            )
                        )
                        .frame(width: 132, height: 132)
                        .overlay(
                            Circle()
                                .stroke(.white.opacity(0.85), lineWidth: 3)
                        )
                        .shadow(color: style.glow.opacity(0.55), radius: pulse ? 18 : 10, y: 6)
                        .scaleEffect(pulse ? 1.03 : 1.0)

                    if let uiImage = UIImage(named: profile.playerId.menuAvatarCatalogName) {
                        Image(uiImage: uiImage)
                            .resizable()
                            .scaledToFill()
                            .frame(width: 104, height: 104)
                            .clipShape(Circle())
                            .overlay(Circle().stroke(.white.opacity(0.35), lineWidth: 1.5))
                    } else {
                        Image(systemName: style.symbol)
                            .font(.system(size: 48, weight: .bold))
                            .foregroundStyle(.white)
                            .shadow(color: .black.opacity(0.25), radius: 2, y: 1)
                    }
                }

                VStack(spacing: 4) {
                    Text(profile.displayName)
                        .font(.system(size: 24, weight: .black, design: .rounded))
                        .foregroundStyle(.white)

                    Text(subtitle)
                        .font(.system(size: 13, weight: .bold, design: .rounded))
                        .foregroundStyle(.white.opacity(0.78))
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(Capsule().fill(.white.opacity(0.14)))
                }
            }
            .frame(minWidth: 150)
            .padding(.vertical, 8)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Play as \(profile.displayName)")
        .accessibilityIdentifier("profile_\(profile.playerId.rawValue)")
        .onAppear {
            withAnimation(.easeInOut(duration: 1.6).repeatForever(autoreverses: true)) {
                pulse = true
            }
        }
    }

    private var subtitle: String {
        if profile.isProxy { return "Proxy play" }
        switch profile.role {
        case .developer: return "Daddy"
        case .parent: return "Parent"
        case .child: return "Explorer"
        }
    }

    private var style: BadgeStyle {
        switch profile.playerId {
        case .abbie:
            return BadgeStyle(
                base: Color(red: 1.0, green: 0.45, blue: 0.72),
                deep: Color(red: 0.72, green: 0.18, blue: 0.48),
                glow: Color(red: 1.0, green: 0.72, blue: 0.88),
                symbol: "sparkles"
            )
        case .ani:
            return BadgeStyle(
                base: Color(red: 0.62, green: 0.42, blue: 0.95),
                deep: Color(red: 0.32, green: 0.16, blue: 0.62),
                glow: Color(red: 0.82, green: 0.7, blue: 1.0),
                symbol: "moon.stars.fill"
            )
        case .evan:
            return BadgeStyle(
                base: Color(red: 0.18, green: 0.72, blue: 0.78),
                deep: Color(red: 0.08, green: 0.35, blue: 0.48),
                glow: Color(red: 0.55, green: 0.92, blue: 0.95),
                symbol: "shield.lefthalf.filled"
            )
        }
    }
}

private struct BadgeStyle {
    let base: Color
    let deep: Color
    let glow: Color
    let symbol: String
}

import SwiftUI
#if canImport(UIKit)
import UIKit
#endif

/// Standard OAuth welcome — full-bleed plate + clean sign-in card.
struct AuthLoginView: View {
    @ObservedObject var auth: AuthenticationService
    /// When true, lean into Marble Voyage copy/art; World 2 uses household wording.
    var voyageStyle: Bool = false
    @State private var showSimulatorTools = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var cardAppeared = false

    var body: some View {
        GeometryReader { geo in
            ZStack {
                loginBackdrop(size: geo.size)

                // Soft vignette so the card reads cleanly over bright plates.
                LinearGradient(
                    colors: [
                        Color.black.opacity(0.15),
                        Color.black.opacity(0.45),
                        Color.black.opacity(0.62),
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .ignoresSafeArea()

                VStack(spacing: 0) {
                    Spacer(minLength: 24)

                    brandHeader
                        .padding(.bottom, 28)

                    signInCard
                        .frame(maxWidth: min(geo.size.width - 64, 440))
                        .scaleEffect(cardAppeared || reduceMotion ? 1 : 0.96)
                        .opacity(cardAppeared || reduceMotion ? 1 : 0)

                    Spacer(minLength: 24)

                    Text("Protected by Auth0 · Your family’s worlds stay private")
                        .font(.system(size: 12, weight: .semibold, design: .rounded))
                        .foregroundStyle(.white.opacity(0.55))
                        .padding(.bottom, 20)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .padding(.horizontal, 24)
            }
            .frame(width: geo.size.width, height: geo.size.height)
        }
        .ignoresSafeArea()
        .accessibilityIdentifier("auth0.login")
        .onAppear {
            guard !reduceMotion else {
                cardAppeared = true
                return
            }
            withAnimation(.spring(response: 0.55, dampingFraction: 0.86)) {
                cardAppeared = true
            }
        }
        #if targetEnvironment(simulator)
        .task {
            await auth.loginWithSimulatorSavedTokenIfNeeded()
        }
        #endif
    }

    // MARK: - Backdrop

    @ViewBuilder
    private func loginBackdrop(size: CGSize) -> some View {
        let catalog = voyageStyle ? "world2_title_marbleVoyage" : nil
        if let catalog, UIImage(named: catalog) != nil {
            Image(catalog)
                .resizable()
                .scaledToFill()
                .frame(width: size.width, height: size.height)
                .clipped()
        } else {
            World2SemanticImage(
                semanticName: voyageStyle ? MarbleVoyageArt.titleBackdrop : "title.background",
                fallbackIcon: "globe.americas.fill",
                fallbackLabel: "Abbie's World"
            )
            .scaledToFill()
            .frame(width: size.width, height: size.height)
            .clipped()
        }
    }

    // MARK: - Brand

    private var brandHeader: some View {
        VStack(spacing: 10) {
            AbbiesWorldLogoWatermark(size: 72, opacity: 0.95)
                .allowsHitTesting(false)

            Text("ABBIE’S WORLD")
                .font(.system(size: 13, weight: .black, design: .rounded))
                .tracking(3.2)
                .foregroundStyle(.white.opacity(0.88))

            Text(voyageStyle ? MarbleVoyageArt.productTitle : "Welcome back")
                .font(.system(size: voyageStyle ? 42 : 36, weight: .black, design: .rounded))
                .foregroundStyle(.white)
                .shadow(color: .black.opacity(0.45), radius: 12, y: 4)

            Text(
                voyageStyle
                    ? "Sign in to save your voyage, trophies, and family progress."
                    : "Sign in to keep your family’s worlds in sync on this iPad."
            )
            .font(.system(size: 16, weight: .semibold, design: .rounded))
            .foregroundStyle(.white.opacity(0.9))
            .multilineTextAlignment(.center)
            .frame(maxWidth: 420)
        }
    }

    // MARK: - Card

    private var signInCard: some View {
        VStack(spacing: 18) {
            Text("Sign in")
                .font(.system(size: 22, weight: .black, design: .rounded))
                .foregroundStyle(Color(red: 0.12, green: 0.18, blue: 0.24))
                .frame(maxWidth: .infinity, alignment: .leading)

            Text("Use the account your family already trusts.")
                .font(.system(size: 14, weight: .medium, design: .rounded))
                .foregroundStyle(Color(red: 0.28, green: 0.34, blue: 0.40))
                .frame(maxWidth: .infinity, alignment: .leading)

            if let error = auth.lastError {
                Text(error)
                    .font(.system(size: 13, weight: .semibold, design: .rounded))
                    .foregroundStyle(Color(red: 0.75, green: 0.22, blue: 0.18))
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(12)
                    .background(Color(red: 1, green: 0.92, blue: 0.9), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            }

            // Primary OAuth CTA — white Google-style button
            Button {
                Task { await auth.login() }
            } label: {
                HStack(spacing: 12) {
                    if auth.isBusy {
                        ProgressView()
                            .tint(Color(red: 0.25, green: 0.3, blue: 0.35))
                    } else {
                        googleGMark
                    }
                    Text(auth.isBusy ? "Opening Google…" : "Continue with Google")
                        .font(.system(size: 17, weight: .semibold, design: .rounded))
                        .foregroundStyle(Color(red: 0.18, green: 0.2, blue: 0.22))
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 15)
                .background(Color.white, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .stroke(Color.black.opacity(0.12), lineWidth: 1)
                )
                .shadow(color: .black.opacity(0.08), radius: 8, y: 3)
            }
            .buttonStyle(.plain)
            .disabled(auth.isBusy)
            .accessibilityIdentifier("auth0_sign_in")

            // Secondary Auth0 path (email / other IdPs inside the hosted page)
            Button {
                Task { await auth.login() }
            } label: {
                Text("Or continue with email")
                    .font(.system(size: 15, weight: .semibold, design: .rounded))
                    .foregroundStyle(Color(red: 0.15, green: 0.42, blue: 0.58))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
            }
            .buttonStyle(.plain)
            .disabled(auth.isBusy)
            .accessibilityIdentifier("auth0_sign_in_email")

            Text("You’ll finish in a secure browser window, then return here.")
                .font(.system(size: 12, weight: .medium, design: .rounded))
                .foregroundStyle(Color(red: 0.4, green: 0.45, blue: 0.5))
                .multilineTextAlignment(.center)

            #if targetEnvironment(simulator)
            DisclosureGroup(isExpanded: $showSimulatorTools) {
                VStack(alignment: .leading, spacing: 10) {
                    Text("Simulator tip: finish Google on this Mac — don’t scan the phone QR.")
                        .font(.system(size: 12, weight: .medium, design: .rounded))
                        .foregroundStyle(Color(red: 0.35, green: 0.4, blue: 0.45))

                    Button {
                        Task {
                            let token = UIPasteboard.general.string ?? ""
                            await auth.loginWithPastedAccessToken(token)
                        }
                    } label: {
                        Text("Paste Studio token")
                            .font(.system(size: 14, weight: .bold, design: .rounded))
                            .foregroundStyle(Color(red: 0.1, green: 0.45, blue: 0.55))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 11)
                            .background(Color(red: 0.88, green: 0.96, blue: 0.98), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                    }
                    .buttonStyle(.plain)
                    .disabled(auth.isBusy)
                    .accessibilityIdentifier("auth0_paste_studio_token")
                }
                .padding(.top, 8)
            } label: {
                Text("Simulator tools")
                    .font(.system(size: 13, weight: .semibold, design: .rounded))
                    .foregroundStyle(Color(red: 0.4, green: 0.45, blue: 0.5))
            }
            .tint(Color(red: 0.3, green: 0.45, blue: 0.55))
            #endif
        }
        .padding(24)
        .background(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .fill(Color.white.opacity(0.96))
                .shadow(color: .black.opacity(0.28), radius: 28, y: 14)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .stroke(Color.white.opacity(0.7), lineWidth: 1)
        )
    }

    /// Simple multicolor “G” mark without bundling Google assets.
    private var googleGMark: some View {
        ZStack {
            Circle()
                .strokeBorder(
                    AngularGradient(
                        colors: [
                            Color(red: 0.26, green: 0.52, blue: 0.96),
                            Color(red: 0.22, green: 0.73, blue: 0.39),
                            Color(red: 0.98, green: 0.74, blue: 0.02),
                            Color(red: 0.92, green: 0.26, blue: 0.21),
                            Color(red: 0.26, green: 0.52, blue: 0.96),
                        ],
                        center: .center
                    ),
                    lineWidth: 2.5
                )
                .frame(width: 22, height: 22)
            Text("G")
                .font(.system(size: 14, weight: .bold, design: .rounded))
                .foregroundStyle(Color(red: 0.26, green: 0.52, blue: 0.96))
        }
        .accessibilityHidden(true)
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

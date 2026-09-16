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

    var body: some View {
        ZStack {
            Color(red: 0.11, green: 0.18, blue: 0.24).ignoresSafeArea()
            VStack(spacing: 24) {
                Text("Who is playing?")
                    .font(.system(size: 36, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)
                if let email = auth.accountEmail {
                    Text(email)
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.7))
                }
                Text(auth.canManageProfiles
                     ? "Parent/developer mode: you can open Abbie or Ani as a proxy, or play as yourself."
                     : "Choose your profile to continue.")
                    .font(.body)
                    .multilineTextAlignment(.center)
                    .foregroundStyle(.white.opacity(0.85))
                    .padding(.horizontal, 40)

                LazyVGrid(columns: [GridItem(.adaptive(minimum: 180), spacing: 16)], spacing: 16) {
                    ForEach(auth.household?.profiles ?? []) { profile in
                        Button {
                            Task {
                                await auth.selectProfile(profile)
                                onPlay(profile.playerId)
                            }
                        } label: {
                            VStack(spacing: 10) {
                                Text(profile.displayName)
                                    .font(.title2.bold())
                                Text(profile.isProxy ? "Proxy" : profile.role.rawValue.capitalized)
                                    .font(.caption)
                                    .opacity(0.8)
                            }
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity, minHeight: 120)
                            .background(color(for: profile).opacity(0.85))
                            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                        }
                        .accessibilityIdentifier("profile_\(profile.playerId.rawValue)")
                    }
                }
                .padding(.horizontal, 40)

                Button("Sign out") {
                    Task { await auth.logout() }
                }
                .foregroundStyle(.white.opacity(0.8))
                .padding(.top, 12)
            }
            .padding()
        }
    }

    private func color(for profile: HouseholdProfile) -> Color {
        switch profile.playerId {
        case .abbie: return .pink
        case .ani: return .purple
        case .evan: return .teal
        }
    }
}

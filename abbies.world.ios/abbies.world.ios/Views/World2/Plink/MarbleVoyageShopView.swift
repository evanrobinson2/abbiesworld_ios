import SwiftUI
#if canImport(UIKit)
import UIKit
#endif

/// Post-fight shop: spend gold-peg coins on a heal, a marble level, or a permanent charm.
struct MarbleVoyageShopView: View {
    @Binding var run: MarbleVoyageRun
    var onLeave: () -> Void

    @State private var toast: String?
    @State private var shake = false

    private var shop: MarbleVoyageShopState? { run.shop }

    /// Which marble the next “Ball upgrade” would raise.
    private var upgradeTarget: MarbleVoyageOwnedMarble? {
        guard let index = MarbleVoyageMarbleRules.upgradeTarget(in: run.marbleCollection) else {
            return nil
        }
        return run.marbleCollection[index]
    }

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [
                    Color(red: 0.08, green: 0.16, blue: 0.28),
                    Color(red: 0.13, green: 0.26, blue: 0.40),
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            ScrollView {
                VStack(spacing: 18) {
                    header
                    healRow
                    ballRow
                    charmRow
                    leaveButton
                }
                .padding(.horizontal, 24)
                .padding(.vertical, 26)
                .frame(maxWidth: 720)
                .frame(maxWidth: .infinity)
            }

            if let toast {
                Text(toast)
                    .font(.system(size: 16, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 18)
                    .padding(.vertical, 12)
                    .background(Color.black.opacity(0.75), in: Capsule())
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
                    .padding(.top, 18)
                    .allowsHitTesting(false)
                    .transition(.move(edge: .top).combined(with: .opacity))
            }
        }
        .accessibilityIdentifier("world2.marbleVoyage.shop")
    }

    // MARK: - Chrome

    private var header: some View {
        VStack(spacing: 8) {
            Text("Bell Market")
                .font(.system(size: 34, weight: .black, design: .rounded))
                .foregroundStyle(.white)
            Text("Spend coins before the next climb — no free heals out there.")
                .font(.system(size: 14, weight: .semibold, design: .rounded))
                .foregroundStyle(.white.opacity(0.85))
                .multilineTextAlignment(.center)

            HStack(spacing: 14) {
                Label("\(run.coins)", systemImage: "circle.hexagongrid.fill")
                    .font(.system(size: 22, weight: .black, design: .rounded))
                    .foregroundStyle(Color(red: 1.0, green: 0.84, blue: 0.3))
                    .accessibilityIdentifier("world2.marbleVoyage.shop.coins")
                Label("\(run.playerHP)/\(run.playerMaxHP)", systemImage: "heart.fill")
                    .font(.system(size: 22, weight: .black, design: .rounded))
                    .foregroundStyle(Color(red: 1, green: 0.45, blue: 0.55))
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 10)
            .background(.ultraThinMaterial.opacity(0.95), in: Capsule())
            .offset(x: shake ? -6 : 0)
        }
    }

    private var healRow: some View {
        shelf(
            title: "Bell Balm",
            detail: "Restore \(run.shopHealAmount()) HP (\(Int(run.economy.healFraction * 100))% + Bloom)",
            price: shop?.healPrice ?? run.economy.healPrice,
            systemImage: "cross.vial.fill",
            disabled: run.playerHP >= run.playerMaxHP,
            accessibilityID: "world2.marbleVoyage.shop.heal"
        ) {
            apply(.heal)
        }
    }

    private var ballRow: some View {
        shelf(
            title: "Ball Upgrade",
            detail: upgradeTarget.map { marble in
                "\(marble.orb.name) Lv\(marble.clampedLevel) → Lv\(marble.clampedLevel + 1) · every marble maxes at Lv\(MarbleVoyageOwnedMarble.maxLevel)"
            } ?? "Every marble is already Lv\(MarbleVoyageOwnedMarble.maxLevel)",
            price: shop?.ballUpgradePrice ?? run.economy.ballUpgradePrice,
            systemImage: "circle.circle.fill",
            disabled: upgradeTarget == nil,
            accessibilityID: "world2.marbleVoyage.shop.ballUpgrade"
        ) {
            apply(.ballUpgrade)
        }
    }

    @ViewBuilder
    private var charmRow: some View {
        let offers = shop?.charmOffers ?? []
        if offers.isEmpty {
            Text("Charm shelf is bare this visit.")
                .font(.system(size: 14, weight: .semibold, design: .rounded))
                .foregroundStyle(.white.opacity(0.7))
        } else {
            HStack(spacing: 14) {
                ForEach(offers) { charm in
                    charmCard(charm, price: shop?.charmPrices[charm] ?? charm.basePrice)
                }
            }
        }
    }

    private func charmCard(_ charm: MarbleVoyageCharm, price: Int) -> some View {
        let affordable = run.coins >= price
        return Button {
            apply(.buyCharm(charm))
        } label: {
            VStack(spacing: 10) {
                charmArt(charm)
                Text(charm.title)
                    .font(.system(size: 17, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                Text(charm.blurb)
                    .font(.system(size: 12, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white.opacity(0.82))
                    .multilineTextAlignment(.center)
                    .lineLimit(3)
                if run.charmStack(charm) > 0 {
                    Text("Owned ×\(run.charmStack(charm))")
                        .font(.system(size: 11, weight: .bold, design: .rounded))
                        .foregroundStyle(Color(red: 0.55, green: 1.0, blue: 0.7))
                }
                priceTag(price, affordable: affordable)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .padding(.horizontal, 12)
            .background(.ultraThinMaterial.opacity(0.9), in: RoundedRectangle(cornerRadius: 20, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 20, style: .continuous)
                    .stroke(.white.opacity(affordable ? 0.6 : 0.2), lineWidth: 1.5)
            )
            .opacity(affordable ? 1 : 0.55)
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("world2.marbleVoyage.shop.charm.\(charm.rawValue)")
    }

    @ViewBuilder
    private func charmArt(_ charm: MarbleVoyageCharm) -> some View {
        if let image = UIImage(named: charm.catalogImageName) {
            Image(uiImage: image)
                .resizable()
                .scaledToFit()
                .frame(width: 72, height: 72)
        } else {
            Image(systemName: "sparkles")
                .font(.system(size: 40, weight: .black))
                .foregroundStyle(.white)
                .frame(width: 72, height: 72)
        }
    }

    private var leaveButton: some View {
        Button {
            _ = run.applyShop(.leave)
            onLeave()
        } label: {
            Text("Back to the climb")
                .font(.system(size: 20, weight: .black, design: .rounded))
                .foregroundStyle(.white)
                .frame(maxWidth: 320)
                .padding(.vertical, 15)
                .background(MarbleVoyageChrome.primaryFill, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .stroke(MarbleVoyageChrome.glassStroke, lineWidth: 1.5)
                )
        }
        .buttonStyle(.plain)
        .padding(.top, 6)
        .accessibilityIdentifier("world2.marbleVoyage.shop.leave")
    }

    private func shelf(
        title: String,
        detail: String,
        price: Int,
        systemImage: String,
        disabled: Bool,
        accessibilityID: String,
        action: @escaping () -> Void
    ) -> some View {
        let affordable = run.coins >= price && !disabled
        return Button(action: action) {
            HStack(spacing: 14) {
                Image(systemName: systemImage)
                    .font(.system(size: 30, weight: .black))
                    .foregroundStyle(.white)
                    .frame(width: 52)
                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.system(size: 19, weight: .black, design: .rounded))
                        .foregroundStyle(.white)
                    Text(detail)
                        .font(.system(size: 13, weight: .semibold, design: .rounded))
                        .foregroundStyle(.white.opacity(0.82))
                        .multilineTextAlignment(.leading)
                }
                Spacer(minLength: 8)
                priceTag(price, affordable: affordable)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .frame(maxWidth: .infinity)
            .background(.ultraThinMaterial.opacity(0.9), in: RoundedRectangle(cornerRadius: 20, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 20, style: .continuous)
                    .stroke(.white.opacity(affordable ? 0.6 : 0.2), lineWidth: 1.5)
            )
            .opacity(affordable ? 1 : 0.55)
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier(accessibilityID)
    }

    private func priceTag(_ price: Int, affordable: Bool) -> some View {
        Label("\(price)", systemImage: "circle.hexagongrid.fill")
            .font(.system(size: 16, weight: .black, design: .rounded))
            .foregroundStyle(affordable
                             ? Color(red: 1.0, green: 0.84, blue: 0.3)
                             : Color.white.opacity(0.55))
            .padding(.horizontal, 12)
            .padding(.vertical, 7)
            .background(Color.black.opacity(0.35), in: Capsule())
    }

    // MARK: - Actions

    private func apply(_ action: MarbleVoyageShopAction) {
        let result = run.applyShop(action)
        switch result {
        case .ok(let message):
            MarbleVoyageAudio.heal()
            show(message)
        case .cannotAfford:
            MarbleVoyageAudio.sting()
            show("Not enough coins yet.")
            bumpWallet()
        case .alreadyMaxed:
            MarbleVoyageAudio.tap()
            show("Already at the top.")
        case .left:
            onLeave()
        }
    }

    private func bumpWallet() {
        withAnimation(.spring(response: 0.18, dampingFraction: 0.3)) { shake = true }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.22) {
            withAnimation(.spring(response: 0.2, dampingFraction: 0.6)) { shake = false }
        }
    }

    private func show(_ message: String) {
        withAnimation(.spring(response: 0.35, dampingFraction: 0.85)) { toast = message }
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.8) {
            withAnimation(.easeOut(duration: 0.3)) {
                if toast == message { toast = nil }
            }
        }
    }
}

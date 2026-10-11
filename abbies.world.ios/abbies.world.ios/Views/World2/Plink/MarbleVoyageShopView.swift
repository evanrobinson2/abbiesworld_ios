import SwiftUI
#if canImport(UIKit)
import UIKit
#endif

/// Post-fight shop: heal, buy/upgrade/destroy bag marbles, or stack a permanent charm.
/// Packed for one landscape iPad screen — bag lives in a bottom drawer.
struct MarbleVoyageShopView: View {
    @Binding var run: MarbleVoyageRun
    var onLeave: () -> Void

    @State private var toast: String?
    @State private var shake = false
    @State private var showBagDrawer = false

    private var shop: MarbleVoyageShopState? { run.shop }

    /// Which marble the next “Ball upgrade” would raise.
    private var upgradeTarget: MarbleVoyageOwnedMarble? {
        guard let index = MarbleVoyageMarbleRules.upgradeTarget(in: run.marbleCollection) else {
            return nil
        }
        return run.marbleCollection[index]
    }

    private var canDestroy: Bool {
        run.marbleCollection.count > MarbleVoyageMarbleRules.minBagCount
    }

    private var bagFull: Bool {
        run.marbleCollection.count >= MarbleVoyageMarbleRules.maxBagCount
    }

    var body: some View {
        ZStack {
            MarbleVoyageUnclippedPlate(
                catalogName: MarbleVoyageArt.bellMarketInteriorCatalogName,
                semanticName: MarbleVoyageArt.bellMarketInteriorSemanticID,
                fallbackIcon: "storefront.fill",
                fallbackLabel: "Bell Market",
                letterbox: Color(red: 0.06, green: 0.12, blue: 0.22)
            )
            .ignoresSafeArea()

            LinearGradient(
                colors: [
                    Color.black.opacity(0.42),
                    Color.black.opacity(0.22),
                    Color.black.opacity(0.48),
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()
            .allowsHitTesting(false)

            VStack(spacing: 10) {
                topBar
                marketGrid
                    .frame(maxHeight: .infinity)
                if !showBagDrawer {
                    bagDockTab
                }
            }
            .padding(.horizontal, 18)
            .padding(.top, 14)
            .padding(.bottom, showBagDrawer ? 0 : 12)
            .frame(maxWidth: 980)
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            if showBagDrawer {
                Color.black.opacity(0.35)
                    .ignoresSafeArea()
                    .onTapGesture {
                        withAnimation(.spring(response: 0.34, dampingFraction: 0.86)) {
                            showBagDrawer = false
                        }
                    }
                    .transition(.opacity)

                bagDrawer
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                    .zIndex(20)
            }

            if let toast {
                Text(toast)
                    .font(.system(size: 15, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(Color.black.opacity(0.75), in: Capsule())
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
                    .padding(.top, 10)
                    .allowsHitTesting(false)
                    .transition(.move(edge: .top).combined(with: .opacity))
                    .zIndex(30)
            }
        }
        .accessibilityIdentifier("world2.marbleVoyage.shop")
    }

    // MARK: - Top bar

    private var topBar: some View {
        HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text("Bell Market")
                    .font(.system(size: 24, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                Text("Spend before the next climb")
                    .font(.system(size: 12, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white.opacity(0.72))
            }

            Spacer(minLength: 8)

            HStack(spacing: 10) {
                Label("\(run.coins)", systemImage: "circle.hexagongrid.fill")
                    .font(.system(size: 17, weight: .black, design: .rounded))
                    .foregroundStyle(Color(red: 1.0, green: 0.84, blue: 0.3))
                    .accessibilityIdentifier("world2.marbleVoyage.shop.coins")
                Label("\(run.playerHP)/\(run.playerMaxHP)", systemImage: "heart.fill")
                    .font(.system(size: 17, weight: .black, design: .rounded))
                    .foregroundStyle(Color(red: 1, green: 0.45, blue: 0.55))
                bagToggleChip
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(.ultraThinMaterial.opacity(0.95), in: Capsule())
            .offset(x: shake ? -6 : 0)

            leaveButton
        }
    }

    private var bagToggleChip: some View {
        Button {
            withAnimation(.spring(response: 0.34, dampingFraction: 0.86)) {
                showBagDrawer.toggle()
            }
        } label: {
            HStack(spacing: 4) {
                Image(systemName: "circle.grid.3x3.fill")
                Text("\(run.marbleCollection.count)/\(MarbleVoyageMarbleRules.maxBagCount)")
                Image(systemName: showBagDrawer ? "chevron.down" : "chevron.up")
                    .font(.system(size: 11, weight: .black))
            }
            .font(.system(size: 15, weight: .black, design: .rounded))
            .foregroundStyle(bagFull
                             ? Color(red: 1.0, green: 0.7, blue: 0.35)
                             : Color(red: 0.65, green: 0.9, blue: 1.0))
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("world2.marbleVoyage.shop.bagToggle")
        .accessibilityLabel("Bag \(run.marbleCollection.count) of \(MarbleVoyageMarbleRules.maxBagCount)")
        .accessibilityHint(showBagDrawer ? "Close bag" : "Open bag to scrap marbles")
    }

    // MARK: - Market grid (one screen)

    private var marketGrid: some View {
        VStack(spacing: 10) {
            HStack(alignment: .top, spacing: 10) {
                shelf(
                    title: "Bell Balm",
                    detail: "+\(run.shopHealAmount()) HP",
                    price: shop?.healPrice ?? run.economy.healPrice,
                    systemImage: "cross.vial.fill",
                    disabled: run.playerHP >= run.playerMaxHP,
                    accessibilityID: "world2.marbleVoyage.shop.heal"
                ) {
                    apply(.heal)
                }

                shelf(
                    title: "Upgrade",
                    detail: upgradeTarget.map { "\($0.orb.name) → Lv\($0.clampedLevel + 1)" }
                        ?? "All max Lv\(MarbleVoyageOwnedMarble.maxLevel)",
                    price: shop?.ballUpgradePrice ?? run.economy.ballUpgradePrice,
                    systemImage: "circle.circle.fill",
                    disabled: upgradeTarget == nil,
                    accessibilityID: "world2.marbleVoyage.shop.ballUpgrade"
                ) {
                    apply(.ballUpgrade)
                }
            }
            .frame(maxHeight: 88)

            HStack(alignment: .top, spacing: 10) {
                buyMarbleBlock
                charmBlock
            }
            .frame(maxHeight: .infinity)
        }
    }

    @ViewBuilder
    private var buyMarbleBlock: some View {
        let offers = shop?.marbleOffers ?? []
        panel(title: bagFull ? "Marbles · bag full" : "Marbles") {
            if offers.isEmpty {
                Text(bagFull ? "Open bag to scrap, then buy." : "Shelf bare this visit.")
                    .font(.system(size: 13, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white.opacity(0.7))
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                HStack(spacing: 8) {
                    ForEach(offers, id: \.self) { orbID in
                        buyMarbleCard(orbID: orbID, price: shop?.buyMarblePrice ?? run.economy.buyMarblePrice)
                    }
                }
            }
        }
    }

    @ViewBuilder
    private var charmBlock: some View {
        let offers = shop?.charmOffers ?? []
        panel(title: "Charms") {
            if offers.isEmpty {
                Text("Shelf bare this visit.")
                    .font(.system(size: 13, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white.opacity(0.7))
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                HStack(spacing: 8) {
                    ForEach(offers) { charm in
                        charmCard(charm, price: shop?.charmPrices[charm] ?? charm.basePrice)
                    }
                }
            }
        }
    }

    private func panel<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.system(size: 13, weight: .black, design: .rounded))
                .tracking(0.6)
                .foregroundStyle(.white.opacity(0.78))
            content()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .padding(10)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(.ultraThinMaterial.opacity(0.88), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(.white.opacity(0.22), lineWidth: 1.2)
        )
    }

    // MARK: - Bag drawer

    private var bagDockTab: some View {
        Button {
            withAnimation(.spring(response: 0.34, dampingFraction: 0.86)) {
                showBagDrawer = true
            }
        } label: {
            HStack(spacing: 8) {
                Image(systemName: "chevron.up")
                    .font(.system(size: 12, weight: .black))
                Text("Bag · tap a marble to scrap")
                    .font(.system(size: 14, weight: .bold, design: .rounded))
                Spacer(minLength: 0)
                Text("\(run.marbleCollection.count)/\(MarbleVoyageMarbleRules.maxBagCount)")
                    .font(.system(size: 13, weight: .black, design: .rounded))
                    .foregroundStyle(Color(red: 0.65, green: 0.9, blue: 1.0))
            }
            .foregroundStyle(.white.opacity(0.9))
            .padding(.horizontal, 16)
            .padding(.vertical, 11)
            .background(.ultraThinMaterial.opacity(0.92), in: Capsule())
            .overlay(Capsule().stroke(.white.opacity(0.28), lineWidth: 1.2))
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("world2.marbleVoyage.shop.bagDock")
        .accessibilityLabel("Open bag drawer")
    }

    private var bagDrawer: some View {
        VStack(spacing: 0) {
            Spacer(minLength: 0)

            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text("Your bag")
                        .font(.system(size: 18, weight: .black, design: .rounded))
                        .foregroundStyle(.white)
                    Spacer()
                    Text(
                        canDestroy
                            ? "Tap to scrap (+\(shop?.destroyRefund ?? run.economy.destroyRefund))"
                            : "Keep ≥\(MarbleVoyageMarbleRules.minBagCount)"
                    )
                    .font(.system(size: 12, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white.opacity(0.7))
                    Button {
                        withAnimation(.spring(response: 0.34, dampingFraction: 0.86)) {
                            showBagDrawer = false
                        }
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 22, weight: .bold))
                            .foregroundStyle(.white.opacity(0.75))
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Close bag")
                }

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 10) {
                        ForEach(run.marbleCollection) { marble in
                            bagMarbleChip(marble)
                        }
                    }
                }
            }
            .padding(.horizontal, 18)
            .padding(.top, 14)
            .padding(.bottom, 22)
            .frame(maxWidth: .infinity)
            .background(
                RoundedRectangle(cornerRadius: 24, style: .continuous)
                    .fill(.ultraThinMaterial.opacity(0.97))
                    .overlay(
                        RoundedRectangle(cornerRadius: 24, style: .continuous)
                            .stroke(.white.opacity(0.28), lineWidth: 1.5)
                    )
                    .ignoresSafeArea(edges: .bottom)
            )
            .accessibilityIdentifier("world2.marbleVoyage.shop.bag")
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
    }

    private func bagMarbleChip(_ marble: MarbleVoyageOwnedMarble) -> some View {
        Button {
            apply(.destroyMarble(instanceID: marble.instanceID))
        } label: {
            VStack(spacing: 5) {
                orbThumb(marble.orb)
                    .frame(width: 48, height: 48)
                Text(marble.orb.name)
                    .font(.system(size: 11, weight: .heavy, design: .rounded))
                    .foregroundStyle(.white)
                    .lineLimit(1)
                Text("Lv\(marble.clampedLevel)")
                    .font(.system(size: 11, weight: .bold, design: .rounded))
                    .foregroundStyle(Color(red: 1.0, green: 0.84, blue: 0.3))
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 8)
            .background(Color.black.opacity(0.35), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(.white.opacity(canDestroy ? 0.45 : 0.15), lineWidth: 1)
            )
            .opacity(canDestroy ? 1 : 0.55)
        }
        .buttonStyle(.plain)
        .disabled(!canDestroy)
        .accessibilityIdentifier("world2.marbleVoyage.shop.bag.\(marble.instanceID)")
        .accessibilityLabel("\(marble.orb.name) level \(marble.clampedLevel)")
        .accessibilityHint(canDestroy ? "Scrap for coins" : "Bag is at the minimum")
    }

    // MARK: - Offer cards

    private func buyMarbleCard(orbID: String, price: Int) -> some View {
        let orb = OrbKind.all.first(where: { $0.id == orbID }) ?? .sparkle
        let affordable = run.coins >= price && !bagFull
        return Button {
            if bagFull {
                withAnimation(.spring(response: 0.34, dampingFraction: 0.86)) {
                    showBagDrawer = true
                }
                show("Bag full — scrap one first.")
                return
            }
            apply(.buyMarble(orbID: orbID))
        } label: {
            VStack(spacing: 6) {
                orbThumb(orb)
                    .frame(width: 52, height: 52)
                Text(orb.name)
                    .font(.system(size: 15, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                    .lineLimit(1)
                    .minimumScaleFactor(0.75)
                Text(orb.blurb)
                    .font(.system(size: 11, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white.opacity(0.78))
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
                    .minimumScaleFactor(0.85)
                Spacer(minLength: 0)
                priceTag(price, affordable: affordable)
            }
            .padding(10)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color.black.opacity(0.28), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(.white.opacity(affordable ? 0.55 : 0.18), lineWidth: 1.2)
            )
            .opacity(bagFull ? 0.7 : (affordable ? 1 : 0.55))
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("world2.marbleVoyage.shop.buyMarble.\(orbID)")
    }

    private func charmCard(_ charm: MarbleVoyageCharm, price: Int) -> some View {
        let affordable = run.coins >= price
        return Button {
            apply(.buyCharm(charm))
        } label: {
            VStack(spacing: 6) {
                charmArt(charm)
                Text(charm.title)
                    .font(.system(size: 15, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                    .lineLimit(1)
                    .minimumScaleFactor(0.75)
                Text(charm.blurb)
                    .font(.system(size: 11, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white.opacity(0.78))
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
                    .minimumScaleFactor(0.85)
                if run.charmStack(charm) > 0 {
                    Text("×\(run.charmStack(charm))")
                        .font(.system(size: 11, weight: .bold, design: .rounded))
                        .foregroundStyle(Color(red: 0.55, green: 1.0, blue: 0.7))
                }
                Spacer(minLength: 0)
                priceTag(price, affordable: affordable)
            }
            .padding(10)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color.black.opacity(0.28), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(.white.opacity(affordable ? 0.55 : 0.18), lineWidth: 1.2)
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
                .frame(width: 48, height: 48)
        } else {
            Image(systemName: "sparkles")
                .font(.system(size: 28, weight: .black))
                .foregroundStyle(.white)
                .frame(width: 48, height: 48)
        }
    }

    @ViewBuilder
    private func orbThumb(_ orb: OrbKind) -> some View {
        if let image = UIImage(named: orb.catalogImageName) {
            Image(uiImage: image)
                .resizable()
                .scaledToFit()
        } else {
            Circle()
                .fill(Color.white.opacity(0.25))
                .overlay(
                    Text(String(orb.name.prefix(1)))
                        .font(.system(size: 16, weight: .black, design: .rounded))
                        .foregroundStyle(.white)
                )
        }
    }

    private var leaveButton: some View {
        Button {
            _ = run.applyShop(.leave)
            onLeave()
        } label: {
            Text("Climb")
                .font(.system(size: 16, weight: .black, design: .rounded))
                .foregroundStyle(.white)
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(MarbleVoyageChrome.primaryFill, in: Capsule())
                .overlay(Capsule().stroke(MarbleVoyageChrome.glassStroke, lineWidth: 1.2))
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("world2.marbleVoyage.shop.leave")
        .accessibilityLabel("Back to the climb")
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
            HStack(spacing: 12) {
                Image(systemName: systemImage)
                    .font(.system(size: 24, weight: .black))
                    .foregroundStyle(.white)
                    .frame(width: 36)
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.system(size: 16, weight: .black, design: .rounded))
                        .foregroundStyle(.white)
                        .lineLimit(1)
                    Text(detail)
                        .font(.system(size: 12, weight: .semibold, design: .rounded))
                        .foregroundStyle(.white.opacity(0.8))
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)
                }
                Spacer(minLength: 6)
                priceTag(price, affordable: affordable)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 12)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(.ultraThinMaterial.opacity(0.9), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(.white.opacity(affordable ? 0.55 : 0.18), lineWidth: 1.2)
            )
            .opacity(affordable ? 1 : 0.55)
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier(accessibilityID)
    }

    private func priceTag(_ price: Int, affordable: Bool) -> some View {
        Label("\(price)", systemImage: "circle.hexagongrid.fill")
            .font(.system(size: 14, weight: .black, design: .rounded))
            .foregroundStyle(affordable
                             ? Color(red: 1.0, green: 0.84, blue: 0.3)
                             : Color.white.opacity(0.55))
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(Color.black.opacity(0.35), in: Capsule())
    }

    // MARK: - Actions

    private func apply(_ action: MarbleVoyageShopAction) {
        let result = run.applyShop(action)
        switch result {
        case .ok(let message):
            MarbleVoyageAudio.heal()
            #if canImport(UIKit)
            if PlayerStateService.shared.currentPlayer?.settings.hapticFeedbackEnabled ?? true {
                UINotificationFeedbackGenerator().notificationOccurred(.success)
            }
            #endif
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

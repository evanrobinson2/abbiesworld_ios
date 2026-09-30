import SwiftUI
import UIKit

/// Top-right player profile. The avatar chip opens a drawer with Place
/// Inventory, Quests, and room for more sections later.
struct World2PlayerMenuDrawer: View {
    @ObservedObject var viewModel: World2ViewModel
    @ObservedObject private var playerService = PlayerStateService.shared
    @ObservedObject private var worldSync = World2WorldSync.shared
    @State private var isOpen = false

    var onOpenSettings: (() -> Void)? = nil
    var onOpenMusic: (() -> Void)? = nil
    var onSwitchProfile: (() -> Void)? = nil
    var onOpenMinimap: (() -> Void)? = nil

    @EnvironmentObject private var auth: AuthenticationService
    @State private var focusedTool: PlayerMenuTool = .inventory

    private var player: PlayerState? { playerService.currentPlayer }
    private var playerId: PlayerId? { player?.playerId }

    private var jukeboxPlaced: Bool {
        player?.hasPlacedJukebox ?? false
    }

    private var pendingQuestCount: Int {
        jukeboxPlaced ? 0 : 1
    }

    private var inventoryBadgeCount: Int {
        viewModel.placeInventory.count
    }

    var body: some View {
        Group {
            if isOpen {
                ZStack(alignment: .trailing) {
                    Color.black.opacity(0.28)
                        .ignoresSafeArea()
                        .onTapGesture { close() }
                        .accessibilityIdentifier("world2.playerMenu.scrim")

                    drawer
                        .frame(width: 320)
                        .frame(maxHeight: .infinity)
                        .padding(.vertical, 18)
                        .padding(.trailing, 12)
                        .transition(.move(edge: .trailing))
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .trailing)
            } else {
                avatarButton
                    .padding(.trailing, 8)
            }
        }
        .animation(.spring(response: 0.32, dampingFraction: 0.84), value: isOpen)
        .accessibilityElement(children: .contain)
    }

    // MARK: - Avatar chip

    private var avatarButton: some View {
        Button {
            focusedTool = .inventory
            isOpen = true
        } label: {
            ZStack(alignment: .topTrailing) {
                avatarImage
                    .frame(width: 58, height: 58)
                    .clipShape(Circle())
                    .overlay(Circle().stroke(.white.opacity(0.85), lineWidth: 2.5))
                    .shadow(color: .black.opacity(0.28), radius: 8, y: 4)
                    .overlay {
                        if viewModel.flyingGiftDecoration != nil {
                            Circle()
                                .stroke(Color.pink.opacity(0.9), lineWidth: 3)
                                .scaleEffect(1.18)
                        }
                    }

                if inventoryBadgeCount > 0 || pendingQuestCount > 0 || viewModel.flyingGiftDecoration != nil
                    || (!World2WorldSync.shared.noticesSuppressed && !World2WorldSync.shared.unseenIDs.isEmpty) {
                    Text("\(max(1, inventoryBadgeCount + pendingQuestCount))")
                        .font(.system(size: 11, weight: .black, design: .rounded))
                        .foregroundStyle(.white)
                        .frame(minWidth: 20, minHeight: 20)
                        .padding(.horizontal, 3)
                        .background(.orange, in: Capsule())
                        .overlay(Capsule().stroke(.white, lineWidth: 1.5))
                        .offset(x: 4, y: -4)
                }
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel(playerMenuAccessibilityLabel)
        .accessibilityIdentifier("world2.playerMenu.open")
    }

    private var playerMenuAccessibilityLabel: String {
        let name = playerId?.displayName ?? "Player"
        var parts = ["\(name) menu"]
        if inventoryBadgeCount > 0 {
            parts.append("\(inventoryBadgeCount) in inventory")
        }
        if pendingQuestCount > 0 {
            parts.append("\(pendingQuestCount) quest waiting")
        }
        return parts.joined(separator: ", ")
    }

    @ViewBuilder
    private var avatarImage: some View {
        if let playerId,
           let uiImage = UIImage(named: playerId.menuAvatarCatalogName) {
            Image(uiImage: uiImage)
                .resizable()
                .scaledToFill()
        } else {
            Image(systemName: "person.crop.circle.fill")
                .resizable()
                .scaledToFit()
                .foregroundStyle(.white)
                .padding(8)
                .background(.indigo.gradient)
        }
    }

    // MARK: - Drawer

    private var drawer: some View {
        VStack(alignment: .leading, spacing: 12) {
            header
            hotList
            ScrollViewReader { proxy in
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        inventorySection
                            .id(PlayerMenuTool.inventory)
                        questsSection
                            .id(PlayerMenuTool.quests)
                        mapSeenSection
                            .id(PlayerMenuTool.map)
                        controlsSection
                            .id(PlayerMenuTool.controls)
                        accountSection
                            .id(PlayerMenuTool.account)
                    }
                    .padding(.bottom, 24)
                }
                .scrollIndicators(.visible)
                .onChange(of: focusedTool) { _, tool in
                    withAnimation(.easeInOut(duration: 0.22)) {
                        proxy.scrollTo(tool, anchor: .top)
                    }
                }
            }
        }
        .padding(16)
        .frame(maxHeight: .infinity, alignment: .top)
        .background(.ultraThickMaterial, in: RoundedRectangle(cornerRadius: 26))
        .overlay {
            RoundedRectangle(cornerRadius: 26)
                .stroke(.white.opacity(0.55), lineWidth: 2)
        }
        .shadow(color: .black.opacity(0.28), radius: 16, x: -6)
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.playerMenu.drawer")
    }

    private var hotList: some View {
        HStack(spacing: 6) {
            ForEach(PlayerMenuTool.allCases) { tool in
                Button {
                    focusedTool = tool
                } label: {
                    VStack(spacing: 3) {
                        Image(systemName: tool.symbol)
                            .font(.system(size: 14, weight: .black))
                        Text(tool.title)
                            .font(.system(size: 9, weight: .black, design: .rounded))
                            .lineLimit(1)
                            .minimumScaleFactor(0.8)
                    }
                    .foregroundStyle(focusedTool == tool ? .black : .white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(
                        focusedTool == tool ? Color.yellow : Color.black.opacity(0.45),
                        in: RoundedRectangle(cornerRadius: 12, style: .continuous)
                    )
                }
                .buttonStyle(.plain)
                .accessibilityLabel(tool.title)
                .accessibilityIdentifier("world2.playerMenu.hot.\(tool.rawValue)")
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.playerMenu.hotList")
    }

    private var header: some View {
        HStack(spacing: 10) {
            avatarImage
                .frame(width: 40, height: 40)
                .clipShape(Circle())
                .overlay(Circle().stroke(.white.opacity(0.7), lineWidth: 1.5))

            VStack(alignment: .leading, spacing: 1) {
                Text(playerId?.displayName ?? "Player")
                    .font(.system(size: 18, weight: .black, design: .rounded))
                Text("Your stuff")
                    .font(.system(size: 12, weight: .bold, design: .rounded))
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Button(action: close) {
                Image(systemName: "xmark")
                    .font(.system(size: 14, weight: .black))
                    .foregroundStyle(.white)
                    .frame(width: 32, height: 32)
                    .background(.black.opacity(0.55), in: Circle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Close player menu")
            .accessibilityIdentifier("world2.playerMenu.close")
        }
    }

    // MARK: - Inventory

    private var inventorySection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("INVENTORY", systemImage: "shippingbox.fill")
                .font(.system(size: 13, weight: .black, design: .rounded))
                .foregroundStyle(.secondary)

            if viewModel.placeInventory.isEmpty {
                Text("Nothing plantable yet.")
                    .font(.system(size: 14, weight: .bold, design: .rounded))
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, minHeight: 56, alignment: .leading)
            } else {
                Text("Tap an item, then tap a glowing pad on the map.")
                    .font(.system(size: 12, weight: .bold, design: .rounded))
                    .foregroundStyle(.secondary)

                ForEach(viewModel.placeInventory) { item in
                    World2PlaceInventoryRow(
                        item: item,
                        isSelected: viewModel.selectedPlaceInventoryItemID == item.id
                    ) {
                        viewModel.togglePlaceInventorySelection(item.id)
                        // Keep the drawer open so she can see selection, but
                        // close so the map pads are free to tap.
                        if viewModel.selectedPlaceInventoryItemID != nil {
                            close()
                        }
                    }
                }
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.white.opacity(0.45), in: RoundedRectangle(cornerRadius: 16))
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.playerMenu.inventory")
    }

    // MARK: - Quests

    private var questsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("QUESTS", systemImage: "flag.fill")
                .font(.system(size: 13, weight: .black, design: .rounded))
                .foregroundStyle(.secondary)

            questRow
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.playerMenu.quests")
    }

    private var mapSeenSection: some View {
        let sync = worldSync
        let unseen = sync.unseenIDs.count
        return VStack(alignment: .leading, spacing: 10) {
            Label("MAP", systemImage: "map.fill")
                .font(.system(size: 13, weight: .black, design: .rounded))
                .foregroundStyle(.secondary)

            VStack(alignment: .leading, spacing: 8) {
                Text("Map everything seen")
                    .font(.system(size: 16, weight: .black, design: .rounded))
                Text(
                    sync.noticesSuppressed
                        ? "New badges are hiding. The map still remembers \(unseen) new thing\(unseen == 1 ? "" : "s")."
                        : unseen == 0
                            ? "Nothing new waiting on the map."
                            : "\(unseen) new thing\(unseen == 1 ? "" : "s") still have a badge."
                )
                .font(.system(size: 13, weight: .semibold, design: .rounded))
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)

                if onOpenMinimap != nil {
                    Button {
                        close()
                        onOpenMinimap?()
                    } label: {
                        Label("Open map", systemImage: "map.fill")
                            .font(.system(size: 14, weight: .black, design: .rounded))
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.teal)
                    .accessibilityIdentifier("world2.playerMenu.openMinimap")
                }

                Button {
                    sync.setNoticesSuppressed(!sync.noticesSuppressed)
                } label: {
                    Label(
                        sync.noticesSuppressed ? "Show new badges" : "Map everything seen",
                        systemImage: sync.noticesSuppressed ? "bell.fill" : "eye.slash.fill"
                    )
                    .font(.system(size: 14, weight: .black, design: .rounded))
                }
                .buttonStyle(.borderedProminent)
                .tint(sync.noticesSuppressed ? .orange : .indigo)
                .accessibilityIdentifier("world2.playerMenu.mapEverythingSeen")
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(.white.opacity(0.55), in: RoundedRectangle(cornerRadius: 16))
        }
        .accessibilityIdentifier("world2.playerMenu.mapSeen")
    }

    private var questRow: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Image(systemName: jukeboxPlaced ? "checkmark.circle.fill" : "music.note.house.fill")
                    .foregroundStyle(jukeboxPlaced ? .green : .indigo)
                Text("Place the jukebox")
                    .font(.system(size: 16, weight: .black, design: .rounded))
                Spacer(minLength: 0)
            }
            Text(
                jukeboxPlaced
                    ? "Your treehouse has its music. Tap the jukebox whenever you want a song."
                    : "Your first piece of furniture. Open your treehouse, tap Decorate My Room, and place the jukebox from the drawer."
            )
            .font(.system(size: 13, weight: .semibold, design: .rounded))
            .foregroundStyle(.secondary)
            .fixedSize(horizontal: false, vertical: true)

            if !jukeboxPlaced, viewModel.currentPlayerId != nil {
                Button {
                    close()
                    viewModel.openCurrentPlayerTreehouse()
                } label: {
                    Label("Go to my treehouse", systemImage: "house.fill")
                        .font(.system(size: 14, weight: .black, design: .rounded))
                }
                .buttonStyle(.borderedProminent)
                .tint(.indigo)
                .accessibilityIdentifier("world2.quests.goHome")
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.white.opacity(0.55), in: RoundedRectangle(cornerRadius: 16))
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.quests.item.placeJukebox")
    }

    // MARK: - Joined app controls (replaces floating top-right HUD)

    private var controlsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("CONTROLS", systemImage: "switch.2")
                .font(.system(size: 13, weight: .black, design: .rounded))
                .foregroundStyle(.secondary)

            HStack(spacing: 8) {
                controlChip("Music", symbol: "music.note") {
                    close()
                    onOpenMusic?()
                }
                controlChip("Settings", symbol: "gearshape.fill") {
                    close()
                    onOpenSettings?()
                }
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.playerMenu.controls")
    }

    private func controlChip(
        _ title: String,
        symbol: String,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            Label(title, systemImage: symbol)
                .font(.system(size: 13, weight: .black, design: .rounded))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
                .background(.indigo.opacity(0.16), in: RoundedRectangle(cornerRadius: 12))
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("world2.playerMenu.\(title.lowercased())")
    }

    private var accountSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("ACCOUNT", systemImage: "person.crop.circle.fill")
                .font(.system(size: 13, weight: .black, design: .rounded))
                .foregroundStyle(.secondary)

            VStack(alignment: .leading, spacing: 8) {
                Text(playerId?.displayName ?? "Player")
                    .font(.system(size: 16, weight: .black, design: .rounded))
                if let email = auth.accountEmail {
                    Text(email)
                        .font(.system(size: 13, weight: .semibold, design: .rounded))
                        .foregroundStyle(.secondary)
                }
                if let profile = auth.activeProfile {
                    Text("Playing as \(profile.displayName)\(profile.isProxy ? " (proxy)" : "")")
                        .font(.system(size: 13, weight: .semibold, design: .rounded))
                        .foregroundStyle(.secondary)
                }

                Button {
                    close()
                    onOpenSettings?()
                } label: {
                    Label("Account settings", systemImage: "gearshape.fill")
                        .font(.system(size: 14, weight: .black, design: .rounded))
                }
                .buttonStyle(.borderedProminent)
                .tint(.indigo)
                .accessibilityIdentifier("world2.playerMenu.accountSettings")

                if onSwitchProfile != nil {
                    Button("Switch profile") {
                        auth.clearActiveProfile()
                        close()
                        onSwitchProfile?()
                    }
                    .buttonStyle(.bordered)
                    .accessibilityIdentifier("world2.playerMenu.switchProfile")
                }
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(.white.opacity(0.55), in: RoundedRectangle(cornerRadius: 16))
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.playerMenu.account")
    }

    private func close() {
        isOpen = false
        focusedTool = .inventory
    }
}

private enum PlayerMenuTool: String, CaseIterable, Identifiable {
    case inventory
    case quests
    case map
    case controls
    case account

    var id: String { rawValue }

    var title: String {
        switch self {
        case .inventory: return "Inventory"
        case .quests: return "Quests"
        case .map: return "Map"
        case .controls: return "Controls"
        case .account: return "Account"
        }
    }

    var symbol: String {
        switch self {
        case .inventory: return "shippingbox.fill"
        case .quests: return "flag.fill"
        case .map: return "map.fill"
        case .controls: return "switch.2"
        case .account: return "person.crop.circle.fill"
        }
    }
}

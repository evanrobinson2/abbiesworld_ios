import SwiftUI

struct World2QuestDrawer: View {
    @ObservedObject var viewModel: World2ViewModel
    @ObservedObject private var playerService = PlayerStateService.shared
    @State private var isOpen = false

    private var player: PlayerState? { playerService.currentPlayer }

    private var jukeboxPlaced: Bool {
        player?.hasPlacedJukebox ?? false
    }

    var body: some View {
        Group {
            if isOpen {
                ZStack(alignment: .leading) {
                    Color.black.opacity(0.28)
                        .ignoresSafeArea()
                        .onTapGesture { close() }
                        .accessibilityIdentifier("world2.quests.scrim")

                    drawer
                        .frame(width: 300)
                        .frame(maxHeight: .infinity)
                        .padding(.vertical, 18)
                        .padding(.leading, 12)
                        .transition(.move(edge: .leading))
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
            } else {
                starButton
                    .padding(.leading, 16)
            }
        }
        .animation(.spring(response: 0.32, dampingFraction: 0.84), value: isOpen)
        .accessibilityElement(children: .contain)
    }

    private var starButton: some View {
        Button {
            isOpen = true
        } label: {
            ZStack(alignment: .topTrailing) {
                Image("world2_quest_star")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 58, height: 58)
                    .shadow(color: .black.opacity(0.28), radius: 8, y: 4)
                if !jukeboxPlaced {
                    Circle()
                        .fill(.pink)
                        .frame(width: 14, height: 14)
                        .overlay(Circle().stroke(.white, lineWidth: 2))
                }
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel(jukeboxPlaced ? "Quests" : "Quests, one waiting")
        .accessibilityIdentifier("world2.quests.open")
    }

    private var drawer: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 10) {
                Image("world2_quest_star")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 36, height: 36)
                VStack(alignment: .leading, spacing: 1) {
                    Text("QUESTS")
                        .font(.system(size: 18, weight: .black, design: .rounded))
                    Text(player?.name ?? "Player")
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
                .accessibilityLabel("Close quests")
                .accessibilityIdentifier("world2.quests.close")
            }

            questRow
            Spacer(minLength: 0)
        }
        .padding(16)
        .background(.ultraThickMaterial, in: RoundedRectangle(cornerRadius: 26))
        .overlay {
            RoundedRectangle(cornerRadius: 26)
                .stroke(.yellow.opacity(0.7), lineWidth: 3)
        }
        .shadow(color: .black.opacity(0.28), radius: 16, x: 6)
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.quests.drawer")
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

    private func close() {
        isOpen = false
    }
}

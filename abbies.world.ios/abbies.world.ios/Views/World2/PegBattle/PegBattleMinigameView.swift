import SwiftUI
import UIKit

struct PegBattleMinigameView: View {
    var onDismiss: (() -> Void)? = nil
    var onWin: ((Int) -> Void)? = nil

    @State private var catalog: PegBattleCatalog?
    @State private var session: PegBattleSession?
    @State private var aim: Double = 0
    @State private var loadError: String?

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [
                    Color(red: 0.99, green: 0.90, blue: 0.95),
                    Color(red: 0.72, green: 0.89, blue: 0.82),
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            if let session {
                battle(session)
            } else if let loadError {
                Text(loadError).padding()
            } else {
                Text("Opening Peg Battle…")
            }
        }
        .onAppear(perform: boot)
        .accessibilityIdentifier("world2.pegBattle")
    }

    private func boot() {
        do {
            let loaded = try PegBattleCatalogLoader.load()
            catalog = loaded
            session = .create(catalog: loaded, seed: 1234)
        } catch {
            loadError = error.localizedDescription
        }
    }

    private func recreate(_ next: PegBattleSession) {
        session = next
        aim = 0
    }

    private func battle(_ session: PegBattleSession) -> some View {
        VStack(spacing: 10) {
            HStack {
                Button("Peggle Land") { onDismiss?() }
                Spacer()
                VStack {
                    Text(session.enemy.name).font(.title2.bold())
                    Text(session.intent.telegraph).font(.subheadline)
                }
                Spacer()
                Button("Reset Battle") {
                    recreate(.reset(session))
                }
                .accessibilityIdentifier("world2.pegBattle.reset")
            }
            .padding(.horizontal)

            HStack {
                hearts(session.enemyHearts, max: session.enemy.maxHealth)
                Spacer()
                hearts(session.playerHearts, max: session.level.playerHearts)
                if session.shield > 0 {
                    Text(String(repeating: "🫧", count: session.shield))
                }
            }
            .padding(.horizontal)

            HStack(alignment: .top, spacing: 12) {
                enemyPortrait(session)
                    .frame(width: 180)
                board(session)
                VStack(alignment: .leading) {
                    Text("Turn \(session.turn)")
                    Text("Seed \(session.seed)")
                    Text("Phase \(session.phase)")
                    Text("\(session.lastPower) POWER → \(session.lastDamage) dmg")
                        .font(.headline)
                    Slider(value: $aim, in: -1.15...1.15)
                    Button("Fire") { fire(session) }
                        .disabled(session.phase != "playerAim" || session.selectedCardId == nil)
                        .accessibilityIdentifier("world2.pegBattle.fire")
                }
                .frame(width: 180)
            }
            .padding(.horizontal)

            HStack {
                ForEach(session.hand, id: \.self) { id in
                    let card = session.cards.first { $0.id == id }
                    Button {
                        var next = session
                        next.chooseCard(id)
                        self.session = next
                    } label: {
                        VStack {
                            Text(card?.glyph ?? "•").font(.largeTitle)
                            Text(card?.shortName ?? id).bold()
                        }
                        .frame(width: 110, height: 120)
                        .background(
                            RoundedRectangle(cornerRadius: 16)
                                .fill(session.selectedCardId == id ? Color.yellow.opacity(0.5) : Color.white.opacity(0.9))
                        )
                    }
                    .disabled(session.phase != "playerAim")
                    .accessibilityIdentifier("world2.pegBattle.card.\(id)")
                }
            }

            if session.phase == "victory" || session.phase == "defeat" {
                VStack {
                    Text(session.phase == "victory" ? "YOU WIN!" : "WHOOPS!")
                        .font(.largeTitle.bold())
                    Text(session.phase == "victory" ? session.enemy.victoryLine : session.enemy.defeatLine)
                    Button("Try again") { recreate(.reset(session)) }
                }
                .padding()
                .background(.white.opacity(0.94), in: RoundedRectangle(cornerRadius: 20))
                .onAppear {
                    if session.phase == "victory" {
                        onWin?(8)
                    }
                }
            }
        }
        .padding(.bottom, 16)
    }

    private func hearts(_ current: Int, max: Int) -> some View {
        Text(String(repeating: "❤️", count: current) + String(repeating: "♡", count: max(0, max - current)))
    }

    private func enemyPortrait(_ session: PegBattleSession) -> some View {
        let name = "world2_peg_battle_bad_doggo_\(session.enemyState)"
        return VStack {
            if UIImage(named: name) != nil {
                Image(name).resizable().scaledToFit()
            } else {
                Capsule()
                    .fill(Color.orange.opacity(0.8))
                    .overlay(Text(session.enemy.name).padding())
            }
        }
    }

    private func board(_ session: PegBattleSession) -> some View {
        GeometryReader { geo in
            ZStack {
                RoundedRectangle(cornerRadius: 18)
                    .fill(Color.white.opacity(0.35))
                ForEach(session.pegs) { peg in
                    PegBattlePegView(peg: peg)
                        .frame(
                            width: geo.size.width * 0.044,
                            height: geo.size.width * 0.044
                        )
                        .position(
                            x: peg.x * geo.size.width,
                            y: peg.y * geo.size.height
                        )
                }
                Circle()
                    .fill(Color.white)
                    .frame(width: 14, height: 14)
                    .position(
                        x: (0.5 + sin(aim) * 0.08) * geo.size.width,
                        y: (0.08 + cos(aim) * 0.08) * geo.size.height
                    )
            }
        }
        .aspectRatio(1.1, contentMode: .fit)
    }

    private func fire(_ session: PegBattleSession) {
        var next = session
        next.fire(angle: aim)
        self.session = next
    }
}

struct PegBattlePegView: View {
    let peg: PegBattleBoard.Peg

    var body: some View {
        ZStack {
            Circle()
                .fill(fill)
                .overlay(Circle().stroke(Color(red: 0.23, green: 0.12, blue: 0.24), lineWidth: 2))
            if peg.charged {
                Circle().stroke(Color.yellow, lineWidth: 3).scaleEffect(1.25)
            }
            if peg.painted {
                Circle().fill(Color.purple.opacity(0.4))
            }
            if peg.muddy {
                Circle().fill(Color.brown.opacity(0.4))
            }
            if peg.kind == "star" {
                Text("★").font(.caption2)
            }
            if peg.kind == "heart" {
                Text("♥").font(.caption2)
            }
        }
    }

    private var fill: Color {
        switch peg.kind {
        case "star": return Color(red: 0.96, green: 0.77, blue: 0.19)
        case "heart": return Color(red: 0.94, green: 0.43, blue: 0.54)
        default: return Color(red: 0.48, green: 0.83, blue: 0.76)
        }
    }
}

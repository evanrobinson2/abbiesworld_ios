import SwiftUI
import UIKit

struct PegBattleMinigameView: View {
    var onDismiss: (() -> Void)? = nil
    var onWin: ((Int) -> Void)? = nil

    @State private var catalog: PegBattleCatalog?
    @State private var session: PegBattleSession?
    @State private var aim: Double = 0
    @State private var loadError: String?
    @State private var sessionToken = UUID()

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
        sessionToken = UUID()
        session = next
        aim = 0
    }

    private func battle(_ session: PegBattleSession) -> some View {
        VStack(spacing: 8) {
            HStack(alignment: .center, spacing: 10) {
                enemyPortrait(session)
                    .frame(width: 72, height: 72)
                VStack(spacing: 2) {
                    hearts(session.enemyHearts, max: session.enemy.maxHealth)
                    Text(session.enemy.name).font(.headline)
                    Text(session.intent.telegraph).font(.caption)
                }
                Spacer()
                VStack(spacing: 2) {
                    hearts(session.playerHearts, max: session.level.playerHearts)
                    if session.shield > 0 {
                        Text(String(repeating: "🫧", count: session.shield))
                    }
                    Button("Reset") { recreate(.reset(session)) }
                        .accessibilityIdentifier("world2.pegBattle.reset")
                }
            }
            .padding(.horizontal)

            board(session)
                .frame(maxWidth: .infinity, maxHeight: .infinity)

            HStack {
                if onDismiss != nil {
                    Button("Peggle Land") { onDismiss?() }
                }
                ForEach(session.hand, id: \.self) { id in
                    let card = session.cards.first { $0.id == id }
                    Button {
                        var next = session
                        next.chooseCard(id)
                        self.session = next
                    } label: {
                        VStack {
                            Text(card?.glyph ?? "•").font(.title)
                            Text(card?.shortName ?? id).bold().font(.caption)
                        }
                        .frame(width: 96, height: 104)
                        .background(
                            RoundedRectangle(cornerRadius: 14)
                                .fill(session.selectedCardId == id ? Color.yellow.opacity(0.5) : Color.white.opacity(0.9))
                        )
                    }
                    .disabled(session.phase != "playerAim")
                    .accessibilityIdentifier("world2.pegBattle.card.\(id)")
                }
                Button("Fire") { fire(session) }
                    .disabled(session.phase != "playerAim" || session.selectedCardId == nil)
                    .accessibilityIdentifier("world2.pegBattle.fire")
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
        .padding(.bottom, 12)
    }

    private func hearts(_ current: Int, max: Int) -> some View {
        Text(String(repeating: "❤️", count: current) + String(repeating: "♡", count: Swift.max(0, max - current)))
    }

    private func enemyPortrait(_ session: PegBattleSession) -> some View {
        let semantic = session.enemy.assets[session.enemyState] ?? "bad-doggo/\(session.enemyState)"
        let name = PegBattleArt.catalogName(semantic)
        return VStack {
            if let image = UIImage(named: name) {
                Image(uiImage: image).resizable().scaledToFit()
            } else {
                Capsule()
                    .fill(Color.orange.opacity(0.8))
                    .overlay(Text(session.enemy.name).padding())
            }
        }
    }

    private func board(_ session: PegBattleSession) -> some View {
        let physics = PegBattlePhysics.defaults
        return GeometryReader { geo in
            ZStack {
                RoundedRectangle(cornerRadius: 18)
                    .fill(
                        LinearGradient(
                            colors: [
                                Color(red: 0.21, green: 0.35, blue: 0.32),
                                Color(red: 0.11, green: 0.18, blue: 0.17),
                            ],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                ForEach(session.pegs) { peg in
                    PegBattlePegView(peg: peg)
                        .frame(
                            width: geo.size.width * physics.blockWidth,
                            height: geo.size.height * physics.blockHeight
                        )
                        .position(
                            x: peg.x * geo.size.width,
                            y: peg.y * geo.size.height
                        )
                }
                Circle()
                    .fill(
                        RadialGradient(
                            colors: [.white, Color(red: 1, green: 0.9, blue: 0.45), Color(red: 0.83, green: 0.54, blue: 0.1)],
                            center: .topLeading,
                            startRadius: 2,
                            endRadius: 18
                        )
                    )
                    .overlay(Circle().stroke(Color(red: 0.14, green: 0.08, blue: 0.16), lineWidth: 2))
                    .frame(
                        width: geo.size.width * physics.ballRadius * 2,
                        height: geo.size.width * physics.ballRadius * 2
                    )
                    .position(
                        x: (physics.fountainX + sin(aim) * 0.08) * geo.size.width,
                        y: (physics.fountainY + cos(aim) * 0.08) * geo.size.height
                    )
            }
            .contentShape(Rectangle())
            .gesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { value in
                        let dx = value.location.x / geo.size.width - physics.fountainX
                        let dy = max(0.02, value.location.y / geo.size.height - physics.fountainY)
                        aim = PegBattlePhysics.clampAim(atan2(dx, dy))
                    }
                    .onEnded { _ in
                        fire(session)
                    }
            )
        }
        .aspectRatio(0.86, contentMode: .fit)
        .padding(.horizontal, 12)
    }

    private func fire(_ session: PegBattleSession) {
        var next = session
        next.fire(angle: aim)
        self.session = next
        let token = sessionToken
        if next.phase == "hitResolve" {
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.1) {
                guard token == sessionToken, var later = self.session, later.phase == "hitResolve" else { return }
                later.resolveEnemy()
                self.session = later
            }
        }
    }
}

struct PegBattlePegView: View {
    let peg: PegBattleBoard.Peg

    var body: some View {
        ZStack {
            if peg.gone || !peg.present {
                RoundedRectangle(cornerRadius: 6)
                    .stroke(Color(red: 0.23, green: 0.12, blue: 0.24).opacity(0.28), style: StrokeStyle(lineWidth: 2, dash: [4, 3]))
            } else {
                if peg.valuable || peg.charged || peg.kind == "star" {
                    RoundedRectangle(cornerRadius: 7)
                        .stroke(Color.yellow.opacity(0.85), lineWidth: 3)
                        .scaleEffect(1.08)
                }
                RoundedRectangle(cornerRadius: 6)
                    .fill(fill)
                    .overlay(RoundedRectangle(cornerRadius: 6).stroke(Color(red: 0.23, green: 0.12, blue: 0.24), lineWidth: 2))
                if peg.painted {
                    RoundedRectangle(cornerRadius: 6).fill(Color.purple.opacity(0.4))
                }
                if peg.sticky || peg.muddy {
                    RoundedRectangle(cornerRadius: 6).fill(Color.brown.opacity(0.4))
                }
                if peg.kind == "star" {
                    Text("★").font(.caption2)
                }
                if peg.kind == "heart" {
                    Text("♥").font(.caption2)
                }
                if peg.strength > 1 {
                    Text("\(peg.strength)").font(.caption2.bold())
                }
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

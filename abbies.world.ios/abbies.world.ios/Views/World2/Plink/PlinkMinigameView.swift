import SwiftUI

/// Peglin-inspired MVP: aim a dewdrop, bounce seeds, pink vs blue meta fight.
struct PlinkMinigameView: View {
    var onDismiss: (() -> Void)? = nil
    var onWin: (() -> Void)? = nil

    @State private var mode: Mode = .levels
    @State private var battle: BattleState?
    @State private var aim: Double = 0
    @State private var ball: Ball?
    @State private var fallClock = Date()
    @State private var banner: Banner?
    @State private var progress = PlinkLocalProgress.load()
    @StateObject private var music = PlinkMusicService()

    private enum Mode { case levels, battle }

    private struct Banner {
        let title: String
        let body: String
        let won: Bool
    }

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [
                    Color(red: 1.0, green: 0.91, blue: 0.95),
                    Color(red: 1.0, green: 0.96, blue: 0.92),
                    Color(red: 0.85, green: 0.96, blue: 0.92),
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            switch mode {
            case .levels:
                levelSelect
            case .battle:
                if let battle {
                    battleView(battle)
                }
            }
        }
        .accessibilityIdentifier("world2.plink")
        .onAppear {
            progress = PlinkLocalProgress.load()
            World2MusicService.shared.stop()
            MusicService.shared.setGameActive(true)
            music.playSafari()
        }
        .onDisappear {
            music.stop()
            MusicService.shared.setGameActive(false)
        }
    }

    private var levelSelect: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Button("Back to Lego Citadel") { onDismiss?() }
                Spacer()
                Text("Gems \(progress.gems)")
                    .font(.subheadline.bold())
            }
            Text("Plink Pavilion")
                .font(.largeTitle.bold())
            Text("♪ \(music.currentTrackTitle)")
                .font(.caption.bold())
                .foregroundStyle(.secondary)
                .accessibilityIdentifier("world2.plink.track")
            Text("Pick a board. Pink vs Blue — clear Blue’s hearts before yours run out.")
                .font(.subheadline)
            ScrollView {
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 160), spacing: 12)], spacing: 12) {
                    ForEach(PlinkMVP.levels) { level in
                        let unlocked = progress.isUnlocked(level.id)
                        let cleared = progress.cleared.contains(level.id)
                        Button {
                            guard unlocked else { return }
                            start(level)
                            music.playBoard()
                        } label: {
                            VStack(alignment: .leading, spacing: 8) {
                                HStack {
                                    Text(level.name).font(.headline)
                                    Spacer()
                                    if cleared {
                                        Text("✓").font(.headline)
                                    } else if !unlocked {
                                        Image(systemName: "lock.fill")
                                    }
                                }
                                HStack(spacing: 6) {
                                    PlinkBitSprite(kind: .pink).frame(width: 28, height: 28)
                                    Text("vs").font(.caption.bold())
                                    PlinkBitSprite(kind: .blue).frame(width: 28, height: 28)
                                }
                                Text(level.blurb)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                Text("Blue \(level.enemyHp)♥ · hits \(level.enemyAtk)")
                                    .font(.caption2.bold())
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(14)
                            .background(
                                .white.opacity(unlocked ? 0.92 : 0.45),
                                in: RoundedRectangle(cornerRadius: 16)
                            )
                        }
                        .buttonStyle(.plain)
                        .disabled(!unlocked)
                        .accessibilityIdentifier("world2.plink.bed.\(level.id)")
                    }
                }
            }
        }
        .padding(24)
    }

    private func battleView(_ battle: BattleState) -> some View {
        VStack(spacing: 10) {
            HStack {
                Button("Levels") {
                    mode = .levels
                    self.battle = nil
                    banner = nil
                    music.playSafari()
                }
                Spacer()
                Text(battle.level.name).font(.headline)
                Spacer()
                Button("Again") {
                    start(battle.level)
                    music.playBoard()
                }
            }
            .padding(.horizontal)

            HStack {
                fighterColumn(title: "You · Pink", hp: battle.pinkHp, max: battle.level.playerHp, kind: .pink)
                Spacer()
                Text("VS").font(.title3.bold()).opacity(0.4)
                Spacer()
                fighterColumn(title: "Blue", hp: battle.blueHp, max: battle.level.enemyHp, kind: .blue)
            }
            .padding(.horizontal, 20)

            Text(battle.status)
                .font(.subheadline.bold())
                .multilineTextAlignment(.center)
                .padding(.horizontal)
                .accessibilityIdentifier("world2.plink.status")

            GeometryReader { geo in
                TimelineView(.animation(minimumInterval: 1.0 / 60.0, paused: battle.phase != .falling)) { context in
                    PlinkBoardCanvas(battle: battle, aim: aim, ball: ball)
                        .onChange(of: context.date) { _, date in
                            stepFall(now: date)
                        }
                }
                .gesture(
                    DragGesture(minimumDistance: 0)
                        .onChanged { value in
                            guard battle.phase == .aim else { return }
                            let x = value.location.x / max(geo.size.width, 1)
                            let y = value.location.y / max(geo.size.height, 1)
                            let fx = PlinkMVP.fountain.x
                            let fy = PlinkMVP.fountain.y
                            aim = PlinkMVP.clampAim(atan2(x - fx, y - fy))
                        }
                        .onEnded { _ in fire() }
                )
            }
            .clipShape(RoundedRectangle(cornerRadius: 20))
            .padding(.horizontal)
            .accessibilityIdentifier("world2.plink.playfield")
        }
        .padding(.vertical, 12)
        .overlay {
            if let banner {
                Color.black.opacity(0.45).ignoresSafeArea()
                VStack(spacing: 12) {
                    Text(banner.title).font(.title.bold())
                    Text(banner.body).multilineTextAlignment(.center)
                    HStack {
                        Button("Again") {
                            if let level = self.battle?.level { start(level) }
                        }
                        .buttonStyle(.borderedProminent)
                        Button("Levels") {
                            mode = .levels
                            self.battle = nil
                            self.banner = nil
                        }
                        .buttonStyle(.bordered)
                    }
                }
                .padding(22)
                .background(.white, in: RoundedRectangle(cornerRadius: 18))
                .padding(40)
            }
        }
    }

    private func fighterColumn(title: String, hp: Int, max: Int, kind: PlinkBitSprite.Kind) -> some View {
        VStack(alignment: kind == .pink ? .leading : .trailing, spacing: 4) {
            Text(title).font(.caption.bold())
            HStack(spacing: 3) {
                ForEach(0..<max, id: \.self) { i in
                    Image(systemName: "heart.fill")
                        .font(.system(size: 9))
                        .foregroundStyle(kind == .pink ? Color.pink : Color.blue)
                        .opacity(i < hp ? 1 : 0.2)
                }
            }
            PlinkBitSprite(kind: kind)
                .frame(width: 44, height: 44)
        }
    }

    private func start(_ level: PlinkMVP.Level) {
        battle = BattleState(
            level: level,
            pegs: level.pegs.map { $0 },
            pinkHp: level.playerHp,
            blueHp: level.enemyHp,
            phase: .aim,
            status: "Drag to aim. Release to drop."
        )
        aim = 0
        ball = nil
        banner = nil
        mode = .battle
        fallClock = Date()
    }

    private func fire() {
        guard var current = battle, current.phase == .aim else { return }
        let a = PlinkMVP.clampAim(aim)
        ball = Ball(
            x: PlinkMVP.fountain.x,
            y: PlinkMVP.fountain.y,
            vx: sin(a) * PlinkMVP.launch,
            vy: cos(a) * PlinkMVP.launch,
            alive: true
        )
        current.phase = .falling
        current.status = "The dewdrop is falling…"
        battle = current
        fallClock = Date()
    }

    private func stepFall(now: Date) {
        guard var current = battle, var live = ball, current.phase == .falling else { return }
        let elapsed = now.timeIntervalSince(fallClock)
        fallClock = now
        var leftover = min(0.05, elapsed) * PlinkMVP.playRate
        while leftover >= PlinkMVP.dt && live.alive {
            leftover -= PlinkMVP.dt
            PlinkMVP.step(ball: &live, pegs: &current.pegs)
            if !live.alive {
                settle(&current)
            }
        }
        ball = live.alive ? live : nil
        battle = current
    }

    private func settle(_ current: inout BattleState) {
        var dmg = 0
        var hits = 0
        for i in current.pegs.indices where current.pegs[i].hit && current.pegs[i].alive {
            current.pegs[i].alive = false
            current.pegs[i].hit = false
            hits += 1
            dmg += PlinkMVP.damage(for: current.pegs[i].kind)
        }
        current.blueHp = max(0, current.blueHp - dmg)
        var msg = dmg > 0 ? "Pink hit for \(dmg)! (\(hits) seeds)" : "No seeds. Blue shrugs."

        if current.blueHp <= 0 {
            current.phase = .over
            current.status = "\(current.level.name) cleared!"
            banner = Banner(title: "You win!", body: current.status, won: true)
            progress.markCleared(current.level.id)
            progress.save()
            onWin?()
            return
        }

        current.pinkHp = max(0, current.pinkHp - current.level.enemyAtk)
        msg += " Blue hits back for \(current.level.enemyAtk)."
        if current.pinkHp <= 0 {
            current.phase = .over
            current.status = "Pink is out. Try another aim."
            banner = Banner(title: "Blue wins", body: current.status, won: false)
            return
        }

        if current.pegs.allSatisfy({ !$0.alive }) {
            current.pegs = current.level.pegs.map { $0 }
            msg += " Board resets!"
        }
        current.phase = .aim
        current.status = "\(msg) Pink \(current.pinkHp) · Blue \(current.blueHp)"
    }
}

// MARK: - Progress

private struct PlinkLocalProgress: Codable, Equatable {
    var unlocked: [String]
    var cleared: [String]
    var gems: Int

    private static let defaultsKey = "world2.plink.progress.v1"

    static func load() -> PlinkLocalProgress {
        guard let data = UserDefaults.standard.data(forKey: defaultsKey),
              let saved = try? JSONDecoder().decode(PlinkLocalProgress.self, from: data) else {
            return .fresh
        }
        return saved
    }

    static var fresh: PlinkLocalProgress {
        PlinkLocalProgress(
            unlocked: [PlinkMVP.levels.first?.id ?? "nursery"],
            cleared: [],
            gems: 0
        )
    }

    func isUnlocked(_ id: String) -> Bool {
        unlocked.contains(id)
    }

    mutating func markCleared(_ id: String) {
        if !cleared.contains(id) {
            cleared.append(id)
            gems += 3
        }
        if let index = PlinkMVP.levels.firstIndex(where: { $0.id == id }) {
            let next = index + 1
            if PlinkMVP.levels.indices.contains(next) {
                let nextID = PlinkMVP.levels[next].id
                if !unlocked.contains(nextID) {
                    unlocked.append(nextID)
                }
            }
        }
    }

    func save() {
        if let data = try? JSONEncoder().encode(self) {
            UserDefaults.standard.set(data, forKey: Self.defaultsKey)
        }
    }
}

// MARK: - Model

private struct Ball {
    var x: Double
    var y: Double
    var vx: Double
    var vy: Double
    var alive: Bool
}

private enum PlinkPhase { case aim, falling, over }

private struct BattleState {
    let level: PlinkMVP.Level
    var pegs: [PlinkMVP.Peg]
    var pinkHp: Int
    var blueHp: Int
    var phase: PlinkPhase
    var status: String
}

private enum PlinkMVP {
    static let ballR = 0.022
    static let pegR = 0.028
    static let gravity = 1.55
    static let restitution = 0.8
    static let airDrag = 0.0
    static let maxSpeed = 1.65
    static let launch = 1.05
    static let fountain = (x: 0.5, y: 0.08)
    static let floorY = 0.92
    static let dt = 1.0 / 120.0
    static let playRate = 0.32

    struct Peg: Identifiable {
        let id: Int
        var x: Double
        var y: Double
        var kind: String
        var alive: Bool = true
        var hit: Bool = false
    }

    struct Level: Identifiable {
        let id: String
        let name: String
        let blurb: String
        let playerHp: Int
        let enemyHp: Int
        let enemyAtk: Int
        let pegs: [Peg]
    }

    static func clampAim(_ a: Double) -> Double { min(max(a, -1.15), 1.15) }

    static func damage(for kind: String) -> Int {
        switch kind {
        case "glow": return 2
        case "bomb": return 4
        default: return 1
        }
    }

    static func step(ball: inout Ball, pegs: inout [Peg]) {
        let drag = max(0, 1 - airDrag * dt)
        ball.vy += gravity * dt
        ball.vx *= drag
        ball.vy *= drag
        let speed = hypot(ball.vx, ball.vy)
        if speed > maxSpeed {
            ball.vx *= maxSpeed / speed
            ball.vy *= maxSpeed / speed
        }
        ball.x += ball.vx * dt
        ball.y += ball.vy * dt

        if ball.x < ballR { ball.x = ballR; ball.vx = abs(ball.vx) * restitution }
        else if ball.x > 1 - ballR { ball.x = 1 - ballR; ball.vx = -abs(ball.vx) * restitution }
        if ball.y < ballR { ball.y = ballR; ball.vy = abs(ball.vy) * restitution }

        let minD = ballR + pegR
        for i in pegs.indices where pegs[i].alive {
            let dx = ball.x - pegs[i].x
            let dy = ball.y - pegs[i].y
            let dist = hypot(dx, dy)
            guard dist > 0, dist < minD else { continue }
            let nx = dx / dist
            let ny = dy / dist
            ball.x = pegs[i].x + nx * minD
            ball.y = pegs[i].y + ny * minD
            let dot = ball.vx * nx + ball.vy * ny
            ball.vx = (ball.vx - 2 * dot * nx) * restitution
            ball.vy = (ball.vy - 2 * dot * ny) * restitution
            pegs[i].hit = true
            if abs(ball.vx) < 0.08 { ball.vx += ball.x >= pegs[i].x ? 0.12 : -0.12 }
        }

        if (ball.y + ballR >= floorY && ball.vy > 0) || ball.y > 1.08 {
            ball.alive = false
        }
    }

    private static func peg(_ id: Int, _ x: Double, _ y: Double, _ kind: String) -> Peg {
        Peg(id: id, x: x, y: y, kind: kind)
    }

    private static func ring(cx: Double, cy: Double, r: Double, n: Int, kind: String, startID: Int) -> [Peg] {
        (0..<n).map { i in
            let a = (Double(i) / Double(n)) * .pi * 2 - .pi / 2
            return peg(startID + i, cx + cos(a) * r, cy + sin(a) * r * 0.85, kind)
        }
    }

    private static func column(x: Double, y0: Double, step: Double, n: Int, kind: String, startID: Int) -> [Peg] {
        (0..<n).map { i in peg(startID + i, x, y0 + Double(i) * step, kind) }
    }

    private static func arc(cx: Double, cy: Double, r: Double, a0: Double, a1: Double, n: Int, kind: String, startID: Int) -> [Peg] {
        (0..<n).map { i in
            let t = n == 1 ? 0.5 : Double(i) / Double(n - 1)
            let a = a0 + (a1 - a0) * t
            return peg(startID + i, cx + cos(a) * r, cy + sin(a) * r * 0.75, kind)
        }
    }

    private static func grid(x0: Double, y0: Double, dx: Double, dy: Double, cols: Int, rows: Int, startID: Int, kind: (Int, Int) -> String) -> [Peg] {
        var out: [Peg] = []
        var id = startID
        for r in 0..<rows {
            for c in 0..<cols {
                out.append(peg(id, x0 + Double(c) * dx, y0 + Double(r) * dy, kind(c, r)))
                id += 1
            }
        }
        return out
    }

    static let levels: [Level] = [
        Level(
            id: "nursery",
            name: "Dewdrop Nursery",
            blurb: "Warm-up. Soft Blue.",
            playerHp: 8, enemyHp: 10, enemyAtk: 1,
            pegs: ring(cx: 0.5, cy: 0.38, r: 0.16, n: 6, kind: "seed", startID: 1)
                + [peg(10, 0.35, 0.55, "glow"), peg(11, 0.65, 0.55, "glow"), peg(12, 0.5, 0.68, "seed")]
        ),
        Level(
            id: "lattice",
            name: "Berry Lattice",
            blurb: "Two columns. Aim between.",
            playerHp: 8, enemyHp: 14, enemyAtk: 1,
            pegs: column(x: 0.32, y0: 0.28, step: 0.1, n: 5, kind: "seed", startID: 1)
                + column(x: 0.68, y0: 0.28, step: 0.1, n: 5, kind: "seed", startID: 10)
                + [peg(20, 0.5, 0.42, "glow"), peg(21, 0.5, 0.58, "glow"), peg(22, 0.5, 0.74, "glow")]
        ),
        Level(
            id: "arch",
            name: "Rainbow Arch",
            blurb: "Curve of glow seeds.",
            playerHp: 9, enemyHp: 16, enemyAtk: 2,
            pegs: arc(cx: 0.5, cy: 0.55, r: 0.28, a0: -.pi * 0.85, a1: .pi * 0.85, n: 9, kind: "glow", startID: 1)
                + arc(cx: 0.5, cy: 0.55, r: 0.14, a0: -.pi * 0.7, a1: .pi * 0.7, n: 5, kind: "seed", startID: 20)
                + [peg(30, 0.5, 0.55, "bomb")]
        ),
        Level(
            id: "mill",
            name: "Marble Mill",
            blurb: "Busy board. Blue hits harder.",
            playerHp: 10, enemyHp: 20, enemyAtk: 2,
            pegs: grid(x0: 0.22, y0: 0.28, dx: 0.14, dy: 0.12, cols: 5, rows: 4, startID: 1) { c, r in
                (c + r) % 2 == 0 ? "seed" : "glow"
            } + [peg(100, 0.5, 0.78, "bomb")]
        ),
        Level(
            id: "finale",
            name: "Blue’s Keep",
            blurb: "Tough Blue. Find the bombs.",
            playerHp: 12, enemyHp: 28, enemyAtk: 3,
            pegs: ring(cx: 0.5, cy: 0.4, r: 0.22, n: 10, kind: "seed", startID: 1)
                + ring(cx: 0.5, cy: 0.4, r: 0.12, n: 6, kind: "glow", startID: 20)
                + [
                    peg(40, 0.5, 0.4, "bomb"),
                    peg(41, 0.28, 0.7, "bomb"),
                    peg(42, 0.72, 0.7, "bomb"),
                    peg(43, 0.5, 0.78, "glow"),
                ]
        ),
    ]
}

private struct PlinkBoardCanvas: View {
    let battle: BattleState
    let aim: Double
    var ball: Ball?

    var body: some View {
        Canvas { context, size in
            let w = size.width
            let h = size.height

            for x in [0.18, 0.38, 0.62, 0.82] {
                let bw = w * 0.14
                let rect = CGRect(x: x * w - bw / 2, y: PlinkMVP.floorY * h, width: bw, height: h * 0.06)
                context.fill(Path(roundedRect: rect, cornerRadius: 10), with: .color(.white.opacity(0.75)))
            }

            for peg in battle.pegs where peg.alive {
                let r = max(10, PlinkMVP.pegR * min(w, h))
                let rect = CGRect(x: peg.x * w - r, y: peg.y * h - r, width: r * 2, height: r * 2)
                let color: Color = {
                    switch peg.kind {
                    case "glow": return Color(red: 0.96, green: 0.77, blue: 0.19)
                    case "bomb": return Color(red: 0.24, green: 0.55, blue: 0.31)
                    default: return Color(red: 1.0, green: 0.42, blue: 0.66)
                    }
                }()
                context.fill(Path(ellipseIn: rect), with: .color(color.opacity(peg.hit ? 0.35 : 1)))
                context.stroke(Path(ellipseIn: rect), with: .color(Color(red: 0.29, green: 0.13, blue: 0.31)), lineWidth: 2)
            }

            let fx = PlinkMVP.fountain.x * w
            let fy = PlinkMVP.fountain.y * h
            context.fill(
                Path(ellipseIn: CGRect(x: fx - 14, y: fy - 14, width: 28, height: 28)),
                with: .color(Color(red: 1.0, green: 0.42, blue: 0.66))
            )

            if battle.phase == .aim {
                var line = Path()
                line.move(to: CGPoint(x: fx, y: fy))
                line.addLine(to: CGPoint(x: fx + sin(aim) * 70, y: fy + cos(aim) * 70))
                context.stroke(line, with: .color(.purple.opacity(0.7)), style: StrokeStyle(lineWidth: 3, dash: [6, 6]))
            }

            let mx = (ball?.x ?? PlinkMVP.fountain.x) * w
            let my = (ball?.y ?? PlinkMVP.fountain.y) * h
            let br = max(12, PlinkMVP.ballR * min(w, h) * 2.2)
            if battle.phase != .falling || (ball?.alive ?? false) {
                context.fill(
                    Path(ellipseIn: CGRect(x: mx - br, y: my - br, width: br * 2, height: br * 2)),
                    with: .color(Color(red: 0.37, green: 0.78, blue: 0.85))
                )
            }
        }
        .background(
            LinearGradient(
                colors: [
                    Color(red: 0.72, green: 0.93, blue: 1.0),
                    Color(red: 1.0, green: 0.91, blue: 0.95),
                    Color(red: 0.78, green: 0.96, blue: 0.85),
                ],
                startPoint: .top,
                endPoint: .bottom
            )
        )
    }
}

private struct PlinkBitSprite: View {
    enum Kind { case pink, blue }
    let kind: Kind

    var body: some View {
        Canvas { context, size in
            let u = size.width / 16
            let fill = kind == .pink ? Color(red: 1, green: 0.42, blue: 0.66) : Color(red: 0.35, green: 0.62, blue: 1)
            let deep = kind == .pink ? Color(red: 0.84, green: 0.24, blue: 0.48) : Color(red: 0.18, green: 0.44, blue: 0.84)
            let light = kind == .pink ? Color(red: 1, green: 0.56, blue: 0.75) : Color(red: 0.55, green: 0.72, blue: 1)
            func rect(_ x: Double, _ y: Double, _ w: Double, _ h: Double, _ c: Color) {
                context.fill(
                    Path(CGRect(x: x * u, y: y * u, width: w * u, height: h * u)),
                    with: .color(c)
                )
            }
            rect(4, 2, 8, 6, fill)
            rect(5, 3, 2, 2, .black)
            rect(9, 3, 2, 2, .black)
            rect(6, 6, 4, 1, deep)
            rect(3, 8, 10, 5, light)
            rect(2, 9, 2, 3, fill)
            rect(12, 9, 2, 3, fill)
            rect(4, 13, 3, 2, deep)
            rect(9, 13, 3, 2, deep)
        }
        .accessibilityHidden(true)
    }
}

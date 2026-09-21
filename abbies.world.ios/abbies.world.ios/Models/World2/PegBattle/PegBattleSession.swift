import Foundation

enum PegBattlePhysics {
    struct Ball {
        var x: Double
        var y: Double
        var vx: Double
        var vy: Double
        var alive: Bool
        var behavior: String
        var returnsLeft: Int
        var starPower: Bool
    }

    static let defaults = (
        ballRadius: 0.011,
        pegRadius: 0.024,
        blockWidth: 0.048,
        blockHeight: 0.038,
        gravity: 1.55,
        restitution: 0.72,
        airDrag: 0.08,
        maxSpeed: 1.85,
        launchSpeed: 0.92,
        fountainX: 0.5,
        fountainY: 0.03,
        floorY: 0.96
    )

    static func clampAim(_ angle: Double, limit: Double = 1.15) -> Double {
        min(max(angle, -limit), limit)
    }

    static func simulate(
        pegs: [PegBattleBoard.Peg],
        angle: Double,
        behavior: String,
        dt: Double = 1.0 / 120.0,
        maxSteps: Int = 2400
    ) -> (pegs: [PegBattleBoard.Peg], events: [String], steps: Int) {
        let p = defaults
        let aimed = clampAim(angle)
        let speed = behavior == "rocket" ? p.launchSpeed * 0.55 : p.launchSpeed
        var ball = Ball(
            x: p.fountainX,
            y: p.fountainY,
            vx: sin(aimed) * speed,
            vy: cos(aimed) * speed,
            alive: true,
            behavior: behavior,
            returnsLeft: behavior == "boomerang" ? 1 : 0,
            starPower: false
        )
        var next = pegs
        var events: [String] = []
        var steps = 0
        while ball.alive && steps < maxSteps {
            steps += 1
            let drag = max(0, 1 - p.airDrag * dt)
            ball.vy += p.gravity * dt
            ball.vx *= drag
            ball.vy *= drag
            let spd = hypot(ball.vx, ball.vy)
            if spd > p.maxSpeed {
                ball.vx *= p.maxSpeed / spd
                ball.vy *= p.maxSpeed / spd
            }
            ball.x += ball.vx * dt
            ball.y += ball.vy * dt
            if ball.x < p.ballRadius {
                ball.x = p.ballRadius
                ball.vx = abs(ball.vx) * p.restitution
            } else if ball.x > 1 - p.ballRadius {
                ball.x = 1 - p.ballRadius
                ball.vx = -abs(ball.vx) * p.restitution
            }
            if ball.y < p.ballRadius {
                ball.y = p.ballRadius
                ball.vy = abs(ball.vy) * p.restitution
            }
            let hw = p.blockWidth / 2
            let hh = p.blockHeight / 2
            for index in next.indices {
                guard next[index].present, !next[index].gone else { continue }
                let closestX = min(max(ball.x, next[index].x - hw), next[index].x + hw)
                let closestY = min(max(ball.y, next[index].y - hh), next[index].y + hh)
                var dx = ball.x - closestX
                var dy = ball.y - closestY
                var dist = hypot(dx, dy)
                var nx = 0.0
                var ny = 0.0
                var penetrate = 0.0
                if dist == 0 {
                    let overlapX = hw - abs(ball.x - next[index].x)
                    let overlapY = hh - abs(ball.y - next[index].y)
                    if overlapX < overlapY {
                        nx = ball.x >= next[index].x ? 1 : -1
                        penetrate = overlapX + p.ballRadius
                    } else {
                        ny = ball.y >= next[index].y ? 1 : -1
                        penetrate = overlapY + p.ballRadius
                    }
                } else if dist < p.ballRadius {
                    nx = dx / dist
                    ny = dy / dist
                    penetrate = p.ballRadius - dist
                } else {
                    continue
                }
                ball.x += nx * (penetrate + 0.0004)
                ball.y += ny * (penetrate + 0.0004)
                let dot = ball.vx * nx + ball.vy * ny
                ball.vx = (ball.vx - 2 * dot * nx) * p.restitution
                ball.vy = (ball.vy - 2 * dot * ny) * p.restitution
                if behavior == "rocket" {
                    let nextSpeed = min(p.maxSpeed, hypot(ball.vx, ball.vy) * 1.16)
                    let cur = hypot(ball.vx, ball.vy)
                    if cur > 0 {
                        ball.vx *= nextSpeed / cur
                        ball.vy *= nextSpeed / cur
                    }
                }
                if !next[index].hitThisShot {
                    next[index].hitThisShot = true
                    events.append(next[index].id)
                }
            }
            if ball.y + p.ballRadius >= p.floorY && ball.vy > 0 {
                if ball.returnsLeft > 0 {
                    ball.returnsLeft -= 1
                    ball.y = p.floorY - p.ballRadius - 0.002
                    ball.vy = -abs(ball.vy) * 0.92 - 0.18
                } else {
                    ball.alive = false
                }
            } else if ball.y > 1.08 {
                ball.alive = false
            }
        }
        return (next, events, steps)
    }

    static func preview(angle: Double, behavior: String) -> [(x: Double, y: Double)] {
        let p = defaults
        var x = p.fountainX
        var y = p.fountainY
        let aimed = clampAim(angle)
        let speed = behavior == "rocket" ? p.launchSpeed * 0.55 : p.launchSpeed
        var vx = sin(aimed) * speed
        var vy = cos(aimed) * speed
        var points = [(x: x, y: y)]
        let dt = 1.0 / 120.0
        for step in 0..<360 {
            vy += p.gravity * dt
            let drag = max(0, 1 - p.airDrag * dt)
            vx *= drag
            vy *= drag
            x += vx * dt
            y += vy * dt
            if step % 3 == 0 { points.append((x: x, y: y)) }
            if y >= 0.34 || x < 0 || x > 1 { break }
        }
        return points
    }
}

struct PegBattleSession {
    var catalog: PegBattleCatalog
    var seed: UInt32
    var level: PegBattleLevel
    var enemy: PegBattleEnemy
    var cards: [PegBattleCard]
    var pegs: [PegBattleBoard.Peg]
    var hand: [String]
    var deck: [String]
    var selectedCardId: String?
    var playerHearts: Int
    var enemyHearts: Int
    var shield: Int
    var turn: Int
    var intentIndex: Int
    var phase: String
    var lastPower: Int
    var lastDamage: Int
    var enemyState: String
    var rng: PegBattleRNG

    static func create(catalog: PegBattleCatalog, seed: UInt32 = 1234, levelId: String? = nil) -> PegBattleSession {
        let level = catalog.levels.first { $0.id == (levelId ?? catalog.pack.defaultLevel) } ?? catalog.levels[0]
        let enemy = catalog.enemies.first { $0.id == level.enemy }!
        let cards = level.deck.compactMap { id in catalog.cards.first { $0.id == id } }
        var rng = PegBattleRNG(seed: seed)
        var shuffled = cards.map(\.id)
        rng.shuffle(&shuffled)
        return PegBattleSession(
            catalog: catalog,
            seed: seed,
            level: level,
            enemy: enemy,
            cards: cards,
            pegs: catalog.boards.first { $0.id == level.board }?.pegs ?? [],
            hand: Array(shuffled.prefix(level.handSize)),
            deck: Array(shuffled.dropFirst(level.handSize)),
            selectedCardId: nil,
            playerHearts: level.playerHearts,
            enemyHearts: enemy.maxHealth,
            shield: 0,
            turn: 1,
            intentIndex: 0,
            phase: "playerAim",
            lastPower: 0,
            lastDamage: 0,
            enemyState: "confident",
            rng: rng
        )
    }

    static func destroy(_ session: PegBattleSession) -> PegBattleSession? {
        var copy = session
        copy.phase = "destroyed"
        copy.pegs = []
        copy.hand = []
        return nil
    }

    static func reset(_ session: PegBattleSession) -> PegBattleSession {
        create(catalog: session.catalog, seed: session.seed, levelId: session.level.id)
    }

    var intent: PegBattleEnemy.Move {
        let id = enemy.attackPattern[intentIndex % enemy.attackPattern.count]
        return enemy.moves[id]!
    }

    mutating func chooseCard(_ id: String) {
        guard phase == "playerAim", hand.contains(id) else { return }
        selectedCardId = id
    }

    mutating func fire(angle: Double) {
        guard phase == "playerAim", let selectedCardId else { return }
        guard let card = cards.first(where: { $0.id == selectedCardId }) else { return }
        let flight = PegBattlePhysics.simulate(pegs: pegs, angle: angle, behavior: card.behavior)
        var power = 0
        var starPower = false
        var consecutive = 0
        var burst = false
        var nextPegs = flight.pegs
        for id in flight.events {
            guard let index = nextPegs.firstIndex(where: { $0.id == id }) else { continue }
            var peg = nextPegs[index]
            if peg.gone || !peg.present { continue }
            if peg.sticky || peg.muddy {
                peg.sticky = false
                peg.muddy = false
                consecutive = 0
                nextPegs[index] = peg
                continue
            }
            if peg.kind == "heart" {
                playerHearts = min(level.playerHearts, playerHearts + 1)
            }
            if peg.kind == "star" { starPower = true }
            var value = (peg.valuable || peg.charged) ? 2 : 1
            if starPower && card.behavior == "star" { value *= 2 }
            if peg.painted && card.behavior != "paint" {
                value += starPower ? 6 : 3
                peg.painted = false
            }
            if card.behavior == "paint" { peg.painted = true }
            if card.behavior == "bubble" { shield += starPower ? 2 : 1 }
            consecutive += 1
            if card.behavior == "star" && consecutive >= 10 && !burst {
                power += starPower ? 20 : 10
                burst = true
            }
            power += value
            if card.behavior != "paint" {
                peg.strength = max(0, peg.strength - 1)
                if peg.strength <= 0 {
                    peg.present = false
                    peg.gone = true
                }
            }
            nextPegs[index] = peg
        }
        for index in nextPegs.indices {
            nextPegs[index].hitThisShot = false
            nextPegs[index].pendingCharge = false
        }
        pegs = nextPegs
        lastPower = power
        lastDamage = power / level.powerPerDamage
        enemyHearts = max(0, enemyHearts - lastDamage)
        if Double(enemyHearts) / Double(enemy.maxHealth) < enemy.hurtBelowRatio {
            enemyState = "hurt"
        }
        hand.removeAll { $0 == selectedCardId }
        if !deck.isEmpty { hand.append(deck.removeFirst()) }
        deck.append(selectedCardId)
        self.selectedCardId = nil
        if enemyHearts <= 0 {
            phase = "victory"
            enemyState = "defeated"
        } else {
            phase = "hitResolve"
        }
    }

    mutating func resolveEnemy() {
        guard phase == "hitResolve" else { return }
        let incoming = intent.damage
        let absorbed = min(shield, incoming)
        shield = 0
        playerHearts = max(0, playerHearts - (incoming - absorbed))
        if enemy.signatureBoardAction.when == "onAttack:\(intent.id)" {
            let muddy = pegs.indices.filter { pegs[$0].present && !pegs[$0].gone && !pegs[$0].muddy }.shuffled(using: &rng)
            for index in muddy.prefix(enemy.signatureBoardAction.pegCount) {
                pegs[index].muddy = true
                pegs[index].sticky = true
            }
        }
        intentIndex += 1
        turn += 1
        phase = playerHearts <= 0 ? "defeat" : "playerAim"
    }
}

struct PegBattleRNG: RandomNumberGenerator {
    var state: UInt32

    init(seed: UInt32) {
        state = seed == 0 ? 1 : seed
    }

    mutating func next() -> UInt64 {
        state = state &+ 0x6D2B79F5
        var r = state ^ (state >> 15)
        r &*= 1 | state
        r ^= r &+ (r ^ (r >> 7)) &* (61 | r)
        let value = (r ^ (r >> 14))
        return UInt64(value)
    }

    mutating func shuffle<T>(_ values: inout [T]) {
        values.shuffle(using: &self)
    }
}

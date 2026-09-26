import Foundation
import CoreGraphics

// MARK: - Geometry specs (normalized board space)

/// Polyline rail the orb slides along (Peglin-style curved track).
struct RailSpec: Equatable {
    /// Normalized points: x 0…1 left→right, y 0…1 top→bottom.
    var points: [CGPoint]
    /// Half-thickness as fraction of board width.
    var halfWidth: CGFloat
}

/// Bottom cup / bucket (visual + soft catch zone).
struct BucketSpec: Equatable {
    var nx: CGFloat
    var ny: CGFloat
    var radius: CGFloat
}

struct ContinuumPeg: Equatable {
    var id: Int
    var position: CGPoint
    var kind: PegKind
    var isLit: Bool = false
    var isCleared: Bool = false

    /// Peglin fire pegs punch a little outward energy on hit.
    /// Neutral (`.blue` / `.stone`) never boosts — but never bleeds speed either (`surfaceBounciness == 1`).
    var forceKick: CGFloat {
        switch kind {
        case .orange: return 52
        case .crit: return 68
        case .bomb: return 40
        case .refresh: return 28
        case .gold: return 36
        case .blue, .stone: return 0
        }
    }

    /// Pegs never take away speed — restitution is always elastic.
    /// Neutral is the *worst* (kick 0); force/crit/bomb still add outward energy.
    var surfaceBounciness: CGFloat { 1.0 }
}

struct ContinuumRail: Equatable {
    var points: [CGPoint]
    var halfWidth: CGFloat
}

struct ContinuumConfig: Equatable {
    var size: CGSize
    var pegRadius: CGFloat
    var ballRadius: CGFloat
    var tuning: PhysicsTuning
    /// Side / top insets matching PeggleScene walls.
    var sideInsetFrac: CGFloat = 0.03
    var topInsetFrac: CGFloat = 0.02
    var floorFrac: CGFloat = 0.04
}

enum ContinuumHit: Equatable {
    case none
    case peg(id: Int)
    case rail
    case wall
    case floor
}

/// Pure continuum step — SpriteKit-free so XCTest can simulate full rounds.
enum PlinkContinuum {
    // MARK: - Physics contract (Evan)

    /// Half-angle from +Y (degrees) inside which an upward rebound is treated as “straight up.”
    /// ~14° ⇒ |dx|/speed must be at least `sin(14°)` ≈ 0.242.
    static let straightUpConeDegrees: CGFloat = 14
    /// Minimum |vx|/speed after an upward bounce (sin of `straightUpConeDegrees`).
    static let minUpwardLateralFraction: CGFloat = 0.242

    /// One fixed-dt integration + collisions. Returns whether the ball hit the floor.
    @discardableResult
    static func step(
        pos: inout CGPoint,
        vel: inout CGVector,
        dt: CGFloat,
        t: CGFloat,
        lastKickT: inout CGFloat,
        pegs: inout [ContinuumPeg],
        rails: [ContinuumRail],
        config: ContinuumConfig,
        onPeg: ((Int) -> Void)? = nil,
        /// Fire mode: destroy pegs on contact without bouncing (ball keeps going).
        passThroughPegs: Bool = false
    ) -> ContinuumHit {
        let r = config.ballRadius
        let w = config.size.width
        let h = config.size.height
        let left = w * config.sideInsetFrac + r
        let right = w * (1 - config.sideInsetFrac) - r
        let top = h * (1 - config.topInsetFrac) - r
        let floor = h * config.floorFrac
        let reach = r + config.pegRadius
        let damping = config.tuning.woodDampingCG
        // Walls are perfectly elastic — never bleed speed on a wall hit.
        let wallE: CGFloat = 1

        let g = config.tuning.gravityVector
        vel.dx += g.dx * dt
        vel.dy += g.dy * dt
        let damp = max(CGFloat(0), 1 - damping * dt)
        vel.dx *= damp
        vel.dy *= damp
        pos.x += vel.dx * dt
        pos.y += vel.dy * dt

        var hit: ContinuumHit = .none

        // Walls
        var wallPreferredSign = vel.dx
        if pos.x < left {
            pos.x = left
            if vel.dx < 0 { vel.dx = -vel.dx * wallE }
            hit = .wall
            avoidStraightUpVelocity(&vel, preferredSign: wallPreferredSign)
        } else if pos.x > right {
            pos.x = right
            if vel.dx > 0 { vel.dx = -vel.dx * wallE }
            hit = .wall
            avoidStraightUpVelocity(&vel, preferredSign: wallPreferredSign)
        }
        if pos.y > top {
            pos.y = top
            if vel.dy > 0 { vel.dy = -vel.dy * wallE }
            hit = .wall
            // Top hit sends the ball down — no straight-up clamp needed.
        }

        // Rails — still use orb wallRestitution (wood feel), not the forced wall E.
        let railE = config.tuning.wallRestitutionCG
        if collideRails(pos: &pos, vel: &vel, r: r, rails: rails, wallE: railE) {
            hit = .rail
        }

        // Pegs
        if t - lastKickT >= 0.035 {
            var bestIdx: Int?
            var bestDepth: CGFloat = 0
            var bestN = CGVector.zero
            for i in pegs.indices where !pegs[i].isCleared {
                let peg = pegs[i]
                let dx = pos.x - peg.position.x
                let dy = pos.y - peg.position.y
                let dist = hypot(dx, dy)
                let depth = reach - dist
                guard depth > 0 else { continue }
                var n = CGVector(dx: dx, dy: dy)
                if dist < 0.5 {
                    n = CGVector(dx: 0, dy: 1)
                } else {
                    n.dx /= dist
                    n.dy /= dist
                }
                let vRad = vel.dx * n.dx + vel.dy * n.dy
                guard vRad < -2 || depth > r * 0.35 else { continue }
                if depth > bestDepth {
                    bestDepth = depth
                    bestIdx = i
                    bestN = n
                }
            }
            if let idx = bestIdx {
                let peg = pegs[idx]
                if passThroughPegs {
                    // Keep velocity; mark cooldown so we don't re-hit every frame.
                    lastKickT = t
                    onPeg?(peg.id)
                    hit = .peg(id: peg.id)
                } else {
                    let bounced = bounce(
                        ballVel: vel,
                        pegPos: peg.position,
                        normal: bestN,
                        pegSurface: peg.surfaceBounciness,
                        forceKick: peg.forceKick,
                        config: config
                    )
                    pos = bounced.pos
                    vel = bounced.vel
                    lastKickT = t
                    onPeg?(peg.id)
                    hit = .peg(id: peg.id)
                }
            }
        }

        let speed = hypot(vel.dx, vel.dy)
        if speed > config.tuning.maxBallSpeedCG {
            let s = config.tuning.maxBallSpeedCG / speed
            vel.dx *= s
            vel.dy *= s
        }

        if pos.y <= floor { return .floor }
        return hit
    }

    static func bounce(
        ballVel: CGVector,
        pegPos: CGPoint,
        normal: CGVector,
        pegSurface: CGFloat,
        forceKick: CGFloat,
        config: ContinuumConfig
    ) -> (pos: CGPoint, vel: CGVector) {
        var n = normal
        let nLen = hypot(n.dx, n.dy)
        if nLen < 0.5 {
            n = CGVector(dx: 0, dy: 1)
        } else if abs(nLen - 1) > 0.01 {
            n.dx /= nLen
            n.dy /= nLen
        }

        var v = ballVel
        let vRad = v.dx * n.dx + v.dy * n.dy
        if vRad < 0 {
            let e = config.tuning.effectiveRestitution(pegSurface: pegSurface)
            v.dx -= (1 + e) * vRad * n.dx
            v.dy -= (1 + e) * vRad * n.dy
        }
        let kick = config.tuning.effectiveBumperKick + forceKick
        v.dx += n.dx * kick
        v.dy += n.dy * kick

        let speed = hypot(v.dx, v.dy)
        if speed > config.tuning.maxBallSpeedCG {
            let c = config.tuning.maxBallSpeedCG / speed
            v.dx *= c
            v.dy *= c
        }

        // Prefer incoming lateral, then hit normal — never leave nearly pure +Y.
        let preferred = abs(ballVel.dx) > 1e-3 ? ballVel.dx : n.dx
        avoidStraightUpVelocity(&v, preferredSign: preferred)

        let sep = config.ballRadius + config.pegRadius + 0.5
        let out = CGPoint(x: pegPos.x + n.dx * sep, y: pegPos.y + n.dy * sep)
        return (out, v)
    }

    /// Evan rule: outbound velocity must never be nearly pure +Y (straight up).
    /// If within `straightUpConeDegrees` of +Y, kick a lateral component and preserve speed.
    static func avoidStraightUpVelocity(_ vel: inout CGVector, preferredSign: CGFloat = 0) {
        guard vel.dy > 0 else { return }
        let speed = hypot(vel.dx, vel.dy)
        guard speed > 1e-3 else { return }
        let lateralFrac = abs(vel.dx) / speed
        guard lateralFrac < minUpwardLateralFraction else { return }

        let sign: CGFloat
        if abs(preferredSign) > 1e-6 {
            sign = preferredSign >= 0 ? 1 : -1
        } else if abs(vel.dx) > 1e-6 {
            sign = vel.dx >= 0 ? 1 : -1
        } else {
            sign = Bool.random() ? 1 : -1
        }

        let newAbsDx = speed * minUpwardLateralFraction
        let newDy = sqrt(max(0, speed * speed - newAbsDx * newAbsDx))
        vel.dx = sign * newAbsDx
        vel.dy = newDy
    }

    /// Closest-point capsule collision against each rail segment.
    @discardableResult
    static func collideRails(
        pos: inout CGPoint,
        vel: inout CGVector,
        r: CGFloat,
        rails: [ContinuumRail],
        wallE: CGFloat
    ) -> Bool {
        var any = false
        let preferredSign = vel.dx
        for rail in rails {
            guard rail.points.count >= 2 else { continue }
            for i in 0..<(rail.points.count - 1) {
                let a = rail.points[i]
                let b = rail.points[i + 1]
                let closest = closestPointOnSegment(p: pos, a: a, b: b)
                let dx = pos.x - closest.x
                let dy = pos.y - closest.y
                let dist = hypot(dx, dy)
                let minDist = r + rail.halfWidth
                guard dist < minDist, dist > 1e-4 else {
                    if dist <= 1e-4 {
                        // Exact center — push along segment normal (perpendicular to ab).
                        let abx = b.x - a.x
                        let aby = b.y - a.y
                        let len = hypot(abx, aby)
                        guard len > 1e-4 else { continue }
                        var n = CGVector(dx: -aby / len, dy: abx / len)
                        // Prefer outward from board center-ish: flip if pointing down-right weirdly.
                        if n.dy < 0 { n.dx = -n.dx; n.dy = -n.dy }
                        pos.x = closest.x + n.dx * minDist
                        pos.y = closest.y + n.dy * minDist
                        any = true
                    }
                    continue
                }
                let n = CGVector(dx: dx / dist, dy: dy / dist)
                let vRad = vel.dx * n.dx + vel.dy * n.dy
                if vRad < 0 {
                    // Elastic normal; tangential component untouched (zero friction).
                    vel.dx -= (1 + wallE) * vRad * n.dx
                    vel.dy -= (1 + wallE) * vRad * n.dy
                }
                pos.x = closest.x + n.dx * minDist
                pos.y = closest.y + n.dy * minDist
                any = true
            }
        }
        if any {
            avoidStraightUpVelocity(&vel, preferredSign: preferredSign)
        }
        return any
    }

    static func closestPointOnSegment(p: CGPoint, a: CGPoint, b: CGPoint) -> CGPoint {
        let abx = b.x - a.x
        let aby = b.y - a.y
        let len2 = abx * abx + aby * aby
        guard len2 > 1e-8 else { return a }
        var t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2
        t = min(1, max(0, t))
        return CGPoint(x: a.x + abx * t, y: a.y + aby * t)
    }

    /// Materialize continuum pegs/rails from a level into pixel space.
    static func materialize(
        level: BoardLevel,
        size: CGSize,
        tuning: PhysicsTuning
    ) -> (pegs: [ContinuumPeg], rails: [ContinuumRail], config: ContinuumConfig) {
        let scale = size.width / level.referenceWidth
        let pegR = level.pegRadius * scale
        let ballR = tuning.ballRadiusCG * (pegR / PeggleFeel.pegRadius)
        var pegs: [ContinuumPeg] = []
        for (i, spec) in level.pegs.enumerated() {
            pegs.append(ContinuumPeg(
                id: i,
                position: CGPoint(x: spec.nx * size.width, y: (1 - spec.ny) * size.height),
                kind: spec.kind
            ))
        }
        let rails: [ContinuumRail] = level.rails.map { rail in
            ContinuumRail(
                points: rail.points.map { p in
                    CGPoint(x: p.x * size.width, y: (1 - p.y) * size.height)
                },
                halfWidth: rail.halfWidth * size.width
            )
        }
        let config = ContinuumConfig(
            size: size,
            pegRadius: pegR,
            ballRadius: max(6, ballR),
            tuning: tuning
        )
        return (pegs, rails, config)
    }
}

// MARK: - Headless round simulation

struct PlinkShotResult: Equatable {
    var aimOffset: CGFloat
    var pegHits: Int
    var railHits: Int
    var duration: CGFloat
    var orangesLit: Int
    var hitFloor: Bool
}

struct PlinkRoundResult: Equatable {
    var shots: [PlinkShotResult]
    var orangesCleared: Int
    var orangesRemaining: Int
    var totalPegHits: Int
    var simulatedSeconds: CGFloat
    var wallClockMs: Double
}

enum PlinkRoundSimulator {
    /// Fire a sequence of aims against a frozen board layout (pegs clear when lit as orange targets).
    static func simulateRound(
        level: BoardLevel,
        aims: [CGFloat],
        tuning: PhysicsTuning = .default,
        boardSize: CGSize? = nil,
        dt: CGFloat = 1 / 120,
        maxShotSeconds: CGFloat = 12
    ) -> PlinkRoundResult {
        let size = boardSize ?? CGSize(width: level.referenceWidth, height: level.referenceHeight)
        var pack = PlinkContinuum.materialize(level: level, size: size, tuning: tuning)
        let start = CFAbsoluteTimeGetCurrent()
        var shots: [PlinkShotResult] = []
        var totalHits = 0
        var simSeconds: CGFloat = 0

        for aim in aims {
            let shot = simulateShot(
                aimOffset: aim,
                pegs: &pack.pegs,
                rails: pack.rails,
                config: pack.config,
                dt: dt,
                maxSeconds: maxShotSeconds
            )
            shots.append(shot)
            totalHits += shot.pegHits
            simSeconds += shot.duration
            // Pop lit oranges after each shot (Peggle settle).
            for i in pack.pegs.indices {
                if pack.pegs[i].isLit, pack.pegs[i].kind == .orange {
                    pack.pegs[i].isCleared = true
                } else if pack.pegs[i].isLit, pack.pegs[i].kind != .orange {
                    // Non-oranges reset for next shot unless we treat them as cleared stone hits.
                    pack.pegs[i].isLit = false
                }
            }
            let remaining = pack.pegs.filter { $0.kind == .orange && !$0.isCleared }.count
            if remaining == 0 { break }
        }

        let orangesTotal = level.pegs.filter { $0.kind == .orange }.count
        let remaining = pack.pegs.filter { $0.kind == .orange && !$0.isCleared }.count
        return PlinkRoundResult(
            shots: shots,
            orangesCleared: orangesTotal - remaining,
            orangesRemaining: remaining,
            totalPegHits: totalHits,
            simulatedSeconds: simSeconds,
            wallClockMs: (CFAbsoluteTimeGetCurrent() - start) * 1000
        )
    }

    static func simulateShot(
        aimOffset: CGFloat,
        pegs: inout [ContinuumPeg],
        rails: [ContinuumRail],
        config: ContinuumConfig,
        dt: CGFloat = 1 / 120,
        maxSeconds: CGFloat = 12
    ) -> PlinkShotResult {
        let launch = launchState(aimOffset: aimOffset, config: config)
        var pos = launch.origin
        var vel = launch.velocity
        var lastKickT: CGFloat = -1
        var t: CGFloat = 0
        var pegHits = 0
        var railHits = 0
        var orangesLit = 0
        var hitFloor = false
        let maxSteps = Int(maxSeconds / dt) + 1
        var pendingPegIDs: [Int] = []

        for _ in 0..<maxSteps {
            pendingPegIDs.removeAll(keepingCapacity: true)
            let hit = PlinkContinuum.step(
                pos: &pos,
                vel: &vel,
                dt: dt,
                t: t,
                lastKickT: &lastKickT,
                pegs: &pegs,
                rails: rails,
                config: config,
                onPeg: { id in pendingPegIDs.append(id) }
            )
            for id in pendingPegIDs {
                pegHits += 1
                if let idx = pegs.firstIndex(where: { $0.id == id }), !pegs[idx].isLit {
                    pegs[idx].isLit = true
                    if pegs[idx].kind == .orange { orangesLit += 1 }
                }
            }
            t += dt
            switch hit {
            case .rail: railHits += 1
            case .floor:
                hitFloor = true
            default: break
            }
            if hitFloor { break }
            if hypot(vel.dx, vel.dy) < 8 && t > 0.9 { break }
            if pegHits > 80 { break }
        }

        return PlinkShotResult(
            aimOffset: aimOffset,
            pegHits: pegHits,
            railHits: railHits,
            duration: t,
            orangesLit: orangesLit,
            hitFloor: hitFloor
        )
    }

    static func launchState(aimOffset: CGFloat, config: ContinuumConfig) -> (origin: CGPoint, velocity: CGVector) {
        let w = config.size.width
        let h = config.size.height
        let origin = CGPoint(x: w * 0.5, y: h * 0.94)
        let clamped = min(max(aimOffset, -1.05), 1.05)
        let angle = -(.pi / 2) + clamped * 0.72
        let dir = CGVector(dx: cos(angle), dy: sin(angle))
        let force = config.tuning.fireForceCG
        return (origin, CGVector(dx: dir.dx * force, dy: dir.dy * force))
    }
}

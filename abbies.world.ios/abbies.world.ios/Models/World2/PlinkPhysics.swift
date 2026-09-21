import Foundation

enum PlinkPhysics {
    struct Ball {
        var x: Double
        var y: Double
        var vx: Double
        var vy: Double
        var alive: Bool
    }

    struct Catch {
        let bowlID: String?
        let effect: String
        let x: Double
    }

    static func clampAim(_ angle: Double, limit: Double = 1.15) -> Double {
        min(max(angle, -limit), limit)
    }

    static func simulateShot(
        campaign: PlinkCampaign,
        pegs: [PlinkCampaign.Peg],
        angle: Double,
        dt: Double = 1.0 / 120.0,
        maxSteps: Int = 2400
    ) -> (pegs: [PlinkCampaign.Peg], catch: Catch, steps: Int, pegHits: Int) {
        let physics = campaign.physics
        let aimed = clampAim(angle)
        var ball = Ball(
            x: physics.fountain.x,
            y: physics.fountain.y,
            vx: sin(aimed) * physics.launchSpeed,
            vy: cos(aimed) * physics.launchSpeed,
            alive: true
        )
        var nextPegs = pegs
        var steps = 0
        var pegHits = 0
        var caught = Catch(bowlID: nil, effect: "miss", x: ball.x)

        while ball.alive && steps < maxSteps {
            steps += 1
            let drag = max(0, 1 - physics.airDrag * dt)
            ball.vy += physics.gravity * dt
            ball.vx *= drag
            ball.vy *= drag
            let speed = hypot(ball.vx, ball.vy)
            if speed > physics.maxSpeed {
                let scale = physics.maxSpeed / speed
                ball.vx *= scale
                ball.vy *= scale
            }
            ball.x += ball.vx * dt
            ball.y += ball.vy * dt

            let radius = physics.ballRadius
            if ball.x < radius {
                ball.x = radius
                ball.vx = abs(ball.vx) * physics.restitution
            } else if ball.x > 1 - radius {
                ball.x = 1 - radius
                ball.vx = -abs(ball.vx) * physics.restitution
            }
            if ball.y < radius {
                ball.y = radius
                ball.vy = abs(ball.vy) * physics.restitution
            }

            let minDist = radius + physics.pegRadius
            for index in nextPegs.indices where nextPegs[index].alive {
                let dx = ball.x - nextPegs[index].x
                let dy = ball.y - nextPegs[index].y
                let dist = hypot(dx, dy)
                guard dist > 0, dist < minDist else { continue }
                let nx = dx / dist
                let ny = dy / dist
                ball.x = nextPegs[index].x + nx * minDist
                ball.y = nextPegs[index].y + ny * minDist
                let dot = ball.vx * nx + ball.vy * ny
                ball.vx = (ball.vx - 2 * dot * nx) * physics.restitution
                ball.vy = (ball.vy - 2 * dot * ny) * physics.restitution
                if !nextPegs[index].hit {
                    nextPegs[index].hit = true
                    pegHits += 1
                }
                if abs(ball.vx) < 0.08 {
                    ball.vx += ball.x >= nextPegs[index].x ? 0.12 : -0.12
                }
            }

            if ball.y + radius >= physics.floorY && ball.vy > 0 {
                ball.alive = false
                let bowl = campaign.bowls.first { abs(ball.x - $0.x) <= $0.width / 2 }
                caught = Catch(bowlID: bowl?.id, effect: bowl?.effect ?? "miss", x: ball.x)
            } else if ball.y > 1.08 {
                ball.alive = false
                caught = Catch(bowlID: nil, effect: "miss", x: ball.x)
            }
        }

        return (nextPegs, caught, steps, pegHits)
    }

    static func resolveShot(_ round: inout PlinkRound, angle: Double) {
        guard round.phase == .aim else { return }
        let result = simulateShot(campaign: round.campaign, pegs: round.pegs, angle: angle)
        round.pegs = result.pegs
        var glowHits = 0
        for index in round.pegs.indices where round.pegs[index].hit && round.pegs[index].alive {
            round.pegs[index].alive = false
            round.pegs[index].hit = false
            if round.pegs[index].kind == "glow" {
                glowHits += 1
            }
        }

        switch result.catch.effect {
        case "extraDrop":
            round.dropsLeft += 1
        case "gems":
            round.gemsThisRound += 2
        default:
            break
        }

        if round.glowRemaining == 0 {
            round.phase = .cleared
            round.gemsThisRound += round.bed.rewardGems
            round.progress.gems += round.gemsThisRound
            if !round.progress.clearedBedIds.contains(round.bed.id) {
                round.progress.clearedBedIds.append(round.bed.id)
            }
            if let next = nextBed(in: round.campaign, after: round.bed.id),
               !round.progress.unlockedBedIds.contains(next.id) {
                round.progress.unlockedBedIds.append(next.id)
            }
            if round.bed.awardsDecoration != nil {
                round.progress.awardedDecoration = true
            }
            round.status = "Bed cleared! You woke every glow seed."
            return
        }

        round.dropsLeft -= 1
        if round.dropsLeft <= 0 && round.campaign.rules.alwaysFinishable && !round.giftUsed {
            round.giftUsed = true
            round.dropsLeft = 1
        }
        if round.dropsLeft <= 0 {
            round.phase = .retry
            round.status = "The glow seeds are still sleeping. Try this bed again."
            return
        }
        round.status = glowHits > 0
            ? "Glow seeds woke: \(glowHits). \(round.glowRemaining) left. \(round.dropsLeft) drops."
            : "\(round.glowRemaining) glow seeds left. \(round.dropsLeft) drops."
    }

    static func nextBed(in campaign: PlinkCampaign, after bedID: String) -> PlinkCampaign.Bed? {
        guard let index = campaign.beds.firstIndex(where: { $0.id == bedID }) else { return nil }
        let next = index + 1
        return campaign.beds.indices.contains(next) ? campaign.beds[next] : nil
    }
}

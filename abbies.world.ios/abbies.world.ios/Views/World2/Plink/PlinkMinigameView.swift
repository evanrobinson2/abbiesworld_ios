import SwiftUI

struct PlinkMinigameView: View {
    var onDismiss: (() -> Void)? = nil
    var onBedCleared: ((_ bedID: String, _ gems: Int, _ awardsFountain: Bool) -> Void)? = nil

    @State private var campaign: PlinkCampaign?
    @State private var progress: PlinkProgress?
    @State private var round: PlinkRound?
    @State private var loadError: String?
    @State private var aim: Double = 0

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [
                    Color(red: 0.99, green: 0.90, blue: 0.95),
                    Color(red: 0.97, green: 0.84, blue: 0.70),
                    Color(red: 0.72, green: 0.89, blue: 0.82),
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            if let round {
                board(round)
            } else if let campaign, let progress {
                lobby(campaign, progress)
            } else if let loadError {
                Text(loadError)
                    .padding()
            } else {
                Text("Opening the Plink Pavilion…")
            }
        }
        .onAppear(perform: load)
        .accessibilityIdentifier("world2.plink")
    }

    private func load() {
        do {
            let loaded = try PlinkCampaignLoader.load()
            campaign = loaded
            progress = .fresh(from: loaded)
        } catch {
            loadError = error.localizedDescription
        }
    }

    private func lobby(_ campaign: PlinkCampaign, _ progress: PlinkProgress) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Button("Peggle Land", action: { onDismiss?() })
                    .accessibilityLabel("Return to Peggle Land")
                Spacer()
                Text("Gems \(progress.gems)")
            }
            Text(campaign.poi.name)
                .font(.largeTitle.bold())
            Text(campaign.poi.summary)
            ScrollView {
                VStack(spacing: 10) {
                    ForEach(campaign.beds) { bed in
                        let unlocked = progress.unlockedBedIds.contains(bed.id)
                        Button {
                            round = .start(campaign: campaign, bed: bed, progress: progress)
                            aim = 0
                        } label: {
                            VStack(alignment: .leading) {
                                Text(bed.name).font(.headline)
                                Text(bed.summary).font(.subheadline)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding()
                            .background(.white.opacity(unlocked ? 0.92 : 0.4), in: RoundedRectangle(cornerRadius: 16))
                        }
                        .disabled(!unlocked)
                        .accessibilityIdentifier("world2.plink.bed.\(bed.id)")
                    }
                }
            }
        }
        .padding(24)
    }

    private func board(_ round: PlinkRound) -> some View {
        VStack(spacing: 12) {
            HStack {
                Button("Pavilion") { self.round = nil }
                Spacer()
                VStack {
                    Text(round.bed.name).font(.headline)
                    Text("\(round.glowRemaining) glow · \(round.dropsLeft) drops · \(round.gemsThisRound) gems")
                        .font(.subheadline)
                }
                Spacer()
                Button("Again") { retry() }
            }
            .padding(.horizontal)

            GeometryReader { geometry in
                PlinkBoardCanvas(round: round, aim: aim)
                    .gesture(
                        DragGesture(minimumDistance: 0)
                            .onChanged { value in
                                let fountain = round.campaign.physics.fountain
                                let x = value.location.x / max(geometry.size.width, 1)
                                let y = value.location.y / max(geometry.size.height, 1)
                                aim = PlinkPhysics.clampAim(atan2(x - fountain.x, y - fountain.y))
                            }
                            .onEnded { _ in fire() }
                    )
            }
            .clipShape(RoundedRectangle(cornerRadius: 24))
            .padding(.horizontal)
            .accessibilityIdentifier("world2.plink.playfield")

            Text(round.status)
                .padding(.horizontal)
                .accessibilityIdentifier("world2.plink.status")

            if round.phase == .cleared {
                Button("Back to the pavilion") { finishBed() }
                    .buttonStyle(.borderedProminent)
            }
            if round.phase == .retry {
                Button("Try this bed again", action: retry)
                    .buttonStyle(.borderedProminent)
            }
        }
        .padding(.vertical, 16)
    }

    private func fire() {
        guard var current = round, current.phase == .aim else { return }
        PlinkPhysics.resolveShot(&current, angle: aim)
        round = current
        progress = current.progress
        if current.phase == .cleared {
            onBedCleared?(
                current.bed.id,
                current.gemsThisRound,
                current.bed.awardsDecoration != nil
            )
        }
    }

    private func retry() {
        guard let campaign, let progress, let bed = round?.bed else { return }
        round = .start(campaign: campaign, bed: bed, progress: progress)
        aim = 0
    }

    private func finishBed() {
        round = nil
    }
}

private struct PlinkBoardCanvas: View {
    let round: PlinkRound
    let aim: Double

    var body: some View {
        Canvas { context, size in
            let physics = round.campaign.physics
            let fountain = CGPoint(x: physics.fountain.x * size.width, y: physics.fountain.y * size.height)
            for bowl in round.campaign.bowls {
                let rect = CGRect(
                    x: (bowl.x - bowl.width / 2) * size.width,
                    y: physics.floorY * size.height,
                    width: bowl.width * size.width,
                    height: (1 - physics.floorY) * size.height - 8
                )
                context.fill(Path(roundedRect: rect, cornerRadius: 16), with: .color(.white.opacity(0.8)))
                context.draw(
                    Text(bowl.label).font(.caption.bold()),
                    at: CGPoint(x: rect.midX, y: rect.midY)
                )
            }
            for peg in round.pegs where peg.alive {
                let r = physics.pegRadius * min(size.width, size.height)
                let rect = CGRect(
                    x: peg.x * size.width - r,
                    y: peg.y * size.height - r,
                    width: r * 2,
                    height: r * 2
                )
                context.fill(
                    Path(ellipseIn: rect),
                    with: .color(peg.kind == "glow" ? Color(red: 0.96, green: 0.77, blue: 0.19) : Color(red: 0.94, green: 0.49, blue: 0.66))
                )
            }
            let aimEnd = CGPoint(
                x: fountain.x + sin(aim) * 80,
                y: fountain.y + cos(aim) * 80
            )
            var line = Path()
            line.move(to: fountain)
            line.addLine(to: aimEnd)
            context.stroke(line, with: .color(.purple.opacity(0.7)), lineWidth: 4)
            let ballR = physics.ballRadius * min(size.width, size.height)
            context.fill(
                Path(ellipseIn: CGRect(x: fountain.x - ballR, y: fountain.y - ballR, width: ballR * 2, height: ballR * 2)),
                with: .color(Color(red: 0.37, green: 0.78, blue: 0.85))
            )
        }
        .background(
            LinearGradient(
                colors: [Color(red: 0.99, green: 0.91, blue: 0.95), Color(red: 0.72, green: 0.89, blue: 0.84)],
                startPoint: .top,
                endPoint: .bottom
            )
        )
    }
}

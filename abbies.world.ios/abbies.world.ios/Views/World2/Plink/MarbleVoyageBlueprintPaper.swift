import SwiftUI

/// Procedural blueprint paper for the Marble Voyage climb chart.
/// Prefer this over the painted island poster — readable nodes, no missing-art risk.
struct MarbleVoyageBlueprintPaper: View {
    var width: CGFloat
    var height: CGFloat
    /// Major grid step in points (minor is half).
    var majorStep: CGFloat = 56

    private let paper = Color(red: 0.07, green: 0.22, blue: 0.38)
    private let paperHi = Color(red: 0.10, green: 0.30, blue: 0.48)
    private let line = Color(red: 0.35, green: 0.78, blue: 0.95)
    private let accent = Color(red: 0.55, green: 0.92, blue: 1.0)

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [paperHi, paper, Color(red: 0.05, green: 0.16, blue: 0.30)],
                startPoint: .top,
                endPoint: .bottom
            )

            Canvas { context, size in
                let minor = majorStep * 0.5
                var x: CGFloat = 0
                var col = 0
                while x <= size.width + 1 {
                    let major = col % 2 == 0
                    var path = Path()
                    path.move(to: CGPoint(x: x, y: 0))
                    path.addLine(to: CGPoint(x: x, y: size.height))
                    context.stroke(
                        path,
                        with: .color(line.opacity(major ? 0.28 : 0.12)),
                        lineWidth: major ? 1.2 : 0.6
                    )
                    x += minor
                    col += 1
                }
                var y: CGFloat = 0
                var row = 0
                while y <= size.height + 1 {
                    let major = row % 2 == 0
                    var path = Path()
                    path.move(to: CGPoint(x: 0, y: y))
                    path.addLine(to: CGPoint(x: size.width, y: y))
                    context.stroke(
                        path,
                        with: .color(line.opacity(major ? 0.28 : 0.12)),
                        lineWidth: major ? 1.2 : 0.6
                    )
                    y += minor
                    row += 1
                }

                // Soft elevation contour rings (schematic islands).
                let rings: [(CGFloat, CGFloat, CGFloat)] = [
                    (0.50, 0.18, 0.22),
                    (0.42, 0.42, 0.18),
                    (0.58, 0.58, 0.16),
                    (0.48, 0.78, 0.20),
                ]
                for (nx, ny, nr) in rings {
                    let rect = CGRect(
                        x: size.width * nx - size.width * nr,
                        y: size.height * ny - size.width * nr * 0.55,
                        width: size.width * nr * 2,
                        height: size.width * nr * 1.1
                    )
                    context.stroke(
                        Path(ellipseIn: rect),
                        with: .color(accent.opacity(0.18)),
                        style: StrokeStyle(lineWidth: 1.5, dash: [6, 8])
                    )
                    context.stroke(
                        Path(ellipseIn: rect.insetBy(dx: 14, dy: 10)),
                        with: .color(accent.opacity(0.10)),
                        style: StrokeStyle(lineWidth: 1, dash: [4, 10])
                    )
                }

                // Title block in the corner — blueprint stamp.
                let stamp = CGRect(x: 18, y: 16, width: min(220, size.width * 0.35), height: 54)
                context.stroke(
                    Path(roundedRect: stamp, cornerRadius: 4),
                    with: .color(line.opacity(0.45)),
                    lineWidth: 1.2
                )
            }

            VStack(alignment: .leading, spacing: 2) {
                Text("MARBLE VOYAGE")
                    .font(.system(size: 11, weight: .black, design: .monospaced))
                    .tracking(1.2)
                Text("CLIMB CHART · SCHEMATIC")
                    .font(.system(size: 9, weight: .bold, design: .monospaced))
                    .opacity(0.75)
            }
            .foregroundStyle(accent.opacity(0.85))
            .padding(.leading, 28)
            .padding(.top, 24)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .allowsHitTesting(false)
        }
        .frame(width: width, height: height)
        .clipped()
        .accessibilityHidden(true)
    }
}

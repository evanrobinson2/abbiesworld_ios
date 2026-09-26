import SwiftUI

/// Bottom-right turbo distortion + cyan shock rings (SwiftUI stitchable Metal).
struct PlinkTurboDistortion: ViewModifier {
    var strength: CGFloat
    var reduceMotion: Bool

    func body(content: Content) -> some View {
        let amp = max(0, min(1, strength))
        if amp < 0.01 {
            content
        } else if reduceMotion {
            content.overlay {
                RadialGradient(
                    colors: [
                        Color(red: 0.35, green: 0.95, blue: 1.0).opacity(0.22 * amp),
                        Color.clear,
                    ],
                    center: UnitPoint(x: 0.92, y: 0.88),
                    startRadius: 8,
                    endRadius: 280
                )
                .allowsHitTesting(false)
            }
        } else {
            TimelineView(.animation) { timeline in
                let t = timeline.date.timeIntervalSinceReferenceDate
                content
                    .visualEffect { view, proxy in
                        let origin = CGPoint(
                            x: proxy.size.width * 0.92,
                            y: proxy.size.height * 0.88
                        )
                        let amplitude = Float(18 * amp)
                        return view.distortionEffect(
                            ShaderLibrary.plinkTurboRipple(
                                .float(Float(t)),
                                .float2(origin),
                                .float(amplitude),
                                .float(26)
                            ),
                            maxSampleOffset: CGSize(width: 48, height: 48)
                        )
                    }
                    .overlay {
                        turboShockRings(time: t, amp: amp)
                            .allowsHitTesting(false)
                    }
            }
        }
    }

    @ViewBuilder
    private func turboShockRings(time: TimeInterval, amp: CGFloat) -> some View {
        GeometryReader { geo in
            let origin = CGPoint(x: geo.size.width * 0.92, y: geo.size.height * 0.88)
            ZStack {
                ForEach(0..<3, id: \.self) { i in
                    let phase = (time * 2.4 + Double(i) * 0.33)
                        .truncatingRemainder(dividingBy: 1)
                    Circle()
                        .stroke(
                            Color(red: 0.45, green: 0.95, blue: 1.0)
                                .opacity((1 - phase) * 0.55 * amp),
                            lineWidth: 3 - CGFloat(i) * 0.5
                        )
                        .frame(
                            width: 40 + CGFloat(phase) * 220,
                            height: 40 + CGFloat(phase) * 220
                        )
                        .position(origin)
                        .blendMode(.plusLighter)
                }
                RadialGradient(
                    colors: [
                        Color(red: 0.55, green: 0.98, blue: 1.0).opacity(0.35 * amp),
                        Color.clear,
                    ],
                    center: UnitPoint(x: 0.92, y: 0.88),
                    startRadius: 4,
                    endRadius: 160
                )
                .blendMode(.plusLighter)
            }
        }
    }
}

extension View {
    func plinkTurboDistortion(strength: CGFloat, reduceMotion: Bool) -> some View {
        modifier(PlinkTurboDistortion(strength: strength, reduceMotion: reduceMotion))
    }
}

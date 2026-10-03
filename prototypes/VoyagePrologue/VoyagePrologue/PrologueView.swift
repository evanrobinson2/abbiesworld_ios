import SwiftUI

/// Self-contained presentation. Completion is handed to the game; no auth or player saves.
struct PrologueView: View {
    let onComplete: () -> Void
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.scenePhase) private var scenePhase
    @State private var shot = 0
    @State private var elapsed = 0.0
    @State private var playing = true
    @State private var controls = false
    @State private var ascent = 0.0
    @State private var dragStart: Double?
    @State private var boss = "Raze"
    private let timer = Timer.publish(every: 1.0 / 30, on: .main, in: .common).autoconnect()
    private let cream = Color(red: 0.98, green: 0.93, blue: 0.79)
    private let pink = Color(red: 0.98, green: 0.31, blue: 0.45)
    private let labels = ["Petals", "The game", "The interruption", "The snatch", "Our turn", "Look up", "Marble Voyage"]
    private let durations: [Double] = [8, 7, 6, 7, 8, 12, 7]

    var body: some View {
        GeometryReader { geo in
            ZStack {
                Color(red: 0.035, green: 0.07, blue: 0.08)
                scene(size: geo.size)
                    .clipped()
                    .id(shot)
                    .transition(.opacity)
                if shot == 0 || shot == 1 || shot == 4 {
                    Petals(time: reduceMotion ? 2 : elapsed, wind: shot == 4 ? 0.5 : 1)
                        .allowsHitTesting(false)
                }
                VStack {
                    HStack {
                        Text("MARBLE VOYAGE   /   A PLAYABLE PROLOGUE")
                            .font(.system(size: 12, weight: .black, design: .monospaced)).tracking(3)
                        Spacer()
                        Button(controls ? "Close studio" : "Studio") { controls.toggle() }
                        Button("Skip") { onComplete() }.accessibilityIdentifier("prologue.skip")
                    }.foregroundStyle(cream).padding(24).background(.black.opacity(0.65))
                    Spacer()
                    HStack {
                        Text(String(format: "%02d", shot + 1)).font(.system(size: 18, weight: .black, design: .monospaced))
                        Rectangle().frame(width: 42, height: 2)
                        Text(labels[shot].uppercased()).font(.system(size: 12, weight: .bold)).tracking(3)
                        Spacer()
                        Button(action: next) {
                            Text(shot == 6 ? "LET’S PLAY  ↗" : shot == 0 ? "ROLL THE MARBLE  →" : "TURN THE PANEL  →")
                                .font(.system(size: 14, weight: .heavy)).tracking(1)
                                .padding(.horizontal, 20).padding(.vertical, 14)
                                .background(cream, in: Capsule()).foregroundStyle(.black)
                        }.accessibilityIdentifier("prologue.next")
                    }.foregroundStyle(cream).padding(24).background(.black.opacity(0.65))
                }
                if controls { studio.padding(.horizontal, 70) }
            }
            .ignoresSafeArea()
            .onReceive(timer) { _ in
                guard playing, !controls, scenePhase == .active else { return }
                elapsed += 1.0 / 30
                // The opening, ascent and final handoff belong to the player.
                if ![0, 5, 6].contains(shot), elapsed >= durations[shot] { next() }
            }
            .onAppear {
                if let arg = ProcessInfo.processInfo.arguments.first(where: { $0.hasPrefix("-shot=") }),
                   let value = Int(arg.dropFirst(6)), labels.indices.contains(value) {
                    jump(value)
                }
                if ProcessInfo.processInfo.arguments.contains("-still") { playing = false; elapsed = 3 }
            }
        }
        .preferredColorScheme(.dark)
    }

    private func jump(_ value: Int) { shot = value; elapsed = 0; ascent = 0 }
    private func next() {
        if shot == 6 { onComplete(); return }
        withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.35)) { jump(shot + 1) }
    }
    private var progress: Double { min(1, elapsed / durations[shot]) }
    private var entry: Double { reduceMotion ? 1 : min(1, elapsed / 0.65) }

    @ViewBuilder private func scene(size: CGSize) -> some View {
        switch shot {
        case 0:
            backdrop("Meadow", size: size)
            VStack(alignment: .leading, spacing: 8) {
                tag("CHAPTER ZERO", color: pink)
                Text("A perfectly\nordinary\nafternoon.")
                    .font(.system(size: size.height * 0.095, weight: .black, design: .serif))
                    .foregroundStyle(cream).shadow(color: .black.opacity(0.8), radius: 16)
                Text("Friends. A bag of marbles. Absolutely no trouble.")
                    .font(.system(size: 18, weight: .semibold)).foregroundStyle(cream)
            }.frame(maxWidth: .infinity, alignment: .leading).padding(.leading, size.width * 0.08)
            marble(size: 74).position(x: size.width * 0.78, y: size.height * 0.70)
                .onTapGesture { next() }.accessibilityLabel("Roll the marble").accessibilityAddTraits(.isButton)
        case 1:
            cream
            VStack(spacing: 20) {
                tag("EVERYBODY PLAYS FAIR.", color: .black)
                HStack(spacing: 18) {
                    comic("Bramble", caption: "Your turn.", angle: -4)
                    comic("Fox", caption: "Watch this!", angle: 2)
                    comic("Stag", caption: "CLINK!", angle: -2)
                }.frame(height: size.height * 0.49).padding(.horizontal, 55)
                marble(size: 46).offset(x: reduceMotion ? 0 : (progress - 0.5) * size.width * 0.65)
            }
        case 2:
            Color(red: 0.67, green: 0.12, blue: 0.20)
            Rays().stroke(cream.opacity(0.2), lineWidth: 3)
            Image(boss).resizable().scaledToFit().frame(height: size.height * 0.84)
                .offset(x: size.width * 0.23 + (1 - entry) * 150, y: 30)
            VStack(alignment: .leading, spacing: 12) {
                tag("ALMOST EVERYBODY.", color: .black)
                Text(boss.uppercased()).font(.system(size: size.height * 0.105, weight: .black, design: .rounded))
                    .italic().lineSpacing(-15).foregroundStyle(cream)
                Text("“Nice game. It’s mine now.”").font(.title2.bold()).foregroundStyle(cream)
            }.rotationEffect(.degrees(-5)).frame(maxWidth: .infinity, alignment: .leading).padding(.leading, size.width * 0.08)
        case 3:
            cream
            VStack(spacing: 24) {
                tag("AND JUST LIKE THAT…", color: .black)
                HStack(spacing: 20) {
                    comic("Fox", caption: "HEY!", angle: -6, captive: true)
                    comic("Bramble", caption: "Our marbles!", angle: 4, captive: true)
                    comic("Stag", caption: "Abbie!", angle: -3, captive: true)
                }.frame(height: size.height * 0.44).padding(.horizontal, 60)
                Text("ONE LITTLE MARBLE GOT AWAY.").font(.system(size: 22, weight: .black)).foregroundStyle(.black)
                marble(size: 40).offset(x: reduceMotion ? 0 : progress * size.width * 0.6 - size.width * 0.3)
            }
        case 4:
            backdrop("Meadow", size: size)
            HStack(spacing: 50) {
                comic("Abbie", caption: "ABBIE / Our turn.", angle: -4).frame(width: size.width * 0.38, height: size.height * 0.65)
                VStack(alignment: .leading, spacing: 18) {
                    tag("A LITTLE LATE. RIGHT ON TIME.", color: pink)
                    Text("A pocket full\nof marbles.\nA very small\nunicorn dog.")
                        .font(.system(size: size.height * 0.055, weight: .black, design: .serif)).foregroundStyle(cream)
                    Text("Companion character art being developed")
                        .font(.caption).foregroundStyle(cream.opacity(0.7))
                    marble(size: 60)
                }
            }.offset(y: (1-entry) * 45)
        case 5:
            GeometryReader { frame in
                let h = frame.size.height
                Image("Climb").resizable().scaledToFill()
                    .frame(width: frame.size.width, height: h * 2.6).clipped()
                    .offset(y: -h * 1.6 * (1 - ascent))
                LinearGradient(colors: [.black.opacity(0.55), .clear, .black.opacity(0.8)], startPoint: .top, endPoint: .bottom)
                VStack(alignment: .leading, spacing: 16) {
                    tag("SOMEWHERE UP THERE…", color: pink)
                    Text(ascent > 0.8 ? "They’re waiting\nfor us." : "That’s a\nlong way up.")
                        .font(.system(size: h * 0.085, weight: .black, design: .serif)).foregroundStyle(cream)
                    Text("DRAG UP TO FOLLOW THE TRAIL").font(.system(size: 13, weight: .black)).tracking(3).foregroundStyle(cream)
                    Slider(value: $ascent).frame(width: 240).tint(pink).accessibilityLabel("Mountain ascent")
                }.padding(.leading, 70).padding(.top, 110)
            }.contentShape(Rectangle())
                .gesture(DragGesture().onChanged { value in
                    if dragStart == nil { dragStart = ascent }
                    ascent = min(1, max(0, (dragStart ?? 0) - Double(value.translation.height) / 500))
                }.onEnded { _ in dragStart = nil })
        default:
            Color(red: 0.035, green: 0.18, blue: 0.19)
            Rays().stroke(cream.opacity(0.15), lineWidth: 2)
            VStack(spacing: 20) {
                tag("SMALL MARBLES. VERY BIG TROUBLE.", color: pink)
                Text("MARBLE\nVOYAGE").font(.system(size: size.height * 0.13, weight: .black, design: .rounded))
                    .italic().multilineTextAlignment(.center).lineSpacing(-15).foregroundStyle(cream)
                marble(size: 80).scaleEffect(reduceMotion ? 1 : 1 + sin(elapsed * 2) * 0.04)
                Text("Let’s bring everybody home.").font(.title2.bold()).foregroundStyle(cream)
            }
        }
    }

    private func backdrop(_ image: String, size: CGSize) -> some View {
        Image(image).resizable().scaledToFill().frame(width: size.width, height: size.height).clipped()
            .scaleEffect(reduceMotion ? 1 : 1 + progress * 0.045)
            .overlay(.black.opacity(0.35))
    }
    private func tag(_ text: String, color: Color) -> some View {
        Text(text).font(.system(size: 14, weight: .black, design: .monospaced)).tracking(2)
            .padding(.horizontal, 16).padding(.vertical, 10).foregroundStyle(.white).background(color)
    }
    private func comic(_ asset: String, caption: String, angle: Double, captive: Bool = false) -> some View {
        VStack(spacing: 0) {
            Image(asset).resizable().scaledToFit().padding(12).frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color(red: 0.80, green: 0.87, blue: 0.78))
                .overlay {
                    if captive { HStack { ForEach(0..<5) { _ in Rectangle().fill(.black.opacity(0.7)).frame(width: 9); Spacer(minLength: 0) } }.padding(.horizontal, 20) }
                }
            Text(caption).font(.system(size: 20, weight: .black, design: .rounded)).foregroundStyle(.black)
                .padding(14).frame(maxWidth: .infinity).background(.white)
        }.overlay(Rectangle().stroke(.black, lineWidth: 6)).shadow(color: .black.opacity(0.4), radius: 0, x: 8, y: 9)
            .rotationEffect(.degrees(angle)).offset(y: reduceMotion ? 0 : sin(elapsed * 1.2 + angle) * 3)
    }
    private func marble(size: CGFloat) -> some View {
        Circle().fill(RadialGradient(colors: [.white, .cyan, Color(red: 0.04, green: 0.20, blue: 0.35)], center: .topLeading, startRadius: 0, endRadius: size))
            .overlay(Circle().stroke(cream, lineWidth: 3)).overlay(Circle().fill(.white.opacity(0.85)).frame(width: size * 0.2).offset(x: -size * 0.2, y: -size * 0.2))
            .frame(width: size, height: size).shadow(color: .cyan.opacity(0.7), radius: 18)
    }
    private var studio: some View {
        VStack(spacing: 20) {
            Text("DIRECTOR’S DESK").font(.title.bold())
            Text("Storyboard build • temporary cast art • no soundtrack yet").font(.caption)
            Picker("Shot", selection: Binding(get: {shot}, set: {jump($0)})) {
                ForEach(labels.indices, id: \.self) { Text(labels[$0]).tag($0) }
            }.pickerStyle(.segmented)
            Picker("Existing gang cast", selection: $boss) {
                ForEach(["Raze", "Vix", "Morrow", "Nib"], id: \.self) { Text($0).tag($0) }
            }.pickerStyle(.segmented)
            Slider(value: $elapsed, in: 0...durations[shot]).accessibilityLabel("Shot time")
            HStack {
                Button(playing ? "Pause" : "Play") { playing.toggle() }
                Button("Replay shot") { elapsed = 0; ascent = 0 }
                Button("Start over") { jump(0) }
                Button("Return to film") { controls = false }
            }.buttonStyle(.bordered)
        }.padding(30).background(.ultraThickMaterial, in: RoundedRectangle(cornerRadius: 22))
    }
}

private struct Petals: View {
    let time: Double
    let wind: Double
    var body: some View {
        Canvas { context, size in
            for i in 0..<42 {
                let n = Double(i)
                let speed = 24 + n.truncatingRemainder(dividingBy: 7) * 9
                let y = (n * 87 + time * speed).truncatingRemainder(dividingBy: size.height + 60) - 30
                let x = (n * 193 + time * 19 * wind + sin(time + n) * 25).truncatingRemainder(dividingBy: size.width + 60) - 30
                var c = context
                c.translateBy(x: x, y: y)
                c.rotate(by: .radians(time * 0.5 + n))
                c.scaleBy(x: 0.4 + abs(sin(time * 0.7 + n)) * 0.6, y: 1)
                let r = CGFloat(6 + i % 12)
                let rect = CGRect(x: -r, y: -r/2, width: r*2, height: r)
                c.fill(Path(ellipseIn: rect), with: .linearGradient(Gradient(colors: [.pink, Color(red: 0.98, green: 0.73, blue: 0.75)]), startPoint: CGPoint(x: -r,y:0), endPoint: CGPoint(x:r,y:0)))
            }
        }.accessibilityHidden(true)
    }
}
private struct Rays: Shape {
    func path(in rect: CGRect) -> Path {
        var p = Path()
        for i in 0..<32 {
            let angle = Double(i) * .pi / 16
            p.move(to: CGPoint(x: rect.midX + CGFloat(cos(angle))*100, y: rect.midY + CGFloat(sin(angle))*100))
            p.addLine(to: CGPoint(x: rect.midX + CGFloat(cos(angle))*rect.width, y: rect.midY + CGFloat(sin(angle))*rect.width))
        }
        return p
    }
}

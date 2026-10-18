import SwiftUI
import SpriteKit

struct GameView: View {
    @ObservedObject var session: GameSession
    @ScaledMetric(relativeTo: .body) private var buttonSize = 20.0
    @ScaledMetric(relativeTo: .body) private var instructionSize = 18.0
    @Environment(\.dynamicTypeSize) private var typeSize
    @AccessibilityFocusState private var headingFocused: Bool
    private var paper: Color { Color(uiColor: session.presentation.paper) }
    var body: some View {
        ZStack {
            paper.ignoresSafeArea()
            if session.error != nil && session.screen != .playroom {
                ScrollView { VStack(spacing: 20) {
                    Text("Couldn’t open this level").font(.title).accessibilityFocused($headingFocused)
                    Button("Try Again", action: session.retryLoad)
                    Button(session.exitLabel, action: session.returnToPlayroom)
                }.padding() }
            } else {
                switch session.screen {
                case .playroom: ProgressView("Opening Crayon Physics…")
                case .title: title
                case .levels: levelPicker
                case .credits: credits
                case .menu: menu
                case .completed: completion
                case .ending: ending
                default: game
                }
            }
        }
        .tint(Color(red: 0.12, green: 0.28, blue: 0.44))
        .buttonStyle(CrayonButtonStyle(fontSize: buttonSize))
        .font(session.presentation.displayFont.map { Font.custom($0, size: 20, relativeTo: .body) } ?? .body)
        .foregroundStyle(Color(red: 48 / 255, green: 45 / 255, blue: 41 / 255))
        .task(id: String(describing: session.screen)) {
            headingFocused = false
            await Task.yield()
            guard !Task.isCancelled else { return }
            headingFocused = true
        }
    }

    private var title: some View {
        ScrollView { VStack(spacing: 20) {
            if let url = GameResources.bundle.url(forResource: "title_screen.jpg", withExtension: nil),
               let image = UIImage(contentsOfFile: url.path) {
                Image(uiImage: image).resizable().scaledToFit().frame(maxHeight: 220)
                    .accessibilityHidden(true)
            }
            Text("Crayon Physics").font(.largeTitle.bold()).accessibilityFocused($headingFocused)
            Text("Draw things. Move the red ball to the star.").font(.title3)
            Button("Play") { session.start() }.frame(minHeight: 48)
            Button("Levels", action: session.selectLevels)
            Button("Credits") { session.screen = .credits }.frame(minHeight: 48)
            Button(session.exitLabel, action: session.returnToPlayroom)
        }.padding() }
    }

    private var game: some View {
        VStack(spacing: 0) {
            ViewThatFits(in: .horizontal) {
                HStack(spacing: 16) { toolbarContents }
                VStack(spacing: 8) { toolbarContents }
            }
            .padding(12)
            .frame(minHeight: 64)
            playfield
            ViewThatFits(in: .horizontal) {
                HStack(spacing: 12) { toolButtons }
                VStack(spacing: 8) { toolButtons }
            }.padding(10)
            if session.levelIndex == 0 {
                Text("Draw a shape to move the ball to the star. Tap Erase, then tap a drawing to remove it.")
                    .font(.system(size: instructionSize))
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
            }
        }
    }

    @ViewBuilder private var toolbarContents: some View {
                Button("Menu", action: session.pause)
                Text(session.levelIndex == 7 ? "The end" : "Puzzle \(session.levelIndex + 1) of 7")
                    .font(.headline)
                    .accessibilityFocused($headingFocused)
                Button("Reset", action: session.reset)
    }

    private var playfield: some View {
            ZStack {
                if let scene = session.scene {
                    SpriteView(scene: scene, preferredFramesPerSecond: 60)
                        .aspectRatio(4 / 3, contentMode: .fit)
                        .accessibilityLabel("Drawing area. Guide the red ball to the star.")
                        .allowsHitTesting(session.screen == .playing || session.screen == .ending)
                        .accessibilityHidden(session.screen == .menu || session.screen == .completed)
                        .background(GeometryReader { geometry in
                            Color.clear.onChange(of: geometry.size) { _, _ in scene.cancelStroke() }
                        })
                }
            }
    }

    private var toolButtons: some View {
                    ForEach(GameSession.Tool.allCases, id: \.self) { tool in
                        Button { session.tool = tool } label: {
                            Label(tool.rawValue, systemImage: session.tool == tool ? "checkmark.circle.fill" : "circle")
                        }
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(.primary, lineWidth: session.tool == tool ? 3 : 0))
                        .accessibilityValue(session.tool == tool ? "Selected" : "Not selected")
                        .accessibilityAddTraits(session.tool == tool ? .isSelected : [])
                    }
    }

    private var ending: some View {
        ScrollView { VStack(spacing: 16) {
                    Text("The end").font(.largeTitle).accessibilityFocused($headingFocused)
                    playfield
                    Button("Play again") { session.start() }
                    Button("Levels", action: session.selectLevels)
                    Button(session.exitLabel, action: session.returnToPlayroom)
                }.padding(16) }
    }

    private var menu: some View {
        ScrollView { VStack(spacing: 12) {
            Text("Paused").font(.title).accessibilityFocused($headingFocused)
            Text("Use Draw to make a shape. Use Erase to remove your drawings. Move the red ball to the star.")
                .font(.system(size: instructionSize)).fixedSize(horizontal: false, vertical: true)
            Button("Resume", action: session.resume)
            Button("Reset", action: session.reset)
            Button("Levels", action: session.selectLevels)
            Toggle("Music", isOn: Binding(get: { !session.muted }, set: { session.muted = !$0 }))
                .frame(minHeight: 56)
            VStack(alignment: .leading, spacing: 8) {
                Text("Music style").font(.headline)
                Picker("Music style", selection: $session.musicStyle) {
                    ForEach(MusicStyle.allCases) { style in
                        Text(style.title).tag(style)
                    }
                }
                .pickerStyle(.menu)
                .labelsHidden()
                .accessibilityLabel("Music style")
                .accessibilityHint("Choose the music to hear when you resume with music on.")
                .font(.system(size: buttonSize, weight: .semibold))
                .frame(minHeight: 56)
                .accessibilityIdentifier("music-style-picker")
            }.frame(maxWidth: .infinity, alignment: .leading)
            Toggle("Sound effects", isOn: Binding(get: { !session.soundsMuted }, set: { session.soundsMuted = !$0 }))
                .frame(minHeight: 56)
            Button(session.exitLabel, action: session.returnToPlayroom)
        }.frame(maxWidth: .infinity) }
        .controlSize(.large).padding(28)
        .background(paper, in: RoundedRectangle(cornerRadius: 20))
        .accessibilityAddTraits(.isModal)
    }

    private var completion: some View {
        ScrollView { VStack(spacing: 20) {
            Text("Level complete").font(.title).accessibilityFocused($headingFocused)
            Button(session.levelIndex == 6 ? "See the ending" : "Next puzzle", action: session.next)
            Button("Play this puzzle again", action: session.reset)
            Button("Levels", action: session.selectLevels)
            Button(session.exitLabel, action: session.returnToPlayroom)
        }.frame(maxWidth: .infinity) }
        .controlSize(.large).padding(28)
        .background(paper, in: RoundedRectangle(cornerRadius: 20))
        .accessibilityAddTraits(.isModal)
    }

    private var levelPicker: some View {
        ScrollView {
            VStack(spacing: 20) {
                Text("Choose a level").font(.largeTitle).accessibilityFocused($headingFocused)
                if let catalog = session.catalog {
                    LazyVGrid(columns: typeSize.isAccessibilitySize ? [GridItem(.flexible())] : [GridItem(.adaptive(minimum: 150))], spacing: 16) {
                        ForEach(Array(catalog.levels.prefix(7).enumerated()), id: \.element.id) { index, level in
                            Button { session.start(index) } label: {
                                VStack(spacing: 8) {
                                    Text("Level \(index + 1)").font(.title2)
                                    Image(systemName: session.completed.contains(level.id) ? "star.fill" : "star")
                                }.frame(maxWidth: .infinity, minHeight: 90)
                            }.accessibilityLabel("Puzzle \(index + 1)\(session.completed.contains(level.id) ? ", completed" : "")")
                        }
                    }
                }
                Button("Back", action: session.closeLevels)
            }.padding(28)
        }
    }

    private var credits: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Text("Crayon Physics — Release 1").font(.largeTitle).accessibilityFocused($headingFocused)
                Text("Original game design, code and graphics: Petri Purho. Original physics: Erin Catto’s Box2D.")
                Text("Reference graphics: Creative Commons Attribution–NonCommercial–ShareAlike 2.0. Background texture based on Felipe Skroski’s ‘One for SXC’. Some modified textures from Image After.")
                Text("Original Release 1 soundtrack: _ghost — Lullaby, Creative Commons Attribution–NonCommercial 2.5. Retained here as original-game attribution; it is not the current soundtrack.")
                Text("Current music: Normal, Tense, French House and Pop. Choose a style in the paused menu; styles do not switch automatically.")
                Link("Original game", destination: URL(string: "https://www.kloonigames.com/blog/games/crayon/")!)
                Link("Graphics license", destination: URL(string: "https://creativecommons.org/licenses/by-nc-sa/2.0/")!)
                Link("Original soundtrack attribution", destination: URL(string: "https://ccmixter.org/media/files/_ghost/3631")!)
                Link("Original soundtrack license", destination: URL(string: "https://creativecommons.org/licenses/by-nc/2.5/")!)
                Text("Physics credits").font(.title2)
                Text("Physics: adapted Box2D-Lite, Erin Catto.")
                if let url = GameResources.bundle.url(forResource: "physics-license", withExtension: "txt"),
                   let license = try? String(contentsOf: url, encoding: .utf8) {
                    Text(license).textSelection(.enabled)
                }
                Text("Sound credits").font(.title2)
                if let url = GameResources.bundle.url(forResource: "sound-attribution", withExtension: "txt"),
                   let attribution = try? String(contentsOf: url, encoding: .utf8) {
                    Text(attribution).textSelection(.enabled)
                }
                Text("Licensed sound integration candidate: Paper & pluck. Audition is ongoing; this is not an accepted final selection.").font(.caption)
                Text("This remaster uses original reference artwork with presentation updates. Physics runs in CrayonPhysicsCore, adapted from Box2D-Lite; SpriteKit handles rendering and input. Full behavior parity with the original game remains unverified.").font(.caption)
                Button("Back") { session.screen = .title }
            }.padding(28)
        }
    }
}

struct CrayonButtonStyle: ButtonStyle {
    let fontSize: Double
    @Environment(\.isEnabled) private var enabled
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: fontSize, weight: .semibold))
            .multilineTextAlignment(.center)
            .fixedSize(horizontal: false, vertical: true)
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .frame(minWidth: 56, minHeight: 56)
            .foregroundStyle(Color(red: 48 / 255, green: 45 / 255, blue: 41 / 255))
            .background(configuration.isPressed ? Color.black.opacity(0.15) : Color.white.opacity(0.75),
                        in: RoundedRectangle(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.primary.opacity(0.6), lineWidth: 1))
            .opacity(enabled ? 1 : 0.45)
            .contentShape(RoundedRectangle(cornerRadius: 12))
    }
}

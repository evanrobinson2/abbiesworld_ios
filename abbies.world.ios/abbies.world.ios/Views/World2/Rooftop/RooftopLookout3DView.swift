import RealityKit
import SwiftUI

/// Opt-in native room preview; the established decorated room remains independently editable.
struct RooftopLookout3DView: View {
    let onClose: () -> Void
    @State private var lightingStudy = ProcessInfo.processInfo.arguments.contains("-rooftopLightingProof")
    var body: some View {
        RooftopSceneView(onClose: onClose, lightingStudy: lightingStudy,
                         onSwitch: { lightingStudy.toggle() })
            .id(lightingStudy)
    }
}

private struct RooftopSceneView: View {
    let onClose: () -> Void
    let onSwitch: () -> Void
    init(onClose: @escaping () -> Void, lightingStudy: Bool, onSwitch: @escaping () -> Void) {
        self.onClose = onClose; self.onSwitch = onSwitch
        _controller = State(initialValue: RooftopSceneController(lightingStudy: lightingStudy))
    }
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var controller: RooftopSceneController
    @State private var dragStart = SIMD2<Float>.zero
    @State private var zoomStart: Float = 1

    var body: some View {
        GeometryReader { geo in
            let width = geo.size.width
            let height = geo.size.height
            ZStack {
                Color.black
                RealityView { content in
                    content.camera = .virtual
                    content.renderingEffects.motionBlur = .disabled
                    content.renderingEffects.depthOfField = .disabled
                    content.renderingEffects.cameraGrain = .disabled
                    content.renderingEffects.antialiasing = .multisample4X
                    if #available(iOS 26.0, *), controller.isLightingStudy {
                        content.renderingEffects.customPostProcessing = .effect(RooftopGlow())
                    }
                    controller.attach(content)
                }
                .frame(width: width, height: height)
                .opacity(controller.ready ? 1 : 0)
                .contentShape(Rectangle())
                .gesture(DragGesture(minimumDistance: 4)
                    .onChanged { value in
                        controller.pan = [
                            RooftopMotion.clamp(dragStart.x - Float(value.translation.width / width) * 0.9, -RooftopMotion.maximumYaw, RooftopMotion.maximumYaw),
                            RooftopMotion.clamp(dragStart.y - Float(value.translation.height / height) * 0.6, -RooftopMotion.maximumPitch, RooftopMotion.maximumPitch)]
                    }
                    .onEnded { _ in dragStart = controller.pan })
                .simultaneousGesture(MagnifyGesture()
                    .onChanged { value in
                        controller.zoom = RooftopMotion.clamp(zoomStart * Float(value.magnification), RooftopMotion.minimumZoom, RooftopMotion.maximumZoom)
                    }
                    .onEnded { _ in zoomStart = controller.zoom })
                .accessibilityLabel("Rooftop lookout in three dimensions")
                .accessibilityHint("Drag to look around. Pinch to zoom. Reset view restores the original camera.")
                .accessibilityIdentifier("rooftop3d.scene")

                if !controller.ready {
                    VStack(spacing: 16) {
                        if let error = controller.errorMessage { Text(error).multilineTextAlignment(.center) }
                        else { ProgressView().tint(.white); Text("Opening the rooftop…") }
                    }
                    .foregroundStyle(.white)
                    .font(.system(.title3, design: .rounded))
                    .padding(30)
                }

                VStack {
                    HStack {
                        Button(action: onClose) { Label("Back", systemImage: "chevron.left") }
                            .accessibilityIdentifier("rooftop3d.close")
                        Spacer()
                        Text("Rooftop Lookout").font(.system(.headline, design: .rounded))
                        Spacer()
                        Button(controller.isLightingStudy ? "Original prototype" : "Lighting study", action: onSwitch)
                            .font(.system(.caption, design: .rounded))
                            .accessibilityIdentifier("rooftop3d.study")
                    }
                    .padding(14).background(.black.opacity(0.38), in: Capsule())
                    Spacer()
                    if controller.ready {
                        HStack(spacing: 20) {
                            if controller.isLightingStudy {
                                Button {
                                    controller.shadows.toggle()
                                } label: { Label(controller.shadows ? "Shadows on" : "Shadows off", systemImage: "sun.max") }
                                .accessibilityIdentifier("rooftop3d.shadows")
                            }
                            Button {
                                controller.breeze = controller.breeze == 0 ? 1 : 0
                            } label: {
                                Label(controller.breeze == 0 ? "Still air" : "Breeze", systemImage: "wind")
                            }
                            .accessibilityIdentifier("rooftop3d.breeze")
                            Button {
                                controller.tiltEnabled.toggle()
                            } label: {
                                Label(controller.tiltEnabled ? "Tilt on" : "Tilt off", systemImage: "ipad.gen2")
                            }
                            .disabled(reduceMotion)
                            .accessibilityIdentifier("rooftop3d.tilt")
                            Button {
                                controller.resetCamera(); dragStart = .zero; zoomStart = 1
                            } label: { Label("Reset view", systemImage: "scope") }
                            .accessibilityIdentifier("rooftop3d.center")
                        }
                        .padding(16).background(.black.opacity(0.55), in: Capsule())
                        if ProcessInfo.processInfo.arguments.contains("-rooftopDiagnostics") {
                            Text(controller.diagnosticText)
                                .font(.caption.monospacedDigit())
                                .padding(8).background(.black.opacity(0.65), in: Capsule())
                                .accessibilityIdentifier("rooftop3d.metrics")
                            Text(String(format: "Look %.3f / %.3f · Zoom %.3f", controller.pan.x, controller.pan.y, controller.zoom))
                                .font(.caption.monospacedDigit())
                                .accessibilityIdentifier("rooftop3d.camera")
                        } else {
                            Text("Drag to look around · Pinch to zoom")
                                .font(.system(.caption, design: .rounded))
                                .padding(6).background(.black.opacity(0.35), in: Capsule())
                        }
                    }
                }
                .font(.system(.body, design: .rounded).weight(.semibold))
                .buttonStyle(.plain).foregroundStyle(.white)
                .padding(.horizontal, max(20, geo.safeAreaInsets.leading))
                .padding(.top, max(16, geo.safeAreaInsets.top))
                .padding(.bottom, max(16, geo.safeAreaInsets.bottom))
            }
        }
        .ignoresSafeArea()
        .task {
            controller.reducedMotion = reduceMotion
            controller.active = scenePhase == .active
            await controller.load()
        }
        .onChange(of: scenePhase) { _, phase in controller.active = phase == .active }
        .onChange(of: reduceMotion) { _, value in controller.reducedMotion = value }
        .onDisappear { controller.stop() }
    }
}

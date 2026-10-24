import SwiftUI
import UIKit

/// Hardware-keyboard panning for the overland map: W/A/S/D move the camera up, left, down and right while held.
/// Only the view that is first responder gets key presses, so text fields keep WASD and the keys do nothing once
/// `isActive` is false. Touch and pointer navigation are untouched.
struct World2MapKeyboardPan: UIViewControllerRepresentable {
    var isActive: Bool
    /// Unit direction (x right, y down, diagonals normalized) and the seconds since the last tick.
    var onPan: (CGVector, TimeInterval) -> Void

    func makeUIViewController(context: Context) -> Controller {
        let controller = Controller()
        controller.onPan = onPan
        controller.isActive = isActive
        return controller
    }

    func updateUIViewController(_ controller: Controller, context: Context) {
        controller.onPan = onPan
        controller.isActive = isActive
    }

    final class Controller: UIViewController {
        var onPan: (CGVector, TimeInterval) -> Void = { _, _ in }
        var isActive = false {
            didSet {
                guard isActive != oldValue else { return }
                if isActive { becomeFirstResponder() } else { stop() }
            }
        }

        private var held = Set<UIKeyboardHIDUsage>()
        private var link: CADisplayLink?
        private var lastTick: CFTimeInterval = 0
        private static let panKeys: Set<UIKeyboardHIDUsage> = [.keyboardW, .keyboardA, .keyboardS, .keyboardD]

        override var canBecomeFirstResponder: Bool { isActive }

        override func viewDidAppear(_ animated: Bool) {
            super.viewDidAppear(animated)
            if isActive { becomeFirstResponder() }
        }

        override func viewWillDisappear(_ animated: Bool) {
            super.viewWillDisappear(animated)
            stop()
        }

        override func pressesBegan(_ presses: Set<UIPress>, with event: UIPressesEvent?) {
            var unhandled = Set<UIPress>()
            for press in presses {
                if isActive, let key = press.key, Self.panKeys.contains(key.keyCode) {
                    held.insert(key.keyCode)
                } else {
                    unhandled.insert(press)
                }
            }
            if !held.isEmpty { startLink() }
            if !unhandled.isEmpty { super.pressesBegan(unhandled, with: event) }
        }

        override func pressesEnded(_ presses: Set<UIPress>, with event: UIPressesEvent?) {
            release(presses)
            super.pressesEnded(presses, with: event)
        }

        override func pressesCancelled(_ presses: Set<UIPress>, with event: UIPressesEvent?) {
            release(presses)
            super.pressesCancelled(presses, with: event)
        }

        private func release(_ presses: Set<UIPress>) {
            for press in presses {
                if let key = press.key { held.remove(key.keyCode) }
            }
            if held.isEmpty { stopLink() }
        }

        private func startLink() {
            guard link == nil else { return }
            lastTick = CACurrentMediaTime()
            let link = CADisplayLink(target: self, selector: #selector(tick))
            link.add(to: .main, forMode: .common)
            self.link = link
        }

        private func stopLink() {
            link?.invalidate()
            link = nil
        }

        private func stop() {
            held.removeAll()
            stopLink()
        }

        @objc private func tick(_ link: CADisplayLink) {
            let now = link.timestamp
            let dt = min(0.05, max(0, now - lastTick))
            lastTick = now
            var x: CGFloat = 0
            var y: CGFloat = 0
            if held.contains(.keyboardW) { y -= 1 }
            if held.contains(.keyboardS) { y += 1 }
            if held.contains(.keyboardA) { x -= 1 }
            if held.contains(.keyboardD) { x += 1 }
            guard x != 0 || y != 0 else { return }
            let length = (x * x + y * y).squareRoot()
            onPan(CGVector(dx: x / length, dy: y / length), dt)
        }
    }
}

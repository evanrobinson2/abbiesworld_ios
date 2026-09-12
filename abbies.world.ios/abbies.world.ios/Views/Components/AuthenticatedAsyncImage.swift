//
//  AuthenticatedAsyncImage.swift
//  abbies.world.ios
//
//  Loads server media through the app's shared authenticated disk cache.
//

import SwiftUI

struct AuthenticatedAsyncImage<Content: View, Placeholder: View>: View {
    let url: URL?
    let content: (Image) -> Content
    let placeholder: (_ failed: Bool) -> Placeholder

    @State private var image: UIImage?
    @State private var failed = false

    init(
        url: URL?,
        @ViewBuilder content: @escaping (Image) -> Content,
        @ViewBuilder placeholder: @escaping (_ failed: Bool) -> Placeholder
    ) {
        self.url = url
        self.content = content
        self.placeholder = placeholder
    }

    var body: some View {
        Group {
            if let image {
                content(Image(uiImage: image))
            } else {
                placeholder(failed)
            }
        }
        .task(id: url) {
            image = nil
            failed = false
            guard let url else {
                failed = true
                return
            }
            do {
                image = try await ImageCache.shared.loadImage(from: url)
                print("creature_builder.media_loaded path=\(url.lastPathComponent)")
            } catch {
                failed = true
                print(
                    "creature_builder.media_failed path=\(url.lastPathComponent) " +
                    "error=\(type(of: error))"
                )
            }
        }
    }
}

//
//  PictureCarverViewModel.swift
//  abbies.world.ios
//

import Foundation
import Combine
import UIKit

@MainActor
final class PictureCarverViewModel: ObservableObject {
    @Published var picture: UIImage?
    @Published var progress: Double = 0
    @Published var statusMessage = "Loading a picture to carve…"
    @Published var isLoading = false
    @Published var isComplete = false
    @Published var errorMessage: String?
    
    private var availablePictures: [GeneratedImage] = []
    private var currentPictureID: String?
    
    func loadInitialPicture() async {
        guard picture == nil, !isLoading else { return }
        await loadPicture(refreshList: true)
    }
    
    func loadNextPicture() async {
        await loadPicture(refreshList: availablePictures.isEmpty)
    }
    
    func updateProgress(_ newProgress: Double) {
        guard !isComplete else { return }
        progress = min(1, max(progress, newProgress))
        
        if progress >= 0.62 {
            progress = 1
            isComplete = true
            statusMessage = "You carved it out! Beautiful!"
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            print("PictureCarver: picture complete")
        } else if progress >= 0.35 {
            statusMessage = "Great carving—keep going!"
        } else if progress > 0.05 {
            statusMessage = "Keep tracing to uncover the picture!"
        }
    }
    
    private func loadPicture(refreshList: Bool) async {
        isLoading = true
        errorMessage = nil
        statusMessage = "Loading a picture to carve…"
        
        do {
            if refreshList {
                availablePictures = try await fetchPictures()
            }
            
            let choices = availablePictures.filter { $0.id != currentPictureID }
            guard let selected = (choices.isEmpty ? availablePictures : choices).randomElement() else {
                throw URLError(.resourceUnavailable)
            }
            
            let urlString = selected.url.hasPrefix("http")
                ? selected.url
                : "\(ServerConfig.shared.baseURL)\(selected.url)"
            guard let url = URL(string: urlString),
                  let loadedImage = try await ImageCache.shared.loadImage(from: url) else {
                throw URLError(.cannotDecodeContentData)
            }
            
            picture = loadedImage
            currentPictureID = selected.id
            progress = 0
            isComplete = false
            statusMessage = "Carve with your finger to reveal the picture!"
            print("PictureCarver: loaded \(selected.filename)")
            
            if ProcessInfo.processInfo.arguments.contains("-autoCarvePicture") {
                updateProgress(1)
            }
        } catch {
            errorMessage = "Couldn’t load a picture. Check the connection and try again."
            statusMessage = "Picture unavailable"
            print("PictureCarver: load failed: \(error.localizedDescription)")
        }
        
        isLoading = false
    }
    
    private func fetchPictures() async throws -> [GeneratedImage] {
        guard let url = URL(string: "\(ServerConfig.shared.baseURL)/api/generated-images") else {
            throw URLError(.badURL)
        }
        
        var request = URLRequest(url: url)
        ServerConfig.shared.addAPIKeyHeader(to: &request)
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }
        
        return try JSONDecoder().decode([GeneratedImage].self, from: data)
            .filter { $0.deleted != true && !$0.isPartial }
    }
}

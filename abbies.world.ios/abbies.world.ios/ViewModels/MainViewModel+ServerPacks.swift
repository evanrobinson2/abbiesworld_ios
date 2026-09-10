//
//  MainViewModel+ServerPacks.swift
//  abbies.world.ios
//
//  Server-managed media pack integration for MainViewModel.
//  Per CLIENT_MEDIA_PACK_CONTRACT_V1.
//

import Foundation
import Combine
import UIKit

extension MainViewModel {
    
    // MARK: - Server Pack Support
    
    func setupServerPacksSupport() {
        NotificationCenter.default.publisher(for: NSNotification.Name("MediaPacksUpdated"))
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                self?.handleMediaPacksUpdated()
            }
            .store(in: &cancellables)
    }
    
    func handleMediaPacksUpdated() {
        print("📦 Received media_packs_updated event")
        Task { @MainActor in
            await MediaPackManager.shared.refreshPackIndex()
        }
    }
    
    func loadServerPacks() async {
        await MediaPackManager.shared.refreshPackIndex()
    }
    
    // MARK: - Server Pack Generation
    
    func startServerPackGeneration(
        manifest: PackManifest,
        selections: [String: String],
        freeTextDescription: String? = nil
    ) {
        guard !isCreatingImage else {
            print("⚠️ Cannot start generation: already generating")
            return
        }
        
        let errors = MediaPackManager.shared.validateSelections(selections, for: manifest)
        guard errors.isEmpty else {
            print("⚠️ Cannot start generation: validation errors: \(errors)")
            return
        }
        
        clearImageGenerationError()
        isGenerationComplete = false
        isCreatingImage = true
        buttonState = .generating
        
        let request = MediaPackManager.shared.createGenerationRequest(
            manifest: manifest,
            selections: selections,
            freeTextDescription: freeTextDescription,
            imageWidth: 1024,
            imageHeight: 1024
        )
        
        print("\n🎨 Server Pack Generation Request:")
        print("   Pack: \(request.packId) v\(request.packVersion)")
        print("   Selections: \(request.packSelections.count) items")
        if let text = request.freeTextDescription {
            print("   Scene text: \(text)")
        }
        
        imageGenerationTask = Task { [weak self] in
            await self?.streamServerPackGeneration(request: request)
        }
    }
    
    private func streamServerPackGeneration(request: PackGenerationRequest) async {
        guard let url = URL(string: "\(apiClient.baseURL)/api/create") else {
            await MainActor.run {
                self.isCreatingImage = false
                self.buttonState = .notReady
                self.errorMessage = "Invalid API URL"
            }
            return
        }
        
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.setValue("text/event-stream", forHTTPHeaderField: "Accept")
        ServerConfig.shared.addAPIKeyHeader(to: &urlRequest)
        
        do {
            urlRequest.httpBody = try JSONEncoder().encode(request)
            print("   → POST \(url.absoluteString)")
        } catch {
            print("❌ Failed to encode request: \(error)")
            await MainActor.run {
                self.handleImageGenerationError(error)
            }
            return
        }
        
        do {
            let (asyncBytes, response) = try await URLSession.shared.bytes(for: urlRequest)
            
            if let httpResponse = response as? HTTPURLResponse {
                print("   ← \(httpResponse.statusCode)")
                
                guard httpResponse.statusCode == 200 else {
                    print("❌ Server returned error status: \(httpResponse.statusCode)")
                    await MainActor.run {
                        let error = NSError(
                            domain: "ImageGeneration",
                            code: httpResponse.statusCode,
                            userInfo: [NSLocalizedDescriptionKey: "Server error: HTTP \(httpResponse.statusCode)"]
                        )
                        self.handleImageGenerationError(error)
                    }
                    return
                }
            }
            
            var buffer = ""
            for try await byte in asyncBytes {
                if let char = String(data: Data([byte]), encoding: .utf8) {
                    buffer += char
                    
                    while let newlineIndex = buffer.firstIndex(of: "\n") {
                        let line = String(buffer[..<newlineIndex])
                        buffer = String(buffer[buffer.index(after: newlineIndex)...])
                        
                        if line.hasPrefix("data: ") {
                            let jsonString = String(line.dropFirst(6))
                            await processImageGenerationEvent(jsonString: jsonString)
                        }
                    }
                }
            }
        } catch {
            print("❌ Server pack generation error: \(error)")
            await MainActor.run {
                self.handleImageGenerationError(error)
            }
        }
    }
}

// MARK: - Server Pack State Container

class ServerPackState: ObservableObject {
    @Published var activeManifest: PackManifest?
    @Published var selections: [String: String] = [:]
    @Published var isUsingServerPack = false
    
    var isReadyToGenerate: Bool {
        guard let manifest = activeManifest else { return false }
        return MediaPackManager.shared.isReadyToGenerate(selections, for: manifest)
    }
    
    func reset() {
        selections.removeAll()
    }
    
    func setManifest(_ manifest: PackManifest?) {
        activeManifest = manifest
        isUsingServerPack = manifest != nil
        selections.removeAll()
    }
}

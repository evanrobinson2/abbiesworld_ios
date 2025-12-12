//
//  SSEService.swift
//  My First Swift
//
//  Created by AI Assistant
//

import Foundation
import Combine
import UIKit

/// Server-Sent Events (SSE) event types
enum SSEEventType: String {
    case connected
    case reloadCache = "reload_cache"
    case configUpdate = "config_update"
    case refreshIngredients = "refresh_ingredients"
    case backgroundChanged = "background_changed"
    case maintenance
    case fetchLogs = "fetch_logs"
    case toast
    case unknown
}

/// SSE Event structure
struct SSEEvent {
    let type: SSEEventType
    let data: [String: Any]
    let timestamp: Date
    
    init(type: SSEEventType, data: [String: Any] = [:]) {
        self.type = type
        self.data = data
        self.timestamp = Date()
    }
}

/// Service for handling Server-Sent Events from the backend
class SSEService: ObservableObject {
    static let shared = SSEService()
    
    @Published var isConnected = false
    @Published var lastEvent: SSEEvent?
    
    /// Base URL from centralized ServerConfig
    private var baseURL: String {
        return ServerConfig.shared.baseURL
    }
    
    private var urlSession: URLSession?
    private var dataTask: URLSessionDataTask?
    private var eventSubject = PassthroughSubject<SSEEvent, Never>()
    private var cancellables = Set<AnyCancellable>()
    
    // Log collection for fetch_logs event
    private var logBuffer: [String] = []
    private let maxLogBufferSize = 1000
    
    init() {
        // Base URL is now managed by ServerConfig
    }
    
    // MARK: - Public Methods
    
    /// Start SSE connection to /api/events
    func connect() {
        guard !isConnected else {
            print("⚠️ SSEService: Already connected")
            return
        }
        
        guard let url = URL(string: "\(baseURL)/api/events") else {
            print("❌ SSEService: Invalid URL: \(baseURL)/api/events")
            return
        }
        
        print("🔌 SSEService: Connecting to \(url.absoluteString)")
        
        var request = URLRequest(url: url)
        request.setValue("text/event-stream", forHTTPHeaderField: "Accept")
        request.timeoutInterval = 0 // No timeout for SSE
        
        let configuration = URLSessionConfiguration.default
        configuration.timeoutIntervalForRequest = 0
        configuration.timeoutIntervalForResource = 0
        urlSession = URLSession(configuration: configuration)
        
        dataTask = urlSession?.dataTask(with: request) { [weak self] data, response, error in
            if let error = error {
                print("❌ SSEService: Connection error: \(error)")
                DispatchQueue.main.async {
                    self?.isConnected = false
                }
                // Attempt reconnection after delay
                DispatchQueue.main.asyncAfter(deadline: .now() + 5.0) {
                    self?.connect()
                }
                return
            }
            
            guard let httpResponse = response as? HTTPURLResponse else {
                print("❌ SSEService: Invalid response")
                return
            }
            
            if httpResponse.statusCode == 200 {
                print("✅ SSEService: Connected successfully")
                DispatchQueue.main.async {
                    self?.isConnected = true
                }
            } else {
                print("❌ SSEService: Connection failed with status: \(httpResponse.statusCode)")
                DispatchQueue.main.async {
                    self?.isConnected = false
                }
            }
        }
        
        // Start reading stream (using async/await with URLSession bytes API)
        dataTask?.resume()
        startReadingStream()
    }
    
    /// Disconnect from SSE stream
    func disconnect() {
        print("🔌 SSEService: Disconnecting")
        dataTask?.cancel()
        dataTask = nil
        urlSession?.invalidateAndCancel()
        urlSession = nil
        isConnected = false
    }
    
    /// Subscribe to SSE events
    func eventPublisher() -> AnyPublisher<SSEEvent, Never> {
        return eventSubject.eraseToAnyPublisher()
    }
    
    // MARK: - Private Methods
    
    private func startReadingStream() {
        guard let url = URL(string: "\(baseURL)/api/events") else { return }
        
        var request = URLRequest(url: url)
        request.setValue("text/event-stream", forHTTPHeaderField: "Accept")
        request.timeoutInterval = 0 // No timeout for SSE
        
        // Use async/await with URLSession bytes API (iOS 15+)
        Task {
            do {
                let (asyncBytes, response) = try await URLSession.shared.bytes(for: request)
                
                guard let httpResponse = response as? HTTPURLResponse,
                      httpResponse.statusCode == 200 else {
                    print("❌ SSEService: Invalid response: \(response)")
                    await MainActor.run {
                        self.isConnected = false
                    }
                    return
                }
                
                print("✅ SSEService: Stream connected")
                await MainActor.run {
                    self.isConnected = true
                }
                
                var buffer = ""
                for try await byte in asyncBytes {
                    if let char = String(data: Data([byte]), encoding: .utf8) {
                        buffer.append(char)
                        
                        // Look for complete SSE messages (ending with \n\n)
                        while let doubleNewlineRange = buffer.range(of: "\n\n") {
                            // Extract message up to the double newline
                            let messageEndIndex = doubleNewlineRange.lowerBound
                            guard messageEndIndex <= buffer.endIndex else {
                                break
                            }
                            
                            let message = String(buffer[buffer.startIndex..<messageEndIndex])
                            
                            // Remove processed message from buffer
                            // upperBound is already the index after the "\n\n"
                            let afterNewlines = doubleNewlineRange.upperBound
                            guard afterNewlines <= buffer.endIndex else {
                                buffer = ""
                                break
                            }
                            
                            if afterNewlines == buffer.endIndex {
                                buffer = ""
                            } else {
                                buffer = String(buffer[afterNewlines...])
                            }
                            
                            if !message.isEmpty {
                                await processSSEMessage(message)
                            }
                        }
                    }
                }
                
                // Stream ended
                print("⚠️ SSEService: Stream ended")
                await MainActor.run {
                    self.isConnected = false
                }
                
                // Attempt reconnection after delay
                try? await Task.sleep(nanoseconds: 5_000_000_000) // 5 seconds
                startReadingStream()
                
            } catch {
                print("❌ SSEService: Stream error: \(error)")
                await MainActor.run {
                    self.isConnected = false
                }
                // Attempt reconnection after delay
                try? await Task.sleep(nanoseconds: 5_000_000_000) // 5 seconds
                startReadingStream()
            }
        }
    }
    
    private func processSSEMessage(_ message: String) async {
        // SSE format:
        // - Lines starting with "data: " contain JSON events
        // - Lines starting with ": " are comments (keepalives) - ignore these
        let lines = message.components(separatedBy: "\n")
        for line in lines {
            if line.hasPrefix("data: ") {
                let jsonString = String(line.dropFirst(6)) // Remove "data: "
                await processSSELine(jsonString)
            } else if line.hasPrefix(": ") {
                // SSE comment (keepalive) - ignore, just keeps connection alive
                // No action needed
            }
        }
    }
    
    private func processSSELine(_ jsonString: String) async {
        guard let jsonData = jsonString.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any] else {
            print("⚠️ SSEService: Failed to parse JSON: \(jsonString)")
            return
        }
        
        let eventTypeString = json["type"] as? String ?? "unknown"
        let eventType = SSEEventType(rawValue: eventTypeString) ?? .unknown
        let eventData = json["data"] as? [String: Any] ?? [:]
        
        let event = SSEEvent(type: eventType, data: eventData)
        
        print("📥 SSEService: Received event: \(eventType.rawValue)")
        
        await MainActor.run {
            self.lastEvent = event
            self.eventSubject.send(event)
            self.handleEvent(event)
        }
    }
    
    private func handleEvent(_ event: SSEEvent) {
        switch event.type {
        case .connected:
            print("✅ SSEService: Connection confirmed")
            
        case .reloadCache:
            print("🔄 SSEService: Reloading cache")
            ImageCache.shared.clearCache()
            
        case .configUpdate:
            print("⚙️ SSEService: Config updated")
            // Could trigger a config reload in MainViewModel
            NotificationCenter.default.post(name: NSNotification.Name("ConfigUpdated"), object: nil)
            
        case .refreshIngredients:
            print("🔄 SSEService: Refreshing ingredients")
            NotificationCenter.default.post(name: NSNotification.Name("RefreshIngredients"), object: nil)
            
        case .backgroundChanged:
            print("🖼️ SSEService: Background changed")
            if let backgroundURL = event.data["background_url"] as? String {
                NotificationCenter.default.post(
                    name: NSNotification.Name("BackgroundChanged"),
                    object: backgroundURL
                )
            }
            
        case .maintenance:
            print("🔧 SSEService: Maintenance mode")
            let enabled = event.data["enabled"] as? Bool ?? true
            NotificationCenter.default.post(
                name: NSNotification.Name("MaintenanceMode"),
                object: enabled
            )
            
        case .fetchLogs:
            print("📋 SSEService: Fetch logs requested")
            uploadLogs()
            
        case .toast:
            print("🔔 SSEService: Toast notification received")
            // Toast is handled by MainViewModel via eventSubject
            break
            
        case .unknown:
            print("⚠️ SSEService: Unknown event type")
        }
    }
    
    private func uploadLogs() {
        // Collect logs from buffer and console output
        var logs: [String] = []
        
        // Add buffered logs
        logs.append(contentsOf: logBuffer)
        
        // Add recent console logs if available
        // Note: iOS doesn't provide direct access to console logs
        // This would need to be implemented with a logging framework
        
        // Get device identifier
        let deviceId = UIDevice.current.identifierForVendor?.uuidString ?? "unknown"
        let timestamp = Date().timeIntervalSince1970
        
        let payload: [String: Any] = [
            "logs": logs,
            "device_id": deviceId,
            "timestamp": timestamp
        ]
        
        guard let url = URL(string: "\(baseURL)/api/logs/upload"),
              let jsonData = try? JSONSerialization.data(withJSONObject: payload) else {
            print("❌ SSEService: Failed to create log upload request")
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = jsonData
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                print("❌ SSEService: Log upload error: \(error)")
                return
            }
            
            if let httpResponse = response as? HTTPURLResponse,
               httpResponse.statusCode == 200 {
                print("✅ SSEService: Logs uploaded successfully")
            } else {
                print("⚠️ SSEService: Log upload failed")
            }
        }.resume()
    }
    
    /// Add a log entry to the buffer (for fetch_logs functionality)
    func addLog(_ message: String) {
        logBuffer.append("\(Date().timeIntervalSince1970): \(message)")
        
        // Keep buffer size manageable
        if logBuffer.count > maxLogBufferSize {
            logBuffer.removeFirst(logBuffer.count - maxLogBufferSize)
        }
    }
}


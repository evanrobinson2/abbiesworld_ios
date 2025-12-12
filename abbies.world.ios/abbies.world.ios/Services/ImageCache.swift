//
//  ImageCache.swift
//  My First Swift
//
//  Created by Evan Robinson on 12/9/25.
//

import Foundation
import UIKit

class ImageCache {
    static let shared = ImageCache()
    
    // Memory cache
    private let memoryCache = NSCache<NSString, UIImage>()
    
    // Disk cache directory
    private let cacheDirectory: URL
    
    // Maximum cache sizes
    private let maxMemoryCacheSize: Int = 50 * 1024 * 1024 // 50MB
    private let maxDiskCacheSize: Int64 = 100 * 1024 * 1024 // 100MB
    
    private init() {
        // Configure memory cache
        memoryCache.totalCostLimit = maxMemoryCacheSize
        memoryCache.countLimit = 200 // Max 200 images in memory
        
        // Setup disk cache directory
        let cachesDir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
        cacheDirectory = cachesDir.appendingPathComponent("ImageCache", isDirectory: true)
        
        // Create cache directory if it doesn't exist
        try? FileManager.default.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
        
        // Clean old cache on init (optional - can be called manually)
        cleanOldCacheIfNeeded()
    }
    
    // MARK: - Public Methods
    
    /// Load image from URL with caching
    func loadImage(from url: URL) async throws -> UIImage? {
        // Check memory cache first
        if let cachedImage = memoryCache.object(forKey: url.absoluteString as NSString) {
            return cachedImage
        }
        
        // Check disk cache
        if let diskImage = loadFromDisk(url: url) {
            // Store in memory cache for faster access
            storeInMemory(image: diskImage, for: url)
            return diskImage
        }
        
        // Download from network
        return try await downloadAndCache(url: url)
    }
    
    /// Get cached image if available (synchronous)
    func getCachedImage(for url: URL) -> UIImage? {
        // Check memory cache
        if let cachedImage = memoryCache.object(forKey: url.absoluteString as NSString) {
            return cachedImage
        }
        
        // Check disk cache
        return loadFromDisk(url: url)
    }
    
    /// Clear all caches
    func clearCache() {
        memoryCache.removeAllObjects()
        try? FileManager.default.removeItem(at: cacheDirectory)
        try? FileManager.default.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
    }
    
    /// Get total cache size in bytes
    func cacheSize() -> Int64 {
        guard let files = try? FileManager.default.contentsOfDirectory(at: cacheDirectory, includingPropertiesForKeys: [.fileSizeKey]) else {
            return 0
        }
        
        var totalSize: Int64 = 0
        for file in files {
            if let size = try? file.resourceValues(forKeys: [.fileSizeKey]).fileSize {
                totalSize += Int64(size)
            }
        }
        return totalSize
    }
    
    // MARK: - Private Methods
    
    private func downloadAndCache(url: URL) async throws -> UIImage? {
        let (data, response) = try await URLSession.shared.data(from: url)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }
        
        guard let image = UIImage(data: data) else {
            throw URLError(.cannotDecodeContentData)
        }
        
        // Store in both caches
        storeInMemory(image: image, for: url)
        storeOnDisk(image: image, data: data, url: url)
        
        return image
    }
    
    private func storeInMemory(image: UIImage, for url: URL) {
        // Estimate memory cost (rough calculation)
        let cost = Int(image.size.width * image.size.height * 4) // 4 bytes per pixel (RGBA)
        memoryCache.setObject(image, forKey: url.absoluteString as NSString, cost: cost)
    }
    
    private func storeOnDisk(image: UIImage, data: Data, url: URL) {
        let filename = urlToFilename(url: url)
        let fileURL = cacheDirectory.appendingPathComponent(filename)
        
        try? data.write(to: fileURL)
    }
    
    private func loadFromDisk(url: URL) -> UIImage? {
        let filename = urlToFilename(url: url)
        let fileURL = cacheDirectory.appendingPathComponent(filename)
        
        guard let data = try? Data(contentsOf: fileURL),
              let image = UIImage(data: data) else {
            return nil
        }
        
        return image
    }
    
    private func urlToFilename(url: URL) -> String {
        // Create a safe filename from URL
        let urlString = url.absoluteString
        let hash = urlString.hash
        let ext = url.pathExtension.isEmpty ? "png" : url.pathExtension
        return "\(abs(hash)).\(ext)"
    }
    
    private func cleanOldCacheIfNeeded() {
        let currentSize = cacheSize()
        if currentSize > maxDiskCacheSize {
            // Remove oldest files (simple FIFO - remove files older than 7 days)
            guard let files = try? FileManager.default.contentsOfDirectory(at: cacheDirectory, includingPropertiesForKeys: [.contentModificationDateKey]) else {
                return
            }
            
            let sevenDaysAgo = Date().addingTimeInterval(-7 * 24 * 60 * 60)
            for file in files {
                if let modDate = try? file.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate,
                   modDate < sevenDaysAgo {
                    try? FileManager.default.removeItem(at: file)
                }
            }
        }
    }
}

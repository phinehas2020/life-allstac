//
//  ImageLoader.swift
//  LifeApp
//
//  High-performance image caching with memory and disk storage
//

import SwiftUI
import Combine

// MARK: - Image Cache Manager
final class ImageCache {
    static let shared = ImageCache()

    private let memoryCache = NSCache<NSString, UIImage>()
    private let fileManager = FileManager.default
    private let cacheDirectory: URL
    private let maxMemoryCacheSize = 100 // Max number of images in memory
    private let maxDiskCacheAge: TimeInterval = 7 * 24 * 60 * 60 // 7 days

    private init() {
        // Setup memory cache
        memoryCache.countLimit = maxMemoryCacheSize

        // Setup disk cache directory
        let cacheDir = fileManager.urls(for: .cachesDirectory, in: .userDomainMask).first!
        cacheDirectory = cacheDir.appendingPathComponent("ImageCache", isDirectory: true)

        try? fileManager.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)

        // Clean old disk cache on init
        Task.detached(priority: .background) { [weak self] in
            self?.cleanDiskCache()
        }
    }

    // MARK: - Cache Key
    private func cacheKey(for url: URL) -> String {
        return url.absoluteString.data(using: .utf8)?.base64EncodedString() ?? url.absoluteString
    }

    private func diskCacheURL(for url: URL) -> URL {
        let key = cacheKey(for: url)
        return cacheDirectory.appendingPathComponent(key)
    }

    // MARK: - Memory Cache
    func imageFromMemory(for url: URL) -> UIImage? {
        let key = cacheKey(for: url) as NSString
        return memoryCache.object(forKey: key)
    }

    func storeInMemory(_ image: UIImage, for url: URL) {
        let key = cacheKey(for: url) as NSString
        memoryCache.setObject(image, forKey: key)
    }

    // MARK: - Disk Cache
    func imageFromDisk(for url: URL) -> UIImage? {
        let fileURL = diskCacheURL(for: url)
        guard let data = try? Data(contentsOf: fileURL),
              let image = UIImage(data: data) else {
            return nil
        }
        // Also store in memory for faster subsequent access
        storeInMemory(image, for: url)
        return image
    }

    func storeOnDisk(_ image: UIImage, for url: URL) {
        let fileURL = diskCacheURL(for: url)
        guard let data = image.jpegData(compressionQuality: 0.9) else { return }
        try? data.write(to: fileURL, options: .atomic)
    }

    // MARK: - Combined Access
    func image(for url: URL) -> UIImage? {
        // Try memory first (fastest)
        if let image = imageFromMemory(for: url) {
            return image
        }
        // Then try disk
        return imageFromDisk(for: url)
    }

    func store(_ image: UIImage, for url: URL) {
        storeInMemory(image, for: url)
        // Disk storage is async to avoid blocking
        Task.detached(priority: .background) { [weak self] in
            self?.storeOnDisk(image, for: url)
        }
    }

    // MARK: - Cache Cleanup
    private func cleanDiskCache() {
        guard let urls = try? fileManager.contentsOfDirectory(at: cacheDirectory, includingPropertiesForKeys: [.contentModificationDateKey]) else { return }

        let expirationDate = Date().addingTimeInterval(-maxDiskCacheAge)

        for url in urls {
            guard let resourceValues = try? url.resourceValues(forKeys: [.contentModificationDateKey]),
                  let modificationDate = resourceValues.contentModificationDate,
                  modificationDate < expirationDate else { continue }

            try? fileManager.removeItem(at: url)
        }
    }

    func clearAll() {
        memoryCache.removeAllObjects()
        try? fileManager.removeItem(at: cacheDirectory)
        try? fileManager.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
    }
}

// MARK: - Image Loader
@MainActor
class ImageLoader: ObservableObject {
    @Published var image: UIImage?
    @Published var isLoading = false
    @Published var error: Error?

    private var task: Task<Void, Never>?
    private let url: URL?

    init(url: URL?) {
        self.url = url
        if url != nil {
            loadImage()
        }
    }

    deinit {
        task?.cancel()
    }

    func loadImage() {
        guard let url = url else {
            error = NSError(domain: "ImageLoader", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"])
            return
        }

        // Check cache first
        if let cachedImage = ImageCache.shared.image(for: url) {
            self.image = cachedImage
            return
        }

        isLoading = true
        error = nil

        task = Task { [weak self] in
            do {
                let (data, _) = try await URLSession.shared.data(from: url)

                guard !Task.isCancelled else { return }

                if let loadedImage = UIImage(data: data) {
                    // Cache the image
                    ImageCache.shared.store(loadedImage, for: url)

                    await MainActor.run { [weak self] in
                        self?.image = loadedImage
                        self?.isLoading = false
                    }
                } else {
                    await MainActor.run { [weak self] in
                        self?.error = NSError(domain: "ImageLoader", code: -2, userInfo: [NSLocalizedDescriptionKey: "Failed to decode image"])
                        self?.isLoading = false
                    }
                }
            } catch {
                guard !Task.isCancelled else { return }
                await MainActor.run { [weak self] in
                    self?.error = error
                    self?.isLoading = false
                }
            }
        }
    }

    func cancel() {
        task?.cancel()
        task = nil
    }
}

// MARK: - Cached Async Image View
struct CachedAsyncImage<Content: View, Placeholder: View>: View {
    private let url: URL?
    private let content: (Image) -> Content
    private let placeholder: () -> Placeholder

    @StateObject private var loader: ImageLoader

    init(
        url: URL?,
        @ViewBuilder content: @escaping (Image) -> Content,
        @ViewBuilder placeholder: @escaping () -> Placeholder
    ) {
        self.url = url
        self.content = content
        self.placeholder = placeholder
        _loader = StateObject(wrappedValue: ImageLoader(url: url))
    }

    var body: some View {
        Group {
            if let uiImage = loader.image {
                content(Image(uiImage: uiImage))
            } else if loader.isLoading {
                placeholder()
            } else if loader.error != nil {
                // Error state - show placeholder with error indicator
                placeholder()
                    .overlay(
                        Image(systemName: "exclamationmark.triangle")
                            .font(.caption)
                            .foregroundColor(.gray)
                    )
            } else {
                placeholder()
            }
        }
    }
}

// MARK: - Convenience Init
extension CachedAsyncImage where Placeholder == ProgressView<EmptyView, EmptyView> {
    init(
        url: URL?,
        @ViewBuilder content: @escaping (Image) -> Content
    ) {
        self.init(url: url, content: content, placeholder: { ProgressView() })
    }
}

// MARK: - Blurhash Placeholder Support
struct BlurHashPlaceholder: View {
    let blurhash: String?
    let size: CGSize

    @State private var blurImage: UIImage?

    var body: some View {
        Group {
            if let image = blurImage {
                Image(uiImage: image)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } else {
                Rectangle()
                    .fill(Color.gray.opacity(0.2))
            }
        }
        .onAppear {
            // Decode blurhash on background thread
            if let hash = blurhash {
                Task.detached(priority: .userInitiated) {
                    let image = UIImage.from(blurHash: hash, size: size)
                    await MainActor.run {
                        blurImage = image
                    }
                }
            }
        }
    }
}

// MARK: - UIImage Blurhash Extension (Simple Implementation)
extension UIImage {
    static func from(blurHash: String, size: CGSize, punch: Float = 1.0) -> UIImage? {
        // This is a simplified blurhash decoder
        // For full implementation, add the BlurHash Swift package
        guard blurHash.count >= 6 else { return nil }

        // Create a simple gradient based on blurhash
        // The first character encodes size info, subsequent chars encode DC and AC components
        let characters = Array(blurHash)
        let sizeFlag = decode83(String(characters[0]))
        let numY = (sizeFlag / 9) + 1
        let numX = (sizeFlag % 9) + 1

        guard numX >= 1, numY >= 1 else { return nil }

        // Decode the average color (DC component)
        let quantisedMaximumValue = decode83(String(characters[1]))
        let maximumValue = Float(quantisedMaximumValue + 1) / 166.0

        let dcValue = decode83(String(characters[2..<6]))
        let colors = decodeDC(dcValue)

        // Create image with average color
        let width = Int(size.width)
        let height = Int(size.height)
        let bytesPerRow = width * 4

        var pixels = [UInt8](repeating: 0, count: width * height * 4)

        for y in 0..<height {
            for x in 0..<width {
                let index = (y * width + x) * 4
                pixels[index] = UInt8(clamping: Int(colors.0 * 255))
                pixels[index + 1] = UInt8(clamping: Int(colors.1 * 255))
                pixels[index + 2] = UInt8(clamping: Int(colors.2 * 255))
                pixels[index + 3] = 255
            }
        }

        guard let provider = CGDataProvider(data: Data(pixels) as CFData),
              let cgImage = CGImage(
                width: width,
                height: height,
                bitsPerComponent: 8,
                bitsPerPixel: 32,
                bytesPerRow: bytesPerRow,
                space: CGColorSpaceCreateDeviceRGB(),
                bitmapInfo: CGBitmapInfo(rawValue: CGImageAlphaInfo.premultipliedLast.rawValue),
                provider: provider,
                decode: nil,
                shouldInterpolate: true,
                intent: .defaultIntent
              ) else { return nil }

        return UIImage(cgImage: cgImage)
    }

    private static func decode83(_ str: String) -> Int {
        let characters = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~"
        var value = 0
        for char in str {
            if let index = characters.firstIndex(of: char) {
                value = value * 83 + characters.distance(from: characters.startIndex, to: index)
            }
        }
        return value
    }

    private static func decodeDC(_ value: Int) -> (Float, Float, Float) {
        let intR = value >> 16
        let intG = (value >> 8) & 255
        let intB = value & 255
        return (sRGBToLinear(intR), sRGBToLinear(intG), sRGBToLinear(intB))
    }

    private static func sRGBToLinear(_ value: Int) -> Float {
        let v = Float(value) / 255.0
        if v <= 0.04045 {
            return v / 12.92
        } else {
            return pow((v + 0.055) / 1.055, 2.4)
        }
    }
}

// MARK: - Legacy Loadable Image View (for backwards compatibility)
struct LoadableImageView: View {
    @StateObject private var loader: ImageLoader
    let height: CGFloat

    init(url: String, height: CGFloat = 400) {
        self.height = height
        _loader = StateObject(wrappedValue: ImageLoader(url: URL(string: url)))
    }

    var body: some View {
        Group {
            if let image = loader.image {
                Image(uiImage: image)
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(height: height)
            } else if loader.isLoading {
                ProgressView()
                    .frame(height: height)
            } else {
                VStack {
                    Image(systemName: "photo")
                        .font(.largeTitle)
                        .foregroundColor(.gray)
                    Text("Failed to load image")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .frame(height: height)
            }
        }
    }
}

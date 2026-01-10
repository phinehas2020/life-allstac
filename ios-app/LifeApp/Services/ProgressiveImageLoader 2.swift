//
//  ProgressiveImageLoader.swift
//  LifeApp
//
//  Progressive image loading: thumbnail -> blurhash -> full image
//

import SwiftUI

@MainActor
class ProgressiveImageLoader: ObservableObject {
    @Published var thumbnailImage: UIImage?
    @Published var fullImage: UIImage?
    @Published var isLoading = false
    @Published var error: Error?

    private var task: Task<Void, Never>?
    private let url: URL?
    private let thumbnailUrl: URL?

    init(url: URL?, thumbnailUrl: URL? = nil) {
        self.url = url
        self.thumbnailUrl = thumbnailUrl
        loadProgressively()
    }

    deinit {
        task?.cancel()
    }

    private func loadProgressively() {
        guard let url = url else {
            error = NSError(domain: "ProgressiveImageLoader", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"])
            return
        }

        isLoading = true
        error = nil

        task = Task { [weak self] in
            // Step 1: Load thumbnail if available
            if let thumbnailUrl = self?.thumbnailUrl,
               let cachedThumb = ImageCache.shared.image(for: thumbnailUrl) {
                await MainActor.run { [weak self] in
                    self?.thumbnailImage = cachedThumb
                }
            } else if let thumbnailUrl = self?.thumbnailUrl {
                do {
                    var request = URLRequest(url: thumbnailUrl)
                    if let token = AuthTokenManager.shared.getAccessToken() {
                        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                    }
                    request.setValue("image/avif,image/webp,image/*;q=0.8", forHTTPHeaderField: "Accept")

                    let (data, response) = try await URLSession.shared.data(for: request)

                    if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode != 200 {
                        throw NSError(domain: "ProgressiveImageLoader", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "HTTP Error \(httpResponse.statusCode)"])
                    }

                    guard !Task.isCancelled else { return }

                    if let thumbImage = UIImage(data: data) {
                        ImageCache.shared.store(thumbImage, for: thumbnailUrl)
                        await MainActor.run { [weak self] in
                            self?.thumbnailImage = thumbImage
                        }
                    }
                } catch {
                    // Thumbnail failure is not critical, continue to full image
                }
            }

            // Step 2: Load full image
            do {
                var request = URLRequest(url: url)
                if let token = AuthTokenManager.shared.getAccessToken() {
                    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                }
                request.setValue("image/avif,image/webp,image/*;q=0.8", forHTTPHeaderField: "Accept")

                let (data, response) = try await URLSession.shared.data(for: request)

                if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode != 200 {
                    await MainActor.run { [weak self] in
                        self?.error = NSError(domain: "ProgressiveImageLoader", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "HTTP Error \(httpResponse.statusCode)"])
                        self?.isLoading = false
                    }
                    return
                }

                guard !Task.isCancelled else { return }

                if let loadedImage = UIImage(data: data) {
                    ImageCache.shared.store(loadedImage, for: url)
                    await MainActor.run { [weak self] in
                        self?.fullImage = loadedImage
                        self?.isLoading = false
                    }
                } else {
                    await MainActor.run { [weak self] in
                        self?.error = NSError(domain: "ProgressiveImageLoader", code: -2, userInfo: [NSLocalizedDescriptionKey: "Failed to decode image"])
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
}

struct ProgressiveAsyncImage<Content: View, Placeholder: View>: View {
    private let url: URL?
    private let thumbnailUrl: URL?
    private let content: (Image) -> Content
    private let placeholder: () -> Placeholder

    @State private var thumbnailImage: UIImage?
    @State private var fullImage: UIImage?
    @State private var showThumbnail = true

    init(
        url: URL?,
        thumbnailUrl: URL? = nil,
        @ViewBuilder content: @escaping (Image) -> Content,
        @ViewBuilder placeholder: @escaping () -> Placeholder
    ) {
        self.url = url
        self.thumbnailUrl = thumbnailUrl
        self.content = content
        self.placeholder = placeholder
    }

    var body: some View {
        Group {
            if let fullImage = fullImage {
                content(Image(uiImage: fullImage))
                    .transition(.opacity)
            } else if let thumbnailImage = thumbnailImage {
                content(Image(uiImage: thumbnailImage))
                    .transition(.opacity)
            } else {
                placeholder()
            }
        }
        .onAppear {
            loadImages()
        }
    }

    private func loadImages() {
        guard let url = url else {
            return
        }

        // Check cache first
        if let cachedFullImage = ImageCache.shared.image(for: url) {
            fullImage = cachedFullImage
            return
        }

        // Load thumbnail first if available
        if let thumbnailUrl = thumbnailUrl, let cachedThumb = ImageCache.shared.image(for: thumbnailUrl) {
            thumbnailImage = cachedThumb
        } else if let thumbnailUrl = thumbnailUrl {
            Task {
                do {
                    var request = URLRequest(url: thumbnailUrl)
                    if let token = AuthTokenManager.shared.getAccessToken() {
                        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                    }
                    request.setValue("image/avif,image/webp,image/*;q=0.8", forHTTPHeaderField: "Accept")

                    let (data, response) = try await URLSession.shared.data(for: request)

                    if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200,
                       let thumbImage = UIImage(data: data) {
                        ImageCache.shared.store(thumbImage, for: thumbnailUrl)
                        thumbnailImage = thumbImage
                    }
                } catch {}
            }
        }

        // Load full image
        Task {
            do {
                var request = URLRequest(url: url)
                if let token = AuthTokenManager.shared.getAccessToken() {
                    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                }
                request.setValue("image/avif,image/webp,image/*;q=0.8", forHTTPHeaderField: "Accept")

                let (data, response) = try await URLSession.shared.data(for: request)

                if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200,
                   let loadedImage = UIImage(data: data) {
                    ImageCache.shared.store(loadedImage, for: url)
                    fullImage = loadedImage
                }
            } catch {}
        }
    }
}

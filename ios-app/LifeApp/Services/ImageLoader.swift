//
//  ImageLoader.swift
//  LifeApp
//
//  Custom image loader that prevents cancellation
//

import SwiftUI
import Combine

class ImageLoader: ObservableObject {
    @Published var image: UIImage?
    @Published var isLoading = false
    @Published var error: Error?
    
    private var cancellable: AnyCancellable?
    private let url: URL
    
    init(url: URL) {
        self.url = url
        loadImage()
    }
    
    deinit {
        cancellable?.cancel()
    }
    
    private func loadImage() {
        isLoading = true
        error = nil
        
        cancellable = URLSession.shared.dataTaskPublisher(for: url)
            .map { UIImage(data: $0.data) }
            .replaceError(with: nil)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] loadedImage in
                self?.isLoading = false
                self?.image = loadedImage
                if loadedImage == nil {
                    self?.error = NSError(domain: "ImageLoader", code: -1, userInfo: [NSLocalizedDescriptionKey: "Failed to load image"])
                }
            }
    }
    
    func cancel() {
        cancellable?.cancel()
        cancellable = nil
    }
}

struct LoadableImageView: View {
    @StateObject private var loader: ImageLoader
    let height: CGFloat
    
    init(url: String, height: CGFloat = 400) {
        self.height = height
        if let urlObj = URL(string: url) {
            _loader = StateObject(wrappedValue: ImageLoader(url: urlObj))
        } else {
            // Create a loader with a dummy URL if invalid - it will show error state
            _loader = StateObject(wrappedValue: ImageLoader(url: URL(string: "about:blank")!))
        }
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


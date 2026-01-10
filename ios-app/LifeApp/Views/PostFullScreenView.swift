//
//  PostFullScreenView.swift
//  LifeApp
//
//  Instagram-style full screen post overlay
//

import SwiftUI
import AVKit

struct PostFullScreenView: View {
    let post: Post
    @Binding var showComments: Bool
    @Environment(\.dismiss) private var dismiss

    @State private var isLiked: Bool
    @State private var likeCount: Int
    @State private var isAnimatingLike = false
    @State private var showHeartOverlay = false
    @State private var scale: CGFloat = 1.0
    @State private var offset: CGSize = .zero
    @State private var isDragging = false
    @State private var isPlayingVideo = false
    @State private var player: AVPlayer?

    init(post: Post, showComments: Binding<Bool>) {
        self.post = post
        self._showComments = showComments
        _isLiked = State(initialValue: post.likedByCurrentUser ?? false)
        _likeCount = State(initialValue: post.stats?.likes ?? 0)
    }

    var body: some View {
        GeometryReader { geometry in
            ZStack {
                // Background
                Color.black
                    .ignoresSafeArea()
                    .opacity(backgroundOpacity)

                // Main content
                VStack(spacing: 0) {
                    // Top bar
                    topBar

                    Spacer()

                    // Media
                    mediaView(geometry: geometry)

                    Spacer()

                    // Bottom actions
                    bottomBar
                }

                // Heart overlay for double tap
                if showHeartOverlay {
                    Image(systemName: "heart.fill")
                        .font(.system(size: 100))
                        .foregroundColor(.white)
                        .shadow(color: .red.opacity(0.5), radius: 20)
                        .scaleEffect(showHeartOverlay ? 1.0 : 0.5)
                        .transition(.scale.combined(with: .opacity))
                }
            }
        }
        .gesture(dragGesture)
        .statusBarHidden(true)
    }

    private var backgroundOpacity: Double {
        let dragProgress = abs(offset.height) / 300
        return max(0.3, 1.0 - dragProgress)
    }

    // MARK: - Top Bar
    private var topBar: some View {
        HStack {
            Button(action: { dismiss() }) {
                Image(systemName: "xmark")
                    .font(.title2.weight(.semibold))
                    .foregroundColor(.white)
                    .frame(width: 44, height: 44)
                    .background(Color.white.opacity(0.2))
                    .clipShape(Circle())
            }

            Spacer()

            // User info
            HStack(spacing: 10) {
                Circle()
                    .fill(Color.white.opacity(0.3))
                    .frame(width: 36, height: 36)
                    .overlay(
                        Text(post.displayUsername.prefix(1).uppercased())
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.white)
                    )

                Text(post.displayUsername)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.white)
            }

            Spacer()

            Button(action: {}) {
                Image(systemName: "ellipsis")
                    .font(.title2)
                    .foregroundColor(.white)
                    .frame(width: 44, height: 44)
            }
        }
        .padding(.horizontal)
        .padding(.top, 8)
    }

    // MARK: - Media View
    private func mediaView(geometry: GeometryProxy) -> some View {
        let displayUrl = post.isVideo ? (post.thumbnailUrl ?? post.mediaUrl) : post.mediaUrl

        return Group {
            if post.isVideo && isPlayingVideo {
                // Video player
                if let player = player {
                    VideoPlayer(player: player)
                        .frame(maxWidth: geometry.size.width)
                        .aspectRatio(post.aspectRatio, contentMode: .fit)
                        .onDisappear {
                            player.pause()
                        }
                } else {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                }
            } else if let url = URL(string: displayUrl) {
                // Thumbnail/Image
                CachedAsyncImage(url: url) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(maxWidth: geometry.size.width)
                } placeholder: {
                    BlurHashPlaceholder(
                        blurhash: post.blurhash,
                        size: CGSize(width: 32, height: 32)
                    )
                    .aspectRatio(post.aspectRatio, contentMode: .fit)
                }
            }
        }
        .scaleEffect(scale)
        .offset(offset)
        .onTapGesture(count: 2) {
            handleDoubleTap()
        }
        .onTapGesture(count: 1) {
            if post.isVideo && !isPlayingVideo {
                playVideo()
            }
        }
        .overlay {
            if post.isVideo && !isPlayingVideo {
                Button(action: playVideo) {
                    Image(systemName: "play.circle.fill")
                        .font(.system(size: 70))
                        .foregroundColor(.white.opacity(0.9))
                        .shadow(color: .black.opacity(0.3), radius: 10)
                }
            }
        }
    }

    private func playVideo() {
        guard let videoURL = URL(string: post.mediaUrl) else { return }
        HapticManager.impact(.medium)
        player = AVPlayer(url: videoURL)
        isPlayingVideo = true
        player?.play()
    }

    // MARK: - Bottom Bar
    private var bottomBar: some View {
        VStack(spacing: 16) {
            // Caption
            if let caption = post.caption, !caption.isEmpty {
                Text(caption)
                    .font(.system(size: 15))
                    .foregroundColor(.white)
                    .lineLimit(2)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal)
            }

            // Actions
            HStack(spacing: 24) {
                // Like
                Button(action: toggleLike) {
                    HStack(spacing: 6) {
                        Image(systemName: isLiked ? "heart.fill" : "heart")
                            .font(.title2)
                            .foregroundColor(isLiked ? .red : .white)
                            .scaleEffect(isAnimatingLike ? 1.3 : 1.0)

                        if likeCount > 0 {
                            Text("\(likeCount)")
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundColor(.white)
                        }
                    }
                }

                // Comments
                Button(action: {
                    HapticManager.impact(.medium)
                    showComments = true
                }) {
                    HStack(spacing: 6) {
                        Image(systemName: "bubble.right")
                            .font(.title2)
                            .foregroundColor(.white)

                        if let comments = post.comments, !comments.isEmpty {
                            Text("\(comments.count)")
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundColor(.white)
                        }
                    }
                }

                // Share
                Button(action: {}) {
                    Image(systemName: "paperplane")
                        .font(.title2)
                        .foregroundColor(.white)
                }

                Spacer()

                // Bookmark
                Button(action: {}) {
                    Image(systemName: "bookmark")
                        .font(.title2)
                        .foregroundColor(.white)
                }
            }
            .padding(.horizontal)
            .padding(.bottom, 30)
        }
    }

    // MARK: - Gestures
    private var dragGesture: some Gesture {
        DragGesture()
            .onChanged { value in
                isDragging = true
                offset = value.translation
                let dragProgress = abs(value.translation.height) / 300
                scale = max(0.8, 1.0 - dragProgress * 0.2)
            }
            .onEnded { value in
                isDragging = false
                if abs(value.translation.height) > 150 || abs(value.velocity.height) > 500 {
                    dismiss()
                } else {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                        offset = .zero
                        scale = 1.0
                    }
                }
            }
    }

    // MARK: - Actions
    private func handleDoubleTap() {
        if !isLiked {
            toggleLike()
        }

        withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
            showHeartOverlay = true
        }

        HapticManager.notification(.success)

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
            withAnimation(.easeOut(duration: 0.2)) {
                showHeartOverlay = false
            }
        }
    }

    private func toggleLike() {
        let previousState = isLiked
        let previousCount = likeCount

        HapticManager.impact(.medium)

        withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
            isLiked.toggle()
            likeCount += isLiked ? 1 : -1
            if likeCount < 0 { likeCount = 0 }
            isAnimatingLike = true
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
            withAnimation { isAnimatingLike = false }
        }

        Task {
            do {
                try await ApiService.shared.likePost(postId: post.id)
            } catch {
                await MainActor.run {
                    withAnimation {
                        isLiked = previousState
                        likeCount = previousCount
                    }
                }
            }
        }
    }
}

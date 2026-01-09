//
//  PostCardView.swift
//  LifeApp
//
//  Modern, animated post card with cached images
//

import SwiftUI

struct PostCardView: View {
    let post: Post
    @State private var isLiked: Bool
    @State private var likeCount: Int
    @State private var isAnimatingLike = false
    @State private var showHeartOverlay = false
    @State private var particles: [ParticleState] = []
    @State private var imageLoaded = false

    init(post: Post) {
        self.post = post
        _isLiked = State(initialValue: post.likedByCurrentUser ?? false)
        _likeCount = State(initialValue: post.stats?.likes ?? 0)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // User Header
            headerView

            // Image / Video with double-tap like
            mediaView

            // Actions Row
            actionsView

            // Likes Count with animation
            likesView

            // Caption
            captionView

            // Timestamp
            timestampView
        }
        .background(Theme.surface)
        .cornerRadius(Theme.Radius.xl)
        .shadow(color: Color.black.opacity(0.04), radius: 12, x: 0, y: 6)
        .padding(.horizontal, 12)
    }

    // MARK: - Header
    private var headerView: some View {
        HStack(spacing: 12) {
            // Animated avatar with gradient ring
            ZStack {
                // Gradient ring
                Circle()
                    .stroke(Theme.brandGradient, lineWidth: 2.5)
                    .frame(width: 48, height: 48)

                // Avatar
                avatarImage
                    .frame(width: 42, height: 42)
                    .clipShape(Circle())
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(post.displayUsername)
                    .font(Theme.Fonts.body().weight(.semibold))
                    .foregroundColor(Theme.text)

                if let events = post.events, let firstEvent = events.first {
                    Text(firstEvent.name)
                        .font(Theme.Fonts.caption())
                        .foregroundColor(Theme.secondaryText)
                }
            }

            Spacer()

            Button(action: {}) {
                Image(systemName: "ellipsis")
                    .font(.title3)
                    .foregroundColor(Theme.secondaryText)
                    .frame(width: 32, height: 32)
            }
        }
        .padding(.horizontal, Theme.Spacing.md)
        .padding(.top, Theme.Spacing.md)
    }

    @ViewBuilder
    private var avatarImage: some View {
        if let avatarUrl = post.user?.avatarUrl, let url = URL(string: avatarUrl) {
            CachedAsyncImage(url: url) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } placeholder: {
                avatarPlaceholder
            }
        } else {
            avatarPlaceholder
        }
    }

    private var avatarPlaceholder: some View {
        Circle()
            .fill(Theme.subtleGradient)
            .overlay(
                Text(post.displayUsername.prefix(1).uppercased())
                    .font(Theme.Fonts.body().weight(.bold))
                    .foregroundColor(Theme.accent)
            )
    }

    // MARK: - Media View
    private var mediaView: some View {
        ZStack {
            // Main image with blurhash placeholder
            if let url = URL(string: post.mediaUrl) {
                GeometryReader { geometry in
                    CachedAsyncImage(url: url) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(width: geometry.size.width)
                            .clipped()
                            .transition(.opacity.combined(with: .scale(scale: 1.02)))
                            .onAppear {
                                withAnimation(.smooth) {
                                    imageLoaded = true
                                }
                            }
                    } placeholder: {
                        BlurHashPlaceholder(
                            blurhash: post.blurhash,
                            size: CGSize(width: 32, height: 32)
                        )
                        .overlay(
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        )
                    }
                }
                .aspectRatio(post.aspectRatio, contentMode: .fit)
            } else {
                // Fallback for invalid URL
                Rectangle()
                    .fill(Color.gray.opacity(0.1))
                    .aspectRatio(1.0, contentMode: .fit)
                    .overlay(
                        VStack(spacing: 8) {
                            Image(systemName: "photo")
                                .font(.largeTitle)
                                .foregroundColor(.gray)
                            Text("Image unavailable")
                                .font(Theme.Fonts.caption())
                                .foregroundColor(Theme.secondaryText)
                        }
                    )
            }

            // Video play button
            if post.isVideo {
                Image(systemName: "play.circle.fill")
                    .font(.system(size: 60))
                    .foregroundColor(.white.opacity(0.9))
                    .shadow(color: Color.black.opacity(0.3), radius: 8)
            }

            // Heart overlay animation
            if showHeartOverlay {
                heartOverlayView
            }

            // Particle effects
            ForEach(particles) { particle in
                Circle()
                    .fill(particle.color)
                    .frame(width: particle.size, height: particle.size)
                    .offset(x: particle.x, y: particle.y)
                    .opacity(particle.opacity)
            }
        }
        .cornerRadius(Theme.Radius.lg)
        .shadow(color: Color.black.opacity(0.08), radius: 12, x: 0, y: 6)
        .padding(.horizontal, Theme.Spacing.sm)
        .contentShape(Rectangle())
        .onTapGesture(count: 2) {
            handleDoubleTap()
        }
    }

    private var heartOverlayView: some View {
        Image(systemName: "heart.fill")
            .font(.system(size: 80))
            .foregroundColor(.white)
            .shadow(color: Theme.likeColor.opacity(0.5), radius: 20)
            .scaleEffect(showHeartOverlay ? 1.0 : 0.5)
            .opacity(showHeartOverlay ? 1.0 : 0)
    }

    // MARK: - Actions Row
    private var actionsView: some View {
        HStack(spacing: 20) {
            // Like Button with animation
            Button(action: toggleLike) {
                ZStack {
                    // Background pulse
                    if isAnimatingLike {
                        Circle()
                            .fill(Theme.likeColor.opacity(0.2))
                            .frame(width: 44, height: 44)
                            .scaleEffect(isAnimatingLike ? 1.5 : 1.0)
                            .opacity(isAnimatingLike ? 0 : 1)
                    }

                    Image(systemName: isLiked ? "heart.fill" : "heart")
                        .font(.title2)
                        .foregroundColor(isLiked ? Theme.likeColor : Theme.text)
                        .scaleEffect(isAnimatingLike ? 1.3 : 1.0)
                }
            }
            .buttonStyle(ScaleButtonStyle())

            Button(action: {}) {
                Image(systemName: "bubble.right")
                    .font(.title2)
                    .foregroundColor(Theme.text)
            }
            .buttonStyle(ScaleButtonStyle())

            Button(action: {}) {
                Image(systemName: "paperplane")
                    .font(.title2)
                    .foregroundColor(Theme.text)
            }
            .buttonStyle(ScaleButtonStyle())

            Spacer()

            Button(action: {}) {
                Image(systemName: "bookmark")
                    .font(.title2)
                    .foregroundColor(Theme.text)
            }
            .buttonStyle(ScaleButtonStyle())
        }
        .padding(.horizontal, Theme.Spacing.md)
    }

    // MARK: - Likes View
    @ViewBuilder
    private var likesView: some View {
        if likeCount > 0 {
            Text("\(likeCount) \(likeCount == 1 ? "like" : "likes")")
                .font(Theme.Fonts.label())
                .foregroundColor(Theme.text)
                .padding(.horizontal, Theme.Spacing.md)
                .contentTransition(.numericText())
        }
    }

    // MARK: - Caption View
    @ViewBuilder
    private var captionView: some View {
        if let caption = post.caption, !caption.isEmpty {
            (
                Text(post.displayUsername)
                    .font(Theme.Fonts.body().weight(.semibold))
                    .foregroundColor(Theme.text)
                + Text(" ")
                + Text(caption)
                    .font(Theme.Fonts.body())
                    .foregroundColor(Theme.text)
            )
            .lineLimit(3)
            .padding(.horizontal, Theme.Spacing.md)
        }
    }

    // MARK: - Timestamp View
    private var timestampView: some View {
        Text(formattedDate)
            .font(Theme.Fonts.caption())
            .foregroundColor(Theme.secondaryText)
            .padding(.horizontal, Theme.Spacing.md)
            .padding(.bottom, Theme.Spacing.md)
    }

    private var formattedDate: String {
        // Safe date parsing with fallback
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        var date = formatter.date(from: post.createdAt)

        // Try without fractional seconds if first attempt fails
        if date == nil {
            formatter.formatOptions = [.withInternetDateTime]
            date = formatter.date(from: post.createdAt)
        }

        guard let parsedDate = date else {
            return "Recently"
        }

        let relativeFormatter = RelativeDateTimeFormatter()
        relativeFormatter.unitsStyle = .abbreviated
        return relativeFormatter.localizedString(for: parsedDate, relativeTo: Date())
    }

    // MARK: - Like Animation
    private func handleDoubleTap() {
        if !isLiked {
            toggleLike()
        }

        // Show heart overlay
        withAnimation(.bouncy) {
            showHeartOverlay = true
        }

        // Haptic feedback
        HapticManager.notification(.success)

        // Spawn particles
        spawnParticles()

        // Hide heart after delay
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
            withAnimation(.easeOut(duration: 0.3)) {
                showHeartOverlay = false
            }
        }
    }

    private func toggleLike() {
        let previousState = isLiked
        let previousCount = likeCount

        // Haptic feedback
        HapticManager.impact(.medium)

        // Animate the change
        withAnimation(.bouncy) {
            isLiked.toggle()
            likeCount += isLiked ? 1 : -1
            if likeCount < 0 { likeCount = 0 }
            isAnimatingLike = true
        }

        // Reset animation
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            withAnimation(.smooth) {
                isAnimatingLike = false
            }
        }

        // API call
        Task {
            do {
                try await ApiService.shared.likePost(postId: post.id)
            } catch {
                // Revert on failure
                await MainActor.run {
                    withAnimation(.bouncy) {
                        isLiked = previousState
                        likeCount = previousCount
                    }
                    HapticManager.notification(.error)
                }
            }
        }
    }

    private func spawnParticles() {
        let colors: [Color] = [Theme.likeColor, Theme.gradientStart, Theme.gradientMid, .pink, .red]

        for i in 0..<12 {
            let angle = Double(i) * (360.0 / 12.0) * .pi / 180
            let velocity: CGFloat = CGFloat.random(in: 60...120)
            let size = CGFloat.random(in: 6...12)

            let particle = ParticleState(
                id: UUID(),
                x: 0,
                y: 0,
                targetX: cos(angle) * velocity,
                targetY: sin(angle) * velocity,
                size: size,
                color: colors.randomElement() ?? Theme.likeColor,
                opacity: 1.0
            )
            particles.append(particle)
        }

        // Animate particles outward
        withAnimation(.easeOut(duration: 0.6)) {
            for i in particles.indices {
                particles[i].x = particles[i].targetX
                particles[i].y = particles[i].targetY
                particles[i].opacity = 0
            }
        }

        // Clean up particles
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.7) {
            particles.removeAll()
        }
    }
}

// MARK: - Particle State
struct ParticleState: Identifiable {
    let id: UUID
    var x: CGFloat
    var y: CGFloat
    let targetX: CGFloat
    let targetY: CGFloat
    let size: CGFloat
    let color: Color
    var opacity: Double
}

// MARK: - Post Extension for Aspect Ratio
extension Post {
    var aspectRatio: CGFloat {
        guard let w = width, let h = height, h > 0 else {
            return 0.8 // Default aspect ratio
        }
        return CGFloat(w) / CGFloat(h)
    }
}

// MARK: - Scale Button Style
struct ScaleButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.85 : 1.0)
            .animation(.bouncy, value: configuration.isPressed)
    }
}

// MARK: - Preview
struct PostCardView_Previews: PreviewProvider {
    static var previews: some View {
        ScrollView {
            PostCardSkeleton()
        }
        .background(Theme.background)
    }
}

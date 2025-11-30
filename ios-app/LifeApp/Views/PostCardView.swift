//
//  PostCardView.swift
//  LifeApp
//
//  Display for a single post.
//

import SwiftUI

struct PostCardView: View {
    let post: Post
    @State private var isLiked: Bool
    @State private var likeCount: Int
    @State private var isAnimatingLike = false
    
    init(post: Post) {
        self.post = post
        _isLiked = State(initialValue: post.likedByCurrentUser ?? false)
        _likeCount = State(initialValue: post.stats?.likes ?? 0)
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // User Header
            HStack {
                Circle()
                    .fill(Color.gray.opacity(0.3))
                    .frame(width: 40, height: 40)
                    .overlay(
                        Group {
                            if let avatarUrl = post.user?.avatarUrl, let url = URL(string: avatarUrl) {
                                AsyncImage(url: url) { image in
                                    image.resizable().aspectRatio(contentMode: .fill)
                                } placeholder: {
                                    Text(post.displayUsername.prefix(1).uppercased())
                                }
                            } else {
                                Text(post.displayUsername.prefix(1).uppercased())
                                    .font(Theme.Fonts.body().weight(.bold))
                                    .foregroundColor(Theme.secondaryText)
                            }
                        }
                    )
                    .clipShape(Circle())
                
                Text(post.displayUsername)
                    .font(Theme.Fonts.body().weight(.semibold))
                    .foregroundColor(Theme.text)
                
                Spacer()

                Image(systemName: "ellipsis")
                    .foregroundColor(Theme.secondaryText)
            }
            .padding(.horizontal)
            
            // Image / Video
            ZStack {
                AsyncImage(url: URL(string: post.mediaUrl)) { phase in
                    switch phase {
                    case .empty:
                        Rectangle()
                            .fill(Theme.background)
                            .aspectRatio(0.8, contentMode: .fit)
                            .overlay(ProgressView())
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .cornerRadius(12)
                    case .failure:
                        Rectangle()
                            .fill(Color.gray.opacity(0.1))
                            .aspectRatio(1.0, contentMode: .fit)
                            .overlay(
                                Image(systemName: "photo")
                                    .font(.largeTitle)
                                    .foregroundColor(.gray)
                            )
                    @unknown default:
                        EmptyView()
                    }
                }
                .onTapGesture(count: 2) {
                    toggleLike()
                    isAnimatingLike = true
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
                        isAnimatingLike = false
                    }
                }

                if post.isVideo {
                    Image(systemName: "play.circle.fill")
                        .font(.system(size: 60))
                        .foregroundColor(.white.opacity(0.8))
                        .shadow(radius: 5)
                }
                
                // Big Heart Animation
                if isAnimatingLike {
                    Image(systemName: "heart.fill")
                        .font(.system(size: 80))
                        .foregroundColor(.white.opacity(0.8))
                        .shadow(radius: 10)
                        .scaleEffect(isAnimatingLike ? 1.2 : 0.8)
                        .animation(.spring(), value: isAnimatingLike)
                }
            }
            .cornerRadius(16)
            .shadow(color: Color.black.opacity(0.05), radius: 10, x: 0, y: 5)
            .padding(.horizontal, 8)
            
            // Actions
            HStack(spacing: 20) {
                Button(action: toggleLike) {
                    Image(systemName: isLiked ? "heart.fill" : "heart")
                        .font(.title3)
                        .foregroundColor(isLiked ? .red : Theme.text)
                        .scaleEffect(isLiked ? 1.1 : 1.0)
                        .animation(.spring(), value: isLiked)
                }
                
                Button(action: {}) {
                    Image(systemName: "bubble.right")
                        .font(.title3)
                        .foregroundColor(Theme.text)
                }
                
                Button(action: {}) {
                    Image(systemName: "paperplane")
                        .font(.title3)
                        .foregroundColor(Theme.text)
                }
                
                Spacer()
                
                Button(action: {}) {
                    Image(systemName: "bookmark")
                        .font(.title3)
                        .foregroundColor(Theme.text)
                }
            }
            .padding(.horizontal)
            
            // Likes Count
            if likeCount > 0 {
                Text("\(likeCount) likes")
                    .font(Theme.Fonts.caption().weight(.bold))
                    .foregroundColor(Theme.text)
                    .padding(.horizontal)
            }
            
            // Caption
            if let caption = post.caption, !caption.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    Text(post.displayUsername)
                        .font(Theme.Fonts.body().weight(.bold))
                        .foregroundColor(Theme.text)
                    + Text(" ") +
                    Text(caption)
                        .font(Theme.Fonts.body())
                        .foregroundColor(Theme.text)
                }
                .padding(.horizontal)
            }

            // Date
            if let date = ISO8601DateFormatter().date(from: post.createdAt) {
                Text(timeAgo(from: date))
                    .font(Theme.Fonts.caption())
                    .foregroundColor(Theme.secondaryText)
                    .padding(.horizontal)
                    .padding(.bottom, 8)
            }
        }
        .background(Theme.surface)
        .cornerRadius(24)
        .shadow(color: Color.black.opacity(0.02), radius: 5, x: 0, y: 2)
        .padding(.horizontal, 10)
    }

    func timeAgo(from date: Date) -> String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .full
        return formatter.localizedString(for: date, relativeTo: Date())
    }
    
    private func toggleLike() {
        let previousState = isLiked
        let previousCount = likeCount

        // Optimistic update
        isLiked.toggle()
        likeCount += isLiked ? 1 : -1
        if likeCount < 0 { likeCount = 0 }

        Task {
            do {
                try await ApiService.shared.likePost(postId: post.id)
            } catch {
                // Revert on failure
                await MainActor.run {
                    isLiked = previousState
                    likeCount = previousCount
                }
            }
        }
    }
}

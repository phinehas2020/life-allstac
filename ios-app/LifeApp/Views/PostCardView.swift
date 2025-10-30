//
//  PostCardView.swift
//  LifeApp
//
//  Post card component
//

import SwiftUI

struct PostCardView: View {
    let post: Post
    @State private var isLiked = false
    @State private var likeCount: Int
    @EnvironmentObject var authManager: AuthenticationManager
    
    init(post: Post) {
        self.post = post
        // Use likedByCurrentUser from API response
        _isLiked = State(initialValue: post.likedByCurrentUser ?? false)
        _likeCount = State(initialValue: post.likeCount)
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // User info
            HStack {
                Circle()
                    .fill(Color.blue.opacity(0.3))
                    .frame(width: 40, height: 40)
                    .overlay(
                        Text(post.displayUsername.prefix(1).uppercased())
                            .font(.caption)
                            .foregroundColor(.blue)
                    )
                
                Text(post.displayUsername)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                
                Spacer()
            }
            
            // Media - Use ZStack to overlay NavigationLink without affecting image loading
            ZStack {
                if post.isVideo {
                    VideoPlayerView(url: post.mediaUrl)
                        .frame(height: 400)
                } else {
                    PostImageView(url: post.mediaUrl, height: 400)
                }
                
                NavigationLink(destination: PostDetailView(postId: post.id)) {
                    Color.clear
                        .frame(height: 400)
                }
                .buttonStyle(PlainButtonStyle())
            }
            
            // Actions
            HStack {
                Button(action: toggleLike) {
                    Image(systemName: isLiked ? "heart.fill" : "heart")
                        .foregroundColor(isLiked ? .red : .primary)
                }
                
                Text("\(likeCount)")
                    .font(.subheadline)
                
                Spacer()
                
                Image(systemName: "message")
                
                Text("\(post.commentCount)")
                    .font(.subheadline)
                
                Spacer()
                
                Image(systemName: "square.and.arrow.up")
            }
            .font(.title3)
            
            // Caption
            if let caption = post.caption {
                Text(caption)
                    .font(.subheadline)
                    .lineLimit(2)
            }
            
            // Tags
            if let tags = post.tags, !tags.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack {
                        ForEach(tags, id: \.self) { tag in
                            Text("#\(tag)")
                                .font(.caption)
                                .foregroundColor(.blue)
                        }
                    }
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(radius: 2)
    }
    
    private func toggleLike() {
        Task {
            do {
                try await ApiService.shared.likePost(postId: post.id)
                await MainActor.run {
                    isLiked.toggle()
                    likeCount += isLiked ? 1 : -1
                }
            } catch {
                // Handle error
            }
        }
    }
}

struct VideoPlayerView: View {
    let url: String
    
    var body: some View {
        // For now, show a placeholder
        // In production, use AVPlayerViewController
        Rectangle()
            .fill(Color.black)
            .overlay(
                Image(systemName: "play.circle.fill")
                    .font(.system(size: 50))
                    .foregroundColor(.white)
            )
    }
}

